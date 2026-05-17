import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_departmentsService } from "@/generated/services/Cr4c3_departmentsService";
import type { Cr4c3_departmentsBase } from "@/generated/models/Cr4c3_departmentsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const DEPARTMENTS_KEY = "departments";

export function useDepartments() {
  return useQuery({
    queryKey: [DEPARTMENTS_KEY],
    queryFn: async () => {
      const result = await Cr4c3_departmentsService.getAll({ orderBy: ["cr4c3_name asc"] });
      return unwrapResult(result) ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_departmentsBase, "cr4c3_departmentid">) => {
      const result = await Cr4c3_departmentsService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Omit<Cr4c3_departmentsBase, "cr4c3_departmentid">> }) => {
      const result = await Cr4c3_departmentsService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_departmentsService.delete(id);
      unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}
