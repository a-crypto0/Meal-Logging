export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 px-4 pt-6" aria-busy="true" aria-label="불러오는 중">
      {/* Header skeleton */}
      <div className="h-8 w-1/2 animate-pulse rounded-xl bg-muted" />
      <div className="h-4 w-1/3 animate-pulse rounded-lg bg-muted" />

      {/* Row skeletons */}
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-2xl bg-muted"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
