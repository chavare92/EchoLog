import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  as?: React.ElementType;
}

export function GlassCard({
  className,
  children,
  interactive = false,
  as: Component = "div",
  ...props
}: GlassCardProps) {
  return (
    <Component
      className={cn(
        "rounded-xl glass border border-[hsl(var(--border))] bg-[hsl(var(--background-card))] text-[hsl(var(--foreground))] shadow-sm transition-colors",
        interactive && "card-interactive cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
