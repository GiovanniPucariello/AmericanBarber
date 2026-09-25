import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client - bypasses RLS entirely. Only ever call this from
// inside a server action that has already checked requireOrgRole("admin")
// itself; never derive authorization from anything reached through this
// client. Needed for exactly one thing today: provisioning a hairdresser's
// auth.users row (supabase.auth.admin.*), which no anon/authenticated-key
// client can ever do regardless of RLS.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
