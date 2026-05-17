import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_rcasubmissionsService } from "@/generated/services/Cr4c3_rcasubmissionsService";
import type { Cr4c3_rcasubmissionsBase } from "@/generated/models/Cr4c3_rcasubmissionsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const RCA_KEY = "rca-submissions";

export function useRCASubmissions(incidentId?: string) {
  return useQuery({
    queryKey: [RCA_KEY, incidentId],
    queryFn: async () => {
      const filter = incidentId ? `_cr4c3_incident_value eq '${incidentId}'` : undefined;
      const result = await Cr4c3_rcasubmissionsService.getAll({ filter, orderBy: ["cr4c3_submittedat desc"] });
      return unwrapResult(result) ?? [];
    },
  });
}

export function useRCASubmission(id: string | undefined) {
  return useQuery({
    queryKey: [RCA_KEY, "single", id],
    queryFn: async () => {
      const result = await Cr4c3_rcasubmissionsService.get(id!);
      return unwrapResult(result) ?? null;
    },
    enabled: !!id,
  });
}

export function useCreateRCA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_rcasubmissionsBase, "cr4c3_rcasubmissionid">) => {
      const result = await Cr4c3_rcasubmissionsService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RCA_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateRCA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Cr4c3_rcasubmissionsBase> }) => {
      const result = await Cr4c3_rcasubmissionsService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [RCA_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}
