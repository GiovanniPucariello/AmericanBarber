"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";

// Creates (or, with regenerate, replaces - the old link stops working) the
// barber's private calendar subscription token. RLS: own row only.
export async function enableCalendarFeed(regenerate: boolean): Promise<void> {
  const organization = await requireOrgRole("hairdresser");
  const hairdresser = await getCurrentHairdresser(organization.id);
  if (!hairdresser) return;

  const supabase = await createClient();
  if (regenerate) await supabase.from("calendar_feeds").delete().eq("hairdresser_id", hairdresser.id);
  await supabase.from("calendar_feeds").insert({ hairdresser_id: hairdresser.id });
  revalidatePath("/hairdresser/profile");
}
