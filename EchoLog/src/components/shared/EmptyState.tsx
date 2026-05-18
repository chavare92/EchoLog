import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

/**
 * Standardized empty state component used across all list/table pages.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("py-16 flex flex-col items-center justify-center text-center px-6", className)}>
      <div className="relative mb-5">
        <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-[hsl(var(--border))] flex items-center justify-center shadow-sm">
          <Icon className="w-9 h-9 text-[hsl(var(--foreground-muted))]" aria-hidden="true" />
        </div>
      </div>
      <p className="text-[hsl(var(--foreground))] font-semibold text-sm">{title}</p>
      {description && (
        <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
