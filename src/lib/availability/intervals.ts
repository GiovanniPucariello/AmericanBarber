// Plain epoch-millisecond interval arithmetic. Everything gets converted to
// absolute UTC instants before reaching these functions (see timezone.ts) -
// doing the math in absolute time rather than "minutes since local
// midnight" is what makes this correct across a DST transition.
export type Interval = { start: number; end: number };

export function unionIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [{ ...sorted[0] }];
  for (const cur of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function subtractIntervals(base: Interval[], remove: Interval[]): Interval[] {
  let result = base;
  for (const r of remove) {
    const next: Interval[] = [];
    for (const b of result) {
      if (r.end <= b.start || r.start >= b.end) {
        next.push(b);
        continue;
      }
      if (r.start > b.start) next.push({ start: b.start, end: Math.min(r.start, b.end) });
      if (r.end < b.end) next.push({ start: Math.max(r.end, b.start), end: b.end });
    }
    result = next;
  }
  return result;
}

// Parses a Postgres range literal as returned by PostgREST, e.g.
// ["2026-01-01 09:00:00+00","2026-01-01 09:30:00+00").
export function parseRange(raw: string): Interval {
  const match = raw.match(/^[[(]"?([^",]+)"?,"?([^",)\]]+)"?[)\]]$/);
  if (!match) {
    throw new Error(`Unrecognized Postgres range literal: ${raw}`);
  }
  return { start: new Date(match[1]).getTime(), end: new Date(match[2]).getTime() };
}
