"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { computeAvailableSlots } from "@/lib/availability/compute";
import { staffBookingSchema } from "./schemas";

export type StaffBookingState = { error: string | null };

const EXCLUSION_VIOLATION = "23P01";

// The barber books a customer on their own agenda - once, or as a weekly /
// fortnightly series starting from the picked slot. RLS limits the insert to
// their own hairdresser row and to this shop's customers (or a guest name).
export async function createStaffBooking(
  _prevState: StaffBookingState,
  formData: FormData,
): Promise<StaffBookingState> {
  const organization = await requireOrgRole("hairdresser");
  const hairdresser = await getCurrentHairdresser(organization.id);
  if (!hairdresser) return { error: "Il tuo account non è collegato a un profilo barbiere." };

  const parsed = staffBookingSchema.safeParse({
    serviceId: formData.get("serviceId"),
    startUtc: formData.get("startUtc"),
    customerProfileId: formData.get("customerProfileId") ?? "",
    guestName: formData.get("guestName") ?? "",
    recurring: formData.get("recurring") ?? undefined,
    intervalWeeks: formData.get("intervalWeeks") ?? 1,
    endsOn: formData.get("endsOn") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const { serviceId, startUtc, recurring, intervalWeeks, endsOn } = parsed.data;
  // A picked registered customer wins over any leftover guest text.
  const customerProfileId = parsed.data.customerProfileId || null;
  const guestName = customerProfileId ? null : parsed.data.guestName || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!service) return { error: "Questo servizio non è più disponibile." };

  const start = DateTime.fromISO(startUtc, { zone: "utc" });
  const startLocal = start.setZone(organization.timezone);
  const slot = (
    await computeAvailableSlots(supabase, {
      hairdresserId: hairdresser.id,
      date: startLocal.toISODate() as string,
      timeZone: organization.timezone,
      serviceDurationMinutes: service.duration_minutes,
      bookingIntervalMinutes: organization.bookingIntervalMinutes,
    })
  ).find((s) => Date.parse(s.startUtc) === start.toMillis());
  if (!slot) return { error: "Questo orario non è più libero. Scegline un altro." };

  if (recurring) {
    const { data: rule, error } = await supabase
      .from("recurring_bookings")
      .insert({
        organization_id: organization.id,
        customer_profile_id: customerProfileId,
        guest_name: guestName,
        hairdresser_id: hairdresser.id,
        service_id: serviceId,
        weekday: startLocal.weekday - 1, // luxon 1 = Monday, ours 0 = Monday
        start_time: startLocal.toFormat("HH:mm"),
        interval_weeks: intervalWeeks,
        starts_on: startLocal.toISODate() as string,
        ends_on: endsOn || null,
        status: "active",
        decided_at: new Date().toISOString(),
        decided_by: user.id,
      })
      .select("id")
      .single();
    if (error) {
      console.error("createStaffBooking recurring insert failed", error);
      return { error: "Non è stato possibile creare la serie. Riprova." };
    }
    await supabase.rpc("generate_recurring_occurrences", { p_recurring_booking_id: rule.id });
    if (customerProfileId) {
      await supabase.rpc("emit_notification_event", { p_type: "booked_by_hairdresser", p_recurring_booking_id: rule.id });
    }
  } else {
    const { data: location } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!location) return { error: "Nessuna sede configurata." };

    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        organization_id: organization.id,
        location_id: location.id,
        hairdresser_id: hairdresser.id,
        customer_profile_id: customerProfileId,
        guest_name: guestName,
        service_id: serviceId,
        during: `[${slot.startUtc},${slot.endUtc})`,
        status: "confirmed",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === EXCLUSION_VIOLATION) return { error: "Questo orario è appena stato preso. Scegline un altro." };
      console.error("createStaffBooking insert failed", error);
      return { error: "Non è stato possibile salvare l'appuntamento. Riprova." };
    }
    if (customerProfileId) {
      await supabase.rpc("emit_notification_event", { p_type: "booked_by_hairdresser", p_appointment_id: appointment.id });
    }
  }

  revalidatePath("/hairdresser");
  redirect(`/hairdresser?date=${startLocal.toISODate()}`);
}
