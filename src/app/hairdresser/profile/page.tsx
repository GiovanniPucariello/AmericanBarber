import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { parseRange } from "@/lib/availability/intervals";
import { PushToggle } from "@/components/push/push-toggle";

const WEEKDAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

export default async function HairdresserProfilePage() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hairdresser = organization ? await getCurrentHairdresser(organization.id) : null;
  const tz = organization?.timezone ?? "Europe/Rome";

  // Stats over the last 90 days + rest of this month, own appointments only.
  const now = DateTime.now().setZone(tz);
  const monthStart = now.startOf("month");
  const from = DateTime.min(monthStart, now.minus({ days: 90 }).startOf("day"));
  const to = monthStart.plus({ months: 1 });
  const { data: rows } = hairdresser
    ? await supabase
        .from("appointments")
        .select("customer_profile_id, during, status")
        .eq("hairdresser_id", hairdresser.id)
        .overlaps("during", `[${from.toISO()},${to.toISO()})`)
    : { data: [] };

  const nowMs = now.toMillis();
  const appts = (rows ?? []).map((r) => ({ ...r, start: parseRange(r.during as string).start }));
  const done = appts.filter((a) => ["confirmed", "completed"].includes(a.status) && a.start <= nowMs);
  const inMonth = (a: { start: number }) => a.start >= monthStart.toMillis() && a.start < to.toMillis();

  const monthDone = done.filter(inMonth);
  const monthUpcoming = appts.filter((a) => inMonth(a) && a.status === "confirmed" && a.start > nowMs).length;
  const monthCancelled = appts.filter((a) => inMonth(a) && a.status === "cancelled").length;
  const monthCustomers = new Set(monthDone.map((a) => a.customer_profile_id)).size;

  const last90 = done.filter((a) => a.start >= now.minus({ days: 90 }).toMillis());
  const perWeekday = Array(7).fill(0) as number[];
  for (const a of last90) perWeekday[DateTime.fromMillis(a.start, { zone: tz }).weekday - 1]++;
  const busiest = Math.max(...perWeekday);
  const busiestDay = busiest > 0 ? WEEKDAYS[perWeekday.indexOf(busiest)] : null;

  const visitsBy = new Map<string, number>();
  for (const a of last90) visitsBy.set(a.customer_profile_id, (visitsBy.get(a.customer_profile_id) ?? 0) + 1);
  const topIds = [...visitsBy.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);
  const { data: topProfiles } = topIds.length
    ? await supabase.from("co_member_profiles").select("id, full_name").in("id", topIds.map(([id]) => id))
    : { data: [] };
  const nameOf = new Map((topProfiles ?? []).map((p) => [p.id, p.full_name]));

  const stats = [
    { label: "Tagli fatti questo mese", value: monthDone.length },
    { label: "Ancora in agenda", value: monthUpcoming },
    { label: "Clienti diversi", value: monthCustomers },
    { label: "Annullati", value: monthCancelled },
  ];

  return (
    <div className="p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">{hairdresser?.displayName ?? "Profilo"}</h1>
        <p className="text-paper-50/60 text-sm">{user?.email}</p>
      </div>

      <section className="flex flex-col gap-3" aria-label="Statistiche">
        <h2 className="font-semibold capitalize">{now.toFormat("LLLL yyyy")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-ink-900 border border-paper-50/15 p-3">
              <p className="text-3xl font-semibold tabular-nums leading-none">{s.value}</p>
              <p className="text-xs text-paper-50/60 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        {busiestDay && (
          <p className="text-sm text-paper-50/70">
            Giorno più pieno negli ultimi 3 mesi: <span className="text-paper-50 font-semibold">{busiestDay}</span>
          </p>
        )}
        {topIds.length > 0 && (
          <div className="rounded-lg bg-ink-900 border border-paper-50/15 p-3">
            <p className="text-sm font-semibold mb-2">Clienti abituali (ultimi 3 mesi)</p>
            <ol className="flex flex-col divide-y divide-paper-50/10">
              {topIds.map(([id, count]) => (
                <li key={id} className="py-2 flex justify-between text-sm">
                  <Link href={`/hairdresser/customers/${id}`} className="underline underline-offset-2">
                    {nameOf.get(id) ?? "Cliente"}
                  </Link>
                  <span className="text-paper-50/60 tabular-nums">{count} visite</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <PushToggle />

      <form action={signOut}>
        <button
          type="submit"
          className="h-12 w-full rounded-md border border-paper-50/15 text-sm font-medium text-paper-50/80"
        >
          Esci
        </button>
      </form>
    </div>
  );
}
