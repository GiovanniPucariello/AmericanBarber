import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { computeDaySchedule } from "@/lib/availability/compute";
import { StaffBookingForm } from "@/components/booking/staff-booking-form";

const inputClass =
  "h-12 rounded-md bg-ink-900 border border-paper-50/15 px-3 text-paper-50 text-base focus:outline-none focus:border-accent w-full";

// Barber books a customer on their own agenda. Step 1 (GET form): service and
// day; step 2 (StaffBookingForm): free slot, customer, one-off or series.
export default async function NewStaffAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string; date?: string }>;
}) {
  const organization = await requireOrgRole("hairdresser");
  const hairdresser = await getCurrentHairdresser(organization.id);
  if (!hairdresser) redirect("/hairdresser");
  const tz = organization.timezone;

  const supabase = await createClient();
  const [{ data: offered }, { data: customerRows }] = await Promise.all([
    supabase.from("hairdresser_services").select("services!inner(id, name, duration_minutes)").eq("hairdresser_id", hairdresser.id),
    supabase.from("co_member_profiles").select("id, full_name").eq("is_customer", true).order("full_name"),
  ]);
  const services = (offered ?? [])
    .map((r) => (Array.isArray(r.services) ? r.services[0] : r.services))
    .filter((s): s is { id: string; name: string; duration_minutes: number } => !!s);

  const params = await searchParams;
  const today = DateTime.now().setZone(tz).toISODate() as string;
  const date = params.date && params.date >= today ? params.date : today;
  const service = services.find((s) => s.id === params.serviceId) ?? services[0];

  const slots = service
    ? (
        await computeDaySchedule(supabase, {
          hairdresserId: hairdresser.id,
          date,
          timeZone: tz,
          serviceDurationMinutes: service.duration_minutes,
          bookingIntervalMinutes: organization.bookingIntervalMinutes,
        })
      )
        .filter((s) => s.available)
        .map((s) => ({ startUtc: s.startUtc, label: DateTime.fromISO(s.startUtc).setZone(tz).toFormat("HH:mm") }))
    : [];
  const customers = (customerRows ?? []).map((c) => ({ id: c.id as string, name: c.full_name ?? "Senza nome" }));

  return (
    <div className="p-6 flex flex-col gap-6">
      <Link href="/hairdresser" className="text-sm text-paper-50/60 underline underline-offset-2 self-start">
        Agenda
      </Link>
      <h1 className="text-xl font-semibold">Nuovo appuntamento</h1>

      {!service ? (
        <p className="text-sm text-paper-50/60">Non hai ancora servizi prenotabili.</p>
      ) : (
        <>
          <form method="get" className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-paper-50/60">Servizio</span>
              <select name="serviceId" defaultValue={service.id} className={inputClass}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-paper-50/60">Giorno</span>
              <input type="date" name="date" defaultValue={date} min={today} className={inputClass} />
            </label>
            <button type="submit" className="h-11 rounded-md border border-paper-50/25 text-sm font-medium">
              Mostra orari liberi
            </button>
          </form>

          <StaffBookingForm key={`${service.id}-${date}`} serviceId={service.id} slots={slots} customers={customers} />
        </>
      )}
    </div>
  );
}
