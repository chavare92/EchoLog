import { useParams, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import { ArrowLeft, GitBranch, Plus, CheckCircle, XCircle, Users } from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useIncident, useUpdateIncident } from "@/hooks/useIncidents";
import { useRCASubmissions } from "@/hooks/useRCASubmissions";
import { usePreventiveActions } from "@/hooks/usePreventiveActions";
import { useRoleGuard } from "@/auth/useRoleGuard";
import { INCIDENT_STATUS } from "@/lib/constants";
import { formatDateTime, formatDate } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TATCountdown } from "@/components/shared/TATCountdown";
import { TicketRef } from "@/components/shared/TicketRef";
import { PulseIndicator } from "@/components/shared/PulseIndicator";
import { SkeletonCard } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PA_STATUS } from "@/lib/constants";

const STATUS_STEPS = [
  { key: INCIDENT_STATUS.Open, label: "Open" },
  { key: INCIDENT_STATUS.InvestigationPending, label: "Investigation" },
  { key: INCIDENT_STATUS.RCASubmitted, label: "RCA Submitted" },
  { key: INCIDENT_STATUS.RCAInReview, label: "RCA In Review" },
  { key: INCIDENT_STATUS.RCAApproved, label: "RCA Approved" },
  { key: INCIDENT_STATUS.PAClosed, label: "PA Closed" },
];

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isAssignee, canReview } = useRoleGuard();
  const currentUser = useAtomValue(currentUserAtom);

  const { data: incident, isLoading } = useIncident(id);
  const { data: rcaList } = useRCASubmissions(id);
  const { data: paList } = usePreventiveActions(id);
  const updateIncident = useUpdateIncident();

  if (isLoading) return <div className="p-6"><SkeletonCard /></div>;
  if (!incident) return <div className="p-8 text-center text-slate-400">Incident not found.</div>;

  const currentStatusIndex = STATUS_STEPS.findIndex((s) => s.key === incident.cr4c3_status);
  const progressPct = Math.round(((currentStatusIndex + 1) / STATUS_STEPS.length) * 100);

  const completedPAs = paList?.filter((pa) => pa.cr4c3_status === PA_STATUS.Completed).length ?? 0;
  const totalPAs = paList?.length ?? 0;

  const handleAssign = async () => {
    if (!id || !currentUser?.cr4c3_userprofileid) return;
    await updateIncident.mutateAsync({
      id,
      fields: {
        cr4c3_status: INCIDENT_STATUS.InvestigationPending,
        [`_cr4c3_assignee_value`]: currentUser.cr4c3_userprofileid,
      } as never,
    });
  };

  return (
    <PageWrapper>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/incidents")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <TicketRef value={incident.cr4c3_ticketreference} className="text-sm" />
            <SeverityBadge severity={incident.cr4c3_severity} />
            <StatusBadge status={incident.cr4c3_status} />
            {incident.cr4c3_status !== INCIDENT_STATUS.PAClosed && (
              <TATCountdown dueDate={incident.cr4c3_duedate} />
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-1">{incident.cr4c3_title}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {incident.cr4c3_status === INCIDENT_STATUS.Open && (isAdmin || isAssignee) && (
            <Button size="sm" onClick={handleAssign} disabled={updateIncident.isPending}>
              <Users className="w-4 h-4 mr-1" />
              Self-Assign
            </Button>
          )}
          {incident.cr4c3_status === INCIDENT_STATUS.InvestigationPending && isAssignee && (
            <Button size="sm" onClick={() => navigate(`/incidents/${id}/rca`)}>
              <GitBranch className="w-4 h-4 mr-1" />
              Submit RCA
            </Button>
          )}
          {(isAdmin || canReview) && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/pa/create?incidentId=${id}`)}>
              <Plus className="w-4 h-4 mr-1" />
              Add PA
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Description</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{incident.cr4c3_description}</p>
            </GlassCard>
          </motion.div>

          {/* RCA Section */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-300">Root Cause Analysis</h3>
                {incident.cr4c3_status === INCIDENT_STATUS.InvestigationPending && (
                  <Button size="sm" onClick={() => navigate(`/incidents/${id}/rca`)}>
                    <GitBranch className="w-4 h-4 mr-1" />
                    Build RCA
                  </Button>
                )}
              </div>
              {!rcaList || rcaList.length === 0 ? (
                <p className="text-sm text-slate-500">No RCA submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {rcaList.map((rca) => (
                    <div
                      key={rca.cr4c3_rcasubmissionid}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/8"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">{rca.cr4c3_rcatitle}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Submitted {formatDateTime(rca.cr4c3_submittedat)}
                        </p>
                      </div>
                      <StatusBadge status={rca.cr4c3_status} type="rca" />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* PA List */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Preventive Actions</h3>
                  {totalPAs > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">{completedPAs}/{totalPAs} completed</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/pa/create?incidentId=${id}`)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add PA
                </Button>
              </div>
              {totalPAs > 0 && (
                <Progress value={(completedPAs / totalPAs) * 100} className="mb-4" />
              )}
              {!paList || paList.length === 0 ? (
                <p className="text-sm text-slate-500">No preventive actions yet.</p>
              ) : (
                <div className="space-y-2">
                  {paList.map((pa) => (
                    <div
                      key={pa.cr4c3_preventiveactionid}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/8 cursor-pointer hover:bg-white/5"
                      onClick={() => navigate(`/preventive-actions/${pa.cr4c3_preventiveactionid}`)}
                    >
                      <div className="flex items-center gap-2">
                        {pa.cr4c3_status === PA_STATUS.Completed ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="text-sm text-slate-200">{pa.cr4c3_title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={pa.cr4c3_status} type="pa" />
                        <span className="text-xs text-slate-400">Due {formatDate(pa.cr4c3_duedate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Right column — timeline + metadata */}
        <div className="space-y-5">
          {/* Metadata */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Details</h3>
              <dl className="space-y-3">
                {[
                  { label: "Created", value: formatDateTime(incident.cr4c3_createdat) },
                  { label: "Updated", value: formatDateTime(incident.cr4c3_updatedat) },
                  { label: "Due Date", value: formatDateTime(incident.cr4c3_duedate) },
                  { label: "Rejection Count", value: String(incident.cr4c3_rejectioncount ?? 0) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-400 uppercase tracking-wide">{label}</dt>
                    <dd className="text-sm text-slate-200 mt-0.5 font-mono">{value}</dd>
                  </div>
                ))}
              </dl>
            </GlassCard>
          </motion.div>

          {/* Status Timeline */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Progress</h3>
              <Progress value={progressPct} className="mb-4" />
              <div className="space-y-2">
                {STATUS_STEPS.map((step, i) => {
                  const done = i < currentStatusIndex;
                  const active = i === currentStatusIndex;
                  return (
                    <div key={step.key} className="flex items-center gap-2.5">
                      {done ? (
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      ) : active ? (
                        <PulseIndicator color="amber" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0 ml-0.5" />
                      )}
                      <span
                        className={`text-xs ${
                          active
                            ? "text-amber-300 font-semibold"
                            : done
                            ? "text-slate-400"
                            : "text-slate-600"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}
