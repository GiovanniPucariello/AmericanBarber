import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { parseRange } from "@/lib/availability/intervals";

// Consumer-oriented home (section 40) - not a "Dashboard". Structure:
// welcome -> next appointment -> book CTA -> recurring prompt -> preview.
export default async function AppHome() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return <div className="p-6">Nessuna appartenenza a un&apos;organizzazione.</div>;
  }

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

  const nowMs = DateTime.now().toMillis();
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

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <p className="text-paper-50/60 text-sm">Bentornato</p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName ?? ""} 👋</h1>
      </div>

      <div>
        <p className="text-sm text-paper-50/60 mb-2">Il tuo prossimo appuntamento</p>
        {upcoming && nextStart ? (
          <Link
            href="/app/appointments"
            className="block rounded-lg bg-ink-900 border border-paper-50/15 p-4"
          >
            <p className="font-medium">{nextStart.toFormat("cccc d LLLL")}</p>
            <p className="text-paper-50/70">{nextStart.toFormat("HH:mm")}</p>
            <p className="text-paper-50/70 text-sm mt-1">
              {nextHairdresser?.display_name} - {nextService?.name}
            </p>
          </Link>
        ) : (
          <div className="rounded-lg bg-ink-900 border border-paper-50/15 border-dashed p-4">
            <p className="text-paper-50/60">Nessun appuntamento in programma.</p>
          </div>
        )}
      </div>

      <Link
        href="/app/book"
        className="h-14 rounded-md bg-accent text-paper-50 font-semibold flex items-center justify-center transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]"
      >
        Prenota il tuo prossimo appuntamento
      </Link>

      <Link
        href="/app/book"
        className="rounded-lg bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-1"
      >
        <p className="font-medium">Sempre lo stesso orario?</p>
        <p className="text-paper-50/60 text-sm">
          Imposta un appuntamento ricorrente e non pensarci più.
        </p>
      </Link>

      <Link href="/app/appointments" className="text-sm underline underline-offset-2 self-start">
        I tuoi appuntamenti
      </Link>
    </div>
  );
}
