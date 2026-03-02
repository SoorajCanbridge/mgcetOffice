'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  Calendar,
  RefreshCcw,
  FileText,
  BarChart3,
  Receipt,
  Plus,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const FINANCE_BASE = '/finance';

const formatCurrency = (value) => {
  if (value == null || (value !== 0 && !value)) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return String(value);
  }
};

const formatDate = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getDefaultDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
};

export default function FinanceTrackingDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [recentIncome, setRecentIncome] = useState([]);
  const [recentExpense, setRecentExpense] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  const fetchSummary = useCallback(async () => {
    if (!user?.college) return;
    try {
      setError('');
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      const res = await api.get(`${FINANCE_BASE}/summary?${params.toString()}`, {}, true);
      setSummary(res?.data ?? res ?? null);
    } catch (err) {
      setError(err.message || 'Failed to load summary');
    }
  }, [user?.college, dateRange.startDate, dateRange.endDate]);

  const fetchRecent = useCallback(async () => {
    if (!user?.college) return;
    try {
      const params = new URLSearchParams();
      params.set('limit', '5');
      params.set('sort', 'date');
      params.set('order', 'desc');
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const [incRes, expRes, accRes] = await Promise.all([
        api.get(`${FINANCE_BASE}/incomes?${params.toString()}`, {}, true),
        api.get(`${FINANCE_BASE}/expenses?${params.toString()}`, {}, true),
        api.get(`${FINANCE_BASE}/accounts`, {}, true),
      ]);
      setRecentIncome(Array.isArray(incRes?.data ?? incRes) ? (incRes?.data ?? incRes) : []);
      setRecentExpense(Array.isArray(expRes?.data ?? expRes) ? (expRes?.data ?? expRes) : []);
      setAccounts(Array.isArray(accRes?.data ?? accRes) ? (accRes?.data ?? accRes) : []);
    } catch (err) {
      console.error('Failed to load recent transactions:', err);
    }
  }, [user?.college, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (!user?.college) return;
    setLoading(true);
    Promise.all([fetchSummary(), fetchRecent()]).finally(() => setLoading(false));
  }, [user?.college, fetchSummary, fetchRecent]);

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Total Income',
        value: summary.totalIncome ?? 0,
        format: formatCurrency(summary.totalIncome),
        icon: TrendingUp,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
      },
      {
        label: 'Total Expense',
        value: summary.totalExpense ?? 0,
        format: formatCurrency(summary.totalExpense),
        icon: TrendingDown,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
      },
      {
        label: 'Net Position',
        value: summary.net ?? 0,
        format: formatCurrency(summary.net),
        icon: Wallet,
        color: (summary.net ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
        bg: (summary.net ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
        border: (summary.net ?? 0) >= 0 ? 'border-emerald-500/20' : 'border-red-500/20',
      },
    ];
  }, [summary]);

  const quickLinks = [
    { title: 'Income', href: '/app/finance/tracking/income', icon: TrendingUp, description: 'Record and manage income' },
    { title: 'Expenses', href: '/app/finance/tracking/expenses', icon: TrendingDown, description: 'Record and manage expenses' },
    { title: 'Reports', href: '/app/finance/tracking/reports', icon: BarChart3, description: 'View reports and export' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Finance Tracking</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Income & expense overview and quick access
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))}
              className="w-36 h-9"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))}
              className="w-36 h-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => { fetchSummary(); fetchRecent(); }} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading && !summary ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-5 w-24 bg-muted rounded mb-3" />
              <div className="h-8 w-32 bg-muted rounded" />
            </div>
          ))
        ) : (
          kpiCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border ${card.border} ${card.bg} bg-card p-5 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.format}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bg} ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick links */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="font-semibold">Quick actions</h2>
          <p className="text-sm text-muted-foreground">Jump to income, expenses, or reports</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Income */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Recent Income
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/finance/tracking/income" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentIncome.length === 0 && !loading && (
              <div className="p-6 text-center text-muted-foreground text-sm">No income in this period</div>
            )}
            {recentIncome.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 cursor-pointer"
                onClick={() => router.push(`/app/incomes/${item._id}`)}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.date)} · {(item.category && (typeof item.category === 'object' ? item.category.name : item.category)) || '—'}</p>
                </div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Recent Expenses
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/finance/tracking/expenses" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentExpense.length === 0 && !loading && (
              <div className="p-6 text-center text-muted-foreground text-sm">No expenses in this period</div>
            )}
            {recentExpense.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 cursor-pointer"
                onClick={() => router.push(`/app/expenses/${item._id}`)}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.date)} · {(item.category && (typeof item.category === 'object' ? item.category.name : item.category)) || '—'}</p>
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400 shrink-0 ml-2">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account balances summary */}
      {accounts.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Account Balances</h2>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {accounts.slice(0, 6).map((acc) => (
                <div
                  key={acc._id}
                  className="rounded-lg border border-border bg-muted/20 px-4 py-2 min-w-[140px]"
                >
                  <p className="text-xs text-muted-foreground truncate">{acc.name}</p>
                  <p className="font-semibold">{formatCurrency(acc.balance)}</p>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" asChild>
              <Link href="/app/accounts">View all accounts</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
