import { DateTime } from "luxon";

// Combines a calendar date + wall-clock time in a given IANA zone into an
// absolute UTC instant, resolving whatever offset actually applies on that
// specific date - the only correct way to do this across a DST transition
// (section 24 explicitly warns against fragile string-based date logic).
export function localToUtc(date: string, time: string, timeZone: string): DateTime {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: timeZone });
  if (!dt.isValid) {
    throw new Error(`Invalid local date/time: ${dt.invalidReason}`);
  }
  return dt.toUTC();
}

// 0 = Monday .. 6 = Sunday (matches availability_rules.weekday), whereas
// Luxon's own .weekday is 1 = Monday .. 7 = Sunday.
export function weekdayOf(date: string, timeZone: string): number {
  const dt = DateTime.fromISO(date, { zone: timeZone });
  return dt.weekday - 1;
}
