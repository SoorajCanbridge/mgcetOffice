'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Users, BookOpen, ArrowRight } from 'lucide-react';
import { getCourseStudentAnalytics } from '@/lib/analytics-api';
import { Button } from '@/components/ui/button';

/**
 * Compact strip showing total active students & courses. Use on Students or Courses pages.
 */
export function AnalyticsStrip({ collegeId, className }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTotal = useCallback(async () => {
    if (!collegeId) return;
    try {
      const res = await getCourseStudentAnalytics(collegeId, { periodType: 'total', periodKey: 'all' });
      const list = Array.isArray(res?.data) ? res.data : [];
      setData(list[0] ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    fetchTotal();
  }, [fetchTotal]);

  if (loading || !data) return null;

  const activeStudents = data.student?.active ?? 0;
  const activeCourses = data.course?.active ?? 0;
  const totalEnrolled = data.course?.totalEnrolled ?? 0;
  if (activeStudents === 0 && activeCourses === 0 && totalEnrolled === 0) return null;

  return (
    <div className={className}>
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          <span>Overview</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium tabular-nums">{activeStudents}</span>
            <span className="text-xs text-muted-foreground">active students</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium tabular-nums">{activeCourses}</span>
            <span className="text-xs text-muted-foreground">active courses</span>
          </div>
          {totalEnrolled > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">{totalEnrolled}</span> total enrolled
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="ml-auto gap-1" asChild>
          <Link href="/app/analytics">
            Full analytics <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
