import fs from "node:fs";
import path from "node:path";

// Next.js loads .env.local automatically; vitest doesn't, so integration
// tests (which need the real Supabase project's URL/keys/db connection
// string) parse it the same way every ad-hoc test script this project has
// used since Phase 5 already did.
function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, "../../.env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      }),
  );
}

export const env = loadEnvLocal();

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
export const SUPABASE_DB_URL = env.SUPABASE_DB_URL;
export const ORG_SLUG = env.DEFAULT_ORG_SLUG;
