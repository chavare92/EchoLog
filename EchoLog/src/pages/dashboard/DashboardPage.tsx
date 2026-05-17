import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ClipboardCheck,
  ShieldAlert,
  CheckCircle,
  FilePlus,
  ArrowRight,
} from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncidents } from "@/hooks/useIncidents";
import { usePreventiveActions } from "@/hooks/usePreventiveActions";
import { INCIDENT_STATUS, PA_STATUS } from "@/lib/constants";
import { isOverdue, formatDateTime } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonCards, SkeletonTable } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  pulse?: boolean;
}

function MetricCard({ label, value, icon: Icon, color, pulse }: MetricCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-lg bg-gray-100 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {pulse && (
          <div className="mt-3 flex items-center gap-1.5">
            <PulseIndicator color="red" />
            <span className="text-xs text-gray-500">Requires attention</span>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

export function DashboardPage() {
  const user = useAtomValue(currentUserAtom);
  const navigate = useNavigate();

  const { data: allIncidents, isLoading: loadingIncidents } = useIncidents();
  const { data: myIncidents, isLoading: loadingMine } = useIncidents({
    loggedBy: user?.cr4c3_userprofileid,
  });
  const { data: allPAs, isLoading: loadingPAs } = usePreventiveActions();

  const openCount = allIncidents?.filter((i) => i.cr4c3_status === INCIDENT_STATUS.Open).length ?? 0;
  const pendingReviewCount = allIncidents?.filter(
    (i) =>
      i.cr4c3_status === INCIDENT_STATUS.RCASubmitted ||
      i.cr4c3_status === INCIDENT_STATUS.RCAInReview
  ).length ?? 0;
  const overduePACount = allPAs?.filter(
    (pa) => pa.cr4c3_status !== PA_STATUS.Completed && isOverdue(pa.cr4c3_duedate)
  ).length ?? 0;
  const completedThisWeek = allIncidents?.filter((i) => {
    if (i.cr4c3_status !== INCIDENT_STATUS.PAClosed) return false;
    const updated = new Date(i.cr4c3_updatedat ?? "");
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return updated > weekAgo;
  }).length ?? 0;

  return (
    <PageWrapper
      title="Dashboard"
      actions={
        <Button onClick={() => navigate("/log-incident")} size="sm">
          <FilePlus className="w-4 h-4 mr-1" />
          Log Incident
        </Button>
      }
    >
      {/* Ambient orb */}
      <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 rounded-full bg-amber-500/3 blur-3xl" />

      {/* Metrics */}
      {loadingIncidents || loadingPAs ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Open Incidents"
            value={openCount}
            icon={AlertCircle}
            color="text-blue-600"
          />
          <MetricCard
            label="Pending Review"
            value={pendingReviewCount}
            icon={ClipboardCheck}
            color="text-amber-600"
            pulse={pendingReviewCount > 0}
          />
          <MetricCard
            label="Overdue PAs"
            value={overduePACount}
            icon={ShieldAlert}
            color="text-red-600"
            pulse={overduePACount > 0}
          />
          <MetricCard
            label="Closed This Week"
            value={completedThisWeek}
            icon={CheckCircle}
            color="text-green-600"
          />
        </div>
      )}

      {/* My Incidents */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">My Incidents</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/incidents")}>
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {loadingMine ? (
            <div className="p-4">
              <SkeletonTable rows={3} columns={5} />
            </div>
          ) : !myIncidents || myIncidents.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No incidents logged yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myIncidents.slice(0, 5).map((inc) => (
                <div
                  key={inc.cr4c3_incidentid}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                >
                  <TicketRef value={inc.cr4c3_ticketreference} />
                  <span className="flex-1 text-sm text-gray-900 truncate">{inc.cr4c3_title}</span>
                  <SeverityBadge severity={inc.cr4c3_severity} />
                  <StatusBadge status={inc.cr4c3_status} />
                  <TATCountdown dueDate={inc.cr4c3_duedate} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">All Open Incidents</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/incidents?status=open")}>
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {loadingIncidents ? (
            <div className="p-4">
              <SkeletonTable rows={5} columns={5} />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(allIncidents ?? [])
                .filter((i) => i.cr4c3_status === INCIDENT_STATUS.Open)
                .slice(0, 8)
                .map((inc) => (
                  <div
                    key={inc.cr4c3_incidentid}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                  >
                    <TicketRef value={inc.cr4c3_ticketreference} />
                    <span className="flex-1 text-sm text-gray-900 truncate">{inc.cr4c3_title}</span>
                    <SeverityBadge severity={inc.cr4c3_severity} />
                    <TATCountdown dueDate={inc.cr4c3_duedate} />
                    <span className="text-xs text-gray-400">{formatDateTime(inc.cr4c3_createdat)}</span>
                  </div>
                ))}
              {(allIncidents?.filter((i) => i.cr4c3_status === INCIDENT_STATUS.Open).length ?? 0) === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">No open incidents.</div>
              )}
            </div>
          )}
        </GlassCard>
      </motion.div>
    </PageWrapper>
  );
}
