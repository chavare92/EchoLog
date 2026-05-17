import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import { BellOff, CheckCheck } from "lucide-react";
import { currentUserAtom } from "@/store/authAtoms";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";
import { formatDateTime } from "@/lib/utils";
import { PageWrapper, itemVariants } from "@/components/shared/PageWrapper";
import { GlassCard } from "@/components/shared/GlassCard";
import { SkeletonCards } from "@/components/shared/Skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NOTIFICATION_TYPE_LABELS: Record<number, string> = {
  564060000: "Incident Assigned",
  564060001: "TAT Warning",
  564060002: "RCA Submitted",
  564060003: "RCA Approved",
  564060004: "RCA Rejected",
  564060005: "PA Due Soon",
  564060006: "PA Overdue",
  564060007: "Escalation",
};

export function NotificationsPage() {
  const user = useAtomValue(currentUserAtom);
  const { data: notifications, isLoading } = useNotifications(user?.cr4c3_userprofileid);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unread = (notifications ?? []).filter((n) => !n.cr4c3_isread);
  const read = (notifications ?? []).filter((n) => n.cr4c3_isread);

  const handleClick = async (id: string, isRead?: boolean) => {
    if (!isRead) {
      await markRead.mutateAsync(id);
    }
  };

  return (
    <PageWrapper
      title="Notifications"
      actions={
        unread.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate(unread.map((n) => n.cr4c3_notificationid!))}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Mark All Read
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <SkeletonCards count={5} />
      ) : (!notifications || notifications.length === 0) ? (
        <motion.div variants={itemVariants}>
          <GlassCard className="py-16 text-center">
            <BellOff className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">You're all caught up.</p>
          </GlassCard>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Unread */}
          {unread.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unread</h3>
                <Badge variant="default" className="text-xs px-1.5 py-0">{unread.length}</Badge>
              </div>
              {unread.map((n) => (
                <motion.div key={n.cr4c3_notificationid} variants={itemVariants}>
                  <GlassCard
                    className="p-4 cursor-pointer hover:bg-gray-50 border-amber-200"
                    onClick={() => handleClick(n.cr4c3_notificationid!, n.cr4c3_isread)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          {n.cr4c3_type !== undefined && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {NOTIFICATION_TYPE_LABELS[n.cr4c3_type] ?? "Notification"}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                            {formatDateTime(n.cr4c3_createdat)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 mt-1.5">{n.cr4c3_message}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}

          {/* Read */}
          {read.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Read</h3>
              {read.map((n) => (
                <motion.div key={n.cr4c3_notificationid} variants={itemVariants}>
                  <GlassCard className="p-4 opacity-60">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          {n.cr4c3_type !== undefined && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {NOTIFICATION_TYPE_LABELS[n.cr4c3_type] ?? "Notification"}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                            {formatDateTime(n.cr4c3_createdat)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1.5">{n.cr4c3_message}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
