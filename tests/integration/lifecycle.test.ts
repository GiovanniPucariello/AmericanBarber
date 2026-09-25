import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  pgClient,
  adminClient,
  getTestOrg,
  getFirstLocation,
  getFirstActiveService,
  createTestHairdresser,
  deleteTestHairdresser,
  createTestUserRecord,
  deleteTestUser,
  waitForProfile,
  addOrgMember,
} from "./helpers";

describe("lifecycle edge cases (integration)", () => {
  let client: Client;
  let admin: SupabaseClient<Database>;
  let organizationId: string;
  let locationId: string;
  let serviceId: string;

  beforeAll(async () => {
    client = pgClient();
    await client.connect();
    admin = adminClient();
    const org = await getTestOrg(client);
    organizationId = org.id;
    locationId = await getFirstLocation(client, organizationId);
    const service = await getFirstActiveService(client, organizationId);
    serviceId = service.id;
  });

  afterAll(async () => {
    await client.end();
  });

  // Edge case #9: "un parrucchiere viene disattivato".
  describe("deactivating a hairdresser", () => {
    it("hides them from the booking picker's query shape but preserves their existing appointments", async () => {
      const hairdresserId = await createTestHairdresser(client, organizationId, "Deactivation Test Hairdresser");
      const customer = await createTestUserRecord("lifecycle-customer", "Lifecycle Test Customer");
      await waitForProfile(client, customer.id);
      await addOrgMember(client, organizationId, customer.id, "customer");

      const { data: appointment } = await admin
        .from("appointments")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          hairdresser_id: hairdresserId,
          service_id: serviceId,
          customer_profile_id: customer.id,
          during: "[2027-04-01T09:00:00+02:00,2027-04-01T09:30:00+02:00)",
          status: "confirmed",
          created_by: customer.id,
        })
        .select("id")
        .single();

      await admin.from("hairdressers").update({ active: false }).eq("id", hairdresserId);

      // Exactly the query src/app/app/book/page.tsx uses.
      const { data: pickerResults } = await admin
        .from("hairdressers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .eq("id", hairdresserId);
      expect(pickerResults).toEqual([]);

      const { data: stillExists } = await admin
        .from("appointments")
        .select("status")
        .eq("id", appointment!.id)
        .single();
      expect(stillExists?.status).toBe("confirmed");

      await admin.from("appointments").delete().eq("id", appointment!.id);
      await deleteTestHairdresser(client, hairdresserId);
      await deleteTestUser(customer.id);
    });
  });

  // Edge case #10: "un customer viene eliminato".
  describe("deleting a customer", () => {
    it("cascades to their profile, org membership, and their own appointments", async () => {
      const hairdresserId = await createTestHairdresser(client, organizationId, "Cascade Test Hairdresser");
      const customer = await createTestUserRecord("cascade-customer", "Cascade Test Customer");
      await waitForProfile(client, customer.id);
      await addOrgMember(client, organizationId, customer.id, "customer");

      const { data: appointment } = await admin
        .from("appointments")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          hairdresser_id: hairdresserId,
          service_id: serviceId,
          customer_profile_id: customer.id,
          during: "[2027-04-02T09:00:00+02:00,2027-04-02T09:30:00+02:00)",
          status: "confirmed",
          created_by: customer.id, // self-booked: created_by is ON DELETE RESTRICT,
          // customer_profile_id is ON DELETE CASCADE, both pointing at the
          // same profile - this is exactly the case worth proving Postgres
          // resolves cleanly (cascade removes the row before RESTRICT can
          // see it) rather than assuming it from reading the FK definitions.
        })
        .select("id")
        .single();

      await deleteTestUser(customer.id);

      const { data: profile } = await admin.from("profiles").select("id").eq("id", customer.id).maybeSingle();
      expect(profile).toBeNull();

      const { data: membership } = await admin
        .from("organization_members")
        .select("id")
        .eq("profile_id", customer.id);
      expect(membership).toEqual([]);

      const { data: appointmentAfter } = await admin
        .from("appointments")
        .select("id")
        .eq("id", appointment!.id)
        .maybeSingle();
      expect(appointmentAfter).toBeNull();

      await deleteTestHairdresser(client, hairdresserId);
    });
  });

  // Edge case #5: "un parrucchiere viene messo in ferie dopo l'approvazione
  // della ricorrenza". generate_recurring_occurrences only runs once, right
  // after approval (see the migration's own comment - the periodic
  // re-extension job is explicitly deferred). This test documents the
  // actual, current behavior: adding a vacation exception afterward does
  // NOT retroactively touch an already-confirmed appointment. That's a
  // real product gap worth flagging (there is currently no hairdresser-
  // initiated cancel action at all - only the customer can cancel their own
  // booking), not a bug this test should paper over.
  describe("a hairdresser goes on vacation after a recurring occurrence is already confirmed", () => {
    it("the existing confirmed appointment is left untouched (no automatic cancellation exists yet)", async () => {
      const hairdresserId = await createTestHairdresser(client, organizationId, "Vacation Test Hairdresser");
      const customer = await createTestUserRecord("vacation-customer", "Vacation Test Customer");
      await waitForProfile(client, customer.id);
      await addOrgMember(client, organizationId, customer.id, "customer");

      const { data: appointment } = await admin
        .from("appointments")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          hairdresser_id: hairdresserId,
          service_id: serviceId,
          customer_profile_id: customer.id,
          during: "[2027-05-05T09:00:00+02:00,2027-05-05T09:30:00+02:00)",
          status: "confirmed",
          created_by: customer.id,
        })
        .select("id")
        .single();

      await admin.from("availability_exceptions").insert({
        organization_id: organizationId,
        hairdresser_id: hairdresserId,
        date: "2027-05-05",
        type: "unavailable_all_day",
        reason: "Vacation",
      });

      const { data: appointmentAfter } = await admin
        .from("appointments")
        .select("status")
        .eq("id", appointment!.id)
        .single();
      expect(appointmentAfter?.status).toBe("confirmed");

      await admin.from("availability_exceptions").delete().eq("hairdresser_id", hairdresserId);
      await admin.from("appointments").delete().eq("id", appointment!.id);
      await deleteTestHairdresser(client, hairdresserId);
      await deleteTestUser(customer.id);
    });
  });
});
