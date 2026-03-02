'use client';

import { Lightbulb, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnalyticsInsightCard({ title, description, value, variant = 'default', icon: Icon, className }) {
  const variants = {
    default: 'border-border bg-card',
    success: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };
  const iconMap = {
    default: Lightbulb,
    success: TrendingUp,
    warning: AlertCircle,
    info: Lightbulb,
  };
  const I = Icon ?? iconMap[variant] ?? Lightbulb;
  return (
    <div className={cn('rounded-xl border p-4', variants[variant], className)}>
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <I className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          {value != null && value !== '' && (
            <p className="text-lg font-semibold mt-1 tabular-nums">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}
