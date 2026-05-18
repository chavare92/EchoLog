import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background-card))] px-3 py-2 text-sm text-[hsl(var(--foreground))] shadow-sm transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[hsl(var(--foreground-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/25 focus-visible:border-amber-400 dark:focus-visible:border-amber-500/60 hover:border-[hsl(var(--foreground-muted)/0.5)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
