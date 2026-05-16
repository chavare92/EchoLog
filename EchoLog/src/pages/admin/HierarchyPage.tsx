import { useState } from "react";
import { motion } from "framer-motion";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubdepartments } from "@/hooks/useSubdepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { useTeams } from "@/hooks/useTeams";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { SkeletonTable } from "@/components/shared/Skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  return (
    <GlassCard>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-300">Departments ({departments?.length ?? 0})</h3>
        <p className="text-xs text-slate-500">Managed in Dataverse</p>
      </div>
      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={2} /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(departments ?? []).map((d) => (
              <TableRow key={d.cr4c3_departmentid}>
                <TableCell className="text-slate-200">{d.cr4c3_name}</TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{d.cr4c3_departmentid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
  );
}

function SubdepartmentsTab() {
  const { data: departments } = useDepartments();
  const [selectedDept, setSelectedDept] = useState<string>("");
  const { data: subdepts, isLoading } = useSubdepartments(selectedDept || undefined);

  return (
    <GlassCard>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-300">Subdepartments</h3>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(departments ?? []).map((d) => (
              <SelectItem key={d.cr4c3_departmentid} value={d.cr4c3_departmentid!}>{d.cr4c3_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
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
  );
}

function ProcessesTab() {
  const { data: subdepts } = useSubdepartments();
  const [selectedSubdept, setSelectedSubdept] = useState<string>("");
  const { data: processes, isLoading } = useProcesses(selectedSubdept || undefined);

  return (
    <GlassCard>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-300">Processes</h3>
        <Select value={selectedSubdept} onValueChange={setSelectedSubdept}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by subdept" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subdepartments</SelectItem>
            {(subdepts ?? []).map((s) => (
              <SelectItem key={s.cr4c3_subdepartmentid} value={s.cr4c3_subdepartmentid!}>{s.cr4c3_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
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
  );
}

function TeamsTab() {
  const { data: processes } = useProcesses();
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const { data: teams, isLoading } = useTeams(selectedProcess || undefined);

  return (
    <GlassCard>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h3 className="text-sm font-semibold text-slate-300">Teams</h3>
        <Select value={selectedProcess} onValueChange={setSelectedProcess}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by process" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Processes</SelectItem>
            {(processes ?? []).map((p) => (
              <SelectItem key={p.cr4c3_processid} value={p.cr4c3_processid!}>{p.cr4c3_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={3} /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Process</TableHead>
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
                <TableCell className="font-mono text-xs text-slate-500">{t.cr4c3_teamid}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </GlassCard>
  );
}
