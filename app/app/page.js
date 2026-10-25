'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  FileText,
  Wallet,
  BarChart3,
  ChevronRight,
  RefreshCcw,
  Activity,
  GraduationCap,
  ArrowRight,
  UserPlus,
  Receipt,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/rbac';
import { api } from '@/lib/api';
import { getAnalyticsSummary, getCourseStudentAnalytics } from '@/lib/analytics-api';
import {
  formatNumber,
  formatPercent,
  formatPeriodKey,
  sortByPeriod,
  delta,
  greetingForHour,
  seriesFromDocs,
  buildInsights,
} from '@/lib/analytics-format';
import {
  AnalyticsStatCard,
  PeriodSelector,
  CourseStatsBlock,
  StudentStatsBlock,
  AnalyticsInsightCard,
  DonutChart,
  GroupedBarChart,
  ProgressRing,
  DashboardSection,
} from '@/components/analytics';

const STUDENT_MIX = [
  { key: 'active', label: 'Active', stroke: '#10b981' },
  { key: 'graduated', label: 'Graduated', stroke: '#8b5cf6' },
  { key: 'dropped', label: 'Dropped', stroke: '#ef4444' },
  { key: 'suspended', label: 'Suspended', stroke: '#f59e0b' },
  { key: 'transferred', label: 'Transferred', stroke: '#64748b' },
];

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  } catch {
    return `₹${formatNumber(value)}`;
  }
};

