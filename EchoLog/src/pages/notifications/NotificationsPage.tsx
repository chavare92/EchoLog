import { useState, useMemo } from "react";
import { useAtomValue } from "jotai";
import { motion } from "framer-motion";
import { BellOff, CheckCheck, Filter } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // PRD §8: filter to last 30 days only
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const filtered = useMemo(() => {
    return (notifications ?? []).filter((n) => {
      const withinWindow = !n.cr4c3_createdat || new Date(n.cr4c3_createdat) >= thirtyDaysAgo;
      const matchRead = readFilter === "all" || (readFilter === "unread" ? !n.cr4c3_isread : n.cr4c3_isread);
      const matchType = typeFilter === "all" || n.cr4c3_type === Number(typeFilter);
      return withinWindow && matchRead && matchType;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, readFilter, typeFilter]);

  const unread = filtered.filter((n) => !n.cr4c3_isread);
  const read = filtered.filter((n) => n.cr4c3_isread);
  const totalUnread = (notifications ?? []).filter((n) => !n.cr4c3_isread);

  const handleClick = async (id: string, isRead?: boolean) => {
    if (!isRead) await markRead.mutateAsync(id);
  };

  return (
    <PageWrapper
      title="Notifications"
      actions={
        unread.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate(totalUnread.map((n) => n.cr4c3_notificationid!))}
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
      ) : (
        <>
          {/* Filter bar */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-3 flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-[hsl(var(--foreground-muted))] shrink-0" />
              <Select value={readFilter} onValueChange={(v) => setReadFilter(v as typeof readFilter)}>
                <SelectTrigger className="w-32 h-8 text-xs" aria-label="Filter by read status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 h-8 text-xs" aria-label="Filter by type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(NOTIFICATION_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(readFilter !== "all" || typeFilter !== "all") && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setReadFilter("all"); setTypeFilter("all"); }}>
                  Clear filters
                </Button>
              )}
            </GlassCard>
          </motion.div>

          {(!notifications || notifications.length === 0) ? (
          <motion.div variants={itemVariants}>
            <GlassCard className="py-16 text-center">
              <BellOff className="w-10 h-10 text-[hsl(var(--foreground-muted))] mx-auto mb-3" />
              <p className="text-[hsl(var(--foreground))] font-medium">No notifications</p>
              <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">You're all caught up.</p>
            </GlassCard>
          </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div variants={itemVariants}>
              <GlassCard className="py-16 text-center">
                <BellOff className="w-10 h-10 text-[hsl(var(--foreground-muted))] mx-auto mb-3" />
                <p className="text-[hsl(var(--foreground))] font-medium">No matching notifications</p>
              </GlassCard>
            </motion.div>
          ) : (
        <div className="space-y-6">
          {/* Unread */}
          {unread.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-wide">Unread</h3>
                <Badge variant="default" className="text-xs px-1.5 py-0">{unread.length}</Badge>
              </div>
              {unread.map((n) => (
                <motion.div key={n.cr4c3_notificationid} variants={itemVariants}>
                  <GlassCard
                    className="p-4 cursor-pointer hover:shadow-sm border-amber-200 dark:border-amber-800/40"
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
                          <span className="text-xs text-[hsl(var(--foreground-muted))] font-mono whitespace-nowrap">
                            {formatDateTime(n.cr4c3_createdat)}
                          </span>
                        </div>
                        <p className="text-sm text-[hsl(var(--foreground))] mt-1.5">{n.cr4c3_message}</p>
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
              <h3 className="text-xs font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-wide">Read</h3>
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
                          <span className="text-xs text-[hsl(var(--foreground-muted))] font-mono whitespace-nowrap">
                            {formatDateTime(n.cr4c3_createdat)}
                          </span>
                        </div>
                        <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1.5">{n.cr4c3_message}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}
    </PageWrapper>
  );
}
