import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_slarulesService } from "@/generated/services/Cr4c3_slarulesService";
import type { Cr4c3_slarulesBase } from "@/generated/models/Cr4c3_slarulesModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const SLA_KEY = "sla-rules";

export function useSLARules() {
  return useQuery({
    queryKey: [SLA_KEY],
    queryFn: async () => {
      const result = await Cr4c3_slarulesService.getAll();
      return unwrapResult(result) ?? [];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateSLARule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_slarulesBase, "cr4c3_slaruleid">) => {
      const result = await Cr4c3_slarulesService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SLA_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateSLARule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Cr4c3_slarulesBase> }) => {
      const result = await Cr4c3_slarulesService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SLA_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeleteSLARule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_slarulesService.delete(id);
      unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SLA_KEY] });
      toast.success("SLA rule deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });
}
