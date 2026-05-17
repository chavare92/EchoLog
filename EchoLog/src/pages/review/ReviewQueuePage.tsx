import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import { Search, Gavel, CheckCircle, XCircle, Target, AlertTriangle, Zap } from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useRCASubmissions, useUpdateRCA } from "@/hooks/useRCASubmissions";
import { useIncidents, useUpdateIncident } from "@/hooks/useIncidents";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { useCreateAuditLog, useAuditLogs } from "@/hooks/useAuditLogs";
import { useCreateNotification } from "@/hooks/useNotifications";
import { useSLARules } from "@/hooks/useSLARules";
import { RCA_STATUS, INCIDENT_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { evaluateEscalation, escalationReasonLabel } from "@/lib/escalation";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TicketRef } from "@/components/shared/TicketRef";
import { SkeletonCards } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type TabType = "review" | "escalated" | "critical";

const SEVERITY_BORDER: Record<number, string> = {
  564060000: "border-l-red-500",
  564060001: "border-l-amber-400",
  564060002: "border-l-blue-400",
};

export function ReviewQueuePage() {
  const user = useAtomValue(currentUserAtom);
  const { data: allRCAs, isLoading } = useRCASubmissions();
  const { data: incidents } = useIncidents();
  const { data: userProfiles } = useUserProfiles();
  const { data: allAuditLogs } = useAuditLogs();
  const { data: slaRules } = useSLARules();
  const updateRCA = useUpdateRCA();
  const updateIncident = useUpdateIncident();
  const createAuditLog = useCreateAuditLog();
  const createNotification = useCreateNotification();

  const [activeTab, setActiveTab] = useState<TabType>("review");
  const [search, setSearch] = useState("");
  const [selectedRCA, setSelectedRCA] = useState<string | null>(null);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");

  const getIncident = (id?: string) => incidents?.find((i) => i.cr4c3_incidentid === id);
  const getUserName = (id?: string) => userProfiles?.find((u) => u.cr4c3_userprofileid === id)?.cr4c3_fullname ?? "Unknown";

  // ── Escalation daemon (PRD §4.2) — runs on mount + every 5 min ───────────
  const processEscalation = useCallback(async () => {
    if (!allRCAs || !incidents || !allAuditLogs) return;
    for (const rca of allRCAs) {
      const inc = incidents.find((i) => i.cr4c3_incidentid === rca._cr4c3_incident_value);
      const logsForRCA = allAuditLogs.filter((l) => l.cr4c3_entityid === rca.cr4c3_rcasubmissionid);
      const { shouldEscalate, reason } = evaluateEscalation(rca, inc, logsForRCA, slaRules);
      if (!shouldEscalate) continue;
      // Already escalated? Skip to avoid duplicate writes
      if (rca.cr4c3_status === RCA_STATUS.Escalated) continue;
      try {
        await updateRCA.mutateAsync({ id: rca.cr4c3_rcasubmissionid!, fields: { cr4c3_status: RCA_STATUS.Escalated } });
        createAuditLog.mutate({
          cr4c3_entityid: rca.cr4c3_rcasubmissionid,
          cr4c3_entitytype: "RCASubmission",
          cr4c3_description: `RCA auto-escalated: ${escalationReasonLabel(reason)}`,
          cr4c3_timestamp: new Date().toISOString(),
          _cr4c3_actor_value: user?.cr4c3_userprofileid,
          cr4c3_action: 6,
        } as Record<string, unknown>);
        // Notify L2Managers
        const l2Managers = userProfiles?.filter((u) => u.cr4c3_role === 564060003) ?? [];
        for (const _l2 of l2Managers) {
          createNotification.mutate({
            cr4c3_message: `RCA "${rca.cr4c3_rcatitle}" has been escalated (${escalationReasonLabel(reason)})`,
            cr4c3_isread: false,
            cr4c3_createdat: new Date().toISOString(),
            _cr4c3_incident_value: rca._cr4c3_incident_value,
          } as Record<string, unknown>);
        }
      } catch { /* fire-and-forget */ }
    }
  }, [allRCAs, incidents, allAuditLogs, slaRules, userProfiles, user?.cr4c3_userprofileid, updateRCA, createAuditLog, createNotification]);

  const escalationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    processEscalation();
    escalationIntervalRef.current = setInterval(processEscalation, 5 * 60 * 1000);
    return () => { if (escalationIntervalRef.current) clearInterval(escalationIntervalRef.current); };
  }, [processEscalation]);

  // ── Keyboard shortcuts: A = Approve, R = Reject on focused card ──────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!focusedCardId) return;
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "a" || e.key === "A") { openReviewDialog(focusedCardId, "approve"); }
      if (e.key === "r" || e.key === "R") { openReviewDialog(focusedCardId, "reject"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedCardId]);

  const pendingRCAs = useMemo(() =>
    (allRCAs ?? []).filter((r) =>
      r.cr4c3_status === RCA_STATUS.Submitted ||
      r.cr4c3_status === RCA_STATUS.UnderReview ||
      r.cr4c3_status === RCA_STATUS.PendingL1Review ||
      r.cr4c3_status === RCA_STATUS.PendingL2Review
    ), [allRCAs]);

  const criticalRCAs = useMemo(() =>
    pendingRCAs.filter((r) => {
      const inc = getIncident(r._cr4c3_incident_value ?? "");
      return inc?.cr4c3_severity === 564060000;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [pendingRCAs, incidents]);

  const escalatedRCAs = useMemo(() =>
    pendingRCAs.filter((r) => {
      const inc = getIncident(r._cr4c3_incident_value ?? "");
      if (!inc) return false;
      const logsForRCA = (allAuditLogs ?? []).filter((l) => l.cr4c3_entityid === r.cr4c3_rcasubmissionid);
      return evaluateEscalation(r, inc, logsForRCA, slaRules).shouldEscalate;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [pendingRCAs, incidents, allAuditLogs, slaRules]);

  const applySearch = (list: typeof pendingRCAs) =>
    list.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const inc = getIncident(r._cr4c3_incident_value ?? "");
      return (
        r.cr4c3_rcatitle?.toLowerCase().includes(q) ||
        inc?.cr4c3_title?.toLowerCase().includes(q) ||
        inc?.cr4c3_ticketreference?.toLowerCase().includes(q)
      );
    });

  const reviewList = applySearch(pendingRCAs);
  const escalatedList = applySearch(escalatedRCAs);
  const criticalList = applySearch(criticalRCAs);

  const currentList = activeTab === "review" ? reviewList : activeTab === "escalated" ? escalatedList : criticalList;

  const openReviewDialog = (rcaId: string, act: "approve" | "reject") => {
    setSelectedRCA(rcaId);
    setAction(act);
    setComment("");
  };

  const handleReviewSubmit = async () => {
    if (!selectedRCA) return;
    if (action === "reject" && !comment.trim()) { toast.error("Comment is required for rejection"); return; }

    const rca = (allRCAs ?? []).find((r) => r.cr4c3_rcasubmissionid === selectedRCA);
    if (!rca) return;
    const inc = getIncident(rca._cr4c3_incident_value ?? "");

    const newStatus = action === "approve" ? RCA_STATUS.Approved : RCA_STATUS.Rejected;
    const newIncidentStatus = action === "approve" ? INCIDENT_STATUS.RCAApproved : INCIDENT_STATUS.RCARejected;

    await updateRCA.mutateAsync({
      id: selectedRCA,
      fields: {
        cr4c3_status: newStatus,
        cr4c3_reviewcomments: comment || undefined,
        cr4c3_reviewedat: new Date().toISOString(),
        _cr4c3_reviewer_value: user?.cr4c3_userprofileid,
      },
    });

    if (rca._cr4c3_incident_value) {
      await updateIncident.mutateAsync({
        id: rca._cr4c3_incident_value,
        fields: { cr4c3_status: newIncidentStatus },
      });
    }

    await createAuditLog.mutateAsync({
      cr4c3_description: `RCA ${action === "approve" ? "approved" : "rejected"}: ${rca.cr4c3_rcatitle}`,
      cr4c3_entitytype: "RCASubmission",
      cr4c3_entityid: selectedRCA,
      cr4c3_fieldchanged: "cr4c3_status",
      cr4c3_oldvalue: String(rca.cr4c3_status ?? ""),
      cr4c3_newvalue: String(newStatus),
      cr4c3_timestamp: new Date().toISOString(),
      _cr4c3_actor_value: user?.cr4c3_userprofileid,
      cr4c3_actorrole: "Reviewer",
      cr4c3_action: action === "approve" ? 1 : 2,
    });

    if (inc?._cr4c3_loggedby_value) {
      await createNotification.mutateAsync({
        cr4c3_message: `Your RCA "${rca.cr4c3_rcatitle}" has been ${action === "approve" ? "approved" : "rejected"}.${comment ? ` Comment: ${comment}` : ""}`,
        cr4c3_isread: false,
        cr4c3_createdat: new Date().toISOString(),
        _cr4c3_user_value: inc._cr4c3_loggedby_value,
        _cr4c3_incident_value: rca._cr4c3_incident_value,
      });
    }

    setSelectedRCA(null);
    setComment("");
    toast.success(`RCA ${action === "approve" ? "approved" : "rejected"}`);
  };

  return (
    <PageWrapper>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gavel className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Review Queue</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{pendingRCAs.length} RCA{pendingRCAs.length !== 1 ? "s" : ""} pending review</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
            Focus card → <kbd className="font-semibold">A</kbd> approve · <kbd className="font-semibold">R</kbd> reject
          </p>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              placeholder="Search RCAs…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search RCAs"
            />
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 flex-wrap" role="tablist" aria-label="Review categories">
        {([
          { id: "review" as TabType, label: "Pending Review", count: reviewList.length },
          { id: "escalated" as TabType, label: "Escalated", count: escalatedList.length },
          { id: "critical" as TabType, label: "Critical", count: criticalList.length },
        ]).map(({ id, label, count }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
              activeTab === id
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {label}
            {count > 0 && (
              <Badge className={`px-1.5 py-0 text-xs ${activeTab === id ? "bg-white/20 text-white border-0" : "bg-gray-100 text-gray-600 border-0"}`}>
                {count}
              </Badge>
            )}
          </button>
        ))}
      </motion.div>

      {/* Card grid */}
      {isLoading ? (
        <SkeletonCards count={3} />
      ) : currentList.length === 0 ? (
        <motion.div variants={itemVariants}>
          <GlassCard className="py-16 text-center">
            <Gavel className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-gray-500 font-medium">No RCAs in this category</p>
          </GlassCard>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" role="list">
          {currentList.map((rca, idx) => {
            const inc = getIncident(rca._cr4c3_incident_value ?? "");
            const borderColor = SEVERITY_BORDER[inc?.cr4c3_severity ?? 564060002] ?? "border-l-gray-200";
            return (
              <motion.div
                key={rca.cr4c3_rcasubmissionid}
                role="listitem"
                variants={itemVariants}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <GlassCard
                  key={rca.cr4c3_rcasubmissionid}
                  tabIndex={0}
                  onFocus={() => setFocusedCardId(rca.cr4c3_rcasubmissionid ?? null)}
                  onBlur={() => setFocusedCardId(null)}
                  className={`p-5 border-l-4 ${borderColor} h-full flex flex-col gap-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${focusedCardId === rca.cr4c3_rcasubmissionid ? "ring-2 ring-primary/30" : ""}`}
                  aria-label={`RCA: ${rca.cr4c3_rcatitle}. Press A to approve, R to reject.`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                      <TicketRef value={inc?.cr4c3_ticketreference} />
                    </div>
                    <SeverityBadge severity={inc?.cr4c3_severity} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{rca.cr4c3_rcatitle}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{rca.cr4c3_effectstatement}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>By {getUserName(rca._cr4c3_submittedby_value)}</span>
                    <span>{formatDateTime(rca.cr4c3_submittedat)}</span>
                  </div>
                  <StatusBadge status={rca.cr4c3_status} type="rca" />
                  {(() => {
                    const inc = getIncident(rca._cr4c3_incident_value ?? "");
                    const logsForRCA = (allAuditLogs ?? []).filter((l) => l.cr4c3_entityid === rca.cr4c3_rcasubmissionid);
                    const { shouldEscalate, reason } = evaluateEscalation(rca, inc, logsForRCA, slaRules);
                    if (!shouldEscalate) return null;
                    return (
                      <div className="flex items-center gap-1.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2 py-1">
                        <Zap className="w-3 h-3 text-red-600 flex-shrink-0" aria-hidden="true" />
                        <span className="text-xs text-red-700 dark:text-red-400 font-medium">{escalationReasonLabel(reason)}</span>
                      </div>
                    );
                  })()}
                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 focus:ring-green-500" onClick={() => openReviewDialog(rca.cr4c3_rcasubmissionid!, "approve")}>
                      <CheckCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => openReviewDialog(rca.cr4c3_rcasubmissionid!, "reject")}>
                      <XCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                      Reject
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRCA} onOpenChange={(open) => { if (!open) setSelectedRCA(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === "approve"
                ? <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
                : <XCircle className="w-5 h-5 text-red-600" aria-hidden="true" />}
              {action === "approve" ? "Approve RCA" : "Reject RCA"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? "Approving this RCA will move the incident to PA stage."
                : "Rejecting will require the assignee to resubmit. Comment required."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            {action === "reject" && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                A comment is required when rejecting.
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="review-comment">
                {action === "reject" ? "Rejection Reason" : "Comment"}{" "}
                {action === "reject" && <span className="text-red-500" aria-hidden="true">*</span>}
              </Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={action === "approve" ? "Optional comments…" : "Explain the reason for rejection…"}
                aria-required={action === "reject"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRCA(null)}>Cancel</Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={updateRCA.isPending}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {updateRCA.isPending ? "Submitting…" : action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
