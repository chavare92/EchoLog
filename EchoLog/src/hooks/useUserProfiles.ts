import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_userprofilesService } from "@/generated/services/Cr4c3_userprofilesService";
import type { Cr4c3_userprofilesBase } from "@/generated/models/Cr4c3_userprofilesModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const USER_PROFILES_KEY = "user-profiles";

export function useUserProfiles() {
  return useQuery({
    queryKey: [USER_PROFILES_KEY],
    queryFn: async () => {
      const result = await Cr4c3_userprofilesService.getAll({ orderBy: ["cr4c3_fullname asc"] });
      return unwrapResult(result) ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserProfile(id: string | undefined) {
  return useQuery({
    queryKey: [USER_PROFILES_KEY, id],
    queryFn: async () => {
      const result = await Cr4c3_userprofilesService.get(id!);
      return unwrapResult(result) ?? null;
    },
    enabled: !!id,
  });
}

export function useCreateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: Omit<Cr4c3_userprofilesBase, "cr4c3_userprofileid">) => {
      const result = await Cr4c3_userprofilesService.create(record);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [USER_PROFILES_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: Partial<Cr4c3_userprofilesBase> }) => {
      const result = await Cr4c3_userprofilesService.update(id, fields);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [USER_PROFILES_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useDeleteUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_userprofilesService.delete(id);
      unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USER_PROFILES_KEY] });
      toast.success("User deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });
}
