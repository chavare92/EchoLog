import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Search, Plus, Link2, Trash2, Calendar } from "lucide-react";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { useUserProfiles, useUpdateUserProfile, useCreateUserProfile } from "@/hooks/useUserProfiles";
import { useDelegations, useCreateDelegation, useRevokeDelegation } from "@/hooks/useDelegations";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roleLabels";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Cr4c3_userprofilesBase } from "@/generated/models/Cr4c3_userprofilesModel";

import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { USER_ROLE } from "@/lib/constants";

export function UsersPage() {
  const { isAdmin } = useRoleGuard();
  const { data: users, isLoading } = useUserProfiles();
  const updateUser = useUpdateUserProfile();
  const createUser = useCreateUserProfile();
  const { data: delegations, isLoading: delegationsLoading } = useDelegations();
  const createDelegation = useCreateDelegation();
  const revokeDelegation = useRevokeDelegation();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cr4c3_userprofilesBase | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editManager, setEditManager] = useState("");
  const [editL2, setEditL2] = useState("");

  // Add User dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addError, setAddError] = useState("");

  // Add Delegation dialog
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [delDelegatorId, setDelDelegatorId] = useState("");
  const [delDelegateId, setDelDelegateId] = useState("");
  const [delStartDate, setDelStartDate] = useState("");
  const [delEndDate, setDelEndDate] = useState("");
  const [delNote, setDelNote] = useState("");
  const [delError, setDelError] = useState("");

  const getUserName = (id?: string) => (users ?? []).find((u) => u.cr4c3_userprofileid === id)?.cr4c3_fullname ?? id ?? "—";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Admin access required.</p>
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
        ...(editRole ? { cr4c3_role: Number(editRole) } : {}),
        ...(editManager && editManager !== "none" ? { [`_cr4c3_manager_value`]: editManager } : {}),
        ...(editL2 && editL2 !== "none" ? { [`_cr4c3_l2manager_value`]: editL2 } : {}),
      } as Partial<Cr4c3_userprofilesBase>,
    });
    setEditing(null);
  };

  const hashPassword = async (plain: string) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleAddUser = async () => {
    setAddError("");
    if (!addName.trim()) { setAddError("Full name is required."); return; }
    if (!addEmail.trim() || !addEmail.includes("@")) { setAddError("Valid email is required."); return; }
    if (!addPassword.trim()) { setAddError("Password is required."); return; }
    if (!addRole) { setAddError("Role is required."); return; }
    const hashed = await hashPassword(addPassword.trim());
    await createUser.mutateAsync({
      cr4c3_fullname: addName.trim(),
      cr4c3_email: addEmail.trim().toLowerCase(),
      cr4c3_password: hashed,
      cr4c3_role: Number(addRole),
    });
    setAddOpen(false);
    setAddName(""); setAddEmail(""); setAddPassword(""); setAddRole("");
  };

  const handleAddDelegation = async () => {
    setDelError("");
    if (!delDelegatorId) { setDelError("Delegator is required."); return; }
    if (!delDelegateId) { setDelError("Delegate is required."); return; }
    if (delDelegatorId === delDelegateId) { setDelError("Delegator and delegate must be different users."); return; }
    if (!delStartDate) { setDelError("Start date is required."); return; }
    if (!delEndDate) { setDelError("End date is required."); return; }
    if (delEndDate < delStartDate) { setDelError("End date must be on or after start date."); return; }
    await createDelegation.mutateAsync({
      _cr4c3_delegator_value: delDelegatorId,
      _cr4c3_delegate_value: delDelegateId,
      cr4c3_startdate: delStartDate,
      cr4c3_enddate: delEndDate,
      cr4c3_note: delNote.trim() || undefined,
    } as never);
    setDelegationOpen(false);
    setDelDelegatorId(""); setDelDelegateId(""); setDelStartDate(""); setDelEndDate(""); setDelNote("");
  };

  return (
    <PageWrapper title="User Management">
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="delegations">Delegations</TabsTrigger>
          </TabsList>

          {/* ── Users Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="users" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search users…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <GlassCard>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Users ({filtered.length})</h3>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add User
                </Button>
              </div>
              {isLoading ? (
                <div className="p-4"><SkeletonTable rows={8} columns={4} /></div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">
                  {search ? "No users match your search." : "No users yet. Click Add User to create the first profile."}
                </div>
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
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">{u.cr4c3_fullname}</TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400 text-sm">{u.cr4c3_email}</TableCell>
                        <TableCell>
                          {u.cr4c3_role !== undefined && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.cr4c3_role] ?? "text-gray-500"}`}>
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
          </TabsContent>

          {/* ── Delegations Tab ───────────────────────────────────────────── */}
          <TabsContent value="delegations" className="space-y-4">
            <GlassCard>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Delegations ({delegations?.length ?? 0})
                </h3>
                <Button size="sm" onClick={() => { setDelError(""); setDelegationOpen(true); }}>
                  <Link2 className="w-4 h-4 mr-1" />
                  Add Delegation
                </Button>
              </div>
              {delegationsLoading ? (
                <div className="p-4"><SkeletonTable rows={4} columns={5} /></div>
              ) : !delegations || delegations.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">
                  No delegations configured. Add one to allow users to act on behalf of others.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delegator</TableHead>
                      <TableHead>Delegate</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegations.map((d) => {
                      const today = new Date().toISOString().slice(0, 10);
                      const isActive = (d.cr4c3_startdate ?? "") <= today && (d.cr4c3_enddate ?? "") >= today;
                      return (
                        <TableRow key={d.cr4c3_delegationid as string}>
                          <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                            {getUserName(d._cr4c3_delegator_value)}
                          </TableCell>
                          <TableCell className="text-gray-700 dark:text-gray-300">
                            {getUserName(d._cr4c3_delegate_value)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {d.cr4c3_startdate ? new Date(d.cr4c3_startdate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {d.cr4c3_enddate ? new Date(d.cr4c3_enddate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                            <span className="flex items-center gap-2">
                              {isActive && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                                  <Calendar className="w-3 h-3" />Active
                                </span>
                              )}
                              {d.cr4c3_note ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => revokeDelegation.mutate(d.cr4c3_delegationid as string)}
                              disabled={revokeDelegation.isPending}
                              aria-label="Revoke delegation"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </GlassCard>
          </TabsContent>
        </Tabs>
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

      {/* Add User dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setAddError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. Jane Smith" value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="jane@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" placeholder="Initial password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_ROLE).map(([k, v]) => (
                    <SelectItem key={k} value={String(v)}>{k.replace(/([A-Z])/g, " $1").trim()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addError && <p className="text-xs text-red-600">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={createUser.isPending}>
              {createUser.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Delegation dialog */}
      <Dialog open={delegationOpen} onOpenChange={(o) => { if (!o) { setDelegationOpen(false); setDelError(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Delegation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Delegator (from) *</Label>
              <Select value={delDelegatorId} onValueChange={setDelDelegatorId}>
                <SelectTrigger><SelectValue placeholder="Who is delegating?" /></SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.cr4c3_userprofileid} value={u.cr4c3_userprofileid!}>
                      {u.cr4c3_fullname} — {ROLE_LABELS[u.cr4c3_role ?? -1] ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Delegate (to) *</Label>
              <Select value={delDelegateId} onValueChange={setDelDelegateId}>
                <SelectTrigger><SelectValue placeholder="Who is acting?" /></SelectTrigger>
                <SelectContent>
                  {(users ?? []).filter((u) => u.cr4c3_userprofileid !== delDelegatorId).map((u) => (
                    <SelectItem key={u.cr4c3_userprofileid} value={u.cr4c3_userprofileid!}>
                      {u.cr4c3_fullname} — {ROLE_LABELS[u.cr4c3_role ?? -1] ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <input type="date" value={delStartDate} onChange={(e) => setDelStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <input type="date" value={delEndDate} onChange={(e) => setDelEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input placeholder="Optional reason or note" value={delNote} onChange={(e) => setDelNote(e.target.value)} />
            </div>
            {delError && <p className="text-xs text-red-600">{delError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelegationOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDelegation} disabled={createDelegation.isPending}>
              {createDelegation.isPending ? "Saving…" : "Create Delegation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
