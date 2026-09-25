"use client";

import { useActionState } from "react";
import { DateTime } from "luxon";
import "@/lib/luxon-locale";
import { sendAppointmentMessage, type SendAppointmentMessageState } from "@/lib/messages/actions";
import type { ThreadMessage } from "@/lib/messages/queries";

const initialState: SendAppointmentMessageState = { error: null };

export function MessageThread({
  appointmentId,
  messages,
  canSend,
}: {
  appointmentId: string;
  messages: ThreadMessage[];
  canSend: boolean;
}) {
  const action = sendAppointmentMessage.bind(null, appointmentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`max-w-[85%] rounded-md p-3 text-sm ${
              m.fromViewer
                ? "self-end bg-accent text-paper-50"
                : "self-start bg-ink-900 border border-paper-50/15"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <p className={`text-xs mt-1 ${m.fromViewer ? "text-paper-50/70" : "text-paper-50/40"}`}>
              {DateTime.fromISO(m.createdAt).toFormat("d LLL, HH:mm")}
            </p>
          </li>
        ))}
        {messages.length === 0 && (
          <p className="text-paper-50/60 text-sm">Nessun messaggio ancora.</p>
        )}
      </ul>

      {canSend ? (
        <form action={formAction} className="flex gap-2 items-end">
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Scrivi un messaggio..."
            className="flex-1 rounded-md bg-ink-900 border border-paper-50/15 px-3 py-2 text-paper-50 text-sm focus:outline-none focus:border-accent resize-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-10 px-4 rounded-md bg-accent text-paper-50 text-sm font-medium disabled:opacity-50 shrink-0"
          >
            {pending ? "..." : "Invia"}
          </button>
        </form>
      ) : (
        <p className="text-paper-50/40 text-sm">
          Questo appuntamento non è più attivo - non è possibile inviare nuovi messaggi.
        </p>
      )}
      {state.error && <p className="text-accent text-sm">{state.error}</p>}
    </div>
  );
}
