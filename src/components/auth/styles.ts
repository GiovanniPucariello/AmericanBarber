// Minimal shared styles for auth forms. A proper design system / ui kit
// lands in Phase 16 - these are intentionally plain constants, not a
// component library, to keep this phase scoped to auth functionality.
export const inputClass =
  "h-12 rounded-md bg-ink-900 border border-paper-50/15 px-4 text-paper-50 placeholder:text-paper-50/40 focus:outline-none focus:border-accent";

export const primaryButtonClass =
  "h-12 rounded-md bg-accent text-paper-50 font-medium disabled:opacity-50 transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98]";

export const secondaryButtonClass =
  "h-12 rounded-md bg-paper-50 text-ink-950 font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]";

export const linkClass = "text-sm text-paper-50/60 underline underline-offset-2";
