'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Wallet,
  BarChart3,
  ChevronRight,
  RefreshCcw,
  Activity,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getAnalyticsSummary, getCourseStudentAnalytics } from '@/lib/analytics-api';
import {
  AnalyticsStatCard,
  PeriodSelector,
  CourseStatsBlock,
  StudentStatsBlock,
  SimpleBarChart,
  AnalyticsInsightCard,
} from '@/components/analytics';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { user } = useAuth();
  const [periodType, setPeriodType] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState([]);
  const [totalDoc, setTotalDoc] = useState(null);

  const collegeId = user?.college;

  const fetchAnalytics = useCallback(async () => {
    if (!collegeId) return;
    setError('');
    setLoading(true);
    try {
      const [summaryRes, totalRes] = await Promise.all([
        getAnalyticsSummary(collegeId, { periodType }).catch(() => ({ data: [] })),
        getCourseStudentAnalytics(collegeId, { periodType: 'total', periodKey: 'all' }).catch(() => ({ data: [] })),
      ]);
      const list = Array.isArray(summaryRes?.data) ? summaryRes.data : [];
      setSummaryData(list);
      const totalList = Array.isArray(totalRes?.data) ? totalRes.data : [];
      setTotalDoc(totalList.length ? totalList[0] : null);
    } catch (err) {
      setError(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [collegeId, periodType]);

  useEffect(() => {
    if (!collegeId) return;
    fetchAnalytics();
  }, [collegeId, fetchAnalytics]);

  const latestPeriod = useMemo(() => {
    if (!summaryData.length) return null;
    const sorted = [...summaryData].sort((a, b) => new Date(b.periodStart || 0) - new Date(a.periodStart || 0));
    return sorted[0];
  }, [summaryData]);

  const courseStats = latestPeriod?.course ?? totalDoc?.course ?? {};
  const studentStats = latestPeriod?.student ?? totalDoc?.student ?? {};

  const kpiCards = useMemo(() => {
    const activeStudents = studentStats.active ?? 0;
    const totalEnrolled = courseStats.totalEnrolled ?? 0;
    const completed = courseStats.completed ?? 0;
    const activeCourses = courseStats.active ?? 0;
    return [
      {
        label: 'Active Students',
        value: activeStudents,
        icon: Users,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
      },
      {
        label: 'Total Enrolled',
        value: totalEnrolled,
        icon: GraduationCap,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
      },
      {
        label: 'Courses Completed',
        value: completed,
        icon: BookOpen,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
      },
      {
        label: 'Active Courses',
        value: activeCourses,
        icon: Activity,
        color: 'text-primary',
        bg: 'bg-primary/10',
        border: 'border-primary/20',
      },
    ];
  }, [studentStats.active, courseStats.totalEnrolled, courseStats.completed, courseStats.active]);

  const studentChartData = useMemo(() => {
    const total = studentStats.enrolled ?? 0;
    if (total === 0) return [];
    return [
      { label: 'Active', value: studentStats.active ?? 0, color: 'bg-emerald-500' },
      { label: 'Graduated', value: studentStats.graduated ?? 0, color: 'bg-violet-500' },
      { label: 'Dropped', value: studentStats.dropped ?? 0, color: 'bg-red-500' },
      { label: 'Suspended', value: studentStats.suspended ?? 0, color: 'bg-amber-500' },
      { label: 'Transferred', value: studentStats.transferred ?? 0, color: 'bg-slate-500' },
    ].filter((d) => d.value > 0);
  }, [studentStats]);

  const completionRate = useMemo(() => {
    const total = courseStats.totalEnrolled ?? 0;
    const completed = courseStats.completed ?? 0;
    if (total === 0) return null;
    return Math.round((completed / total) * 100);
  }, [courseStats.totalEnrolled, courseStats.completed]);

  const quickLinks = [
    { title: 'Analytics', href: '/app/analytics', icon: BarChart3, description: 'Full analytics & insights' },
    { title: 'Students', href: '/app/students', icon: Users, description: 'Manage students' },
    { title: 'Courses', href: '/app/courses', icon: BookOpen, description: 'Manage courses' },
    { title: 'Finance', href: '/app/finance/tracking', icon: Wallet, description: 'Income & expenses' },
    { title: 'Invoices', href: '/app/invoices', icon: FileText, description: 'Invoicing' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Overview of courses, students, and key metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={periodType} onChange={setPeriodType} />
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAnalytics}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !totalDoc && !latestPeriod ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          kpiCards.map((card) => (
            <AnalyticsStatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
              bg={card.bg}
              border={card.border}
            />
          ))
        )}
      </div>

      {/* Insights row */}
      {(completionRate != null || studentChartData.length > 0) && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {completionRate != null && (
            <AnalyticsInsightCard
              title="Course completion rate"
              description="Completed vs total enrolled (all time)"
              value={`${completionRate}%`}
              variant="success"
              icon={TrendingUp}
            />
          )}
          {studentStats.active != null && (
            <AnalyticsInsightCard
              title="Currently active students"
              description="Students in active status"
              value={studentStats.active}
              variant="info"
            />
          )}
        </div>
      )}

      {/* Course & Student stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Course statistics
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/analytics" className="gap-1">
                View details <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="p-4">
            <CourseStatsBlock course={courseStats} loading={loading} compact />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Student statistics
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/analytics" className="gap-1">
                View details <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="p-4">
            <StudentStatsBlock student={studentStats} loading={loading} compact />
          </div>
        </div>
      </div>

      {/* Student distribution chart */}
      {studentChartData.length > 0 && !loading && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Student distribution
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">By status</p>
          </div>
          <div className="p-4 max-w-md">
            <SimpleBarChart data={studentChartData} showValues />
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="font-semibold">Quick actions</h2>
          <p className="text-sm text-muted-foreground">Jump to key sections</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <link.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{link.title}</p>
                <p className="text-sm text-muted-foreground truncate">{link.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
