import { createClient } from "@/lib/supabase/server";

export type CurrentHairdresser = {
  id: string;
  displayName: string;
};

// The hairdresser row a signed-in user's profile is linked to within an
// organization - distinct from their organization_members role, since
// "hairdresser" (the professional profile - name, bio, schedule) and
// "hairdresser" (the role granting access) are separate concerns
// (DESIGN.md section 19).
export async function getCurrentHairdresser(
  organizationId: string,
): Promise<CurrentHairdresser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("hairdressers")
    .select("id, display_name")
    .eq("organization_id", organizationId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, displayName: data.display_name };
}
