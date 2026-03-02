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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCourseStudentAnalytics,
  getAnalyticsSummary,
  rebuildAnalyticsTotal,
} from '@/lib/analytics-api';
import {
  AnalyticsStatCard,
  PeriodSelector,
  CourseStatsBlock,
  StudentStatsBlock,
  SimpleBarChart,
  AnalyticsInsightCard,
} from '@/components/analytics';
import { Skeleton } from '@/components/ui/skeleton';

const getDefaultDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
};

const formatPeriodKey = (doc) => {
  if (doc.periodKey) return doc.periodKey;
  if (doc.periodStart) {
    const d = new Date(doc.periodStart);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  return '—';
};

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
      Object.keys(course).forEach((k) => { course[k] += doc.course?.[k] ?? 0; });
      Object.keys(student).forEach((k) => { student[k] += doc.student?.[k] ?? 0; });
    });
    return { course, student };
  }, [analyticsList]);

  const trendByPeriod = useMemo(() => {
    const sorted = [...summaryData].sort(
      (a, b) => new Date(a.periodStart || 0) - new Date(b.periodStart || 0)
    );
    return sorted.map((doc) => ({
      key: formatPeriodKey(doc),
      courseActive: doc.course?.active ?? 0,
      studentActive: doc.student?.active ?? 0,
      totalEnrolled: doc.course?.totalEnrolled ?? 0,
    })).filter((d) => d.courseActive > 0 || d.studentActive > 0 || d.totalEnrolled > 0);
  }, [summaryData]);

  const chartData = useMemo(() => {
    if (trendByPeriod.length === 0) return [];
    const max = Math.max(1, ...trendByPeriod.map((d) => d.studentActive + d.totalEnrolled));
    return trendByPeriod.slice(-10).map((d) => ({
      label: d.key,
      value: d.studentActive + d.totalEnrolled,
      color: 'bg-primary',
    }));
  }, [trendByPeriod]);

  const completionInsight = useMemo(() => {
    const total = aggregated.course.totalEnrolled || 0;
    const completed = aggregated.course.completed || 0;
    if (total === 0) return null;
    const pct = Math.round((completed / total) * 100);
    return { pct, total, completed };
  }, [aggregated.course]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Course & Student Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Period-based stats, insights, and trends
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
          <PeriodSelector value={periodType} onChange={setPeriodType} />
          {periodType !== 'total' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                className="w-36 h-9"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                className="w-36 h-9"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCcw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRebuildTotal}
              disabled={rebuilding}
              title="Rebuild total analytics for your college"
            >
              <RotateCcw className={`h-4 w-4 mr-1.5 ${rebuilding ? 'animate-spin' : ''}`} />
              Rebuild totals
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

      {/* Aggregated KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && analyticsList.length === 0 ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <AnalyticsStatCard
              label="Active students (period)"
              value={aggregated.student.active}
              icon={Users}
              color="text-blue-600 dark:text-blue-400"
              bg="bg-blue-500/10"
              border="border-blue-500/20"
            />
            <AnalyticsStatCard
              label="Total enrolled (period)"
              value={aggregated.course.totalEnrolled}
              icon={BookOpen}
              color="text-emerald-600 dark:text-emerald-400"
              bg="bg-emerald-500/10"
              border="border-emerald-500/20"
            />
            <AnalyticsStatCard
              label="Courses completed (period)"
              value={aggregated.course.completed}
              icon={TrendingUp}
              color="text-violet-600 dark:text-violet-400"
              bg="bg-violet-500/10"
              border="border-violet-500/20"
            />
            <AnalyticsStatCard
              label="Active courses (period)"
              value={aggregated.course.active}
              icon={BarChart3}
              color="text-primary"
              bg="bg-primary/10"
              border="border-primary/20"
            />
          </>
        )}
      </div>

      {/* Insights */}
      {completionInsight && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalyticsInsightCard
            title="Completion rate (selected period)"
            description={`${completionInsight.completed} completed of ${completionInsight.total} total enrolled`}
            value={`${completionInsight.pct}%`}
            variant="success"
            icon={TrendingUp}
          />
          <AnalyticsInsightCard
            title="Periods with data"
            description="Summary records in current view"
            value={summaryData.length}
            variant="info"
          />
        </div>
      )}

      {/* Course & Student breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Course statistics
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Aggregated for selected period</p>
          </div>
          <div className="p-4">
            <CourseStatsBlock course={aggregated.course} loading={loading} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Student statistics
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Aggregated for selected period</p>
          </div>
          <div className="p-4">
            <StudentStatsBlock student={aggregated.student} loading={loading} />
          </div>
        </div>
      </div>

      {/* Trend chart */}
      {chartData.length > 0 && !loading && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold">Trend (last 10 periods)</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Combined active + enrolled by period</p>
          </div>
          <div className="p-4">
            <SimpleBarChart data={chartData} showValues />
          </div>
        </div>
      )}

      {/* Period list */}
      {analyticsList.length > 0 && !loading && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold">Records by period</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{analyticsList.length} period(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium">Period</th>
                  <th className="text-right px-4 py-3 font-medium">Active courses</th>
                  <th className="text-right px-4 py-3 font-medium">Total enrolled</th>
                  <th className="text-right px-4 py-3 font-medium">Active students</th>
                </tr>
              </thead>
              <tbody>
                {analyticsList.slice(0, 20).map((doc, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{formatPeriodKey(doc)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{doc.course?.active ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{doc.course?.totalEnrolled ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{doc.student?.active ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {analyticsList.length > 20 && (
              <p className="px-4 py-2 text-muted-foreground text-sm">Showing first 20 of {analyticsList.length}</p>
            )}
          </div>
        </div>
      )}

      {!loading && analyticsList.length === 0 && summaryData.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No analytics data yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use &quot;Rebuild totals&quot; to generate analytics, or ensure your backend has aggregated data for the selected period.
          </p>
          <Button variant="outline" className="mt-4" onClick={handleRebuildTotal} disabled={rebuilding}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Rebuild totals
          </Button>
        </div>
      )}
    </div>
  );
}
