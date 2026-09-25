"use client";

import { useActionState } from "react";
import {
  updateOrganizationSettings,
  type OrganizationSettingsActionState,
} from "@/lib/organizations/actions";

const initialState: OrganizationSettingsActionState = { error: null };

const inputClass =
  "h-12 rounded-md bg-ink-900 border border-paper-50/15 px-4 text-paper-50 focus:outline-none focus:border-accent";

export function SettingsForm({
  defaultValues,
}: {
  defaultValues: {
    name: string;
    timezone: string;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
    bookingIntervalMinutes: number;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateOrganizationSettings,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <label className="text-sm text-paper-50/60">
        Nome dell&apos;organizzazione
        <input
          name="name"
          defaultValue={defaultValues.name}
          required
          className={`${inputClass} w-full mt-1`}
        />
      </label>

      <label className="text-sm text-paper-50/60">
        Fuso orario (nome IANA)
        <input
          name="timezone"
          defaultValue={defaultValues.timezone}
          required
          placeholder="Europe/Rome"
          className={`${inputClass} w-full mt-1`}
        />
      </label>

      <label className="text-sm text-paper-50/60">
        Intervallo griglia prenotazioni (minuti)
        <input
          name="bookingIntervalMinutes"
          type="number"
          min={5}
          max={120}
          step={5}
          defaultValue={defaultValues.bookingIntervalMinutes}
          required
          className={`${inputClass} w-full mt-1`}
        />
      </label>

      <label className="text-sm text-paper-50/60">
        Colore primario
        <input
          name="primaryColor"
          defaultValue={defaultValues.primary_color ?? ""}
          placeholder="#0B0B0C"
          className={`${inputClass} w-full mt-1`}
        />
      </label>
      <label className="text-sm text-paper-50/60">
        Colore secondario
        <input
          name="secondaryColor"
          defaultValue={defaultValues.secondary_color ?? ""}
          placeholder="#F5F3EF"
          className={`${inputClass} w-full mt-1`}
        />
      </label>
      <label className="text-sm text-paper-50/60">
        Colore accento
        <input
          name="accentColor"
          defaultValue={defaultValues.accent_color ?? ""}
          placeholder="#8C1F28"
          className={`${inputClass} w-full mt-1`}
        />
      </label>

      {state.error && <p className="text-accent text-sm">{state.error}</p>}
      {state.success && <p className="text-paper-50/70 text-sm">{state.success}</p>}

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
