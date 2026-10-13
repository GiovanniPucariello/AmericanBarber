"use client";

import { useActionState } from "react";
import { updateOwnContacts } from "@/lib/hairdressers/actions";
import { authInitialState } from "@/lib/auth/state";
import { inputClass, primaryButtonClass } from "@/components/auth/styles";
import { FormError } from "@/components/ui/form-error";

export function ContactsForm({ handle, phone }: { handle: string; phone: string }) {
  const [state, formAction, pending] = useActionState(updateOwnContacts, authInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <h2 className="font-semibold">I tuoi contatti</h2>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-paper-50/60">Instagram</span>
        <div className="flex items-center gap-2">
          <span className="text-paper-50/60" aria-hidden>@</span>
          <input
            name="instagram"
            defaultValue={handle}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="nomeutente"
            className={inputClass + " flex-1"}
          />
        </div>
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
      </label>
      <span className="text-xs text-paper-50/50">
        Entrambi facoltativi. Compaiono sotto il tuo nome, visibili ai clienti. Lascia vuoto per toglierli.
      </span>

      <FormError message={state.error} />
      {state.success && !pending && <p className="text-paper-50/80 text-sm" role="status">{state.success}</p>}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}
