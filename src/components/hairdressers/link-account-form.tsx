"use client";

import { useActionState } from "react";
import {
  linkHairdresserAccount,
  type LinkHairdresserAccountState,
} from "@/lib/hairdressers/actions";

const initialState: LinkHairdresserAccountState = { error: null };

const inputClass =
  "h-12 rounded-md bg-ink-900 border border-paper-50/15 px-4 text-paper-50 placeholder:text-paper-50/40 focus:outline-none focus:border-accent";

export function LinkAccountForm({
  hairdresserId,
  displayName,
}: {
  hairdresserId: string;
  displayName: string;
}) {
  const action = linkHairdresserAccount.bind(null, hairdresserId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="p-6 flex flex-col gap-3 max-w-sm border-t border-paper-50/10">
      <div>
        <h2 className="font-semibold">Accesso di {displayName}</h2>
        <p className="text-paper-50/60 text-sm mt-1">
          Crea email e password per {displayName} - potrà accedere da{" "}
          <span className="text-paper-50/80">/login</span> per gestire la propria agenda e i propri
          orari. Comunicagliele tu stesso: non viene inviata nessuna email.
        </p>
      </div>
      <input type="hidden" name="displayName" value={displayName} />
      <input name="email" type="email" required placeholder="Email" className={inputClass} />
      <input
        name="password"
        type="text"
        required
        minLength={8}
        placeholder="Password provvisoria (almeno 8 caratteri)"
        className={inputClass}
      />
      {state.error && <p className="text-accent text-sm">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-md bg-accent text-paper-50 font-medium disabled:opacity-50 transition-transform active:scale-[0.98]"
      >
        {pending ? "..." : "Crea accesso"}
      </button>
    </form>
  );
}
