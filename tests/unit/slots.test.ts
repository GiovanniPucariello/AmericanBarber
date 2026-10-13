import { describe, expect, it } from "vitest";
import { sliceIntoSlots } from "@/lib/availability/compute";

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
      alternating: false,
    });
    expect(slots.map((s) => `${hhmm(s.start)}-${hhmm(s.end)}`)).toEqual(["19:00-19:30", "19:30-20:00", "20:00-20:30"]);
  });

  it("alternating: 30/45 back to back from opening, last start <= closing", () => {
    const slots = sliceIntoSlots([{ start: at(8, 20), end: at(11) }], [], day, {
      stepMs: 30 * M,
      durationMs: 60 * M, // service length is ignored
      alternating: true,
    });
    expect(slots.map((s) => `${hhmm(s.start)}-${hhmm(s.end)}`)).toEqual([
      "08:20-08:50",
      "08:50-09:35",
      "09:35-10:05",
      "10:05-10:50",
      "10:50-11:20",
    ]);
  });

  it("drops slots that overlap an unavailable range", () => {
    const slots = sliceIntoSlots([{ start: at(9), end: at(11) }], [{ start: at(10), end: at(11) }], day, {
      stepMs: 30 * M,
      durationMs: 30 * M,
      alternating: false,
    });
    expect(slots.map((s) => hhmm(s.start))).toEqual(["09:00", "09:30"]);
  });
});

describe("sliceIntoSlots closing rule", () => {
  it("no closing-time start when the barber leaves early", () => {
    const slots = sliceIntoSlots([{ start: at(17), end: at(20) }], [{ start: at(18), end: at(20) }], day, {
      stepMs: 30 * M,
      durationMs: 30 * M,
      alternating: false,
    });
    expect(slots.map((s) => hhmm(s.start))).toEqual(["17:00", "17:30"]);
  });
});

describe("sliceIntoSlots alternating closing slot", () => {
  const opts = { stepMs: 30 * M, durationMs: 30 * M, alternating: true };
  const fmt = (slots: { start: number; end: number }[]) => slots.slice(-2).map((s) => `${hhmm(s.start)}-${hhmm(s.end)}`);

  it("cuts the slot crossing closing and books closing time last", () => {
    // 08:20 open, 20:00 close: ... 18:50-19:35, 19:35-20:05 without the rule.
    expect(fmt(sliceIntoSlots([{ start: at(8, 20), end: at(20) }], [], day, { ...opts, closingSlot: true }))).toEqual([
      "19:35-20:00",
      "20:00-20:45",
    ]);
  });

  it("without the rule (Friday) the plain run is kept", () => {
    expect(fmt(sliceIntoSlots([{ start: at(8, 20), end: at(21) }], [], day, opts))).toEqual(["20:05-20:50", "20:50-21:20"]);
  });
});
