// Purely presentational day cell shared by the month grid (admin/hairdresser)
// and the customer booking day strip - same look, wrapped in whatever
// interactive element (button/link) each caller needs.
export function DayPill({
  weekday,
  day,
  selected,
  today,
  hasEvents,
}: {
  weekday: string;
  day: string;
  selected: boolean;
  today?: boolean;
  hasEvents?: boolean;
}) {
  return (
    <span
      className={`flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-md transition-colors duration-150 ${
        selected ? "bg-accent text-paper-50" : today ? "text-accent" : "text-paper-50/80"
      }`}
    >
      <span className="text-[11px] uppercase">{weekday}</span>
      <span className="text-base font-semibold leading-none">{day}</span>
      <span
        className={`w-1 h-1 rounded-full bg-accent transition-opacity duration-150 ${
          hasEvents && !selected ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
