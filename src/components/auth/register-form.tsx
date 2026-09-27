"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpWithPassword } from "@/lib/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { inputClass, linkClass, primaryButtonClass } from "./styles";
import { FormError } from "@/components/ui/form-error";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    signUpWithPassword,
    authInitialState,
  );

  if (state.success) {
    return <p className="text-paper-50/80 text-center">{state.success}</p>;
  }

  return (
    <form action={formAction} className="w-full flex flex-col gap-3">
      <input
        name="fullName"
        type="text"
        required
        autoComplete="name"
        placeholder="Nome e cognome"
        className={inputClass}
      />
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Password"
        className={inputClass}
      />

      <label className="flex items-start gap-3 py-1 text-sm text-paper-50/80">
        <input
          name="privacyAccepted"
          type="checkbox"
          required
          className="mt-0.5 w-5 h-5 shrink-0 accent-[#8C1F28]"
        />
        <span>
          Ho letto l&apos;
          <Link href="/privacy" target="_blank" className="underline underline-offset-2">
            informativa privacy
          </Link>{" "}
          e accetto il trattamento dei miei dati per gestire le prenotazioni.
        </span>
      </label>

      <FormError message={state.error} />

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Creazione account…" : "Crea account"}
      </button>

      <Link href="/login" className={`${linkClass} self-center`}>
        Hai già un account? Accedi
      </Link>
    </form>
  );
}
