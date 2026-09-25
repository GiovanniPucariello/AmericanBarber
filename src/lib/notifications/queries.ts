import { createClient } from "@/lib/supabase/server";

export async function getNotificationFeed() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_feed")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notification_feed")
    .select("notification_id", { count: "exact", head: true })
    .neq("status", "read");
  return count ?? 0;
}
