import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  FilePlus,
  Gavel,
  ShieldCheck,
  GitBranch,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncidents } from "@/hooks/useIncidents";
import { usePreventiveActions } from "@/hooks/usePreventiveActions";
import { useRCASubmissions } from "@/hooks/useRCASubmissions";
import { useDepartments } from "@/hooks/useDepartments";
import { INCIDENT_STATUS, PA_STATUS, SEVERITY } from "@/lib/constants";
import { isOverdue } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonCards, SkeletonTable } from "@/components/shared/Skeletons";
import { CircularProgress } from "@/components/shared/CircularProgress";
import { HorizontalBarList } from "@/components/shared/HorizontalBarList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function getGreeting(fullName: string): string {
  const h = new Date().getHours();
  const sal = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${sal}, ${fullName.split(" ")[0]}`;
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  pulse?: boolean;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  onClick?: () => void;
}

function MetricCard({ label, value, icon: Icon, color, bgColor, pulse, trend, trendLabel, onClick }: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <motion.div variants={itemVariants}>
      <GlassCard
        className={`p-5 transition-shadow ${onClick ? "cursor-pointer hover:shadow-md" : ""}`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        aria-label={`${label}: ${value}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 min-h-[18px]">
          {pulse ? (
            <>
              <PulseIndicator color="red" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Requires attention</span>
            </>
          ) : trend && trendLabel ? (
            <span className={`inline-flex items-center gap-1 text-xs ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400"}`}>
              <TrendIcon className="w-3 h-3" aria-hidden="true" />
              {trendLabel}
            </span>
          ) : null}
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface IncidentRowProps {
  ticketRef?: string;
  title?: string;
  deptName?: string;
  severity?: number;
  status?: number;
  dueDate?: string;
  onClick: () => void;
}

function IncidentRow({ ticketRef, title, deptName, severity, status, dueDate, onClick }: IncidentRowProps) {
  return (
    <button
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-800"
      onClick={onClick}
      aria-label={`View incident ${ticketRef ?? title}`}
    >
      <TicketRef value={ticketRef} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-100 truncate font-medium">{title}</p>
        {deptName && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{deptName}</p>}
      </div>
      <SeverityBadge severity={severity} />
      <StatusBadge status={status} />
      <TATCountdown dueDate={dueDate} />
    </button>
  );
}

