import { describe, expect, it } from "vitest";
import { buildAgenda, type AgendaAppointment } from "@/lib/hairdressers/agenda";

const H = 60 * 60 * 1000;
const M = 60 * 1000;
const DAY_START = Date.UTC(2026, 0, 1, 9, 0, 0); // 09:00

function appt(startOffsetMin: number, durationMin: number, name: string): AgendaAppointment {
  return {
    id: `${name}-${startOffsetMin}`,
    start: DAY_START + startOffsetMin * M,
    end: DAY_START + (startOffsetMin + durationMin) * M,
    customerName: name,
    serviceName: "Haircut",
    status: "confirmed",
  };
}

describe("buildAgenda", () => {
  it("fills an entirely empty window with a single AVAILABLE block", () => {
    const agenda = buildAgenda([{ start: DAY_START, end: DAY_START + 8 * H }], []);
    expect(agenda).toEqual([{ kind: "available", start: DAY_START, end: DAY_START + 8 * H }]);
  });

  it("interleaves appointments with AVAILABLE gaps, matching the section 42 mockup shape", () => {
    const window = { start: DAY_START, end: DAY_START + 2 * H };
    const agenda = buildAgenda([window], [appt(0, 30, "Marco"), appt(60, 30, "Paolo")]);

    // Marco 0-30, gap 30-60, Paolo 60-90, then a trailing gap to the end of
    // the 2-hour window at 120.
    expect(agenda.map((i) => i.kind)).toEqual(["appointment", "available", "appointment", "available"]);
    expect(agenda[1]).toMatchObject({ kind: "available", start: DAY_START + 30 * M, end: DAY_START + 60 * M });
    expect(agenda[3]).toMatchObject({ kind: "available", start: DAY_START + 90 * M, end: DAY_START + 120 * M });
  });

  it("handles a non-30-minute service duration correctly (edge case: variable-length services)", () => {
    // A 45-minute service back-to-back with a 20-minute one - the grid-free
    // agenda has to size the AVAILABLE gap off the real appointment end,
    // not an assumed 30-minute slot.
    const window = { start: DAY_START, end: DAY_START + 2 * H };
    const agenda = buildAgenda([window], [appt(0, 45, "Marco"), appt(65, 20, "Luca")]);

    expect(agenda).toEqual([
      { kind: "appointment", ...appt(0, 45, "Marco") },
      { kind: "available", start: DAY_START + 45 * M, end: DAY_START + 65 * M },
      { kind: "appointment", ...appt(65, 20, "Luca") },
      { kind: "available", start: DAY_START + 85 * M, end: DAY_START + 120 * M },
    ]);
  });

  it("produces no AVAILABLE block when appointments exactly fill the window", () => {
    const window = { start: DAY_START, end: DAY_START + 60 * M };
    const agenda = buildAgenda([window], [appt(0, 60, "Marco")]);
    expect(agenda).toEqual([{ kind: "appointment", ...appt(0, 60, "Marco") }]);
  });

  it("ignores appointments entirely outside the open window", () => {
    const window = { start: DAY_START, end: DAY_START + 60 * M };
    const agenda = buildAgenda([window], [appt(-60, 30, "YesterdayLeftover")]);
    expect(agenda).toEqual([{ kind: "available", start: DAY_START, end: DAY_START + 60 * M }]);
  });

  it("returns an empty list when there are no open windows (closed today)", () => {
    expect(buildAgenda([], [])).toEqual([]);
  });
});
