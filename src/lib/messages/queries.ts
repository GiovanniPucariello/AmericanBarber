import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  fromViewer: boolean;
};

// RLS (appointment_messages: read own, assigned, or admin) is what actually
// keeps a viewer from reading a thread that isn't theirs - this just shapes
// what RLS already let through into "mine vs theirs" for rendering, the
// same derive-don't-trust approach notification_feed uses for customer/
// hairdresser names.
export async function getAppointmentThread(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
  viewerProfileId: string,
): Promise<ThreadMessage[]> {
  const { data } = await supabase
    .from("appointment_messages")
    .select("id, body, created_at, sender_profile_id")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    fromViewer: m.sender_profile_id === viewerProfileId,
  }));
}

// Per-appointment unread count, for the "Messaggi" badge on a list of
// appointments - one query for the whole list rather than one per row.
export async function getUnreadMessageCounts(
  supabase: SupabaseClient<Database>,
  appointmentIds: string[],
  viewerProfileId: string,
): Promise<Map<string, number>> {
  if (appointmentIds.length === 0) return new Map();

  const { data } = await supabase
    .from("appointment_messages")
    .select("appointment_id")
    .in("appointment_id", appointmentIds)
    .neq("sender_profile_id", viewerProfileId)
    .is("read_at", null);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.appointment_id, (counts.get(row.appointment_id) ?? 0) + 1);
  }
  return counts;
}

// Plain write-during-render, same pattern as ensureCustomerMembership -
// opening a thread implicitly reads it, no separate "mark as read" step.
// Column-grant-restricted to read_at (see the migration), so this can only
// ever touch that one field regardless of what's passed here.
export async function markThreadRead(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<void> {
  await supabase
    .from("appointment_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("appointment_id", appointmentId)
    .is("read_at", null);
}
