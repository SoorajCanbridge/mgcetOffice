'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  RefreshCcw,
  Calendar,
  RotateCcw,
  BookOpen,
  Users,
  TrendingUp,
  AlertCircle,
  Download,
  Search,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCourseStudentAnalytics,
  getAnalyticsSummary,
  rebuildAnalyticsTotal,
} from '@/lib/analytics-api';
import {
  formatNumber,
  formatPercent,
  formatPeriodKey,
  sortByPeriod,
  delta,
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

const getDefaultDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
};

const COURSE_MIX = [
  { key: 'active', label: 'Active', stroke: '#10b981' },
  { key: 'completed', label: 'Completed', stroke: '#8b5cf6' },
  { key: 'created', label: 'Created', stroke: '#3b82f6' },
  { key: 'cancelled', label: 'Cancelled', stroke: '#f59e0b' },
];

const STUDENT_MIX = [
  { key: 'active', label: 'Active', stroke: '#10b981' },
  { key: 'graduated', label: 'Graduated', stroke: '#8b5cf6' },
  { key: 'dropped', label: 'Dropped', stroke: '#ef4444' },
  { key: 'suspended', label: 'Suspended', stroke: '#f59e0b' },
  { key: 'transferred', label: 'Transferred', stroke: '#64748b' },
  { key: 'enrolled', label: 'Enrolled', stroke: '#2563eb' },
];

