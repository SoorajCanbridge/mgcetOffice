'use client';

import { BookOpen, Plus, CheckCircle, XCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const COURSE_FIELDS = [
  { key: 'created', label: 'Created', icon: Plus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'active', label: 'Active', icon: BookOpen, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'totalEnrolled', label: 'Total Enrolled', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
];

export function CourseStatsBlock({ course = {}, loading, compact, className }) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          Course stats
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {COURSE_FIELDS.map(({ key }) => (
            <Skeleton key={key} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <BookOpen className="h-4 w-4" />
        Course stats
      </div>
      <div className={cn(
        'grid gap-2',
        compact ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      )}>
        {COURSE_FIELDS.map(({ key, label, icon: Icon, color, bg }) => {
          const val = course[key] ?? 0;
          return (
            <div
              key={key}
              className={cn(
                'rounded-lg border border-border bg-card p-3 flex items-center gap-3',
                compact && 'py-2'
              )}
            >
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', bg, color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold tabular-nums">{val}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
