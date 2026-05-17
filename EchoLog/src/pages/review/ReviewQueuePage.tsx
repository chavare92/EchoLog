import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { useRCASubmissions, useUpdateRCA } from "@/hooks/useRCASubmissions";
import { useIncidents } from "@/hooks/useIncidents";
import { RCA_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { SkeletonCards } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReviewAction = "approve" | "reject";

export function ReviewQueuePage() {
  const navigate = useNavigate();
  const { isAdmin, isL1Manager, isL2Manager } = useRoleGuard();
  const { data: allRCAs, isLoading } = useRCASubmissions();
  const { data: incidents } = useIncidents();
  const updateRCA = useUpdateRCA();

  const [selectedRCA, setSelectedRCA] = useState<string | null>(null);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");

  if (!isAdmin && !isL1Manager && !isL2Manager) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to access the review queue.</p>
      </div>
    );
  }

  const pendingRCAs = (allRCAs ?? []).filter(
    (r) =>
      r.cr4c3_status === RCA_STATUS.Submitted ||
      r.cr4c3_status === RCA_STATUS.UnderReview ||
      r.cr4c3_status === RCA_STATUS.PendingL1Review ||
      r.cr4c3_status === RCA_STATUS.PendingL2Review
  );

  const getIncident = (rcaIncidentId: string | undefined) =>
    incidents?.find((i) => i.cr4c3_incidentid === rcaIncidentId);

  const openDialog = (rcaId: string, a: ReviewAction) => {
    setSelectedRCA(rcaId);
    setAction(a);
    setComment("");
    setCommentError("");
  };

  const handleReview = async () => {
    if (!comment.trim()) {
      setCommentError("A comment is required for review decisions.");
      return;
    }
    if (!selectedRCA || !action) return;

    const rca = pendingRCAs.find((r) => r.cr4c3_rcasubmissionid === selectedRCA);
    if (!rca) return;

    let newStatus: number;
    if (action === "approve") {
      newStatus =
        rca.cr4c3_status === RCA_STATUS.Submitted
          ? RCA_STATUS.UnderReview
          : RCA_STATUS.Approved;
    } else {
      newStatus = RCA_STATUS.Rejected;
    }

    await updateRCA.mutateAsync({
      id: selectedRCA,
      fields: {
        cr4c3_status: newStatus,
        cr4c3_reviewcomments: comment,
        cr4c3_reviewedat: new Date().toISOString(),
      },
    });

    setSelectedRCA(null);
    setAction(null);
    setComment("");
  };

  return (
    <PageWrapper title="Review Queue">
      {isLoading ? (
        <SkeletonCards count={4} />
      ) : pendingRCAs.length === 0 ? (
        <motion.div variants={itemVariants}>
          <GlassCard className="py-16 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No RCA submissions pending review.</p>
          </GlassCard>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {pendingRCAs.map((rca) => {
            const inc = getIncident(rca._cr4c3_incident_value);
            return (
              <motion.div key={rca.cr4c3_rcasubmissionid} variants={itemVariants}>
                <GlassCard className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {inc && <TicketRef value={inc.cr4c3_ticketreference} />}
                        {inc && <SeverityBadge severity={inc.cr4c3_severity} />}
                        <StatusBadge status={rca.cr4c3_status} type="rca" />
                        <span className="text-xs text-gray-400">
                          <Clock className="inline w-3 h-3 mr-0.5" />
                          {formatDateTime(rca.cr4c3_submittedat)}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-gray-900 truncate">{rca.cr4c3_rcatitle}</p>
                      {inc && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{inc.cr4c3_title}</p>
                      )}
                      {rca.cr4c3_effectstatement && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{rca.cr4c3_effectstatement}</p>
                      )}
                      {inc && (
                        <div className="mt-2">
                          <TATCountdown dueDate={inc.cr4c3_duedate} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/incidents/${rca._cr4c3_incident_value}`)}
                      >
                        View Incident
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-500 text-white border-0"
                        onClick={() => openDialog(rca.cr4c3_rcasubmissionid!, "approve")}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDialog(rca.cr4c3_rcasubmissionid!, "reject")}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
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
            <DialogTitle>
              {action === "approve" ? "Approve RCA" : "Reject RCA"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? "Confirm approval. Add a comment to support your decision."
                : "Reject this RCA submission and provide feedback for revision."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="review-comment">
              Review Comment <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => { setComment(e.target.value); setCommentError(""); }}
              placeholder="Add your review comments here…"
              rows={4}
            />
            {commentError && <p className="text-xs text-red-600">{commentError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRCA(null)}>Cancel</Button>
            <Button
              onClick={handleReview}
              disabled={updateRCA.isPending}
              className={action === "reject" ? "bg-red-600 hover:bg-red-500 border-0 text-white" : ""}
            >
              {updateRCA.isPending
                ? "Processing…"
                : action === "approve"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
