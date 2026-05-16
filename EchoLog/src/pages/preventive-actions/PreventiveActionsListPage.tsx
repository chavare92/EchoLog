import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Filter } from "lucide-react";
import { usePreventiveActions } from "@/hooks/usePreventiveActions";
import { useIncidents } from "@/hooks/useIncidents";
import { PA_STATUS } from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TicketRef } from "@/components/shared/TicketRef";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonCards } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export function PreventiveActionsListPage() {
  const navigate = useNavigate();
  const { data: actions, isLoading } = usePreventiveActions();
  const { data: incidents } = useIncidents();

  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      (actions ?? []).filter(
        (pa) => statusFilter === "all" || pa.cr4c3_status === Number(statusFilter)
      ),
    [actions, statusFilter]
  );

  const completedCount = (actions ?? []).filter((a) => a.cr4c3_status === PA_STATUS.Completed).length;
  const totalCount = actions?.length ?? 0;
  const overdueCount = (actions ?? []).filter(
    (a) => a.cr4c3_status !== PA_STATUS.Completed && isOverdue(a.cr4c3_duedate)
  ).length;

  const getIncidentTicket = (incidentId?: string) =>
    incidents?.find((i) => i.cr4c3_incidentid === incidentId)?.cr4c3_ticketreference;

  return (
    <PageWrapper
      title="Preventive Actions"
      actions={
        <Button size="sm" onClick={() => navigate("/pa/create")}>
          <Plus className="w-4 h-4 mr-1" />
          New PA
        </Button>
      }
    >
      {/* Stats row */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{totalCount}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{completedCount}</p>
          {totalCount > 0 && (
            <Progress value={(completedCount / totalCount) * 100} className="mt-2 h-1" />
          )}
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Overdue</p>
            {overdueCount > 0 && <PulseIndicator color="red" />}
          </div>
          <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-red-400" : "text-slate-100"}`}>
            {overdueCount}
          </p>
        </GlassCard>
      </motion.div>

      {/* Filter */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(PA_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={String(v)}>
                {k.replace(/([A-Z])/g, " $1").trim()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">
          {filtered.length} action{filtered.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {/* PA cards */}
      {isLoading ? (
        <SkeletonCards count={6} />
      ) : filtered.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <p className="text-slate-500 text-sm">No preventive actions match your filter.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pa) => {
            const overdue = pa.cr4c3_status !== PA_STATUS.Completed && isOverdue(pa.cr4c3_duedate);
            return (
              <motion.div key={pa.cr4c3_preventiveactionid} variants={itemVariants}>
                <GlassCard
                  className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${overdue ? "border-red-500/30" : ""}`}
                  onClick={() => navigate(`/preventive-actions/${pa.cr4c3_preventiveactionid}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <StatusBadge status={pa.cr4c3_status} type="pa" />
                    {overdue && <PulseIndicator color="red" />}
                  </div>
                  <p className="font-semibold text-slate-100 text-sm truncate">{pa.cr4c3_title}</p>
                  {pa.cr4c3_description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{pa.cr4c3_description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <TicketRef value={getIncidentTicket(pa._cr4c3_incident_value)} className="text-xs" />
                    <span className={`text-xs ${overdue ? "text-red-400" : "text-slate-400"}`}>
                      Due {formatDate(pa.cr4c3_duedate)}
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
