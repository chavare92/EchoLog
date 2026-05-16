import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FilePlus, Filter } from "lucide-react";
import { useIncidents } from "@/hooks/useIncidents";
import { INCIDENT_STATUS, SEVERITY } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { SkeletonTable } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";

export function IncidentsListPage() {
  const navigate = useNavigate();
  const { data: incidents, isLoading } = useIncidents();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return (incidents ?? []).filter((inc) => {
      const matchSearch =
        !search ||
        inc.cr4c3_title?.toLowerCase().includes(search.toLowerCase()) ||
        inc.cr4c3_ticketreference?.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || inc.cr4c3_status === Number(statusFilter);
      const matchSeverity =
        severityFilter === "all" || inc.cr4c3_severity === Number(severityFilter);
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [incidents, search, statusFilter, severityFilter]);

  return (
    <PageWrapper
      title="Incidents"
      actions={
        <Button size="sm" onClick={() => navigate("/log-incident")}>
          <FilePlus className="w-4 h-4 mr-1" />
          Log Incident
        </Button>
      }
    >
      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title or ticket…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(INCIDENT_STATUS).map(([k, v]) => (
                <SelectItem key={k} value={String(v)}>{k.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {Object.entries(SEVERITY).map(([k, v]) => (
                <SelectItem key={k} value={String(v)}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-slate-500 self-center">
          {filtered.length} incident{filtered.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <GlassCard>
          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={8} columns={6} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No incidents match your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due / TAT</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inc) => (
                  <TableRow
                    key={inc.cr4c3_incidentid}
                    className="cursor-pointer"
                    onClick={() => navigate(`/incidents/${inc.cr4c3_incidentid}`)}
                  >
                    <TableCell>
                      <TicketRef value={inc.cr4c3_ticketreference} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="truncate block text-slate-200">{inc.cr4c3_title}</span>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={inc.cr4c3_severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inc.cr4c3_status} />
                    </TableCell>
                    <TableCell>
                      <TATCountdown dueDate={inc.cr4c3_duedate} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {formatDateTime(inc.cr4c3_createdat)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>
      </motion.div>
    </PageWrapper>
  );
}
