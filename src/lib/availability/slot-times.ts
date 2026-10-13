// hairdressers.slot_times = {"<weekday 0=Mon>": ["HH:MM", ...]}; a day with
// a non-empty list uses exactly those starts.
export function dayStartTimes(slotTimes: unknown, weekday: number): string[] | null {
  const list = (slotTimes as Record<string, unknown> | null)?.[String(weekday)];
  return Array.isArray(list) && list.length > 0 ? (list as string[]).slice().sort() : null;
}
