import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/calendar/ics";

describe("buildIcs", () => {
  it("formats UTC times, escapes text, adds a reminder and uses CRLF", () => {
    const ics = buildIcs(
      {
        uid: "abc@test",
        start: Date.UTC(2026, 8, 28, 6, 0, 0),
        end: Date.UTC(2026, 8, 28, 6, 30, 0),
        summary: "Taglio con Angelo",
        location: "Viale Giuseppe la Torre, 304; Foggia",
        reminderMinutes: 60,
      },
      Date.UTC(2026, 8, 27, 12, 0, 0),
    );

    expect(ics).toContain("DTSTART:20260928T060000Z\r\n");
    expect(ics).toContain("DTEND:20260928T063000Z\r\n");
    expect(ics).toContain("DTSTAMP:20260927T120000Z\r\n");
    expect(ics).toContain("LOCATION:Viale Giuseppe la Torre\\, 304\; Foggia\r\n");
    expect(ics).toContain("TRIGGER:-PT60M\r\n");
    expect(ics.split("\r\n").filter((l) => l.includes("\n"))).toEqual([]);
  });
});
