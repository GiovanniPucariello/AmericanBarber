"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendAppointmentMessageSchema } from "./schemas";

export type SendAppointmentMessageState = { error: string | null };

export async function sendAppointmentMessage(
  appointmentId: string,
  _prevState: SendAppointmentMessageState,
  formData: FormData,
): Promise<SendAppointmentMessageState> {
  const parsed = sendAppointmentMessageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Devi effettuare l'accesso." };

  const { data: appointment } = await supabase
    .from("appointments")
    .select("organization_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appointment) return { error: "Appuntamento non trovato." };

  // RLS (appointment_messages: sender is a party, appt active) is the real
  // authority here - it re-derives "is this actually a party to an
  // active appointment" itself, so there's nothing to duplicate-check here.
  const { error } = await supabase.from("appointment_messages").insert({
    organization_id: appointment.organization_id,
    appointment_id: appointmentId,
    sender_profile_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: error.message };

  await supabase.rpc("emit_notification_event", {
    p_type: "message_received",
    p_appointment_id: appointmentId,
  });

  revalidatePath(`/app/appointments/${appointmentId}/messages`);
  revalidatePath(`/hairdresser/appointments/${appointmentId}/messages`);
  return { error: null };
}
