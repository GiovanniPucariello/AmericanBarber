import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { parseRange } from "@/lib/availability/intervals";
import { computeDaySchedule } from "@/lib/availability/compute";
import { cancelAppointmentAsHairdresser } from "@/lib/bookings/actions";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { RescheduleSlots } from "@/components/appointments/reschedule-slots";
import { DateCarousel } from "@/components/booking/date-carousel";

// Barber's view of one appointment: who, when, how to reach them, and the
// two changes a barber can make - propose a new time, or cancel.
export default async function HairdresserAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/hairdresser");
  const hairdresser = await getCurrentHairdresser(organization.id);
  if (!hairdresser) redirect("/hairdresser");

  const { id } = await params;
  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, during, status, service_id, customer_profile_id, services(name)")
    .eq("id", id)
    .eq("hairdresser_id", hairdresser.id)
    .maybeSingle();
  if (!appointment) notFound();

  const tz = organization.timezone;
  const { start, end } = parseRange(appointment.during as string);
  const startLocal = DateTime.fromMillis(start, { zone: "utc" }).setZone(tz);
  const endLocal = DateTime.fromMillis(end, { zone: "utc" }).setZone(tz);
  const durationMinutes = Math.round((end - start) / 60_000);
  const service = Array.isArray(appointment.services) ? appointment.services[0] : appointment.services;
  const active = ["pending", "confirmed"].includes(appointment.status) && start > Date.now();

  const [{ data: customer }, { data: proposal }] = await Promise.all([
    supabase
      .from("co_member_profiles")
      .select("id, full_name, phone")
      .eq("id", appointment.customer_profile_id)
      .maybeSingle(),
    supabase
      .from("appointment_reschedule_proposals")
      .select("proposed_during")
      .eq("appointment_id", id)
      .maybeSingle(),
  ]);
  const proposedStart = proposal
    ? DateTime.fromMillis(parseRange(proposal.proposed_during as string).start, { zone: "utc" }).setZone(tz)
    : null;

  const { date: requestedDate } = await searchParams;
  const date = requestedDate ?? (startLocal.toISODate() as string);
  const schedule = active
    ? await computeDaySchedule(supabase, {
        hairdresserId: hairdresser.id,
        date,
        timeZone: tz,
        serviceDurationMinutes: durationMinutes,
        bookingIntervalMinutes: organization.bookingIntervalMinutes,
      })
    : [];
  const freeSlots = schedule
    .filter((s) => s.available)
    .map((s) => {
      const t = DateTime.fromISO(s.startUtc, { zone: "utc" }).setZone(tz);
      return { startUtc: s.startUtc, label: `${t.toFormat("cccc d LLLL")} alle ${t.toFormat("HH:mm")}` };
    });

  return (
    <div className="p-6 flex flex-col gap-5">
      <Link href={`/hairdresser?date=${startLocal.toISODate()}`} className="text-sm text-paper-50/60 underline underline-offset-2 self-start">
        Agenda
      </Link>

      <div className="rounded-lg bg-ink-900 border border-paper-50/15 border-l-4 border-l-accent p-4">
        <p className="text-sm text-paper-50/70 capitalize">{startLocal.toFormat("cccc d LLLL")}</p>
        <p className="text-4xl font-semibold tabular-nums leading-tight">
          {startLocal.toFormat("HH:mm")}
          <span className="text-lg text-paper-50/50 font-normal"> – {endLocal.toFormat("HH:mm")}</span>
        </p>
        <p className="text-paper-50/70 mt-1">{service?.name}</p>
        {appointment.status === "cancelled" && <p className="mt-2 text-sm font-medium">Annullato</p>}
      </div>

      <section className="rounded-lg bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-2">
        <Link href={`/hairdresser/customers/${appointment.customer_profile_id}`} className="font-semibold underline underline-offset-2 self-start">
          {customer?.full_name ?? "Cliente"}
        </Link>
        {customer?.phone ? (
          <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="h-11 px-4 rounded-md border border-paper-50/25 text-sm font-medium flex items-center self-start">
            Chiama {customer.phone}
          </a>
        ) : (
          <p className="text-sm text-paper-50/50">Nessun telefono nel profilo del cliente.</p>
        )}
        <Link href={`/hairdresser/appointments/${id}/messages`} className="h-11 px-4 rounded-md bg-ink-800 border border-paper-50/15 text-sm font-medium flex items-center self-start">
          Scrivi al cliente
        </Link>
      </section>

      {active && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold">Sposta appuntamento</h2>
            <p className="text-sm text-paper-50/60">
              Scegli un nuovo orario: il cliente riceve la proposta e decide se accettare.
            </p>
          </div>
          {proposedStart && (
            <p className="rounded-md border border-accent bg-accent/15 p-3 text-sm">
              In attesa del cliente: proposto <span className="capitalize">{proposedStart.toFormat("cccc d LLLL")}</span> alle{" "}
              {proposedStart.toFormat("HH:mm")}. Una nuova scelta sostituisce questa proposta.
            </p>
          )}
          <DateCarousel timeZone={tz} selectedDate={date} serviceId={appointment.service_id} />
          <RescheduleSlots key={date} appointmentId={id} slots={freeSlots} />
        </section>
      )}

      {active && (
        <section className="flex flex-col gap-2 border-t border-paper-50/10 pt-4">
          <CancelAppointmentButton
            appointmentId={id}
            cancelAction={cancelAppointmentAsHairdresser}
            question="Annullare? Il cliente riceve una notifica."
          />
        </section>
      )}
    </div>
  );
}
