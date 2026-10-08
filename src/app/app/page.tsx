import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
// Display face for the "Il solito?" headline - imported per page like the
// landing does, so it stays off every other route's CSS.
import "@fontsource/pirata-one/400.css";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { parseRange } from "@/lib/availability/intervals";
import { findFirstAvailableDay } from "@/lib/availability/compute";
import { relativeDayLabel } from "@/lib/calendar/relative-day";
import { getPreferredHairdresserId } from "@/lib/preferences/queries";

// Consumer-oriented home (section 40) - not a "Dashboard". Structure:
// welcome -> next appointment -> "Il solito?" one-tap rebook -> book CTA ->
// recurring prompt.
const WEEKDAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

export default async function AppHome() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return <div className="p-6">Nessuna appartenenza a un&apos;organizzazione.</div>;
  }
  // Every login lands on /app; staff belong in their own area.
  if (organization.role === "admin" || organization.role === "owner") redirect("/admin");
  if (organization.role === "hairdresser" || organization.role === "manager") redirect("/hairdresser");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const firstName = profile?.full_name?.split(" ")[0];

  // Range-vs-range comparison operators exist in Postgres but their exact
  // ordering semantics aren't worth relying on sight-unseen here - fetching
  // the (small) upcoming set and filtering in JS with the already-proven
  // parseRange helper is simpler and unambiguous.
  const { data: candidates } = await supabase
    .from("appointments")
    .select("id, during, hairdressers(display_name), services(name)")
    .eq("customer_profile_id", user?.id ?? "")
    .in("status", ["pending", "confirmed"])
    .order("during", { ascending: true })
    .limit(20);

  // Last visit, for the one-tap "book again" shortcut - same barber, same
  // service is what most returning customers want.
  const { data: recent } = await supabase
    .from("appointments")
    .select("during, hairdresser_id, service_id, hairdressers(display_name, avatar_url), services(name, duration_minutes)")
    .eq("customer_profile_id", user?.id ?? "")
    .in("status", ["confirmed", "completed"])
    .order("during", { ascending: false })
    .limit(10);

  const nowMs = DateTime.now().toMillis();
  const lastVisit = (recent ?? []).find((a) => parseRange(a.during as string).start < nowMs);
  const lastHairdresser = lastVisit
    ? Array.isArray(lastVisit.hairdressers)
      ? lastVisit.hairdressers[0]
      : lastVisit.hairdressers
    : null;
  const lastService = lastVisit
    ? Array.isArray(lastVisit.services)
      ? lastVisit.services[0]
      : lastVisit.services
    : null;
  const upcoming = (candidates ?? []).find(
    (a) => parseRange(a.during as string).start >= nowMs,
  );

  const nextHairdresser = upcoming
    ? Array.isArray(upcoming.hairdressers)
      ? upcoming.hairdressers[0]
      : upcoming.hairdressers
    : null;
  const nextService = upcoming
    ? Array.isArray(upcoming.services)
      ? upcoming.services[0]
      : upcoming.services
    : null;
  const nextStart = upcoming
    ? DateTime.fromMillis(parseRange(upcoming.during as string).start, { zone: "utc" }).setZone(
        organization.timezone,
      )
    : null;

  // "Il solito?": when nothing is booked yet, find the real next free slot
  // with the customer's own barber (preferred, else last visit's) and last
  // service, so a regular books in one tap instead of browsing the picker.
  const tz = organization.timezone;
  const todayLocal = DateTime.now().setZone(tz).startOf("day");
  const preferredId = await getPreferredHairdresserId(organization.id);

  const [{ data: preferredRow }, { data: firstService }] = await Promise.all([
    preferredId
      ? supabase
          .from("hairdressers")
          .select("id, display_name, avatar_url")
          .eq("id", preferredId)
          .eq("active", true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    lastService
      ? Promise.resolve({ data: null })
      : supabase
          .from("services")
          .select("id, name, duration_minutes")
          .eq("organization_id", organization.id)
          .eq("active", true)
          .order("sort_order")
          .limit(1)
          .maybeSingle(),
  ]);

  const usualBarber =
    preferredRow ??
    (lastVisit && lastHairdresser ? { id: lastVisit.hairdresser_id, ...lastHairdresser } : null);
  const usualService =
    lastVisit && lastService ? { id: lastVisit.service_id, ...lastService } : firstService;

  const usual =
    !upcoming && usualBarber && usualService
      ? await findFirstAvailableDay(supabase, {
          hairdresserId: usualBarber.id,
          timeZone: tz,
          serviceDurationMinutes: usualService.duration_minutes,
          bookingIntervalMinutes: organization.bookingIntervalMinutes,
          fromDate: todayLocal.toISODate() as string,
          days: 7,
        })
      : null;
  // Recurring series: active ones with their next dates, plus requests
  // still waiting for the barber (skipping requests whose end date passed).
  const { data: seriesRows } = await supabase
    .from("recurring_bookings")
    .select("id, status, weekday, start_time, interval_weeks, ends_on, hairdressers(display_name), services(name)")
    .eq("customer_profile_id", user?.id ?? "")
    .in("status", ["active", "pending_approval"])
    .order("requested_at", { ascending: false });
  const todayIso = todayLocal.toISODate() as string;
  const series = (seriesRows ?? []).filter((r) => !r.ends_on || r.ends_on >= todayIso);
  const activeIds = series.filter((r) => r.status === "active").map((r) => r.id);
  const { data: seriesOccurrences } = activeIds.length
    ? await supabase
        .from("recurring_booking_occurrences")
        .select("recurring_booking_id, occurrence_date, appointment_id")
        .in("recurring_booking_id", activeIds)
        .in("status", ["scheduled", "confirmed"])
        .gte("occurrence_date", todayIso)
        .order("occurrence_date")
    : { data: [] };
  const seriesAppointmentIds = new Set((seriesOccurrences ?? []).map((o) => o.appointment_id));

  const usualSlot = usual?.slots.find((slot) => slot.available) ?? null;
  const usualStart = usualSlot ? DateTime.fromISO(usualSlot.startUtc, { zone: "utc" }).setZone(tz) : null;
  const usualDayLabel = usualStart ? relativeDayLabel(usualStart, todayLocal) : null;

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <p className="text-paper-50/60 text-sm">Bentornato</p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName ?? ""}</h1>
      </div>

      {(upcoming || !usualSlot) && (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-paper-50/60">Il tuo prossimo appuntamento</h2>
        {upcoming && nextStart ? (
          <Link
            href="/app/appointments"
            className="rounded-lg bg-ink-900 border border-paper-50/15 border-l-4 border-l-accent p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
          >
            <div>
              <p className="text-sm text-paper-50/70 capitalize">{nextStart.toFormat("cccc d LLLL")}</p>
              <p className="text-3xl font-semibold tabular-nums leading-tight">{nextStart.toFormat("HH:mm")}</p>
              <p className="text-paper-50/70 text-sm mt-0.5">
                {nextHairdresser?.display_name} · {nextService?.name}
              </p>
            </div>
            <span className="text-paper-50/40 text-sm shrink-0 text-right">
              {seriesAppointmentIds.has(upcoming.id) && (
                <span className="block mb-1 h-6 px-2 rounded-full border border-paper-50/30 text-xs text-paper-50/80 inline-flex items-center">
                  Serie
                </span>
              )}
              <span className="block">Dettagli</span>
            </span>
          </Link>
        ) : (
          <div className="rounded-lg bg-ink-900 border border-paper-50/15 border-dashed p-4">
            <p className="text-paper-50/60">Nessun appuntamento in programma.</p>
          </div>
        )}
      </section>
      )}

      {usualBarber && usualService && usualStart && usualSlot && (
        <section className="animate-scale-in rounded-lg bg-ink-900 border border-paper-50/15 overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            {usualBarber.avatar_url ? (
              <Image
                src={usualBarber.avatar_url}
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-accent"
              />
            ) : (
              <span className="w-16 h-16 rounded-full bg-ink-800 flex items-center justify-center text-xl font-semibold uppercase shrink-0 ring-2 ring-accent">
                {usualBarber.display_name.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-3xl leading-none">{lastVisit ? "Il solito?" : "Pronto per un taglio?"}</h2>
              <p className="text-sm text-paper-50/70 mt-1">
                {usualService.name} con {usualBarber.display_name}
              </p>
            </div>
          </div>
          <div className="px-4 pb-4 flex flex-col gap-3">
            <div>
              <p className="text-xs text-paper-50/60">Primo posto libero</p>
              <p className="text-2xl font-semibold">
                <span className="capitalize">{usualDayLabel}</span> alle{" "}
                <span className="tabular-nums">{usualStart.toFormat("HH:mm")}</span>
              </p>
            </div>
            <Link
              href={`/app/book/${usualBarber.id}/confirm?serviceId=${usualService.id}&start=${encodeURIComponent(usualSlot.startUtc)}`}
              className="h-14 rounded-md bg-accent text-paper-50 font-semibold flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
            >
              Prenota alle {usualStart.toFormat("HH:mm")}
            </Link>
            <Link
              href={`/app/book/${usualBarber.id}?serviceId=${usualService.id}&date=${usual?.date}`}
              className="h-11 flex items-center justify-center text-sm text-paper-50/70 underline underline-offset-2"
            >
              Altri orari
            </Link>
          </div>
        </section>
      )}

      {series.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm text-paper-50/60">Le tue serie</h2>
          {series.map((r) => {
            const hairdresser = Array.isArray(r.hairdressers) ? r.hairdressers[0] : r.hairdressers;
            const service = Array.isArray(r.services) ? r.services[0] : r.services;
            const next = (seriesOccurrences ?? []).filter((o) => o.recurring_booking_id === r.id).slice(0, 4);
            const pendingApproval = r.status === "pending_approval";
            return (
              <Link
                key={r.id}
                href="/app/appointments/recurring"
                className={`rounded-lg bg-ink-900 border p-4 flex flex-col gap-2 active:scale-[0.99] transition-transform ${
                  pendingApproval ? "border-dashed border-paper-50/25" : "border-paper-50/15"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {r.interval_weeks === 1 ? "Ogni settimana" : `Ogni ${r.interval_weeks} settimane`},{" "}
                      {WEEKDAYS[r.weekday]} alle {r.start_time.slice(0, 5)}
                    </p>
                    <p className="text-sm text-paper-50/70">
                      {service?.name} con {hairdresser?.display_name}
                    </p>
                  </div>
                  {pendingApproval && (
                    <span className="shrink-0 h-6 px-2 rounded-full border border-paper-50/30 text-xs text-paper-50/80 flex items-center">
                      In attesa
                    </span>
                  )}
                </div>
                {pendingApproval ? (
                  <p className="text-xs text-paper-50/50">Il barbiere deve ancora approvarla.</p>
                ) : next.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {next.map((o) => (
                      <span
                        key={o.occurrence_date}
                        className="h-7 px-2.5 rounded-full bg-ink-800 border border-paper-50/15 text-xs tabular-nums flex items-center"
                      >
                        {DateTime.fromISO(o.occurrence_date, { zone: tz }).toFormat("d LLL")}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-paper-50/50">Nessuna data futura programmata.</p>
                )}
              </Link>
            );
          })}
        </section>
      )}

      <Link
        href="/app/book"
        className={`h-14 rounded-md font-semibold flex items-center justify-center transition-[background-color,transform] active:scale-[0.98] ${
          usualSlot
            ? "border border-paper-50/25 text-paper-50 hover:border-paper-50/60"
            : "bg-accent text-paper-50 hover:bg-accent-hover"
        }`}
      >
        {usualSlot ? "Scegli un altro barbiere o servizio" : "Prenota un appuntamento"}
      </Link>

      <Link
        href="/app/book"
        className="rounded-lg bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-1"
      >
        <p className="font-medium">Sempre lo stesso orario?</p>
        <p className="text-paper-50/60 text-sm">
          Scegli il barbiere, poi &quot;Prenotazione ricorrente&quot;: ogni settimana, senza pensarci.
        </p>
      </Link>
    </div>
  );
}
