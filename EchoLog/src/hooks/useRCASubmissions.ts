import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_rcasubmissionsService } from "@/generated/services/Cr4c3_rcasubmissionsService";
import type { Cr4c3_rcasubmissionsBase } from "@/generated/models/Cr4c3_rcasubmissionsModel";

export const RCA_KEY = "rca-submissions";

export function useRCASubmissions(incidentId?: string) {
  return useQuery({
    queryKey: [RCA_KEY, incidentId],
    queryFn: async () => {
      const filter = incidentId ? `_cr4c3_incident_value eq '${incidentId}'` : undefined;
      const result = await Cr4c3_rcasubmissionsService.getAll({ filter, orderBy: ["cr4c3_submittedat desc"] });
      return result.data ?? [];
    },
  });
}

export function useRCASubmission(id: string | undefined) {
  return useQuery({
    queryKey: [RCA_KEY, "single", id],
    queryFn: async () => {
      const result = await Cr4c3_rcasubmissionsService.get(id!);
      return result.data ?? null;
    },
    enabled: !!id,
  });
}

export function useCreateRCA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_rcasubmissionsBase, "cr4c3_rcasubmissionid">) =>
      Cr4c3_rcasubmissionsService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RCA_KEY] }),
  });
}

export function useUpdateRCA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<Cr4c3_rcasubmissionsBase> }) =>
      Cr4c3_rcasubmissionsService.update(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: [RCA_KEY] }),
  });
}
