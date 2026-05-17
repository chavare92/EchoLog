import { cn } from "@/lib/utils";

interface TicketRefProps {
  value: string | null | undefined;
  className?: string;
}

export function TicketRef({ value, className }: TicketRefProps) {
  if (!value) return <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>;
  return (
    <span
      className={cn(
        "font-mono-ticket text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded",
        className
      )}
    >
      {value}
    </span>
  );
}
