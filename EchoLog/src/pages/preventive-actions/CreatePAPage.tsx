import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import { currentUserAtom } from "@/store/authAtoms";
import { useCreatePA } from "@/hooks/usePreventiveActions";
import { useIncidents } from "@/hooks/useIncidents";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { USER_ROLE, PA_STATUS } from "@/lib/constants";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  incidentId: z.string().min(1, "Incident is required"),
  paOwnerId: z.string().min(1, "PA Owner is required"),
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .refine((val) => {
      const d = new Date(val);
      return d > new Date();
    }, "Due date must be in the future"),
});

type FormValues = z.infer<typeof schema>;

export function CreatePAPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAtomValue(currentUserAtom);
  const createPA = useCreatePA();

  const { data: incidents } = useIncidents();
  const { data: userProfiles } = useUserProfiles();

  const paOwners = (userProfiles ?? []).filter(
    (u) => u.cr4c3_role === USER_ROLE.PAOwner || u.cr4c3_role === USER_ROLE.Assignee
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      incidentId: searchParams.get("incidentId") ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    await createPA.mutateAsync({
      cr4c3_title: values.title,
      cr4c3_description: values.description,
      cr4c3_status: PA_STATUS.NotStarted,
      cr4c3_createdat: new Date().toISOString(),
      cr4c3_duedate: new Date(values.dueDate).toISOString(),
      [`_cr4c3_incident_value`]: values.incidentId,
      [`_cr4c3_paowner_value`]: values.paOwnerId,
      [`_cr4c3_createdby_value`]: user?.cr4c3_userprofileid,
    } as never);
    navigate("/preventive-actions");
  };

  return (
    <PageWrapper title="Create Preventive Action">
      <motion.div variants={itemVariants} className="max-w-2xl">
        <GlassCard className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="pa-title">Title *</Label>
              <Input id="pa-title" placeholder="Action title" {...register("title")} />
              {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="pa-desc">Description *</Label>
              <Textarea id="pa-desc" placeholder="Describe the preventive action…" rows={3} {...register("description")} />
              {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
            </div>

            {/* Incident */}
            <div className="space-y-1.5">
              <Label>Linked Incident *</Label>
              <Controller
                name="incidentId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select incident" />
                    </SelectTrigger>
                    <SelectContent>
                      {(incidents ?? []).map((i) => (
                        <SelectItem key={i.cr4c3_incidentid} value={i.cr4c3_incidentid!}>
                          {i.cr4c3_ticketreference} — {i.cr4c3_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.incidentId && <p className="text-xs text-red-400">{errors.incidentId.message}</p>}
            </div>

            {/* PA Owner */}
            <div className="space-y-1.5">
              <Label>PA Owner *</Label>
              <Controller
                name="paOwnerId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select PA owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {paOwners.map((u) => (
                        <SelectItem key={u.cr4c3_userprofileid} value={u.cr4c3_userprofileid!}>
                          {u.cr4c3_fullname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paOwnerId && <p className="text-xs text-red-400">{errors.paOwnerId.message}</p>}
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="pa-due">Due Date *</Label>
              <Input
                id="pa-due"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                {...register("dueDate")}
                className="[color-scheme:dark]"
              />
              {errors.dueDate && <p className="text-xs text-red-400">{errors.dueDate.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || createPA.isPending}>
                {createPA.isPending ? "Creating…" : "Create PA"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </PageWrapper>
  );
}
