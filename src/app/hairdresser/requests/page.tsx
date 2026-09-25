import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { approveRecurringBooking, rejectRecurringBooking } from "@/lib/recurring/actions";

const WEEKDAY_LABELS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default async function RequestsPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

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
  const { data: requests } = await supabase
    .from("recurring_bookings")
    .select("id, customer_profile_id, weekday, start_time, interval_weeks, starts_on, ends_on, services(name)")
    .eq("hairdresser_id", hairdresser.id)
    .eq("status", "pending_approval")
    .order("requested_at", { ascending: true });

  // profiles has RLS restricting reads to your own row - reading a
  // customer's name here goes through the co_member_profiles view (same
  // reasoning as section D: no direct visibility into another user's
  // profile row, only the minimal fields the view exposes).
  const customerIds = [...new Set((requests ?? []).map((r) => r.customer_profile_id))];
  const { data: customers } = customerIds.length
    ? await supabase.from("co_member_profiles").select("id, full_name").in("id", customerIds)
    : { data: [] };
  const nameById = new Map((customers ?? []).map((c) => [c.id, c.full_name]));

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Richieste</h1>

      <ul className="flex flex-col gap-3">
        {requests?.map((r) => {
          const service = Array.isArray(r.services) ? r.services[0] : r.services;

          return (
            <li key={r.id} className="rounded-md bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-3">
              <div>
                <p>{nameById.get(r.customer_profile_id) ?? "Cliente"}</p>
                <p className="text-paper-50/60 text-sm">{service?.name}</p>
                <p className="text-paper-50/60 text-sm">
                  Ogni {r.interval_weeks > 1 ? `${r.interval_weeks} settimane` : "settimana"} di{" "}
                  {WEEKDAY_LABELS[r.weekday]} alle {r.start_time.slice(0, 5)}
                </p>
                <p className="text-paper-50/40 text-sm">
                  Dal {r.starts_on}
                  {r.ends_on ? ` al ${r.ends_on}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <form action={approveRecurringBooking.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-md bg-accent text-paper-50 text-sm font-medium"
                  >
                    Accetta
                  </button>
                </form>
                <form action={rejectRecurringBooking.bind(null, r.id)}>
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-md bg-ink-900 border border-paper-50/15 text-sm"
                  >
                    Rifiuta
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
      {requests?.length === 0 && (
        <div className="rounded-md bg-ink-900 border border-paper-50/15 border-dashed p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-paper-50/60">Nessuna richiesta in attesa.</p>
          <Link href="/hairdresser" className="text-sm underline underline-offset-2">
            Torna all&apos;agenda
          </Link>
        </div>
      )}
    </div>
  );
}
