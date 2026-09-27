"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelAppointment } from "@/lib/bookings/actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 px-4 rounded-md bg-accent text-paper-50 text-sm font-medium disabled:opacity-50 active:scale-[0.97] transition-transform"
    >
      {pending ? "Annullamento…" : "Sì, annulla"}
    </button>
  );
}

// Two taps, not one: cancelling notifies the barber and frees the slot for
// someone else, so a stray tap on a phone shouldn't be enough.
export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-11 px-4 rounded-md border border-paper-50/15 text-sm text-paper-50/80 active:scale-[0.97] transition-transform"
      >
        Annulla
      </button>
    );
  }

  return (
    <form
      action={cancelAppointment.bind(null, appointmentId)}
      className="flex items-center gap-2 animate-fade-in"
    >
      <span className="text-sm text-paper-50/70 mr-auto">Annullare l&apos;appuntamento?</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="h-11 px-3 text-sm text-paper-50/70"
      >
        No
      </button>
      <ConfirmButton />
    </form>
  );
}
