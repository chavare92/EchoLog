import { cn } from "@/lib/utils";

interface TicketRefProps {
  value: string | null | undefined;
  className?: string;
}

export function TicketRef({ value, className }: TicketRefProps) {
  if (!value) return <span className="text-slate-500 text-xs">—</span>;
  return (
    <span
      className={cn(
        "font-mono-ticket text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded",
        className
      )}
    >
      {value}
    </span>
  );
}
