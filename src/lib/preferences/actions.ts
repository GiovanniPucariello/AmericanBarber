"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getPreferredHairdresserId } from "./queries";

// Toggles "il mio barbiere": setting the same barber again clears it.
export async function togglePreferredHairdresser(hairdresserId: string): Promise<void> {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!organization || !user) return;

  const current = await getPreferredHairdresserId(organization.id);
  await supabase.from("customer_preferences").upsert({
    organization_id: organization.id,
    profile_id: user.id,
    preferred_hairdresser_id: current === hairdresserId ? null : hairdresserId,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/app", "layout");
}

// Profile picker: each barber row is its own submit button carrying its id;
// an empty value clears the preference.
export async function setPreferredHairdresser(formData: FormData): Promise<void> {
  const raw = formData.get("hairdresserId");
  const hairdresserId = typeof raw === "string" && raw !== "" ? raw : null;
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!organization || !user) return;

  await supabase.from("customer_preferences").upsert({
    organization_id: organization.id,
    profile_id: user.id,
    preferred_hairdresser_id: hairdresserId,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/app", "layout");
}
