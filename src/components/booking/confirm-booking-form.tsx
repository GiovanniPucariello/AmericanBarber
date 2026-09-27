"use client";

import { useActionState } from "react";
import { createAppointment, type BookingActionState } from "@/lib/bookings/actions";
import { FormError } from "@/components/ui/form-error";

const initialState: BookingActionState = { error: null };

export function ConfirmBookingForm({
  hairdresserId,
  serviceId,
  startUtc,
}: {
  hairdresserId: string;
  serviceId: string;
  startUtc: string;
}) {
  const [state, formAction, pending] = useActionState(createAppointment, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="hairdresserId" value={hairdresserId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="startUtc" value={startUtc} />

      <FormError message={state.error} />

      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-md bg-accent text-paper-50 font-medium disabled:opacity-50 transition-transform active:scale-[0.98]"
      >
        {pending ? "Prenotazione in corso…" : "Conferma prenotazione"}
      </button>
    </form>
  );
}
