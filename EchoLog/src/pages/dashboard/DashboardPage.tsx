import { useState, useMemo } from "react";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle, AlertTriangle, CheckCircle, Clock, FilePlus, Gavel,
  ShieldCheck, GitBranch, ArrowRight, TrendingUp, TrendingDown, Minus,
  Building2, Users, Layers, ChevronDown, ChevronUp,
} from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncidents } from "@/hooks/useIncidents";
import { usePreventiveActions } from "@/hooks/usePreventiveActions";
import { useRCASubmissions } from "@/hooks/useRCASubmissions";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubdepartments } from "@/hooks/useSubdepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { useTeams } from "@/hooks/useTeams";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { INCIDENT_STATUS, PA_STATUS, RCA_STATUS, SEVERITY } from "@/lib/constants";
import { isOverdue, calcSLAOverdue, formatRelativeDate } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonTable, SkeletonMetricRow } from "@/components/shared/Skeletons";
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
  label: string; value: number; icon: React.ElementType;
  color: string; bgGradient: string; pulse?: boolean;
  trend?: "up" | "down" | "flat"; trendLabel?: string; onClick?: () => void;
}
function MetricCard({ label, value, icon: Icon, color, bgGradient, pulse, trend, trendLabel, onClick }: MetricCardProps) {
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
            <p className="text-xs font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-wider mb-1.5">{label}</p>
            <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${bgGradient} shadow-sm`}>
            <Icon className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 min-h-[18px]">
          {pulse ? (
            <><PulseIndicator color="red" /><span className="text-xs text-[hsl(var(--foreground-muted))]">Requires attention</span></>
          ) : trend && trendLabel ? (
            <span className={`inline-flex items-center gap-1 text-xs ${trend === "up" ? "text-green-600 dark:text-green-400" : trend === "down" ? "text-red-500" : "text-[hsl(var(--foreground-muted))]"}`}>
              <TrendIcon className="w-3 h-3" />{trendLabel}
            </span>
          ) : null}
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface IncidentCardProps {
  ticketRef?: string; title?: string; status?: number; severity?: number;
  process?: string; department?: string; subdepartment?: string; team?: string;
  dueDate?: string; createdAt?: string; isOverdueFlag?: boolean; onClick: () => void;
}
function IncidentCard({ ticketRef, title, status, severity, process, department, subdepartment, team, dueDate, createdAt, isOverdueFlag, onClick }: IncidentCardProps) {
  return (
    <button className="w-full text-left group" onClick={onClick} aria-label={`View incident ${ticketRef ?? title}`}>
      <div className="px-4 py-3.5 hover:bg-[hsl(var(--sidebar-hover-bg))] transition-colors focus:outline-none">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <TicketRef value={ticketRef} />
              <SeverityBadge severity={severity} />
              <StatusBadge status={status} />
              {isOverdueFlag && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-full px-1.5 py-0.5">
                  <PulseIndicator color="red" />Overdue
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{title ?? "Untitled"}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
              {department && <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--foreground-muted))]"><Building2 className="w-2.5 h-2.5" />{department}</span>}
              {subdepartment && <><span className="text-[10px] text-[hsl(var(--foreground-muted)/0.5)]">›</span><span className="text-[10px] text-[hsl(var(--foreground-muted))]">{subdepartment}</span></>}
              {process && <><span className="text-[10px] text-[hsl(var(--foreground-muted)/0.5)]">›</span><span className="flex items-center gap-1 text-[10px] text-[hsl(var(--foreground-muted))]"><Layers className="w-2.5 h-2.5" />{process}</span></>}
              {team && <><span className="text-[10px] text-[hsl(var(--foreground-muted)/0.5)]">›</span><span className="flex items-center gap-1 text-[10px] text-[hsl(var(--foreground-muted))]"><Users className="w-2.5 h-2.5" />{team}</span></>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <TATCountdown dueDate={dueDate} />
            {createdAt && <span className="text-[10px] text-[hsl(var(--foreground-muted))]">{formatRelativeDate(createdAt)}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

const PAGE_SIZE = 10;

export function DashboardPage() {
  const user = useAtomValue(currentUserAtom);
  const navigate = useNavigate();
  const { canReview, isAdmin } = useRoleGuard();
  const [recentPage, setRecentPage] = useState(1);
  const [attentionExpanded, setAttentionExpanded] = useState(true);

  const { data: allIncidents, isLoading: loadingIncidents } = useIncidents();
  const { data: allPAs, isLoading: loadingPAs } = usePreventiveActions();
  const { data: allRCAs } = useRCASubmissions();
  const { data: departments } = useDepartments();
  const { data: subdepts } = useSubdepartments(undefined, true);
  const { data: processes } = useProcesses(undefined, true);
  const { data: teams } = useTeams(undefined, true);

  const deptMap = useMemo(() => new Map((departments ?? []).map((d) => [d.cr4c3_departmentid, d.cr4c3_name])), [departments]);
  const subdeptMap = useMemo(() => new Map((subdepts ?? []).map((s) => [s.cr4c3_subdepartmentid, s.cr4c3_name])), [subdepts]);
  const processMap = useMemo(() => new Map((processes ?? []).map((p) => [p.cr4c3_processid, p.cr4c3_name])), [processes]);
  const teamMap = useMemo(() => new Map((teams ?? []).map((t) => [t.cr4c3_teamid, t.cr4c3_name])), [teams]);

  const activeIncidents = useMemo(
    () => (allIncidents ?? []).filter((i) => i.cr4c3_status !== INCIDENT_STATUS.PAClosed && i.cr4c3_status !== INCIDENT_STATUS.Cancelled),
    [allIncidents]
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
    (i) => i.cr4c3_status === INCIDENT_STATUS.PAClosed && new Date(i.cr4c3_updatedat ?? "") > prevWeekStart && new Date(i.cr4c3_updatedat ?? "") <= weekAgo
  ).length;
  const resolvedTrend: "up" | "down" | "flat" = resolvedThisWeek > resolvedLastWeek ? "up" : resolvedThisWeek < resolvedLastWeek ? "down" : "flat";

  const pendingRCACount = (allRCAs ?? []).filter(
    (r) => r.cr4c3_status === RCA_STATUS.Submitted || r.cr4c3_status === RCA_STATUS.UnderReview ||
           r.cr4c3_status === RCA_STATUS.PendingL1Review || r.cr4c3_status === RCA_STATUS.PendingL2Review
  ).length;

  const needsAttention = useMemo(
    () => activeIncidents.filter((i) => i.cr4c3_severity === SEVERITY.Critical || isOverdue(i.cr4c3_duedate)),
    [activeIncidents]
  );

  const recentSorted = useMemo(
    () => [...(allIncidents ?? [])].sort((a, b) => new Date(b.cr4c3_createdat ?? "").getTime() - new Date(a.cr4c3_createdat ?? "").getTime()),
    [allIncidents]
  );
  const totalRecentPages = Math.ceil(recentSorted.length / PAGE_SIZE);
  const recentPageItems = recentSorted.slice((recentPage - 1) * PAGE_SIZE, recentPage * PAGE_SIZE);

  const totalPAs = (allPAs ?? []).length;
  const completedPAs = (allPAs ?? []).filter((pa) => pa.cr4c3_status === PA_STATUS.Completed).length;
  const paProgressPct = totalPAs > 0 ? Math.round((completedPAs / totalPAs) * 100) : 0;

  const deptBarItems = useMemo(() => {
    const counts = new Map<string, number>();
    (allIncidents ?? []).forEach((inc) => {
      const id = inc._cr4c3_department_value;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return [...counts.entries()].sort(([, a], [, b]) => b - a).map(([id, count]) => ({
      label: deptMap.get(id) ?? "Unknown", count,
    }));
  }, [allIncidents, deptMap]);

  type OrgKeys = "_cr4c3_department_value" | "_cr4c3_subdepartment_value" | "_cr4c3_process_value" | "_cr4c3_team_value";
  const getOrgInfo = (inc: Partial<Record<OrgKeys, string>>) => ({
    department: deptMap.get(inc._cr4c3_department_value ?? ""),
    subdepartment: subdeptMap.get(inc._cr4c3_subdepartment_value ?? ""),
    process: processMap.get(inc._cr4c3_process_value ?? ""),
    team: teamMap.get(inc._cr4c3_team_value ?? ""),
  });

  const showReviewQueue = canReview || isAdmin;

  return (
    <PageWrapper>
      <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight">{getGreeting(user?.cr4c3_fullname ?? "there")}</h2>
          <p className="text-sm text-[hsl(var(--foreground-muted))] mt-0.5">
            {loadingIncidents ? "Loading…" : (
              <><span className="font-semibold text-[hsl(var(--foreground))]">{activeCount}</span>{" "}active incident{activeCount !== 1 ? "s" : ""} in progress</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {showReviewQueue && (
            <Button variant="outline" size="sm" onClick={() => navigate("/review-queue")}>
              <Gavel className="w-4 h-4 mr-1.5" />Review Queue
              {pendingRCACount > 0 && <Badge className="ml-2 px-1.5 py-0 text-xs bg-amber-500 hover:bg-amber-500 text-white border-0">{pendingRCACount}</Badge>}
            </Button>
          )}
          <Button size="sm" onClick={() => navigate("/log-incident")}><FilePlus className="w-4 h-4 mr-1.5" />Log Incident</Button>
        </div>
      </motion.div>

      {/* Metrics */}
      {loadingIncidents || loadingPAs ? <SkeletonMetricRow /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active Incidents" value={activeCount} icon={AlertCircle} color="text-blue-600 dark:text-blue-400" bgGradient="bg-gradient-to-br from-blue-500 to-blue-600" onClick={() => navigate("/incidents")} />
          <MetricCard label="Critical" value={criticalCount} icon={AlertTriangle} color="text-red-600 dark:text-red-400" bgGradient="bg-gradient-to-br from-red-500 to-red-600" pulse={criticalCount > 0} onClick={() => navigate("/incidents")} />
          <MetricCard label="Overdue" value={overdueCount} icon={Clock} color="text-amber-600 dark:text-amber-400" bgGradient="bg-gradient-to-br from-amber-400 to-amber-600" pulse={overdueCount > 0} />
          <MetricCard label="Resolved This Week" value={resolvedThisWeek} icon={CheckCircle} color="text-green-600 dark:text-green-400" bgGradient="bg-gradient-to-br from-green-500 to-emerald-600"
            trend={resolvedTrend}
            trendLabel={resolvedTrend === "flat" ? "Same as last week" : resolvedTrend === "up" ? `+${resolvedThisWeek - resolvedLastWeek} vs last week` : `${resolvedThisWeek - resolvedLastWeek} vs last week`}
          />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Needs Attention */}
          <motion.div variants={itemVariants}>
            <GlassCard>
              <button
                className="w-full flex items-center gap-2 px-5 py-4 border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--sidebar-hover-bg))] transition-colors text-left rounded-t-xl focus:outline-none"
                onClick={() => setAttentionExpanded((v) => !v)} aria-expanded={attentionExpanded}
              >
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] flex-1">Needs Attention</h3>
                {needsAttention.length > 0 && (
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-full px-2 py-0.5">{needsAttention.length}</span>
                )}
                {attentionExpanded ? <ChevronUp className="w-4 h-4 text-[hsl(var(--foreground-muted))] ml-1" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--foreground-muted))] ml-1" />}
              </button>
              {attentionExpanded && (
                loadingIncidents ? <div className="p-4"><SkeletonTable rows={3} columns={5} /></div> :
                needsAttention.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-green-400" />All clear — no critical or overdue incidents.
                  </div>
                ) : (
                  <div className="divide-y divide-[hsl(var(--border)/0.6)]" role="list">
                    {needsAttention.map((inc) => {
                      const org = getOrgInfo(inc);
                      return (
                        <div key={inc.cr4c3_incidentid} role="listitem">
                          <IncidentCard
                            ticketRef={inc.cr4c3_ticketreference} title={inc.cr4c3_title}
                            status={inc.cr4c3_status} severity={inc.cr4c3_severity}
                            department={org.department} subdepartment={org.subdepartment}
                            process={org.process} team={org.team}
                            dueDate={inc.cr4c3_duedate} createdAt={inc.cr4c3_createdat}
                            isOverdueFlag={calcSLAOverdue(inc)}
                            onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </GlassCard>
          </motion.div>

          {/* Recent Incidents */}
          <motion.div variants={itemVariants}>
            <GlassCard>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Recent Incidents</h3>
                  {!loadingIncidents && <span className="text-xs text-[hsl(var(--foreground-muted))] bg-[hsl(var(--border)/0.5)] rounded-full px-2 py-0.5">{recentSorted.length}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/incidents")}>View all <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
              {loadingIncidents ? <div className="p-4"><SkeletonTable rows={5} columns={5} /></div> :
               recentPageItems.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-gray-300" />
                  No incidents yet.
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[hsl(var(--border)/0.6)]" role="list">
                    {recentPageItems.map((inc) => {
                      const org = getOrgInfo(inc);
                      return (
                        <div key={inc.cr4c3_incidentid} role="listitem">
                          <IncidentCard
                            ticketRef={inc.cr4c3_ticketreference} title={inc.cr4c3_title}
                            status={inc.cr4c3_status} severity={inc.cr4c3_severity}
                            department={org.department} subdepartment={org.subdepartment}
                            process={org.process} team={org.team}
                            dueDate={inc.cr4c3_duedate} createdAt={inc.cr4c3_createdat}
                            isOverdueFlag={calcSLAOverdue(inc)}
                            onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {totalRecentPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-[hsl(var(--border))]">
                      <span className="text-xs text-[hsl(var(--foreground-muted))]">Page {recentPage} of {totalRecentPages}</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={recentPage <= 1} onClick={() => setRecentPage((p) => p - 1)}>Prev</Button>
                        <Button variant="outline" size="sm" disabled={recentPage >= totalRecentPages} onClick={() => setRecentPage((p) => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Preventive Actions</h3>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("/preventive-actions")}>View <ArrowRight className="w-3 h-3 ml-1" /></Button>
              </div>
              {loadingPAs ? <div className="flex justify-center py-4"><div className="w-24 h-24 rounded-full border-4 border-gray-100 animate-pulse" /></div> : (
                <div className="flex flex-col items-center gap-3">
                  <CircularProgress value={paProgressPct} size={96} strokeWidth={8}>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">{paProgressPct}%</p>
                  </CircularProgress>
                  <p className="text-sm text-[hsl(var(--foreground-muted))]">
                    <span className="font-semibold text-[hsl(var(--foreground))]">{completedPAs}</span>
                    <span className="text-[hsl(var(--foreground-muted))]"> / </span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">{totalPAs}</span> completed
                  </p>
                  <div className="w-full grid grid-cols-3 gap-2 mt-1">
                    {[
                      { label: "To Do", count: (allPAs ?? []).filter((p) => p.cr4c3_status === 564060000).length, color: "text-[hsl(var(--foreground-muted))]" },
                      { label: "In Progress", count: (allPAs ?? []).filter((p) => p.cr4c3_status === 564060001).length, color: "text-blue-600 dark:text-blue-400" },
                      { label: "Done", count: completedPAs, color: "text-green-600 dark:text-green-400" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="text-center bg-[hsl(var(--background))] rounded-lg py-2">
                        <p className={`text-base font-bold ${color}`}>{count}</p>
                        <p className="text-[10px] text-[hsl(var(--foreground-muted))] mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">By Department</h3>
              {loadingIncidents ? (
                <div className="space-y-3" aria-busy="true">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${40+i*10}%` }} />
                      <div className="h-2 bg-gray-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : deptBarItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No incidents recorded.</p>
              ) : <HorizontalBarList items={deptBarItems} />}
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Quick Actions</h3>
              <nav className="space-y-1">
                {[
                  { label: "Log Incident", icon: FilePlus, href: "/log-incident" },
                  ...(showReviewQueue ? [{ label: "Review RCAs", icon: Gavel, href: "/review-queue" }] : []),
                  { label: "Preventive Actions", icon: ShieldCheck, href: "/preventive-actions" },
                  { label: "Audit Trail", icon: GitBranch, href: "/audit-trail" },
                ].map(({ label, icon: Icon, href }) => (
                  <button key={href} onClick={() => navigate(href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-amber-600 dark:hover:text-amber-400 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40">
                    <Icon className="w-4 h-4 text-[hsl(var(--foreground-muted))] group-hover:text-amber-500 transition-colors flex-shrink-0" />
                    {label}
                    <ArrowRight className="w-3 h-3 ml-auto text-[hsl(var(--foreground-muted)/0.4)] group-hover:text-amber-500 transition-colors" />
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
