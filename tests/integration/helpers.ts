import pg from "pg";
import WebSocket from "ws";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE_KEY, SUPABASE_DB_URL, ORG_SLUG } from "./env";
import type { Database } from "@/types/database";

const TEST_PASSWORD = "IntegrationTest!2026";

// supabase-js eagerly constructs a realtime client, which needs a
// WebSocket implementation - present natively from Node 22, but this
// project runs on Node 18 (see every other script's dns.setDefaultResultOrder
// comment for the same "this environment is older than supabase-js expects"
// theme). None of these tests use realtime; this just satisfies the
// constructor so it doesn't throw before that.
const clientOptions = { realtime: { transport: WebSocket as unknown as never } };

export function pgClient() {
  return new pg.Client({ connectionString: SUPABASE_DB_URL });
}

export function adminClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, clientOptions);
}

// A signed-in client for a disposable test user - what RLS/authorization
// tests need, since the service-role client bypasses RLS entirely and
// would prove nothing about it.
export async function signedInClient(email: string, password = TEST_PASSWORD): Promise<SupabaseClient<Database>> {
  const client = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Failed to sign in as ${email}: ${error.message}`);
  return client;
}

export async function anonClient(): Promise<SupabaseClient<Database>> {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
}

let createdUserIds: string[] = [];

// Creates a disposable, pre-confirmed auth user via the Admin API - same
// approach every phase's manual verification has used. Tracked in a module-
// level list so a single afterAll can guarantee cleanup even if an
// individual test's own teardown is skipped by a failure.
export async function createTestUserRecord(
  emailPrefix: string,
  fullName: string,
  password = TEST_PASSWORD,
): Promise<{ id: string; email: string }> {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
  const user = await res.json();
  if (!res.ok) throw new Error(`Failed to create test user ${email}: ${JSON.stringify(user)}`);
  createdUserIds.push(user.id);
  return { id: user.id, email };
}

export async function deleteTestUser(id: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  createdUserIds = createdUserIds.filter((u) => u !== id);
}

// Safety net - call from a suite's afterAll in addition to its own
// per-resource cleanup, so a mid-suite failure never leaks a disposable
// account into the shared project.
export async function deleteAllTrackedTestUsers(): Promise<void> {
  await Promise.all(createdUserIds.map((id) => deleteTestUser(id)));
  createdUserIds = [];
}

export async function waitForProfile(client: pg.Client, userId: string): Promise<void> {
  for (let i = 0; i < 15; i++) {
    const res = await client.query("select id from public.profiles where id = $1", [userId]);
    if (res.rows.length > 0) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Profile row never appeared for ${userId}`);
}

export async function addOrgMember(
  client: pg.Client,
  organizationId: string,
  profileId: string,
  role: "customer" | "hairdresser" | "manager" | "admin" | "owner",
): Promise<void> {
  await client.query(
    `insert into public.organization_members (organization_id, profile_id, role)
     values ($1, $2, $3) on conflict (organization_id, profile_id, role) do nothing`,
    [organizationId, profileId, role],
  );
}

export async function getTestOrg(client: pg.Client): Promise<{ id: string; timezone: string; slug: string }> {
  const res = await client.query(
    "select id, timezone, slug from public.organizations where slug = $1",
    [ORG_SLUG],
  );
  if (!res.rows.length) throw new Error(`Org not found for slug ${ORG_SLUG}`);
  return res.rows[0];
}

export async function getFirstLocation(client: pg.Client, organizationId: string): Promise<string> {
  const res = await client.query(
    "select id from public.locations where organization_id = $1 order by created_at limit 1",
    [organizationId],
  );
  if (!res.rows.length) throw new Error("No location found in test org");
  return res.rows[0].id;
}

export async function getFirstActiveService(
  client: pg.Client,
  organizationId: string,
): Promise<{ id: string; duration_minutes: number }> {
  const res = await client.query(
    "select id, duration_minutes from public.services where organization_id = $1 and active order by sort_order limit 1",
    [organizationId],
  );
  if (!res.rows.length) throw new Error("No active service found in test org");
  return res.rows[0];
}

export async function createTestHairdresser(
  client: pg.Client,
  organizationId: string,
  displayName: string,
  profileId: string | null = null,
): Promise<string> {
  const res = await client.query(
    `insert into public.hairdressers (organization_id, profile_id, display_name, active, sort_order)
     values ($1, $2, $3, true, 999) returning id`,
    [organizationId, profileId, displayName],
  );
  return res.rows[0].id;
}

export async function deleteTestHairdresser(client: pg.Client, id: string): Promise<void> {
  await client.query("delete from public.hairdressers where id = $1", [id]);
}

export async function addAvailabilityRule(
  client: pg.Client,
  params: {
    organizationId: string;
    hairdresserId: string;
    locationId: string;
    weekday: number;
    startTime: string;
    endTime: string;
  },
): Promise<void> {
  await client.query(
    `insert into public.availability_rules (organization_id, hairdresser_id, location_id, weekday, start_time, end_time, active)
     values ($1, $2, $3, $4, $5, $6, true)`,
    [params.organizationId, params.hairdresserId, params.locationId, params.weekday, params.startTime, params.endTime],
  );
}

export { TEST_PASSWORD };
