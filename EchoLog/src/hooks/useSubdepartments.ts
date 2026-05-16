import { useQuery } from "@tanstack/react-query";
import { Cr4c3_subdepartmentsService } from "@/generated/services/Cr4c3_subdepartmentsService";

export const SUBDEPARTMENTS_KEY = "subdepartments";

export function useSubdepartments(departmentId?: string) {
  return useQuery({
    queryKey: [SUBDEPARTMENTS_KEY, departmentId],
    queryFn: async () => {
      const filter = departmentId
        ? `_cr4c3_department_value eq '${departmentId}'`
        : undefined;
      const result = await Cr4c3_subdepartmentsService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return result.data ?? [];
    },
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 10,
  });
}
