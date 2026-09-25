"use client";

// Catches any thrown error below the root layout (a failed Supabase query,
// a bug in a server component) so a visitor sees a calm, on-brand screen
// with a way back, instead of Next's raw error overlay (section 95: every
// feature needs to "gestisce error", not just the happy path).
export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen text-paper-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">Qualcosa è andato storto</h1>
      <p className="text-paper-50/70 max-w-xs">
        Non è colpa tua. Nulla è andato perso - riprova tra un momento.
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-12 px-6 rounded-md bg-accent text-paper-50 font-medium transition-colors hover:bg-accent-hover active:scale-[0.98]"
      >
        Riprova
      </button>
    </div>
  );
}
