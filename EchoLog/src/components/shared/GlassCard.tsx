import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl glass border border-gray-200 bg-white text-gray-900 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
