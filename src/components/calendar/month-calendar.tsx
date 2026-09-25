"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DateTime } from "luxon";
import "@/lib/luxon-locale";
import { buildMonthWeeks, findSelectedWeekIndex } from "@/lib/calendar/month-grid";
import { DayPill } from "./day-pill";

// Full month grid for admin/hairdresser. Starts expanded; clicking a day
// collapses the grid down to just that day's week (Apple Calendar-style),
// revealing the day panel below. A small chevron re-expands without
// changing the selected date. Navigation goes through the existing
// server-driven `?date=` convention - this component only owns the
// collapse/expand visual state, not data fetching.
export function MonthCalendar({
  selectedDate,
  todayIso,
  timeZone,
  daysWithAppointments = [],
  extraParams,
}: {
  selectedDate: string;
  todayIso: string;
  timeZone: string;
  daysWithAppointments?: string[];
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(true);

  const eventDays = new Set(daysWithAppointments);
  const weeks = buildMonthWeeks(selectedDate, todayIso, timeZone);
  const selectedWeekIndex = findSelectedWeekIndex(weeks, selectedDate);
  const monthLabel = DateTime.fromISO(selectedDate, { zone: timeZone }).toFormat("LLLL yyyy");

  function hrefFor(iso: string) {
    const params = new URLSearchParams();
    params.set("date", iso);
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      if (value) params.set(key, value);
    }
    return `${pathname}?${params.toString()}`;
  }

  function selectDate(iso: string, collapse: boolean) {
    startTransition(() => {
      router.push(hrefFor(iso));
    });
    setExpanded(!collapse);
  }

  function goToMonth(offset: number) {
    const firstOfMonth = DateTime.fromISO(selectedDate, { zone: timeZone })
      .startOf("month")
      .plus({ months: offset });
    selectDate(firstOfMonth.toISODate() as string, false);
  }

  return (
    <div className={`flex flex-col gap-2 transition-opacity duration-150 ${isPending ? "opacity-80" : "opacity-100"}`}>
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="Mese precedente"
          className="h-8 w-8 flex items-center justify-center rounded-md text-paper-50/60 hover:text-paper-50"
        >
          &#8249;
        </button>
        <p className="text-sm font-medium">{monthLabel}</p>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="Mese successivo"
          className="h-8 w-8 flex items-center justify-center rounded-md text-paper-50/60 hover:text-paper-50"
        >
          &#8250;
        </button>
      </div>

      <div className="flex flex-col">
        {weeks.map((week, i) => {
          const isVisibleWeek = expanded || i === selectedWeekIndex;
          return (
            <div
              key={week[0].iso}
              className={`grid grid-cols-7 gap-1 overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
                isVisibleWeek ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {week.map((day) => (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => selectDate(day.iso, true)}
                  aria-current={day.iso === selectedDate ? "date" : undefined}
                  className={`h-14 rounded-md ${day.inCurrentMonth ? "" : "opacity-30"}`}
                >
                  <DayPill
                    weekday={day.weekday}
                    day={String(day.day)}
                    selected={day.iso === selectedDate}
                    today={day.isToday}
                    hasEvents={eventDays.has(day.iso)}
                  />
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Mostra mese intero"
          className="self-center text-xs text-paper-50/50 py-1"
        >
          &#8964;
        </button>
      )}
    </div>
  );
}
