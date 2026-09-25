import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { ServiceForm } from "@/components/services/service-form";
import { updateService } from "@/lib/services/actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organization = await requireOrgRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_cents, sort_order")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!service) notFound();

  return <ServiceForm action={updateService} defaultValues={service} />;
}
