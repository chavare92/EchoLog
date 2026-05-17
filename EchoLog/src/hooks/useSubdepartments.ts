import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_subdepartmentsService } from "@/generated/services/Cr4c3_subdepartmentsService";
import type { Cr4c3_subdepartmentsBase } from "@/generated/models/Cr4c3_subdepartmentsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const SUBDEPARTMENTS_KEY = "subdepartments";

export function useSubdepartments(departmentId?: string, fetchAll?: boolean) {
  return useQuery({
    queryKey: [SUBDEPARTMENTS_KEY, departmentId, fetchAll],
    queryFn: async () => {
      const filter = departmentId
        ? `_cr4c3_department_value eq '${departmentId}'`
        : undefined;
      const result = await Cr4c3_subdepartmentsService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return unwrapResult(result) ?? [];
    },
    enabled: !!departmentId || !!fetchAll,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateSubdepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_subdepartmentsBase, "cr4c3_subdepartmentid">) => {
      const result = await Cr4c3_subdepartmentsService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUBDEPARTMENTS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateSubdepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Omit<Cr4c3_subdepartmentsBase, "cr4c3_subdepartmentid">> }) => {
      const result = await Cr4c3_subdepartmentsService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUBDEPARTMENTS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeleteSubdepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_subdepartmentsService.delete(id);
      unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SUBDEPARTMENTS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}
