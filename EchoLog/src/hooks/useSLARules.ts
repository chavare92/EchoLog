import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_slarulesService } from "@/generated/services/Cr4c3_slarulesService";
import type { Cr4c3_slarulesBase } from "@/generated/models/Cr4c3_slarulesModel";


export const SLA_KEY = "sla-rules";

export function useSLARules() {
  return useQuery({
    queryKey: [SLA_KEY],
    queryFn: async () => {
      const result = await Cr4c3_slarulesService.getAll();
      return result.data ?? [];
    },
    staleTime: 1000 * 60 * 2, // 2 min so newly-added rules appear quickly
  });
}

export function useCreateSLARule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_slarulesBase, "cr4c3_slaruleid">) =>
      Cr4c3_slarulesService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SLA_KEY] }),
  });
}

export function useUpdateSLARule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<Cr4c3_slarulesBase> }) =>
      Cr4c3_slarulesService.update(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SLA_KEY] }),
  });
}
