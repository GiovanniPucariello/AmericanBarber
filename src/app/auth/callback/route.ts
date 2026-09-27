import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (PKCE) redirect target - exchanges the ?code= for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  // Supabase/Google report failures as ?error_description= instead of ?code=.
  let reason = searchParams.get("error_description") ?? "missing code";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    reason = error.message;
  }

  console.error("[auth/callback] OAuth sign-in failed:", reason);
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Accesso non riuscito. Riprova o usa email e password.")}`,
  );
}
