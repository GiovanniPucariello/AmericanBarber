"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { computeAvailableSlots } from "@/lib/availability/compute";
import { parseRange } from "@/lib/availability/intervals";
import { createAppointmentSchema } from "./schemas";

export type BookingActionState = { error: string | null };

// Postgres exclusion-constraint violation - the exact SQLSTATE the
// appointments.no_overlapping_appointments constraint raises (section E).
const EXCLUSION_VIOLATION = "23P01";

export async function createAppointment(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const organization = await getCurrentOrganization();
  if (!organization) return { error: "Nessuna appartenenza a un'organizzazione." };

  const parsed = createAppointmentSchema.safeParse({
    hairdresserId: formData.get("hairdresserId"),
    serviceId: formData.get("serviceId"),
    startUtc: formData.get("startUtc"),
  });
  if (!parsed.success) {
    return { error: "Questo link di prenotazione non è valido - riprova da capo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Devi effettuare l'accesso." };

  // Duration comes from the service record, never from client input -
  // otherwise a tampered form could book a shorter "during" range than the
  // service actually needs.
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", parsed.data.serviceId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!service) return { error: "Questo servizio non è più disponibile." };

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!location) return { error: "Nessuna sede configurata per questa organizzazione." };

  const start = DateTime.fromISO(parsed.data.startUtc, { zone: "utc" });
  const end = start.plus({ minutes: service.duration_minutes });

  // The exclusion constraint only stops overlaps - it knows nothing about
  // working hours, days off, past times or which services a barber does.
  // A tampered or stale link must only book a slot the picker would offer.
  const { data: offered } = await supabase
    .from("hairdresser_services")
    .select("hairdresser_id, hairdressers!inner(active)")
    .eq("hairdresser_id", parsed.data.hairdresserId)
    .eq("service_id", parsed.data.serviceId)
    .eq("hairdressers.active", true)
    .maybeSingle();
  if (!offered) return { error: "Questo barbiere non offre il servizio scelto." };

  const openSlots = await computeAvailableSlots(supabase, {
    hairdresserId: parsed.data.hairdresserId,
    date: start.setZone(organization.timezone).toISODate() as string,
    timeZone: organization.timezone,
    serviceDurationMinutes: service.duration_minutes,
    bookingIntervalMinutes: organization.bookingIntervalMinutes,
  });
  if (!openSlots.some((slot) => Date.parse(slot.startUtc) === start.toMillis())) {
    return { error: "Questo orario non è più disponibile. Scegli un altro orario." };
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      organization_id: organization.id,
      location_id: location.id,
      hairdresser_id: parsed.data.hairdresserId,
      customer_profile_id: user.id,
      service_id: parsed.data.serviceId,
      during: `[${start.toISO()},${end.toISO()})`,
      status: "confirmed",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    // The database is the actual authority on double-booking (section E) -
    // this insert either succeeds or fails outright, there's no separate
    // "check first" step to race. A caught 23P01 here means someone else's
    // booking landed on this exact range microseconds earlier.
    if (error.code === EXCLUSION_VIOLATION) {
      return {
        error: "Questo orario è appena stato preso. Scegli un altro orario.",
      };
    }
    console.error("createAppointment insert failed", error);
    return { error: "Non è stato possibile completare la prenotazione. Riprova." };
  }

  await supabase.rpc("emit_notification_event", {
    p_type: "booking_confirmed",
    p_appointment_id: appointment.id,
  });

  revalidatePath("/app/appointments");
  redirect(`/app/book/${parsed.data.hairdresserId}/success?appointmentId=${appointment.id}`);
}

export async function cancelAppointment(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Only upcoming, still-active appointments can be cancelled - not a past
  // or completed one (RLS alone allows any own row).
  const { data: appointment } = await supabase
    .from("appointments")
    .select("status, during")
    .eq("id", id)
    .eq("customer_profile_id", user.id)
    .maybeSingle();
  if (
    !appointment ||
    !["pending", "confirmed"].includes(appointment.status) ||
    parseRange(appointment.during as string).start <= Date.now()
  ) {
    return;
  }

  await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
    })
    .eq("id", id);

  await supabase.rpc("emit_notification_event", {
    p_type: "booking_cancelled",
    p_appointment_id: id,
  });

  revalidatePath("/app/appointments");
}

// Barber-side cancel (RLS: own hairdresser may set status). Notifies the
// customer and wakes anyone on that day's waitlist.
export async function cancelAppointmentAsHairdresser(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: updated } = await supabase
    .from("appointments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: user.id })
    .eq("id", id)
    .in("status", ["pending", "confirmed"])
    .select("id")
    .maybeSingle();
  if (!updated) return;

  await supabase.rpc("emit_notification_event", {
    p_type: "booking_cancelled_by_hairdresser",
    p_appointment_id: id,
  });
  revalidatePath("/hairdresser", "layout");
}

export type RescheduleState = { error: string | null; done?: boolean };

// The barber moves the appointment directly; the DB function checks
// ownership and future times, the exclusion constraint rejects overlaps,
// and the customer is notified (plus the old slot's waitlist).
export async function rescheduleAppointment(
  appointmentId: string,
  startUtc: string,
): Promise<RescheduleState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: appointmentId,
    p_new_start: startUtc,
  });
  if (error) {
    return {
      error:
        error.code === EXCLUSION_VIOLATION
          ? "Quell'orario è già occupato. Scegline un altro."
          : "Non è stato possibile spostare l'appuntamento. Riprova.",
    };
  }
  revalidatePath("/hairdresser", "layout");
  return { error: null, done: true };
}
