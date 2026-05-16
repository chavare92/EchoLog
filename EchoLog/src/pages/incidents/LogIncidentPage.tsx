import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { AlertTriangle } from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubdepartments } from "@/hooks/useSubdepartments";
import { useProcesses } from "@/hooks/useProcesses";
import { useTeams } from "@/hooks/useTeams";
import { useCreateIncident, useIncidents } from "@/hooks/useIncidents";
import { SEVERITY } from "@/lib/constants";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { TicketRef } from "@/components/shared/TicketRef";
import { motion } from "framer-motion";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be 200 chars or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
  severity: z.string().min(1, "Severity is required"),
  departmentId: z.string().min(1, "Department is required"),
  subdepartmentId: z.string().min(1, "Subdepartment is required"),
  processId: z.string().min(1, "Process is required"),
  teamId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LogIncidentPage() {
  const user = useAtomValue(currentUserAtom);
  const navigate = useNavigate();
  const createIncident = useCreateIncident();

  const [dupDialogOpen, setDupDialogOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<Array<{ cr4c3_ticketreference?: string; cr4c3_title?: string }>>([]);
  const [pendingSubmit, setPendingSubmit] = useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const watchDept = watch("departmentId");
  const watchSubdept = watch("subdepartmentId");
  const watchProcess = watch("processId");

  // Reset downstream selections when parent changes
  useEffect(() => { setValue("subdepartmentId", ""); setValue("processId", ""); setValue("teamId", ""); }, [watchDept, setValue]);
  useEffect(() => { setValue("processId", ""); setValue("teamId", ""); }, [watchSubdept, setValue]);
  useEffect(() => { setValue("teamId", ""); }, [watchProcess, setValue]);

  const { data: departments } = useDepartments();
  const { data: subdepts } = useSubdepartments(watchDept || undefined);
  const { data: processes } = useProcesses(watchSubdept || undefined);
  const { data: teams } = useTeams(watchProcess || undefined);

  // Duplicate detection
  const { data: existingIncidents } = useIncidents();
  const checkDuplicates = (title: string) => {
    return (existingIncidents ?? []).filter((i) =>
      i.cr4c3_title?.toLowerCase().includes(title.toLowerCase().slice(0, 20))
    );
  };

  const onSubmit = async (values: FormValues) => {
    const dups = checkDuplicates(values.title);
    if (dups.length > 0 && !pendingSubmit) {
      setDuplicates(dups);
      setPendingSubmit(values);
      setDupDialogOpen(true);
      return;
    }
    await submitIncident(values);
  };

  const submitIncident = async (values: FormValues) => {
    const now = new Date().toISOString();
    await createIncident.mutateAsync({
      cr4c3_title: values.title,
      cr4c3_description: values.description,
      cr4c3_severity: Number(values.severity),
      cr4c3_status: 564060000, // Open
      cr4c3_createdat: now,
      cr4c3_updatedat: now,
      [`_cr4c3_loggedby_value`]: user?.cr4c3_userprofileid,
      [`_cr4c3_department_value`]: values.departmentId,
      [`_cr4c3_subdepartment_value`]: values.subdepartmentId,
      [`_cr4c3_process_value`]: values.processId,
      ...(values.teamId ? { [`_cr4c3_team_value`]: values.teamId } : {}),
    } as never);
    navigate("/incidents");
  };

  const confirmDuplicate = async () => {
    setDupDialogOpen(false);
    if (pendingSubmit) {
      await submitIncident(pendingSubmit);
      setPendingSubmit(null);
    }
  };

  return (
    <PageWrapper title="Log Incident">
      <motion.div variants={itemVariants} className="max-w-2xl">
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Incident Title *</Label>
              <Input id="title" placeholder="Brief description of the incident" {...register("title")} />
              {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of what happened, when, and the impact…"
                rows={4}
                {...register("description")}
              />
              {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
            </div>

            {/* Severity */}
            <div className="space-y-1.5">
              <Label>Severity *</Label>
              <div className="flex gap-3">
                {(Object.entries(SEVERITY) as Array<[string, number]>).map(([key, val]) => (
                  <Controller
                    key={key}
                    name="severity"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(String(val))}
                        className={`flex-1 flex flex-col items-center py-3 rounded-lg border transition-all ${
                          field.value === String(val)
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-white/8 bg-transparent hover:bg-white/5"
                        }`}
                      >
                        <SeverityBadge severity={val} />
                        <span className="text-xs text-slate-400 mt-1">
                          {key === "Critical" ? "4h TAT" : key === "High" ? "24h TAT" : "72h TAT"}
                        </span>
                      </button>
                    )}
                  />
                ))}
              </div>
              {errors.severity && <p className="text-xs text-red-400">{errors.severity.message}</p>}
            </div>

            {/* Cascading Hierarchy */}
            <div className="grid grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {(departments ?? []).map((d) => (
                          <SelectItem key={d.cr4c3_departmentid} value={d.cr4c3_departmentid!}>
                            {d.cr4c3_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.departmentId && <p className="text-xs text-red-400">{errors.departmentId.message}</p>}
              </div>

              {/* Subdepartment */}
              <div className="space-y-1.5">
                <Label>Subdepartment *</Label>
                <Controller
                  name="subdepartmentId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!watchDept}>
                      <SelectTrigger><SelectValue placeholder={watchDept ? "Select subdept" : "Select department first"} /></SelectTrigger>
                      <SelectContent>
                        {(subdepts ?? []).map((s) => (
                          <SelectItem key={s.cr4c3_subdepartmentid} value={s.cr4c3_subdepartmentid!}>
                            {s.cr4c3_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.subdepartmentId && <p className="text-xs text-red-400">{errors.subdepartmentId.message}</p>}
              </div>

              {/* Process */}
              <div className="space-y-1.5">
                <Label>Process *</Label>
                <Controller
                  name="processId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!watchSubdept}>
                      <SelectTrigger><SelectValue placeholder={watchSubdept ? "Select process" : "Select subdept first"} /></SelectTrigger>
                      <SelectContent>
                        {(processes ?? []).map((p) => (
                          <SelectItem key={p.cr4c3_processid} value={p.cr4c3_processid!}>
                            {p.cr4c3_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.processId && <p className="text-xs text-red-400">{errors.processId.message}</p>}
              </div>

              {/* Team (optional) */}
              <div className="space-y-1.5">
                <Label>Team <span className="text-slate-500">(optional)</span></Label>
                <Controller
                  name="teamId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={!watchProcess}>
                      <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                      <SelectContent>
                        {(teams ?? []).map((t) => (
                          <SelectItem key={t.cr4c3_teamid} value={t.cr4c3_teamid!}>
                            {t.cr4c3_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || createIncident.isPending}>
                {createIncident.isPending ? "Logging…" : "Log Incident"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>

            {createIncident.isError && (
              <p className="text-sm text-red-400">Failed to log incident. Please try again.</p>
            )}
          </form>
        </GlassCard>
      </motion.div>

      {/* Duplicate warning dialog */}
      <Dialog open={dupDialogOpen} onOpenChange={setDupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <DialogTitle>Possible Duplicate Incidents</DialogTitle>
            </div>
            <DialogDescription>
              Similar incidents already exist. Review them before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {duplicates.map((dup, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <TicketRef value={dup.cr4c3_ticketreference} />
                <span className="text-sm text-slate-300 truncate">{dup.cr4c3_title}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDupDialogOpen(false); setPendingSubmit(null); }}>
              Cancel — Edit Mine
            </Button>
            <Button onClick={confirmDuplicate}>
              Log Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
