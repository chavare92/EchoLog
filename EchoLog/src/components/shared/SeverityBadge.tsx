import { SEVERITY } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<number, { label: string; className: string }> = {
  [SEVERITY.Critical]: {
    label: "Critical",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
  [SEVERITY.High]: {
    label: "High",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  [SEVERITY.Medium]: {
    label: "Medium",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
};

interface SeverityBadgeProps {
  severity: number | null | undefined;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  if (severity === null || severity === undefined) return null;
  const config = SEVERITY_CONFIG[severity] ?? { label: String(severity), className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };

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
