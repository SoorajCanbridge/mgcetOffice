'use client';

import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/analytics-format';

export function DonutChart({
  data = [],
  size = 168,
  thickness = 22,
  centerLabel,
  centerValue,
  className,
}) {
  const items = data.filter((d) => Number(d.value) > 0);
  const total = items.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn('flex flex-col sm:flex-row items-center gap-5', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth={thickness}
          />
          {total > 0 &&
            items.map((item, i) => {
              const value = Number(item.value) || 0;
              const len = (value / total) * circ;
              const dash = `${len} ${circ - len}`;
              const el = (
                <circle
                  key={item.label || i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={item.stroke || item.color || '#3b82f6'}
                  strokeWidth={thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="text-xl font-semibold tabular-nums leading-none">
            {centerValue ?? formatNumber(total)}
          </p>
          {centerLabel && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{centerLabel}</p>
          )}
        </div>
      </div>
      <ul className="w-full space-y-2 min-w-0">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">No distribution data</li>
        )}
        {items.map((item) => {
          const value = Number(item.value) || 0;
          const pct = total ? Math.round((value / total) * 100) : 0;
          return (
            <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.stroke || item.color }}
                />
                <span className="truncate text-muted-foreground">{item.label}</span>
              </span>
              <span className="tabular-nums font-medium shrink-0">
                {formatNumber(value)}
                <span className="text-muted-foreground font-normal ml-1.5">{pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
