import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { cancelAllFutureOccurrences, cancelRecurringOccurrence } from "@/lib/recurring/actions";

const WEEKDAY_LABELS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const STATUS_LABELS: Record<string, string> = {
  pending_approval: "in attesa di approvazione",
  active: "attivo",
  rejected: "rifiutato",
  cancelled: "annullato",
};
const OCCURRENCE_STATUS_LABELS: Record<string, string> = {
  scheduled: "programmato",
  confirmed: "confermato",
  conflict: "conflitto",
  cancelled: "annullato",
  skipped: "saltato",
  rescheduled: "riprogrammato",
  completed: "completato",
  no_show: "non presentato",
};

export default async function RecurringAppointmentsPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rules } = await supabase
    .from("recurring_bookings")
    .select(
      "id, weekday, start_time, interval_weeks, starts_on, ends_on, status, hairdressers(display_name), services(name)",
    )
    .eq("customer_profile_id", user?.id ?? "")
    .order("requested_at", { ascending: false });

  const ruleIds = (rules ?? []).map((r) => r.id);
  const { data: occurrences } = ruleIds.length
    ? await supabase
        .from("recurring_booking_occurrences")
        .select("id, recurring_booking_id, occurrence_date, status, conflict_reason")
        .in("recurring_booking_id", ruleIds)
        .order("occurrence_date", { ascending: true })
    : { data: [] };

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Le tue prenotazioni ricorrenti</h1>

      {(rules ?? []).map((rule) => {
        const hairdresser = Array.isArray(rule.hairdressers) ? rule.hairdressers[0] : rule.hairdressers;
        const service = Array.isArray(rule.services) ? rule.services[0] : rule.services;
        const ruleOccurrences = (occurrences ?? []).filter(
          (o) => o.recurring_booking_id === rule.id,
        );

        return (
          <div key={rule.id} className="rounded-md bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-3">
            <div>
              <p>
                {hairdresser?.display_name} - {service?.name}
              </p>
              <p className="text-paper-50/60 text-sm">
                Ogni {rule.interval_weeks > 1 ? `${rule.interval_weeks} settimane` : "settimana"} di{" "}
                {WEEKDAY_LABELS[rule.weekday]} alle {rule.start_time.slice(0, 5)}
              </p>
              <p className="text-paper-50/40 text-sm capitalize">{STATUS_LABELS[rule.status] ?? rule.status}</p>
            </div>

            {rule.status === "active" && (
              <form action={cancelAllFutureOccurrences.bind(null, rule.id)}>
                <button type="submit" className="text-sm underline underline-offset-2">
                  Annulla tutti gli appuntamenti futuri
                </button>
              </form>
            )}

            {ruleOccurrences.length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-paper-50/10 pt-3">
                {ruleOccurrences.map((occ) => (
                  <li key={occ.id} className="flex items-center justify-between text-sm">
                    <span>
                      {occ.occurrence_date} - {OCCURRENCE_STATUS_LABELS[occ.status] ?? occ.status}
                      {occ.conflict_reason ? ` (${occ.conflict_reason})` : ""}
                    </span>
                    {(occ.status === "scheduled" || occ.status === "confirmed") && (
                      <form action={cancelRecurringOccurrence.bind(null, occ.id)}>
                        <button type="submit" className="underline underline-offset-2">
                          Annulla questa data
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {(rules ?? []).length === 0 && (
        <div className="rounded-md bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-paper-50/60">
            Prenota lo stesso orario ogni settimana e salta la scelta manuale da qui in poi.
          </p>
          <Link
            href="/app/book"
            className="h-11 px-6 rounded-md bg-accent text-paper-50 font-medium flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
          >
            Imposta una prenotazione ricorrente
          </Link>
        </div>
      )}
    </div>
  );
}
