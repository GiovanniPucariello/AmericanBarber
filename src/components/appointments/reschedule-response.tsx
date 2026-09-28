"use client";

import { useState, useTransition } from "react";
import { respondToReschedule } from "@/lib/bookings/actions";
import { FormError } from "@/components/ui/form-error";

export function RescheduleResponse({
  appointmentId,
  hairdresserName,
  proposedLabel,
}: {
  appointmentId: string;
  hairdresserName: string;
  proposedLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const respond = (accept: boolean) =>
    startTransition(async () => {
      const result = await respondToReschedule(appointmentId, accept);
      if (result.error) setError(result.error);
    });

  return (
    <div className="rounded-md border border-accent bg-accent/15 p-3 flex flex-col gap-3">
      <p className="text-sm">
        <span className="font-semibold">{hairdresserName}</span> ti chiede di spostare l&apos;appuntamento a{" "}
        <span className="font-semibold">{proposedLabel}</span>.
      </p>
      <FormError message={error} />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(false)}
          className="h-11 flex-1 rounded-md border border-paper-50/25 text-sm font-medium disabled:opacity-50"
        >
          Mantieni l&apos;orario
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(true)}
          className="h-11 flex-1 rounded-md bg-accent text-paper-50 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Un momento…" : "Accetta"}
        </button>
      </div>
    </div>
  );
}
