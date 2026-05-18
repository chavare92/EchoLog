import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FilePlus, FileWarning, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Columns, Clock, AlertTriangle } from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncidents } from "@/hooks/useIncidents";
import { useDepartments } from "@/hooks/useDepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { useTeams } from "@/hooks/useTeams";
import { useSubdepartments } from "@/hooks/useSubdepartments";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { INCIDENT_STATUS, SEVERITY } from "@/lib/constants";
import { isOverdue, persistColumnVisibility, loadColumnVisibility } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonTable } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type SortField = "created" | "due" | "severity";
type SortDir = "asc" | "desc";

const SEVERITY_ORDER: Record<number, number> = { 564060000: 0, 564060001: 1, 564060002: 2 };

const ALL_COLUMNS = [
  { key: "ticket", label: "Ticket" },
  { key: "title", label: "Title" },
  { key: "department", label: "Department" },
  { key: "subdepartment", label: "Subdept" },
  { key: "process", label: "Process" },
  { key: "team", label: "Team" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "due", label: "Due" },
  { key: "assignee", label: "Assignee" },
  { key: "created", label: "Logged" },
  { key: "overdue", label: "Overdue" },
] as const;
type ColKey = (typeof ALL_COLUMNS)[number]["key"];
const DEFAULT_COLS: ColKey[] = ["ticket", "title", "department", "process", "severity", "status", "due", "overdue"];

