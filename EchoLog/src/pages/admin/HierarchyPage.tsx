import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { useIncidents } from "@/hooks/useIncidents";
import {
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
} from "@/hooks/useDepartments";
import {
  useSubdepartments, useCreateSubdepartment, useUpdateSubdepartment, useDeleteSubdepartment,
} from "@/hooks/useSubdepartments";
import {
  useProcesses, useCreateProcess, useUpdateProcess, useDeleteProcess,
} from "@/hooks/useProcesses";
import {
  useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam,
} from "@/hooks/useTeams";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Cr4c3_departmentsBase } from "@/generated/models/Cr4c3_departmentsModel";
import type { Cr4c3_subdepartmentsBase } from "@/generated/models/Cr4c3_subdepartmentsModel";
import type { Cr4c3_processesBase } from "@/generated/models/Cr4c3_processesModel";
import type { Cr4c3_teamsBase } from "@/generated/models/Cr4c3_teamsModel";
import { toast } from "sonner";

export function HierarchyPage() {
  const { isAdmin } = useRoleGuard();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Admin access required.</p>
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
          <TabsContent value="departments"><DepartmentsTab /></TabsContent>
          <TabsContent value="subdepartments"><SubdepartmentsTab /></TabsContent>
          <TabsContent value="processes"><ProcessesTab /></TabsContent>
          <TabsContent value="teams"><TeamsTab /></TabsContent>
        </Tabs>
      </motion.div>
    </PageWrapper>
  );
}

// ── Sortable Row ──────────────────────────────────────────────────────────────

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (dragProps: { isDragging: boolean; handleProps: React.HTMLAttributes<HTMLButtonElement> }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style}>
      {children({ isDragging, handleProps: { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement> })}
    </tr>
  );
}

// ── Departments ────────────────────────────────────────────────────────────────

