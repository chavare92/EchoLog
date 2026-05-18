import { cn } from "@/lib/utils";

type GlassCardVariant = "default" | "elevated" | "flat" | "glow-amber" | "glow-violet" | "glow-red";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  variant?: GlassCardVariant;
  as?: React.ElementType;
}

export function GlassCard({
  className,
  children,
  interactive = false,
  variant = "default",
  as: Component = "div",
  ...props
}: GlassCardProps) {
  return (
    <Component
      className={cn(
        "rounded-xl text-[hsl(var(--foreground))] transition-colors",
        variant === "default" && "glass border border-[hsl(var(--border))]",
        variant === "elevated" && "bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] shadow-lg dark:shadow-none dark:border-[hsl(var(--border))]",
        variant === "flat" && "bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] shadow-none",
        variant === "glow-amber" && "glass border border-amber-200 dark:border-amber-800/60 glow-amber",
        variant === "glow-violet" && "glass border border-violet-200 dark:border-violet-800/60 glow-violet",
        variant === "glow-red" && "glass border border-red-200 dark:border-red-800/60 glow-red",
        interactive && "card-interactive cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
