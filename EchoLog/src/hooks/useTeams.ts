import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_teamsService } from "@/generated/services/Cr4c3_teamsService";
import type { Cr4c3_teamsBase } from "@/generated/models/Cr4c3_teamsModel";

export const TEAMS_KEY = "teams";

export function useTeams(processId?: string, fetchAll?: boolean) {
  return useQuery({
    queryKey: [TEAMS_KEY, processId, fetchAll],
    queryFn: async () => {
      const filter = processId
        ? `_cr4c3_process_value eq '${processId}'`
        : undefined;
      const result = await Cr4c3_teamsService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return result.data ?? [];
    },
    enabled: !!processId || !!fetchAll,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_teamsBase, "cr4c3_teamid">) =>
      Cr4c3_teamsService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEAMS_KEY] }),
  });
}
