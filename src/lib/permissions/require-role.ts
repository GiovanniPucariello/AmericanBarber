import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organizations/queries";
import type { Database } from "@/types/database";

type OrgRole = Database["public"]["Enums"]["org_role"];

// Mirrors public.role_rank() in the database (supabase/migrations/*_rls_policies.sql).
const ROLE_RANK: Record<OrgRole, number> = {
  customer: 1,
  hairdresser: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

// UX convenience only, same as middleware.ts - the real gate is RLS plus
// every mutation re-checking (section 53). Used at the top of admin/
// hairdresser layouts and Server Actions so a wrong-role visitor gets
// redirected instead of a raw RLS rejection deep inside a query.
export async function requireOrgRole(minRole: OrgRole) {
  const organization = await getCurrentOrganization();
  if (!organization || ROLE_RANK[organization.role] < ROLE_RANK[minRole]) {
    redirect("/app");
  }
  return organization;
}
