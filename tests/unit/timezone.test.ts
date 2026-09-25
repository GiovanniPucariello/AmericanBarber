import { describe, expect, it } from "vitest";
import { localToUtc, weekdayOf } from "@/lib/availability/timezone";

// Edge case (spec section 81 #16): "l'orario legale cambia" - Europe/Rome's
// actual 2026 DST transitions (confirmed against Luxon's own IANA tz data:
// spring-forward 2026-03-29, fall-back 2026-10-25), not hand-picked dates.
describe("localToUtc across a real DST transition (Europe/Rome, 2026)", () => {
  it("resolves CET (+1) the day before spring-forward", () => {
    const dt = localToUtc("2026-03-28", "10:00", "Europe/Rome");
    expect(dt.toISO()).toBe("2026-03-28T09:00:00.000Z");
  });

  it("resolves CEST (+2) the day after spring-forward", () => {
    const dt = localToUtc("2026-03-30", "10:00", "Europe/Rome");
    expect(dt.toISO()).toBe("2026-03-30T08:00:00.000Z");
  });

  it("the same wall-clock hour is a different UTC instant either side of the transition", () => {
    const before = localToUtc("2026-03-28", "10:00", "Europe/Rome");
    const after = localToUtc("2026-03-30", "10:00", "Europe/Rome");
    expect(after.toMillis() - before.toMillis()).not.toBe(2 * 24 * 60 * 60 * 1000);
  });

  it("resolves CEST (+2) the day before fall-back", () => {
    const dt = localToUtc("2026-10-24", "10:00", "Europe/Rome");
    expect(dt.toISO()).toBe("2026-10-24T08:00:00.000Z");
  });

  it("resolves CET (+1) the day after fall-back", () => {
    const dt = localToUtc("2026-10-26", "10:00", "Europe/Rome");
    expect(dt.toISO()).toBe("2026-10-26T09:00:00.000Z");
  });

  it("throws on a genuinely malformed date/time rather than silently misbooking", () => {
    expect(() => localToUtc("2026-02-30", "10:00", "Europe/Rome")).toThrow();
  });
});

describe("weekdayOf", () => {
  it("maps Monday to 0 (matches availability_rules.weekday, not Luxon's own 1-indexed weekday)", () => {
    // 2026-03-30 is a Monday.
    expect(weekdayOf("2026-03-30", "Europe/Rome")).toBe(0);
  });

  it("maps Sunday to 6", () => {
    // 2026-03-29 is a Sunday.
    expect(weekdayOf("2026-03-29", "Europe/Rome")).toBe(6);
  });
});
