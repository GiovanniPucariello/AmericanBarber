"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
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
    return { error: error.message };
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
