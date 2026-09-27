// Shared error message for forms. Red text on ink-950 failed WCAG contrast
// (2.19:1), so the red moves to the border/tint and the text stays
// paper-50. role="alert" makes screen readers announce it on submit.
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="animate-fade-in flex items-start gap-2 rounded-md border border-accent bg-accent/20 px-3 py-2.5 text-sm text-paper-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden className="w-4 h-4 mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{message}</span>
    </p>
  );
}
