import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/permissions/require-role";
import { HairdresserForm } from "@/components/hairdressers/hairdresser-form";
import { LinkAccountForm } from "@/components/hairdressers/link-account-form";
import { updateHairdresser } from "@/lib/hairdressers/actions";

export default async function EditHairdresserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organization = await requireOrgRole("admin");
  const { id } = await params;

  const supabase = await createClient();
  const { data: hairdresser } = await supabase
    .from("hairdressers")
    .select("id, display_name, bio, sort_order, profile_id")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!hairdresser) notFound();

  return (
    <div className="flex flex-col">
      <HairdresserForm action={updateHairdresser} defaultValues={hairdresser} />
      {hairdresser.profile_id ? (
        <div className="p-6 border-t border-paper-50/10">
          <p className="text-paper-50/60 text-sm">
            Accesso già attivo per {hairdresser.display_name}.
          </p>
        </div>
      ) : (
        <LinkAccountForm hairdresserId={hairdresser.id} displayName={hairdresser.display_name} />
      )}
    </div>
  );
}
