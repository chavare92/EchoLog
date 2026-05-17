import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { usePreventiveAction, useUpdatePA } from "@/hooks/usePreventiveActions";
import { useIncident } from "@/hooks/useIncidents";
import { PA_STATUS } from "@/lib/constants";
import { formatDateTime, formatDate, isOverdue } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TicketRef } from "@/components/shared/TicketRef";
import { SkeletonCard } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const STATUS_PROGRESSION: Record<number, number> = {
  [PA_STATUS.NotStarted]: PA_STATUS.InProgress,
  [PA_STATUS.InProgress]: PA_STATUS.Completed,
};

export function PADetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pa, isLoading } = usePreventiveAction(id);
  const { data: incident } = useIncident(pa?._cr4c3_incident_value);
  const updatePA = useUpdatePA();

  if (isLoading) return <div className="p-6"><SkeletonCard /></div>;
  if (!pa) return <div className="p-8 text-center text-gray-500">Preventive action not found.</div>;

  const overdue = pa.cr4c3_status !== PA_STATUS.Completed && isOverdue(pa.cr4c3_duedate);
  const progressValue =
    pa.cr4c3_status === PA_STATUS.NotStarted
      ? 0
      : pa.cr4c3_status === PA_STATUS.InProgress
      ? 50
      : 100;

  const nextStatus = STATUS_PROGRESSION[pa.cr4c3_status ?? PA_STATUS.NotStarted];
  const nextLabel =
    nextStatus === PA_STATUS.InProgress ? "Mark In Progress" : "Mark Completed";

  const advance = async () => {
    if (!id || nextStatus === undefined) return;
    await updatePA.mutateAsync({
      id,
      fields: {
        cr4c3_status: nextStatus,
        ...(nextStatus === PA_STATUS.Completed
          ? { cr4c3_completedat: new Date().toISOString() }
          : {}),
      },
    });
  };

  return (
    <PageWrapper>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/preventive-actions")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={pa.cr4c3_status} type="pa" />
            {overdue && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">{pa.cr4c3_title}</h2>
        </div>
        {nextStatus !== undefined && pa.cr4c3_status !== PA_STATUS.Completed && (
          <Button size="sm" onClick={advance} disabled={updatePA.isPending}>
            {nextStatus === PA_STATUS.Completed ? (
              <CheckCircle className="w-4 h-4 mr-1" />
            ) : (
              <Clock className="w-4 h-4 mr-1" />
            )}
            {nextLabel}
          </Button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {pa.cr4c3_description ?? "No description provided."}
              </p>
            </GlassCard>
          </motion.div>

          {/* Linked Incident */}
          {incident && (
            <motion.div variants={itemVariants}>
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Linked Incident</h3>
                <div
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 border border-gray-200 cursor-pointer hover:bg-gray-200"
                  onClick={() => navigate(`/incidents/${incident.cr4c3_incidentid}`)}
                >
                  <TicketRef value={incident.cr4c3_ticketreference} />
                  <span className="text-sm text-gray-900 flex-1 truncate">{incident.cr4c3_title}</span>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Metadata + Progress */}
        <div className="space-y-5">
          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Progress</h3>
              <Progress value={progressValue} className="mb-3" />
              <p className="text-xs text-gray-500 text-right">{progressValue}%</p>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
              <dl className="space-y-3">
                {[
                  { label: "Created", value: formatDateTime(pa.cr4c3_createdat) },
                  { label: "Due Date", value: formatDate(pa.cr4c3_duedate) },
                  { label: "Completed At", value: pa.cr4c3_completedat ? formatDateTime(pa.cr4c3_completedat) : "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
                    <dd className={`text-sm mt-0.5 font-mono ${label === "Due Date" && overdue ? "text-red-600" : "text-gray-900"}`}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}
