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
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 truncate max-w-[60%]">{item.label}</span>
              <span className="text-xs font-semibold text-gray-800 tabular-nums">{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  item.color ?? "bg-primary"
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
