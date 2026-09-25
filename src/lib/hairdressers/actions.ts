"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { hairdresserSchema, linkHairdresserAccountSchema } from "./schemas";

export type HairdresserActionState = { error: string | null };

function parseHairdresserForm(formData: FormData) {
  return hairdresserSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
    sortOrder: formData.get("sortOrder") || "0",
  });
}

export async function createHairdresser(
  _prevState: HairdresserActionState,
  formData: FormData,
): Promise<HairdresserActionState> {
  const organization = await requireOrgRole("admin");

  const parsed = parseHairdresserForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("hairdressers").insert({
    organization_id: organization.id,
    display_name: parsed.data.displayName,
    bio: parsed.data.bio ?? null,
    sort_order: parsed.data.sortOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}

export async function updateHairdresser(
  _prevState: HairdresserActionState,
  formData: FormData,
): Promise<HairdresserActionState> {
  const organization = await requireOrgRole("admin");

  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { error: "Id del barbiere mancante." };
  }

  const parsed = parseHairdresserForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("hairdressers")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio ?? null,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}

// Deactivation, not deletion, is the "remove" affordance in the admin UI:
// hairdressers.id cascades onto appointments, so a hard delete would wipe
// their entire appointment history (edge case 9 - "a hairdresser is
// deactivated", not deleted).
export async function setHairdresserActive(
  id: string,
  active: boolean,
): Promise<void> {
  const organization = await requireOrgRole("admin");

  const supabase = await createClient();
  await supabase
    .from("hairdressers")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", organization.id);

  revalidatePath("/admin/staff");
}

export type LinkHairdresserAccountState = { error: string | null };

// Lets a hairdresser actually sign in as themselves - without this, a row
// created from /admin/staff/new has profile_id null forever and
// requireOrgRole("hairdresser") locks them out of their own agenda/
// availability pages permanently. Admin sets email+password directly
// (rather than an email invite) so this works without depending on the
// project's outbound email being configured - the admin shares the
// password with the hairdresser themselves.
export async function linkHairdresserAccount(
  hairdresserId: string,
  _prevState: LinkHairdresserAccountState,
  formData: FormData,
): Promise<LinkHairdresserAccountState> {
  const organization = await requireOrgRole("admin");

  const parsed = linkHairdresserAccountSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const { data: hairdresser } = await supabase
    .from("hairdressers")
    .select("id, profile_id")
    .eq("id", hairdresserId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!hairdresser) {
    return { error: "Barbiere non trovato." };
  }
  if (hairdresser.profile_id) {
    return { error: "Questo barbiere ha già un account collegato." };
  }

  const adminClient = createAdminClient();
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: formData.get("displayName") ?? undefined },
  });
  if (createError || !created.user) {
    return {
      error:
        createError?.code === "email_exists"
          ? "Esiste già un account con questa email."
          : (createError?.message ?? "Creazione account non riuscita."),
    };
  }

  const { error: linkError } = await supabase
    .from("hairdressers")
    .update({ profile_id: created.user.id })
    .eq("id", hairdresserId)
    .eq("organization_id", organization.id);
  if (linkError) {
    // Best-effort cleanup - an orphaned auth user with no hairdresser link
    // is a dangling login to nothing, not a data-integrity risk, but no
    // reason to leave it behind if the very next step failed.
    await adminClient.auth.admin.deleteUser(created.user.id);
    return { error: linkError.message };
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organization.id,
    profile_id: created.user.id,
    role: "hairdresser",
    active: true,
  });
  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/admin/staff");
  return { error: null };
}
