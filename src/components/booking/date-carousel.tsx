"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DateTime } from "luxon";
import "@/lib/luxon-locale";
import { DayPill } from "@/components/calendar/day-pill";

// Horizontal scrollable day carousel (section 38) instead of a desktop-style
// date picker. Client-side so a tap gives instant pill feedback (section 43
// motion pass) while the new day's data streams in behind it via
// useTransition - no full-page flash, still no client-side data fetching.
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
  const today = DateTime.now().setZone(timeZone).startOf("day");
  const todayIso = today.toISODate() as string;
  const dates = Array.from({ length: days }, (_, i) => today.plus({ days: i }));

  function selectDate(iso: string) {
    const params = new URLSearchParams();
    params.set("serviceId", serviceId);
    params.set("date", iso);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className={`flex gap-2 overflow-x-auto snap-x pb-1 -mx-6 px-6 transition-opacity duration-150 ${
        isPending ? "opacity-70" : "opacity-100"
      }`}
    >
      {dates.map((d) => {
        const iso = d.toISODate() as string;
        const isSelected = iso === selectedDate;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => selectDate(iso)}
            aria-current={isSelected ? "date" : undefined}
            className={`shrink-0 snap-start w-14 h-16 rounded-md border transition-transform active:scale-[0.96] ${
              isSelected ? "border-accent" : "bg-ink-900 border-paper-50/15"
            }`}
          >
            <DayPill weekday={d.toFormat("ccc")} day={d.toFormat("d")} selected={isSelected} today={iso === todayIso} />
          </button>
        );
      })}
    </div>
  );
}
