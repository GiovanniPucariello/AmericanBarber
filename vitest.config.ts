import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Integration tests hit the real remote Supabase project and the known
    // flaky DNS resolver documented in scripts/supabase-remote.mjs - a
    // generous timeout avoids a transient lookup failure reading as a
    // failed assertion. Running test files sequentially (rather than
    // vitest's default per-file parallelism) keeps concurrent connections
    // to the pooler low, which in practice is what actually keeps that
    // resolver from tripping - unit tests pay a small, unnoticeable cost
    // for the same setting.
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
