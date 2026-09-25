import { describe, expect, it } from "vitest";
import { buildMonthWeeks, findSelectedWeekIndex, monthGridRangeIso } from "@/lib/calendar/month-grid";

const TZ = "Europe/Rome";

describe("buildMonthWeeks", () => {
  it("returns full weeks (7 days each) covering the whole month", () => {
    const weeks = buildMonthWeeks("2026-09-16", "2026-09-16", TZ);
    weeks.forEach((w) => expect(w).toHaveLength(7));
  });

  it("starts every week on Monday", () => {
    const weeks = buildMonthWeeks("2026-09-16", "2026-09-16", TZ);
    weeks.forEach((week) => {
      const firstDay = new Date(`${week[0].iso}T00:00:00Z`);
      expect(firstDay.getUTCDay()).toBe(1); // 0=Sun..6=Sat, Monday=1
    });
  });

  it("marks every day of the target month as inCurrentMonth, and none outside it", () => {
    const weeks = buildMonthWeeks("2026-09-16", "2026-09-16", TZ);
    const allDays = weeks.flat();
    const inMonth = allDays.filter((d) => d.inCurrentMonth);
    expect(inMonth).toHaveLength(30); // September has 30 days
    inMonth.forEach((d) => expect(d.iso.startsWith("2026-09")).toBe(true));
    allDays
      .filter((d) => !d.inCurrentMonth)
      .forEach((d) => expect(d.iso.startsWith("2026-09")).toBe(false));
  });

  it("flags isToday only for the day matching todayIso", () => {
    const weeks = buildMonthWeeks("2026-09-16", "2026-09-03", TZ);
    const todays = weeks.flat().filter((d) => d.isToday);
    expect(todays).toEqual([expect.objectContaining({ iso: "2026-09-03" })]);
  });

  it("has no isToday day when todayIso falls outside the displayed grid", () => {
    const weeks = buildMonthWeeks("2026-09-16", "2027-01-01", TZ);
    expect(weeks.flat().some((d) => d.isToday)).toBe(false);
  });
});

describe("findSelectedWeekIndex", () => {
  it("finds the week containing the selected date", () => {
    const weeks = buildMonthWeeks("2026-09-16", "2026-09-16", TZ);
    const index = findSelectedWeekIndex(weeks, "2026-09-16");
    expect(weeks[index].some((d) => d.iso === "2026-09-16")).toBe(true);
  });

  it("returns -1 when the date isn't in the grid", () => {
    const weeks = buildMonthWeeks("2026-09-16", "2026-09-16", TZ);
    expect(findSelectedWeekIndex(weeks, "2099-01-01")).toBe(-1);
  });
});

describe("monthGridRangeIso", () => {
  it("returns a half-open range matching the first and last displayed days", () => {
    const weeks = buildMonthWeeks("2026-09-16", "2026-09-16", TZ);
    const { startIso, endIso } = monthGridRangeIso("2026-09-16", TZ);
    expect(startIso).toBe(weeks[0][0].iso);

    const lastWeek = weeks[weeks.length - 1];
    const lastDay = lastWeek[lastWeek.length - 1].iso;
    const expectedEnd = new Date(`${lastDay}T00:00:00Z`);
    expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 1);
    expect(endIso).toBe(expectedEnd.toISOString().slice(0, 10));
  });
});
