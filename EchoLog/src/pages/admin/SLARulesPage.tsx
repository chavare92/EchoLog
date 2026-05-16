import { useState } from "react";
import { motion } from "framer-motion";
import { Save, CheckCircle2 } from "lucide-react";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { useSLARules, useUpdateSLARule } from "@/hooks/useSLARules";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { SkeletonTable } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SLARulesPage() {
  const { isAdmin } = useRoleGuard();
  const { data: rules, isLoading } = useSLARules();
  const updateRule = useUpdateSLARule();

  const [edits, setEdits] = useState<Record<string, { tathours?: string; l1percent?: string }>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Admin access required.</p>
      </div>
    );
  }

  const handleChange = (id: string, field: "tathours" | "l1percent", value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
    setSavedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const save = async (id: string) => {
    const e = edits[id];
    if (!e) return;
    await updateRule.mutateAsync({
      id,
      fields: {
        ...(e.tathours !== undefined ? { cr4c3_tathours: Number(e.tathours) } : {}),
        ...(e.l1percent !== undefined ? { cr4c3_l1reviewpercent: Number(e.l1percent) } : {}),
      },
    });
    setSavedIds((prev) => new Set(prev).add(id));
  };

  return (
    <PageWrapper title="SLA Rules">
      <motion.div variants={itemVariants}>
        <GlassCard>
          {isLoading ? (
            <div className="p-4"><SkeletonTable rows={3} columns={4} /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>TAT Hours</TableHead>
                  <TableHead>L1 Review %</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules ?? []).map((rule) => {
                  const id = rule.cr4c3_slaruleid!;
                  const e = edits[id] ?? {};
                  const tatVal = e.tathours ?? String(rule.cr4c3_tathours ?? "");
                  const l1Val = e.l1percent ?? String(rule.cr4c3_l1reviewpercent ?? "");
                  const isDirty = e.tathours !== undefined || e.l1percent !== undefined;
                  const isSaved = savedIds.has(id);

                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium text-slate-200">{rule.cr4c3_slaname}</TableCell>
                      <TableCell>
                        {rule.cr4c3_severity !== undefined && (
                          <SeverityBadge severity={rule.cr4c3_severity} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          max="720"
                          value={tatVal}
                          onChange={(e) => handleChange(id, "tathours", e.target.value)}
                          className="w-24 h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={l1Val}
                          onChange={(e) => handleChange(id, "l1percent", e.target.value)}
                          className="w-20 h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${rule.cr4c3_isactive ? "text-green-400" : "text-slate-500"}`}>
                          {rule.cr4c3_isactive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isSaved ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={!isDirty || updateRule.isPending}
                            onClick={() => save(id)}
                          >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            Save
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </GlassCard>
      </motion.div>

      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">About SLA Rules</h4>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>TAT Hours = Total time from incident creation to closure (in hours)</li>
            <li>L1 Review % = Percentage of incidents this severity requiring L1 review</li>
            <li>Changes take effect for newly created incidents only</li>
            <li>Default TAT: Critical = 4h, High = 24h, Medium = 72h</li>
          </ul>
        </GlassCard>
      </motion.div>
    </PageWrapper>
  );
}
