import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Search } from "lucide-react";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { useUserProfiles, useUpdateUserProfile } from "@/hooks/useUserProfiles";
import { USER_ROLE } from "@/lib/constants";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
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
import type { Cr4c3_userprofilesBase } from "@/generated/models/Cr4c3_userprofilesModel";

const ROLE_LABELS: Record<number, string> = {
  [USER_ROLE.Logger]: "Logger",
  [USER_ROLE.Assignee]: "Assignee",
  [USER_ROLE.L1Manager]: "L1 Manager",
  [USER_ROLE.L2Manager]: "L2 Manager",
  [USER_ROLE.PAOwner]: "PA Owner",
  [USER_ROLE.Admin]: "Admin",
  [USER_ROLE.Member]: "Member",
};

const ROLE_COLORS: Record<number, string> = {
  [USER_ROLE.Admin]: "bg-red-500/20 text-red-300",
  [USER_ROLE.L2Manager]: "bg-purple-500/20 text-purple-300",
  [USER_ROLE.L1Manager]: "bg-blue-500/20 text-blue-300",
  [USER_ROLE.Assignee]: "bg-amber-500/20 text-amber-300",
  [USER_ROLE.PAOwner]: "bg-green-500/20 text-green-300",
  [USER_ROLE.Logger]: "bg-slate-500/20 text-slate-300",
  [USER_ROLE.Member]: "bg-slate-600/20 text-slate-400",
};

export function UsersPage() {
  const { isAdmin } = useRoleGuard();
  const { data: users, isLoading } = useUserProfiles();
  const updateUser = useUpdateUserProfile();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cr4c3_userprofilesBase | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editManager, setEditManager] = useState("");
  const [editL2, setEditL2] = useState("");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Admin access required.</p>
      </div>
    );
  }

  const filtered = (users ?? []).filter(
    (u) =>
      !search ||
      u.cr4c3_fullname?.toLowerCase().includes(search.toLowerCase()) ||
      u.cr4c3_email?.toLowerCase().includes(search.toLowerCase())
  );

  const managers = (users ?? []).filter(
    (u) => u.cr4c3_role === USER_ROLE.L1Manager || u.cr4c3_role === USER_ROLE.L2Manager
  );
  const l2managers = (users ?? []).filter((u) => u.cr4c3_role === USER_ROLE.L2Manager);

  const openEdit = (u: Cr4c3_userprofilesBase) => {
    setEditing(u);
    setEditRole(String(u.cr4c3_role ?? ""));
    setEditManager(u._cr4c3_manager_value ?? "");
    setEditL2(u._cr4c3_l2manager_value ?? "");
  };

  const saveEdit = async () => {
    if (!editing?.cr4c3_userprofileid) return;
    await updateUser.mutateAsync({
      id: editing.cr4c3_userprofileid,
      fields: {
        cr4c3_role: editRole ? Number(editRole) : undefined,
        ...(editManager ? { [`_cr4c3_manager_value`]: editManager } : {}),
        ...(editL2 ? { [`_cr4c3_l2manager_value`]: editL2 } : {}),
      } as Partial<Cr4c3_userprofilesBase>,
    });
    setEditing(null);
  };

  return (
    <PageWrapper title="User Management">
      <motion.div variants={itemVariants} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search users…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <GlassCard>
          {isLoading ? (
            <div className="p-4"><SkeletonTable rows={8} columns={4} /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.cr4c3_userprofileid}>
                    <TableCell className="font-medium text-slate-200">{u.cr4c3_fullname}</TableCell>
                    <TableCell className="text-slate-400 text-sm">{u.cr4c3_email}</TableCell>
                    <TableCell>
                      {u.cr4c3_role !== undefined && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.cr4c3_role] ?? "text-slate-400"}`}>
                          {ROLE_LABELS[u.cr4c3_role] ?? "Unknown"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>
      </motion.div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User — {editing?.cr4c3_fullname}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_ROLE).map(([k, v]) => (
                    <SelectItem key={k} value={String(v)}>{k.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>L1 Manager</Label>
              <Select value={editManager} onValueChange={setEditManager}>
                <SelectTrigger><SelectValue placeholder="Assign L1 manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.cr4c3_userprofileid} value={m.cr4c3_userprofileid!}>
                      {m.cr4c3_fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>L2 Manager</Label>
              <Select value={editL2} onValueChange={setEditL2}>
                <SelectTrigger><SelectValue placeholder="Assign L2 manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {l2managers.map((m) => (
                    <SelectItem key={m.cr4c3_userprofileid} value={m.cr4c3_userprofileid!}>
                      {m.cr4c3_fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
