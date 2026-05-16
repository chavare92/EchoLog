import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_notificationsService } from "@/generated/services/Cr4c3_notificationsService";
import type { Cr4c3_notificationsBase } from "@/generated/models/Cr4c3_notificationsModel";

export const NOTIFICATIONS_KEY = "notifications";

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, userId],
    queryFn: async () => {
      const result = await Cr4c3_notificationsService.getAll({
        filter: `_cr4c3_user_value eq '${userId}'`,
        orderBy: ["cr4c3_createdat desc"],
      });
      return result.data ?? [];
    },
    enabled: !!userId,
    refetchInterval: 30_000, // poll every 30s for new notifications
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      Cr4c3_notificationsService.update(id, {
        cr4c3_isread: true,
      } as Partial<Cr4c3_notificationsBase>),
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          Cr4c3_notificationsService.update(id, {
            cr4c3_isread: true,
          } as Partial<Cr4c3_notificationsBase>)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
  });
}
