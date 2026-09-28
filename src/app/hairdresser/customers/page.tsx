import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { parseRange } from "@/lib/availability/intervals";

// Every customer of the shop (staff-only view), with visits to this barber.
export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/hairdresser");
  const hairdresser = await getCurrentHairdresser(organization.id);
  const { q = "" } = await searchParams;
  const query = q.trim();

  const supabase = await createClient();
  let customersQuery = supabase
    .from("co_member_profiles")
    .select("id, full_name, phone")
    .eq("is_customer", true)
    .order("full_name");
  if (query) customersQuery = customersQuery.ilike("full_name", `%${query.replace(/[%_]/g, "")}%`);

  const [{ data: customers }, { data: visits }] = await Promise.all([
    customersQuery,
    supabase
      .from("appointments")
      .select("customer_profile_id, during")
      .eq("hairdresser_id", hairdresser?.id ?? "")
      .in("status", ["confirmed", "completed"]),
  ]);

  const nowMs = Date.now();
  const statsById = new Map<string, { count: number; last: number }>();
  for (const v of visits ?? []) {
    const start = parseRange(v.during as string).start;
    if (start > nowMs) continue;
    const s = statsById.get(v.customer_profile_id) ?? { count: 0, last: 0 };
    statsById.set(v.customer_profile_id, { count: s.count + 1, last: Math.max(s.last, start) });
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Clienti</h1>
      <form className="flex gap-2" role="search">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Cerca per nome"
          className="h-12 flex-1 min-w-0 rounded-md bg-ink-900 border border-paper-50/15 px-4 text-paper-50 placeholder:text-paper-50/40 focus:outline-none focus:border-accent"
        />
        <button type="submit" className="h-12 px-4 rounded-md border border-paper-50/25 text-sm font-medium">
          Cerca
        </button>
      </form>
      <p className="text-sm text-paper-50/60">{customers?.length ?? 0} clienti</p>

      <ul className="flex flex-col gap-2">
        {(customers ?? []).map((c) => {
          const stats = statsById.get(c.id);
          return (
            <li key={c.id} className="rounded-md bg-ink-900 border border-paper-50/15 p-3 flex items-center gap-3">
              <Link href={`/hairdresser/customers/${c.id}`} className="flex-1 min-w-0">
                <p className="font-medium truncate underline underline-offset-2">{c.full_name ?? "Senza nome"}</p>
                <p className="text-xs text-paper-50/60">
                  {stats
                    ? `${stats.count} ${stats.count === 1 ? "visita" : "visite"} con te, ultima ${DateTime.fromMillis(stats.last, { zone: organization.timezone }).toFormat("d LLL")}`
                    : "Mai venuto da te"}
                </p>
              </Link>
              {c.phone && (
                <a
                  href={`tel:${c.phone.replace(/\s/g, "")}`}
                  aria-label={`Chiama ${c.full_name ?? "cliente"}`}
                  className="h-11 px-3 rounded-md border border-paper-50/25 text-sm font-medium flex items-center shrink-0"
                >
                  Chiama
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
