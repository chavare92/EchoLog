import { useEffect, useState } from "react";
import { getRemainingTATMs, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TATCountdownProps {
  dueDate: string | Date | null | undefined;
  className?: string;
}

export function TATCountdown({ dueDate, className }: TATCountdownProps) {
  const [remaining, setRemaining] = useState(() => getRemainingTATMs(dueDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getRemainingTATMs(dueDate));
    }, 60_000);
    return () => clearInterval(timer);
  }, [dueDate]);

  if (!dueDate) return <span className="text-slate-500 text-xs">—</span>;

  const isOverdue = remaining <= 0;
  const isUrgent = remaining > 0 && remaining < 2 * 60 * 60 * 1000; // < 2h

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-mono",
        isOverdue
          ? "text-red-400"
          : isUrgent
          ? "text-amber-400"
          : "text-slate-400",
        className
      )}
    >
      {isOverdue && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      )}
      {formatDuration(remaining)}
    </span>
  );
}
