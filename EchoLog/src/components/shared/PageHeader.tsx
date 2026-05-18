import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: React.ElementType;
  title: string;
  subtitle?: string | React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

/**
 * Standardized page header with gradient icon, title, subtitle, badge and action area.
 */
export function PageHeader({ icon: Icon, title, subtitle, actions, badge, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/30 flex-shrink-0">
            <Icon className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))] tracking-tight truncate">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-[hsl(var(--foreground-muted))] mt-0.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
