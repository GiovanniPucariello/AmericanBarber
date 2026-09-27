"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { inputClass, linkClass, primaryButtonClass } from "./styles";
import { FormError } from "@/components/ui/form-error";

export function ResetRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    authInitialState,
  );

  if (state.success) {
    return <p className="text-paper-50/80 text-center">{state.success}</p>;
  }

  return (
    <form action={formAction} className="w-full flex flex-col gap-3">
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        className={inputClass}
      />

      <FormError message={state.error} />

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "..." : "Invia link di reset"}
      </button>

      <Link href="/login" className={`${linkClass} self-center`}>
        Torna al login
      </Link>
    </form>
  );
}
