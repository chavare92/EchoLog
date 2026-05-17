import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, FilePlus, FileWarning, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Copy, UserCheck } from "lucide-react";
import { useAtomValue } from "jotai";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncidents, useUpdateIncident } from "@/hooks/useIncidents";
import { useDepartments } from "@/hooks/useDepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { INCIDENT_STATUS, SEVERITY } from "@/lib/constants";
import { isOverdue } from "@/lib/utils";
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
import { toast } from "sonner";

type SortField = "created" | "due" | "severity";
type SortDir = "asc" | "desc";

const SEVERITY_ORDER: Record<number, number> = { 564060000: 0, 564060001: 1, 564060002: 2 };

export function IncidentsListPage() {
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const { data: incidents, isLoading } = useIncidents();
  const { data: departments } = useDepartments();
  const { data: allProcesses } = useProcesses(undefined, true);
  const updateIncident = useUpdateIncident();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const getDeptName = (id?: string) => departments?.find((d) => d.cr4c3_departmentid === id)?.cr4c3_name;
  const getProcessName = (id?: string) => allProcesses?.find((p) => p.cr4c3_processid === id)?.cr4c3_name;

  const filtered = useMemo(() => {
    let list = (incidents ?? []).filter((inc) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        inc.cr4c3_title?.toLowerCase().includes(q) ||
        inc.cr4c3_ticketreference?.toLowerCase().includes(q) ||
        inc.cr4c3_description?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || inc.cr4c3_status === Number(statusFilter);
      const matchSeverity = severityFilter === "all" || inc.cr4c3_severity === Number(severityFilter);
      return matchSearch && matchStatus && matchSeverity;
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
  }, [incidents, search, statusFilter, severityFilter, sortField, sortDir]);

  // Stats
  const total = (incidents ?? []).length;
  const activeCount = (incidents ?? []).filter((i) => i.cr4c3_status !== INCIDENT_STATUS.PAClosed).length;
  const criticalCount = (incidents ?? []).filter((i) => i.cr4c3_severity === SEVERITY.Critical && i.cr4c3_status !== INCIDENT_STATUS.PAClosed).length;
  const overdueCount = (incidents ?? []).filter((i) => i.cr4c3_status !== INCIDENT_STATUS.PAClosed && isOverdue(i.cr4c3_duedate)).length;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" aria-hidden="true" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" aria-hidden="true" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" aria-hidden="true" />;
  };

  const handleAssignToMe = async (incidentId: string) => {
    if (!user?.cr4c3_userprofileid) { toast.error("No user session"); return; }
    await updateIncident.mutateAsync({
      id: incidentId,
      fields: { _cr4c3_assignee_value: user.cr4c3_userprofileid, cr4c3_status: INCIDENT_STATUS.InvestigationPending },
    });
    toast.success("Assigned to you");
  };

  const handleCopyLink = (incidentId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/incidents/${incidentId}`);
    toast.success("Link copied to clipboard");
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
            <h2 className="text-xl font-bold text-gray-900">Incidents</h2>
            <p className="text-xs text-gray-500">{filtered.length} incident{filtered.length !== 1 ? "s" : ""} shown</p>
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
            { label: "Total", count: total, cls: "bg-slate-100 text-slate-700 border-slate-200" },
            { label: "Active", count: activeCount, cls: "bg-blue-50 text-blue-700 border-blue-200" },
            { label: "Critical", count: criticalCount, cls: "bg-red-50 text-red-700 border-red-200", pulse: criticalCount > 0 },
            { label: "Overdue", count: overdueCount, cls: "bg-amber-50 text-amber-700 border-amber-200", pulse: overdueCount > 0 },
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
        <GlassCard className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <Input
                placeholder="Search by ticket, title or description…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search incidents"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36" aria-label="Filter by severity">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {Object.entries(SEVERITY).map(([k, v]) => (
                  <SelectItem key={k} value={String(v)}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(INCIDENT_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={String(v)}>{k.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <FileWarning className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-500 font-medium">No incidents found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Ticket</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center text-xs font-medium hover:text-primary transition-colors focus:outline-none"
                      onClick={() => toggleSort("severity")}
                      aria-sort={sortField === "severity" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      Severity <SortIcon field="severity" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center text-xs font-medium hover:text-primary transition-colors focus:outline-none"
                      onClick={() => toggleSort("due")}
                      aria-sort={sortField === "due" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      Due <SortIcon field="due" />
                    </button>
                  </TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inc, idx) => (
                  <motion.tr
                    key={inc.cr4c3_incidentid}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                    onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TicketRef value={inc.cr4c3_ticketreference} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate font-medium text-gray-900 text-sm">{inc.cr4c3_title}</p>
                      {inc._cr4c3_department_value && (
                        <p className="truncate text-xs text-gray-400">{getDeptName(inc._cr4c3_department_value)}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {getProcessName(inc._cr4c3_process_value) ?? "—"}
                    </TableCell>
                    <TableCell><SeverityBadge severity={inc.cr4c3_severity} /></TableCell>
                    <TableCell><StatusBadge status={inc.cr4c3_status} /></TableCell>
                    <TableCell>
                      {inc.cr4c3_status === INCIDENT_STATUS.PAClosed
                        ? <span className="text-xs text-gray-400">—</span>
                        : <TATCountdown dueDate={inc.cr4c3_duedate} />}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for ${inc.cr4c3_ticketreference}`}>
                            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignToMe(inc.cr4c3_incidentid!)}>
                            <UserCheck className="w-4 h-4 mr-2" aria-hidden="true" />
                            Assign to me
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(inc.cr4c3_incidentid!)}>
                            <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                            Copy link
                          </DropdownMenuItem>
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
