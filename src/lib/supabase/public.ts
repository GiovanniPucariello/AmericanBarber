import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// For genuinely public, unauthenticated reads (the marketing landing page)
// where touching cookies would be wrong twice over: it forces the route
// into dynamic rendering (next/headers' cookies() opts out of static/ISR
// caching regardless of a `revalidate` export) for content that's identical
// for every visitor anyway, and there's no session to read here in the
// first place.
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
