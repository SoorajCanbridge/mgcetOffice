'use client';

import { cn } from '@/lib/utils';

export function ProgressRing({ value = 0, size = 88, thickness = 8, label, className, color = '#2563eb' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth={thickness}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
          {pct}%
        </span>
      </div>
      {label && <div className="min-w-0 text-sm text-muted-foreground">{label}</div>}
    </div>
  );
}
