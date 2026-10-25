'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'total', label: 'All time' },
];

export function PeriodSelector({ value, onChange, className, tone = 'default' }) {
  const inverse = tone === 'inverse';
  return (
    <div
      className={cn(
        'inline-flex flex-wrap rounded-lg border p-0.5',
        inverse ? 'border-white/20 bg-white/10' : 'border-border bg-muted/40',
        className
      )}
      role="tablist"
      aria-label="Select period"
    >
      {PERIOD_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant="ghost"
          size="sm"
          onClick={() => onChange(opt.value)}
          className={cn(
            'h-8 px-2.5 sm:px-3 text-xs sm:text-sm rounded-md shadow-none hover:shadow-none hover:translate-y-0',
            inverse
              ? value === opt.value
                ? 'bg-white text-slate-900 font-medium hover:bg-white'
                : 'text-white/80 hover:text-white hover:bg-white/10'
              : value === opt.value
                ? 'bg-background text-foreground shadow-sm font-medium'
                : 'text-muted-foreground hover:text-foreground'
          )}
          role="tab"
          aria-selected={value === opt.value}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export { PERIOD_OPTIONS };
