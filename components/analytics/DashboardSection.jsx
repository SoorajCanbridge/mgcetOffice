'use client';

import { cn } from '@/lib/utils';

export function DashboardSection({ title, description, icon: Icon, action, children, className, bodyClassName }) {
  return (
    <section className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-sm', className)}>
      {(title || action) && (
        <header className="px-4 py-3 sm:px-5 border-b border-border bg-muted/30 flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold flex items-center gap-2 text-[15px]">
              {Icon && <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />}
              <span className="truncate">{title}</span>
            </h2>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
