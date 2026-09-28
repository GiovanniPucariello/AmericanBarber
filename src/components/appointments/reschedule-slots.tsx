"use client";

import { useState, useTransition } from "react";
import { rescheduleAppointment } from "@/lib/bookings/actions";
import { FormError } from "@/components/ui/form-error";

// Tap a free slot, confirm, done - the customer is notified of the move.
export function RescheduleSlots({
  appointmentId,
  slots,
}: {
  appointmentId: string;
  slots: { startUtc: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<{ startUtc: string; label: string } | null>(null);
  const [movedLabel, setMovedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (movedLabel) {
    return (
      <p role="status" className="rounded-md border border-paper-50/25 p-3 text-sm">
        Spostato a {movedLabel}. Il cliente ha ricevuto una notifica.
      </p>
    );
  }

  if (slots.length === 0) {
    return <p className="text-sm text-paper-50/60">Nessun orario libero in questo giorno.</p>;
  }

  if (chosen) {
    return (
      <div className="rounded-md border border-accent bg-accent/10 p-3 flex flex-col gap-3">
        <p className="text-sm">
          Spostare a <span className="font-semibold">{chosen.label}</span>? Il cliente riceve una notifica.
        </p>
        <FormError message={error} />
        <div className="flex gap-2">
          <button type="button" onClick={() => setChosen(null)} className="h-11 flex-1 rounded-md border border-paper-50/25 text-sm font-medium">
            Indietro
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await rescheduleAppointment(appointmentId, chosen.startUtc);
                if (result.error) setError(result.error);
                else setMovedLabel(chosen.label);
              })
            }
            className="h-11 flex-1 rounded-md bg-accent text-paper-50 text-sm font-semibold disabled:opacity-50"
          >
            {pending ? "Spostamento…" : "Sposta"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((slot) => (
        <button
          key={slot.startUtc}
          type="button"
          onClick={() => {
            setError(null);
            setChosen(slot);
          }}
          className="h-12 rounded-md bg-ink-900 border border-paper-50/15 text-sm tabular-nums hover:border-accent active:scale-[0.96] transition-transform"
        >
          {slot.label.split(" alle ")[1] ?? slot.label}
        </button>
      ))}
    </div>
  );
}
