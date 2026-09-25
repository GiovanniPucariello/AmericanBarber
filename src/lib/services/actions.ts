"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { serviceSchema } from "./schemas";

export type ServiceActionState = { error: string | null };

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    durationMinutes: formData.get("durationMinutes"),
    priceCents: formData.get("priceCents") || undefined,
    sortOrder: formData.get("sortOrder") || "0",
  });
}

export async function createService(
  _prevState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const organization = await requireOrgRole("admin");

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    organization_id: organization.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    duration_minutes: parsed.data.durationMinutes,
    price_cents: parsed.data.priceCents ?? null,
    sort_order: parsed.data.sortOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/services");
  redirect("/admin/services");
}

export async function updateService(
  _prevState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const organization = await requireOrgRole("admin");

  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { error: "Id del servizio mancante." };
  }

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      duration_minutes: parsed.data.durationMinutes,
      price_cents: parsed.data.priceCents ?? null,
      sort_order: parsed.data.sortOrder,
    })
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/services");
  redirect("/admin/services");
}

// Deactivation, not deletion - a service already used by past appointments
// (service_id is ON DELETE RESTRICT, section C) should stay visible in
// history even after the shop stops offering it.
export async function setServiceActive(id: string, active: boolean): Promise<void> {
  const organization = await requireOrgRole("admin");

  const supabase = await createClient();
  await supabase
    .from("services")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", organization.id);

  revalidatePath("/admin/services");
}
