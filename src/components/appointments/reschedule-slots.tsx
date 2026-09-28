"use client";

import { useState, useTransition } from "react";
import { proposeReschedule } from "@/lib/bookings/actions";
import { FormError } from "@/components/ui/form-error";

// One tap proposes the slot - nothing moves until the customer accepts.
export function RescheduleSlots({
  appointmentId,
  slots,
}: {
  appointmentId: string;
  slots: { startUtc: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [sentLabel, setSentLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (sentLabel) {
    return (
      <p role="status" className="rounded-md border border-paper-50/25 p-3 text-sm">
        Proposta inviata: {sentLabel}. Il cliente riceve una notifica e deve accettare.
      </p>
    );
  }

  if (slots.length === 0) {
    return <p className="text-sm text-paper-50/60">Nessun orario libero in questo giorno.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <FormError message={error} />
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => (
          <button
            key={slot.startUtc}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await proposeReschedule(appointmentId, slot.startUtc);
                if (result.error) setError(result.error);
                else setSentLabel(slot.label);
              })
            }
            className="h-12 rounded-md bg-ink-900 border border-paper-50/15 text-sm tabular-nums disabled:opacity-50 hover:border-accent active:scale-[0.96] transition-transform"
          >
            {slot.label.split(" alle ")[1] ?? slot.label}
          </button>
        ))}
      </div>
    </div>
  );
}
