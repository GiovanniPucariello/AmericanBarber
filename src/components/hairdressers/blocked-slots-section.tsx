"use client";

import { useActionState } from "react";
import {
  addBlockedSlot,
  deleteBlockedSlot,
  type AvailabilityActionState,
} from "@/lib/availability/actions";

const initialState: AvailabilityActionState = { error: null };

const inputClass =
  "h-11 rounded-md bg-ink-900 border border-paper-50/15 px-3 text-paper-50 text-sm focus:outline-none focus:border-accent";

export type BlockedSlotRow = {
  id: string;
  during: string;
  reason: string | null;
};

// during is a Postgres range literal, e.g. ["2026-01-01 09:00:00+00",...).
// Formatting it nicely here is just a display concern (Intl handles the
// viewer's own locale/timezone); the actual authority for what this range
// means is the timezone-aware value stored server-side.
function formatRange(during: string): string {
  const match = during.match(/^[[(]"?([^",]+)"?,"?([^",)\]]+)"?[)\]]$/);
  if (!match) return during;
  const start = new Date(match[1]);
  const end = new Date(match[2]);
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
  return `${dateFmt.format(start)} - ${timeFmt.format(end)}`;
}

export function BlockedSlotsSection({ blockedSlots }: { blockedSlots: BlockedSlotRow[] }) {
  const [state, formAction, pending] = useActionState(addBlockedSlot, initialState);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Orari bloccati</h2>

      <div className="flex flex-col gap-2">
        {blockedSlots.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-md bg-ink-900 border border-paper-50/15 p-3 text-sm"
          >
            <div>
              <p>{formatRange(b.during)}</p>
              {b.reason && <p className="text-paper-50/60">{b.reason}</p>}
            </div>
            <form action={deleteBlockedSlot.bind(null, b.id)}>
              <button type="submit" className="underline underline-offset-2 shrink-0">
                Rimuovi
              </button>
            </form>
          </div>
        ))}
        {blockedSlots.length === 0 && (
          <p className="text-paper-50/40 text-sm">Nessun orario bloccato.</p>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="date" name="date" required className={inputClass} />
        <input type="time" name="startTime" required className={inputClass} />
        <input type="time" name="endTime" required className={inputClass} />
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
