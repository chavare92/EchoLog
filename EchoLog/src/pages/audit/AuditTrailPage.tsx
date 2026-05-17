import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { GitBranch, Search, AlertTriangle } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { computeAuditChecksum } from "@/lib/roleUtils";
import type { Cr4c3_auditlogsBase } from "@/generated/models/Cr4c3_auditlogsModel";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { SkeletonTable } from "@/components/shared/Skeletons";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ACTION_MAP: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Created", color: "text-blue-700", bg: "bg-blue-100" },
  1: { label: "Approved", color: "text-green-700", bg: "bg-green-100" },
  2: { label: "Rejected", color: "text-red-700", bg: "bg-red-100" },
  3: { label: "Updated", color: "text-amber-700", bg: "bg-amber-100" },
  4: { label: "Submitted", color: "text-purple-700", bg: "bg-purple-100" },
  5: { label: "Closed", color: "text-gray-700", bg: "bg-gray-100" },
  6: { label: "Assigned", color: "text-indigo-700", bg: "bg-indigo-100" },
};

const getAction = (code?: number) => ACTION_MAP[code ?? -1] ?? { label: "Action", color: "text-gray-600", bg: "bg-gray-100" };

const NODE_COLORS: string[] = [
  "bg-blue-500", "bg-green-500", "bg-amber-500", "bg-red-500",
  "bg-purple-500", "bg-gray-400", "bg-indigo-500",
];

function getNodeColor(action?: number): string {
  return NODE_COLORS[action ?? 0] ?? "bg-gray-400";
}

function groupByDate(logs: Cr4c3_auditlogsBase[]) {
  const groups = new Map<string, Cr4c3_auditlogsBase[]>();
  for (const log of logs) {
    const dateLabel = log.cr4c3_timestamp
      ? new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(new Date(log.cr4c3_timestamp))
      : "Unknown date";
    if (!groups.has(dateLabel)) groups.set(dateLabel, []);
    groups.get(dateLabel)!.push(log);
  }
  return [...groups.entries()];
}

