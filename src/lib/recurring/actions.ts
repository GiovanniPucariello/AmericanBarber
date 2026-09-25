"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { createRecurringBookingSchema } from "./schemas";

export type RecurringActionState = { error: string | null };

export async function createRecurringBookingRequest(
  _prevState: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const organization = await getCurrentOrganization();
  if (!organization) return { error: "Nessuna appartenenza a un'organizzazione." };

  const parsed = createRecurringBookingSchema.safeParse({
    hairdresserId: formData.get("hairdresserId"),
    serviceId: formData.get("serviceId"),
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    intervalWeeks: formData.get("intervalWeeks"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Devi effettuare l'accesso." };

  const { data: recurringBooking, error } = await supabase
    .from("recurring_bookings")
    .insert({
      organization_id: organization.id,
      customer_profile_id: user.id,
      hairdresser_id: parsed.data.hairdresserId,
      service_id: parsed.data.serviceId,
      weekday: parsed.data.weekday,
      start_time: parsed.data.startTime,
      interval_weeks: parsed.data.intervalWeeks,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn || null,
      status: "pending_approval",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("emit_notification_event", {
    p_type: "recurring_request_created",
    p_recurring_booking_id: recurringBooking.id,
  });

  redirect("/app/appointments/recurring");
}

// generate_recurring_occurrences is its own SECURITY DEFINER function
// (does its own authorization check) precisely because "approve, then
// materialize occurrences" is one atomic operation with several steps per
// occurrence - see the migration for why that doesn't belong in RLS.
export async function approveRecurringBooking(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("recurring_bookings")
    .update({ status: "active", decided_at: new Date().toISOString(), decided_by: user?.id })
    .eq("id", id);

  if (!error) {
    await supabase.rpc("generate_recurring_occurrences", { p_recurring_booking_id: id });
    await supabase.rpc("emit_notification_event", {
      p_type: "recurring_request_approved",
      p_recurring_booking_id: id,
    });
  }

  revalidatePath("/hairdresser/requests");
}

export async function rejectRecurringBooking(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("recurring_bookings")
    .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: user?.id })
    .eq("id", id);

  if (!error) {
    await supabase.rpc("emit_notification_event", {
      p_type: "recurring_request_rejected",
      p_recurring_booking_id: id,
    });
  }

  revalidatePath("/hairdresser/requests");
}

// Cancel just this date - the rule and every other occurrence are
// untouched (section 32).
export async function cancelRecurringOccurrence(occurrenceId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: occurrence } = await supabase
    .from("recurring_booking_occurrences")
    .update({ status: "cancelled" })
    .eq("id", occurrenceId)
    .select("appointment_id")
    .maybeSingle();

  if (occurrence?.appointment_id) {
    await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
      })
      .eq("id", occurrence.appointment_id);

    await supabase.rpc("emit_notification_event", {
      p_type: "booking_cancelled",
      p_appointment_id: occurrence.appointment_id,
    });
  }

  revalidatePath("/app/appointments/recurring");
}

// Cancel the rule and every future, not-yet-completed occurrence (section
// 32's "all future appointments" option) - past occurrences are left as
// history.
export async function cancelAllFutureOccurrences(recurringBookingId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("recurring_bookings")
    .update({ status: "cancelled" })
    .eq("id", recurringBookingId);

  const today = DateTime.now().toISODate();
  const { data: occurrences } = await supabase
    .from("recurring_booking_occurrences")
    .update({ status: "cancelled" })
    .eq("recurring_booking_id", recurringBookingId)
    .gte("occurrence_date", today as string)
    .not("status", "in", "(completed,cancelled)")
    .select("appointment_id");

  const appointmentIds = (occurrences ?? [])
    .map((o) => o.appointment_id)
    .filter((id): id is string => !!id);

  if (appointmentIds.length > 0) {
    await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
      })
      .in("id", appointmentIds)
      .in("status", ["pending", "confirmed"]);

    for (const appointmentId of appointmentIds) {
      await supabase.rpc("emit_notification_event", {
        p_type: "booking_cancelled",
        p_appointment_id: appointmentId,
      });
    }
  }

  revalidatePath("/app/appointments/recurring");
}
