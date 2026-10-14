"use client";

import { useState } from "react";

// webcal:// opens the subscribe dialog on iPhone/Mac; Google Calendar needs
// the https link pasted under "Altri calendari > Da URL".
export function CalendarSyncLinks({ httpsUrl }: { httpsUrl: string }) {
  const [copied, setCopied] = useState(false);
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");

  return (
    <div className="flex flex-col gap-2">
      <a href={webcalUrl} className="h-11 px-4 rounded-md bg-accent text-paper-50 text-sm font-medium flex items-center justify-center">
        Sincronizza con il calendario (iPhone)
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(httpsUrl);
            setCopied(true);
          } catch {}
        }}
        className="h-11 px-4 rounded-md border border-paper-50/25 text-sm font-medium"
      >
        {copied ? "Link copiato" : "Copia link (Google Calendar / Android)"}
      </button>
      <p className="text-xs text-paper-50/50">
        Su Google Calendar: da computer, Altri calendari → + → Da URL → incolla il link. Il calendario si aggiorna da solo
        con i nuovi appuntamenti. Il link è privato: non condividerlo.
      </p>
    </div>
  );
}
