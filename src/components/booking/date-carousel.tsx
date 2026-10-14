"use client";

import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DateTime } from "luxon";
import "@/lib/luxon-locale";
import { DayPill } from "@/components/calendar/day-pill";

// Horizontal scrollable day carousel (section 38) instead of a desktop-style
// date picker. Client-side so a tap gives instant pill feedback (section 43
// motion pass) while the new day's data streams in behind it via
// useTransition - no full-page flash, still no client-side data fetching.
// The week's earlier days show greyed out (not selectable) so the strip
// reads as a calendar; arrows scroll it on desktop, where there's no swipe.
export function DateCarousel({
  timeZone,
  selectedDate,
  serviceId,
  days = 14,
}: {
  timeZone: string;
  selectedDate: string;
  serviceId: string;
  days?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const stripRef = useRef<HTMLDivElement>(null);
  const today = DateTime.now().setZone(timeZone).startOf("day");
  const todayIso = today.toISODate() as string;
  const pastDays = today.weekday - 1; // Monday .. yesterday
  const dates = Array.from({ length: pastDays + days }, (_, i) => today.plus({ days: i - pastDays }));

  // Start with the selected day in view, not the greyed past ones.
  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>('[aria-current="date"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selectedDate]);

  function selectDate(iso: string) {
    const params = new URLSearchParams();
    params.set("serviceId", serviceId);
    params.set("date", iso);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const scrollBy = (dir: 1 | -1) => stripRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  const arrowClass =
    "hidden sm:flex shrink-0 w-9 h-16 items-center justify-center rounded-md border border-paper-50/15 bg-ink-900 text-lg";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => scrollBy(-1)} aria-label="Giorni precedenti" className={arrowClass}>
        ‹
      </button>
      <div
        ref={stripRef}
        className={`flex-1 flex gap-2 overflow-x-auto snap-x -mx-6 px-6 sm:mx-0 sm:px-0 scroll-pl-6 sm:scroll-pl-0 no-scrollbar transition-opacity duration-150 ${
          isPending ? "opacity-70" : "opacity-100"
        }`}
      >
        {dates.map((d) => {
          const iso = d.toISODate() as string;
          const isPast = iso < todayIso;
          const isSelected = iso === selectedDate;
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => selectDate(iso)}
              aria-current={isSelected ? "date" : undefined}
              className={`shrink-0 snap-start w-14 h-16 rounded-md border transition-transform ${
                isPast
                  ? "bg-ink-900/40 border-paper-50/5 opacity-40 cursor-not-allowed"
                  : isSelected
                    ? "border-accent active:scale-[0.96]"
                    : "bg-ink-900 border-paper-50/15 active:scale-[0.96]"
              }`}
            >
              <DayPill weekday={d.toFormat("ccc")} day={d.toFormat("d")} selected={isSelected} today={iso === todayIso} />
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => scrollBy(1)} aria-label="Giorni successivi" className={arrowClass}>
        ›
      </button>
    </div>
  );
}
