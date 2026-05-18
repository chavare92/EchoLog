import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Edit2,
  Paperclip,
  MapPin,
  FileText,
  Image,
  File,
  ExternalLink,
  Trash2,
  Users,
} from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { usePreventiveAction, useUpdatePA, useDeletePA } from "@/hooks/usePreventiveActions";
import { usePAEvidences, useCreatePAEvidence } from "@/hooks/usePAEvidences";
import { useAuditLogs, useCreateAuditLog } from "@/hooks/useAuditLogs";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { PA_STATUS } from "@/lib/constants";
import { formatDateTime, formatDate, isOverdue } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonCard } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const FILE_TYPE_MAP: Record<number, string> = {
  564060000: "PDF",
  564060001: "Word",
  564060002: "Excel",
  564060003: "Image",
  564060004: "Other",
};

const UPLOAD_LOCATION_MAP: Record<number, string> = {
  564060000: "OneDrive",
  564060001: "SharePoint",
  564060002: "Other",
};

function FileIcon({ type }: { type?: number }) {
  if (type === 564060003) return <Image className="w-5 h-5 text-blue-500" aria-hidden="true" />;
  if (type === 564060000) return <FileText className="w-5 h-5 text-red-500" aria-hidden="true" />;
  return <File className="w-5 h-5 text-[hsl(var(--foreground-muted))]" aria-hidden="true" />;
}

