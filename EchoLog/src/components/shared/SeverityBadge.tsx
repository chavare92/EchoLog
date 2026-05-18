import { SEVERITY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

const SEVERITY_CONFIG: Record<number, { label: string; className: string; dot: string; Icon: React.ElementType }> = {
  [SEVERITY.Critical]: {
    label: "Critical",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800/60",
    dot: "bg-red-500",
    Icon: AlertCircle,
  },
  [SEVERITY.High]: {
    label: "High",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60",
    dot: "bg-amber-500",
    Icon: AlertTriangle,
  },
  [SEVERITY.Medium]: {
    label: "Medium",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/60",
    dot: "bg-blue-500",
    Icon: Info,
  },
};

interface SeverityBadgeProps {
  severity: number | null | undefined;
  showIcon?: boolean;
  className?: string;
}

export function SeverityBadge({ severity, showIcon = false, className }: SeverityBadgeProps) {
  if (severity === null || severity === undefined) return null;
  const config = SEVERITY_CONFIG[severity] ?? {
    label: String(severity),
    className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    dot: "bg-gray-400",
    Icon: Info,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className
      )}
    >
      {showIcon ? (
        <config.Icon className="w-3 h-3" />
      ) : (
        <span className={cn("status-dot", config.dot)} />
      )}
      {config.label}
    </span>
  );
}
