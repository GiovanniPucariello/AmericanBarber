"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpWithPassword } from "@/lib/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { inputClass, linkClass, primaryButtonClass } from "./styles";

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

      {state.error && <p className="text-accent text-sm">{state.error}</p>}

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "..." : "Crea account"}
      </button>

      <Link href="/login" className={`${linkClass} self-center`}>
        Hai già un account? Accedi
      </Link>
    </form>
  );
}
