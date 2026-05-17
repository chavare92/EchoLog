import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_teamsService } from "@/generated/services/Cr4c3_teamsService";
import type { Cr4c3_teamsBase } from "@/generated/models/Cr4c3_teamsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const TEAMS_KEY = "teams";

export function useTeams(processId?: string, fetchAll?: boolean) {
  return useQuery({
    queryKey: [TEAMS_KEY, processId, fetchAll],
    queryFn: async () => {
      const filter = processId
        ? `_cr4c3_process_value eq '${processId}'`
        : undefined;
      const result = await Cr4c3_teamsService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return unwrapResult(result) ?? [];
    },
    enabled: !!processId || !!fetchAll,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_teamsBase, "cr4c3_teamid">) => {
      const result = await Cr4c3_teamsService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Omit<Cr4c3_teamsBase, "cr4c3_teamid">> }) => {
      const result = await Cr4c3_teamsService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_teamsService.delete(id);
      unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}
