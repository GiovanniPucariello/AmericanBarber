import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  pgClient,
  adminClient,
  getTestOrg,
  getFirstLocation,
  createTestHairdresser,
  deleteTestHairdresser,
  addAvailabilityRule,
} from "./helpers";
import { computeAvailableSlots, computeDaySchedule } from "@/lib/availability/compute";

// Fixed future Wednesday (weekday index 2, matching availability_rules'
// 0=Monday..6=Sunday) - far enough ahead that "already past" slot
// filtering never makes this test flaky.
const TEST_DATE = "2026-11-04";
const TIMEZONE = "Europe/Rome";

describe("availability computation (integration)", () => {
  let client: Client;
  let admin: SupabaseClient<Database>;
  let organizationId: string;
  let locationId: string;
  let hairdresserId: string;

  beforeAll(async () => {
    client = pgClient();
    await client.connect();
    admin = adminClient();
    const org = await getTestOrg(client);
    organizationId = org.id;
    locationId = await getFirstLocation(client, organizationId);
    hairdresserId = await createTestHairdresser(client, organizationId, "Integration Availability Test");
    await addAvailabilityRule(client, {
      organizationId,
      hairdresserId,
      locationId,
      weekday: 2,
      startTime: "09:00",
      endTime: "12:00",
    });
  });

  afterAll(async () => {
    await deleteTestHairdresser(client, hairdresserId);
    await client.end();
  });

  it("returns bookable slots across the whole rule window when nothing else is booked", async () => {
    const slots = await computeAvailableSlots(admin, {
      hairdresserId,
      date: TEST_DATE,
      timeZone: TIMEZONE,
      serviceDurationMinutes: 30,
      bookingIntervalMinutes: 30,
    });
    // 09:00-12:00 in 30-minute steps: 09:00, 09:30, ... 11:30 = 6 slots.
    expect(slots).toHaveLength(6);
    expect(slots[0].startUtc).toBe("2026-11-04T08:00:00.000Z"); // CET = UTC+1
  });

  it("a holiday exception (unavailable_all_day) removes every slot that day", async () => {
    const { data: exception } = await admin
      .from("availability_exceptions")
      .insert({
        organization_id: organizationId,
        hairdresser_id: hairdresserId,
        date: TEST_DATE,
        type: "unavailable_all_day",
      })
      .select("id")
      .single();

    const slots = await computeAvailableSlots(admin, {
      hairdresserId,
      date: TEST_DATE,
      timeZone: TIMEZONE,
      serviceDurationMinutes: 30,
      bookingIntervalMinutes: 30,
    });
    expect(slots).toHaveLength(0);

    await admin.from("availability_exceptions").delete().eq("id", exception!.id);
  });

  it("a blocked slot removes just that range, not the whole day", async () => {
    const { data: blocked } = await admin
      .from("blocked_slots")
      .insert({
        organization_id: organizationId,
        hairdresser_id: hairdresserId,
        during: "[2026-11-04T09:00:00+01:00,2026-11-04T10:00:00+01:00)",
        reason: "Lunch with supplier",
      })
      .select("id")
      .single();

    const schedule = await computeDaySchedule(admin, {
      hairdresserId,
      date: TEST_DATE,
      timeZone: TIMEZONE,
      serviceDurationMinutes: 30,
      bookingIntervalMinutes: 30,
    });

    // Slots before 08:00 UTC (09:00 CET) don't exist (rule starts at 09:00);
    // the two 30-min slots at 08:00 and 08:30 UTC (09:00/09:30 CET) should
    // both be marked unavailable, and slots from 09:00 UTC (10:00 CET)
    // onward should be free again.
    const nineToTenUtc = schedule.filter(
      (s) => s.startUtc >= "2026-11-04T08:00:00.000Z" && s.startUtc < "2026-11-04T09:00:00.000Z",
    );
    expect(nineToTenUtc.every((s) => s.available === false)).toBe(true);
    const afterTenUtc = schedule.filter((s) => s.startUtc >= "2026-11-04T09:00:00.000Z");
    expect(afterTenUtc.every((s) => s.available === true)).toBe(true);
    expect(afterTenUtc.length).toBeGreaterThan(0);

    await admin.from("blocked_slots").delete().eq("id", blocked!.id);
  });

  it("computeDaySchedule shows a taken slot as unavailable rather than hiding it (section 39)", async () => {
    const { data: location } = await admin
      .from("locations")
      .select("id")
      .eq("organization_id", organizationId)
      .limit(1)
      .single();
    const { data: service } = await admin
      .from("services")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .limit(1)
      .single();

    const customerRes = await client.query(
      "select p.id from public.profiles p join public.organization_members om on om.profile_id = p.id where om.organization_id = $1 and om.role = 'customer' limit 1",
      [organizationId],
    );
    if (!customerRes.rows.length) {
      // No customer profile exists in this environment run - skip rather
      // than fail on an unrelated precondition.
      return;
    }
    const customerId = customerRes.rows[0].id;

    const { data: appointment } = await admin
      .from("appointments")
      .insert({
        organization_id: organizationId,
        location_id: location!.id,
        hairdresser_id: hairdresserId,
        service_id: service!.id,
        customer_profile_id: customerId,
        during: "[2026-11-04T10:00:00+01:00,2026-11-04T10:30:00+01:00)",
        status: "confirmed",
        created_by: customerId,
      })
      .select("id")
      .single();

    const schedule = await computeDaySchedule(admin, {
      hairdresserId,
      date: TEST_DATE,
      timeZone: TIMEZONE,
      serviceDurationMinutes: 30,
      bookingIntervalMinutes: 30,
    });

    const takenSlot = schedule.find((s) => s.startUtc === "2026-11-04T09:00:00.000Z");
    expect(takenSlot).toBeDefined();
    expect(takenSlot!.available).toBe(false);

    await admin.from("appointments").delete().eq("id", appointment!.id);
  });
});
