import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { computeOpenWindows } from "@/lib/availability/compute";
import { parseRange } from "@/lib/availability/intervals";
import { buildAgenda, type AgendaAppointment } from "@/lib/hairdressers/agenda";
import { monthGridRangeIso } from "@/lib/calendar/month-grid";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { DayPanel } from "@/components/calendar/day-panel";
import { getUnreadMessageCounts } from "@/lib/messages/queries";

// Day schedule (section 42/43): a plain chronological list, real
// appointments interleaved with "AVAILABLE" gaps, for whichever day is
// selected - built for a hairdresser to glance at between clients, now with
// free day navigation via the same month-grid component the admin uses.
export default async function HairdresserAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return <div className="p-6">Nessuna appartenenza a un&apos;organizzazione.</div>;
  }

  const hairdresser = await getCurrentHairdresser(organization.id);
  if (!hairdresser) {
    return (
      <div className="p-6">
        <p className="text-paper-50/70">
          Il tuo account non è ancora collegato a un profilo barbiere.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { date: requestedDate } = await searchParams;
  const today = DateTime.now().setZone(organization.timezone).toISODate() as string;
  const date = requestedDate ?? today;
  const dayStart = DateTime.fromISO(date, { zone: organization.timezone });
  const dayEnd = dayStart.plus({ days: 1 });
  const dayStartMs = dayStart.toMillis();
  const dayEndMs = dayEnd.toMillis();
  // .overlaps() with a proper range literal is the already-proven pattern
  // (used throughout compute.ts) for range-column filtering; the JS-side
  // filter below is what actually guarantees correctness, this just keeps
  // the query from fetching every appointment this hairdresser has ever had.
  const dayRangeLiteral = `[${dayStart.toISO()},${dayEnd.toISO()})`;
  const { startIso, endIso } = monthGridRangeIso(date, organization.timezone);
  const monthRangeLiteral = `[${DateTime.fromISO(startIso, { zone: organization.timezone }).toISO()},${DateTime.fromISO(endIso, { zone: organization.timezone }).toISO()})`;

  const [openWindows, appointmentsRes, requestsCountRes, monthAppointmentsRes] = await Promise.all([
    computeOpenWindows(supabase, {
      hairdresserId: hairdresser.id,
      date,
      timeZone: organization.timezone,
    }),
    supabase
      .from("appointments")
      .select("id, during, customer_profile_id, services(name)")
      .eq("hairdresser_id", hairdresser.id)
      .in("status", ["pending", "confirmed"])
      .overlaps("during", dayRangeLiteral),
    supabase
      .from("recurring_bookings")
      .select("id", { count: "exact", head: true })
      .eq("hairdresser_id", hairdresser.id)
      .eq("status", "pending_approval"),
    supabase
      .from("appointments")
      .select("during")
      .eq("hairdresser_id", hairdresser.id)
      .in("status", ["pending", "confirmed"])
      .overlaps("during", monthRangeLiteral),
  ]);

  const todaysAppointments = (appointmentsRes.data ?? [])
    .map((a) => {
      const { start, end } = parseRange(a.during as string);
      const service = Array.isArray(a.services) ? a.services[0] : a.services;
      return {
        id: a.id,
        start,
        end,
        customerProfileId: a.customer_profile_id,
        serviceName: service?.name ?? "",
      };
    })
    .filter((a) => a.start >= dayStartMs && a.start < dayEndMs);

  const customerIds = [...new Set(todaysAppointments.map((a) => a.customerProfileId))];
  const { data: customers } = customerIds.length
    ? await supabase.from("co_member_profiles").select("id, full_name").in("id", customerIds)
    : { data: [] };
  const nameById = new Map((customers ?? []).map((c) => [c.id, c.full_name]));
  const unreadCounts = await getUnreadMessageCounts(
    supabase,
    todaysAppointments.map((a) => a.id),
    user?.id ?? "",
  );

  const agendaAppointments: AgendaAppointment[] = todaysAppointments.map((a) => ({
    id: a.id,
    start: a.start,
    end: a.end,
    customerName: nameById.get(a.customerProfileId) ?? "Cliente",
    serviceName: a.serviceName,
    status: "confirmed",
  }));

  const agenda = buildAgenda(openWindows, agendaAppointments);
  const requestsCount = requestsCountRes.count ?? 0;
  const daysWithAppointments = [
    ...new Set(
      (monthAppointmentsRes.data ?? []).map((a) => {
        const { start } = parseRange(a.during as string);
        return DateTime.fromMillis(start, { zone: "utc" }).setZone(organization.timezone).toISODate() as string;
      }),
    ),
  ];

  return (
    <div className="p-6 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{hairdresser.displayName}</h1>
        <p className="text-paper-50/60 text-sm">
          {date === today ? "Oggi, " : ""}
          {DateTime.fromISO(date, { zone: organization.timezone }).toFormat("cccc d LLLL")}
        </p>
      </div>

      {requestsCount > 0 && (
        <Link
          href="/hairdresser/requests"
          className="rounded-lg border border-accent/50 bg-accent/10 p-4 text-sm"
        >
          {requestsCount} {requestsCount > 1 ? "nuove richieste" : "nuova richiesta"}
        </Link>
      )}

      <MonthCalendar
        selectedDate={date}
        todayIso={today}
        timeZone={organization.timezone}
        daysWithAppointments={daysWithAppointments}
      />

      <DayPanel dateKey={date} label={DateTime.fromISO(date, { zone: organization.timezone }).toFormat("cccc d LLLL")}>
        {agenda.length === 0 && (
          <div className="rounded-lg bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-paper-50/60">Chiuso {date === today ? "oggi" : "in questo giorno"}.</p>
            <Link href="/hairdresser/availability" className="text-sm underline underline-offset-2">
              Modifica i tuoi orari
            </Link>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {agenda.map((item, i) => {
            const time = DateTime.fromMillis(item.start, { zone: "utc" })
              .setZone(organization.timezone)
              .toFormat("HH:mm");

            if (item.kind === "available") {
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-md bg-ink-900 border border-dashed border-paper-50/15 p-3 text-paper-50/40"
                >
                  <span className="w-14 shrink-0 text-sm">{time}</span>
                  <span className="text-sm uppercase tracking-wide">Disponibile</span>
                </li>
              );
            }

            return (
              <li key={i} className="flex items-center gap-3 rounded-md bg-ink-900 border border-paper-50/15 p-3">
                <span className="w-14 shrink-0 text-sm">{time}</span>
                <div className="flex-1">
                  <p>{item.customerName}</p>
                  <p className="text-paper-50/60 text-sm">{item.serviceName}</p>
                </div>
                <Link
                  href={`/hairdresser/appointments/${item.id}/messages`}
                  className="text-sm underline underline-offset-2 shrink-0"
                >
                  Messaggi{unreadCounts.get(item.id) ? ` (${unreadCounts.get(item.id)})` : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      </DayPanel>
    </div>
  );
}
