import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_preventiveactionsService } from "@/generated/services/Cr4c3_preventiveactionsService";
import type { Cr4c3_preventiveactionsBase } from "@/generated/models/Cr4c3_preventiveactionsModel";

export const PA_KEY = "preventive-actions";

export function usePreventiveActions(incidentId?: string) {
  return useQuery({
    queryKey: [PA_KEY, incidentId],
    queryFn: async () => {
      const filter = incidentId ? `_cr4c3_incident_value eq '${incidentId}'` : undefined;
      const result = await Cr4c3_preventiveactionsService.getAll({ filter, orderBy: ["cr4c3_createdat desc"] });
      return result.data ?? [];
    },
  });
}

export function usePreventiveAction(id: string | undefined) {
  return useQuery({
    queryKey: [PA_KEY, "single", id],
    queryFn: async () => {
      const result = await Cr4c3_preventiveactionsService.get(id!);
      return result.data ?? null;
    },
    enabled: !!id,
  });
}

export function useCreatePA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_preventiveactionsBase, "cr4c3_preventiveactionid">) =>
      Cr4c3_preventiveactionsService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PA_KEY] }),
  });
}

export function useUpdatePA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<Cr4c3_preventiveactionsBase> }) =>
      Cr4c3_preventiveactionsService.update(id, fields),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [PA_KEY] });
      qc.invalidateQueries({ queryKey: [PA_KEY, "single", id] });
    },
  });
}
