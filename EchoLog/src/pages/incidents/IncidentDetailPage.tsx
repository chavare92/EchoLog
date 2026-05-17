import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  FileText,
  ShieldCheck,
  GitBranch,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  PlusCircle,
  Download,
  Pencil,
} from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncident, useUpdateIncident } from "@/hooks/useIncidents";
import { useRCASubmissions, useCreateRCA } from "@/hooks/useRCASubmissions";
import { usePreventiveActions, useCreatePA } from "@/hooks/usePreventiveActions";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubdepartments } from "@/hooks/useSubdepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { useTeams } from "@/hooks/useTeams";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { INCIDENT_STATUS, RCA_STATUS, PA_STATUS, SEVERITY } from "@/lib/constants";
import { formatDateTime, formatDate, isOverdue, getRemainingTATMs, formatDuration } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonCard } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_STEPS = [
  { key: INCIDENT_STATUS.Open, label: "Open" },
  { key: INCIDENT_STATUS.InvestigationPending, label: "Investigation" },
  { key: INCIDENT_STATUS.RCASubmitted, label: "RCA Submitted" },
  { key: INCIDENT_STATUS.RCAInReview, label: "In Review" },
  { key: INCIDENT_STATUS.RCAApproved, label: "RCA Approved" },
  { key: INCIDENT_STATUS.PAClosed, label: "Closed" },
];

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAtomValue(currentUserAtom);
  const { isAssignee, isAdmin } = useRoleGuard();

  const { data: incident, isLoading } = useIncident(id);
  const { data: rcaList } = useRCASubmissions(id);
  const { data: paList } = usePreventiveActions(id);
  const { data: auditLogs } = useAuditLogs(id);
  const { data: departments } = useDepartments();
  const { data: allSubdepts } = useSubdepartments(undefined, true);
  const { data: allProcesses } = useProcesses(undefined, true);
  const { data: allTeams } = useTeams(undefined, true);
  const { data: userProfiles } = useUserProfiles();

  const updateIncident = useUpdateIncident();
  const createRCA = useCreateRCA();
  const createPA = useCreatePA();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSeverity, setEditSeverity] = useState("");
  const [rcaDialogOpen, setRcaDialogOpen] = useState(false);
  const [paDialogOpen, setPaDialogOpen] = useState(false);
  const [rcaTitle, setRcaTitle] = useState("");
  const [rcaEffect, setRcaEffect] = useState("");
  const [paTitle, setPaTitle] = useState("");
  const [paDesc, setPaDesc] = useState("");
  const [paDueDate, setPaDueDate] = useState("");

  if (isLoading) return <div className="p-6"><SkeletonCard /></div>;
  if (!incident) return <div className="p-8 text-center text-gray-500">Incident not found.</div>;

  const getDeptName = (val?: string) => departments?.find((d) => d.cr4c3_departmentid === val)?.cr4c3_name;
  const getSubdeptName = (val?: string) => allSubdepts?.find((s) => s.cr4c3_subdepartmentid === val)?.cr4c3_name;
  const getProcessName = (val?: string) => allProcesses?.find((p) => p.cr4c3_processid === val)?.cr4c3_name;
  const getTeamName = (val?: string) => allTeams?.find((t) => t.cr4c3_teamid === val)?.cr4c3_name;
  const getUserName = (val?: string) => userProfiles?.find((u) => u.cr4c3_userprofileid === val)?.cr4c3_fullname;

  const statusIdx = STATUS_STEPS.findIndex((s) => s.key === incident.cr4c3_status);
  const overdue = isOverdue(incident.cr4c3_duedate);
  const remaining = incident.cr4c3_duedate ? getRemainingTATMs(incident.cr4c3_duedate) : null;

  const canSubmitRCA =
    (
      incident.cr4c3_status === INCIDENT_STATUS.Open ||
      incident.cr4c3_status === INCIDENT_STATUS.InvestigationPending ||
      incident.cr4c3_status === INCIDENT_STATUS.RCARejected
    ) &&
    (isAssignee || isAdmin);

  const canEdit = isAdmin || isAssignee;

  const openEditDialog = () => {
    setEditTitle(incident.cr4c3_title ?? "");
    setEditDesc(incident.cr4c3_description ?? "");
    setEditSeverity(String(incident.cr4c3_severity ?? SEVERITY.Medium));
    setEditDialogOpen(true);
  };

  const handleEditIncident = async () => {
    if (!editTitle.trim()) { toast.error("Title is required"); return; }
    await updateIncident.mutateAsync({
      id: id!,
      fields: {
        cr4c3_title: editTitle.trim(),
        cr4c3_description: editDesc.trim(),
        cr4c3_severity: Number(editSeverity),
        cr4c3_updatedat: new Date().toISOString(),
      },
    });
    setEditDialogOpen(false);
    toast.success("Incident updated");
  };

  const canCreatePA = incident.cr4c3_status === INCIDENT_STATUS.RCAApproved && (isAdmin || isAssignee);

  const handleAssignToMe = async () => {
    if (!user?.cr4c3_userprofileid) { toast.error("No user session"); return; }
    await updateIncident.mutateAsync({
      id: id!,
      fields: { _cr4c3_assignee_value: user.cr4c3_userprofileid, cr4c3_status: INCIDENT_STATUS.InvestigationPending },
    });
    toast.success("Assigned to you");
  };

  const handleSubmitRCA = async () => {
    if (!rcaTitle.trim() || !rcaEffect.trim()) { toast.error("Title and effect statement are required"); return; }
    await createRCA.mutateAsync({
      cr4c3_rcatitle: rcaTitle,
      cr4c3_effectstatement: rcaEffect,
      cr4c3_status: RCA_STATUS.Submitted,
      cr4c3_submittedat: new Date().toISOString(),
      _cr4c3_incident_value: id,
      _cr4c3_submittedby_value: user?.cr4c3_userprofileid,
    });
    await updateIncident.mutateAsync({ id: id!, fields: { cr4c3_status: INCIDENT_STATUS.RCASubmitted } });
    setRcaDialogOpen(false);
    setRcaTitle("");
    setRcaEffect("");
    toast.success("RCA submitted");
  };

  const handleCreatePA = async () => {
    if (!paTitle.trim()) { toast.error("Title is required"); return; }
    await createPA.mutateAsync({
      cr4c3_title: paTitle,
      cr4c3_description: paDesc,
      cr4c3_status: PA_STATUS.NotStarted,
      cr4c3_createdat: new Date().toISOString(),
      _cr4c3_incident_value: id,
      _cr4c3_createdby_value: user?.cr4c3_userprofileid,
      ...(paDueDate ? { cr4c3_duedate: paDueDate } : {}),
    });
    setPaDialogOpen(false);
    setPaTitle("");
    setPaDesc("");
    setPaDueDate("");
    toast.success("Preventive action created");
  };

  return (
    <PageWrapper>
      {/* Back + breadcrumb */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
          Back
        </Button>
        <span className="text-gray-300">/</span>
        <span className="text-xs text-gray-500">Incidents</span>
        <span className="text-gray-300">/</span>
        <TicketRef value={incident.cr4c3_ticketreference} />
      </motion.div>

      {/* Header card */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{incident.cr4c3_title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <SeverityBadge severity={incident.cr4c3_severity} />
                  <StatusBadge status={incident.cr4c3_status} />
                  {overdue && incident.cr4c3_status !== INCIDENT_STATUS.PAClosed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      <PulseIndicator color="red" />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={openEditDialog}>
                    <Pencil className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Edit
                  </Button>
                )}
                {!incident._cr4c3_assignee_value && (isAssignee || isAdmin) && (
                  <Button variant="outline" size="sm" onClick={handleAssignToMe}>
                    <UserCheck className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Assign to me
                  </Button>
                )}
              </div>
            </div>

            {/* Time Status Panel */}
            {incident.cr4c3_status !== INCIDENT_STATUS.PAClosed && (
              <div className={`rounded-xl p-4 flex flex-wrap gap-4 ${overdue ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"}`}>
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${overdue ? "text-red-500" : "text-amber-600"}`} aria-hidden="true" />
                  <span className="text-sm font-medium">Due:</span>
                  <TATCountdown dueDate={incident.cr4c3_duedate} />
                </div>
                {remaining !== null && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    {overdue
                      ? <><AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" /> <span className="text-red-600 font-medium">{formatDuration(Math.abs(remaining))} overdue</span></>
                      : <><CheckCircle className="w-4 h-4 text-amber-500" aria-hidden="true" /> <span>{formatDuration(remaining)} remaining</span></>
                    }
                  </div>
                )}
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                {STATUS_STEPS.map((step, i) => (
                  <span key={step.key} className={`${i <= statusIdx ? "text-primary font-medium" : ""}`}>{step.label}</span>
                ))}
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((statusIdx + 1) / STATUS_STEPS.length) * 100}%` }}
                  role="progressbar"
                  aria-valuenow={statusIdx + 1}
                  aria-valuemin={1}
                  aria-valuemax={STATUS_STEPS.length}
                  aria-label="Incident progress"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="details">
          <TabsList className="mb-4" aria-label="Incident sections">
            <TabsTrigger value="details">
              <FileText className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Details
            </TabsTrigger>
            <TabsTrigger value="rca">
              <GitBranch className="w-4 h-4 mr-1.5" aria-hidden="true" />
              RCA {rcaList && rcaList.length > 0 && <span className="ml-1 rounded-full bg-blue-100 px-1.5 text-xs text-blue-700">{rcaList.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="pa">
              <ShieldCheck className="w-4 h-4 mr-1.5" aria-hidden="true" />
              PA {paList && paList.length > 0 && <span className="ml-1 rounded-full bg-green-100 px-1.5 text-xs text-green-700">{paList.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="audit">
              <GitBranch className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Audit
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                {/* Description */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Description</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {incident.cr4c3_description || <span className="text-gray-400 italic">No description provided.</span>}
                  </p>
                </GlassCard>

                {/* Submit RCA CTA — only when open/investigation */}
                {canSubmitRCA && (
                  <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Root Cause Analysis Required</p>
                        <p className="text-xs text-gray-500 mt-0.5">This incident is pending an RCA submission.</p>
                      </div>
                      <Button size="sm" onClick={() => setRcaDialogOpen(true)}>
                        Submit RCA
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Org Path */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                    Org Path
                  </h3>
                  <dl className="space-y-2 text-sm">
                    {[
                      { label: "Department", value: getDeptName(incident._cr4c3_department_value) },
                      { label: "Subdepartment", value: getSubdeptName(incident._cr4c3_subdepartment_value) },
                      { label: "Process", value: getProcessName(incident._cr4c3_process_value) },
                      { label: "Team", value: getTeamName(incident._cr4c3_team_value) },
                    ].map(({ label, value }) => value ? (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="text-gray-900 font-medium text-right">{value}</dd>
                      </div>
                    ) : null)}
                  </dl>
                </GlassCard>

                {/* People */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                    People
                  </h3>
                  <dl className="space-y-2 text-sm">
                    {[
                      { label: "Logged by", value: getUserName(incident._cr4c3_loggedby_value) },
                      { label: "Assignee", value: getUserName(incident._cr4c3_assignee_value) ?? "Unassigned" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className={`font-medium text-right ${value === "Unassigned" ? "text-gray-400 italic" : "text-gray-900"}`}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {incident._cr4c3_assignee_value && (() => {
                    const assignee = userProfiles?.find((u) => u.cr4c3_userprofileid === incident._cr4c3_assignee_value);
                    if (!assignee) return null;
                    const parts = [
                      getDeptName(assignee._cr4c3_department_value),
                      getSubdeptName(assignee._cr4c3_subdepartment_value),
                      getProcessName(assignee._cr4c3_process_value),
                      getTeamName(assignee._cr4c3_team_value),
                    ].filter(Boolean);
                    if (parts.length === 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Assignee Org Path</p>
                        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-700">
                          {parts.map((part, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && <span className="text-gray-300" aria-hidden="true">›</span>}
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium">{part}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </GlassCard>

                {/* Timeline */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Timeline</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">Created</dt>
                      <dd className="text-gray-900 font-medium">{formatDate(incident.cr4c3_createdat)}</dd>
                    </div>
                    {incident.cr4c3_updatedat && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Updated</dt>
                        <dd className="text-gray-900 font-medium">{formatDate(incident.cr4c3_updatedat)}</dd>
                      </div>
                    )}
                  </dl>
                </GlassCard>
              </div>
            </div>
          </TabsContent>

          {/* RCA Tab */}
          <TabsContent value="rca" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Root Cause Analysis</h3>
              <div className="flex gap-2">
                {rcaList?.some((r) => r.cr4c3_status === RCA_STATUS.Approved) && (
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Download className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Export
                  </Button>
                )}
                {canSubmitRCA && (
                  <Button size="sm" onClick={() => setRcaDialogOpen(true)}>
                    <PlusCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Submit RCA
                  </Button>
                )}
              </div>
            </div>
            {!rcaList || rcaList.length === 0 ? (
              <GlassCard className="py-12 text-center">
                <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500 font-medium">No RCA submitted yet</p>
                {canSubmitRCA && (
                  <Button size="sm" className="mt-4" onClick={() => setRcaDialogOpen(true)}>Submit RCA</Button>
                )}
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {rcaList.map((rca) => (
                  <GlassCard key={rca.cr4c3_rcasubmissionid} className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{rca.cr4c3_rcatitle}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDateTime(rca.cr4c3_submittedat)}</p>
                      </div>
                      <StatusBadge status={rca.cr4c3_status} type="rca" />
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{rca.cr4c3_effectstatement}</p>
                    {rca.cr4c3_reviewcomments && (
                      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                        <span className="font-semibold">Review Comments: </span>{rca.cr4c3_reviewcomments}
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PA Tab */}
          <TabsContent value="pa" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Preventive Actions</h3>
              {canCreatePA && (
                <Button size="sm" onClick={() => setPaDialogOpen(true)}>
                  <PlusCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Create PA
                </Button>
              )}
            </div>
            {!paList || paList.length === 0 ? (
              <GlassCard className="py-12 text-center">
                <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500 font-medium">No preventive actions yet</p>
                {canCreatePA && (
                  <Button size="sm" className="mt-4" onClick={() => setPaDialogOpen(true)}>Create PA</Button>
                )}
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {paList.map((pa) => (
                  <GlassCard key={pa.cr4c3_preventiveactionid} className="p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/preventive-actions/${pa.cr4c3_preventiveactionid}`)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{pa.cr4c3_title}</p>
                      {pa.cr4c3_duedate && <p className="text-xs text-gray-400 mt-0.5">Due {formatDate(pa.cr4c3_duedate)}</p>}
                    </div>
                    <StatusBadge status={pa.cr4c3_status} type="pa" />
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Activity Log</h3>
            {!auditLogs || auditLogs.length === 0 ? (
              <GlassCard className="py-12 text-center">
                <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500">No activity recorded yet.</p>
              </GlassCard>
            ) : (
              <div className="relative pl-6 space-y-4" role="list" aria-label="Audit log">
                <div className="absolute left-2 top-2 bottom-2 border-l-2 border-gray-100" aria-hidden="true" />
                {auditLogs.map((log) => (
                  <div key={log.cr4c3_auditlogid} className="relative" role="listitem">
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary border-2 border-white" aria-hidden="true" />
                    <GlassCard className="p-4">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{log.cr4c3_description}</p>
                        <time className="text-xs text-gray-400">{formatDateTime(log.cr4c3_timestamp)}</time>
                      </div>
                      {log.cr4c3_fieldchanged && (
                        <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                          <code className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 line-through">{log.cr4c3_oldvalue ?? "—"}</code>
                          <span className="text-gray-400">→</span>
                          <code className="px-1.5 py-0.5 rounded bg-green-50 text-green-700">{log.cr4c3_newvalue ?? "—"}</code>
                        </div>
                      )}
                    </GlassCard>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Edit Incident Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Incident</DialogTitle>
            <DialogDescription>Update the incident title, description, or severity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title <span className="text-red-500" aria-hidden="true">*</span></Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Incident title…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                placeholder="Describe the incident…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-severity">Severity</Label>
              <Select value={editSeverity} onValueChange={setEditSeverity}>
                <SelectTrigger id="edit-severity" aria-label="Severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(SEVERITY.Critical)}>Critical — 4h TAT</SelectItem>
                  <SelectItem value={String(SEVERITY.High)}>High — 24h TAT</SelectItem>
                  <SelectItem value={String(SEVERITY.Medium)}>Medium — 72h TAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditIncident} disabled={updateIncident.isPending}>
              {updateIncident.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit RCA Dialog */}
      <Dialog open={rcaDialogOpen} onOpenChange={setRcaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Root Cause Analysis</DialogTitle>
            <DialogDescription>Provide a title and root cause effect statement for this incident.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="rca-title">Title <span className="text-red-500" aria-hidden="true">*</span></Label>
              <Input id="rca-title" value={rcaTitle} onChange={(e) => setRcaTitle(e.target.value)} placeholder="RCA title…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rca-effect">Effect Statement <span className="text-red-500" aria-hidden="true">*</span></Label>
              <Textarea id="rca-effect" value={rcaEffect} onChange={(e) => setRcaEffect(e.target.value)} rows={5} placeholder="Describe the root cause and contributing factors…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRcaDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRCA} disabled={createRCA.isPending}>
              {createRCA.isPending ? "Submitting…" : "Submit RCA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PA Dialog */}
      <Dialog open={paDialogOpen} onOpenChange={setPaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Preventive Action</DialogTitle>
            <DialogDescription>Define a preventive action to address this incident.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label htmlFor="pa-title">Title <span className="text-red-500" aria-hidden="true">*</span></Label>
              <Input id="pa-title" value={paTitle} onChange={(e) => setPaTitle(e.target.value)} placeholder="PA title…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pa-desc">Description</Label>
              <Textarea id="pa-desc" value={paDesc} onChange={(e) => setPaDesc(e.target.value)} rows={3} placeholder="What needs to be done…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pa-due">Due Date</Label>
              <input id="pa-due" type="date" value={paDueDate} onChange={(e) => setPaDueDate(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePA} disabled={createPA.isPending}>
              {createPA.isPending ? "Creating…" : "Create PA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
