"use client";

import { useActionState, useState } from "react";
import { deleteOwnAccount } from "@/lib/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { FormError } from "@/components/ui/form-error";

export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(deleteOwnAccount, authInitialState);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-11 text-sm text-paper-50/60 underline underline-offset-2"
      >
        Elimina account
      </button>
    );
  }

  return (
    <form action={formAction} className="rounded-lg border border-accent bg-accent/10 p-4 flex flex-col gap-3 animate-fade-in">
      <p className="font-medium">Eliminare l&apos;account definitivamente?</p>
      <p className="text-sm text-paper-50/70">
        Cancelliamo subito i tuoi dati, gli appuntamenti (anche quelli futuri) e i messaggi. Non si può
        annullare.
      </p>
      <FormError message={state.error} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-12 flex-1 rounded-md border border-paper-50/25 text-sm font-medium"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-12 flex-1 rounded-md bg-accent text-paper-50 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Eliminazione…" : "Elimina"}
        </button>
      </div>
    </form>
  );
}
