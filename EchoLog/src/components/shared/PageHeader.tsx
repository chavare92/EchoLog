import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: React.ElementType;
  title: string;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standardized page header with icon, title, subtitle, and action area.
 * Responsively stacks on mobile.
 */
export function PageHeader({ icon: Icon, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex-shrink-0">
            <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
