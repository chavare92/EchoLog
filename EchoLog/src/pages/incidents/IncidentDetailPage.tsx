import { useState, useMemo, useEffect } from "react";
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
  AlertTriangle,
  CheckCircle,
  PlusCircle,
  Download,
  Pencil,
  RotateCcw,
  XCircle,
  PlayCircle,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  History,
  Eye,
} from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncident, useUpdateIncident } from "@/hooks/useIncidents";
import { useRCASubmissions, useCreateRCA, useUpdateRCA } from "@/hooks/useRCASubmissions";
import { usePreventiveActions, useCreatePA } from "@/hooks/usePreventiveActions";
import { useAuditLogs, useCreateAuditLog } from "@/hooks/useAuditLogs";
import {
  useFishboneCauses,
  useCreateFishboneCause,
  useDeleteFishboneCause,
} from "@/hooks/useFishboneCauses";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubdepartments } from "@/hooks/useSubdepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { useTeams } from "@/hooks/useTeams";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { useCreateNotification } from "@/hooks/useNotifications";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { INCIDENT_STATUS, RCA_STATUS, PA_STATUS, SEVERITY, NOTIFICATION_TYPE, FISHBONE_CATEGORY } from "@/lib/constants";
import { formatDateTime, formatDate, isOverdue, getRemainingTATMs, formatDuration } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonCard } from "@/components/shared/Skeletons";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
  const userId = user?.cr4c3_userprofileid;

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
  const updateRCA = useUpdateRCA();
  const createPA = useCreatePA();
  const createAuditLog = useCreateAuditLog();
  const createNotification = useCreateNotification();
  const createFishboneCause = useCreateFishboneCause();
  const deleteFishboneCause = useDeleteFishboneCause();

  // ── Context-aware role resolution (PRD §2.3) ─────────────────────────────
  const guard = useRoleGuard(useMemo(() => ({ incident }), [incident]));

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSeverity, setEditSeverity] = useState("");
  const [paDialogOpen, setPaDialogOpen] = useState(false);
  const [rcaTitle, setRcaTitle] = useState("");
  const [rcaEffect, setRcaEffect] = useState("");
  const [showFishboneDiagram, setShowFishboneDiagram] = useState(false);
  const [addingCauseCategory, setAddingCauseCategory] = useState<number | null>(null);
  const [newCauseText, setNewCauseText] = useState("");
  const [paTitle, setPaTitle] = useState("");
  const [paDesc, setPaDesc] = useState("");
  const [paDueDate, setPaDueDate] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);

  // Sync RCA form fields when existing RCA loads
  useEffect(() => {
    if (rcaList?.[0]) {
      setRcaTitle(rcaList[0].cr4c3_rcatitle ?? "");
      setRcaEffect(rcaList[0].cr4c3_effectstatement ?? "");
    }
  }, [rcaList]);

  const existingRCA = rcaList?.[0];
  const { data: rcaCauses } = useFishboneCauses(existingRCA?.cr4c3_rcasubmissionid);

  if (isLoading) return <div className="p-6"><SkeletonCard /></div>;
  if (!incident) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Incident not found.</div>;

  const getDeptName = (val?: string) => departments?.find((d) => d.cr4c3_departmentid === val)?.cr4c3_name;
  const getSubdeptName = (val?: string) => allSubdepts?.find((s) => s.cr4c3_subdepartmentid === val)?.cr4c3_name;
  const getProcessName = (val?: string) => allProcesses?.find((p) => p.cr4c3_processid === val)?.cr4c3_name;
  const getTeamName = (val?: string) => allTeams?.find((t) => t.cr4c3_teamid === val)?.cr4c3_name;
  const getUserName = (val?: string) => userProfiles?.find((u) => u.cr4c3_userprofileid === val)?.cr4c3_fullname;

  const statusIdx = STATUS_STEPS.findIndex((s) => s.key === incident.cr4c3_status);
  const overdue = isOverdue(incident.cr4c3_duedate);
  const remaining = incident.cr4c3_duedate ? getRemainingTATMs(incident.cr4c3_duedate) : null;

  const status = incident.cr4c3_status;
  const isMyIncident = incident._cr4c3_assignee_value === userId;

  // ── Transition guard conditions (PRD §3.2) ───────────────────────────────
  const canStartInvestigation =
    status === INCIDENT_STATUS.Open &&
    (guard.isAssignee || guard.isAdmin) &&
    isMyIncident;

  const canSubmitRCA =
    (status === INCIDENT_STATUS.Open ||
      status === INCIDENT_STATUS.InvestigationPending ||
      status === INCIDENT_STATUS.RCARejected) &&
    (guard.isAssignee || guard.isAdmin) &&
    (isMyIncident || guard.isAdmin);

  const canCreatePA =
    status === INCIDENT_STATUS.RCAApproved &&
    (guard.isAdmin || guard.isAssignee);

  const canEdit = guard.isAdmin || (guard.isAssignee && isMyIncident);

  const canCancelIncident =
    guard.canCancelIncident &&
    status !== INCIDENT_STATUS.Cancelled &&
    status !== INCIDENT_STATUS.PAClosed;

  const canReopenIncident =
    guard.canReopenIncident &&
    status === INCIDENT_STATUS.PAClosed;

  // ── Notification helper ───────────────────────────────────────────────────
  async function notifyUser(recipientId: string | undefined, message: string) {
    if (!recipientId) return;
    createNotification.mutate({
      cr4c3_message: message,
      cr4c3_type: NOTIFICATION_TYPE.Info,
      _cr4c3_incident_value: id,
      cr4c3_createdat: new Date().toISOString(),
    } as Record<string, unknown>);
  }

  async function writeAuditLog(_action: string, description: string, oldVal?: string, newVal?: string) {
    createAuditLog.mutate({
      cr4c3_entityid: id,
      cr4c3_entitytype: "Incident",
      cr4c3_description: description,
      cr4c3_timestamp: new Date().toISOString(),
      _cr4c3_actor_value: userId,
      ...(oldVal !== undefined ? { cr4c3_oldvalue: oldVal } : {}),
      ...(newVal !== undefined ? { cr4c3_newvalue: newVal } : {}),
    } as Record<string, unknown>);
  }

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

  // Start Investigation (Open → InvestigationPending)
  const handleStartInvestigation = async () => {
    await updateIncident.mutateAsync({
      id: id!,
      fields: { cr4c3_status: INCIDENT_STATUS.InvestigationPending, cr4c3_updatedat: new Date().toISOString() },
    });
    writeAuditLog("StatusChanged", "Investigation started", "Open", "InvestigationPending");
    toast.success("Investigation started");
  };

  const handleSaveDraft = async () => {
    if (!rcaTitle.trim()) { toast.error("Title is required"); return; }
    if (existingRCA) {
      await updateRCA.mutateAsync({
        id: existingRCA.cr4c3_rcasubmissionid!,
        fields: {
          cr4c3_rcatitle: rcaTitle.trim(),
          cr4c3_effectstatement: rcaEffect.trim(),
          cr4c3_status: RCA_STATUS.Draft,
        },
      });
      toast.success("RCA draft saved");
    } else {
      await createRCA.mutateAsync({
        cr4c3_rcatitle: rcaTitle.trim(),
        cr4c3_effectstatement: rcaEffect.trim(),
        cr4c3_status: RCA_STATUS.Draft,
        cr4c3_submittedat: new Date().toISOString(),
        _cr4c3_incident_value: id,
        _cr4c3_submittedby_value: userId,
      });
      writeAuditLog("Created", "RCA draft created");
      toast.success("RCA draft saved");
    }
  };

  const handleSubmitForReview = async () => {
    if (!rcaTitle.trim() || rcaEffect.trim().length < 20) {
      toast.error("Title and effect statement (min 20 chars) are required");
      return;
    }
    if (!existingRCA) { toast.error("Save a draft first"); return; }
    await updateRCA.mutateAsync({
      id: existingRCA.cr4c3_rcasubmissionid!,
      fields: {
        cr4c3_rcatitle: rcaTitle.trim(),
        cr4c3_effectstatement: rcaEffect.trim(),
        cr4c3_status: RCA_STATUS.Submitted,
        cr4c3_submittedat: new Date().toISOString(),
        _cr4c3_submittedby_value: userId,
      },
    });
    await updateIncident.mutateAsync({ id: id!, fields: { cr4c3_status: INCIDENT_STATUS.RCASubmitted, cr4c3_updatedat: new Date().toISOString() } });
    writeAuditLog("StatusChanged", "RCA submitted for review", "Draft", "Submitted");
    notifyUser(incident._cr4c3_loggedby_value, `RCA submitted for ${incident.cr4c3_ticketreference}`);
    toast.success("RCA submitted for review");
  };

  const handleAddCause = async (category: number) => {
    if (!newCauseText.trim() || !existingRCA?.cr4c3_rcasubmissionid) return;
    await createFishboneCause.mutateAsync({
      cr4c3_causetext: newCauseText.trim(),
      cr4c3_category: category,
      _cr4c3_rcasubmission_value: existingRCA.cr4c3_rcasubmissionid,
    } as Record<string, unknown>);
    setNewCauseText("");
    setAddingCauseCategory(null);
  };

  const handleCreatePA = async () => {
    if (!paTitle.trim()) { toast.error("Title is required"); return; }
    await createPA.mutateAsync({
      cr4c3_title: paTitle,
      cr4c3_description: paDesc,
      cr4c3_status: PA_STATUS.NotStarted,
      cr4c3_createdat: new Date().toISOString(),
      _cr4c3_incident_value: id,
      _cr4c3_createdby_value: userId,
      ...(paDueDate ? { cr4c3_duedate: paDueDate } : {}),
    });
    writeAuditLog("Created", `Preventive action "${paTitle}" created`);
    setPaDialogOpen(false);
    setPaTitle("");
    setPaDesc("");
    setPaDueDate("");
    toast.success("Preventive action created");
  };

  // Cancel incident (Admin only)
  const handleCancelIncident = async () => {
    await updateIncident.mutateAsync({
      id: id!,
      fields: { cr4c3_status: INCIDENT_STATUS.Cancelled, cr4c3_updatedat: new Date().toISOString() },
    });
    writeAuditLog("StatusChanged", "Incident cancelled", undefined, "Cancelled");
    notifyUser(incident._cr4c3_assignee_value, `Incident ${incident.cr4c3_ticketreference} has been cancelled`);
    toast.success("Incident cancelled");
  };

  // Re-open incident (Admin/L2Manager) — PRD §3.3
  const handleReopenIncident = async () => {
    // 1. Reset status and SLA timer
    await updateIncident.mutateAsync({
      id: id!,
      fields: {
        cr4c3_status: INCIDENT_STATUS.InvestigationPending,
        cr4c3_updatedat: new Date().toISOString(),
      },
    });
    // 2. Create new linked RCA with parentRcaId pointing to original approved RCA
    const approvedRCA = rcaList?.find((r) => r.cr4c3_status === RCA_STATUS.Approved);
    if (approvedRCA) {
      await createRCA.mutateAsync({
        cr4c3_rcatitle: `${approvedRCA.cr4c3_rcatitle} — Reopened`,
        cr4c3_effectstatement: "",
        cr4c3_status: RCA_STATUS.Draft,
        cr4c3_submittedat: undefined,
        _cr4c3_incident_value: id,
        _cr4c3_submittedby_value: userId,
        cr4c3_parentrcaid: approvedRCA.cr4c3_rcasubmissionid,
      } as Record<string, unknown>);
    }
    // 3. Audit log
    writeAuditLog("Reopened", "Incident reopened — new investigation required", "PAClosed", "InvestigationPending");
    notifyUser(incident._cr4c3_assignee_value, `Incident ${incident.cr4c3_ticketreference} has been reopened`);
    setReopenDialogOpen(false);
    toast.success("Incident reopened");
  };

  return (
    <PageWrapper>
      {/* Back + breadcrumb */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
          Back
        </Button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Incidents</span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <TicketRef value={incident.cr4c3_ticketreference} />
      </motion.div>

      {/* Header card */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{incident.cr4c3_title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <SeverityBadge severity={incident.cr4c3_severity} />
                  <StatusBadge status={incident.cr4c3_status} />
                  {overdue && incident.cr4c3_status !== INCIDENT_STATUS.PAClosed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
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
                {canStartInvestigation && (
                  <Button size="sm" variant="outline" onClick={handleStartInvestigation}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400">
                    <PlayCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Start Investigation
                  </Button>
                )}
                {canReopenIncident && (
                  <Button size="sm" variant="outline" onClick={() => setReopenDialogOpen(true)}
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400">
                    <RotateCcw className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Reopen
                  </Button>
                )}
                {canCancelIncident && (
                  <Button size="sm" variant="outline" onClick={() => setCancelDialogOpen(true)}
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400">
                    <XCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Time Status Panel */}
            {incident.cr4c3_status !== INCIDENT_STATUS.PAClosed && (
              <div className={`rounded-xl p-4 flex flex-wrap gap-4 ${overdue ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"}`}>
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${overdue ? "text-red-500" : "text-amber-600"}`} aria-hidden="true" />
                  <span className="text-sm font-medium">Due:</span>
                  <TATCountdown dueDate={incident.cr4c3_duedate} />
                </div>
                {remaining !== null && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    {overdue
                      ? <><AlertTriangle className="w-4 h-4 text-red-500" aria-hidden="true" /> <span className="text-red-600 dark:text-red-400 font-medium">{formatDuration(Math.abs(remaining))} overdue</span></>
                      : <><CheckCircle className="w-4 h-4 text-amber-500" aria-hidden="true" /> <span>{formatDuration(remaining)} remaining</span></>
                    }
                  </div>
                )}
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                {STATUS_STEPS.map((step, i) => (
                  <span key={step.key} className={`${i <= statusIdx ? "text-primary font-medium" : ""}`}>{step.label}</span>
                ))}
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
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
              RCA {rcaList && rcaList.length > 0 && <span className="ml-1 rounded-full bg-blue-100 dark:bg-blue-950 px-1.5 text-xs text-blue-700 dark:text-blue-400">{rcaList.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="pa">
              <ShieldCheck className="w-4 h-4 mr-1.5" aria-hidden="true" />
              PA {paList && paList.length > 0 && <span className="ml-1 rounded-full bg-green-100 dark:bg-green-950 px-1.5 text-xs text-green-700 dark:text-green-400">{paList.length}</span>}
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
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Description</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {incident.cr4c3_description || <span className="text-gray-400 dark:text-gray-500 italic">No description provided.</span>}
                  </p>
                </GlassCard>

                {/* Submit RCA CTA — only when open/investigation */}
                {canSubmitRCA && (
                  <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Root Cause Analysis Required</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This incident is pending an RCA submission.</p>
                      </div>
                      <Button size="sm" onClick={() => navigate(`/incidents/${id}/rca`)}>
                        <Search className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        Open RCA Builder
                      </Button>
                    </div>
                  </div>
                )}
                {canStartInvestigation && (
                  <div className="rounded-xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-200 dark:border-blue-800 p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ready to Investigate</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Start the investigation to move this incident forward.</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleStartInvestigation}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400">
                        <PlayCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        Start Investigation
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Org Path */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                    Org Path
                  </h3>
                  <dl className="space-y-2 text-sm">
                    {[
                      { label: "Department", value: getDeptName(incident._cr4c3_department_value) },
                      { label: "Subdepartment", value: getSubdeptName(incident._cr4c3_subdepartment_value) },
                      { label: "Process", value: getProcessName(incident._cr4c3_process_value) },
                      { label: "Team", value: getTeamName(incident._cr4c3_team_value) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                        <dd className="text-gray-900 dark:text-gray-100 font-medium text-right">{value ?? "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </GlassCard>

                {/* People */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                    People
                  </h3>
                  <dl className="space-y-2 text-sm">
                    {[
                      { label: "Logged by", value: !userProfiles ? "Loading…" : (getUserName(incident._cr4c3_loggedby_value) ?? "—") },
                      { label: "Assignee", value: !userProfiles ? "Loading…" : (incident._cr4c3_assignee_value ? (getUserName(incident._cr4c3_assignee_value) ?? "—") : "Unassigned") },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                        <dd className={`font-medium text-right ${value === "Unassigned" ? "text-gray-400 dark:text-gray-500 italic" : value === "Loading…" ? "text-gray-400 dark:text-gray-500 animate-pulse" : "text-gray-900 dark:text-gray-100"}`}>{value}</dd>
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
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Assignee Org Path</p>
                        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                          {parts.map((part, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">›</span>}
                              <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-medium">{part}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </GlassCard>

                {/* Timeline */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Timeline</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                      <dd className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(incident.cr4c3_createdat)}</dd>
                    </div>
                    {incident.cr4c3_updatedat && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500 dark:text-gray-400">Updated</dt>
                        <dd className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(incident.cr4c3_updatedat)}</dd>
                      </div>
                    )}
                  </dl>
                </GlassCard>
              </div>
            </div>
          </TabsContent>

          {/* RCA Tab */}
          <TabsContent value="rca" className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Root Cause Analysis</h3>
              <div className="flex gap-2">
                {existingRCA && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/incidents/${id}/rca`)}>
                    <ExternalLink className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Full Editor
                  </Button>
                )}
                {rcaList?.some((r) => r.cr4c3_status === RCA_STATUS.Approved) && (
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Download className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    Export
                  </Button>
                )}
              </div>
            </div>

            {/* Empty state — no RCA yet and user cannot submit */}
            {(!rcaList || rcaList.length === 0) && !canSubmitRCA && (
              <GlassCard className="py-12 text-center">
                <GitBranch className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No RCA submitted yet</p>
              </GlassCard>
            )}

            {/* RCA Header Form — editable when draft/rejected or creating new */}
            {canSubmitRCA && (
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {existingRCA ? "Edit RCA" : "New RCA"}
                    {existingRCA && <StatusBadge status={existingRCA.cr4c3_status} type="rca" className="ml-2 align-middle" />}
                  </h3>
                </div>
                {(!existingRCA || existingRCA.cr4c3_status === RCA_STATUS.Draft || existingRCA.cr4c3_status === RCA_STATUS.Rejected) ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="rca-title-inline">Title <span className="text-red-500" aria-hidden="true">*</span></Label>
                      <Input
                        id="rca-title-inline"
                        value={rcaTitle}
                        onChange={(e) => setRcaTitle(e.target.value)}
                        placeholder="Root cause analysis title…"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rca-effect-inline">Effect Statement <span className="text-red-500" aria-hidden="true">*</span></Label>
                      <Textarea
                        id="rca-effect-inline"
                        value={rcaEffect}
                        onChange={(e) => setRcaEffect(e.target.value)}
                        rows={3}
                        placeholder="Describe the problem/effect (min 20 characters)…"
                      />
                      <p className="text-xs text-gray-400 dark:text-gray-500">{rcaEffect.length} / 2000 characters</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={!rcaTitle.trim() || createRCA.isPending || updateRCA.isPending}
                      >
                        {(createRCA.isPending || updateRCA.isPending) ? "Saving…" : "Save Draft"}
                      </Button>
                      {existingRCA && (rcaCauses?.length ?? 0) > 0 && (
                        <Button
                          size="sm"
                          onClick={handleSubmitForReview}
                          disabled={!rcaTitle.trim() || rcaEffect.length < 20 || updateRCA.isPending}
                        >
                          Submit for Review
                        </Button>
                      )}
                    </div>
                    {existingRCA && (rcaCauses?.length ?? 0) === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        Add at least one cause below before submitting
                      </p>
                    )}
                  </div>
                ) : (
                  // Read-only view for submitted / approved / under review RCA
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Title</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{existingRCA.cr4c3_rcatitle}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Effect Statement</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{existingRCA.cr4c3_effectstatement}</p>
                    </div>
                    {existingRCA.cr4c3_reviewcomments && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
                        <span className="font-semibold">Review Comments: </span>{existingRCA.cr4c3_reviewcomments}
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Read-only RCA summary for viewers */}
            {!canSubmitRCA && existingRCA && (
              <GlassCard className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{existingRCA.cr4c3_rcatitle}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Submitted {formatDateTime(existingRCA.cr4c3_submittedat)}</p>
                  </div>
                  <StatusBadge status={existingRCA.cr4c3_status} type="rca" />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{existingRCA.cr4c3_effectstatement}</p>
                {existingRCA.cr4c3_reviewcomments && (
                  <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Review Comments: </span>{existingRCA.cr4c3_reviewcomments}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Fishbone Cause Manager — shown when an RCA exists */}
            {existingRCA && (
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Fishbone Analysis
                    <span className="ml-2 text-xs font-normal text-gray-400">({rcaCauses?.length ?? 0} cause{(rcaCauses?.length ?? 0) !== 1 ? "s" : ""})</span>
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setShowFishboneDiagram((v) => !v)}>
                    {showFishboneDiagram
                      ? <><Pencil className="w-4 h-4 mr-1.5" aria-hidden="true" />Edit Mode</>
                      : <><Eye className="w-4 h-4 mr-1.5" aria-hidden="true" />View Diagram</>}
                  </Button>
                </div>

                {showFishboneDiagram ? (
                  // SVG Fishbone Diagram
                  <div className="overflow-x-auto rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2">
                    <svg viewBox="0 0 900 500" className="w-full min-w-[600px]" aria-label="Fishbone diagram" role="img">
                      {/* Spine */}
                      <line x1="100" y1="250" x2="790" y2="250" stroke="#d97706" strokeWidth="3" />
                      {/* Effect head */}
                      <rect x="790" y="208" width="98" height="84" rx="8" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1.5" />
                      <text x="839" y="246" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="700">Effect</text>
                      <text x="839" y="261" textAnchor="middle" fill="#78716c" fontSize="9">
                        {(existingRCA.cr4c3_effectstatement ?? "").slice(0, 16)}{(existingRCA.cr4c3_effectstatement?.length ?? 0) > 16 ? "…" : ""}
                      </text>
                      {/* 6 bones: 3 top (People/Process/Technology), 3 bottom (Material/Environment/Management) */}
                      {[
                        { cat: FISHBONE_CATEGORY.People,      label: "People",      x: 200, side: "top",    color: "#9333ea" },
                        { cat: FISHBONE_CATEGORY.Process,     label: "Process",     x: 400, side: "top",    color: "#2563eb" },
                        { cat: FISHBONE_CATEGORY.Technology,  label: "Technology",  x: 600, side: "top",    color: "#0891b2" },
                        { cat: FISHBONE_CATEGORY.Material,    label: "Material",    x: 200, side: "bottom", color: "#d97706" },
                        { cat: FISHBONE_CATEGORY.Environment, label: "Environment", x: 400, side: "bottom", color: "#16a34a" },
                        { cat: FISHBONE_CATEGORY.Management,  label: "Management",  x: 600, side: "bottom", color: "#dc2626" },
                      ].map(({ cat, label, x, side, color }) => {
                        const dy = side === "top" ? -90 : 90;
                        const ty = side === "top" ? 148 : 356;
                        const boneCauses = (rcaCauses ?? []).filter((c) => c.cr4c3_category === cat);
                        return (
                          <g key={cat}>
                            <line x1={x} y1="250" x2={x + 35} y2={250 + dy} stroke={color} strokeWidth="2" opacity="0.8" />
                            <text x={x + 40} y={ty} fill="#1f2937" fontSize="11" fontWeight="700">{label}</text>
                            {boneCauses.slice(0, 4).map((c, ci) => (
                              <text key={c.cr4c3_fishbonecauseid} x={x + 40} y={ty + 14 + ci * 13} fill="#6b7280" fontSize="9">
                                › {(c.cr4c3_causetext ?? "").slice(0, 25)}{(c.cr4c3_causetext?.length ?? 0) > 25 ? "…" : ""}
                              </text>
                            ))}
                            {boneCauses.length > 4 && (
                              <text x={x + 40} y={ty + 14 + 52} fill="#9ca3af" fontSize="8">+{boneCauses.length - 4} more</text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  // Category grid — add / delete causes per category
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { cat: FISHBONE_CATEGORY.People,      label: "People",      color: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-400" },
                      { cat: FISHBONE_CATEGORY.Process,     label: "Process",     color: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400" },
                      { cat: FISHBONE_CATEGORY.Technology,  label: "Technology",  color: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/20 dark:border-cyan-800 dark:text-cyan-400" },
                      { cat: FISHBONE_CATEGORY.Material,    label: "Material",    color: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400" },
                      { cat: FISHBONE_CATEGORY.Environment, label: "Environment", color: "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400" },
                      { cat: FISHBONE_CATEGORY.Management,  label: "Management",  color: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400" },
                    ].map(({ cat, label, color }) => {
                      const categoryCauses = (rcaCauses ?? []).filter((c) => c.cr4c3_category === cat);
                      const canEdit = canSubmitRCA && (existingRCA.cr4c3_status === RCA_STATUS.Draft || existingRCA.cr4c3_status === RCA_STATUS.Rejected);
                      const isAddingThis = addingCauseCategory === cat;
                      return (
                        <div key={cat} className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${color}`}>
                              {label}
                              <span className="rounded-full bg-white/60 dark:bg-gray-900/40 px-1.5 text-xs">{categoryCauses.length}</span>
                            </span>
                            {canEdit && !isAddingThis && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                aria-label={`Add ${label} cause`}
                                onClick={() => { setAddingCauseCategory(cat); setNewCauseText(""); }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                          {isAddingThis && (
                            <div className="flex gap-1.5 mb-2">
                              <Input
                                autoFocus
                                className="h-7 text-xs"
                                value={newCauseText}
                                onChange={(e) => setNewCauseText(e.target.value)}
                                placeholder={`${label} cause…`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newCauseText.trim()) handleAddCause(cat);
                                  if (e.key === "Escape") { setAddingCauseCategory(null); setNewCauseText(""); }
                                }}
                              />
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleAddCause(cat)}
                                disabled={!newCauseText.trim() || createFishboneCause.isPending}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => { setAddingCauseCategory(null); setNewCauseText(""); }}
                              >
                                ✕
                              </Button>
                            </div>
                          )}
                          <div className="space-y-1 min-h-[24px]">
                            {categoryCauses.map((c) => (
                              <div key={c.cr4c3_fishbonecauseid} className="flex items-start gap-1.5 group">
                                <span className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 leading-none flex-shrink-0" aria-hidden="true">›</span>
                                <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{c.cr4c3_causetext}</span>
                                {canEdit && (
                                  <button
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
                                    aria-label="Delete cause"
                                    onClick={() => deleteFishboneCause.mutate(c.cr4c3_fishbonecauseid!)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {categoryCauses.length === 0 && !isAddingThis && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No causes yet</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            )}

            {/* RCA Version History */}
            {rcaList && rcaList.length > 0 && (
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-primary" aria-hidden="true" />
                  Version History
                  <span className="text-xs font-normal text-gray-400 ml-1">({rcaList.length} submission{rcaList.length !== 1 ? "s" : ""})</span>
                </h3>
                <div className="space-y-2">
                  {rcaList.map((rca, i) => (
                    <div
                      key={rca.cr4c3_rcasubmissionid}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${i === 0 ? "bg-primary/5 border border-primary/15" : "bg-gray-50 dark:bg-gray-800/50"}`}
                    >
                      <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                        {rcaList.length - i}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{rca.cr4c3_rcatitle}</p>
                          {i === 0 && (
                            <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">Current</span>
                          )}
                          <StatusBadge status={rca.cr4c3_status} type="rca" />
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDateTime(rca.cr4c3_submittedat)}</p>
                        {rca.cr4c3_reviewcomments && (
                          <p className="mt-1.5 text-xs rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2 py-1 text-amber-700 dark:text-amber-400">
                            <span className="font-medium">Review: </span>{rca.cr4c3_reviewcomments}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </TabsContent>

          {/* PA Tab */}
          <TabsContent value="pa" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Preventive Actions</h3>
              {canCreatePA && (
                <Button size="sm" onClick={() => setPaDialogOpen(true)}>
                  <PlusCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Create PA
                </Button>
              )}
            </div>
            {!paList || paList.length === 0 ? (
              <GlassCard className="py-12 text-center">
                <ShieldCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No preventive actions yet</p>
                {canCreatePA && (
                  <Button size="sm" className="mt-4" onClick={() => setPaDialogOpen(true)}>Create PA</Button>
                )}
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {paList.map((pa) => (
                  <GlassCard key={pa.cr4c3_preventiveactionid} className="p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/preventive-actions/${pa.cr4c3_preventiveactionid}`)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{pa.cr4c3_title}</p>
                      {pa.cr4c3_duedate && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Due {formatDate(pa.cr4c3_duedate)}</p>}
                    </div>
                    <StatusBadge status={pa.cr4c3_status} type="pa" />
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Activity Log</h3>
            {!auditLogs || auditLogs.length === 0 ? (
              <GlassCard className="py-12 text-center">
                <GitBranch className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500 dark:text-gray-400">No activity recorded yet.</p>
              </GlassCard>
            ) : (
              <div className="relative pl-6 space-y-4" role="list" aria-label="Audit log">
                <div className="absolute left-2 top-2 bottom-2 border-l-2 border-gray-100 dark:border-gray-800" aria-hidden="true" />
                {auditLogs.map((log) => (
                  <div key={log.cr4c3_auditlogid} className="relative" role="listitem">
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary border-2 border-white" aria-hidden="true" />
                    <GlassCard className="p-4">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{log.cr4c3_description}</p>
                        <time className="text-xs text-gray-400 dark:text-gray-500">{formatDateTime(log.cr4c3_timestamp)}</time>
                      </div>
                      {log.cr4c3_fieldchanged && (
                        <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                          <code className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 line-through">{log.cr4c3_oldvalue ?? "—"}</code>
                          <span className="text-gray-400 dark:text-gray-500">→</span>
                          <code className="px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400">{log.cr4c3_newvalue ?? "—"}</code>
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

      {/* Cancel Incident (Admin only) */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Incident"
        description={`Are you sure you want to cancel ${incident.cr4c3_ticketreference}? This will halt all RCA and PA work for this incident.`}
        variant="destructive"
        onConfirm={handleCancelIncident}
        confirmLabel="Cancel Incident"
        isLoading={updateIncident.isPending}
      />

      {/* Reopen Incident (Admin / L2Manager) — PRD §3.3 */}
      <ConfirmDialog
        open={reopenDialogOpen}
        onOpenChange={setReopenDialogOpen}
        title="Reopen Incident"
        description={`This will reopen ${incident.cr4c3_ticketreference} to Investigation Pending, reset the SLA timer, and create a new linked RCA. The existing approved RCA will be preserved.`}
        variant="default"
        onConfirm={handleReopenIncident}
        confirmLabel="Reopen Incident"
        isLoading={updateIncident.isPending || createRCA.isPending}
      />
    </PageWrapper>
  );
}
