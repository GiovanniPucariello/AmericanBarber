import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen text-paper-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">Pagina non trovata</h1>
      <p className="text-paper-50/70 max-w-xs">
        Questa pagina non esiste, oppure non hai più accesso.
      </p>
      <Link
        href="/"
        className="h-12 px-6 rounded-md bg-accent text-paper-50 font-medium flex items-center justify-center transition-colors hover:bg-accent-hover active:scale-[0.98]"
      >
        Torna alla home
      </Link>
    </div>
  );
}
