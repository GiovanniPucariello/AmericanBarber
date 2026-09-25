import { Settings } from "luxon";

// Side-effect-only import. `src/app/layout.tsx` sets this same thing, but
// that module only ever runs server-side - a "use client" component gets
// its own Luxon instance running in the *browser's* JS runtime, a separate
// module graph the server-side assignment never touches. Any client
// component that formats a date/weekday must import this file so the
// browser's Luxon also defaults to Italian instead of falling back to
// whatever locale the visitor's browser reports (English, most often).
Settings.defaultLocale = "it";
