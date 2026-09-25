"use client";

import { useEffect, useRef, useState } from "react";

// Thin transition wrapper around whatever renders "below" a calendar for the
// selected day (appointment list, agenda, slot grid) - fades/slides the new
// day's content in so switching days doesn't just snap. An aria-live region
// announces the new date for anyone not perceiving the visual transition.
export function DayPanel({
  dateKey,
  label,
  children,
}: {
  dateKey: string;
  label: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const prevKey = useRef(dateKey);

  useEffect(() => {
    if (prevKey.current === dateKey) return;
    prevKey.current = dateKey;
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [dateKey]);

  return (
    <div>
      <div aria-live="polite" className="sr-only">
        {label}
      </div>
      <div
        className={`transition-[opacity,transform] duration-150 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
