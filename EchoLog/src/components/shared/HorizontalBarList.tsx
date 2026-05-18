import { cn } from "@/lib/utils";

export interface HorizontalBarItem {
  label: string;
  count: number;
  color?: string;
}

interface HorizontalBarListProps {
  items: HorizontalBarItem[];
  className?: string;
}

export function HorizontalBarList({ items, className }: HorizontalBarListProps) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const pct = Math.round((item.count / max) * 100);
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] truncate max-w-[65%]">
                {item.label}
              </span>
              <span className="text-xs font-bold text-[hsl(var(--foreground))] tabular-nums ml-2">
                {item.count}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[hsl(var(--border))] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  item.color ?? "bg-gradient-to-r from-amber-400 to-amber-500"
                )}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.label}: ${item.count}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
