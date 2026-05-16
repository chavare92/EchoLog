import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_userprofilesService } from "@/generated/services/Cr4c3_userprofilesService";
import type { Cr4c3_userprofilesBase } from "@/generated/models/Cr4c3_userprofilesModel";

export const USER_PROFILES_KEY = "user-profiles";

export function useUserProfiles() {
  return useQuery({
    queryKey: [USER_PROFILES_KEY],
    queryFn: async () => {
      const result = await Cr4c3_userprofilesService.getAll({ orderBy: ["cr4c3_fullname asc"] });
      return result.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserProfile(id: string | undefined) {
  return useQuery({
    queryKey: [USER_PROFILES_KEY, id],
    queryFn: async () => {
      const result = await Cr4c3_userprofilesService.get(id!);
      return result.data ?? null;
    },
    enabled: !!id,
  });
}

export function useCreateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: Omit<Cr4c3_userprofilesBase, "cr4c3_userprofileid">) =>
      Cr4c3_userprofilesService.create(record),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USER_PROFILES_KEY] }),
  });
}

export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Partial<Cr4c3_userprofilesBase> }) =>
      Cr4c3_userprofilesService.update(id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: [USER_PROFILES_KEY] }),
  });
}
