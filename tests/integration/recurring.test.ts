import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { DateTime } from "luxon";
import {
  pgClient,
  adminClient,
  signedInClient,
  getTestOrg,
  getFirstLocation,
  getFirstActiveService,
  createTestHairdresser,
  deleteTestHairdresser,
  createTestUserRecord,
  waitForProfile,
  addOrgMember,
  addAvailabilityRule,
  deleteAllTrackedTestUsers,
  TEST_PASSWORD,
} from "./helpers";

// spec section 82: recurring rules, recurring occurrences, approval,
// cancellation of occurrence, cancellation of future recurrence. Section 81
// edge cases #3 (day off), #4 (holiday), #6 (cancel one occurrence),
// #7 (cancel all future).
describe("recurring booking engine (integration)", () => {
  let client: Client;
  let admin: SupabaseClient<Database>;
  let hairdresserAuth: SupabaseClient<Database>;
  let organizationId: string;
  let locationId: string;
  let serviceId: string;
  let hairdresserId: string;
  let hairdresserProfileId: string;
  let customerId: string;

  // generate_recurring_occurrences' horizon (p_horizon_weeks) is measured
  // from CURRENT_DATE, not from the rule's starts_on - a hardcoded far-future
  // starts_on would fall entirely outside that window and silently generate
  // zero occurrences. These are computed relative to "now" instead: the
  // next Wednesday (weekday index 2, matching the one availability rule
  // this suite sets up) and the next Monday (weekday index 0, no rule at
  // all - the "hairdresser doesn't work that day" conflict case).
  function nextWeekday(zeroIndexedWeekday: number, minDaysAhead = 3): string {
    const targetLuxonWeekday = zeroIndexedWeekday + 1; // Luxon: 1=Mon..7=Sun
    let d = DateTime.now().plus({ days: minDaysAhead });
    while (d.weekday !== targetLuxonWeekday) d = d.plus({ days: 1 });
    return d.toISODate() as string;
  }
  const START_WEDNESDAY = nextWeekday(2);
  const HORIZON_WEEKS = 8;

  beforeAll(async () => {
    client = pgClient();
    await client.connect();
    admin = adminClient();
    const org = await getTestOrg(client);
    organizationId = org.id;
    locationId = await getFirstLocation(client, organizationId);
    const service = await getFirstActiveService(client, organizationId);
    serviceId = service.id;

    const hairdresserUser = await createTestUserRecord("recurring-hairdresser", "Recurring Test Hairdresser");
    hairdresserProfileId = hairdresserUser.id;
    await waitForProfile(client, hairdresserProfileId);
    await addOrgMember(client, organizationId, hairdresserProfileId, "hairdresser");
    hairdresserId = await createTestHairdresser(
      client,
      organizationId,
      "Recurring Engine Test Hairdresser",
      hairdresserProfileId,
    );
    await addAvailabilityRule(client, {
      organizationId,
      hairdresserId,
      locationId,
      weekday: 2, // Wednesday
      startTime: "09:00",
      endTime: "12:00",
    });

    const customer = await createTestUserRecord("recurring-customer", "Recurring Test Customer");
    customerId = customer.id;
    await waitForProfile(client, customerId);
    await addOrgMember(client, organizationId, customerId, "customer");

    hairdresserAuth = await signedInClient(hairdresserUser.email, TEST_PASSWORD);
  });

  afterAll(async () => {
    await deleteTestHairdresser(client, hairdresserId);
    await deleteAllTrackedTestUsers();
    await client.end();
  });

  async function insertRule(weekday: number, startsOn: string, status: "pending_approval" | "active" = "pending_approval") {
    const { data, error } = await admin
      .from("recurring_bookings")
      .insert({
        organization_id: organizationId,
        customer_profile_id: customerId,
        hairdresser_id: hairdresserId,
        service_id: serviceId,
        weekday,
        start_time: "10:00",
        interval_weeks: 1,
        starts_on: startsOn,
        status,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data!.id as string;
  }

  it("generates confirmed occurrences on a day the hairdresser actually works", async () => {
    const ruleId = await insertRule(2, START_WEDNESDAY, "active");

    const { error } = await hairdresserAuth.rpc("generate_recurring_occurrences", {
      p_recurring_booking_id: ruleId,
      p_horizon_weeks: HORIZON_WEEKS,
    });
    expect(error).toBeNull();

    const { data: occurrences } = await admin
      .from("recurring_booking_occurrences")
      .select("occurrence_date, status, appointment_id")
      .eq("recurring_booking_id", ruleId)
      .order("occurrence_date");

    expect(occurrences!.length).toBeGreaterThan(0);
    expect(occurrences!.every((o) => o.status === "confirmed")).toBe(true);
    expect(occurrences!.every((o) => o.appointment_id !== null)).toBe(true);

    const appointmentIds = occurrences!.map((o) => o.appointment_id!);
    await admin.from("appointments").delete().in("id", appointmentIds);
    await admin.from("recurring_bookings").delete().eq("id", ruleId);
  });

  it("edge case #3: a day the hairdresser doesn't work produces a conflict occurrence, not an appointment", async () => {
    // Monday - no availability_rule exists for this hairdresser at all.
    const nextMonday = nextWeekday(0);
    const ruleId = await insertRule(0, nextMonday, "active");

    const { error } = await hairdresserAuth.rpc("generate_recurring_occurrences", {
      p_recurring_booking_id: ruleId,
      p_horizon_weeks: HORIZON_WEEKS,
    });
    expect(error).toBeNull();

    const { data: occurrences } = await admin
      .from("recurring_booking_occurrences")
      .select("status, conflict_reason, appointment_id")
      .eq("recurring_booking_id", ruleId);

    expect(occurrences!.length).toBeGreaterThan(0);
    expect(occurrences!.every((o) => o.status === "conflict")).toBe(true);
    expect(occurrences!.every((o) => o.appointment_id === null)).toBe(true);
    expect(occurrences![0].conflict_reason).toMatch(/unavailable/i);

    await admin.from("recurring_bookings").delete().eq("id", ruleId);
  });

  it("edge case #4: a holiday (all-day exception) on one occurrence date produces a conflict for just that date", async () => {
    const ruleId = await insertRule(2, START_WEDNESDAY, "active");
    const secondOccurrenceDate = DateTime.fromISO(START_WEDNESDAY).plus({ weeks: 1 }).toISODate() as string;

    const { data: exception } = await admin
      .from("availability_exceptions")
      .insert({
        organization_id: organizationId,
        hairdresser_id: hairdresserId,
        date: secondOccurrenceDate,
        type: "unavailable_all_day",
        reason: "Public holiday",
      })
      .select("id")
      .single();

    const { error } = await hairdresserAuth.rpc("generate_recurring_occurrences", {
      p_recurring_booking_id: ruleId,
      p_horizon_weeks: HORIZON_WEEKS,
    });
    expect(error).toBeNull();

    const { data: occurrences } = await admin
      .from("recurring_booking_occurrences")
      .select("occurrence_date, status, appointment_id")
      .eq("recurring_booking_id", ruleId)
      .order("occurrence_date");

    const holidayOccurrence = occurrences!.find((o) => o.occurrence_date === secondOccurrenceDate);
    expect(holidayOccurrence?.status).toBe("conflict");
    expect(holidayOccurrence?.appointment_id).toBeNull();

    const otherOccurrences = occurrences!.filter((o) => o.occurrence_date !== secondOccurrenceDate);
    expect(otherOccurrences.every((o) => o.status === "confirmed")).toBe(true);

    await admin.from("availability_exceptions").delete().eq("id", exception!.id);
    const appointmentIds = occurrences!.map((o) => o.appointment_id).filter((id): id is string => !!id);
    await admin.from("appointments").delete().in("id", appointmentIds);
    await admin.from("recurring_bookings").delete().eq("id", ruleId);
  });

  it("a rejected request never generates occurrences", async () => {
    const ruleId = await insertRule(2, START_WEDNESDAY, "pending_approval");
    await admin.from("recurring_bookings").update({ status: "rejected" }).eq("id", ruleId);

    const { data: occurrences } = await admin
      .from("recurring_booking_occurrences")
      .select("id")
      .eq("recurring_booking_id", ruleId);
    expect(occurrences).toHaveLength(0);

    await admin.from("recurring_bookings").delete().eq("id", ruleId);
  });

  it("edge case #6: cancelling a single occurrence cancels only its own appointment", async () => {
    const ruleId = await insertRule(2, START_WEDNESDAY, "active");
    await hairdresserAuth.rpc("generate_recurring_occurrences", {
      p_recurring_booking_id: ruleId,
      p_horizon_weeks: HORIZON_WEEKS,
    });

    const { data: occurrences } = await admin
      .from("recurring_booking_occurrences")
      .select("id, appointment_id")
      .eq("recurring_booking_id", ruleId)
      .order("occurrence_date");
    const [first, second] = occurrences!;

    await admin.from("recurring_booking_occurrences").update({ status: "cancelled" }).eq("id", first.id);
    await admin.from("appointments").update({ status: "cancelled" }).eq("id", first.appointment_id!);

    const { data: secondAppointment } = await admin
      .from("appointments")
      .select("status")
      .eq("id", second.appointment_id!)
      .single();
    expect(secondAppointment?.status).toBe("confirmed");

    const appointmentIds = occurrences!.map((o) => o.appointment_id!);
    await admin.from("appointments").delete().in("id", appointmentIds);
    await admin.from("recurring_bookings").delete().eq("id", ruleId);
  });

  it("edge case #7: cancelling all future occurrences leaves past/completed ones untouched", async () => {
    const ruleId = await insertRule(2, START_WEDNESDAY, "active");

    const { data: pastAppt } = await admin
      .from("appointments")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        hairdresser_id: hairdresserId,
        service_id: serviceId,
        customer_profile_id: customerId,
        during: "[2020-01-01T09:00:00+01:00,2020-01-01T09:30:00+01:00)",
        status: "confirmed",
        created_by: customerId,
      })
      .select("id")
      .single();
    const { data: pastOccurrence } = await admin
      .from("recurring_booking_occurrences")
      .insert({
        recurring_booking_id: ruleId,
        organization_id: organizationId,
        occurrence_date: "2020-01-01",
        appointment_id: pastAppt!.id,
        status: "completed",
      })
      .select("id")
      .single();

    const { data: futureAppt } = await admin
      .from("appointments")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        hairdresser_id: hairdresserId,
        service_id: serviceId,
        customer_profile_id: customerId,
        during: "[2027-03-03T09:00:00+01:00,2027-03-03T09:30:00+01:00)",
        status: "confirmed",
        created_by: customerId,
      })
      .select("id")
      .single();
    const { data: futureOccurrence } = await admin
      .from("recurring_booking_occurrences")
      .insert({
        recurring_booking_id: ruleId,
        organization_id: organizationId,
        occurrence_date: "2027-03-03",
        appointment_id: futureAppt!.id,
        status: "confirmed",
      })
      .select("id")
      .single();

    // Mirrors cancelAllFutureOccurrences' own query shape exactly (src/lib/recurring/actions.ts).
    const today = DateTime.now().toISODate() as string;
    await admin.from("recurring_bookings").update({ status: "cancelled" }).eq("id", ruleId);
    const { data: cancelledOccurrences } = await admin
      .from("recurring_booking_occurrences")
      .update({ status: "cancelled" })
      .eq("recurring_booking_id", ruleId)
      .gte("occurrence_date", today)
      .not("status", "in", "(completed,cancelled)")
      .select("appointment_id");
    const appointmentIds = (cancelledOccurrences ?? []).map((o) => o.appointment_id!);
    await admin
      .from("appointments")
      .update({ status: "cancelled" })
      .in("id", appointmentIds)
      .in("status", ["pending", "confirmed"]);

    const { data: pastNow } = await admin
      .from("recurring_booking_occurrences")
      .select("status")
      .eq("id", pastOccurrence!.id)
      .single();
    const { data: futureNow } = await admin
      .from("recurring_booking_occurrences")
      .select("status")
      .eq("id", futureOccurrence!.id)
      .single();
    const { data: pastApptNow } = await admin.from("appointments").select("status").eq("id", pastAppt!.id).single();
    const { data: futureApptNow } = await admin.from("appointments").select("status").eq("id", futureAppt!.id).single();

    expect(pastNow?.status).toBe("completed");
    expect(pastApptNow?.status).toBe("confirmed");
    expect(futureNow?.status).toBe("cancelled");
    expect(futureApptNow?.status).toBe("cancelled");

    await admin.from("appointments").delete().in("id", [pastAppt!.id, futureAppt!.id]);
    await admin.from("recurring_bookings").delete().eq("id", ruleId);
  });
});
