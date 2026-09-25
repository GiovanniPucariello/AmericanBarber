import Link from "next/link";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { parseRange } from "@/lib/availability/intervals";
import { monthGridRangeIso } from "@/lib/calendar/month-grid";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { DayPanel } from "@/components/calendar/day-panel";

// Real calendar grid (section 43): a month view that collapses to the
// selected week on tap, Apple Calendar-style, same component/motion
// language as the hairdresser agenda and the customer booking flow.
export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; hairdresserId?: string }>;
}) {
  const organization = await requireOrgRole("admin");
  const supabase = await createClient();

  const { data: hairdressers } = await supabase
    .from("hairdressers")
    .select("id, display_name")
    .eq("organization_id", organization.id)
    .order("sort_order");

  const { date: requestedDate, hairdresserId } = await searchParams;
  const today = DateTime.now().setZone(organization.timezone).toISODate() as string;
  const date = requestedDate ?? today;
  const dayStart = DateTime.fromISO(date, { zone: organization.timezone });
  const dayEnd = dayStart.plus({ days: 1 });
  const dayRangeLiteral = `[${dayStart.toISO()},${dayEnd.toISO()})`;

  let query = supabase
    .from("appointments")
    .select("id, during, status, customer_profile_id, hairdressers(display_name), services(name)")
    .eq("organization_id", organization.id)
    .in("status", ["pending", "confirmed"])
    .overlaps("during", dayRangeLiteral);
  if (hairdresserId) {
    query = query.eq("hairdresser_id", hairdresserId);
  }
  const { data: appointmentsRaw } = await query;

  const dayStartMs = dayStart.toMillis();
  const dayEndMs = dayEnd.toMillis();
  const appointments = (appointmentsRaw ?? [])
    .map((a) => {
      const { start } = parseRange(a.during as string);
      const hairdresser = Array.isArray(a.hairdressers) ? a.hairdressers[0] : a.hairdressers;
      const service = Array.isArray(a.services) ? a.services[0] : a.services;
      return { id: a.id, start, customerProfileId: a.customer_profile_id, hairdresserName: hairdresser?.display_name, serviceName: service?.name };
    })
    .filter((a) => a.start >= dayStartMs && a.start < dayEndMs)
    .sort((a, b) => a.start - b.start);

  const customerIds = [...new Set(appointments.map((a) => a.customerProfileId))];
  const { data: customers } = customerIds.length
    ? await supabase.from("co_member_profiles").select("id, full_name").in("id", customerIds)
    : { data: [] };
  const nameById = new Map((customers ?? []).map((c) => [c.id, c.full_name]));

  const { startIso, endIso } = monthGridRangeIso(date, organization.timezone);
  const monthRangeLiteral = `[${DateTime.fromISO(startIso, { zone: organization.timezone }).toISO()},${DateTime.fromISO(endIso, { zone: organization.timezone }).toISO()})`;
  let monthQuery = supabase
    .from("appointments")
    .select("during")
    .eq("organization_id", organization.id)
    .in("status", ["pending", "confirmed"])
    .overlaps("during", monthRangeLiteral);
  if (hairdresserId) {
    monthQuery = monthQuery.eq("hairdresser_id", hairdresserId);
  }
  const { data: monthAppointmentsRaw } = await monthQuery;
  const daysWithAppointments = [
    ...new Set(
      (monthAppointmentsRaw ?? []).map((a) => {
        const { start } = parseRange(a.during as string);
        return DateTime.fromMillis(start, { zone: "utc" }).setZone(organization.timezone).toISODate() as string;
      }),
    ),
  ];

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Calendario</h1>

      <form className="flex gap-2">
        <input type="hidden" name="date" value={date} />
        <select name="hairdresserId" defaultValue={hairdresserId ?? ""} className="h-11 rounded-md bg-ink-900 border border-paper-50/15 px-3 text-paper-50 text-sm">
          <option value="">Tutti i barbieri</option>
          {hairdressers?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.display_name}
            </option>
          ))}
        </select>
        <button type="submit" className="h-11 px-3 rounded-md bg-ink-900 border border-paper-50/15 text-sm">
          Vai
        </button>
      </form>

      <MonthCalendar
        selectedDate={date}
        todayIso={today}
        timeZone={organization.timezone}
        daysWithAppointments={daysWithAppointments}
        extraParams={{ hairdresserId }}
      />

      <DayPanel dateKey={date} label={DateTime.fromISO(date, { zone: organization.timezone }).toFormat("cccc d LLLL")}>
        <ul className="flex flex-col gap-2">
          {appointments.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-md bg-ink-900 border border-paper-50/15 p-3">
              <span className="w-14 shrink-0 text-sm">
                {DateTime.fromMillis(a.start, { zone: "utc" }).setZone(organization.timezone).toFormat("HH:mm")}
              </span>
              <div>
                <p>{nameById.get(a.customerProfileId) ?? "Cliente"}</p>
                <p className="text-paper-50/60 text-sm">
                  {a.hairdresserName} - {a.serviceName}
                </p>
              </div>
            </li>
          ))}
          {appointments.length === 0 && <p className="text-paper-50/60">Niente in programma.</p>}
        </ul>
      </DayPanel>

      <Link href="/admin/staff" className="text-sm underline underline-offset-2">
        Personale
      </Link>
    </div>
  );
}
