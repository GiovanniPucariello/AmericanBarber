"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
} from "@/lib/auth/actions";
import { authInitialState } from "@/lib/auth/state";
import {
  inputClass,
  linkClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./styles";

export function LoginForm({ oauthError }: { oauthError?: string }) {
  const [mode, setMode] = useState<"magic-link" | "password">("magic-link");

  // Two separate hooks, each bound to one stable action - useActionState
  // binds to whichever function it's given on the first render, so feeding
  // it a conditionally-chosen function doesn't rebind on later toggles (it
  // silently keeps invoking the original one with a mismatched form).
  const [magicLinkState, magicLinkAction, magicLinkPending] = useActionState(
    signInWithMagicLink,
    authInitialState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    authInitialState,
  );

  const formAction = mode === "password" ? passwordAction : magicLinkAction;
  const state = mode === "password" ? passwordState : magicLinkState;
  const pending = mode === "password" ? passwordPending : magicLinkPending;

  return (
    <div className="w-full flex flex-col gap-4">
      <form action={signInWithGoogle}>
        <button type="submit" className={`w-full ${secondaryButtonClass}`}>
          Continua con Google
        </button>
      </form>
      {oauthError && <p className="text-accent text-sm">{oauthError}</p>}

      <div className="flex items-center gap-3 text-paper-50/40 text-xs">
        <div className="h-px flex-1 bg-paper-50/15" />
        oppure
        <div className="h-px flex-1 bg-paper-50/15" />
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className={inputClass}
        />
        {mode === "password" && (
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            className={inputClass}
          />
        )}

        {state.error && <p className="text-accent text-sm">{state.error}</p>}
        {state.success && (
          <p className="text-paper-50/70 text-sm">{state.success}</p>
        )}

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending
            ? "..."
            : mode === "password"
              ? "Accedi"
              : "Inviami un link di accesso"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
        className={`${linkClass} self-center`}
      >
        {mode === "password" ? "Usa un link magico invece" : "Usa una password invece"}
      </button>

      <div className="flex justify-between mt-2">
        <Link href="/register" className={linkClass}>
          Crea un account
        </Link>
        <Link href="/reset-password" className={linkClass}>
          Password dimenticata?
        </Link>
      </div>
    </div>
  );
}
