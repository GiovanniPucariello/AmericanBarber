#!/usr/bin/env node
// Runs `supabase <args> --db-url <SUPABASE_DB_URL>` against the remote
// Postgres database directly, bypassing `supabase link` (which requires a
// Management API access token we don't rely on — see DESIGN.md Phase 3).
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is not set — add it to .env.local.");
  process.exit(1);
}

// --dns-resolver https: the CLI's native Go resolver intermittently fails
// to resolve the pooler host on this network even though OS-level DNS
// works fine; DNS-over-HTTPS has been reliable where native isn't.
const result = spawnSync(
  "npx",
  [
    "supabase",
    ...process.argv.slice(2),
    "--db-url",
    dbUrl,
    "--dns-resolver",
    "https",
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