export function IncidentsListPage() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const { isAdmin, isL1Manager, isL2Manager } = useRoleGuard();
  const { data: incidents, isLoading } = useIncidents();
  const { data: departments } = useDepartments();
  const { data: allSubdepts } = useSubdepartments(undefined, true);
  const { data: allProcesses } = useProcesses(undefined, true);
  const { data: allTeams } = useTeams(undefined, true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  const [visibleCols, setVisibleCols] = useState<ColKey[]>(() => {
    const saved = loadColumnVisibility(user?.cr4c3_userprofileid ?? "");
    return (saved as ColKey[] | null) ?? DEFAULT_COLS;
  });

  useEffect(() => {
    persistColumnVisibility(user?.cr4c3_userprofileid ?? "", visibleCols);
  }, [visibleCols, user?.cr4c3_userprofileid]);

  // Close col menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleCol = (key: ColKey) =>
    setVisibleCols((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const getDeptName = (id?: string) => departments?.find((d) => d.cr4c3_departmentid === id)?.cr4c3_name;
  const getSubdeptName = (id?: string) => allSubdepts?.find((s) => s.cr4c3_subdepartmentid === id)?.cr4c3_name;
  const getProcessName = (id?: string) => allProcesses?.find((p) => p.cr4c3_processid === id)?.cr4c3_name;
  const getTeamName = (id?: string) => allTeams?.find((t) => t.cr4c3_teamid === id)?.cr4c3_name;

  const filtered = useMemo(() => {
    // Role-scoped: Loggers see own; Assignees see assigned + own; Managers see all
    let list = (incidents ?? []).filter((inc) => {
      if (!isAdmin && !isL1Manager && !isL2Manager) {
        const uid = user?.cr4c3_userprofileid;
        const isOwn = inc._cr4c3_loggedby_value === uid;
        const isAssigned = inc._cr4c3_assignee_value === uid;
        if (!isOwn && !isAssigned) return false;
      }
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        inc.cr4c3_title?.toLowerCase().includes(q) ||
        inc.cr4c3_ticketreference?.toLowerCase().includes(q) ||
        inc.cr4c3_description?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || inc.cr4c3_status === Number(statusFilter);
      const matchSeverity = severityFilter === "all" || inc.cr4c3_severity === Number(severityFilter);
      const matchOverdue = !showOverdueOnly || isOverdue(inc.cr4c3_duedate);
      const matchCritical = !showCriticalOnly || inc.cr4c3_severity === SEVERITY.Critical;
      return matchSearch && matchStatus && matchSeverity && matchOverdue && matchCritical;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "created") {
        cmp = new Date(a.cr4c3_createdat ?? "").getTime() - new Date(b.cr4c3_createdat ?? "").getTime();
      } else if (sortField === "due") {
        cmp = new Date(a.cr4c3_duedate ?? "9999").getTime() - new Date(b.cr4c3_duedate ?? "9999").getTime();
      } else if (sortField === "severity") {
        cmp = (SEVERITY_ORDER[a.cr4c3_severity ?? 999] ?? 3) - (SEVERITY_ORDER[b.cr4c3_severity ?? 999] ?? 3);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [incidents, search, statusFilter, severityFilter, sortField, sortDir, showOverdueOnly, showCriticalOnly, isAdmin, isL1Manager, isL2Manager, user]);

  // Stats
  const total = (incidents ?? []).length;
  const activeCount = (incidents ?? []).filter((i) => i.cr4c3_status !== INCIDENT_STATUS.PAClosed).length;
  const criticalCount = (incidents ?? []).filter((i) => i.cr4c3_severity === SEVERITY.Critical && i.cr4c3_status !== INCIDENT_STATUS.PAClosed).length;
  const overdueCount = (incidents ?? []).filter((i) => i.cr4c3_status !== INCIDENT_STATUS.PAClosed && isOverdue(i.cr4c3_duedate)).length;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400 dark:text-gray-500" aria-hidden="true" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" aria-hidden="true" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" aria-hidden="true" />;
  };

  return (
    <PageWrapper>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileWarning className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">My Incidents</h2>
            <p className="text-xs text-[hsl(var(--foreground-muted))]">{filtered.length} incident{filtered.length !== 1 ? "s" : ""} shown</p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/log-incident")}>
          <FilePlus className="w-4 h-4 mr-1.5" aria-hidden="true" />
          Log Incident
        </Button>
      </motion.div>

      {/* Stats Pills */}
      {!isLoading && (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2" role="status" aria-label="Incident statistics">
          {[
            { label: "Total", count: total, cls: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
            { label: "Active", count: activeCount, cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
            { label: "Critical", count: criticalCount, cls: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800", pulse: criticalCount > 0 },
            { label: "Overdue", count: overdueCount, cls: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800", pulse: overdueCount > 0 },
          ].map(({ label, count, cls, pulse }) => (
            <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
              {pulse && <PulseIndicator color={label === "Critical" ? "red" : "amber"} />}
              {label}: {count}
            </span>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              <Input placeholder="Search by ticket, title or description…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search incidents" />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36" aria-label="Filter by severity"><SelectValue placeholder="All severities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {Object.entries(SEVERITY).map(([k, v]) => (<SelectItem key={k} value={String(v)}>{k}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(INCIDENT_STATUS).map(([k, v]) => (<SelectItem key={k} value={String(v)}>{k.replace(/([A-Z])/g, " $1").trim()}</SelectItem>))}
              </SelectContent>
            </Select>
            {/* Column visibility */}
            <div className="relative" ref={colMenuRef}>
              <Button variant="outline" size="sm" onClick={() => setColMenuOpen((v) => !v)} aria-expanded={colMenuOpen} aria-label="Manage columns">
                <Columns className="w-3.5 h-3.5 mr-1.5" />Columns
              </Button>
              <AnimatePresence>
                {colMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 mt-1 z-20 bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] rounded-xl shadow-lg p-3 min-w-[180px]">
                    <p className="text-[10px] font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-wide mb-2">Visible Columns</p>
                    {ALL_COLUMNS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 py-1 cursor-pointer text-sm text-[hsl(var(--foreground))] hover:text-amber-600 dark:hover:text-amber-400">
                        <input type="checkbox" checked={visibleCols.includes(key)} onChange={() => toggleCol(key)} className="accent-amber-500" />
                        {label}
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* Quick toggles */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowOverdueOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                showOverdueOnly ? "bg-amber-500 text-white border-amber-500" : "bg-transparent text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
              }`}
              aria-pressed={showOverdueOnly}
            >
              <Clock className="w-3 h-3" />Overdue
            </button>
            <button
              onClick={() => setShowCriticalOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                showCriticalOnly ? "bg-red-500 text-white border-red-500" : "bg-transparent text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              }`}
              aria-pressed={showCriticalOnly}
            >
              <AlertTriangle className="w-3 h-3" />Critical
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <GlassCard>
          {isLoading ? (
            <div className="p-4"><SkeletonTable rows={8} columns={7} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileWarning className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No incidents found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleCols.includes("ticket") && <TableHead className="w-32">Ticket</TableHead>}
                  {visibleCols.includes("title") && <TableHead>Title</TableHead>}
                  {visibleCols.includes("department") && <TableHead>Dept</TableHead>}
                  {visibleCols.includes("subdepartment") && <TableHead>Subdept</TableHead>}
                  {visibleCols.includes("process") && <TableHead>Process</TableHead>}
                  {visibleCols.includes("team") && <TableHead>Team</TableHead>}
                  {visibleCols.includes("severity") && (
                    <TableHead>
                      <button className="inline-flex items-center text-xs font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus:outline-none" onClick={() => toggleSort("severity")} aria-sort={sortField === "severity" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                        Severity <SortIcon field="severity" />
                      </button>
                    </TableHead>
                  )}
                  {visibleCols.includes("status") && <TableHead>Status</TableHead>}
                  {visibleCols.includes("due") && (
                    <TableHead>
                      <button className="inline-flex items-center text-xs font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus:outline-none" onClick={() => toggleSort("due")} aria-sort={sortField === "due" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                        Due <SortIcon field="due" />
                      </button>
                    </TableHead>
                  )}
                  {visibleCols.includes("assignee") && <TableHead>Assignee</TableHead>}
                  {visibleCols.includes("created") && (
                    <TableHead>
                      <button className="inline-flex items-center text-xs font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus:outline-none" onClick={() => toggleSort("created")} aria-sort={sortField === "created" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                        Logged <SortIcon field="created" />
                      </button>
                    </TableHead>
                  )}
                  {visibleCols.includes("overdue") && <TableHead>Overdue</TableHead>}
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inc, idx) => (
                  <motion.tr key={inc.cr4c3_incidentid} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    className="cursor-pointer hover:bg-[hsl(var(--sidebar-hover-bg))] transition-colors"
                    onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                  >
                    {visibleCols.includes("ticket") && <TableCell onClick={(e) => e.stopPropagation()}><TicketRef value={inc.cr4c3_ticketreference} /></TableCell>}
                    {visibleCols.includes("title") && (
                      <TableCell className="max-w-xs"><p className="truncate font-medium text-[hsl(var(--foreground))] text-sm">{inc.cr4c3_title}</p></TableCell>
                    )}
                    {visibleCols.includes("department") && <TableCell className="text-xs text-[hsl(var(--foreground-muted))]">{getDeptName(inc._cr4c3_department_value) ?? "—"}</TableCell>}
                    {visibleCols.includes("subdepartment") && <TableCell className="text-xs text-[hsl(var(--foreground-muted))]">{getSubdeptName(inc._cr4c3_subdepartment_value) ?? "—"}</TableCell>}
                    {visibleCols.includes("process") && <TableCell className="text-xs text-[hsl(var(--foreground-muted))]">{getProcessName(inc._cr4c3_process_value) ?? "—"}</TableCell>}
                    {visibleCols.includes("team") && <TableCell className="text-xs text-[hsl(var(--foreground-muted))]">{getTeamName(inc._cr4c3_team_value) ?? "—"}</TableCell>}
                    {visibleCols.includes("severity") && <TableCell><SeverityBadge severity={inc.cr4c3_severity} /></TableCell>}
                    {visibleCols.includes("status") && <TableCell><StatusBadge status={inc.cr4c3_status} /></TableCell>}
                    {visibleCols.includes("due") && (
                      <TableCell>{inc.cr4c3_status === INCIDENT_STATUS.PAClosed ? <span className="text-xs text-[hsl(var(--foreground-muted))]">—</span> : <TATCountdown dueDate={inc.cr4c3_duedate} />}</TableCell>
                    )}
                    {visibleCols.includes("assignee") && (
                      <TableCell className="text-xs text-[hsl(var(--foreground-muted))]">{inc._cr4c3_assignee_value ? inc._cr4c3_assignee_value.slice(0, 8) + "…" : "—"}</TableCell>
                    )}
                    {visibleCols.includes("created") && (
                      <TableCell className="text-xs text-[hsl(var(--foreground-muted))]">{inc.cr4c3_createdat ? new Date(inc.cr4c3_createdat).toLocaleDateString() : "—"}</TableCell>
                    )}
                    {visibleCols.includes("overdue") && (
                      <TableCell>{isOverdue(inc.cr4c3_duedate) && inc.cr4c3_status !== INCIDENT_STATUS.PAClosed ? <PulseIndicator color="red" /> : <span className="text-xs text-[hsl(var(--foreground-muted)/0.4)]">—</span>}</TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for ${inc.cr4c3_ticketreference}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}>View Details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>
      </motion.div>
    </PageWrapper>
  );
}
