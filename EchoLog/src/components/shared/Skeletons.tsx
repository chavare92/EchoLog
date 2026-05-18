import { cn } from "@/lib/utils";

function ShimmerBox({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("shimmer rounded-md", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="space-y-0" aria-busy="true" aria-label="Loading...">
      {/* header */}
      <div className="flex gap-4 px-4 py-3 border-b border-[hsl(var(--border))]">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerBox key={i} className="h-3 flex-1" style={{ opacity: 1 - i * 0.08 } as React.CSSProperties} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex gap-4 px-4 py-3.5 border-b border-[hsl(var(--border)/0.5)]"
          style={{ animationDelay: `${row * 0.06}s` } as React.CSSProperties}
        >
          {Array.from({ length: columns }).map((_, col) => (
            <ShimmerBox
              key={col}
              className="h-4 flex-1"
              style={{ opacity: 1 - col * 0.1 } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background-card))] p-5 space-y-3">
      <div className="flex items-center gap-3">
        <ShimmerBox className="h-9 w-9 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerBox className="h-3.5 w-1/3" />
          <ShimmerBox className="h-3 w-1/2" />
        </div>
      </div>
      <ShimmerBox className="h-3 w-full" />
      <ShimmerBox className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonMetricRow() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background-card))] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <ShimmerBox className="h-3 w-16" />
            <ShimmerBox className="h-7 w-7 rounded-lg" />
          </div>
          <ShimmerBox className="h-8 w-20" />
          <ShimmerBox className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}
