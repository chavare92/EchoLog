import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { useDepartments, useCreateDepartment } from "@/hooks/useDepartments";
import { useSubdepartments, useCreateSubdepartment } from "@/hooks/useSubdepartments";
import { useProcesses, useCreateProcess } from "@/hooks/useProcesses";
import { useTeams, useCreateTeam } from "@/hooks/useTeams";
import { TEAM_SHIFT } from "@/lib/constants";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { SkeletonTable } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function HierarchyPage() {
  const { isAdmin } = useRoleGuard();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Admin access required.</p>
      </div>
    );
  }

  return (
    <PageWrapper title="Organizational Hierarchy">
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="departments">
          <TabsList className="mb-6">
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="subdepartments">Subdepartments</TabsTrigger>
            <TabsTrigger value="processes">Processes</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          <TabsContent value="departments">
            <DepartmentsTab />
          </TabsContent>
          <TabsContent value="subdepartments">
            <SubdepartmentsTab />
          </TabsContent>
          <TabsContent value="processes">
            <ProcessesTab />
          </TabsContent>
          <TabsContent value="teams">
            <TeamsTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </PageWrapper>
  );
}

function DepartmentsTab() {
  const { data: departments, isLoading } = useDepartments();
  const createDept = useCreateDepartment();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    await createDept.mutateAsync({ cr4c3_name: name.trim(), cr4c3_description: desc.trim() || undefined });
    setOpen(false); setName(""); setDesc("");
  };

  return (
    <>
    <GlassCard>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-300">Departments ({departments?.length ?? 0})</h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500">Managed in Dataverse</p>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </div>
      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={2} /></div>
      ) : (departments ?? []).length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">No departments yet.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(departments ?? []).map((d) => (
              <TableRow key={d.cr4c3_departmentid}>
                <TableCell className="text-slate-200">{d.cr4c3_name}</TableCell>
                <TableCell className="text-xs text-slate-400">{d.cr4c3_description ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{d.cr4c3_departmentid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setErr(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="e.g. Operations" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Optional description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={createDept.isPending}>{createDept.isPending ? "Saving…" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function SubdepartmentsTab() {
  const { data: departments } = useDepartments();
  const [selectedDept, setSelectedDept] = useState<string>("");
  const effectiveDeptId = selectedDept && selectedDept !== "all" ? selectedDept : undefined;
  const { data: subdepts, isLoading } = useSubdepartments(effectiveDeptId, selectedDept === "all");
  const createSubdept = useCreateSubdepartment();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [deptId, setDeptId] = useState("");
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!deptId) { setErr("Department is required."); return; }
    await createSubdept.mutateAsync({
      cr4c3_name: name.trim(),
      cr4c3_description: desc.trim() || undefined,
      [`_cr4c3_department_value`]: deptId,
    } as never);
    setOpen(false); setName(""); setDesc(""); setDeptId("");
  };

  return (
    <>
    <GlassCard>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-300">Subdepartments</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.cr4c3_departmentid} value={d.cr4c3_departmentid!}>{d.cr4c3_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </div>
      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
      ) : (subdepts ?? []).length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          {selectedDept ? "No subdepartments for this department." : "Select a department or choose All Departments."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(subdepts ?? []).map((s) => (
              <TableRow key={s.cr4c3_subdepartmentid}>
                <TableCell className="text-slate-200">{s.cr4c3_name}</TableCell>
                <TableCell className="text-xs text-slate-400">
                  {departments?.find((d) => d.cr4c3_departmentid === s._cr4c3_department_value)?.cr4c3_name ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{s.cr4c3_subdepartmentid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setErr(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Subdepartment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="e.g. Quality Assurance" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Department *</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.cr4c3_departmentid} value={d.cr4c3_departmentid!}>{d.cr4c3_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Optional" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={createSubdept.isPending}>{createSubdept.isPending ? "Saving…" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ProcessesTab() {
  const { data: subdepts } = useSubdepartments(undefined, true);
  const [selectedSubdept, setSelectedSubdept] = useState<string>("");
  const effectiveSubdeptId = selectedSubdept && selectedSubdept !== "all" ? selectedSubdept : undefined;
  const { data: processes, isLoading } = useProcesses(effectiveSubdeptId, selectedSubdept === "all");
  const createProcess = useCreateProcess();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [subdeptId, setSubdeptId] = useState("");
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!subdeptId) { setErr("Subdepartment is required."); return; }
    await createProcess.mutateAsync({
      cr4c3_name: name.trim(),
      cr4c3_description: desc.trim() || undefined,
      [`_cr4c3_subdepartment_value`]: subdeptId,
    } as never);
    setOpen(false); setName(""); setDesc(""); setSubdeptId("");
  };

  return (
    <>
    <GlassCard>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-300">Processes</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedSubdept} onValueChange={setSelectedSubdept}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subdept" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subdepartments</SelectItem>
              {(subdepts ?? []).map((s) => (
                <SelectItem key={s.cr4c3_subdepartmentid} value={s.cr4c3_subdepartmentid!}>{s.cr4c3_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </div>
      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
      ) : (processes ?? []).length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          {selectedSubdept ? "No processes for this subdepartment." : "Select a subdepartment or choose All."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subdepartment</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(processes ?? []).map((p) => (
              <TableRow key={p.cr4c3_processid}>
                <TableCell className="text-slate-200">{p.cr4c3_name}</TableCell>
                <TableCell className="text-xs text-slate-400">
                  {subdepts?.find((s) => s.cr4c3_subdepartmentid === p._cr4c3_subdepartment_value)?.cr4c3_name ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{p.cr4c3_processid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setErr(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Process</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="e.g. Incident Review" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Subdepartment *</Label>
            <Select value={subdeptId} onValueChange={setSubdeptId}>
              <SelectTrigger><SelectValue placeholder="Select subdepartment" /></SelectTrigger>
              <SelectContent>
                {(subdepts ?? []).map((s) => (
                  <SelectItem key={s.cr4c3_subdepartmentid} value={s.cr4c3_subdepartmentid!}>{s.cr4c3_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input placeholder="Optional" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={createProcess.isPending}>{createProcess.isPending ? "Saving…" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function TeamsTab() {
  const { data: processes } = useProcesses(undefined, true);
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const effectiveProcessId = selectedProcess && selectedProcess !== "all" ? selectedProcess : undefined;
  const { data: teams, isLoading } = useTeams(effectiveProcessId, selectedProcess === "all");
  const createTeam = useCreateTeam();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [processId, setProcessId] = useState("");
  const [shift, setShift] = useState("");
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!processId) { setErr("Process is required."); return; }
    if (!shift) { setErr("Shift is required."); return; }
    await createTeam.mutateAsync({
      cr4c3_name: name.trim(),
      cr4c3_shift: Number(shift),
      [`_cr4c3_process_value`]: processId,
    } as never);
    setOpen(false); setName(""); setProcessId(""); setShift("");
  };

  return (
    <>
    <GlassCard>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-300">Teams</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedProcess} onValueChange={setSelectedProcess}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by process" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Processes</SelectItem>
              {(processes ?? []).map((p) => (
                <SelectItem key={p.cr4c3_processid} value={p.cr4c3_processid!}>{p.cr4c3_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </div>
      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
      ) : (teams ?? []).length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          {selectedProcess ? "No teams for this process." : "Select a process or choose All."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Process</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(teams ?? []).map((t) => (
              <TableRow key={t.cr4c3_teamid}>
                <TableCell className="text-slate-200">{t.cr4c3_name}</TableCell>
                <TableCell className="text-xs text-slate-400">
                  {processes?.find((p) => p.cr4c3_processid === t._cr4c3_process_value)?.cr4c3_name ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-slate-400">
                  {t.cr4c3_shift === TEAM_SHIFT.Morning ? "Morning" : t.cr4c3_shift === TEAM_SHIFT.Evening ? "Evening" : t.cr4c3_shift === TEAM_SHIFT.Night ? "Night" : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{t.cr4c3_teamid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setErr(""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Team</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input placeholder="e.g. Alpha Team" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Process *</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger>
              <SelectContent>
                {(processes ?? []).map((p) => (
                  <SelectItem key={p.cr4c3_processid} value={p.cr4c3_processid!}>{p.cr4c3_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Shift *</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(TEAM_SHIFT.Morning)}>Morning</SelectItem>
                <SelectItem value={String(TEAM_SHIFT.Evening)}>Evening</SelectItem>
                <SelectItem value={String(TEAM_SHIFT.Night)}>Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={createTeam.isPending}>{createTeam.isPending ? "Saving…" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
