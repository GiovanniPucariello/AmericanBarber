import { DateTime } from "luxon";

export type MonthDay = {
  iso: string;
  day: number;
  weekday: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

function gridBounds(selectedDate: string, timeZone: string) {
  const selected = DateTime.fromISO(selectedDate, { zone: timeZone });
  const firstOfMonth = selected.startOf("month");
  const lastOfMonth = selected.endOf("month");
  // Monday-start weeks via Luxon's ISO weekday (1=Mon..7=Sun, locale
  // independent) - the app targets an Italian audience.
  const monthStart = firstOfMonth.minus({ days: firstOfMonth.weekday - 1 });
  const monthEnd = lastOfMonth.plus({ days: 7 - lastOfMonth.weekday });
  return { selected, monthStart, monthEnd };
}

// Full weeks (leading/trailing days from adjacent months included) covering
// the month that selectedDate falls in - the grid a month-view calendar
// renders, not just the calendar month itself.
export function buildMonthWeeks(selectedDate: string, todayIso: string, timeZone: string): MonthDay[][] {
  const { selected, monthStart, monthEnd } = gridBounds(selectedDate, timeZone);
  const weeks: MonthDay[][] = [];
  let cursor = monthStart;
  while (cursor <= monthEnd) {
    const week: MonthDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        iso: cursor.toISODate() as string,
        day: cursor.day,
        weekday: cursor.toFormat("ccc"),
        inCurrentMonth: cursor.month === selected.month,
        isToday: cursor.toISODate() === todayIso,
      });
      cursor = cursor.plus({ days: 1 });
    }
    weeks.push(week);
  }
  return weeks;
}

export function findSelectedWeekIndex(weeks: MonthDay[][], selectedDate: string): number {
  return weeks.findIndex((week) => week.some((d) => d.iso === selectedDate));
}

// Half-open [startIso, endIso) range covering the full displayed grid, for
// querying "which days in this view have appointments" in one shot.
export function monthGridRangeIso(selectedDate: string, timeZone: string): { startIso: string; endIso: string } {
  const { monthStart, monthEnd } = gridBounds(selectedDate, timeZone);
  return { startIso: monthStart.toISODate() as string, endIso: monthEnd.plus({ days: 1 }).toISODate() as string };
}
