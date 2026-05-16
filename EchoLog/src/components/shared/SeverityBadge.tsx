import { SEVERITY } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<number, { label: string; className: string }> = {
  [SEVERITY.Critical]: {
    label: "Critical",
    className: "bg-red-500/15 text-red-400 border-red-500/20",
  },
  [SEVERITY.High]: {
    label: "High",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  },
  [SEVERITY.Medium]: {
    label: "Medium",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
};

interface SeverityBadgeProps {
  severity: number | null | undefined;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  if (severity === null || severity === undefined) return null;
  const config = SEVERITY_CONFIG[severity] ?? { label: String(severity), className: "bg-slate-500/15 text-slate-400" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