export function AuditTrailPage() {
  const { data: allLogs, isLoading } = useAuditLogs();
  const { data: userProfiles } = useUserProfiles();

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  // Map of auditlogid → true if integrity check failed
  const [integrityWarnings, setIntegrityWarnings] = useState<Record<string, boolean>>({});

  const getUserName = (id?: string) => userProfiles?.find((u) => u.cr4c3_userprofileid === id)?.cr4c3_fullname ?? "System";

  // PRD §7.1: verify checksums for logs that have a stored checksum
  useEffect(() => {
    if (!allLogs) return;
    const logsWithChecksum = allLogs.filter((l) => (l as Record<string, unknown>)["cr4c3_checksum"]);
    if (logsWithChecksum.length === 0) return;

    (async () => {
      const warnings: Record<string, boolean> = {};
      await Promise.all(logsWithChecksum.map(async (log) => {
        const storedChecksum = (log as Record<string, unknown>)["cr4c3_checksum"] as string;
        const computed = await computeAuditChecksum({
          entityId: log.cr4c3_entityid ?? "",
          action: String(log.cr4c3_action ?? log.cr4c3_description ?? ""),
          actor: log._cr4c3_actor_value ?? "",
          timestamp: log.cr4c3_timestamp ?? "",
          oldValue: log.cr4c3_oldvalue ?? "",
          newValue: log.cr4c3_newvalue ?? "",
        });
        if (computed !== storedChecksum) {
          warnings[log.cr4c3_auditlogid as string] = true;
        }
      }));
      setIntegrityWarnings(warnings);
    })();
  }, [allLogs]);

  const entityTypes = useMemo(() => {
    const types = new Set((allLogs ?? []).map((l) => l.cr4c3_entitytype).filter(Boolean) as string[]);
    return [...types];
  }, [allLogs]);

  const filtered = useMemo(() => {
    return (allLogs ?? []).filter((log) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        log.cr4c3_description?.toLowerCase().includes(q) ||
        log.cr4c3_entitytype?.toLowerCase().includes(q) ||
        log.cr4c3_fieldchanged?.toLowerCase().includes(q);
      const matchEntity = entityFilter === "all" || log.cr4c3_entitytype === entityFilter;
      const matchAction = actionFilter === "all" || log.cr4c3_action === Number(actionFilter);
      return matchSearch && matchEntity && matchAction;
    });
  }, [allLogs, search, entityFilter, actionFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <PageWrapper>
      {/* Hero header */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-primary/10 via-background to-transparent border border-primary/10 p-8"
      >
        {/* Decorative blur orb */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden="true" />
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          aria-hidden="true"
        />
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <GitBranch className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Trail</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Complete activity log of all system events.{" "}
              {!isLoading && (
                <span className="font-semibold text-gray-700 dark:text-gray-300">{allLogs?.length ?? 0}</span>
              )}{" "}
              {!isLoading && "events recorded."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <Input
                placeholder="Search events…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search audit log"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-44" aria-label="Filter by entity type">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map((et) => (
                  <SelectItem key={et} value={et}>{et}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36" aria-label="Filter by action type">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_MAP).map(([val, { label }]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlassCard>
      </motion.div>

      {/* Timeline */}
      {isLoading ? (
        <GlassCard><div className="p-4"><SkeletonTable rows={8} columns={4} /></div></GlassCard>
      ) : filtered.length === 0 ? (
        <motion.div variants={itemVariants}>
          <GlassCard className="py-16 text-center">
            <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-gray-500 font-medium">No events found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter criteria.</p>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-8">
          {grouped.map(([dateLabel, logs]) => (
            <div key={dateLabel}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4" aria-label={`Events on ${dateLabel}`}>
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{dateLabel}</h3>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700" aria-hidden="true" />
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">{logs.length}</span>
              </div>

              {/* Events */}
              <div className="relative pl-8 space-y-3" role="list" aria-label={`Events for ${dateLabel}`}>
                <div className="absolute left-1 top-0 bottom-0 border-l-2 border-gray-100 border-dashed" aria-hidden="true" />
                {logs.map((log) => {
                  const action = getAction(log.cr4c3_action);
                  const nodeColor = getNodeColor(log.cr4c3_action);
                  const actorName = getUserName(log._cr4c3_actor_value);
                  return (
                    <div key={log.cr4c3_auditlogid as string} className="relative" role="listitem">
                      {/* Node */}
                      <div className={`absolute -left-[26px] top-3 w-3 h-3 rounded-full ${nodeColor} border-2 border-white shadow-sm`} aria-hidden="true" />
                      <GlassCard className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${action.bg} ${action.color}`}>
                              {action.label}
                            </span>
                            {log.cr4c3_entitytype && (
                              <Badge variant="outline" className="text-xs font-normal">
                                {log.cr4c3_entitytype}
                              </Badge>
                            )}
                            {integrityWarnings[log.cr4c3_auditlogid as string] && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border border-red-200"
                                title="Checksum mismatch — this log entry may have been tampered with">
                                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                Integrity Warning
                              </span>
                            )}
                          </div>
                          <time className="text-xs text-gray-400 font-mono">
                            {log.cr4c3_timestamp
                              ? new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(log.cr4c3_timestamp))
                              : "—"}
                          </time>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mt-2">{log.cr4c3_description}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{actorName}</span>
                            {log.cr4c3_actorrole && <span className="ml-1 text-gray-400 dark:text-gray-500">· {log.cr4c3_actorrole}</span>}
                          </span>
                        </div>
                        {/* Field change pills */}
                        {log.cr4c3_fieldchanged && (
                          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-gray-400 font-medium">{log.cr4c3_fieldchanged}:</span>
                            <code className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 line-through">{log.cr4c3_oldvalue ?? "—"}</code>
                            <span className="text-gray-400">→</span>
                            <code className="px-2 py-0.5 rounded-full bg-green-50 text-green-700">{log.cr4c3_newvalue ?? "—"}</code>
                          </div>
                        )}
                      </GlassCard>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </PageWrapper>
  );
}
