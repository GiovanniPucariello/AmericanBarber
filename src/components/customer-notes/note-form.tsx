"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCustomerNote, type CustomerNoteState } from "@/lib/customer-notes/actions";
import { FormError } from "@/components/ui/form-error";

const initialState: CustomerNoteState = { error: null };

export function NoteForm({ customerProfileId }: { customerProfileId: string }) {
  const [state, formAction, pending] = useActionState(
    addCustomerNote.bind(null, customerProfileId),
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the textarea after a successful save.
  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <textarea
        name="body"
        required
        maxLength={1000}
        rows={3}
        placeholder="Es. sfumatura 1,5 ai lati, sopra con le forbici"
        className="rounded-md bg-ink-900 border border-paper-50/15 px-4 py-3 text-paper-50 placeholder:text-paper-50/40 focus:outline-none focus:border-accent"
      />
      <FormError message={state.error} />
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-md bg-accent text-paper-50 font-medium disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {pending ? "Salvataggio…" : "Aggiungi nota"}
      </button>
    </form>
  );
}