export default function HomePage() {
  const { user } = useAuth();
  const [periodType, setPeriodType] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState([]);
  const [totalDoc, setTotalDoc] = useState(null);
  const [finance, setFinance] = useState(null);

  const collegeId = user?.college;
  const showFinance = canAccess(user, 'finance', 'view');
  const displayName = (user?.name || user?.username || user?.email || 'there').split(' ')[0];

  const fetchAnalytics = useCallback(async () => {
    if (!collegeId) return;
    setError('');
    setLoading(true);
    try {
      const requests = [
        getAnalyticsSummary(collegeId, { periodType }).catch(() => ({ data: [] })),
        getCourseStudentAnalytics(collegeId, { periodType: 'total', periodKey: 'all' }).catch(() => ({ data: [] })),
      ];
      if (showFinance) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = now.toISOString().split('T')[0];
        requests.push(
          api
            .get(`/finance/summary?startDate=${start}&endDate=${end}`, {}, true)
            .catch(() => null)
        );
      }
      const [summaryRes, totalRes, financeRes] = await Promise.all(requests);
      const list = Array.isArray(summaryRes?.data) ? summaryRes.data : [];
      setSummaryData(list);
      const totalList = Array.isArray(totalRes?.data) ? totalRes.data : [];
      setTotalDoc(totalList.length ? totalList[0] : null);
      if (showFinance) {
        setFinance(financeRes?.data ?? financeRes ?? null);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [collegeId, periodType, showFinance]);

  useEffect(() => {
    if (!collegeId) return;
    fetchAnalytics();
  }, [collegeId, fetchAnalytics]);

  const sortedPeriods = useMemo(() => sortByPeriod(summaryData, 'asc'), [summaryData]);
  const latestPeriod = sortedPeriods.length ? sortedPeriods[sortedPeriods.length - 1] : null;
  const previousPeriod = sortedPeriods.length > 1 ? sortedPeriods[sortedPeriods.length - 2] : null;

  const courseStats = latestPeriod?.course ?? totalDoc?.course ?? {};
  const studentStats = latestPeriod?.student ?? totalDoc?.student ?? {};
  const prevCourse = previousPeriod?.course ?? {};
  const prevStudent = previousPeriod?.student ?? {};

  const periodLabel = latestPeriod
    ? formatPeriodKey(latestPeriod)
    : periodType === 'total'
      ? 'All time'
      : 'Current period';

  const kpiCards = useMemo(() => {
    const compare = periodType !== 'total' && previousPeriod;
    return [
      {
        label: 'Active students',
        value: studentStats.active ?? 0,
        icon: Users,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10',
        href: '/app/students',
        delta: compare ? delta(studentStats.active, prevStudent.active) : undefined,
        sparkline: seriesFromDocs(sortedPeriods, (d) => d.student?.active),
        subLabel: compare ? `vs ${formatPeriodKey(previousPeriod)}` : 'Lifetime snapshot when period is empty',
      },
      {
        label: 'Total enrolled',
        value: courseStats.totalEnrolled ?? 0,
        icon: GraduationCap,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        href: '/app/students',
        delta: compare ? delta(courseStats.totalEnrolled, prevCourse.totalEnrolled) : undefined,
        sparkline: seriesFromDocs(sortedPeriods, (d) => d.course?.totalEnrolled),
        subLabel: 'Course enrolments',
      },
      {
        label: 'Courses completed',
        value: courseStats.completed ?? 0,
        icon: BookOpen,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-500/10',
        href: '/app/courses',
        delta: compare ? delta(courseStats.completed, prevCourse.completed) : undefined,
        sparkline: seriesFromDocs(sortedPeriods, (d) => d.course?.completed),
        subLabel: 'Finished in view',
      },
      {
        label: 'Active courses',
        value: courseStats.active ?? 0,
        icon: Activity,
        color: 'text-sky-600 dark:text-sky-400',
        bg: 'bg-sky-500/10',
        href: '/app/courses',
        delta: compare ? delta(courseStats.active, prevCourse.active) : undefined,
        sparkline: seriesFromDocs(sortedPeriods, (d) => d.course?.active),
        subLabel: 'Running batches',
      },
    ];
  }, [studentStats, courseStats, prevStudent, prevCourse, previousPeriod, periodType, sortedPeriods]);

  const studentMix = useMemo(
    () =>
      STUDENT_MIX.map((item) => ({
        label: item.label,
        value: studentStats[item.key] ?? 0,
        stroke: item.stroke,
      })).filter((d) => d.value > 0),
    [studentStats]
  );

  const trendCategories = useMemo(
    () => sortedPeriods.slice(-8).map((d) => formatPeriodKey(d)),
    [sortedPeriods]
  );
  const trendSeries = useMemo(() => {
    const slice = sortedPeriods.slice(-8);
    return [
      { name: 'Active students', color: '#2563eb', values: slice.map((d) => d.student?.active ?? 0) },
      { name: 'Enrolled', color: '#10b981', values: slice.map((d) => d.course?.totalEnrolled ?? 0) },
      { name: 'Active courses', color: '#8b5cf6', values: slice.map((d) => d.course?.active ?? 0) },
    ];
  }, [sortedPeriods]);

  const completionRate = formatPercent(courseStats.completed, courseStats.totalEnrolled);
  const retentionRate = formatPercent(studentStats.active, studentStats.enrolled || courseStats.totalEnrolled);
  const dropoutRate = formatPercent(studentStats.dropped, studentStats.enrolled || courseStats.totalEnrolled);

  const insights = useMemo(
    () =>
      buildInsights({
        course: courseStats,
        student: studentStats,
        previousCourse: prevCourse,
        previousStudent: prevStudent,
      }),
    [courseStats, studentStats, prevCourse, prevStudent]
  );

  const recentRows = useMemo(() => sortByPeriod(summaryData, 'desc').slice(0, 6), [summaryData]);

  const quickLinks = [
    { title: 'Add student', href: '/app/students', icon: UserPlus, description: 'Enrol a new student' },
    { title: 'Courses', href: '/app/courses', icon: BookOpen, description: 'Manage academic batches' },
    { title: 'Invoices', href: '/app/invoices', icon: Receipt, description: 'Fees and billing' },
    { title: 'Finance', href: '/app/finance/tracking', icon: Wallet, description: 'Income and expenses' },
    { title: 'Staff', href: '/app/staff', icon: Briefcase, description: 'People and payroll' },
    { title: 'Attendance', href: '/app/staff-attendance', icon: Clock, description: 'Daily attendance' },
    { title: 'Analytics', href: '/app/analytics', icon: BarChart3, description: 'Full reports' },
    { title: 'Documents', href: '/app/invoices', icon: FileText, description: 'Invoices and receipts' },
  ].filter((link) => {
    if (link.href.startsWith('/app/finance')) return canAccess(user, 'finance', 'view');
    if (link.href.startsWith('/app/staff-attendance')) return canAccess(user, 'attendance', 'view');
    if (link.href.startsWith('/app/staff')) return canAccess(user, 'staff', 'view');
    if (link.href.startsWith('/app/invoices')) return canAccess(user, 'invoice', 'view') || canAccess(user, 'fees', 'view');
    if (link.href.startsWith('/app/students')) return canAccess(user, 'students', 'view');
    if (link.href.startsWith('/app/courses')) return canAccess(user, 'academic', 'view');
    return true;
  });

  const hasData = Boolean(latestPeriod || totalDoc);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white p-5 sm:p-7 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm text-white/70">{greetingForHour()}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-0.5">
              {displayName}, here is your operations snapshot
            </h1>
            <p className="text-sm text-white/75 mt-2 max-w-xl">
              Course, student, and finance signals for {periodLabel.toLowerCase()}. Switch the period to compare trends.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <PeriodSelector value={periodType} onChange={setPeriodType} tone="inverse" />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white text-slate-900 hover:bg-white/90"
                asChild
              >
                <Link href="/app/analytics">
                  Open analytics
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={fetchAnalytics}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {loading && !hasData
          ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          : kpiCards.map((card) => <AnalyticsStatCard key={card.label} {...card} />)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <DashboardSection title="Completion" description="Completed vs enrolled" className="md:col-span-1">
          {loading && !hasData ? (
            <Skeleton className="h-20" />
          ) : (
            <ProgressRing
              value={completionRate ?? 0}
              label={
                <div>
                  <p className="text-foreground font-medium">Course completion</p>
                  <p>
                    {formatNumber(courseStats.completed ?? 0)} of {formatNumber(courseStats.totalEnrolled ?? 0)}
                  </p>
                </div>
              }
              color="#8b5cf6"
            />
          )}
        </DashboardSection>
        <DashboardSection title="Retention" description="Students still active" className="md:col-span-1">
          {loading && !hasData ? (
            <Skeleton className="h-20" />
          ) : (
            <ProgressRing
              value={retentionRate ?? 0}
              label={
                <div>
                  <p className="text-foreground font-medium">Active retention</p>
                  <p>{formatNumber(studentStats.active ?? 0)} currently active</p>
                </div>
              }
              color="#10b981"
            />
          )}
        </DashboardSection>
        <DashboardSection title="Risk" description="Dropped students" className="md:col-span-1">
          {loading && !hasData ? (
            <Skeleton className="h-20" />
          ) : (
            <ProgressRing
              value={dropoutRate ?? 0}
              label={
                <div>
                  <p className="text-foreground font-medium">Dropout rate</p>
                  <p>{formatNumber(studentStats.dropped ?? 0)} dropped in this view</p>
                </div>
              }
              color="#ef4444"
            />
          )}
        </DashboardSection>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-5">
        <DashboardSection
          title="Performance trend"
          description="Last 8 periods"
          icon={BarChart3}
          className="xl:col-span-3"
        >
          {loading && !hasData ? (
            <Skeleton className="h-52" />
          ) : trendCategories.length ? (
            <GroupedBarChart categories={trendCategories} series={trendSeries} height={220} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No period trend yet. Rebuild totals from Analytics.</p>
          )}
        </DashboardSection>
        <DashboardSection
          title="Student mix"
          description="Status distribution"
          icon={Users}
          className="xl:col-span-2"
        >
          {loading && !hasData ? (
            <Skeleton className="h-52" />
          ) : (
            <DonutChart data={studentMix} centerLabel="in mix" size={156} />
          )}
        </DashboardSection>
      </div>

      {insights.length > 0 && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {insights.map((item) => (
            <AnalyticsInsightCard
              key={item.id}
              title={item.title}
              description={item.description}
              value={item.value}
              variant={item.variant}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <DashboardSection
          title="Course statistics"
          description={`Breakdown for ${periodLabel}`}
          icon={BookOpen}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/analytics" className="gap-1">
                Details <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          <CourseStatsBlock course={courseStats} loading={loading && !hasData} compact hideTitle />
        </DashboardSection>
        <DashboardSection
          title="Student statistics"
          description={`Breakdown for ${periodLabel}`}
          icon={Users}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/analytics" className="gap-1">
                Details <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          <StudentStatsBlock student={studentStats} loading={loading && !hasData} compact hideTitle />
        </DashboardSection>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 sm:gap-5">
        <DashboardSection
          title="Recent periods"
          description="Latest summary records"
          icon={Activity}
          className="xl:col-span-3"
        >
          {loading && !hasData ? (
            <Skeleton className="h-40" />
          ) : recentRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No period records yet.</p>
          ) : (
            <div className="-mx-4 sm:-mx-5 overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium px-4 sm:px-5 py-2">Period</th>
                    <th className="text-right font-medium px-4 py-2">Students</th>
                    <th className="text-right font-medium px-4 py-2">Enrolled</th>
                    <th className="text-right font-medium px-4 py-2">Courses</th>
                    <th className="text-right font-medium px-4 sm:px-5 py-2">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.map((doc, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 sm:px-5 py-2.5 font-medium">{formatPeriodKey(doc)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(doc.student?.active ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(doc.course?.totalEnrolled ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(doc.course?.active ?? 0)}</td>
                      <td className="px-4 sm:px-5 py-2.5 text-right tabular-nums">{formatNumber(doc.course?.completed ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardSection>

        {showFinance ? (
          <DashboardSection
            title="Finance this month"
            description="Income vs expense"
            icon={Wallet}
            className="xl:col-span-2"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/finance/tracking" className="gap-1">
                  Open <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          >
            {loading && !finance ? (
              <Skeleton className="h-36" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-emerald-600" /> Income
                  </span>
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(finance?.totalIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingDown className="h-4 w-4 text-red-600" /> Expense
                  </span>
                  <span className="font-semibold tabular-nums text-red-700 dark:text-red-400">
                    {formatCurrency(finance?.totalExpense)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <span className="text-sm text-muted-foreground">Net position</span>
                  <span
                    className={`font-semibold tabular-nums ${(finance?.net ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}
                  >
                    {formatCurrency(finance?.net)}
                  </span>
                </div>
              </div>
            )}
          </DashboardSection>
        ) : (
          <DashboardSection title="Shortcuts" description="Jump into daily work" className="xl:col-span-2">
            <div className="grid grid-cols-1 gap-1">
              {quickLinks.slice(0, 4).map((link) => (
                <Link
                  key={link.href + link.title}
                  href={link.href}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
                >
                  <link.icon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{link.title}</span>
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </Link>
              ))}
            </div>
          </DashboardSection>
        )}
      </div>

      <DashboardSection title="Quick actions" description="Common destinations across the campus office">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href + link.title}
              href={link.href}
              className="flex items-center gap-3 rounded-lg border border-transparent p-3 hover:border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <link.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{link.title}</p>
                <p className="text-xs text-muted-foreground truncate">{link.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}
