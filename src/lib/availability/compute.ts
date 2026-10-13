import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { localToUtc, weekdayOf } from "./timezone";
import { parseRange, subtractIntervals, unionIntervals, type Interval } from "./intervals";
import { dayStartTimes } from "./slot-times";

export type AvailableSlot = { startUtc: string; endUtc: string };
export type DaySlot = AvailableSlot & { available: boolean };

export type ComputeAvailableSlotsParams = {
  hairdresserId: string;
  /** Local calendar date in the organization's timezone, "YYYY-MM-DD". */
  date: string;
  timeZone: string;
  serviceDurationMinutes: number;
  bookingIntervalMinutes: number;
};

type FetchedIntervals = {
  dayStartMs: number;
  dayEndMs: number;
  /** Hours the hairdresser could possibly work this day (rules + extra_range). */
  potential: Interval[];
  /** Time genuinely blocked off (vacation, one-off exceptions). */
  unavailable: Interval[];
  /** Already occupied by something else (blocked slots, other bookings). */
  occupied: Interval[];
  /** Fixed booking start times for this day (UTC ms), or null for the service grid. */
  fixedStarts: number[] | null;
};

// Shared data-fetch + interval-building for both computeAvailableSlots (the
// booking write-path's read-side check) and computeDaySchedule (the picker
// UI, which needs to show taken slots too - section 39). Read-path only;
// see the module-level note on computeAvailableSlots for why this is never
// the authority on double-booking.
async function fetchIntervals(
  supabase: SupabaseClient<Database>,
  { hairdresserId, date, timeZone }: Pick<ComputeAvailableSlotsParams, "hairdresserId" | "date" | "timeZone">,
): Promise<FetchedIntervals> {
  const weekday = weekdayOf(date, timeZone);
  const dayStartUtc = localToUtc(date, "00:00", timeZone);
  const dayEndUtc = dayStartUtc.plus({ days: 1 });
  const dayRangeLiteral = `[${dayStartUtc.toISO()},${dayEndUtc.toISO()})`;

  const [rulesRes, exceptionsRes, blockedRes, appointmentsRes, hairdresserRes] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("start_time, end_time")
      .eq("hairdresser_id", hairdresserId)
      .eq("weekday", weekday)
      .eq("active", true),
    supabase
      .from("availability_exceptions")
      .select("type, start_time, end_time")
      .eq("hairdresser_id", hairdresserId)
      .eq("date", date),
    supabase
      .from("blocked_slots")
      .select("during")
      .eq("hairdresser_id", hairdresserId)
      .overlaps("during", dayRangeLiteral),
    supabase
      .from("appointments")
      .select("during")
      .eq("hairdresser_id", hairdresserId)
      .in("status", ["pending", "confirmed"])
      .overlaps("during", dayRangeLiteral),
    supabase.from("hairdressers").select("slot_times").eq("id", hairdresserId).maybeSingle(),
  ]);

  for (const res of [rulesRes, exceptionsRes, blockedRes, appointmentsRes, hairdresserRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const dayStartMs = dayStartUtc.toMillis();
  const dayEndMs = dayEndUtc.toMillis();

  const ruleIntervals: Interval[] = (rulesRes.data ?? []).map((r) => ({
    start: localToUtc(date, r.start_time, timeZone).toMillis(),
    end: localToUtc(date, r.end_time, timeZone).toMillis(),
  }));

  const extraIntervals: Interval[] = (exceptionsRes.data ?? [])
    .filter((e) => e.type === "extra_range" && e.start_time && e.end_time)
    .map((e) => ({
      start: localToUtc(date, e.start_time as string, timeZone).toMillis(),
      end: localToUtc(date, e.end_time as string, timeZone).toMillis(),
    }));

  const unavailableIntervals: Interval[] = (exceptionsRes.data ?? []).flatMap(
    (e): Interval[] => {
      if (e.type === "unavailable_all_day") {
        return [{ start: dayStartMs, end: dayEndMs }];
      }
      if (e.type === "unavailable_range" && e.start_time && e.end_time) {
        return [
          {
            start: localToUtc(date, e.start_time, timeZone).toMillis(),
            end: localToUtc(date, e.end_time, timeZone).toMillis(),
          },
        ];
      }
      return [];
    },
  );

  // Range columns (tstzrange) come through generated types as `unknown` -
  // PostgREST always serializes them as the Postgres range literal string.
  const blockedIntervals: Interval[] = (blockedRes.data ?? []).map((b) =>
    parseRange(b.during as string),
  );
  const appointmentIntervals: Interval[] = (appointmentsRes.data ?? []).map((a) =>
    parseRange(a.during as string),
  );

  return {
    dayStartMs,
    dayEndMs,
    potential: unionIntervals([...ruleIntervals, ...extraIntervals]),
    unavailable: unavailableIntervals,
    occupied: [...blockedIntervals, ...appointmentIntervals],
    fixedStarts: dayStartTimes(hairdresserRes.data?.slot_times, weekday)?.map((t) => localToUtc(date, t, timeZone).toMillis()) ?? null,
  };
}

// A fixed slot runs until the next listed start, at most this long (the
// shop's lists step 30-45 minutes; the last slot before a break gets 45).
const FIXED_SLOT_MAX_MINUTES = 45;

const overlaps = (a: Interval, list: Interval[]) => list.some((b) => a.start < b.end && b.start < a.end);

// Every slot the barber's open windows allow, minus those cut by an explicit
// exception (vacation, unavailable range). Closing time is the last allowed
// *start*: the shop takes a booking at 20:00 and finishes at 20:30. With
// fixedStarts (the barber's own list for the day) only those starts exist.
export function sliceIntoSlots(
  windows: Interval[],
  unavailable: Interval[],
  dayStartMs: number,
  { stepMs, durationMs, fixedStarts = null }: { stepMs: number; durationMs: number; fixedStarts?: number[] | null },
): Interval[] {
  const slots: Interval[] = [];
  if (fixedStarts) {
    const maxMs = FIXED_SLOT_MAX_MINUTES * 60_000;
    fixedStarts.forEach((t, i) => {
      const next = fixedStarts[i + 1] ?? Infinity;
      slots.push({ start: t, end: Math.min(next, t + maxMs) });
    });
  } else {
    for (const { start, end } of windows) {
      // Align to the grid from the day's own start, not this window's start,
      // so slots always land on :00/:30 etc. regardless of where a
      // rule/exception happens to begin.
      for (let t = dayStartMs + Math.ceil((start - dayStartMs) / stepMs) * stepMs; t <= end; t += stepMs) {
        slots.push({ start: t, end: t + durationMs });
      }
    }
  }
  // The start must fall in time the barber is really in (closing time
  // included), so leaving early - unavailable 18:00-20:00 - also drops 20:00.
  const open = subtractIntervals(windows, unavailable);
  return slots.filter(
    (slot) => open.some((o) => slot.start >= o.start && slot.start <= o.end) && !overlaps(slot, unavailable),
  );
}

export async function computeAvailableSlots(
  supabase: SupabaseClient<Database>,
  params: ComputeAvailableSlotsParams,
): Promise<AvailableSlot[]> {
  return (await computeDaySchedule(supabase, params))
    .filter((slot) => slot.available)
    .map(({ startUtc, endUtc }) => ({ startUtc, endUtc }));
}

// For the hairdresser's agenda (section 42): the raw open windows for the
// day, not sliced into a booking grid - the agenda merges these with the
// day's real appointments (their actual variable durations) to show
// "AVAILABLE" gaps between bookings, so it needs continuous ranges, not
// discrete slots.
export async function computeOpenWindows(
  supabase: SupabaseClient<Database>,
  params: Pick<ComputeAvailableSlotsParams, "hairdresserId" | "date" | "timeZone">,
): Promise<Interval[]> {
  const { potential, unavailable } = await fetchIntervals(supabase, params);
  return subtractIntervals(potential, unavailable);
}

// For the picker UI (section 39): every slot within the hairdresser's open
// hours for this day, each flagged available or not - taken slots need to
// render as visibly disabled, not just disappear, so a customer can tell
// "closed today" apart from "open but fully booked."
export async function computeDaySchedule(
  supabase: SupabaseClient<Database>,
  params: ComputeAvailableSlotsParams,
): Promise<DaySlot[]> {
  const { dayStartMs, potential, unavailable, occupied, fixedStarts } = await fetchIntervals(supabase, params);
  const nowMs = Date.now();

  // Slots cut by an exception (a vacation day) don't render at all; slots
  // overlapping a booking or blocked slot render disabled, so a customer can
  // tell "closed today" apart from "open but fully booked". Slots that have
  // already passed (viewing "today" later in the day) are dropped entirely -
  // they were never "taken", they're just over.
  return sliceIntoSlots(potential, unavailable, dayStartMs, {
    stepMs: params.bookingIntervalMinutes * 60_000,
    durationMs: params.serviceDurationMinutes * 60_000,
    fixedStarts,
  })
    .filter(({ start }) => start > nowMs)
    .map((slot) => ({
      startUtc: new Date(slot.start).toISOString(),
      endUtc: new Date(slot.end).toISOString(),
      available: !overlaps(slot, occupied),
    }));
}

// First day (starting at fromDate, looking `days` ahead) with at least one
// bookable slot - powers "open on the first free day" in the picker and the
// home screen's "Il solito?" suggestion.
// ponytail: sequential per-day lookups, fine for a week; one multi-day query if it gets slow.
export async function findFirstAvailableDay(
  supabase: SupabaseClient<Database>,
  params: Omit<ComputeAvailableSlotsParams, "date"> & { fromDate: string; days: number },
): Promise<{ date: string; slots: DaySlot[] } | null> {
  const { fromDate, days, ...rest } = params;
  const [y, m, d] = fromDate.split("-").map(Number);
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    const slots = await computeDaySchedule(supabase, { ...rest, date });
    if (slots.some((slot) => slot.available)) return { date, slots };
  }
  return null;
}
