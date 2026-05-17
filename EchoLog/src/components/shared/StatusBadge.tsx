import { Badge } from "@/components/ui/badge";
import { INCIDENT_STATUS, type IncidentStatusKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  number,
  { label: string; className: string }
> = {
  [INCIDENT_STATUS.Open]: {
    label: "Open",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  [INCIDENT_STATUS.InvestigationPending]: {
    label: "Investigation Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  [INCIDENT_STATUS.RCASubmitted]: {
    label: "RCA Submitted",
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  },
  [INCIDENT_STATUS.RCAInReview]: {
    label: "RCA In Review",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800",
  },
  [INCIDENT_STATUS.RCAApproved]: {
    label: "RCA Approved",
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  [INCIDENT_STATUS.RCARejected]: {
    label: "RCA Rejected",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
  [INCIDENT_STATUS.PAClosed]: {
    label: "PA Closed",
    className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  },
};

const RCA_STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  564060000: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  564060001: { label: "Submitted", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
  564060002: { label: "Under Review", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  564060003: { label: "Approved", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" },
  564060004: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
};

const PA_STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  564060000: { label: "Not Started", className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  564060001: { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800" },
  564060002: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" },
};

interface StatusBadgeProps {
  status: number | null | undefined;
  type?: "incident" | "rca" | "pa";
  className?: string;
}

export function StatusBadge({ status, type = "incident", className }: StatusBadgeProps) {
  if (status === null || status === undefined) return null;

  const configMap =
    type === "rca" ? RCA_STATUS_CONFIG : type === "pa" ? PA_STATUS_CONFIG : STATUS_CONFIG;
  const config = configMap[status] ?? { label: String(status), className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };

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

export { Badge };
export type { IncidentStatusKey };
