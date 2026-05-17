'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tag,
  ArrowLeft,
  Calendar,
  Download,
  RefreshCcw,
  Edit2,
  TrendingUp,
  TrendingDown,
  Layers,
  FileText,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES_BASE = '/finance/categories';
const INCOMES_BASE = '/finance/incomes';
const EXPENSES_BASE = '/finance/expenses';

const formatDate = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatCurrency = (value) => {
  if (value == null || (value !== 0 && !value)) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  } catch {
    return String(value);
  }
};

const formatDateForCSV = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const REQUEST_LIMIT = 200;
const MAX_AUTO_PAGES = 50;

const mergeRowsById = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    if (row?._id) map.set(row._id, row);
  });
  return Array.from(map.values());
};

const extractPageRows = (res) => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const fetchPaginatedByCategory = async (endpoint, baseParams, isCancelledFilter) => {
  const allRows = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_AUTO_PAGES) {
    const params = new URLSearchParams(baseParams);
    if (isCancelledFilter !== undefined) params.set('isCancelled', isCancelledFilter);
    params.set('page', String(page));
    params.set('limit', String(REQUEST_LIMIT));

    const res = await api.get(`${endpoint}?${params.toString()}`, {}, true);
    const pageRows = extractPageRows(res);
    allRows.push(...pageRows);

    const payload = res?.data ?? res;
    const pagination = res?.pagination || payload?.pagination || null;
    const currentPage = Number(pagination?.page ?? page);
    const totalPages = Number(pagination?.pages ?? pagination?.totalPages ?? 0);
    const nextPage = Number(pagination?.nextPage ?? 0);

    const hasNextByMeta =
      typeof pagination?.hasNextPage === 'boolean'
        ? pagination.hasNextPage
        : nextPage > currentPage || (totalPages > 0 && currentPage < totalPages);

    const hasNextBySize = !pagination && pageRows.length === REQUEST_LIMIT;
    hasMore = hasNextByMeta || hasNextBySize;

    if (!hasMore) break;
    page = nextPage > currentPage ? nextPage : page + 1;
  }

  return allRows;
};

const fetchCategoryRecords = async (endpoint, categoryId, dateRange, isCancelledFilter) => {
  const baseParams = new URLSearchParams();
  baseParams.append('categoryId', categoryId);
  if (dateRange.startDate) baseParams.append('startDate', dateRange.startDate);
  if (dateRange.endDate) baseParams.append('endDate', dateRange.endDate);

  if (isCancelledFilter === '') {
    const [activeRows, cancelledRows] = await Promise.all([
      fetchPaginatedByCategory(endpoint, baseParams, 'false'),
      fetchPaginatedByCategory(endpoint, baseParams, 'true'),
    ]);
    return mergeRowsById([...activeRows, ...cancelledRows]);
  }

  return fetchPaginatedByCategory(endpoint, baseParams, isCancelledFilter);
};

