import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { formatDateTime } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { SkeletonTable } from "@/components/shared/Skeletons";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function AuditTrailPage() {
  const { data: logs, isLoading } = useAuditLogs();
  const { data: users } = useUserProfiles();

  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      (logs ?? []).filter(
        (log) =>
          !search ||
          log.cr4c3_entitytype?.toLowerCase().includes(search.toLowerCase()) ||
          log.cr4c3_fieldchanged?.toLowerCase().includes(search.toLowerCase()) ||
          log.cr4c3_description?.toLowerCase().includes(search.toLowerCase()) ||
          log.cr4c3_actorrole?.toLowerCase().includes(search.toLowerCase())
      ),
    [logs, search]
  );

  const getActorName = (actorId?: string) => {
    if (!actorId) return "—";
    return users?.find((u) => u.cr4c3_userprofileid === actorId)?.cr4c3_fullname ?? actorId.slice(0, 8) + "…";
  };

  return (
    <PageWrapper title="Audit Trail">
      {/* Search */}
      <motion.div variants={itemVariants} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search audit logs…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <GlassCard>
          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={10} columns={5} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No audit log entries found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Field Changed</TableHead>
                  <TableHead>Old → New</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.cr4c3_auditlogid}>
                    <TableCell className="font-mono text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(log.cr4c3_timestamp)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      <div>{getActorName(log._cr4c3_actor_value)}</div>
                      {log.cr4c3_actorrole && (
                        <span className="text-xs text-gray-400">{log.cr4c3_actorrole}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.cr4c3_entitytype && (
                        <Badge variant="secondary" className="text-xs">{log.cr4c3_entitytype}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-700 font-mono">
                      {log.cr4c3_fieldchanged ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.cr4c3_oldvalue || log.cr4c3_newvalue ? (
                        <span>
                          <span className="text-red-600 line-through mr-1">{log.cr4c3_oldvalue ?? "—"}</span>
                          <span className="text-gray-500 mx-1">→</span>
                          <span className="text-green-600">{log.cr4c3_newvalue ?? "—"}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">{log.cr4c3_description ?? "—"}</span>
                      )}
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
