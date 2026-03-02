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

export function PeriodSelector({ value, onChange, className }) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)} role="tablist" aria-label="Select period">
      {PERIOD_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onChange(opt.value)}
          className={cn(
            value === opt.value && 'bg-primary/10 text-primary font-medium'
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
