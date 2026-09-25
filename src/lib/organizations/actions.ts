"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { organizationSettingsSchema } from "./schemas";

export type OrganizationSettingsActionState = { error: string | null; success?: string | null };

export async function updateOrganizationSettings(
  _prevState: OrganizationSettingsActionState,
  formData: FormData,
): Promise<OrganizationSettingsActionState> {
  const organization = await requireOrgRole("admin");

  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    primaryColor: formData.get("primaryColor") || "",
    secondaryColor: formData.get("secondaryColor") || "",
    accentColor: formData.get("accentColor") || "",
    bookingIntervalMinutes: formData.get("bookingIntervalMinutes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();

  // settings is a JSONB blob that may hold other keys later - merge rather
  // than overwrite so this form only ever touches the one key it owns.
  const { data: current } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organization.id)
    .maybeSingle();
  const settings = { ...(current?.settings as Record<string, unknown> | null), booking_interval_minutes: parsed.data.bookingIntervalMinutes };

  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      primary_color: parsed.data.primaryColor || null,
      secondary_color: parsed.data.secondaryColor || null,
      accent_color: parsed.data.accentColor || null,
      settings,
    })
    .eq("id", organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/settings");
  return { error: null, success: "Salvato." };
}
