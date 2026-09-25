"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/app/notifications");
  revalidatePath("/hairdresser/notifications");
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("recipient_profile_id", user.id)
    .neq("status", "read");

  revalidatePath("/app/notifications");
  revalidatePath("/hairdresser/notifications");
}
