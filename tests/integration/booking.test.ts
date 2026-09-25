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
  waitForProfile,
  addOrgMember,
  deleteAllTrackedTestUsers,
} from "./helpers";

// spec section 82: booking creation, cancellation, conflicts. Section 81
// edge cases #1/#2: two users racing for the same slot.
describe("booking engine (integration)", () => {
  let client: Client;
  let admin: SupabaseClient<Database>;
  let organizationId: string;
  let locationId: string;
  let serviceId: string;
  let hairdresserId: string;
  let customerId: string;

  beforeAll(async () => {
    client = pgClient();
    await client.connect();
    admin = adminClient();
    const org = await getTestOrg(client);
    organizationId = org.id;
    locationId = await getFirstLocation(client, organizationId);
    const service = await getFirstActiveService(client, organizationId);
    serviceId = service.id;
    hairdresserId = await createTestHairdresser(client, organizationId, "Integration Booking Test");

    const customer = await createTestUserRecord("booking-customer", "Booking Test Customer");
    customerId = customer.id;
    await waitForProfile(client, customerId);
    await addOrgMember(client, organizationId, customerId, "customer");
  });

  afterAll(async () => {
    await deleteTestHairdresser(client, hairdresserId);
    await deleteAllTrackedTestUsers();
    await client.end();
  });

  function insertAppointment(duringLiteral: string) {
    return admin
      .from("appointments")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        hairdresser_id: hairdresserId,
        service_id: serviceId,
        customer_profile_id: customerId,
        during: duringLiteral,
        status: "confirmed",
        created_by: customerId,
      })
      .select("id")
      .single();
  }

  it("creates an appointment successfully", async () => {
    const { data, error } = await insertAppointment(
      "[2027-01-05T09:00:00+01:00,2027-01-05T09:30:00+01:00)",
    );
    expect(error).toBeNull();
    expect(data?.id).toBeDefined();

    await admin.from("appointments").delete().eq("id", data!.id);
  });

  it("cancelling an appointment sets status and cancelled_at/cancelled_by, and does not delete it", async () => {
    const { data: appointment } = await insertAppointment(
      "[2027-01-05T10:00:00+01:00,2027-01-05T10:30:00+01:00)",
    );

    const { data: cancelled, error } = await admin
      .from("appointments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by: customerId })
      .eq("id", appointment!.id)
      .select("status, cancelled_at, cancelled_by")
      .single();

    expect(error).toBeNull();
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.cancelled_at).not.toBeNull();
    expect(cancelled?.cancelled_by).toBe(customerId);

    const { data: stillThere } = await admin.from("appointments").select("id").eq("id", appointment!.id).maybeSingle();
    expect(stillThere).not.toBeNull();

    await admin.from("appointments").delete().eq("id", appointment!.id);
  });

  it("a cancelled appointment's slot can be re-booked (the EXCLUDE constraint ignores it)", async () => {
    const slot = "[2027-01-05T11:00:00+01:00,2027-01-05T11:30:00+01:00)";
    const { data: first } = await insertAppointment(slot);
    await admin.from("appointments").update({ status: "cancelled" }).eq("id", first!.id);

    const { data: second, error } = await insertAppointment(slot);
    expect(error).toBeNull();
    expect(second?.id).toBeDefined();

    await admin.from("appointments").delete().in("id", [first!.id, second!.id]);
  });

  it("rejects an overlapping insert for the same hairdresser with 23P01 (exclusion_violation)", async () => {
    const { data: existing } = await insertAppointment(
      "[2027-01-06T09:00:00+01:00,2027-01-06T09:30:00+01:00)",
    );

    const { error } = await insertAppointment("[2027-01-06T09:15:00+01:00,2027-01-06T09:45:00+01:00)");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23P01");

    await admin.from("appointments").delete().eq("id", existing!.id);
  });

  it("two users racing for the exact same slot: exactly one insert wins (edge case #1/#2)", async () => {
    const slot = "[2027-01-07T14:00:00+01:00,2027-01-07T14:30:00+01:00)";
    const results = await Promise.allSettled([insertAppointment(slot), insertAppointment(slot)]);

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.error === null && r.value.data,
    );
    const failed = results.filter((r) => r.status === "fulfilled" && r.value.error !== null);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    if (failed[0].status === "fulfilled") {
      expect(failed[0].value.error?.code).toBe("23P01");
    }

    if (succeeded[0].status === "fulfilled") {
      await admin.from("appointments").delete().eq("id", succeeded[0].value.data!.id);
    }
  });

  it("does not overlap-conflict across two different hairdressers at the same time", async () => {
    const otherHairdresserId = await createTestHairdresser(client, organizationId, "Second Hairdresser");
    const slot = "[2027-01-08T09:00:00+01:00,2027-01-08T09:30:00+01:00)";
    const { data: a } = await insertAppointment(slot);
    const { data: b, error } = await admin
      .from("appointments")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        hairdresser_id: otherHairdresserId,
        service_id: serviceId,
        customer_profile_id: customerId,
        during: slot,
        status: "confirmed",
        created_by: customerId,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(b?.id).toBeDefined();

    await admin.from("appointments").delete().in("id", [a!.id, b!.id]);
    await deleteTestHairdresser(client, otherHairdresserId);
  });
});
