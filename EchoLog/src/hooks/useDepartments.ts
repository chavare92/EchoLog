import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_departmentsService } from "@/generated/services/Cr4c3_departmentsService";
import type { Cr4c3_departmentsBase } from "@/generated/models/Cr4c3_departmentsModel";

export const DEPARTMENTS_KEY = "departments";

export function useDepartments() {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY],
    queryFn: async () => {
      const result = await Cr4c3_departmentsService.getAll({ orderBy: ["cr4c3_name asc"] });
      return result.data ?? [];
    },
    staleTime: 1000 * 60 * 10, // departments rarely change
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_departmentsBase, "cr4c3_departmentid">) =>
      Cr4c3_departmentsService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
  });
}
