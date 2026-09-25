import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { localToUtc, weekdayOf } from "./timezone";
import { parseRange, subtractIntervals, unionIntervals, type Interval } from "./intervals";

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

  const [rulesRes, exceptionsRes, blockedRes, appointmentsRes] = await Promise.all([
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
  ]);

  for (const res of [rulesRes, exceptionsRes, blockedRes, appointmentsRes]) {
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
  };
}

function sliceIntoSlots(
  intervals: Interval[],
  dayStartMs: number,
  stepMs: number,
  durationMs: number,
): Interval[] {
  const slots: Interval[] = [];
  for (const { start, end } of intervals) {
    // Align to the grid from the day's own start, not this window's start,
    // so slots always land on :00/:30 etc. regardless of where a
    // rule/exception happens to begin.
    let t = dayStartMs + Math.ceil((start - dayStartMs) / stepMs) * stepMs;
    for (; t + durationMs <= end; t += stepMs) {
      slots.push({ start: t, end: t + durationMs });
    }
  }
  return slots;
}

export async function computeAvailableSlots(
  supabase: SupabaseClient<Database>,
  params: ComputeAvailableSlotsParams,
): Promise<AvailableSlot[]> {
  const { dayStartMs, potential, unavailable, occupied } = await fetchIntervals(supabase, params);

  let free = subtractIntervals(potential, unavailable);
  free = subtractIntervals(free, occupied);

  const stepMs = params.bookingIntervalMinutes * 60_000;
  const durationMs = params.serviceDurationMinutes * 60_000;
  const nowMs = Date.now();

  return sliceIntoSlots(free, dayStartMs, stepMs, durationMs)
    .filter(({ start }) => start > nowMs)
    .map(({ start, end }) => ({
      startUtc: new Date(start).toISOString(),
      endUtc: new Date(end).toISOString(),
    }));
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
  const { dayStartMs, potential, unavailable, occupied } = await fetchIntervals(supabase, params);

  // "Open" hours exclude explicit exceptions (a vacation day has no slots
  // to show at all) but deliberately still include occupied time - those
  // slots need to render, just disabled.
  const open = subtractIntervals(potential, unavailable);
  const free = subtractIntervals(open, occupied);

  const stepMs = params.bookingIntervalMinutes * 60_000;
  const durationMs = params.serviceDurationMinutes * 60_000;

  // A slot is available only if its *entire* [start,end) range fits inside
  // one contiguous free interval - not just whether its start happens to
  // match some free interval's own start. Comparing starts alone would mark
  // only the first grid slot of each free stretch as available, since every
  // later slot's start doesn't equal that interval's start even though it's
  // still well within it.
  const isFree = (start: number, end: number) =>
    free.some((f) => start >= f.start && end <= f.end);
  const nowMs = Date.now();

  // Slice from the *unoccupied-agnostic* open windows so a slot partially
  // covered by an existing appointment still appears (as unavailable)
  // rather than vanishing because subtracting occupied time fragmented the
  // window out from under the grid alignment. Slots that have already
  // passed (viewing "today" later in the day) are dropped entirely rather
  // than shown disabled - they were never "taken", they're just over.
  return sliceIntoSlots(open, dayStartMs, stepMs, durationMs)
    .filter(({ start }) => start > nowMs)
    .map(({ start, end }) => ({
      startUtc: new Date(start).toISOString(),
      endUtc: new Date(end).toISOString(),
      available: isFree(start, end),
    }));
}
