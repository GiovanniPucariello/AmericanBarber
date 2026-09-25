import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function SettingsPage() {
  const organization = await requireOrgRole("admin");
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, timezone, primary_color, secondary_color, accent_color, settings")
    .eq("id", organization.id)
    .maybeSingle();

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const bookingIntervalMinutes =
    typeof settings.booking_interval_minutes === "number"
      ? settings.booking_interval_minutes
      : 30;

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Impostazioni</h1>
      <SettingsForm
        defaultValues={{
          name: org?.name ?? "",
          timezone: org?.timezone ?? "Europe/Rome",
          primary_color: org?.primary_color ?? null,
          secondary_color: org?.secondary_color ?? null,
          accent_color: org?.accent_color ?? null,
          bookingIntervalMinutes,
        }}
      />
    </div>
  );
}