function exportCsv(rows) {
  const headers = [
    'Period',
    'Courses created',
    'Courses active',
    'Courses completed',
    'Courses cancelled',
    'Total enrolled',
    'Students enrolled',
    'Students active',
    'Graduated',
    'Dropped',
    'Suspended',
    'Transferred',
  ];
  const lines = [headers.join(',')];
  rows.forEach((doc) => {
    const c = doc.course || {};
    const s = doc.student || {};
    lines.push(
      [
        `"${formatPeriodKey(doc)}"`,
        c.created ?? 0,
        c.active ?? 0,
        c.completed ?? 0,
        c.cancelled ?? 0,
        c.totalEnrolled ?? 0,
        s.enrolled ?? 0,
        s.active ?? 0,
        s.graduated ?? 0,
        s.dropped ?? 0,
        s.suspended ?? 0,
        s.transferred ?? 0,
      ].join(',')
    );
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const collegeId = user?.college;

  const [periodType, setPeriodType] = useState('month');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [analyticsList, setAnalyticsList] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('overview');

  const fetchData = useCallback(async () => {
    if (!collegeId) return;
    setError('');
    setLoading(true);
    try {
      const params = { periodType };
      if (periodType !== 'total') {
        if (dateRange.from) params.from = dateRange.from;
        if (dateRange.to) params.to = dateRange.to;
      }
      const [listRes, summaryRes] = await Promise.all([
        getCourseStudentAnalytics(collegeId, params).catch(() => ({ data: [] })),
        getAnalyticsSummary(collegeId, { periodType }).catch(() => ({ data: [] })),
      ]);
      setAnalyticsList(Array.isArray(listRes?.data) ? listRes.data : []);
      setSummaryData(Array.isArray(summaryRes?.data) ? summaryRes.data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [collegeId, periodType, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!collegeId) return;
    fetchData();
  }, [collegeId, fetchData]);

  const handleRebuildTotal = useCallback(async () => {
    if (!collegeId) return;
    setError('');
    setSuccess('');
    setRebuilding(true);
    try {
      await rebuildAnalyticsTotal(collegeId);
      setSuccess('Total analytics rebuilt successfully.');
      fetchData();
    } catch (err) {
      setError(err?.message || 'Rebuild failed');
    } finally {
      setRebuilding(false);
    }
  }, [collegeId, fetchData]);

  const aggregated = useMemo(() => {
    const course = { created: 0, active: 0, completed: 0, cancelled: 0, totalEnrolled: 0 };
    const student = { enrolled: 0, graduated: 0, dropped: 0, suspended: 0, transferred: 0, active: 0 };
    analyticsList.forEach((doc) => {
      Object.keys(course).forEach((k) => {
        course[k] += doc.course?.[k] ?? 0;
      });
      Object.keys(student).forEach((k) => {
        student[k] += doc.student?.[k] ?? 0;
      });
    });
    return { course, student };
  }, [analyticsList]);

  const sortedSummary = useMemo(() => sortByPeriod(summaryData, 'asc'), [summaryData]);
  const latest = sortedSummary[sortedSummary.length - 1];
  const previous = sortedSummary[sortedSummary.length - 2];
  const compare = periodType !== 'total' && previous;

  const trendSlice = sortedSummary.slice(-12);
  const trendCategories = trendSlice.map((d) => formatPeriodKey(d));
  const trendSeries = [
    { name: 'Active students', color: '#2563eb', values: trendSlice.map((d) => d.student?.active ?? 0) },
    { name: 'Enrolled', color: '#10b981', values: trendSlice.map((d) => d.course?.totalEnrolled ?? 0) },
    { name: 'Completed courses', color: '#8b5cf6', values: trendSlice.map((d) => d.course?.completed ?? 0) },
  ];

  const completion = formatPercent(aggregated.course.completed, aggregated.course.totalEnrolled);
  const retention = formatPercent(aggregated.student.active, aggregated.student.enrolled || aggregated.course.totalEnrolled);
  const dropout = formatPercent(aggregated.student.dropped, aggregated.student.enrolled || aggregated.course.totalEnrolled);

  const insights = useMemo(
    () =>
      buildInsights({
        course: aggregated.course,
        student: aggregated.student,
        previousCourse: previous?.course ?? {},
        previousStudent: previous?.student ?? {},
      }),
    [aggregated, previous]
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = sortByPeriod(analyticsList, 'desc');
    if (!q) return rows;
    return rows.filter((doc) => formatPeriodKey(doc).toLowerCase().includes(q));
  }, [analyticsList, query]);

  const empty = !loading && analyticsList.length === 0 && summaryData.length === 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Course and student performance by period, with comparisons, mix, and export.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center">
          <PeriodSelector value={periodType} onChange={setPeriodType} />
          {periodType !== 'total' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                className="h-9 w-full sm:w-36"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                className="h-9 w-full sm:w-36"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRebuildTotal} disabled={rebuilding}>
              <RotateCcw className={`h-4 w-4 mr-1.5 ${rebuilding ? 'animate-spin' : ''}`} />
              Rebuild
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(analyticsList)}
              disabled={!analyticsList.length}
            >
              <Download className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {loading && analyticsList.length === 0 ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <AnalyticsStatCard
              label="Active students"
              value={aggregated.student.active}
              icon={Users}
              color="text-blue-600 dark:text-blue-400"
              bg="bg-blue-500/10"
              delta={compare ? delta(latest?.student?.active, previous?.student?.active) : undefined}
              subLabel={compare ? `vs ${formatPeriodKey(previous)}` : 'Selected period'}
              sparkline={sortedSummary.map((d) => d.student?.active ?? 0)}
            />
            <AnalyticsStatCard
              label="Total enrolled"
              value={aggregated.course.totalEnrolled}
              icon={BookOpen}
              color="text-emerald-600 dark:text-emerald-400"
              bg="bg-emerald-500/10"
              delta={compare ? delta(latest?.course?.totalEnrolled, previous?.course?.totalEnrolled) : undefined}
              subLabel="Across matching records"
              sparkline={sortedSummary.map((d) => d.course?.totalEnrolled ?? 0)}
            />
            <AnalyticsStatCard
              label="Courses completed"
              value={aggregated.course.completed}
              icon={TrendingUp}
              color="text-violet-600 dark:text-violet-400"
              bg="bg-violet-500/10"
              delta={compare ? delta(latest?.course?.completed, previous?.course?.completed) : undefined}
              subLabel="Finished in range"
              sparkline={sortedSummary.map((d) => d.course?.completed ?? 0)}
            />
            <AnalyticsStatCard
              label="Active courses"
              value={aggregated.course.active}
              icon={Layers}
              color="text-sky-600 dark:text-sky-400"
              bg="bg-sky-500/10"
              delta={compare ? delta(latest?.course?.active, previous?.course?.active) : undefined}
              subLabel={`${analyticsList.length} period record(s)`}
              sparkline={sortedSummary.map((d) => d.course?.active ?? 0)}
            />
          </>
        )}
      </div>

      {empty ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No analytics data yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Rebuild totals to generate an all-time snapshot, or widen the date range if your backend already stores period aggregates.
          </p>
          <Button variant="outline" className="mt-4" onClick={handleRebuildTotal} disabled={rebuilding}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Rebuild totals
          </Button>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList className="w-full sm:w-auto h-auto flex flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="trends">Trends &amp; records</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <DashboardSection title="Completion">
                <ProgressRing
                  value={completion ?? 0}
                  color="#8b5cf6"
                  label={
                    <div>
                      <p className="font-medium text-foreground">Course completion</p>
                      <p>
                        {formatNumber(aggregated.course.completed)} of {formatNumber(aggregated.course.totalEnrolled)}
                      </p>
                    </div>
                  }
                />
              </DashboardSection>
              <DashboardSection title="Retention">
                <ProgressRing
                  value={retention ?? 0}
                  color="#10b981"
                  label={
                    <div>
                      <p className="font-medium text-foreground">Active students</p>
                      <p>{formatNumber(aggregated.student.active)} retained</p>
                    </div>
                  }
                />
              </DashboardSection>
              <DashboardSection title="Dropout">
                <ProgressRing
                  value={dropout ?? 0}
                  color="#ef4444"
                  label={
                    <div>
                      <p className="font-medium text-foreground">Risk share</p>
                      <p>{formatNumber(aggregated.student.dropped)} dropped</p>
                    </div>
                  }
                />
              </DashboardSection>
            </div>

            {insights.length > 0 && (
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
              <DashboardSection title="Course mix" description="Status share in the selected range" icon={BookOpen}>
                <DonutChart
                  data={COURSE_MIX.map((item) => ({
                    label: item.label,
                    value: aggregated.course[item.key] ?? 0,
                    stroke: item.stroke,
                  }))}
                  centerLabel="course events"
                />
              </DashboardSection>
              <DashboardSection title="Student mix" description="Status share in the selected range" icon={Users}>
                <DonutChart
                  data={STUDENT_MIX.filter((item) => item.key !== 'enrolled').map((item) => ({
                    label: item.label,
                    value: aggregated.student[item.key] ?? 0,
                    stroke: item.stroke,
                  }))}
                  centerLabel="students"
                />
              </DashboardSection>
            </div>

            {compare && (
              <DashboardSection title="Period comparison" description={`${formatPeriodKey(previous)} vs ${formatPeriodKey(latest)}`}>
                <div className="-mx-4 sm:-mx-5 overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left font-medium px-4 sm:px-5 py-2">Metric</th>
                        <th className="text-right font-medium px-4 py-2">Previous</th>
                        <th className="text-right font-medium px-4 py-2">Latest</th>
                        <th className="text-right font-medium px-4 sm:px-5 py-2">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Active students', previous.student?.active, latest.student?.active],
                        ['Enrolled', previous.course?.totalEnrolled, latest.course?.totalEnrolled],
                        ['Active courses', previous.course?.active, latest.course?.active],
                        ['Completed', previous.course?.completed, latest.course?.completed],
                        ['Dropped', previous.student?.dropped, latest.student?.dropped],
                      ].map(([label, prev, next]) => {
                        const d = delta(next, prev);
                        return (
                          <tr key={label} className="border-b border-border last:border-0">
                            <td className="px-4 sm:px-5 py-2.5">{label}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(prev)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatNumber(next)}</td>
                            <td className={`px-4 sm:px-5 py-2.5 text-right tabular-nums ${d.direction === 'up' ? 'text-emerald-600' : d.direction === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {d.value > 0 ? '+' : ''}
                              {formatNumber(d.value)} ({d.pct}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </DashboardSection>
            )}
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-5 mt-0">
            <DashboardSection title="Course statistics" description="Aggregated for the selected period" icon={BookOpen}>
              <CourseStatsBlock course={aggregated.course} loading={loading} hideTitle />
            </DashboardSection>
            <DashboardSection title="Student statistics" description="Aggregated for the selected period" icon={Users}>
              <StudentStatsBlock student={aggregated.student} loading={loading} hideTitle />
            </DashboardSection>
          </TabsContent>

          <TabsContent value="trends" className="space-y-5 mt-0">
            <DashboardSection title="Trend (last 12 periods)" description="Active students, enrolments, and completions" icon={BarChart3}>
              {trendCategories.length ? (
                <GroupedBarChart categories={trendCategories} series={trendSeries} height={240} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No summary trend for this period type.</p>
              )}
            </DashboardSection>

            <DashboardSection
              title="Records by period"
              description={`${filteredRows.length} matching record(s)`}
              action={
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter period"
                    className="h-9 w-36 sm:w-48 pl-8"
                  />
                </div>
              }
            >
              {filteredRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No records match this filter.</p>
              ) : (
                <div className="-mx-4 sm:-mx-5 overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                        <th className="text-left font-medium px-4 sm:px-5 py-2.5">Period</th>
                        <th className="text-right font-medium px-3 py-2.5">Active courses</th>
                        <th className="text-right font-medium px-3 py-2.5">Completed</th>
                        <th className="text-right font-medium px-3 py-2.5">Enrolled</th>
                        <th className="text-right font-medium px-3 py-2.5">Active students</th>
                        <th className="text-right font-medium px-3 py-2.5">Graduated</th>
                        <th className="text-right font-medium px-4 sm:px-5 py-2.5">Dropped</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((doc, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="px-4 sm:px-5 py-2.5 font-medium">{formatPeriodKey(doc)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(doc.course?.active ?? 0)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(doc.course?.completed ?? 0)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(doc.course?.totalEnrolled ?? 0)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(doc.student?.active ?? 0)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(doc.student?.graduated ?? 0)}</td>
                          <td className="px-4 sm:px-5 py-2.5 text-right tabular-nums">{formatNumber(doc.student?.dropped ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardSection>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
