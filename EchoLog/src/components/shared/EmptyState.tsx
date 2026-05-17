import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standardized empty state component used across all list/table pages.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("py-16 flex flex-col items-center justify-center text-center px-4", className)}>
      <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
        <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </div>
      <p className="text-gray-600 dark:text-gray-300 font-semibold text-sm">{title}</p>
      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
