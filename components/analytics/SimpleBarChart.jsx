'use client';

import { cn } from '@/lib/utils';

/**
 * Simple horizontal bar chart (no recharts). data = [{ label, value, color? }]
 */
export function SimpleBarChart({ data = [], maxValue, height = 8, className, showValues = true }) {
  const computedMax = maxValue ?? Math.max(1, ...data.map((d) => Number(d.value) || 0));
  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, i) => {
        const value = Number(item.value) || 0;
        const pct = computedMax > 0 ? (value / computedMax) * 100 : 0;
        const barColor = item.color ?? 'bg-primary';
        return (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              {showValues && <span className="font-medium tabular-nums">{value}</span>}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
