import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_preventiveactionsService } from "@/generated/services/Cr4c3_preventiveactionsService";
import type { Cr4c3_preventiveactionsBase } from "@/generated/models/Cr4c3_preventiveactionsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const PA_KEY = "preventive-actions";

export function usePreventiveActions(incidentId?: string) {
  return useQuery({
    queryKey: [PA_KEY, incidentId],
    queryFn: async () => {
      const filter = incidentId ? `_cr4c3_incident_value eq '${incidentId}'` : undefined;
      const result = await Cr4c3_preventiveactionsService.getAll({ filter, orderBy: ["cr4c3_createdat desc"] });
      return unwrapResult(result) ?? [];
    },
  });
}

export function usePreventiveAction(id: string | undefined) {
  return useQuery({
    queryKey: [PA_KEY, "single", id],
    queryFn: async () => {
      const result = await Cr4c3_preventiveactionsService.get(id!);
      return unwrapResult(result) ?? null;
    },
    enabled: !!id,
  });
}

export function useCreatePA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_preventiveactionsBase, "cr4c3_preventiveactionid">) => {
      const result = await Cr4c3_preventiveactionsService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PA_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdatePA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Cr4c3_preventiveactionsBase> }) => {
      const result = await Cr4c3_preventiveactionsService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [PA_KEY] });
      qc.invalidateQueries({ queryKey: [PA_KEY, "single", id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeletePA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_preventiveactionsService.delete(id);
      unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PA_KEY] });
      toast.success("Preventive action deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });
}
