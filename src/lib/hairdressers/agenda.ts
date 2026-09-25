import type { Interval } from "@/lib/availability/intervals";

export type AgendaAppointment = {
  id: string;
  start: number;
  end: number;
  customerName: string;
  serviceName: string;
  status: string;
};

export type AgendaItem =
  | ({ kind: "appointment" } & AgendaAppointment)
  | { kind: "available"; start: number; end: number };

// Merges the day's open windows (continuous ranges) with its real
// appointments (real, variable durations - not a booking grid) into one
// chronological list, filling any gap with an "AVAILABLE" item (section
// 42's mockup: "09:00 Marco / 09:30 Luca / 10:00 AVAILABLE / 10:30 Paolo").
// Assumes openWindows are already non-overlapping and sorted (true for
// computeOpenWindows' output) and that no appointment spans two windows.
export function buildAgenda(
  openWindows: Interval[],
  appointments: AgendaAppointment[],
): AgendaItem[] {
  const items: AgendaItem[] = [];
  const sorted = [...appointments].sort((a, b) => a.start - b.start);

  for (const window of openWindows) {
    let cursor = window.start;
    for (const appt of sorted) {
      if (appt.end <= window.start || appt.start >= window.end) continue;
      if (appt.start > cursor) {
        items.push({ kind: "available", start: cursor, end: appt.start });
      }
      items.push({ kind: "appointment", ...appt });
      cursor = Math.max(cursor, appt.end);
    }
    if (cursor < window.end) {
      items.push({ kind: "available", start: cursor, end: window.end });
    }
  }

  return items;
}
