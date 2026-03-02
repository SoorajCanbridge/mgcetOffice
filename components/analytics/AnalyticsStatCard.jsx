'use client';

import { cn } from '@/lib/utils';

export function AnalyticsStatCard({ label, value, subLabel, icon: Icon, color = 'text-primary', bg = 'bg-primary/10', border = 'border-primary/20', className }) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
        border,
        bg,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn('text-2xl font-bold mt-1 tabular-nums', color)}>{value}</p>
          {subLabel != null && subLabel !== '' && (
            <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>
          )}
        </div>
        {Icon && (
          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', bg, color)}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
