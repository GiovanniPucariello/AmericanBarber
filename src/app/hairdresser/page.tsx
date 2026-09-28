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
import { relativeDayLabel } from "@/lib/calendar/relative-day";

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

  const todayStartLocal = DateTime.now().setZone(organization.timezone).startOf("day");
  const weekRangeLiteral = `[${todayStartLocal.toISO()},${todayStartLocal.plus({ days: 7 }).toISO()})`;

  const [openWindows, appointmentsRes, requestsCountRes, monthAppointmentsRes, weekRes] = await Promise.all([
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
    supabase
      .from("appointments")
      .select("id, during, customer_profile_id, services(name)")
      .eq("hairdresser_id", hairdresser.id)
      .in("status", ["pending", "confirmed"])
      .overlaps("during", weekRangeLiteral),
  ]);

  // Dashboard: today's load split morning/afternoon, the next client, and
  // the week ahead - what a barber checks between cuts.
  const nowMs = Date.now();
  const tz = organization.timezone;
  const week = (weekRes.data ?? [])
    .map((a) => {
      const { start } = parseRange(a.during as string);
      const service = Array.isArray(a.services) ? a.services[0] : a.services;
      return { id: a.id, start, customerProfileId: a.customer_profile_id, serviceName: service?.name ?? "" };
    })
    .sort((x, y) => x.start - y.start);
  const todayEndMs = todayStartLocal.plus({ days: 1 }).toMillis();
  const todayList = week.filter((a) => a.start >= todayStartLocal.toMillis() && a.start < todayEndMs);
  const morningCount = todayList.filter((a) => DateTime.fromMillis(a.start, { zone: tz }).hour < 13).length;
  const nextUp = week.find((a) => a.start > nowMs) ?? null;

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

  const customerIds = [
    ...new Set([...todaysAppointments.map((a) => a.customerProfileId), ...(nextUp ? [nextUp.customerProfileId] : [])]),
  ];
  const { data: customers } = customerIds.length
    ? await supabase.from("co_member_profiles").select("id, full_name").in("id", customerIds)
    : { data: [] };
  const nameById = new Map((customers ?? []).map((c) => [c.id, c.full_name]));
  const { data: notes } = customerIds.length
    ? await supabase
        .from("customer_notes")
        .select("customer_profile_id, body")
        .eq("organization_id", organization.id)
        .in("customer_profile_id", customerIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  // Newest note per customer, shown inline so it's visible before the cut.
  const latestNoteByCustomer = new Map<string, string>();
  for (const n of notes ?? []) {
    if (!latestNoteByCustomer.has(n.customer_profile_id)) latestNoteByCustomer.set(n.customer_profile_id, n.body);
  }
  const customerIdByAppointment = new Map(todaysAppointments.map((a) => [a.id, a.customerProfileId]));

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

      <section className="flex flex-col gap-3" aria-label="Riepilogo">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Oggi", value: todayList.length },
            { label: "Mattina", value: morningCount },
            { label: "Pomeriggio", value: todayList.length - morningCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-ink-900 border border-paper-50/15 p-3">
              <p className="text-3xl font-semibold tabular-nums leading-none">{stat.value}</p>
              <p className="text-xs text-paper-50/60 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
        {nextUp ? (
          <Link
            href={`/hairdresser/appointments/${nextUp.id}`}
            className="rounded-lg bg-ink-900 border border-paper-50/15 border-l-4 border-l-accent p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-xs text-paper-50/60">Prossimo cliente</p>
              <p className="font-semibold truncate">
                {nameById.get(nextUp.customerProfileId) ?? "Cliente"} · {nextUp.serviceName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-semibold tabular-nums leading-none">
                {DateTime.fromMillis(nextUp.start, { zone: tz }).toFormat("HH:mm")}
              </p>
              <p className="text-xs text-paper-50/60 mt-1">
                {nextUp.start - nowMs < 60 * 60_000
                  ? `tra ${Math.max(1, Math.round((nextUp.start - nowMs) / 60_000))} min`
                  : relativeDayLabel(DateTime.fromMillis(nextUp.start, { zone: tz }), todayStartLocal)}
              </p>
            </div>
          </Link>
        ) : (
          <p className="text-sm text-paper-50/60">Nessun cliente nei prossimi 7 giorni.</p>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-paper-50/70">
            Prossimi 7 giorni: <span className="text-paper-50 font-semibold">{week.length}</span> appuntamenti
          </p>
          <a
            href="/hairdresser/calendar"
            className="h-11 px-3 rounded-md border border-paper-50/25 text-sm font-medium flex items-center shrink-0"
          >
            Aggiungi al calendario
          </a>
        </div>
      </section>

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
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/hairdresser/customers/${customerIdByAppointment.get(item.id)}`}
                    className="underline underline-offset-2"
                  >
                    {item.customerName}
                  </Link>
                  <p className="text-paper-50/60 text-sm">{item.serviceName}</p>
                  {latestNoteByCustomer.get(customerIdByAppointment.get(item.id) ?? "") && (
                    <p className="text-sm text-paper-50/80 mt-1 line-clamp-2">
                      {latestNoteByCustomer.get(customerIdByAppointment.get(item.id) ?? "")}
                    </p>
                  )}
                </div>
                <Link
                  href={`/hairdresser/appointments/${item.id}`}
                  className="h-11 px-3 rounded-md border border-paper-50/25 text-sm font-medium flex items-center gap-1.5 shrink-0"
                >
                  Apri
                  {unreadCounts.get(item.id) ? (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-paper-50 text-xs font-semibold flex items-center justify-center">
                      {unreadCounts.get(item.id)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </DayPanel>
    </div>
  );
}
