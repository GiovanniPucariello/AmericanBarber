"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";

export type CustomerNoteState = { error: string | null };

const noteSchema = z.object({
  body: z.string().trim().min(1, "Scrivi la nota.").max(1000, "Massimo 1000 caratteri."),
});

// Staff-only notes about a customer. RLS enforces staff role + author.
export async function addCustomerNote(
  customerProfileId: string,
  _prevState: CustomerNoteState,
  formData: FormData,
): Promise<CustomerNoteState> {
  const parsed = noteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };

  const organization = await getCurrentOrganization();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!organization || !user) return { error: "Devi effettuare l'accesso." };

  const { error } = await supabase.from("customer_notes").insert({
    organization_id: organization.id,
    customer_profile_id: customerProfileId,
    author_profile_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: "Impossibile salvare la nota. Riprova." };

  revalidatePath(`/hairdresser/customers/${customerProfileId}`);
  revalidatePath("/hairdresser");
  return { error: null };
}

export async function deleteCustomerNote(noteId: string, customerProfileId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("customer_notes").delete().eq("id", noteId);
  revalidatePath(`/hairdresser/customers/${customerProfileId}`);
  revalidatePath("/hairdresser");
}
