"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { AuthError } from "@supabase/supabase-js";
import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  magicLinkSchema,
  passwordSignInSchema,
  resetRequestSchema,
  signUpSchema,
  updatePasswordSchema,
} from "./schemas";

import type { AuthActionState } from "./state";

function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Dati non validi.";
}

// error.status is only ever set once a response actually came back from
// Supabase's API - undefined means the request failed at the network/fetch
// layer (DNS, connection reset, etc.), and that raw message ("fetch
// failed") is not something to show a user (section 50).
function friendlyAuthError(error: AuthError): string {
  if (error.status === undefined) {
    return "Errore di rete - controlla la connessione e riprova.";
  }
  return error.message;
}

// The fixed NEXT_PUBLIC_SITE_URL env var only ever matches whichever single
// address someone happens to be testing from - e.g. a phone on the same
// Wi-Fi opens the app at the PC's LAN IP, and Google/email auth would then
// bounce it back to "localhost", which on the phone means the phone itself,
// not the PC (section: reported bug, login "breaking" on mobile). Reading
// the incoming request's own Host header instead always returns to
// whatever address the visitor is actually using. Falls back to the env
// var only if no request headers are available, which shouldn't happen
// when this runs from a real form submission.
async function siteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signUpWithPassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error) };
  }

  return {
    error: null,
    success: "Controlla la tua email per confermare l'account.",
  };
}

export async function signInWithPassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Deliberately generic for actual credential rejections (never confirm
    // whether an account exists), but a network failure gets its own
    // message rather than being misreported as a wrong password.
    return {
      error:
        error.status === undefined
          ? friendlyAuthError(error)
          : "Email o password errati.",
    };
  }

  redirect("/app");
}

export async function signInWithMagicLink(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error) };
  }

  return { error: null, success: "Controlla la tua email per il link di accesso." };
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  // Supabase itself avoids revealing whether the email exists, so the
  // response here is safe to surface directly (rate-limit errors aside).
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password/update` },
  );

  if (error) {
    return { error: friendlyAuthError(error) };
  }

  return {
    error: null,
    success: "Se esiste un account con questa email, riceverai un link di reset.",
  };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { error: friendlyAuthError(error) };
  }

  redirect("/app");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const resolvedSiteUrl = await siteUrl();
  console.log("[DEBUG signInWithGoogle] resolvedSiteUrl =", resolvedSiteUrl);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${resolvedSiteUrl}/auth/callback` },
  });
  console.log("[DEBUG signInWithGoogle] data.url =", data?.url);

  if (error || !data.url) {
    const message = error
      ? friendlyAuthError(error)
      : "L'accesso con Google non è ancora disponibile.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
