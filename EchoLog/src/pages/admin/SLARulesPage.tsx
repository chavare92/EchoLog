import { useState } from "react";
import { motion } from "framer-motion";
import { Save, CheckCircle2, Plus, RefreshCw } from "lucide-react";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { useSLARules, useUpdateSLARule, useCreateSLARule } from "@/hooks/useSLARules";
import { SEVERITY } from "@/lib/constants";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { SkeletonTable } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SLARulesPage() {
  const { isAdmin } = useRoleGuard();
  const { data: rules, isLoading, refetch } = useSLARules();
  const updateRule = useUpdateSLARule();
  const createRule = useCreateSLARule();

  const [edits, setEdits] = useState<Record<string, { tathours?: string; l1percent?: string }>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Add SLA dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeverity, setNewSeverity] = useState("");
  const [newTat, setNewTat] = useState("");
  const [newL1, setNewL1] = useState("");
  const [addError, setAddError] = useState("");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Admin access required.</p>
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

  const handleAdd = async () => {
    setAddError("");
    if (!newName.trim()) { setAddError("Rule name is required."); return; }
    if (!newSeverity) { setAddError("Severity is required."); return; }
    if (!newTat || Number(newTat) < 1) { setAddError("TAT Hours must be at least 1."); return; }
    await createRule.mutateAsync({
      cr4c3_slaname: newName.trim(),
      cr4c3_severity: Number(newSeverity),
      cr4c3_tathours: Number(newTat),
      cr4c3_l1reviewpercent: newL1 ? Number(newL1) : 0,
      cr4c3_isactive: true,
    });
    setAddOpen(false);
    setNewName(""); setNewSeverity(""); setNewTat(""); setNewL1("");
  };

  return (
    <PageWrapper title="SLA Rules">
      <motion.div variants={itemVariants}>
        <GlassCard>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SLA Rules ({rules?.length ?? 0})</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Rule
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div className="p-4"><SkeletonTable rows={3} columns={4} /></div>
          ) : (rules ?? []).length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No SLA rules yet. Click <strong className="text-gray-700">Add Rule</strong> to create the first one.
            </div>
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
                      <TableCell className="font-medium text-gray-900">{rule.cr4c3_slaname}</TableCell>
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
                        <span className={`text-xs font-medium ${rule.cr4c3_isactive ? "text-green-600" : "text-gray-400"}`}>
                          {rule.cr4c3_isactive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isSaved ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
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
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">About SLA Rules</h4>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 list-disc list-inside">
            <li>TAT Hours = Total time from incident creation to closure (in hours)</li>
            <li>L1 Review % = Percentage of incidents this severity requiring L1 review</li>
            <li>Changes take effect for newly created incidents only</li>
            <li>Default TAT: Critical = 4h, High = 24h, Medium = 72h</li>
          </ul>
        </GlassCard>
      </motion.div>

      {/* Add SLA Rule Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setAddError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SLA Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Rule Name *</Label>
              <Input placeholder="e.g. Critical SLA" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Severity *</Label>
              <Select value={newSeverity} onValueChange={setNewSeverity}>
                <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(SEVERITY) as [string, number][]).map(([k, v]) => (
                    <SelectItem key={k} value={String(v)}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>TAT Hours *</Label>
                <Input type="number" min="1" max="720" placeholder="e.g. 4" value={newTat} onChange={(e) => setNewTat(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>L1 Review %</Label>
                <Input type="number" min="0" max="100" placeholder="e.g. 10" value={newL1} onChange={(e) => setNewL1(e.target.value)} />
              </div>
            </div>
            {addError && <p className="text-xs text-red-600">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createRule.isPending}>
              {createRule.isPending ? "Saving…" : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
