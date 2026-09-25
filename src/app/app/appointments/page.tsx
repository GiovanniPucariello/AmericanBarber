import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { cancelAppointment } from "@/lib/bookings/actions";
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
  const past = rows.filter((r) => r.isPast);

  const unreadCounts = user
    ? await getUnreadMessageCounts(supabase, upcoming.map((r) => r.id), user.id)
    : new Map<string, number>();

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">I tuoi appuntamenti</h1>
        <Link href="/app/appointments/recurring" className="text-sm underline underline-offset-2">
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
        <ul className="flex flex-col gap-2">
          {upcoming.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-md bg-ink-900 border border-paper-50/15 p-4"
            >
              <div>
                <p className="font-medium">{a.start.toFormat("cccc d LLLL, HH:mm")}</p>
                <p className="text-paper-50/60 text-sm">
                  {a.hairdresser?.display_name} - {a.service?.name}
                </p>
                <p className="text-paper-50/40 text-sm capitalize">{STATUS_LABELS[a.status] ?? a.status}</p>
              </div>
              {(a.status === "confirmed" || a.status === "pending") && (
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Link
                    href={`/app/appointments/${a.id}/messages`}
                    className="text-sm underline underline-offset-2"
                  >
                    Messaggi{unreadCounts.get(a.id) ? ` (${unreadCounts.get(a.id)})` : ""}
                  </Link>
                  <form action={cancelAppointment.bind(null, a.id)}>
                    <button type="submit" className="text-sm underline underline-offset-2">
                      Annulla
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
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
                <p>{a.start.toFormat("cccc d LLLL, HH:mm")}</p>
                <p className="text-paper-50/60 text-sm">
                  {a.hairdresser?.display_name} - {a.service?.name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
