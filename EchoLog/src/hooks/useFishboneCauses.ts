import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_fishbonecausesService } from "@/generated/services/Cr4c3_fishbonecausesService";
import type { Cr4c3_fishbonecausesBase } from "@/generated/models/Cr4c3_fishbonecausesModel";

export const FISHBONE_KEY = "fishbone-causes";

export function useFishboneCauses(rcaSubmissionId: string | undefined) {
  return useQuery({
    queryKey: [FISHBONE_KEY, rcaSubmissionId],
    queryFn: async () => {
      const result = await Cr4c3_fishbonecausesService.getAll({
        filter: `_cr4c3_rcasubmission_value eq '${rcaSubmissionId}'`,
      });
      return result.data ?? [];
    },
    enabled: !!rcaSubmissionId,
  });
}

export function useCreateFishboneCause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_fishbonecausesBase, "cr4c3_fishbonecauseid">) =>
      Cr4c3_fishbonecausesService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FISHBONE_KEY] }),
  });
}

export function useUpdateFishboneCause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<Cr4c3_fishbonecausesBase> }) =>
      Cr4c3_fishbonecausesService.update(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FISHBONE_KEY] }),
  });
}

export function useDeleteFishboneCause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => Cr4c3_fishbonecausesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FISHBONE_KEY] }),
  });
}
