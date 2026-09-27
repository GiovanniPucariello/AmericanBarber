"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";

const waitlistSchema = z.object({
  hairdresserId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// "Avvisami se si libera": the DB fans out a notification when an
// appointment with this barber on this day gets cancelled.
export async function joinWaitlist(hairdresserId: string, date: string): Promise<void> {
  const parsed = waitlistSchema.safeParse({ hairdresserId, date });
  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!parsed.success || !organization || !user) return;

  await supabase.from("waitlist_entries").upsert(
    {
      organization_id: organization.id,
      customer_profile_id: user.id,
      hairdresser_id: parsed.data.hairdresserId,
      date: parsed.data.date,
      notified_at: null,
    },
    { onConflict: "customer_profile_id,hairdresser_id,date" },
  );
  revalidatePath(`/app/book/${parsed.data.hairdresserId}`);
}

export async function leaveWaitlist(hairdresserId: string, date: string): Promise<void> {
  const parsed = waitlistSchema.safeParse({ hairdresserId, date });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!parsed.success || !user) return;

  await supabase
    .from("waitlist_entries")
    .delete()
    .eq("customer_profile_id", user.id)
    .eq("hairdresser_id", parsed.data.hairdresserId)
    .eq("date", parsed.data.date);
  revalidatePath(`/app/book/${parsed.data.hairdresserId}`);
}
