'use client';

import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/analytics-format';

/**
 * categories: string[]
 * series: [{ name, color, values: number[] }]
 */
export function GroupedBarChart({ categories = [], series = [], height = 220, className }) {
  const allValues = series.flatMap((s) => s.values.map((v) => Number(v) || 0));
  const max = Math.max(1, ...allValues);
  const groupCount = Math.max(categories.length, 1);
  const barCount = Math.max(series.length, 1);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-2 sm:gap-3 overflow-x-auto pb-1" style={{ minHeight: height }}>
        {categories.map((label, i) => (
          <div key={`${label}-${i}`} className="flex flex-col items-center gap-2 min-w-[52px] sm:min-w-[64px] flex-1">
            <div className="flex items-end justify-center gap-1 w-full" style={{ height: height - 36 }}>
              {series.map((s) => {
                const value = Number(s.values[i]) || 0;
                const pct = (value / max) * 100;
                return (
                  <div key={s.name} className="flex-1 max-w-6 flex flex-col items-center justify-end h-full group">
                    <span className="mb-1 text-[10px] tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatNumber(value)}
                    </span>
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%`, backgroundColor: s.color }}
                      title={`${s.name}: ${formatNumber(value)}`}
                    />
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate w-full text-center" title={label}>
              {label}
            </span>
          </div>
        ))}
        {groupCount === 0 && <p className="text-sm text-muted-foreground">No trend data</p>}
      </div>
      {barCount > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
