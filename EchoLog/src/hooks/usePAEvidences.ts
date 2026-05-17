import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_paevidencesService } from "@/generated/services/Cr4c3_paevidencesService";
import type { Cr4c3_paevidencesBase } from "@/generated/models/Cr4c3_paevidencesModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const PA_EVIDENCES_KEY = "pa-evidences";

export function usePAEvidences(paId: string | undefined) {
  return useQuery({
    queryKey: [PA_EVIDENCES_KEY, paId],
    queryFn: async () => {
      const filter = paId ? `_cr4c3_preventiveaction_value eq '${paId}'` : undefined;
      const result = await Cr4c3_paevidencesService.getAll({
        filter,
        orderBy: ["cr4c3_uploadedat desc"],
      });
      return unwrapResult(result) ?? [];
    },
    enabled: !!paId,
  });
}

export function useCreatePAEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_paevidencesBase, "cr4c3_paevidenceid">) => {
      const result = await Cr4c3_paevidencesService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PA_EVIDENCES_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to upload evidence"),
  });
}
