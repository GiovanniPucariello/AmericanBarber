import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import { RecurringRequestWizard } from "@/components/recurring/recurring-request-wizard";

export default async function RecurringRequestPage({
  params,
}: {
  params: Promise<{ hairdresserId: string }>;
}) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/app");

  const { hairdresserId } = await params;
  const supabase = await createClient();

  const { data: hairdresser } = await supabase
    .from("hairdressers")
    .select("display_name")
    .eq("id", hairdresserId)
    .eq("organization_id", organization.id)
    .eq("active", true)
    .maybeSingle();
  if (!hairdresser) notFound();

  const { data: offeredServices } = await supabase
    .from("hairdresser_services")
    .select("services!inner(id, name)")
    .eq("hairdresser_id", hairdresserId);

  const services = (offeredServices ?? [])
    .map((row) => (Array.isArray(row.services) ? row.services[0] : row.services))
    .filter((s): s is { id: string; name: string } => !!s);

  return (
    <div className="p-6 flex flex-col gap-4">
      <RecurringRequestWizard
        hairdresserId={hairdresserId}
        hairdresserName={hairdresser.display_name}
        services={services}
      />
    </div>
  );
}
