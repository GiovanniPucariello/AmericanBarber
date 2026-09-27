"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import { inputClass, primaryButtonClass } from "./styles";
import { FormError } from "@/components/ui/form-error";

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    authInitialState,
  );

  return (
    <form action={formAction} className="w-full flex flex-col gap-3">
      <input
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Nuova password"
        className={inputClass}
      />

      <FormError message={state.error} />

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "..." : "Imposta nuova password"}
      </button>
    </form>
  );
}
