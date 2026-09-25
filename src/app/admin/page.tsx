import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { parseRange } from "@/lib/availability/intervals";

export default async function AdminDashboard() {
  const organization = await requireOrgRole("admin");
  const supabase = await createClient();

  const todayStart = DateTime.now().setZone(organization.timezone).startOf("day");
  const todayEnd = todayStart.plus({ days: 1 });
  const todayRangeLiteral = `[${todayStart.toISO()},${todayEnd.toISO()})`;

  const [{ data: appointmentsRaw }, { count: pendingRecurringCount }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, during, hairdressers(display_name), services(name)")
      .eq("organization_id", organization.id)
      .in("status", ["pending", "confirmed"])
      .overlaps("during", todayRangeLiteral),
    supabase
      .from("recurring_bookings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("status", "pending_approval"),
  ]);

  const todayStartMs = todayStart.toMillis();
  const todayEndMs = todayEnd.toMillis();
  const todaysAppointments = (appointmentsRaw ?? [])
    .map((a) => {
      const { start } = parseRange(a.during as string);
      const hairdresser = Array.isArray(a.hairdressers) ? a.hairdressers[0] : a.hairdressers;
      const service = Array.isArray(a.services) ? a.services[0] : a.services;
      return { id: a.id, start, hairdresserName: hairdresser?.display_name, serviceName: service?.name };
    })
    .filter((a) => a.start >= todayStartMs && a.start < todayEndMs)
    .sort((a, b) => a.start - b.start);

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-ink-900 border border-paper-50/15 p-4">
          <p className="text-2xl font-semibold">{todaysAppointments.length}</p>
          <p className="text-paper-50/60 text-sm">Appuntamenti di oggi</p>
        </div>
        <div className="rounded-lg bg-ink-900 border border-paper-50/15 p-4">
          <p className="text-2xl font-semibold">{pendingRecurringCount ?? 0}</p>
          <p className="text-paper-50/60 text-sm">Richieste ricorrenti in attesa</p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Oggi</h2>
          <Link href="/admin/calendar" className="text-sm underline underline-offset-2">
            Calendario completo
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {todaysAppointments.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-md bg-ink-900 border border-paper-50/15 p-3">
              <span className="w-14 shrink-0 text-sm">
                {DateTime.fromMillis(a.start, { zone: "utc" }).setZone(organization.timezone).toFormat("HH:mm")}
              </span>
              <p className="text-sm">
                {a.hairdresserName} - {a.serviceName}
              </p>
            </li>
          ))}
          {todaysAppointments.length === 0 && <p className="text-paper-50/60">Nessun appuntamento oggi.</p>}
        </ul>
      </section>

      <nav className="flex flex-col gap-2">
        <Link href="/admin/services" className="underline underline-offset-2">
          Servizi
        </Link>
        <Link href="/admin/staff" className="underline underline-offset-2">
          Personale
        </Link>
        <Link href="/admin/settings" className="underline underline-offset-2">
          Impostazioni
        </Link>
      </nav>
    </div>
  );
}