function DepartmentsTab() {
  const { data: departments, isLoading } = useDepartments();
  const { data: incidents } = useIncidents();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Cr4c3_departmentsBase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [err, setErr] = useState("");

  // Local drag-order (session only — no sort field in model)
  const [order, setOrder] = useState<string[]>([]);
  const ids = order.length > 0 ? order : (departments ?? []).map((d) => d.cr4c3_departmentid!).filter(Boolean);
  const sorted = ids
    .map((id) => (departments ?? []).find((d) => d.cr4c3_departmentid === id))
    .filter(Boolean) as Cr4c3_departmentsBase[];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const base = prev.length > 0 ? prev : ids;
      const oldIndex = base.indexOf(String(active.id));
      const newIndex = base.indexOf(String(over.id));
      return arrayMove(base, oldIndex, newIndex);
    });
  };

  const handleAdd = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    await createDept.mutateAsync({ cr4c3_name: name.trim(), cr4c3_description: desc.trim() || undefined });
    setAddOpen(false); setName(""); setDesc("");
  };

  const openEdit = (d: Cr4c3_departmentsBase) => {
    setEditItem(d); setEditName(d.cr4c3_name ?? ""); setEditDesc(d.cr4c3_description ?? ""); setErr("");
  };

  const handleEdit = async () => {
    setErr("");
    if (!editName.trim()) { setErr("Name is required."); return; }
    await updateDept.mutateAsync({ id: editItem!.cr4c3_departmentid!, fields: { cr4c3_name: editName.trim(), cr4c3_description: editDesc.trim() || undefined } });
    setEditItem(null);
  };

  const handleDelete = async () => {
    const refCount = (incidents ?? []).filter((i) => i._cr4c3_department_value === deleteId).length;
    if (refCount > 0) { toast.error(`Cannot delete — ${refCount} incident${refCount > 1 ? "s" : ""} reference this department`); setDeleteId(null); return; }
    await deleteDept.mutateAsync(deleteId!);
    setDeleteId(null);
  };

  return (
    <>
      <GlassCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Departments ({departments?.length ?? 0})
            {order.length > 0 && (
              <span className="ml-2 text-xs text-amber-600 font-normal">reordered</span>
            )}
          </h3>
          <Button size="sm" onClick={() => { setErr(""); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" />Add
          </Button>
        </div>
        {isLoading ? (
          <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No departments yet.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  {sorted.map((d) => (
                    <SortableRow key={d.cr4c3_departmentid} id={d.cr4c3_departmentid!}>
                      {({ isDragging, handleProps }) => (
                        <>
                          <TableCell className="w-8 px-2">
                            <button
                              {...handleProps}
                              className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                              aria-label="Drag to reorder"
                            >
                              <GripVertical className="w-4 h-4" />
                            </button>
                          </TableCell>
                          <TableCell className={`font-medium ${isDragging ? "text-gray-400" : "text-[hsl(var(--foreground))]"}`}>
                            {d.cr4c3_name}
                          </TableCell>
                          <TableCell className="text-sm text-[hsl(var(--foreground-muted))]">
                            {d.cr4c3_description ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(d)}>
                                <Pencil className="w-3.5 h-3.5 text-gray-500" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteId(d.cr4c3_departmentid!)}>
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </SortableRow>
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        )}
      </GlassCard>

      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setErr(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Department</DialogTitle><DialogDescription>Create a new department in Dataverse.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input placeholder="e.g. Operations" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input placeholder="Optional" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createDept.isPending}>{createDept.isPending ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setErr(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle><DialogDescription>Update department details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateDept.isPending}>{updateDept.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Department</DialogTitle><DialogDescription>This cannot be undone. Are you sure?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDept.isPending}>{deleteDept.isPending ? "Deleting…" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Subdepartments ─────────────────────────────────────────────────────────────

function SubdepartmentsTab() {
  const { data: departments } = useDepartments();
  const { data: incidents } = useIncidents();
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const effectiveDeptId = selectedDept !== "all" ? selectedDept : undefined;
  const { data: subdepts, isLoading } = useSubdepartments(effectiveDeptId, true);
  const createSubdept = useCreateSubdepartment();
  const updateSubdept = useUpdateSubdepartment();
  const deleteSubdept = useDeleteSubdepartment();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Cr4c3_subdepartmentsBase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [deptId, setDeptId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!deptId) { setErr("Department is required."); return; }
    await createSubdept.mutateAsync({ cr4c3_name: name.trim(), cr4c3_description: desc.trim() || undefined, _cr4c3_department_value: deptId });
    setAddOpen(false); setName(""); setDesc(""); setDeptId("");
  };

  const openEdit = (s: Cr4c3_subdepartmentsBase) => {
    setEditItem(s); setEditName(s.cr4c3_name ?? ""); setEditDesc(s.cr4c3_description ?? ""); setErr("");
  };

  const handleEdit = async () => {
    setErr("");
    if (!editName.trim()) { setErr("Name is required."); return; }
    await updateSubdept.mutateAsync({ id: editItem!.cr4c3_subdepartmentid!, fields: { cr4c3_name: editName.trim(), cr4c3_description: editDesc.trim() || undefined } });
    setEditItem(null);
  };

  const handleDelete = async () => {
    const refCount = (incidents ?? []).filter((i) => i._cr4c3_subdepartment_value === deleteId).length;
    if (refCount > 0) { toast.error(`Cannot delete — ${refCount} incident${refCount > 1 ? "s" : ""} reference this subdepartment`); setDeleteId(null); return; }
    await deleteSubdept.mutateAsync(deleteId!);
    setDeleteId(null);
  };

  return (
    <>
      <GlassCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Subdepartments</h3>
          <div className="flex items-center gap-2">
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.cr4c3_departmentid} value={d.cr4c3_departmentid!}>{d.cr4c3_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setErr(""); setAddOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </div>
        {isLoading ? (
          <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
        ) : (subdepts ?? []).length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {selectedDept && selectedDept !== "all" ? "No subdepartments for this department." : "No subdepartments found."}
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(subdepts ?? []).map((s) => (
                <TableRow key={s.cr4c3_subdepartmentid}>
                  <TableCell className="font-medium text-gray-900">{s.cr4c3_name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{departments?.find((d) => d.cr4c3_departmentid === s._cr4c3_department_value)?.cr4c3_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteId(s.cr4c3_subdepartmentid!)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setErr(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subdepartment</DialogTitle><DialogDescription>Create a new subdepartment.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input placeholder="e.g. Quality Assurance" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Department *</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{(departments ?? []).map((d) => <SelectItem key={d.cr4c3_departmentid} value={d.cr4c3_departmentid!}>{d.cr4c3_name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Description</Label><Input placeholder="Optional" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createSubdept.isPending}>{createSubdept.isPending ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setErr(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Subdepartment</DialogTitle><DialogDescription>Update subdepartment details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateSubdept.isPending}>{updateSubdept.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Subdepartment</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSubdept.isPending}>{deleteSubdept.isPending ? "Deleting…" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Processes ──────────────────────────────────────────────────────────────────

function ProcessesTab() {
  const { data: subdepts } = useSubdepartments(undefined, true);
  const { data: incidents } = useIncidents();
  const [selectedSubdept, setSelectedSubdept] = useState<string>("all");
  const effectiveSubdeptId = selectedSubdept !== "all" ? selectedSubdept : undefined;
  const { data: processes, isLoading } = useProcesses(effectiveSubdeptId, true);
  const createProcess = useCreateProcess();
  const updateProcess = useUpdateProcess();
  const deleteProcess = useDeleteProcess();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Cr4c3_processesBase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [subdeptId, setSubdeptId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [err, setErr] = useState("");

  const handleAdd = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!subdeptId) { setErr("Subdepartment is required."); return; }
    await createProcess.mutateAsync({ cr4c3_name: name.trim(), cr4c3_description: desc.trim() || undefined, _cr4c3_subdepartment_value: subdeptId });
    setAddOpen(false); setName(""); setDesc(""); setSubdeptId("");
  };

  const openEdit = (p: Cr4c3_processesBase) => {
    setEditItem(p); setEditName(p.cr4c3_name ?? ""); setEditDesc(p.cr4c3_description ?? ""); setErr("");
  };

  const handleEdit = async () => {
    setErr("");
    if (!editName.trim()) { setErr("Name is required."); return; }
    await updateProcess.mutateAsync({ id: editItem!.cr4c3_processid!, fields: { cr4c3_name: editName.trim(), cr4c3_description: editDesc.trim() || undefined } });
    setEditItem(null);
  };

  const handleDelete = async () => {
    const refCount = (incidents ?? []).filter((i) => i._cr4c3_process_value === deleteId).length;
    if (refCount > 0) { toast.error(`Cannot delete — ${refCount} incident${refCount > 1 ? "s" : ""} reference this process`); setDeleteId(null); return; }
    await deleteProcess.mutateAsync(deleteId!);
    setDeleteId(null);
  };

  return (
    <>
      <GlassCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Processes</h3>
          <div className="flex items-center gap-2">
            <Select value={selectedSubdept} onValueChange={setSelectedSubdept}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by subdept" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subdepartments</SelectItem>
                {(subdepts ?? []).map((s) => (
                  <SelectItem key={s.cr4c3_subdepartmentid} value={s.cr4c3_subdepartmentid!}>{s.cr4c3_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setErr(""); setAddOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </div>
        {isLoading ? (
          <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
        ) : (processes ?? []).length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {selectedSubdept && selectedSubdept !== "all" ? "No processes for this subdepartment." : "No processes found."}
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subdepartment</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(processes ?? []).map((p) => (
                <TableRow key={p.cr4c3_processid}>
                  <TableCell className="font-medium text-gray-900">{p.cr4c3_name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{subdepts?.find((s) => s.cr4c3_subdepartmentid === p._cr4c3_subdepartment_value)?.cr4c3_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteId(p.cr4c3_processid!)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setErr(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Process</DialogTitle><DialogDescription>Create a new process.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input placeholder="e.g. Incident Review" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Subdepartment *</Label>
              <Select value={subdeptId} onValueChange={setSubdeptId}>
                <SelectTrigger><SelectValue placeholder="Select subdepartment" /></SelectTrigger>
                <SelectContent>{(subdepts ?? []).map((s) => <SelectItem key={s.cr4c3_subdepartmentid} value={s.cr4c3_subdepartmentid!}>{s.cr4c3_name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Description</Label><Input placeholder="Optional" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createProcess.isPending}>{createProcess.isPending ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setErr(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Process</DialogTitle><DialogDescription>Update process details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateProcess.isPending}>{updateProcess.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Process</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProcess.isPending}>{deleteProcess.isPending ? "Deleting…" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Teams ──────────────────────────────────────────────────────────────────────

function TeamsTab() {
  const { data: processes } = useProcesses(undefined, true);
  const { data: incidents } = useIncidents();
  const [selectedProcess, setSelectedProcess] = useState<string>("all");
  const effectiveProcessId = selectedProcess !== "all" ? selectedProcess : undefined;
  const { data: teams, isLoading } = useTeams(effectiveProcessId, true);
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Cr4c3_teamsBase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [processId, setProcessId] = useState("");
  const [shift, setShift] = useState("");
  const [editName, setEditName] = useState("");
  const [editShift, setEditShift] = useState("");
  const [err, setErr] = useState("");

  const shiftLabel = (v?: number | null) =>
    v === TEAM_SHIFT.Morning ? "Morning" : v === TEAM_SHIFT.Evening ? "Evening" : v === TEAM_SHIFT.Night ? "Night" : "—";

  const handleAdd = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!processId) { setErr("Process is required."); return; }
    if (!shift) { setErr("Shift is required."); return; }
    await createTeam.mutateAsync({ cr4c3_name: name.trim(), cr4c3_shift: Number(shift), _cr4c3_process_value: processId });
    setAddOpen(false); setName(""); setProcessId(""); setShift("");
  };

  const openEdit = (t: Cr4c3_teamsBase) => {
    setEditItem(t); setEditName(t.cr4c3_name ?? ""); setEditShift(String(t.cr4c3_shift ?? "")); setErr("");
  };

  const handleEdit = async () => {
    setErr("");
    if (!editName.trim()) { setErr("Name is required."); return; }
    await updateTeam.mutateAsync({ id: editItem!.cr4c3_teamid!, fields: { cr4c3_name: editName.trim(), cr4c3_shift: Number(editShift) } });
    setEditItem(null);
  };

  const handleDelete = async () => {
    const refCount = (incidents ?? []).filter((i) => i._cr4c3_team_value === deleteId).length;
    if (refCount > 0) { toast.error(`Cannot delete — ${refCount} incident${refCount > 1 ? "s" : ""} reference this team`); setDeleteId(null); return; }
    await deleteTeam.mutateAsync(deleteId!);
    setDeleteId(null);
  };

  return (
    <>
      <GlassCard>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Teams</h3>
          <div className="flex items-center gap-2">
            <Select value={selectedProcess} onValueChange={setSelectedProcess}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by process" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Processes</SelectItem>
                {(processes ?? []).map((p) => (
                  <SelectItem key={p.cr4c3_processid} value={p.cr4c3_processid!}>{p.cr4c3_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setErr(""); setAddOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </div>
        {isLoading ? (
          <div className="p-4"><SkeletonTable rows={5} columns={4} /></div>
        ) : (teams ?? []).length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {selectedProcess && selectedProcess !== "all" ? "No teams for this process." : "No teams found."}
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Process</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(teams ?? []).map((t) => (
                <TableRow key={t.cr4c3_teamid}>
                  <TableCell className="font-medium text-gray-900">{t.cr4c3_name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{processes?.find((p) => p.cr4c3_processid === t._cr4c3_process_value)?.cr4c3_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{shiftLabel(t.cr4c3_shift)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(t)}>
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteId(t.cr4c3_teamid!)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setErr(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Team</DialogTitle><DialogDescription>Create a new team.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input placeholder="e.g. Alpha Team" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Process *</Label>
              <Select value={processId} onValueChange={setProcessId}>
                <SelectTrigger><SelectValue placeholder="Select process" /></SelectTrigger>
                <SelectContent>{(processes ?? []).map((p) => <SelectItem key={p.cr4c3_processid} value={p.cr4c3_processid!}>{p.cr4c3_name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Shift *</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(TEAM_SHIFT.Morning)}>Morning</SelectItem>
                  <SelectItem value={String(TEAM_SHIFT.Evening)}>Evening</SelectItem>
                  <SelectItem value={String(TEAM_SHIFT.Night)}>Night</SelectItem>
                </SelectContent>
              </Select></div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createTeam.isPending}>{createTeam.isPending ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setErr(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Team</DialogTitle><DialogDescription>Update team details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Shift</Label>
              <Select value={editShift} onValueChange={setEditShift}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(TEAM_SHIFT.Morning)}>Morning</SelectItem>
                  <SelectItem value={String(TEAM_SHIFT.Evening)}>Evening</SelectItem>
                  <SelectItem value={String(TEAM_SHIFT.Night)}>Night</SelectItem>
                </SelectContent>
              </Select></div>
            {err && <p className="text-xs text-red-500">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateTeam.isPending}>{updateTeam.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Team</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTeam.isPending}>{deleteTeam.isPending ? "Deleting…" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
