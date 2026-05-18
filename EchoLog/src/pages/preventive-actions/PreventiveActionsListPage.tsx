import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ShieldCheck, LayoutList, LayoutGrid, ArrowRight, Download, RefreshCw, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { usePreventiveActions, useUpdatePA } from "@/hooks/usePreventiveActions";
import { useIncidents } from "@/hooks/useIncidents";
import { PA_STATUS } from "@/lib/constants";
import { isOverdue, formatDate } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonCards, SkeletonTable } from "@/components/shared/Skeletons";
import { TicketRef } from "@/components/shared/TicketRef";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ViewMode = "list" | "board";

const STATUS_COLUMNS = [
  { status: PA_STATUS.NotStarted, label: "To Do", color: "border-t-slate-400" },
  { status: PA_STATUS.InProgress, label: "In Progress", color: "border-t-blue-500" },
  { status: PA_STATUS.Completed, label: "Done", color: "border-t-green-500" },
];

export function PreventiveActionsListPage() {
  const navigate = useNavigate();
  const { data: allPAs, isLoading } = usePreventiveActions();
  const { data: incidents } = useIncidents();
  const updatePA = useUpdatePA();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [incidentFilter, setIncidentFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const getIncident = (incidentId?: string) => incidents?.find((i) => i.cr4c3_incidentid === incidentId);
  const getIncidentRef = (incidentId?: string) => getIncident(incidentId)?.cr4c3_ticketreference;

  const filtered = useMemo(() => {
    return (allPAs ?? []).filter((pa) => {
      const q = search.toLowerCase();
      const matchSearch = !search || pa.cr4c3_title?.toLowerCase().includes(q) || pa.cr4c3_description?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || pa.cr4c3_status === Number(statusFilter);
      const matchIncident = incidentFilter === "all" || pa._cr4c3_incident_value === incidentFilter;
      return matchSearch && matchStatus && matchIncident;
    });
  }, [allPAs, search, statusFilter, incidentFilter]);

  // Stats
  const stats = useMemo(() => ({
    todo: (allPAs ?? []).filter((p) => p.cr4c3_status === PA_STATUS.NotStarted).length,
    inProgress: (allPAs ?? []).filter((p) => p.cr4c3_status === PA_STATUS.InProgress).length,
    done: (allPAs ?? []).filter((p) => p.cr4c3_status === PA_STATUS.Completed).length,
    overdue: (allPAs ?? []).filter((p) => p.cr4c3_status !== PA_STATUS.Completed && isOverdue(p.cr4c3_duedate)).length,
  }), [allPAs]);

  // Grouped by incident for list view
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const pa of filtered) {
      const key = pa._cr4c3_incident_value ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(pa);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Unique incidents that have PAs
  const incidentOptions = useMemo(() => {
    const ids = [...new Set((allPAs ?? []).map((p) => p._cr4c3_incident_value).filter(Boolean))] as string[];
    return ids.map((id) => ({ id, ref: getIncidentRef(id) ?? id }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPAs, incidents]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Bulk: Mark In Progress ────────────────────────────────────────────────
  const handleBulkMarkInProgress = async () => {
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updatePA.mutateAsync({ id, fields: { cr4c3_status: PA_STATUS.InProgress } })
        )
      );
      toast.success(`${selectedIds.size} action${selectedIds.size > 1 ? "s" : ""} marked In Progress`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Some updates failed. Please retry.");
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Bulk: Export CSV ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const selectedPAs = filtered.filter((pa) => selectedIds.has(pa.cr4c3_preventiveactionid!));
    const header = ["Title", "Description", "Status", "Due Date", "Incident Reference"];
    const STATUS_LABEL: Record<number, string> = {
      [PA_STATUS.NotStarted]: "To Do",
      [PA_STATUS.InProgress]: "In Progress",
      [PA_STATUS.Completed]: "Completed",
    };
    const rows = selectedPAs.map((pa) => [
      pa.cr4c3_title ?? "",
      pa.cr4c3_description ?? "",
      STATUS_LABEL[pa.cr4c3_status ?? PA_STATUS.NotStarted] ?? "",
      pa.cr4c3_duedate ? new Date(pa.cr4c3_duedate).toLocaleDateString() : "",
      getIncidentRef(pa._cr4c3_incident_value) ?? "",
    ]);
    const csvContent = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `preventive-actions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedPAs.length} action${selectedPAs.length > 1 ? "s" : ""} to CSV`);
  };

  return (
    <PageWrapper>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Preventive Actions</h2>
            <p className="text-xs text-[hsl(var(--foreground-muted))]">{filtered.length} action{filtered.length !== 1 ? "s" : ""} shown</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors focus:outline-none ${viewMode === "list" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
            >
              <LayoutList className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`p-2 transition-colors focus:outline-none ${viewMode === "board" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}
              aria-pressed={viewMode === "board"}
              aria-label="Board view"
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats pills */}
      {!isLoading && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2" role="status" aria-label="PA statistics">
          {[
            { label: "To Do", count: stats.todo, cls: "bg-slate-100 text-slate-700 border-slate-200" },
            { label: "In Progress", count: stats.inProgress, cls: "bg-blue-50 text-blue-700 border-blue-200" },
            { label: "Done", count: stats.done, cls: "bg-green-50 text-green-700 border-green-200" },
            { label: "Overdue", count: stats.overdue, cls: "bg-red-50 text-red-700 border-red-200", pulse: stats.overdue > 0 },
          ].map(({ label, count, cls, pulse }) => (
            <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
              {pulse && <PulseIndicator color="red" />}
              {label}: {count}
            </span>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <Input
                placeholder="Search actions…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search preventive actions"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={String(PA_STATUS.NotStarted)}>To Do</SelectItem>
                <SelectItem value={String(PA_STATUS.InProgress)}>In Progress</SelectItem>
                <SelectItem value={String(PA_STATUS.Completed)}>Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={incidentFilter} onValueChange={setIncidentFilter}>
              <SelectTrigger className="w-48" aria-label="Filter by incident">
                <SelectValue placeholder="All Incidents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Incidents</SelectItem>
                {incidentOptions.map(({ id, ref }) => (
                  <SelectItem key={id} value={id}>{ref}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedIds.size > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkMarkInProgress}
                disabled={bulkLoading}
                className="gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                aria-label="Mark selected as In Progress"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Mark In Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                aria-label="Export selected to CSV"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Export CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-gray-500">
                Deselect all
              </Button>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        viewMode === "board" ? <div className="grid grid-cols-3 gap-4"><SkeletonCards count={3} /></div> : <GlassCard><div className="p-4"><SkeletonTable rows={8} columns={5} /></div></GlassCard>
      ) : viewMode === "list" ? (
        /* List view — grouped by incident */
        <motion.div variants={itemVariants} className="space-y-4">
          {grouped.length === 0 ? (
            <GlassCard className="py-16 text-center">
              <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500 font-medium">No preventive actions found</p>
            </GlassCard>
          ) : grouped.map(([incId, items]) => {
            const incRef = incId === "__none__" ? "No Incident" : getIncidentRef(incId) ?? incId;
            const incTitle = incId === "__none__" ? "" : incidents?.find((i) => i.cr4c3_incidentid === incId)?.cr4c3_title ?? "";
            const collapsed = collapsedGroups.has(incId);
            return (
              <GlassCard key={incId}>
                {/* Group header */}
                <button
                  className="w-full flex items-center gap-2 p-4 text-left hover:bg-[hsl(var(--sidebar-hover-bg))]/40 rounded-t-xl transition-colors"
                  onClick={() => toggleGroup(incId)}
                  aria-expanded={!collapsed}
                >
                  {collapsed ? <ChevronRightIcon className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm font-semibold text-primary">{incRef}</span>
                  {incTitle && <span className="text-xs text-gray-500 truncate flex-1">— {incTitle}</span>}
                  <span className="ml-auto rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-[hsl(var(--foreground-muted))]">{items.length}</span>
                </button>
                {!collapsed && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input type="checkbox"
                            checked={items.every((p) => selectedIds.has(p.cr4c3_preventiveactionid!))}
                            onChange={() => {
                              const allSelected = items.every((p) => selectedIds.has(p.cr4c3_preventiveactionid!));
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                items.forEach((p) => allSelected ? next.delete(p.cr4c3_preventiveactionid!) : next.add(p.cr4c3_preventiveactionid!));
                                return next;
                              });
                            }}
                            aria-label="Select group"
                            className="rounded border-gray-300 accent-primary"
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="w-10"><span className="sr-only">Open</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((pa) => {
                        const over = pa.cr4c3_status !== PA_STATUS.Completed && isOverdue(pa.cr4c3_duedate);
                        const selected = selectedIds.has(pa.cr4c3_preventiveactionid!);
                        return (
                          <TableRow key={pa.cr4c3_preventiveactionid}
                            className={`cursor-pointer transition-colors ${over ? "bg-red-50/60 hover:bg-red-50" : selected ? "bg-blue-50/60 hover:bg-blue-50" : "hover:bg-gray-50"}`}
                            onClick={() => navigate(`/preventive-actions/${pa.cr4c3_preventiveactionid}`)}>
                            <TableCell onClick={(e) => { e.stopPropagation(); toggleSelect(pa.cr4c3_preventiveactionid!); }}>
                              <input type="checkbox" checked={selected} onChange={() => toggleSelect(pa.cr4c3_preventiveactionid!)}
                                aria-label={`Select ${pa.cr4c3_title}`} className="rounded border-gray-300 accent-primary" onClick={(e) => e.stopPropagation()} />
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate max-w-xs">{pa.cr4c3_title}</p>
                              {pa.cr4c3_description && <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{pa.cr4c3_description}</p>}
                            </TableCell>
                            <TableCell><StatusBadge status={pa.cr4c3_status} type="pa" /></TableCell>
                            <TableCell>
                              {pa.cr4c3_duedate ? (
                                <span className={`text-xs ${over ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                                  {over && <PulseIndicator color="red" className="inline mr-1" />}
                                  {formatDate(pa.cr4c3_duedate)}
                                </span>
                              ) : <span className="text-xs text-gray-400">—</span>}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/preventive-actions/${pa.cr4c3_preventiveactionid}`)} aria-label={`Open ${pa.cr4c3_title}`}>
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </GlassCard>
            );
          })}
        </motion.div>
      ) : (
        /* Board view */
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map(({ status, label, color }) => {
            const colItems = filtered.filter((p) => p.cr4c3_status === status);
            return (
              <div key={status} className="space-y-3" role="region" aria-label={`${label} column`}>
                <div className={`rounded-xl border-t-4 bg-white/80 backdrop-blur-sm border border-gray-200 p-3 ${color}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{label}</h3>
                    <Badge variant="secondary" className="text-xs">{colItems.length}</Badge>
                  </div>
                </div>
                <div className="space-y-2 min-h-[80px]" role="list" aria-label={`${label} items`}>
                  {colItems.map((pa) => {
                    const over = status !== PA_STATUS.Completed && isOverdue(pa.cr4c3_duedate);
                    return (
                      <GlassCard
                        key={pa.cr4c3_preventiveactionid}
                        role="listitem"
                        className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${over ? "border-l-4 border-l-red-400" : ""}`}
                        onClick={() => navigate(`/preventive-actions/${pa.cr4c3_preventiveactionid}`)}
                      >
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] line-clamp-2">{pa.cr4c3_title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <TicketRef value={getIncidentRef(pa._cr4c3_incident_value)} />
                          {pa.cr4c3_duedate && (
                            <span className={`text-xs ${over ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                              {formatDate(pa.cr4c3_duedate)}
                            </span>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                  {colItems.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </PageWrapper>
  );
}
