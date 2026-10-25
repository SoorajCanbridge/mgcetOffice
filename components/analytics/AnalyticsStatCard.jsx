'use client';

import Link from 'next/link';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/analytics-format';
import { Sparkline } from './Sparkline';

export function AnalyticsStatCard({
  label,
  value,
  subLabel,
  icon: Icon,
  color = 'text-blue-600 dark:text-blue-400',
  bg = 'bg-blue-500/10',
  border = 'border-blue-500/15',
  className,
  delta,
  sparkline,
  href,
  format = 'number',
}) {
  const display =
    format === 'raw' ? value : typeof value === 'number' ? formatNumber(value) : value;

  const deltaDir = delta?.direction;
  const DeltaIcon = deltaDir === 'up' ? TrendingUp : deltaDir === 'down' ? TrendingDown : Minus;
  const deltaColor =
    deltaDir === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : deltaDir === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn('text-2xl sm:text-[1.65rem] font-semibold mt-1 tabular-nums tracking-tight', color)}>
            {display}
          </p>
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', bg, color)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {delta && (
            <p className={cn('inline-flex items-center gap-1 text-xs font-medium', deltaColor)}>
              <DeltaIcon className="h-3.5 w-3.5" />
              {delta.value > 0 ? '+' : ''}
              {formatNumber(delta.value)}
              <span className="text-muted-foreground font-normal">
                ({delta.pct > 0 ? '+' : ''}{delta.pct}%)
              </span>
            </p>
          )}
          {subLabel != null && subLabel !== '' && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subLabel}</p>
          )}
        </div>
        {sparkline?.length > 1 && (
          <Sparkline values={sparkline} className={cn('opacity-80', color)} />
        )}
      </div>
    </>
  );

  const cardClass = cn(
    'rounded-xl border bg-card p-4 sm:p-5 shadow-sm transition-all',
    'hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50',
    href && 'block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
    border,
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return <div className={cardClass}>{inner}</div>;
}
