// Served by the service worker (public/sw.js) when a navigation fails
// with no network - this app is entirely server-rendered against a live
// database, so there's no meaningful offline booking flow to fall back
// to (unlike a static content app). The honest offline story is "come
// back online", not a stale copy of a booking screen.
export default function OfflinePage() {
  return (
    <div className="min-h-screen text-paper-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Sei offline</h1>
      <p className="text-paper-50/70 max-w-xs">
        Controlla la connessione e riprova. Nulla è andato perso - i tuoi appuntamenti sono al sicuro.
      </p>
    </div>
  );
}
