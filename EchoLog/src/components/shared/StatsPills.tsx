import { cn } from "@/lib/utils";
import { PulseIndicator } from "./PulseIndicator";

interface StatPill {
  label: string;
  count: number;
  className: string;
  pulse?: boolean;
  pulseColor?: "red" | "amber";
}

interface StatsPillsProps {
  pills: StatPill[];
  className?: string;
}

/**
 * Reusable horizontal stat pills row.
 * Scrolls horizontally on narrow viewports.
 */
export function StatsPills({ pills, className }: StatsPillsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        className
      )}
      role="status"
      aria-label="Statistics"
    >
      {pills.map(({ label, count, className: cls, pulse, pulseColor }) => (
        <span
          key={label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap",
            cls
          )}
        >
          {pulse && <PulseIndicator color={pulseColor ?? "red"} />}
          {label}: {count}
        </span>
      ))}
    </div>
  );
}
