"use client";

import { useActionState } from "react";
import {
  addAvailabilityRule,
  deleteAvailabilityRule,
  type AvailabilityActionState,
} from "@/lib/availability/actions";

const initialState: AvailabilityActionState = { error: null };

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const inputClass =
  "h-11 rounded-md bg-ink-900 border border-paper-50/15 px-3 text-paper-50 text-sm focus:outline-none focus:border-accent";

export type RuleRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export function AvailabilityRulesSection({ rules }: { rules: RuleRow[] }) {
  const [state, formAction, pending] = useActionState(
    addAvailabilityRule,
    initialState,
  );

  const byWeekday = WEEKDAY_LABELS.map((label, weekday) => ({
    label,
    weekday,
    rows: rules.filter((r) => r.weekday === weekday),
  }));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Orari settimanali</h2>

      <div className="flex flex-col gap-2">
        {byWeekday.map(({ label, weekday, rows }) => (
          <div key={weekday} className="rounded-md bg-ink-900 border border-paper-50/15 p-3">
            <p className="text-sm text-paper-50/60 mb-1">{label}</p>
            {rows.length === 0 && (
              <p className="text-sm text-paper-50/40">Chiuso</p>
            )}
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>
                  {r.start_time.slice(0, 5)}-{r.end_time.slice(0, 5)}
                </span>
                <form action={deleteAvailabilityRule.bind(null, r.id)}>
                  <button type="submit" className="underline underline-offset-2">
                    Rimuovi
                  </button>
                </form>
              </div>
            ))}
          </div>
        ))}
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <select name="weekday" className={inputClass} defaultValue="0">
          {WEEKDAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
        <input type="time" name="startTime" required className={inputClass} />
        <input type="time" name="endTime" required className={inputClass} />
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
