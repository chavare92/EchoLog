import { useQuery } from "@tanstack/react-query";
import { Cr4c3_processesService } from "@/generated/services/Cr4c3_processesService";

export const PROCESSES_KEY = "processes";

export function useProcesses(subdepartmentId?: string) {
  return useQuery({
    queryKey: [PROCESSES_KEY, subdepartmentId],
    queryFn: async () => {
      const filter = subdepartmentId
        ? `_cr4c3_subdepartment_value eq '${subdepartmentId}'`
        : undefined;
      const result = await Cr4c3_processesService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return result.data ?? [];
    },
    enabled: !!subdepartmentId,
    staleTime: 1000 * 60 * 10,
  });
}
