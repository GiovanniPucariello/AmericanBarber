"use client";

import { useActionState } from "react";
import { setOwnSlotTimes } from "@/lib/hairdressers/actions";
import { authInitialState } from "@/lib/auth/state";
import { dayStartTimes } from "@/lib/availability/slot-times";
import { FormError } from "@/components/ui/form-error";

const WEEKDAY_LABELS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

const inputClass =
  "h-11 rounded-md bg-ink-900 border border-paper-50/15 px-3 text-paper-50 text-sm focus:outline-none focus:border-accent w-full";

export function SlotTimesForm({ slotTimes }: { slotTimes: unknown }) {
  const [state, formAction, pending] = useActionState(setOwnSlotTimes, authInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <h2 className="font-semibold">Orari di inizio degli appuntamenti</h2>
      <p className="text-sm text-paper-50/70">
        Scrivi gli orari in cui i clienti possono prenotare, separati da virgola (es. 08:20, 09:00, 09:45). Ogni
        appuntamento dura fino al successivo, massimo 45 minuti. Lascia vuoto un giorno per usare la durata del
        servizio scelto.
      </p>
      {WEEKDAY_LABELS.map((label, weekday) => (
        <label key={weekday} className="flex flex-col gap-1">
          <span className="text-sm text-paper-50/60">{label}</span>
          <input
            name={`day${weekday}`}
            defaultValue={dayStartTimes(slotTimes, weekday)?.join(", ") ?? ""}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Durata del servizio"
            className={inputClass}
          />
        </label>
      ))}

      <FormError message={state.error} />
      {state.success && !pending && (
        <p className="text-paper-50/80 text-sm" role="status">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 px-4 rounded-md bg-accent text-paper-50 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Salvataggio…" : "Salva orari"}
      </button>
    </form>
  );
}
