// Shared skeleton primitive for loading.tsx files (section 59: never a
// blank page while a server component's data fetch is in flight). Plain
// divs, not a placeholder library - matches the rest of this project's
// "no UI kit" approach.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse-soft rounded-md bg-paper-50/10 ${className}`} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
