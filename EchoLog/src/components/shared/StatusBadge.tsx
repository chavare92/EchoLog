import { Badge } from "@/components/ui/badge";
import { INCIDENT_STATUS, type IncidentStatusKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  number,
  { label: string; className: string }
> = {
  [INCIDENT_STATUS.Open]: {
    label: "Open",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  [INCIDENT_STATUS.InvestigationPending]: {
    label: "Investigation Pending",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  },
  [INCIDENT_STATUS.RCASubmitted]: {
    label: "RCA Submitted",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  },
  [INCIDENT_STATUS.RCAInReview]: {
    label: "RCA In Review",
    className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  },
  [INCIDENT_STATUS.RCAApproved]: {
    label: "RCA Approved",
    className: "bg-green-500/15 text-green-400 border-green-500/20",
  },
  [INCIDENT_STATUS.RCARejected]: {
    label: "RCA Rejected",
    className: "bg-red-500/15 text-red-400 border-red-500/20",
  },
  [INCIDENT_STATUS.PAClosed]: {
    label: "PA Closed",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  },
};

const RCA_STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  564060000: { label: "Draft", className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  564060001: { label: "Submitted", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  564060002: { label: "Under Review", className: "bg-amber-500/15 text-amber-300 border-amber-500/20" },
  564060003: { label: "Approved", className: "bg-green-500/15 text-green-400 border-green-500/20" },
  564060004: { label: "Rejected", className: "bg-red-500/15 text-red-400 border-red-500/20" },
};

const PA_STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  564060000: { label: "Not Started", className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  564060001: { label: "In Progress", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  564060002: { label: "Completed", className: "bg-green-500/15 text-green-400 border-green-500/20" },
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
  const config = configMap[status] ?? { label: String(status), className: "bg-slate-500/15 text-slate-400" };

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
