'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  ArrowLeft,
  Calendar,
  Download,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const FINANCE_BASE = '/finance';

const formatCurrency = (value) => {
  if (value == null || (value !== 0 && !value)) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  } catch {
    return String(value);
  }
};

const getDefaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
};

export default function FinanceTrackingReportsPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState(getDefaultRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const [summaryRes, incRes, expRes, catRes] = await Promise.all([
        api.get(`${FINANCE_BASE}/summary?${params.toString()}`, {}, true),
        api.get(`${FINANCE_BASE}/incomes?${params.toString()}`, {}, true),
        api.get(`${FINANCE_BASE}/expenses?${params.toString()}`, {}, true),
        api.get(`${FINANCE_BASE}/categories`, {}, true),
      ]);

      setSummary(summaryRes?.data ?? summaryRes ?? null);
      setIncomes(Array.isArray(incRes?.data ?? incRes) ? (incRes?.data ?? incRes) : []);
      setExpenses(Array.isArray(expRes?.data ?? expRes) ? (expRes?.data ?? expRes) : []);
      setCategories(Array.isArray(catRes?.data ?? catRes) ? (catRes?.data ?? catRes) : []);
    } catch (err) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [user?.college, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const incomeByCategory = useMemo(() => {
    const map = {};
    incomes.forEach((i) => {
      const name = i.category ? (typeof i.category === 'object' ? i.category.name : i.category) : 'Uncategorized';
      map[name] = (map[name] || 0) + (Number(i.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [incomes]);

  const expenseByCategory = useMemo(() => {
    const map = {};
    expenses.forEach((i) => {
      const name = i.category ? (typeof i.category === 'object' ? i.category.name : i.category) : 'Uncategorized';
      map[name] = (map[name] || 0) + (Number(i.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const exportFullCsv = () => {
    const headers = ['Type', 'Title', 'Amount', 'Date', 'Category', 'Account', 'Reference'];
    const incomeRows = incomes.map((i) => [
      'Income',
      i.title || '',
      i.amount ?? '',
      i.date ? new Date(i.date).toISOString().split('T')[0] : '',
      (i.category && (typeof i.category === 'object' ? i.category.name : i.category)) || '',
      (i.account && (typeof i.account === 'object' ? i.account.name : i.account)) || '',
      i.referenceNumber || '',
    ]);
    const expenseRows = expenses.map((i) => [
      'Expense',
      i.title || '',
      i.amount ?? '',
      i.date ? new Date(i.date).toISOString().split('T')[0] : '',
      (i.category && (typeof i.category === 'object' ? i.category.name : i.category)) || '',
      (i.account && (typeof i.account === 'object' ? i.account.name : i.account)) || '',
      i.referenceNumber || '',
    ]);
    const rows = [...incomeRows, ...expenseRows];
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c)}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `finance-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/finance/tracking">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Finance Reports</h1>
            <p className="text-sm text-muted-foreground">Summary and breakdown by period</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" className="w-36 h-9" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} />
            <span className="text-muted-foreground">to</span>
            <Input type="date" className="w-36 h-9" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} />
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={exportFullCsv} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loading && !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="rounded-xl border border-border bg-card p-5 h-28 animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary?.totalIncome)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{summary?.totalIncomeCount ?? 0} records</p>
                </div>
                <TrendingUp className="h-10 w-10 text-emerald-500/50" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 border-red-500/20 bg-red-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expense</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary?.totalExpense)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{summary?.totalExpenseCount ?? 0} records</p>
                </div>
                <TrendingDown className="h-10 w-10 text-red-500/50" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Position</p>
                  <p className={`text-2xl font-bold ${(summary?.net ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(summary?.net)}</p>
                </div>
                <Wallet className="h-10 w-10 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold">Income by Category</h2>
              </div>
              <div className="p-4">
                {incomeByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No income in this period</p>
                ) : (
                  <ul className="space-y-2">
                    {incomeByCategory.map(([name, amount]) => (
                      <li key={name} className="flex justify-between items-center text-sm">
                        <span className="truncate">{name}</span>
                        <span className="font-medium text-emerald-600 shrink-0 ml-2">{formatCurrency(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-red-600" />
                <h2 className="font-semibold">Expense by Category</h2>
              </div>
              <div className="p-4">
                {expenseByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No expenses in this period</p>
                ) : (
                  <ul className="space-y-2">
                    {expenseByCategory.map(([name, amount]) => (
                      <li key={name} className="flex justify-between items-center text-sm">
                        <span className="truncate">{name}</span>
                        <span className="font-medium text-red-600 shrink-0 ml-2">{formatCurrency(amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
