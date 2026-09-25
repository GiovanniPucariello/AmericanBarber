import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/types/database";

export type CurrentOrganization = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  bookingIntervalMinutes: number;
  role: Database["public"]["Enums"]["org_role"];
};

// Takes the first active membership found. A user with memberships in more
// than one organization will need an org switcher - reserved until a
// second tenant actually exists (DESIGN.md section H).
export async function getCurrentOrganization(): Promise<CurrentOrganization | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("role, organizations!inner(id, name, slug, timezone, settings)")
    .eq("profile_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  // organization_id is a NOT NULL FK to organizations' primary key, so this
  // embed is always exactly one row at runtime - but postgrest-js's type
  // inference doesn't always pick that up as a singular object even with
  // !inner, so handle both shapes defensively rather than fight the types.
  const org = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations;
  if (!org) return null;

  // booking_interval_minutes is a per-organization *setting*, not a
  // constant, per section 93 - 30 is only the fallback for an org that
  // hasn't configured one yet.
  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const bookingIntervalMinutes =
    typeof settings.booking_interval_minutes === "number"
      ? settings.booking_interval_minutes
      : 30;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    timezone: org.timezone,
    bookingIntervalMinutes,
    role: data.role,
  };
}

export type PublicOrganization = {
  id: string;
  name: string;
  slug: string;
};

// For the unauthenticated landing page - reads organization_marketing_profile
// (a view exposing only the safe public subset, see migration
// 20260915100000_public_marketing_access.sql) rather than the organizations
// table itself, which stays fully member-gated. Uses the cookie-free public
// client (not the one in this same file's getCurrentOrganization) so the
// page that calls this can stay statically cacheable.
export async function getPublicOrganization(slug: string): Promise<PublicOrganization | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("organization_marketing_profile")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  // The generated type marks every view column nullable (Postgres can't
  // prove a view preserves the underlying table's NOT NULL constraints) -
  // these three are the org's real primary key/name/slug, never actually
  // null in practice, but check honestly rather than asserting it away.
  if (!data || !data.id || !data.name || !data.slug) return null;
  return { id: data.id, name: data.name, slug: data.slug };
}
