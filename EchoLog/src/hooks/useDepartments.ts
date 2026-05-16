import { useQuery } from "@tanstack/react-query";
import { Cr4c3_departmentsService } from "@/generated/services/Cr4c3_departmentsService";

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