export function PADetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);

  const guard = useRoleGuard();
  const { data: pa, isLoading } = usePreventiveAction(id);
  const { data: evidences } = usePAEvidences(id);
  const { data: auditLogs } = useAuditLogs(undefined, id);
  const { data: userProfiles } = useUserProfiles();
  const updatePA = useUpdatePA();
  const deletePA = useDeletePA();
  const createAuditLog = useCreateAuditLog();
  const createEvidence = useCreatePAEvidence();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachFileName, setAttachFileName] = useState("");
  const [attachFileUrl, setAttachFileUrl] = useState("");
  const [attachFileType, setAttachFileType] = useState<string>("564060000");
  const [attachLocation, setAttachLocation] = useState<string>("564060000");
  const [reassignPaOpen, setReassignPaOpen] = useState(false);
  const [reassignPaOwner, setReassignPaOwner] = useState("");
  if (isLoading) return <div className="p-6"><SkeletonCard /></div>;
  if (!pa) return <div className="p-8 text-center text-[hsl(var(--foreground-muted))]">Preventive action not found.</div>;

  const isCompleted = pa.cr4c3_status === PA_STATUS.Completed;
  const overdue = !isCompleted && isOverdue(pa.cr4c3_duedate);
  const getUserName = (val?: string) => userProfiles?.find((u) => u.cr4c3_userprofileid === val)?.cr4c3_fullname;

  const handleSaveTitle = async () => {
    if (!draftTitle.trim()) { toast.error("Title cannot be empty"); return; }
    await updatePA.mutateAsync({ id: id!, fields: { cr4c3_title: draftTitle } });
    setIsEditingTitle(false);
    toast.success("Title updated");
  };

  const handleSaveDesc = async () => {
    await updatePA.mutateAsync({ id: id!, fields: { cr4c3_description: draftDesc } });
    setIsEditingDesc(false);
    toast.success("Description updated");
  };

  const handleStatusChange = async (val: string) => {
    await updatePA.mutateAsync({
      id: id!,
      fields: {
        cr4c3_status: Number(val),
        ...(Number(val) === PA_STATUS.Completed ? { cr4c3_completedat: new Date().toISOString() } : {}),
      },
    });
    toast.success("Status updated");
  };

  const handleDueDateChange = async (val: string) => {
    await updatePA.mutateAsync({ id: id!, fields: { cr4c3_duedate: val || undefined } });
    toast.success("Due date updated");
  };

  const handleMarkDone = async () => {
    await updatePA.mutateAsync({
      id: id!,
      fields: { cr4c3_status: PA_STATUS.Completed, cr4c3_completedat: new Date().toISOString() },
    });
    toast.success("Marked as done");
  };

  const canDelete = guard.isAdmin || guard.isL1Manager || guard.isL2Manager;
  const canReassignPA = guard.isAdmin || guard.isL1Manager || guard.isL2Manager;

  const handleReassignPA = async () => {
    if (!reassignPaOwner) return;
    const prev = pa._cr4c3_paowner_value;
    await updatePA.mutateAsync({ id: id!, fields: { _cr4c3_paowner_value: reassignPaOwner } });
    createAuditLog.mutate({
      cr4c3_entityid: id,
      cr4c3_entitytype: "PreventiveAction",
      cr4c3_action: 564060001,
      cr4c3_description: "PA owner changed",
      cr4c3_fieldchanged: "_cr4c3_paowner_value",
      cr4c3_oldvalue: getUserName(prev) ?? prev ?? "—",
      cr4c3_newvalue: getUserName(reassignPaOwner) ?? reassignPaOwner,
      _cr4c3_actor_value: user?.cr4c3_userprofileid,
      cr4c3_timestamp: new Date().toISOString(),
    });
    setReassignPaOpen(false);
    toast.success("PA reassigned");
  };

  const handleDeletePA = async () => {
    await deletePA.mutateAsync(id!);
    toast.success("Preventive action deleted");
    navigate("/preventive-actions");
  };

  const handleAddAttachment = async () => {
    if (!attachFileName.trim() || !attachFileUrl.trim()) { toast.error("File name and URL are required"); return; }
    await createEvidence.mutateAsync({
      cr4c3_filename: attachFileName,
      cr4c3_fileurl: attachFileUrl,
      cr4c3_filetype: Number(attachFileType),
      cr4c3_uploadlocation: Number(attachLocation),
      cr4c3_uploadedat: new Date().toISOString(),
      _cr4c3_preventiveaction_value: id,
    });
    setAttachDialogOpen(false);
    setAttachFileName("");
    setAttachFileUrl("");
    toast.success("Attachment added");
  };

  return (
    <PageWrapper>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 bg-[hsl(var(--background-card)/0.8)] backdrop-blur border-b border-[hsl(var(--border)/0.7)] flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
          Back
        </Button>
        <span className="text-[hsl(var(--border))]">/</span>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-[hsl(var(--foreground-muted))]">
          <Link to="/preventive-actions" className="hover:text-primary transition-colors">Preventive Actions</Link>
          <span className="text-[hsl(var(--border))]">/</span>
          <span className="text-[hsl(var(--foreground))] font-medium truncate max-w-xs">{pa.cr4c3_title}</span>
        </nav>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAttachDialogOpen(true)}>
            <Paperclip className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Attach
          </Button>
          {!isCompleted && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleMarkDone} disabled={updatePA.isPending}>
              <Check className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Mark as Done
            </Button>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200">
              Completed
            </span>
          )}
          {canDelete && (
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              {isEditingTitle ? (
                <div className="space-y-3">
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="text-lg font-bold"
                    aria-label="Edit PA title"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setIsEditingTitle(false); }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveTitle} disabled={updatePA.isPending}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingTitle(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 group">
                  <h2 className="text-xl font-bold text-[hsl(var(--foreground))] flex-1">{pa.cr4c3_title}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    onClick={() => { setDraftTitle(pa.cr4c3_title ?? ""); setIsEditingTitle(true); }}
                    aria-label="Edit title"
                  >
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Overdue banner */}
          {overdue && (
            <motion.div variants={itemVariants} className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-2 text-sm text-red-700">
              <PulseIndicator color="red" />
              <span>This action is overdue. Please update the status or due date.</span>
            </motion.div>
          )}

          {/* Description */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Description</h3>
                {!isEditingDesc && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setDraftDesc(pa.cr4c3_description ?? ""); setIsEditingDesc(true); }}>
                    <Edit2 className="w-3 h-3 mr-1" aria-hidden="true" />
                    Edit
                  </Button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="space-y-3">
                  <Textarea
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    rows={4}
                    aria-label="Edit description"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDesc} disabled={updatePA.isPending}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                  {pa.cr4c3_description || <span className="text-[hsl(var(--foreground-muted))] italic">No description. Click Edit to add one.</span>}
                </p>
              )}
            </GlassCard>
          </motion.div>

          {/* Attachments */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4" aria-hidden="true" />
                  Attachments {evidences && evidences.length > 0 && <span className="ml-1 rounded-full bg-[hsl(var(--background))] px-1.5 text-xs text-[hsl(var(--foreground-muted))]">{evidences.length}</span>}
                </h3>
                <Button variant="outline" size="sm" onClick={() => setAttachDialogOpen(true)}>
                  Add File
                </Button>
              </div>
              {!evidences || evidences.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-[hsl(var(--border))] py-8 text-center text-sm text-[hsl(var(--foreground-muted))]">
                  No attachments yet
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Attachments">
                  {evidences.map((ev) => (
                    <a
                      key={ev.cr4c3_paevidenceid}
                      href={ev.cr4c3_fileurl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="listitem"
                      className="flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--background))] transition-colors group"
                      aria-label={`Open ${ev.cr4c3_filename}`}
                    >
                      <FileIcon type={ev.cr4c3_filetype} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{ev.cr4c3_filename}</p>
                        <p className="text-xs text-[hsl(var(--foreground-muted))]">
                          {FILE_TYPE_MAP[ev.cr4c3_filetype ?? 564060004] ?? "File"} · {UPLOAD_LOCATION_MAP[ev.cr4c3_uploadlocation ?? 564060002] ?? "Unknown"}
                        </p>
                        {ev.cr4c3_uploadedat && <p className="text-xs text-[hsl(var(--foreground-muted))]">{formatDate(ev.cr4c3_uploadedat)}</p>}
                      </div>
                      <ExternalLink className="w-4 h-4 text-[hsl(var(--border))] group-hover:text-primary transition-colors flex-shrink-0" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Activity timeline */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Activity</h3>
              {!auditLogs || auditLogs.length === 0 ? (
                <div className="py-6 text-center text-sm text-[hsl(var(--foreground-muted))]">No activity recorded yet.</div>
              ) : (
                <div className="relative pl-6 space-y-3" role="list" aria-label="Activity timeline">
                  <div className="absolute left-2 top-2 bottom-2 border-l-2 border-[hsl(var(--border)/0.7)]" aria-hidden="true" />
                  {auditLogs.map((log) => (
                    <div key={log.cr4c3_auditlogid} className="relative" role="listitem">
                      <div className="absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white" aria-hidden="true" />
                      <div className="flex justify-between flex-wrap gap-1">
                        <p className="text-sm text-[hsl(var(--foreground))]">{log.cr4c3_description}</p>
                        <time className="text-xs text-[hsl(var(--foreground-muted))]">{formatDateTime(log.cr4c3_timestamp)}</time>
                      </div>
                      {log.cr4c3_fieldchanged && (
                        <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
                          <code className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 line-through">{log.cr4c3_oldvalue ?? "—"}</code>
                          <span className="text-[hsl(var(--foreground-muted))]">→</span>
                          <code className="px-1.5 py-0.5 rounded bg-green-50 text-green-700">{log.cr4c3_newvalue ?? "—"}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Details</h3>
              <Separator />

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="pa-status-select" className="text-xs text-[hsl(var(--foreground-muted))]">Status</Label>
                <Select value={String(pa.cr4c3_status ?? PA_STATUS.NotStarted)} onValueChange={handleStatusChange}>
                  <SelectTrigger id="pa-status-select" aria-label="Change status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(PA_STATUS.NotStarted)}>To Do</SelectItem>
                    <SelectItem value={String(PA_STATUS.InProgress)}>In Progress</SelectItem>
                    <SelectItem value={String(PA_STATUS.Completed)}>Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <Label className="text-xs text-[hsl(var(--foreground-muted))]">Owner</Label>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {getUserName(pa._cr4c3_paowner_value) ?? <span className="text-[hsl(var(--foreground-muted))] italic">Unassigned</span>}
                  </p>
                  {canReassignPA && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => { setReassignPaOwner(pa._cr4c3_paowner_value ?? ""); setReassignPaOpen(true); }}
                    >
                      <Users className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Reassign
                    </Button>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label htmlFor="pa-due-input" className="text-xs text-[hsl(var(--foreground-muted))]">Due Date</Label>
                <input
                  id="pa-due-input"
                  type="date"
                  defaultValue={pa.cr4c3_duedate?.split("T")[0] ?? ""}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring ${overdue ? "border-red-300 text-red-600" : "border-input"}`}
                  aria-label="Due date"
                />
                {overdue && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <PulseIndicator color="red" />
                    Overdue
                  </p>
                )}
              </div>

              {/* Parent incident */}
              {pa._cr4c3_incident_value && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--foreground-muted))]">Parent Incident</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-primary pl-0"
                    onClick={() => navigate(`/incidents/${pa._cr4c3_incident_value}`)}
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    View Incident
                  </Button>
                </div>
              )}

              {/* Created / Completed */}
              <Separator />
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-[hsl(var(--foreground-muted))]">Created</dt>
                  <dd className="text-[hsl(var(--foreground))]">{formatDate(pa.cr4c3_createdat)}</dd>
                </div>
                {pa.cr4c3_completedat && (
                  <div className="flex justify-between">
                    <dt className="text-[hsl(var(--foreground-muted))]">Completed</dt>
                    <dd className="text-[hsl(var(--foreground))]">{formatDate(pa.cr4c3_completedat)}</dd>
                  </div>
                )}
              </dl>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* Attach File Dialog */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attach File</DialogTitle>
            <DialogDescription>Add a link to a file stored in OneDrive or SharePoint.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="att-name">File Name <span className="text-red-500" aria-hidden="true">*</span></Label>
              <Input id="att-name" value={attachFileName} onChange={(e) => setAttachFileName(e.target.value)} placeholder="e.g. evidence_report.pdf" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-url">File URL <span className="text-red-500" aria-hidden="true">*</span></Label>
              <Input id="att-url" value={attachFileUrl} onChange={(e) => setAttachFileUrl(e.target.value)} placeholder="https://…" type="url" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="att-type">File Type</Label>
                <Select value={attachFileType} onValueChange={setAttachFileType}>
                  <SelectTrigger id="att-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FILE_TYPE_MAP).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="att-loc">Location</Label>
                <Select value={attachLocation} onValueChange={setAttachLocation}>
                  <SelectTrigger id="att-loc">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UPLOAD_LOCATION_MAP).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAttachment} disabled={createEvidence.isPending}>
              {createEvidence.isPending ? "Attaching…" : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reassign PA Dialog */}
      <Dialog open={reassignPaOpen} onOpenChange={setReassignPaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign Preventive Action</DialogTitle>
            <DialogDescription>Transfer ownership of this action to another team member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="pa-reassign-select">New Owner</Label>
            <Select value={reassignPaOwner} onValueChange={setReassignPaOwner}>
              <SelectTrigger id="pa-reassign-select"><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>
                {(userProfiles ?? []).map((u) => (
                  <SelectItem key={u.cr4c3_userprofileid} value={u.cr4c3_userprofileid!}>{u.cr4c3_fullname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignPaOpen(false)}>Cancel</Button>
            <Button onClick={handleReassignPA} disabled={!reassignPaOwner || updatePA.isPending}>
              {updatePA.isPending ? "Saving…" : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />Delete Preventive Action
            </DialogTitle>
            <DialogDescription>This will permanently delete "{pa?.cr4c3_title}". This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePA} disabled={deletePA.isPending}>
              {deletePA.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
