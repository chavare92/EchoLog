import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 hover:shadow-md hover:shadow-amber-400/25",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm shadow-red-500/20 hover:from-red-400 hover:to-red-500 hover:shadow-md hover:shadow-red-400/25",
        outline:
          "border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] shadow-sm hover:bg-[hsl(var(--sidebar-hover-bg))] hover:border-[hsl(var(--foreground-muted)/0.3)] dark:border-[hsl(var(--border))] dark:hover:bg-[hsl(var(--sidebar-hover-bg))]",
        secondary:
          "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700",
        ghost:
          "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200",
        link: "text-amber-600 dark:text-amber-400 underline-offset-4 hover:underline",
        accent:
          "bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-sm shadow-violet-500/20 hover:from-violet-400 hover:to-violet-500 hover:shadow-md hover:shadow-violet-400/25",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-6",
        xl: "h-11 rounded-xl px-8 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
