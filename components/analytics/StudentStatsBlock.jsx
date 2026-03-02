'use client';

import { Users, GraduationCap, UserX, PauseCircle, ArrowRightLeft, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const STUDENT_FIELDS = [
  { key: 'enrolled', label: 'Enrolled', icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'graduated', label: 'Graduated', icon: GraduationCap, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  { key: 'dropped', label: 'Dropped', icon: UserX, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  { key: 'suspended', label: 'Suspended', icon: PauseCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { key: 'transferred', label: 'Transferred', icon: ArrowRightLeft, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10' },
  { key: 'active', label: 'Active', icon: UserCheck, color: 'text-primary', bg: 'bg-primary/10' },
];

export function StudentStatsBlock({ student = {}, loading, compact, className }) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="h-4 w-4" />
          Student stats
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {STUDENT_FIELDS.map(({ key }) => (
            <Skeleton key={key} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Users className="h-4 w-4" />
        Student stats
      </div>
      <div className={cn(
        'grid gap-2',
        compact ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      )}>
        {STUDENT_FIELDS.map(({ key, label, icon: Icon, color, bg }) => {
          const val = student[key] ?? 0;
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
