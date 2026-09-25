import { describe, expect, it } from "vitest";
import { unionIntervals, subtractIntervals, parseRange } from "@/lib/availability/intervals";

describe("unionIntervals", () => {
  it("merges overlapping intervals", () => {
    expect(unionIntervals([{ start: 0, end: 10 }, { start: 5, end: 15 }])).toEqual([
      { start: 0, end: 15 },
    ]);
  });

  it("merges touching intervals (end === start)", () => {
    expect(unionIntervals([{ start: 0, end: 10 }, { start: 10, end: 20 }])).toEqual([
      { start: 0, end: 20 },
    ]);
  });

  it("keeps disjoint intervals separate", () => {
    expect(unionIntervals([{ start: 0, end: 10 }, { start: 20, end: 30 }])).toEqual([
      { start: 0, end: 10 },
      { start: 20, end: 30 },
    ]);
  });

  it("sorts unordered input before merging", () => {
    expect(
      unionIntervals([
        { start: 20, end: 30 },
        { start: 0, end: 10 },
        { start: 5, end: 25 },
      ]),
    ).toEqual([{ start: 0, end: 30 }]);
  });

  it("returns an empty array for empty input", () => {
    expect(unionIntervals([])).toEqual([]);
  });
});

describe("subtractIntervals", () => {
  it("removes a middle chunk, leaving two pieces", () => {
    expect(subtractIntervals([{ start: 0, end: 100 }], [{ start: 40, end: 60 }])).toEqual([
      { start: 0, end: 40 },
      { start: 60, end: 100 },
    ]);
  });

  it("removes a chunk touching the start", () => {
    expect(subtractIntervals([{ start: 0, end: 100 }], [{ start: 0, end: 30 }])).toEqual([
      { start: 30, end: 100 },
    ]);
  });

  it("removes a chunk touching the end", () => {
    expect(subtractIntervals([{ start: 0, end: 100 }], [{ start: 70, end: 100 }])).toEqual([
      { start: 0, end: 70 },
    ]);
  });

  it("removing a superset leaves nothing", () => {
    expect(subtractIntervals([{ start: 10, end: 20 }], [{ start: 0, end: 100 }])).toEqual([]);
  });

  it("a non-overlapping removal changes nothing", () => {
    expect(subtractIntervals([{ start: 0, end: 10 }], [{ start: 20, end: 30 }])).toEqual([
      { start: 0, end: 10 },
    ]);
  });

  it("applies multiple removals in sequence (blocked slot + exception together)", () => {
    expect(
      subtractIntervals(
        [{ start: 0, end: 100 }],
        [{ start: 10, end: 20 }, { start: 80, end: 90 }],
      ),
    ).toEqual([
      { start: 0, end: 10 },
      { start: 20, end: 80 },
      { start: 90, end: 100 },
    ]);
  });
});

describe("parseRange", () => {
  it("parses an inclusive-start, exclusive-end Postgres tstzrange literal", () => {
    const result = parseRange('["2026-01-01 09:00:00+00","2026-01-01 09:30:00+00")');
    expect(result.start).toBe(Date.parse("2026-01-01T09:00:00Z"));
    expect(result.end).toBe(Date.parse("2026-01-01T09:30:00Z"));
  });

  it("throws on an unrecognized literal", () => {
    expect(() => parseRange("not-a-range")).toThrow();
  });
});