export function DashboardPage() {
  const user = useAtomValue(currentUserAtom);
  const navigate = useNavigate();

  const { data: allIncidents, isLoading: loadingIncidents } = useIncidents();
  const { data: allPAs, isLoading: loadingPAs } = usePreventiveActions();
  const { data: allRCAs } = useRCASubmissions();
  const { data: departments } = useDepartments();

  const activeIncidents = (allIncidents ?? []).filter(
    (i) => i.cr4c3_status !== INCIDENT_STATUS.PAClosed
  );
  const activeCount = activeIncidents.length;
  const criticalCount = activeIncidents.filter((i) => i.cr4c3_severity === SEVERITY.Critical).length;
  const overdueCount = activeIncidents.filter((i) => isOverdue(i.cr4c3_duedate)).length;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const resolvedThisWeek = (allIncidents ?? []).filter(
    (i) => i.cr4c3_status === INCIDENT_STATUS.PAClosed && new Date(i.cr4c3_updatedat ?? "") > weekAgo
  ).length;
  const resolvedLastWeek = (allIncidents ?? []).filter(
    (i) =>
      i.cr4c3_status === INCIDENT_STATUS.PAClosed &&
      new Date(i.cr4c3_updatedat ?? "") > prevWeekStart &&
      new Date(i.cr4c3_updatedat ?? "") <= weekAgo
  ).length;
  const resolvedTrend: "up" | "down" | "flat" =
    resolvedThisWeek > resolvedLastWeek ? "up" : resolvedThisWeek < resolvedLastWeek ? "down" : "flat";

  const pendingRCACount = (allRCAs ?? []).filter(
    (r) =>
      r.cr4c3_status === 564060001 ||
      r.cr4c3_status === 564060002 ||
      r.cr4c3_status === 564060005 ||
      r.cr4c3_status === 564060006
  ).length;

  const needsAttention = activeIncidents.filter(
    (i) => i.cr4c3_severity === SEVERITY.Critical || isOverdue(i.cr4c3_duedate)
  );

  const recentIncidents = [...(allIncidents ?? [])]
    .sort((a, b) => new Date(b.cr4c3_createdat ?? "").getTime() - new Date(a.cr4c3_createdat ?? "").getTime())
    .slice(0, 5);

  const totalPAs = (allPAs ?? []).length;
  const completedPAs = (allPAs ?? []).filter((pa) => pa.cr4c3_status === PA_STATUS.Completed).length;
  const paProgressPct = totalPAs > 0 ? Math.round((completedPAs / totalPAs) * 100) : 0;

  const deptCounts = new Map<string, number>();
  activeIncidents.forEach((inc) => {
    const deptId = inc._cr4c3_department_value;
    if (deptId) deptCounts.set(deptId, (deptCounts.get(deptId) ?? 0) + 1);
  });
  const deptBarItems = [...deptCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([deptId, count]) => ({
      label: departments?.find((d) => d.cr4c3_departmentid === deptId)?.cr4c3_name ?? "Unknown",
      count,
    }));

  const getDeptName = (deptId?: string) =>
    departments?.find((d) => d.cr4c3_departmentid === deptId)?.cr4c3_name;

  return (
    <PageWrapper>
      <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {getGreeting(user?.cr4c3_fullname ?? "there")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loadingIncidents ? "Loading…" : (
              <>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{activeCount}</span>{" "}
                active incident{activeCount !== 1 ? "s" : ""} need attention
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate("/review-queue")}>
            <Gavel className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Review Queue
            {pendingRCACount > 0 && (
              <Badge className="ml-2 px-1.5 py-0 text-xs bg-amber-500 hover:bg-amber-500 text-white border-0">
                {pendingRCACount}
              </Badge>
            )}
          </Button>
          <Button size="sm" onClick={() => navigate("/log-incident")}>
            <FilePlus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Log Incident
          </Button>
        </div>
      </motion.div>

      {/* Metrics */}
      {loadingIncidents || loadingPAs ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active Incidents" value={activeCount} icon={AlertCircle} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50 dark:bg-blue-950" onClick={() => navigate("/incidents")} />
          <MetricCard label="Critical" value={criticalCount} icon={AlertTriangle} color="text-red-600 dark:text-red-400" bgColor="bg-red-50 dark:bg-red-950" pulse={criticalCount > 0} onClick={() => navigate("/incidents")} />
          <MetricCard label="Overdue" value={overdueCount} icon={Clock} color="text-amber-600 dark:text-amber-400" bgColor="bg-amber-50 dark:bg-amber-950" pulse={overdueCount > 0} />
          <MetricCard
            label="Resolved This Week"
            value={resolvedThisWeek}
            icon={CheckCircle}
            color="text-green-600 dark:text-green-400"
            bgColor="bg-green-50 dark:bg-green-950"
            trend={resolvedTrend}
            trendLabel={
              resolvedTrend === "flat"
                ? "Same as last week"
                : resolvedTrend === "up"
                ? `+${resolvedThisWeek - resolvedLastWeek} vs last week`
                : `${resolvedThisWeek - resolvedLastWeek} vs last week`
            }
          />
        </div>
      )}

      {/* Main 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Needs Attention */}
          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Needs Attention</h3>
                {needsAttention.length > 0 && (
                  <span className="ml-auto text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
                    {needsAttention.length}
                  </span>
                )}
              </div>
              {loadingIncidents ? (
                <div className="p-4"><SkeletonTable rows={3} columns={5} /></div>
              ) : needsAttention.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-green-400" aria-hidden="true" />
                  All clear — no critical or overdue incidents.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800" role="list" aria-label="Incidents needing attention">
                  {needsAttention.map((inc) => (
                    <div key={inc.cr4c3_incidentid} role="listitem">
                      <IncidentRow
                        ticketRef={inc.cr4c3_ticketreference}
                        title={inc.cr4c3_title}
                        deptName={getDeptName(inc._cr4c3_department_value)}
                        severity={inc.cr4c3_severity}
                        status={inc.cr4c3_status}
                        dueDate={inc.cr4c3_duedate}
                        onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Recent Incidents */}
          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Incidents</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/incidents")}>
                  View all <ArrowRight className="w-3 h-3 ml-1" aria-hidden="true" />
                </Button>
              </div>
              {loadingIncidents ? (
                <div className="p-4"><SkeletonTable rows={5} columns={5} /></div>
              ) : recentIncidents.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No incidents yet.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800" role="list" aria-label="Recent incidents">
                  {recentIncidents.map((inc) => (
                    <div key={inc.cr4c3_incidentid} role="listitem">
                      <IncidentRow
                        ticketRef={inc.cr4c3_ticketreference}
                        title={inc.cr4c3_title}
                        deptName={getDeptName(inc._cr4c3_department_value)}
                        severity={inc.cr4c3_severity}
                        status={inc.cr4c3_status}
                        dueDate={inc.cr4c3_duedate}
                        onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* PA Progress */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Preventive Actions</h3>
              </div>
              {loadingPAs ? (
                <div className="flex justify-center py-4">
                  <div className="w-24 h-24 rounded-full border-4 border-gray-100 animate-pulse" aria-hidden="true" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <CircularProgress value={paProgressPct} size={96} strokeWidth={8}>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">{paProgressPct}%</p>
                  </CircularProgress>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{completedPAs}</span>
                    <span className="text-gray-400 dark:text-gray-500"> / </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{totalPAs}</span>
                    {" "}completed
                  </p>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* By Department */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">By Department</h3>
              {loadingIncidents ? (
                <div className="space-y-3" aria-busy="true">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${40 + i * 10}%` }} />
                      <div className="h-2 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : deptBarItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No active incidents.</p>
              ) : (
                <HorizontalBarList items={deptBarItems} />
              )}
            </GlassCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
              <nav className="space-y-1" aria-label="Quick actions">
                {[
                  { label: "Log Incident", icon: FilePlus, href: "/log-incident" },
                  { label: "Review RCAs", icon: Gavel, href: "/review-queue" },
                  { label: "Preventive Actions", icon: ShieldCheck, href: "/preventive-actions" },
                  { label: "Audit Trail", icon: GitBranch, href: "/audit-trail" },
                ].map(({ label, icon: Icon, href }) => (
                  <button
                    key={href}
                    onClick={() => navigate(href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-primary transition-colors flex-shrink-0" aria-hidden="true" />
                    {label}
                    <ArrowRight className="w-3 h-3 ml-auto text-gray-300 group-hover:text-primary transition-colors" aria-hidden="true" />
                  </button>
                ))}
              </nav>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}
