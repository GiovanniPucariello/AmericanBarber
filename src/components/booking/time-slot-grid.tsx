import Link from "next/link";
import { DateTime } from "luxon";
import type { DaySlot } from "@/lib/availability/compute";
import { DayPanel } from "@/components/calendar/day-panel";
import { joinWaitlist, leaveWaitlist } from "@/lib/waitlist/actions";

// Big touch targets; taken slots render disabled and visually distinct
// rather than disappearing, so "closed today" reads differently from
// "open but fully booked" (section 39). Wrapped in DayPanel so switching
// days fades the grid in rather than snapping (section 43 motion pass).
export function TimeSlotGrid({
  slots,
  timeZone,
  hairdresserId,
  serviceId,
  dateKey,
  dateLabel,
  onWaitlist,
}: {
  slots: DaySlot[];
  timeZone: string;
  hairdresserId: string;
  serviceId: string;
  dateKey: string;
  dateLabel: string;
  onWaitlist: boolean;
}) {
  if (slots.length === 0) {
    return (
      <DayPanel dateKey={dateKey} label={dateLabel}>
        <p className="text-paper-50/60 text-sm">Chiuso in questo giorno.</p>
      </DayPanel>
    );
  }

  const fullyBooked = !slots.some((slot) => slot.available);

  return (
    <DayPanel dateKey={dateKey} label={dateLabel}>
      {fullyBooked && (
        <div className="mb-3 rounded-lg bg-ink-900 border border-paper-50/15 p-4 flex flex-col gap-3">
          <div>
            <p className="font-medium">Tutto pieno in questo giorno</p>
            <p className="text-sm text-paper-50/60">
              {onWaitlist
                ? "Ti avviseremo appena si libera un posto."
                : "Se qualcuno annulla, ti mandiamo una notifica."}
            </p>
          </div>
          {onWaitlist ? (
            <form action={leaveWaitlist.bind(null, hairdresserId, dateKey)}>
              <button type="submit" className="h-11 w-full rounded-md border border-paper-50/25 text-sm font-medium">
                Non avvisarmi più
              </button>
            </form>
          ) : (
            <form action={joinWaitlist.bind(null, hairdresserId, dateKey)}>
              <button
                type="submit"
                className="h-12 w-full rounded-md bg-accent text-paper-50 font-semibold active:scale-[0.98] transition-transform"
              >
                Avvisami se si libera
              </button>
            </form>
          )}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => {
          const label = DateTime.fromISO(slot.startUtc, { zone: "utc" })
            .setZone(timeZone)
            .toFormat("HH:mm");

          if (!slot.available) {
            return (
              <div
                key={slot.startUtc}
                aria-disabled
                className="h-12 rounded-md bg-ink-900 border border-paper-50/10 flex items-center justify-center text-sm text-paper-50/30 line-through"
              >
                {label}
              </div>
            );
          }

          return (
            <Link
              key={slot.startUtc}
              href={`/app/book/${hairdresserId}/confirm?serviceId=${serviceId}&start=${encodeURIComponent(slot.startUtc)}`}
              className="h-12 rounded-md bg-ink-900 border border-paper-50/15 flex items-center justify-center text-sm hover:border-accent hover:bg-accent/10 transition-[background-color,border-color,transform] active:scale-[0.96]"
            >
              {label}
            </Link>
          );
        })}
      </div>
    </DayPanel>
  );
}
