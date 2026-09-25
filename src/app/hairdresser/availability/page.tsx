import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { getCurrentHairdresser } from "@/lib/hairdressers/queries";
import { AvailabilityRulesSection } from "@/components/hairdressers/availability-rules-section";
import { AvailabilityExceptionsSection } from "@/components/hairdressers/availability-exceptions-section";
import { BlockedSlotsSection } from "@/components/hairdressers/blocked-slots-section";

export default async function AvailabilityPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const hairdresser = await getCurrentHairdresser(organization.id);
  if (!hairdresser) {
    return (
      <div className="p-6">
        <p className="text-paper-50/70">
          Il tuo account non è ancora collegato a un profilo barbiere - chiedi
          a un amministratore di collegarlo dalla sezione Personale.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: rules }, { data: exceptions }, { data: blockedSlots }] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("id, weekday, start_time, end_time")
      .eq("hairdresser_id", hairdresser.id)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("availability_exceptions")
      .select("id, date, type, start_time, end_time, reason")
      .eq("hairdresser_id", hairdresser.id)
      .order("date"),
    supabase
      .from("blocked_slots")
      .select("id, during, reason")
      .eq("hairdresser_id", hairdresser.id)
      .order("during"),
  ]);

  return (
    <div className="p-6 flex flex-col gap-8">
      <h1 className="text-lg font-semibold">Disponibilità - {hairdresser.displayName}</h1>
      <AvailabilityRulesSection rules={rules ?? []} />
      <AvailabilityExceptionsSection exceptions={exceptions ?? []} />
      <BlockedSlotsSection blockedSlots={blockedSlots ?? []} />
    </div>
  );
}
