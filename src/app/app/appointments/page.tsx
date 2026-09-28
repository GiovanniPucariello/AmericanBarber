import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { NavIcon } from "@/components/layout/nav-icon";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { parseRange } from "@/lib/availability/intervals";
import { getUnreadMessageCounts } from "@/lib/messages/queries";

const STATUS_LABELS: Record<string, string> = {
  pending: "in attesa",
  confirmed: "confermato",
  rejected: "rifiutato",
  cancelled: "annullato",
  completed: "completato",
};

export default async function AppointmentsPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, during, status, hairdressers(display_name), services(name)")
    .eq("customer_profile_id", user?.id ?? "")
    .order("during", { ascending: true });

  const nowMs = DateTime.now().toMillis();
  const rows = (appointments ?? []).map((a) => {
    const hairdresser = Array.isArray(a.hairdressers) ? a.hairdressers[0] : a.hairdressers;
    const service = Array.isArray(a.services) ? a.services[0] : a.services;
    const startMs = parseRange(a.during as string).start;
    return {
      id: a.id,
      status: a.status,
      hairdresser,
      service,
      start: DateTime.fromMillis(startMs, { zone: "utc" }).setZone(organization.timezone),
      isPast: startMs < nowMs,
    };
  });

  const upcoming = rows.filter((r) => !r.isPast);
  // Most recent first - nobody scrolls past last year to find last week.
  const past = rows.filter((r) => r.isPast).reverse();

  // Which upcoming appointments belong to a recurring series.
  const { data: seriesLinks } = upcoming.length
    ? await supabase
        .from("recurring_booking_occurrences")
        .select("appointment_id")
        .in("appointment_id", upcoming.map((r) => r.id))
    : { data: [] };
  const inSeries = new Set((seriesLinks ?? []).map((l) => l.appointment_id));

  const unreadCounts = user
    ? await getUnreadMessageCounts(supabase, upcoming.map((r) => r.id), user.id)
    : new Map<string, number>();

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">I tuoi appuntamenti</h1>
        <Link href="/app/appointments/recurring" className="h-11 -mr-2 px-2 flex items-center text-sm underline underline-offset-2">
          Ricorrenti
        </Link>
      </div>

      {upcoming.length === 0 && (
        <div className="rounded-md bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-paper-50/60">
            Il tuo prossimo appuntamento potrebbe essere qui.
          </p>
          <Link
            href="/app/book"
            className="h-11 px-6 rounded-md bg-accent text-paper-50 font-medium flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
          >
            Prenota ora
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <ul className="flex flex-col gap-3">
          {upcoming.map((a) => {
            const unread = unreadCounts.get(a.id) ?? 0;
            const active = a.status === "confirmed" || a.status === "pending";
            return (
              <li
                key={a.id}
                className="rounded-lg bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-paper-50/60 capitalize">{a.start.toFormat("cccc d LLLL")}</p>
                    <p className="text-2xl font-semibold tabular-nums leading-tight">{a.start.toFormat("HH:mm")}</p>
                    <p className="text-paper-50/70 text-sm mt-0.5">
                      {a.hairdresser?.display_name} · {a.service?.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`shrink-0 h-6 px-2 rounded-full text-xs font-medium flex items-center ${
                      a.status === "confirmed"
                        ? "bg-paper-50 text-ink-950"
                        : "border border-paper-50/30 text-paper-50/80"
                    }`}
                  >
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                  {inSeries.has(a.id) && (
                    <span className="shrink-0 h-6 px-2 rounded-full border border-paper-50/30 text-xs text-paper-50/80 flex items-center">
                      Serie
                    </span>
                  )}
                  </div>
                </div>
                {active && (
                  <div className="flex flex-col gap-2 border-t border-paper-50/10 pt-3">
                    <Link
                      href={`/app/appointments/${a.id}/messages`}
                      className="h-11 px-4 rounded-md bg-ink-800 border border-paper-50/15 text-sm font-medium flex items-center justify-between"
                    >
                      Scrivi a {a.hairdresser?.display_name ?? "barbiere"}
                      {unread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-paper-50 text-xs font-semibold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </Link>
                    <a
                      href={`/app/appointments/${a.id}/calendar`}
                      className="h-11 px-4 rounded-md border border-paper-50/15 text-sm font-medium flex items-center gap-2"
                    >
                      <NavIcon name="calendar" className="w-5 h-5" />
                      Aggiungi al calendario
                    </a>
                    <CancelAppointmentButton appointmentId={a.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-paper-50/40 text-sm">Passati</p>
          <ul className="flex flex-col gap-2">
            {past.map((a) => (
              <li
                key={a.id}
                className="rounded-md bg-ink-900 border border-paper-50/10 p-4 opacity-60"
              >
                <p className="capitalize">{a.start.toFormat("cccc d LLLL, HH:mm")}</p>
                <p className="text-paper-50/60 text-sm">
                  {a.hairdresser?.display_name} · {a.service?.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