export default function FinanceCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const categoryId = params?.id;

  const [category, setCategory] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchCategory = useCallback(async () => {
    if (!categoryId || !user?.college) return;
    try {
      const res = await api.get(`${CATEGORIES_BASE}/${categoryId}`, {}, true);
      setCategory(res?.data ?? res ?? null);
    } catch (err) {
      setError(err.message || 'Failed to load category');
    }
  }, [categoryId, user?.college]);

  const fetchRecords = useCallback(async () => {
    if (!categoryId || !user?.college) return;
    try {
      setRecordsLoading(true);
      const [incomeRows, expenseRows] = await Promise.all([
        fetchCategoryRecords(INCOMES_BASE, categoryId, dateRange, statusFilter),
        fetchCategoryRecords(EXPENSES_BASE, categoryId, dateRange, statusFilter),
      ]);
      setIncomes(incomeRows);
      setExpenses(expenseRows);
    } catch (err) {
      setIncomes([]);
      setExpenses([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [categoryId, user?.college, dateRange.startDate, dateRange.endDate, statusFilter]);

  useEffect(() => {
    if (!user?.college || !categoryId) return;
    setLoading(true);
    setError('');
    fetchCategory().finally(() => setLoading(false));
  }, [user?.college, categoryId, fetchCategory]);

  useEffect(() => {
    if (!categoryId || !user?.college) return;
    fetchRecords();
  }, [categoryId, user?.college, fetchRecords]);

  const stats = useMemo(() => {
    const activeIncomes = incomes.filter((i) => !i.isCancelled);
    const cancelledIncomes = incomes.filter((i) => i.isCancelled);
    const activeExpenses = expenses.filter((e) => !e.isCancelled);
    const cancelledExpenses = expenses.filter((e) => e.isCancelled);

    const totalIncome = activeIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalExpense = activeExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const cancelledIncomeTotal = cancelledIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const cancelledExpenseTotal = cancelledExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      cancelledIncomeTotal,
      cancelledExpenseTotal,
      incomeCount: incomes.length,
      expenseCount: expenses.length,
      activeIncomeCount: activeIncomes.length,
      cancelledIncomeCount: cancelledIncomes.length,
      activeExpenseCount: activeExpenses.length,
      cancelledExpenseCount: cancelledExpenses.length,
    };
  }, [incomes, expenses]);

  const handleExportCSV = useCallback(() => {
    if (!category) return;
    setExporting(true);
    try {
      const rows = [];
      rows.push(['Category', category.name || '', category.type || '', category.isActive ? 'Active' : 'Inactive']);
      rows.push(['Description', category.description || '']);
      rows.push([]);
      rows.push(['Date range', dateRange.startDate || 'All', 'to', dateRange.endDate || 'All']);
      rows.push(['Total Income (active)', stats.totalIncome, 'Total Expense (active)', stats.totalExpense, 'Net', stats.net]);
      rows.push(['Cancelled Income', stats.cancelledIncomeTotal, 'Cancelled Expense', stats.cancelledExpenseTotal]);
      rows.push([]);
      if (incomes.length) {
        rows.push(['Incomes', 'Title', 'Amount', 'Date', 'Status', 'Reference']);
        incomes.forEach((i) =>
          rows.push(['', i.title || '', i.amount ?? '', formatDateForCSV(i.date), i.isCancelled ? 'Cancelled' : 'Active', i.referenceNumber || '']),
        );
        rows.push([]);
      }
      if (expenses.length) {
        rows.push(['Expenses', 'Title', 'Amount', 'Date', 'Status', 'Vendor', 'Reference']);
        expenses.forEach((e) =>
          rows.push([
            '',
            e.title || '',
            e.amount ?? '',
            formatDateForCSV(e.date),
            e.isCancelled ? 'Cancelled' : 'Active',
            e.vendor || '',
            e.referenceNumber || '',
          ]),
        );
      }
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `category-${(category.name || categoryId).replace(/\s+/g, '-')}-${dateRange.startDate || 'all'}-${dateRange.endDate || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }, [category, categoryId, dateRange, stats, incomes, expenses]);

  if (loading && !category) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <p className="text-destructive">{error || 'Category not found'}</p>
        <Button variant="outline" asChild>
          <Link href="/app/finance/categories"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Categories</Link>
        </Button>
      </div>
    );
  }

  const typeLabel = category.type === 'both' ? 'Income & Expense' : category.type === 'income' ? 'Income' : 'Expense';
  const showIncome = category.type === 'income' || category.type === 'both';
  const showExpense = category.type === 'expense' || category.type === 'both';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/finance/categories"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {category.type === 'both' ? <Layers className="h-5 w-5" /> : category.type === 'income' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{category.name}</h1>
            <p className="text-sm text-muted-foreground">{typeLabel} · {category.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/finance/categories?edit=${categoryId}`}><Edit2 className="h-4 w-4 mr-2" /> Edit</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" /> {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Category info card */}
      <div className="rounded-xl border border-border bg-card p-4">
        {category.description && <p className="text-muted-foreground text-sm">{category.description}</p>}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" className="w-36 h-9" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} />
          <span className="text-muted-foreground">to</span>
          <Input type="date" className="w-36 h-9" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="false">Active</option>
            <option value="true">Cancelled</option>
          </select>
          <Button variant="secondary" size="sm" onClick={fetchRecords} disabled={recordsLoading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${recordsLoading ? 'animate-spin' : ''}`} /> Apply
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {showIncome && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-medium text-muted-foreground">Active income</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeIncomeCount} active · {stats.cancelledIncomeCount} cancelled</p>
          </div>
        )}
        {showExpense && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-medium text-muted-foreground">Active expense</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeExpenseCount} active · {stats.cancelledExpenseCount} cancelled</p>
          </div>
        )}
        {(stats.cancelledIncomeCount > 0 || stats.cancelledExpenseCount > 0) && (
          <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 p-4">
            <p className="text-sm font-medium text-muted-foreground">Cancelled totals</p>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
              {showIncome && <span className="block">Income: {formatCurrency(stats.cancelledIncomeTotal)}</span>}
              {showExpense && <span className="block">Expense: {formatCurrency(stats.cancelledExpenseTotal)}</span>}
            </p>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Net (active only)</p>
          <p className={`text-xl font-bold ${stats.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(stats.net)}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.incomeCount + stats.expenseCount} entries listed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {showIncome && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /> Income entries</h2>
              <Button variant="ghost" size="sm" asChild><Link href={`/app/finance/tracking/income?categoryId=${categoryId}`}>View in Income</Link></Button>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {incomes.length === 0 ? <div className="p-6 text-center text-muted-foreground text-sm">No income in this period</div> : incomes.map((i) => (
                <div key={i._id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30" onClick={() => router.push(`/app/incomes/${i._id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push(`/app/incomes/${i._id}`)}>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {i.title || 'Untitled'}
                      {i.isCancelled && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded">Cancelled</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(i.date)}</p>
                  </div>
                  <span className={`font-medium ${i.isCancelled ? 'text-muted-foreground line-through' : 'text-emerald-600'}`}>{formatCurrency(i.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {showExpense && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-600" /> Expense entries</h2>
              <Button variant="ghost" size="sm" asChild><Link href={`/app/finance/tracking/expenses?categoryId=${categoryId}`}>View in Expenses</Link></Button>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {expenses.length === 0 ? <div className="p-6 text-center text-muted-foreground text-sm">No expenses in this period</div> : expenses.map((e) => (
                <div key={e._id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30" onClick={() => router.push(`/app/expenses/${e._id}`)} role="button" tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && router.push(`/app/expenses/${e._id}`)}>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {e.title || 'Untitled'}
                      {e.isCancelled && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-slate-500/10 px-1.5 py-0.5 rounded">Cancelled</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.date)} · {e.vendor || '—'}</p>
                  </div>
                  <span className={`font-medium ${e.isCancelled ? 'text-muted-foreground line-through' : 'text-red-600'}`}>{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
