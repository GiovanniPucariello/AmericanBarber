"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { inputClass, primaryButtonClass } from "@/components/auth/styles";
import { FormError } from "@/components/ui/form-error";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, authInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-paper-50/60">Nome e cognome</span>
        <input
          name="fullName"
          defaultValue={fullName}
          required
          autoComplete="name"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-paper-50/60">Telefono</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={phone}
          autoComplete="tel"
          placeholder="+39 333 123 4567"
          className={inputClass}
        />
        <span className="text-xs text-paper-50/50">Facoltativo. Lo vede solo lo staff del negozio, per avvisarti in caso di imprevisti.</span>
      </label>

      <FormError message={state.error} />
      {state.success && !pending && <p className="text-paper-50/80 text-sm" role="status">{state.success}</p>}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Salvataggio…" : "Salva modifiche"}
      </button>
    </form>
  );
}
