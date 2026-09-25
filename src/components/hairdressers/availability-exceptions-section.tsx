"use client";

import { useActionState, useState } from "react";
import {
  addAvailabilityException,
  deleteAvailabilityException,
  type AvailabilityActionState,
} from "@/lib/availability/actions";

const initialState: AvailabilityActionState = { error: null };

const inputClass =
  "h-11 rounded-md bg-ink-900 border border-paper-50/15 px-3 text-paper-50 text-sm focus:outline-none focus:border-accent";

export type ExceptionRow = {
  id: string;
  date: string;
  type: "unavailable_all_day" | "unavailable_range" | "extra_range";
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

const TYPE_LABELS: Record<ExceptionRow["type"], string> = {
  unavailable_all_day: "Non disponibile (tutto il giorno)",
  unavailable_range: "Non disponibile (parte del giorno)",
  extra_range: "Disponibilità extra",
};

export function AvailabilityExceptionsSection({
  exceptions,
}: {
  exceptions: ExceptionRow[];
}) {
  const [state, formAction, pending] = useActionState(
    addAvailabilityException,
    initialState,
  );
  const [type, setType] = useState<ExceptionRow["type"]>("unavailable_all_day");

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Eccezioni</h2>

      <div className="flex flex-col gap-2">
        {exceptions.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-md bg-ink-900 border border-paper-50/15 p-3 text-sm"
          >
            <div>
              <p>
                {e.date} - {TYPE_LABELS[e.type]}
                {e.start_time && e.end_time
                  ? ` (${e.start_time.slice(0, 5)}-${e.end_time.slice(0, 5)})`
                  : ""}
              </p>
              {e.reason && <p className="text-paper-50/60">{e.reason}</p>}
            </div>
            <form action={deleteAvailabilityException.bind(null, e.id)}>
              <button type="submit" className="underline underline-offset-2 shrink-0">
                Rimuovi
              </button>
            </form>
          </div>
        ))}
        {exceptions.length === 0 && (
          <p className="text-paper-50/40 text-sm">Nessuna eccezione.</p>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="date" name="date" required className={inputClass} />
        <select
          name="type"
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as ExceptionRow["type"])}
        >
          <option value="unavailable_all_day">Non disponibile (tutto il giorno)</option>
          <option value="unavailable_range">Non disponibile (parte del giorno)</option>
          <option value="extra_range">Disponibilità extra</option>
        </select>
        {type !== "unavailable_all_day" && (
          <>
            <input type="time" name="startTime" required className={inputClass} />
            <input type="time" name="endTime" required className={inputClass} />
          </>
        )}
        <input
          type="text"
          name="reason"
          placeholder="Motivo (facoltativo)"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 px-4 rounded-md bg-accent text-paper-50 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "..." : "Aggiungi"}
        </button>
      </form>
      {state.error && <p className="text-accent text-sm">{state.error}</p>}
    </section>
  );
}
