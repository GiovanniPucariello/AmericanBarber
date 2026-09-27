import { createClient } from "@/lib/supabase/server";

export async function getPreferredHairdresserId(organizationId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("customer_preferences")
    .select("preferred_hairdresser_id")
    .eq("organization_id", organizationId)
    .eq("profile_id", user.id)
    .maybeSingle();
  return data?.preferred_hairdresser_id ?? null;
}
