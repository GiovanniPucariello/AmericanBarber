import { DateTime } from "luxon";

// "Oggi" / "Domani" / "lunedì 5 ottobre" - for slot suggestions.
export function relativeDayLabel(day: DateTime, today: DateTime): string {
  const diff = Math.round(day.startOf("day").diff(today.startOf("day"), "days").days);
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Domani";
  return day.toFormat("cccc d LLLL");
}
