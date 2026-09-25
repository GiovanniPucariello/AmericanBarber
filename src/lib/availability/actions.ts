"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import {
  availabilityExceptionSchema,
  availabilityRuleSchema,
  blockedSlotSchema,
} from "./schemas";
import { localToUtc } from "./timezone";

export type AvailabilityActionState = { error: string | null };

// The hairdresser_id being acted on is never taken from client input - it's
// always resolved server-side from the signed-in user's own profile, so
// there's no way to reach this code path and touch someone else's schedule
// even before RLS gets a say.
async function requireOwnHairdresser() {
  const organization = await getCurrentOrganization();
  if (!organization) throw new Error("No organization membership.");
  const hairdresser = await getCurrentHairdresser(organization.id);
  if (!hairdresser) throw new Error("No hairdresser profile linked to this account.");
  return { organization, hairdresser };
}

export async function addAvailabilityRule(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const { organization, hairdresser } = await requireOwnHairdresser();

  const parsed = availabilityRuleSchema.safeParse({
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  // location_id is required by the schema but not yet a UI choice - there's
  // exactly one location per org for now (section 20), so this takes it
  // rather than exposing a picker for a decision that isn't real yet.
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!location) return { error: "No location configured for this organization." };

  const { error } = await supabase.from("availability_rules").insert({
    organization_id: organization.id,
    hairdresser_id: hairdresser.id,
    location_id: location.id,
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });

  if (error) return { error: error.message };

  revalidatePath("/hairdresser/availability");
  return { error: null };
}

export async function deleteAvailabilityRule(id: string): Promise<void> {
  await requireOwnHairdresser();
  const supabase = await createClient();
  await supabase.from("availability_rules").delete().eq("id", id);
  revalidatePath("/hairdresser/availability");
}

export async function addAvailabilityException(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const { organization, hairdresser } = await requireOwnHairdresser();

  const parsed = availabilityExceptionSchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type"),
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const isAllDay = parsed.data.type === "unavailable_all_day";
  const supabase = await createClient();
  const { error } = await supabase.from("availability_exceptions").insert({
    organization_id: organization.id,
    hairdresser_id: hairdresser.id,
    date: parsed.data.date,
    type: parsed.data.type,
    start_time: isAllDay ? null : parsed.data.startTime || null,
    end_time: isAllDay ? null : parsed.data.endTime || null,
    reason: parsed.data.reason ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/hairdresser/availability");
  return { error: null };
}

export async function deleteAvailabilityException(id: string): Promise<void> {
  await requireOwnHairdresser();
  const supabase = await createClient();
  await supabase.from("availability_exceptions").delete().eq("id", id);
  revalidatePath("/hairdresser/availability");
}

export async function addBlockedSlot(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const { organization, hairdresser } = await requireOwnHairdresser();

  const parsed = blockedSlotSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const startUtc = localToUtc(parsed.data.date, parsed.data.startTime, organization.timezone);
  const endUtc = localToUtc(parsed.data.date, parsed.data.endTime, organization.timezone);

  const supabase = await createClient();
  const { error } = await supabase.from("blocked_slots").insert({
    organization_id: organization.id,
    hairdresser_id: hairdresser.id,
    during: `[${startUtc.toISO()},${endUtc.toISO()})`,
    reason: parsed.data.reason ?? null,
    created_by: (await supabase.auth.getUser()).data.user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/hairdresser/availability");
  return { error: null };
}

export async function deleteBlockedSlot(id: string): Promise<void> {
  await requireOwnHairdresser();
  const supabase = await createClient();
  await supabase.from("blocked_slots").delete().eq("id", id);
  revalidatePath("/hairdresser/availability");
}
