"use client";

import { useActionState } from "react";
import { updateOwnInstagram } from "@/lib/hairdressers/actions";
import { authInitialState } from "@/lib/auth/state";
import { inputClass, primaryButtonClass } from "@/components/auth/styles";
import { FormError } from "@/components/ui/form-error";

export function InstagramForm({ handle }: { handle: string }) {
  const [state, formAction, pending] = useActionState(updateOwnInstagram, authInitialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
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
        <span className="text-xs text-paper-50/50">
          Compare sotto il tuo nome quando i clienti prenotano. Lascia vuoto per toglierlo.
        </span>
      </label>

      <FormError message={state.error} />
      {state.success && !pending && <p className="text-paper-50/80 text-sm" role="status">{state.success}</p>}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Salvataggio…" : "Salva"}
      </button>
    </form>
  );
}
