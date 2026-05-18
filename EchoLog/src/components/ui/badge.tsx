import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
        secondary:   "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        destructive: "border-transparent bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
        outline:     "border-[hsl(var(--border))] text-[hsl(var(--foreground-muted))]",
        success:     "border-transparent bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
        info:        "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400",
        warning:     "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
        accent:      "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-400",
        ghost:       "border-transparent bg-transparent text-[hsl(var(--foreground-muted))] hover:bg-[hsl(var(--sidebar-hover-bg))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
