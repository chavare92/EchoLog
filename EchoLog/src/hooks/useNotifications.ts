import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cr4c3_notificationsService } from "@/generated/services/Cr4c3_notificationsService";
import type { Cr4c3_notificationsBase } from "@/generated/models/Cr4c3_notificationsModel";
import { unwrapResult } from "@/lib/utils";
import { toast } from "sonner";

export const NOTIFICATIONS_KEY = "notifications";

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, userId],
    queryFn: async () => {
      const result = await Cr4c3_notificationsService.getAll({
        filter: `_cr4c3_user_value eq '${userId}'`,
        orderBy: ["cr4c3_createdat desc"],
      });
      return unwrapResult(result) ?? [];
    },
    enabled: !!userId,
    refetchInterval: 30_000, // poll every 30s for new notifications
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await Cr4c3_notificationsService.update(id, {
        cr4c3_isread: true,
      } as Partial<Cr4c3_notificationsBase>);
      return unwrapResult(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id) =>
          Cr4c3_notificationsService.update(id, {
            cr4c3_isread: true,
          } as Partial<Cr4c3_notificationsBase>)
        )
      );
      results.forEach((r) => unwrapResult(r));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Operation failed"),
  });
}
