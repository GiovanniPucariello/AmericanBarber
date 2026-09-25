"use client";

import { useActionState } from "react";
import type { ServiceActionState } from "@/lib/services/actions";

const initialState: ServiceActionState = { error: null };

const inputClass =
  "h-12 rounded-md bg-ink-900 border border-paper-50/15 px-4 text-paper-50 focus:outline-none focus:border-accent";

export function ServiceForm({
  action,
  defaultValues,
}: {
  action: (state: ServiceActionState, formData: FormData) => Promise<ServiceActionState>;
  defaultValues?: {
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number | null;
    sort_order: number;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="p-6 flex flex-col gap-3 max-w-sm">
      {defaultValues && <input type="hidden" name="id" value={defaultValues.id} />}
      <input
        name="name"
        defaultValue={defaultValues?.name}
        placeholder="Nome"
        required
        className={inputClass}
      />
      <textarea
        name="description"
        defaultValue={defaultValues?.description ?? ""}
        placeholder="Descrizione (facoltativa)"
        rows={3}
        className={`${inputClass} h-auto py-3`}
      />
      <label className="text-sm text-paper-50/60">
        Durata (minuti)
        <input
          name="durationMinutes"
          type="number"
          min={5}
          step={5}
          defaultValue={defaultValues?.duration_minutes ?? 30}
          required
          className={`${inputClass} w-full mt-1`}
        />
      </label>
      <label className="text-sm text-paper-50/60">
        Prezzo in centesimi (facoltativo)
        <input
          name="priceCents"
          type="number"
          min={0}
          defaultValue={defaultValues?.price_cents ?? ""}
          className={`${inputClass} w-full mt-1`}
        />
      </label>
      <label className="text-sm text-paper-50/60">
        Ordine
        <input
          name="sortOrder"
          type="number"
          defaultValue={defaultValues?.sort_order ?? 0}
          className={`${inputClass} w-full mt-1`}
        />
      </label>

      {state.error && <p className="text-accent text-sm">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-md bg-accent text-paper-50 font-medium disabled:opacity-50 transition-transform active:scale-[0.98]"
      >
        {pending ? "..." : "Salva"}
      </button>
    </form>
  );
}
