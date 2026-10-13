import { describe, expect, it } from "vitest";
import { sliceIntoSlots } from "@/lib/availability/compute";
import { dayStartTimes } from "@/lib/availability/slot-times";

const H = 3_600_000;
const M = 60_000;
const day = 0; // day start at epoch, so times read as offsets
const at = (h: number, m = 0) => day + h * H + m * M;
const hhmm = (ms: number) => `${String(Math.floor(ms / H)).padStart(2, "0")}:${String((ms % H) / M).padStart(2, "0")}`;

describe("sliceIntoSlots", () => {
  it("service grid: last booking may start exactly at closing time", () => {
    const slots = sliceIntoSlots([{ start: at(19), end: at(20) }], [], day, {
      stepMs: 30 * M,
      durationMs: 30 * M,
    });
    expect(slots.map((s) => `${hhmm(s.start)}-${hhmm(s.end)}`)).toEqual(["19:00-19:30", "19:30-20:00", "20:00-20:30"]);
  });

  it("fixed starts: each slot runs to the next start, max 45 min", () => {
    const slots = sliceIntoSlots([{ start: at(8, 20), end: at(20) }], [], day, {
      stepMs: 30 * M,
      durationMs: 60 * M, // service length is ignored
      fixedStarts: [at(8, 20), at(9), at(9, 45), at(12, 20), at(14, 20), at(19, 45)],
    });
    expect(slots.map((s) => `${hhmm(s.start)}-${hhmm(s.end)}`)).toEqual([
      "08:20-09:00",
      "09:00-09:45",
      "09:45-10:30",
      "12:20-13:05",
      "14:20-15:05",
      "19:45-20:30",
    ]);
  });

  it("fixed starts outside opening hours or in an exception are dropped", () => {
    const slots = sliceIntoSlots([{ start: at(8, 20), end: at(20) }], [{ start: at(14), end: at(20) }], day, {
      stepMs: 30 * M,
      durationMs: 30 * M,
      fixedStarts: [at(7, 45), at(8, 20), at(12, 20), at(14, 20)],
    });
    expect(slots.map((s) => hhmm(s.start))).toEqual(["08:20", "12:20"]);
  });

  it("drops slots that overlap an unavailable range", () => {
    const slots = sliceIntoSlots([{ start: at(9), end: at(11) }], [{ start: at(10), end: at(11) }], day, {
      stepMs: 30 * M,
      durationMs: 30 * M,
    });
    expect(slots.map((s) => hhmm(s.start))).toEqual(["09:00", "09:30"]);
  });
});

describe("sliceIntoSlots closing rule", () => {
  it("no closing-time start when the barber leaves early", () => {
    const slots = sliceIntoSlots([{ start: at(17), end: at(20) }], [{ start: at(18), end: at(20) }], day, {
      stepMs: 30 * M,
      durationMs: 30 * M,
    });
    expect(slots.map((s) => hhmm(s.start))).toEqual(["17:00", "17:30"]);
  });
});

describe("dayStartTimes", () => {
  it("reads the weekday's sorted list, null when missing or empty", () => {
    const times = { "1": ["09:00", "08:20"], "2": [] };
    expect(dayStartTimes(times, 1)).toEqual(["08:20", "09:00"]);
    expect(dayStartTimes(times, 2)).toBeNull();
    expect(dayStartTimes(null, 1)).toBeNull();
  });
});
