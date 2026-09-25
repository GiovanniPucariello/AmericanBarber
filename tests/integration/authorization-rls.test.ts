import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  pgClient,
  adminClient,
  anonClient,
  signedInClient,
  getTestOrg,
  getFirstLocation,
  createTestHairdresser,
  deleteTestHairdresser,
  createTestUserRecord,
  waitForProfile,
  addOrgMember,
  deleteAllTrackedTestUsers,
  TEST_PASSWORD,
} from "./helpers";

// spec section 82: authorization, RLS-sensitive operations. Section 81 edge
// cases #11 (unauthenticated), #12 (wrong role), #13 (cross-organization).
describe("authorization and RLS (integration)", () => {
  let client: Client;
  let admin: SupabaseClient<Database>;
  let organizationId: string;
  let hairdresserId: string;
  let customerClient: SupabaseClient<Database>;
  let customerId: string;

  // A second, fully separate organization - the only way to actually prove
  // cross-tenant isolation rather than just "this org's own scoping works".
  let otherOrgId: string;
  let otherHairdresserId: string;

  beforeAll(async () => {
    client = pgClient();
    await client.connect();
    admin = adminClient();
    const org = await getTestOrg(client);
    organizationId = org.id;
    hairdresserId = await createTestHairdresser(client, organizationId, "RLS Test Hairdresser");

    const customer = await createTestUserRecord("rls-customer", "RLS Test Customer");
    customerId = customer.id;
    await waitForProfile(client, customerId);
    await addOrgMember(client, organizationId, customerId, "customer");
    customerClient = await signedInClient(customer.email, TEST_PASSWORD);

    const otherOrgRes = await client.query(
      `insert into public.organizations (name, slug) values ($1, $2) returning id`,
      ["RLS Test Other Org", `rls-test-other-org-${Date.now()}`],
    );
    otherOrgId = otherOrgRes.rows[0].id;
    otherHairdresserId = await createTestHairdresser(client, otherOrgId, "Other Org Hairdresser");
  });

  afterAll(async () => {
    await deleteTestHairdresser(client, hairdresserId);
    await deleteTestHairdresser(client, otherHairdresserId);
    await client.query("delete from public.organizations where id = $1", [otherOrgId]);
    await deleteAllTrackedTestUsers();
    await client.end();
  });

  describe("edge case #11: unauthenticated access", () => {
    it("an anonymous client sees no appointments at all", async () => {
      const anon = await anonClient();
      const { data, error } = await anon.from("appointments").select("id").limit(5);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("an anonymous client sees no organizations", async () => {
      const anon = await anonClient();
      const { data, error } = await anon.from("organizations").select("id").limit(5);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe("edge case #12: a customer reaching hairdresser-only data/actions", () => {
    it("a customer cannot insert an availability_rule for a hairdresser they don't own", async () => {
      const { error } = await customerClient.from("availability_rules").insert({
        organization_id: organizationId,
        hairdresser_id: hairdresserId,
        location_id: await getFirstLocation(client, organizationId),
        weekday: 1,
        start_time: "09:00",
        end_time: "17:00",
      });
      expect(error).not.toBeNull();
      expect(error?.message).toMatch(/row-level security/i);
    });

    it("a customer cannot update someone else's hairdresser row", async () => {
      const { data, error } = await customerClient
        .from("hairdressers")
        .update({ display_name: "Hacked Name" })
        .eq("id", hairdresserId)
        .select();
      // RLS on UPDATE filters the row out of the update's own visibility -
      // no error, but nothing is actually changed.
      expect(error).toBeNull();
      expect(data).toEqual([]);

      const { data: unchanged } = await admin.from("hairdressers").select("display_name").eq("id", hairdresserId).single();
      expect(unchanged?.display_name).toBe("RLS Test Hairdresser");
    });

    it("a customer can still read hairdressers within their own org (booking needs this)", async () => {
      const { data, error } = await customerClient.from("hairdressers").select("id").eq("id", hairdresserId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe("edge case #13: cross-organization access", () => {
    it("a member of org A cannot read org B's hairdressers", async () => {
      const { data, error } = await customerClient.from("hairdressers").select("id").eq("id", otherHairdresserId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a member of org A cannot read org B's organization row", async () => {
      const { data, error } = await customerClient.from("organizations").select("id").eq("id", otherOrgId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("a member of org A cannot insert an appointment against org B's hairdresser", async () => {
      const { error } = await customerClient.from("appointments").insert({
        organization_id: otherOrgId,
        location_id: await getFirstLocation(client, organizationId), // deliberately org A's location
        hairdresser_id: otherHairdresserId,
        service_id: "00000000-0000-0000-0000-000000000301",
        customer_profile_id: customerId,
        during: "[2027-01-01T09:00:00+01:00,2027-01-01T09:30:00+01:00)",
        status: "confirmed",
        created_by: customerId,
      });
      expect(error).not.toBeNull();
    });

    // Regression check for the fix this exact test suite motivated: every
    // other test here uses the service-role client, which bypasses RLS
    // entirely and would never have caught the original gap. This proves
    // the stricter policy still lets a real, same-org booking through.
    it("a member of org A can still book a real appointment with org A's own hairdresser", async () => {
      const locationId = await getFirstLocation(client, organizationId);
      const { data: service } = await admin
        .from("services")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .limit(1)
        .single();

      const { data, error } = await customerClient
        .from("appointments")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          hairdresser_id: hairdresserId,
          service_id: service!.id,
          customer_profile_id: customerId,
          during: "[2027-01-02T09:00:00+01:00,2027-01-02T09:30:00+01:00)",
          status: "confirmed",
          created_by: customerId,
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();

      await admin.from("appointments").delete().eq("id", data!.id);
    });

    it("a member of org A cannot create a recurring request against org B's hairdresser", async () => {
      const { error } = await customerClient.from("recurring_bookings").insert({
        organization_id: otherOrgId,
        customer_profile_id: customerId,
        hairdresser_id: otherHairdresserId,
        service_id: "00000000-0000-0000-0000-000000000301",
        weekday: 1,
        start_time: "10:00",
        interval_weeks: 1,
        starts_on: "2027-01-01",
        status: "pending_approval",
      });
      expect(error).not.toBeNull();
    });

    it("a member of org A can still request a real recurring booking with org A's own hairdresser", async () => {
      const { data: service } = await admin
        .from("services")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .limit(1)
        .single();

      const { data, error } = await customerClient
        .from("recurring_bookings")
        .insert({
          organization_id: organizationId,
          customer_profile_id: customerId,
          hairdresser_id: hairdresserId,
          service_id: service!.id,
          weekday: 1,
          start_time: "10:00",
          interval_weeks: 1,
          starts_on: "2027-01-01",
          status: "pending_approval",
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();

      await admin.from("recurring_bookings").delete().eq("id", data!.id);
    });
  });
});
