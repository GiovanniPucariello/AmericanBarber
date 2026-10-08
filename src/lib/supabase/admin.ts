import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client - bypasses RLS entirely. Only ever call this from
// inside a server action that has already checked requireOrgRole() itself;
// never derive authorization from anything reached through this client.
// Used for provisioning a hairdresser's auth.users row
// (supabase.auth.admin.*) and for a hairdresser editing their own
// instagram_handle (updateOwnInstagram, filtered to their own row).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
