import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_processesService } from "@/generated/services/Cr4c3_processesService";
import type { Cr4c3_processesBase } from "@/generated/models/Cr4c3_processesModel";

export const PROCESSES_KEY = "processes";

export function useProcesses(subdepartmentId?: string, fetchAll?: boolean) {
  return useQuery({
    queryKey: [PROCESSES_KEY, subdepartmentId, fetchAll],
    queryFn: async () => {
      const filter = subdepartmentId
        ? `_cr4c3_subdepartment_value eq '${subdepartmentId}'`
        : undefined;
      const result = await Cr4c3_processesService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return result.data ?? [];
    },
    enabled: !!subdepartmentId || !!fetchAll,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_processesBase, "cr4c3_processid">) =>
      Cr4c3_processesService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROCESSES_KEY] }),
  });
}
