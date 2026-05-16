import { cn } from "@/lib/utils";

interface PulseIndicatorProps {
  color?: "amber" | "green" | "red" | "blue" | "gray";
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  amber: "bg-amber-400",
  green: "bg-green-400",
  red: "bg-red-400",
  blue: "bg-blue-400",
  gray: "bg-slate-500",
};

const RING_MAP: Record<string, string> = {
  amber: "bg-amber-400/30",
  green: "bg-green-400/30",
  red: "bg-red-400/30",
  blue: "bg-blue-400/30",
  gray: "bg-slate-500/30",
};

export function PulseIndicator({ color = "amber", className }: PulseIndicatorProps) {
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)}>
      <span
        className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          RING_MAP[color]
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-full h-2.5 w-2.5",
          COLOR_MAP[color]
        )}
      />
    </span>
  );
}
