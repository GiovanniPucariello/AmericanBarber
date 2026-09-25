"use client";

import { useActionState } from "react";
import type { HairdresserActionState } from "@/lib/hairdressers/actions";

const initialState: HairdresserActionState = { error: null };

const inputClass =
  "h-12 rounded-md bg-ink-900 border border-paper-50/15 px-4 text-paper-50 placeholder:text-paper-50/40 focus:outline-none focus:border-accent";

export function HairdresserForm({
  action,
  defaultValues,
}: {
  action: (
    state: HairdresserActionState,
    formData: FormData,
  ) => Promise<HairdresserActionState>;
  defaultValues?: {
    id: string;
    display_name: string;
    bio: string | null;
    sort_order: number;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="p-6 flex flex-col gap-3 max-w-sm">
      {defaultValues && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}
      <input
        name="displayName"
        defaultValue={defaultValues?.display_name}
        placeholder="Nome"
        required
        className={inputClass}
      />
      <textarea
        name="bio"
        defaultValue={defaultValues?.bio ?? ""}
        placeholder="Bio (facoltativa)"
        rows={3}
        className={`${inputClass} h-auto py-3`}
      />
      <input
        name="sortOrder"
        type="number"
        defaultValue={defaultValues?.sort_order ?? 0}
        className={inputClass}
      />

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
