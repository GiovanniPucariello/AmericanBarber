"use client";

import { useActionState, useState } from "react";
import { createStaffBooking, type StaffBookingState } from "@/lib/bookings/staff-actions";
import { FormError } from "@/components/ui/form-error";

const initialState: StaffBookingState = { error: null };

const inputClass =
  "h-12 rounded-md bg-ink-900 border border-paper-50/15 px-3 text-paper-50 text-base focus:outline-none focus:border-accent w-full";

// Second step of "Nuovo appuntamento": slot, customer, one-off or series.
export function StaffBookingForm({
  serviceId,
  slots,
  customers,
}: {
  serviceId: string;
  slots: { startUtc: string; label: string }[];
  customers: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createStaffBooking, initialState);
  const [customerId, setCustomerId] = useState("");
  const [recurring, setRecurring] = useState(false);

  if (slots.length === 0) {
    return <p className="text-sm text-paper-50/60">Nessun orario libero in questo giorno.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="serviceId" value={serviceId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-paper-50/60 mb-2">Orario</legend>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((s, i) => (
            <label key={s.startUtc} className="relative">
              <input type="radio" name="startUtc" value={s.startUtc} defaultChecked={i === 0} className="peer sr-only" />
              <span className="h-11 flex items-center justify-center rounded-md border border-paper-50/15 bg-ink-900 text-sm tabular-nums peer-checked:bg-accent peer-checked:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-paper-50">
                {s.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-paper-50/60">Cliente</span>
        <select name="customerProfileId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
          <option value="">Cliente non registrato</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-paper-50/50">
          {customerId ? "Riceverà una notifica della prenotazione." : "Scrivi qui sotto chi è, per ricordartelo."}
        </span>
      </label>
      {!customerId && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-paper-50/60">Nome del cliente</span>
          <input name="guestName" required maxLength={100} placeholder="Es. Marco, amico di Luca" className={inputClass} />
        </label>
      )}

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="recurring" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-5 w-5 accent-accent" />
        Ripeti (prenotazione ricorrente)
      </label>
      {recurring && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-paper-50/60">Ogni</span>
            <select name="intervalWeeks" defaultValue="1" className={inputClass}>
              <option value="1">settimana</option>
              <option value="2">2 settimane</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-paper-50/60">Fino al (facoltativo)</span>
            <input type="date" name="endsOn" className={inputClass} />
          </label>
        </div>
      )}

      <FormError message={state.error} />
      <button type="submit" disabled={pending} className="h-12 rounded-md bg-accent text-paper-50 font-medium disabled:opacity-50">
        {pending ? "Salvataggio…" : recurring ? "Crea la serie" : "Salva appuntamento"}
      </button>
    </form>
  );
}
