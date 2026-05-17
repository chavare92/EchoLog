import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_fishbonecausesService } from "@/generated/services/Cr4c3_fishbonecausesService";
import type { Cr4c3_fishbonecausesBase } from "@/generated/models/Cr4c3_fishbonecausesModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const FISHBONE_KEY = "fishbone-causes";

export function useFishboneCauses(rcaSubmissionId: string | undefined) {
  return useQuery({
    queryKey: [FISHBONE_KEY, rcaSubmissionId],
    queryFn: async () => {
      const result = await Cr4c3_fishbonecausesService.getAll({
        filter: `_cr4c3_rcasubmission_value eq '${rcaSubmissionId}'`,
      });
      return unwrapResult(result) ?? [];
    },
    enabled: !!rcaSubmissionId,
  });
}

export function useCreateFishboneCause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_fishbonecausesBase, "cr4c3_fishbonecauseid">) => {
      const result = await Cr4c3_fishbonecausesService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [FISHBONE_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateFishboneCause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Cr4c3_fishbonecausesBase> }) => {
      const result = await Cr4c3_fishbonecausesService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [FISHBONE_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeleteFishboneCause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_fishbonecausesService.delete(id);
      unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [FISHBONE_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}
