import { describe, expect, it } from "vitest";
import {
  signUpSchema,
  passwordSignInSchema,
  magicLinkSchema,
} from "@/lib/auth/schemas";
import {
  availabilityRuleSchema,
  availabilityExceptionSchema,
  blockedSlotSchema,
} from "@/lib/availability/schemas";
import { createAppointmentSchema } from "@/lib/bookings/schemas";
import { hairdresserSchema } from "@/lib/hairdressers/schemas";
import { createRecurringBookingSchema } from "@/lib/recurring/schemas";
import { serviceSchema } from "@/lib/services/schemas";
import { organizationSettingsSchema } from "@/lib/organizations/schemas";

describe("auth schemas", () => {
  it("accepts a valid sign-up", () => {
    expect(
      signUpSchema.safeParse({ fullName: "Marco Rossi", email: "marco@example.com", password: "longenough" })
        .success,
    ).toBe(true);
  });

  it("rejects a short password", () => {
    expect(signUpSchema.safeParse({ fullName: "Marco", email: "marco@example.com", password: "short" }).success).toBe(
      false,
    );
  });

  it("rejects a malformed email", () => {
    expect(magicLinkSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("rejects an empty password on sign-in (distinct rule from sign-up's min length)", () => {
    expect(passwordSignInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("availabilityRuleSchema", () => {
  it("accepts a normal weekday window", () => {
    expect(availabilityRuleSchema.safeParse({ weekday: 0, startTime: "09:00", endTime: "18:00" }).success).toBe(true);
  });

  it("rejects endTime before startTime", () => {
    const result = availabilityRuleSchema.safeParse({ weekday: 0, startTime: "18:00", endTime: "09:00" });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range weekday", () => {
    expect(availabilityRuleSchema.safeParse({ weekday: 7, startTime: "09:00", endTime: "18:00" }).success).toBe(
      false,
    );
  });
});

describe("availabilityExceptionSchema", () => {
  it("an all-day exception needs no start/end time", () => {
    expect(
      availabilityExceptionSchema.safeParse({ date: "2026-12-25", type: "unavailable_all_day" }).success,
    ).toBe(true);
  });

  it("a range exception without times is rejected", () => {
    expect(availabilityExceptionSchema.safeParse({ date: "2026-06-01", type: "unavailable_range" }).success).toBe(
      false,
    );
  });

  it("a range exception with a valid start/end is accepted", () => {
    expect(
      availabilityExceptionSchema.safeParse({
        date: "2026-06-01",
        type: "unavailable_range",
        startTime: "12:00",
        endTime: "14:00",
      }).success,
    ).toBe(true);
  });
});

describe("blockedSlotSchema", () => {
  it("rejects endTime not after startTime", () => {
    expect(
      blockedSlotSchema.safeParse({ date: "2026-06-01", startTime: "10:00", endTime: "10:00" }).success,
    ).toBe(false);
  });
});

describe("createAppointmentSchema", () => {
  it("accepts the loose (non-RFC4122-strict) uuid style this project's seed data uses", () => {
    expect(
      createAppointmentSchema.safeParse({
        hairdresserId: "00000000-0000-0000-0000-000000000101",
        serviceId: "00000000-0000-0000-0000-000000000301",
        startUtc: "2026-06-01T09:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects a non-uuid hairdresserId (a tampered form field)", () => {
    expect(
      createAppointmentSchema.safeParse({
        hairdresserId: "not-a-uuid",
        serviceId: "00000000-0000-0000-0000-000000000301",
        startUtc: "2026-06-01T09:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("rejects a non-ISO startUtc", () => {
    expect(
      createAppointmentSchema.safeParse({
        hairdresserId: "00000000-0000-0000-0000-000000000101",
        serviceId: "00000000-0000-0000-0000-000000000301",
        startUtc: "tomorrow at 9",
      }).success,
    ).toBe(false);
  });
});

describe("hairdresserSchema", () => {
  it("rejects an empty display name", () => {
    expect(hairdresserSchema.safeParse({ displayName: "", sortOrder: 0 }).success).toBe(false);
  });
});

describe("createRecurringBookingSchema", () => {
  const base = {
    hairdresserId: "00000000-0000-0000-0000-000000000101",
    serviceId: "00000000-0000-0000-0000-000000000301",
    weekday: 0,
    startTime: "10:00",
    intervalWeeks: 1,
    startsOn: "2026-06-01",
  };

  it("accepts a valid weekly recurring request", () => {
    expect(createRecurringBookingSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    expect(
      createRecurringBookingSchema.safeParse({ ...base, endsOn: "2026-05-01" }).success,
    ).toBe(false);
  });

  it("accepts an end date on or after the start date", () => {
    expect(
      createRecurringBookingSchema.safeParse({ ...base, endsOn: "2026-06-01" }).success,
    ).toBe(true);
  });

  it("rejects an interval outside 1-12 weeks", () => {
    expect(createRecurringBookingSchema.safeParse({ ...base, intervalWeeks: 13 }).success).toBe(false);
  });
});

describe("serviceSchema", () => {
  it("rejects a duration under 5 minutes", () => {
    expect(
      serviceSchema.safeParse({ name: "Quick trim", durationMinutes: 2, sortOrder: 0 }).success,
    ).toBe(false);
  });

  it("accepts a service with no price set (price is optional)", () => {
    expect(
      serviceSchema.safeParse({ name: "Haircut", durationMinutes: 30, sortOrder: 0 }).success,
    ).toBe(true);
  });
});

describe("organizationSettingsSchema", () => {
  const base = { name: "American Barber Tattoo", timezone: "Europe/Rome", bookingIntervalMinutes: 30 };

  it("accepts empty color strings (colors are optional)", () => {
    expect(
      organizationSettingsSchema.safeParse({ ...base, primaryColor: "", secondaryColor: "", accentColor: "" })
        .success,
    ).toBe(true);
  });

  it("rejects a malformed hex color", () => {
    expect(organizationSettingsSchema.safeParse({ ...base, primaryColor: "red" }).success).toBe(false);
  });

  it("rejects a booking interval outside 5-120 minutes", () => {
    expect(organizationSettingsSchema.safeParse({ ...base, bookingIntervalMinutes: 200 }).success).toBe(false);
  });
});
