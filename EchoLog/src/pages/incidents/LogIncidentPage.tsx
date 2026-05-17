import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { FileWarning, Building2, Layers, Cog, Users, AlertTriangle } from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubdepartments } from "@/hooks/useSubdepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { useTeams } from "@/hooks/useTeams";
import { useCreateIncident, useIncidents } from "@/hooks/useIncidents";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { SEVERITY } from "@/lib/constants";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TicketRef } from "@/components/shared/TicketRef";
import { motion } from "framer-motion";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
  severity: z.string().min(1, "Severity is required"),
  departmentId: z.string().min(1, "Department is required"),
  subdepartmentId: z.string().min(1, "Subdepartment is required"),
  processId: z.string().min(1, "Process is required"),
  teamId: z.string().optional(),
  assigneeId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const SEVERITY_TAT_LABELS: Record<string, string> = {
  "564060000": "4h TAT",
  "564060001": "24h TAT",
  "564060002": "72h TAT",
};

const SEVERITY_DOT_COLORS: Record<string, string> = {
  "564060000": "bg-red-500",
  "564060001": "bg-amber-500",
  "564060002": "bg-blue-500",
};

export function LogIncidentPage() {
  const user = useAtomValue(currentUserAtom);
  const navigate = useNavigate();
  const createIncident = useCreateIncident();

  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ cr4c3_ticketreference?: string; cr4c3_title?: string }>>([]);
  const [pendingSubmit, setPendingSubmit] = useState<FormValues | null>(null);

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const watchDept = watch("departmentId");
  const watchSubdept = watch("subdepartmentId");
  const watchProcess = watch("processId");
  watch("teamId");

  useEffect(() => { setValue("subdepartmentId", ""); setValue("processId", ""); setValue("teamId", ""); }, [watchDept, setValue]);
  useEffect(() => { setValue("processId", ""); setValue("teamId", ""); }, [watchSubdept, setValue]);
  useEffect(() => { setValue("teamId", ""); }, [watchProcess, setValue]);

  const { data: departments } = useDepartments();
  const { data: subdepts } = useSubdepartments(watchDept || undefined);
  const { data: processes } = useProcesses(watchSubdept || undefined);
  const { data: teams } = useTeams(watchProcess || undefined);
  const { data: allUsers } = useUserProfiles();
  const { data: existingIncidents } = useIncidents();

  // Assignee candidates: filter by process if available
  const assigneeCandidates = (allUsers ?? []).filter((u) => {
    if (watchProcess && u._cr4c3_process_value) return u._cr4c3_process_value === watchProcess;
    return true;
  });

  // Determine current step for stepper
  const currentStep = !watchDept ? 0 : !watchSubdept ? 1 : !watchProcess ? 2 : 3;

  // Auto ticket preview
  const ticketPreview = `ECHO-${new Date().getFullYear()}-${String((existingIncidents?.length ?? 0) + 1).padStart(4, "0")}`;

  const checkDuplicates = (title: string) =>
    (existingIncidents ?? []).filter((i) =>
      i.cr4c3_title?.toLowerCase().includes(title.toLowerCase().slice(0, 20))
    ).slice(0, 3);

  const onSubmit = async (values: FormValues) => {
    const dups = checkDuplicates(values.title);
    if (dups.length > 0 && !pendingSubmit) {
      setDuplicates(dups);
      setPendingSubmit(values);
      setDupDialogOpen(true);
      return;
    }
    await doSubmit(values);
  };

  const doSubmit = async (values: FormValues) => {
    const now = new Date().toISOString();
    const created = await createIncident.mutateAsync({
      cr4c3_title: values.title,
      cr4c3_description: values.description,
      cr4c3_severity: Number(values.severity),
      cr4c3_status: 564060000,
      cr4c3_createdat: now,
      cr4c3_updatedat: now,
      _cr4c3_loggedby_value: user?.cr4c3_userprofileid,
      _cr4c3_department_value: values.departmentId,
      _cr4c3_subdepartment_value: values.subdepartmentId,
      _cr4c3_process_value: values.processId,
      ...(values.teamId ? { _cr4c3_team_value: values.teamId } : {}),
      ...(values.assigneeId ? { _cr4c3_assignee_value: values.assigneeId } : {}),
    });
    navigate(`/incidents/${created?.cr4c3_incidentid ?? ""}`);
  };

  const confirmDuplicate = async () => {
    setDupDialogOpen(false);
    if (pendingSubmit) { await doSubmit(pendingSubmit); setPendingSubmit(null); }
  };

  const steps = [
    { label: "Department", icon: Building2 },
    { label: "Subdepartment", icon: Layers },
    { label: "Process", icon: Cog },
    { label: "Team", icon: Users, optional: true },
  ];

  return (
    <PageWrapper>
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileWarning className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Log New Incident</h2>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-gray-500">Reference preview:</span>
          <TicketRef value={ticketPreview} />
        </div>
      </motion.div>

      {/* Stepper */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </GlassCard>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Organizational Path */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
              Organizational Path
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1.5">
                <Label htmlFor="dept-select">Department <span className="text-red-500" aria-hidden="true">*</span></Label>
                <Controller name="departmentId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="dept-select" aria-required="true" aria-invalid={!!errors.departmentId}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {(departments ?? []).map((d) => (
                        <SelectItem key={d.cr4c3_departmentid} value={d.cr4c3_departmentid!}>{d.cr4c3_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.departmentId && <p className="text-xs text-red-600" role="alert">{errors.departmentId.message}</p>}
              </div>

              {/* Subdepartment */}
              <div className="space-y-1.5">
                <Label htmlFor="subdept-select">Subdepartment <span className="text-red-500" aria-hidden="true">*</span></Label>
                <Controller name="subdepartmentId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!watchDept}>
                    <SelectTrigger id="subdept-select" aria-required="true" aria-invalid={!!errors.subdepartmentId}>
                      <SelectValue placeholder={watchDept ? "Select subdepartment" : "Select department first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(subdepts ?? []).map((s) => (
                        <SelectItem key={s.cr4c3_subdepartmentid} value={s.cr4c3_subdepartmentid!}>{s.cr4c3_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.subdepartmentId && <p className="text-xs text-red-600" role="alert">{errors.subdepartmentId.message}</p>}
              </div>

              {/* Process */}
              <div className="space-y-1.5">
                <Label htmlFor="process-select">Process <span className="text-red-500" aria-hidden="true">*</span></Label>
                <Controller name="processId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!watchSubdept}>
                    <SelectTrigger id="process-select" aria-required="true" aria-invalid={!!errors.processId}>
                      <SelectValue placeholder={watchSubdept ? "Select process" : "Select subdepartment first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(processes ?? []).map((p) => (
                        <SelectItem key={p.cr4c3_processid} value={p.cr4c3_processid!}>{p.cr4c3_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.processId && <p className="text-xs text-red-600" role="alert">{errors.processId.message}</p>}
              </div>

              {/* Team (optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="team-select">Team <span className="text-xs text-gray-400 font-normal">(optional)</span></Label>
                <Controller name="teamId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={!watchProcess}>
                    <SelectTrigger id="team-select">
                      <SelectValue placeholder={watchProcess ? "Select team" : "Select process first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(teams ?? []).map((t) => (
                        <SelectItem key={t.cr4c3_teamid} value={t.cr4c3_teamid!}>{t.cr4c3_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Incident Details */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-primary" aria-hidden="true" />
              Incident Details
            </h3>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="incident-title">Title <span className="text-red-500" aria-hidden="true">*</span></Label>
              <Input id="incident-title" placeholder="Brief description of the incident" aria-required="true" aria-invalid={!!errors.title} {...register("title")} />
              {errors.title && <p className="text-xs text-red-600" role="alert">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="incident-desc">Description <span className="text-red-500" aria-hidden="true">*</span></Label>
              <Textarea id="incident-desc" placeholder="Detailed description of what happened, when, and the impact…" rows={4} aria-required="true" aria-invalid={!!errors.description} {...register("description")} />
              {errors.description && <p className="text-xs text-red-600" role="alert">{errors.description.message}</p>}
            </div>

            {/* Severity */}
            <div className="space-y-1.5">
              <Label>Severity <span className="text-red-500" aria-hidden="true">*</span></Label>
              <div className="flex gap-3" role="radiogroup" aria-label="Severity">
                {(Object.entries(SEVERITY) as Array<[string, number]>).map(([key, val]) => (
                  <Controller key={key} name="severity" control={control} render={({ field }) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={field.value === String(val)}
                      onClick={() => field.onChange(String(val))}
                      className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                        field.value === String(val)
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-gray-200 bg-transparent hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT_COLORS[String(val)]}`} aria-hidden="true" />
                        <SeverityBadge severity={val} />
                      </div>
                      <span className="text-xs text-gray-500">{SEVERITY_TAT_LABELS[String(val)]}</span>
                    </button>
                  )} />
                ))}
              </div>
              {errors.severity && <p className="text-xs text-red-600" role="alert">{errors.severity.message}</p>}
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <Label htmlFor="assignee-select">Assignee <span className="text-xs text-gray-400 font-normal">(optional)</span></Label>
              <Controller name="assigneeId" control={control} render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="assignee-select">
                    <SelectValue placeholder="Assign to a team member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {assigneeCandidates.map((u) => (
                      <SelectItem key={u.cr4c3_userprofileid} value={u.cr4c3_userprofileid!}>{u.cr4c3_fullname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </GlassCard>
        </motion.div>

        {/* Submit */}
        <motion.div variants={itemVariants} className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || createIncident.isPending} className="min-w-32">
            {isSubmitting || createIncident.isPending ? "Submitting…" : "Log Incident"}
          </Button>
        </motion.div>
      </form>

      {/* Duplicate Detection Dialog */}
      <Dialog open={dupDialogOpen} onOpenChange={(open) => { if (!open) { setDupDialogOpen(false); setPendingSubmit(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />
              Possible Duplicate Detected
            </DialogTitle>
            <DialogDescription>
              Similar incidents were found in the same process within the last 7 days. You can still proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-2" role="list" aria-label="Potential duplicates">
            {duplicates.map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200" role="listitem">
                <TicketRef value={d.cr4c3_ticketreference} />
                <span className="text-sm text-gray-700 truncate">{d.cr4c3_title}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDupDialogOpen(false); setPendingSubmit(null); }}>Cancel</Button>
            <Button onClick={confirmDuplicate}>Log Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
