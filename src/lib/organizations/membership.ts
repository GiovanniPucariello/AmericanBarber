import { createClient } from "@/lib/supabase/server";

// MVP tenant resolution (DESIGN.md section H/11): this deployment currently
// serves exactly one organization. Which one is configuration (an env var
// naming its slug), not a hardcoded business fact in the code - once
// subdomain/custom-domain routing exists, that becomes another way to
// resolve the same thing, not a replacement requiring this file to change.
const DEFAULT_ORG_SLUG = process.env.DEFAULT_ORG_SLUG;

// A signed-in user with no organization_members row yet becomes a customer
// of the default org. Silent and automatic - the customer never sees an
// org-selection step in the MVP (section 9's "SaaS invisible" principle).
// Safe to call on every request to the customer area: it's a no-op once a
// membership row exists.
export async function ensureCustomerMembership(): Promise<void> {
  if (!DEFAULT_ORG_SLUG) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("organization_members")
    .select("id")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  // The RPC (not a direct insert) does the organizations lookup too - a
  // brand-new member can't SELECT from organizations yet, since its RLS
  // policy requires being a member already. See the migration for why this
  // has to run as SECURITY DEFINER.
  await supabase.rpc("join_organization_as_customer", {
    p_slug: DEFAULT_ORG_SLUG,
  });
}
