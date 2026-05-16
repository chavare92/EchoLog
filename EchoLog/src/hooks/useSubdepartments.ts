import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_subdepartmentsService } from "@/generated/services/Cr4c3_subdepartmentsService";
import type { Cr4c3_subdepartmentsBase } from "@/generated/models/Cr4c3_subdepartmentsModel";

export const SUBDEPARTMENTS_KEY = "subdepartments";

export function useSubdepartments(departmentId?: string, fetchAll?: boolean) {
  return useQuery({
    queryKey: [SUBDEPARTMENTS_KEY, departmentId, fetchAll],
    queryFn: async () => {
      const filter = departmentId
        ? `_cr4c3_department_value eq '${departmentId}'`
        : undefined;
      const result = await Cr4c3_subdepartmentsService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return result.data ?? [];
    },
    enabled: !!departmentId || !!fetchAll,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateSubdepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_subdepartmentsBase, "cr4c3_subdepartmentid">) =>
      Cr4c3_subdepartmentsService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUBDEPARTMENTS_KEY] }),
  });
}
