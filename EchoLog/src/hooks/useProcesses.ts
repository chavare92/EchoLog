import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_processesService } from "@/generated/services/Cr4c3_processesService";
import type { Cr4c3_processesBase } from "@/generated/models/Cr4c3_processesModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const PROCESSES_KEY = "processes";

export function useProcesses(subdepartmentId?: string, fetchAll?: boolean) {
  return useQuery({
    queryKey: [PROCESSES_KEY, subdepartmentId, fetchAll],
    queryFn: async () => {
      const filter = subdepartmentId
        ? `_cr4c3_subdepartment_value eq '${subdepartmentId}'`
        : undefined;
      const result = await Cr4c3_processesService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return unwrapResult(result) ?? [];
    },
    enabled: !!subdepartmentId || !!fetchAll,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_processesBase, "cr4c3_processid">) => {
      const result = await Cr4c3_processesService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROCESSES_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Omit<Cr4c3_processesBase, "cr4c3_processid">> }) => {
      const result = await Cr4c3_processesService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROCESSES_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeleteProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_processesService.delete(id);
      unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROCESSES_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}
