import { useQuery } from "@tanstack/react-query";
import { Cr4c3_teamsService } from "@/generated/services/Cr4c3_teamsService";

export const TEAMS_KEY = "teams";

export function useTeams(processId?: string) {
  return useQuery({
    queryKey: [TEAMS_KEY, processId],
    queryFn: async () => {
      const filter = processId
        ? `_cr4c3_process_value eq '${processId}'`
        : undefined;
      const result = await Cr4c3_teamsService.getAll({ filter, orderBy: ["cr4c3_name asc"] });
      return result.data ?? [];
    },
    enabled: !!processId,
    staleTime: 1000 * 60 * 10,
  });
}
