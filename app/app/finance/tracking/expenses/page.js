'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TrendingDown,
  ArrowLeft,
  Plus,
  Search,
  RefreshCcw,
  Eye,
  MoreVertical,
  XCircle,
  Save,
  X,
  Download,
  Filter,
  FileText,
  Repeat,
  Trash2,
  CreditCard,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getUploadedImageUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';
import { DataTable } from '@/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RecurringExpenseModal from '@/components/RecurringExpenseModal';
import PayRecurringExpenseModal from '@/components/PayRecurringExpenseModal';

const FINANCE_BASE = '/finance';

const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
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

const getDateOnlyKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && value.length >= 10) return value.slice(0, 10);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

const getTimestamp = (value) => {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const getRecurringStatusLabel = (status) => {
  if (status === 'overdue') return 'Overdue';
  if (status === 'paused') return 'Paused';
  return 'Active';
};

const getRecurringStatusClass = (status) => {
  if (status === 'overdue') return 'bg-destructive/10 text-destructive';
  if (status === 'paused') return 'bg-muted text-muted-foreground';
  return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
};

// API `serialNumber` -> display as 5-digit voucher number (e.g. 1 -> 00001)
const formatVoucherNumber = (serialNumber) => {
  if (serialNumber === null || serialNumber === undefined || serialNumber === '') return '';
  const digits = String(serialNumber).replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(5, '0').slice(-5);
};

const EMPTY_RECIPIENT = { name: '', phone: '', email: '', address: '' };

const EMPTY_EXPENSE = {
  title: '',
  amount: '',
  date: formatDateForInput(new Date()),
  category: '',
  account: '',
  referenceNumber: '',
  notes: '',
  files: [],
  isCancelled: false,
  haveRecipient: false,
  recipient: { ...EMPTY_RECIPIENT },
};

export default function FinanceTrackingExpensesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringError, setRecurringError] = useState('');
  const [scheduleToPay, setScheduleToPay] = useState(null);
  const [recurringSearch, setRecurringSearch] = useState('');
  const [recurringStatusFilter, setRecurringStatusFilter] = useState('all');
  const [filters, setFilters] = useState({
    search: '',
    categoryId: searchParams.get('categoryId') || '',
    accountId: '',
    recipient: '',
    startDate: '',
    endDate: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringDetailsRow, setRecurringDetailsRow] = useState(null);
  const [recurringHistory, setRecurringHistory] = useState([]);
  const [recurringHistoryLoading, setRecurringHistoryLoading] = useState(false);
  const [recurringHistoryError, setRecurringHistoryError] = useState('');
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense' || c.type === 'both'), [categories]);
  const recurringStats = useMemo(() => {
    const total = recurringSchedules.length;
    const active = recurringSchedules.filter((r) => (r.currentStatus || 'active') === 'active').length;
    const overdue = recurringSchedules.filter((r) => (r.currentStatus || 'active') === 'overdue').length;
    const missed = recurringSchedules.reduce((sum, r) => sum + Number(r.missedPayments || 0), 0);
    return { total, active, overdue, missed };
  }, [recurringSchedules]);

  const filteredRecurringSchedules = useMemo(() => {
    const q = recurringSearch.trim().toLowerCase();
    return recurringSchedules.filter((r) => {
      const status = r.currentStatus || (r.isActive === false ? 'paused' : 'active');
      const statusOk = recurringStatusFilter === 'all' || status === recurringStatusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      const title = (r.title || '').toLowerCase();
      const category =
        (typeof r.category === 'object' ? r.category?.name : r.category || '').toLowerCase();
      const account =
        (typeof r.account === 'object' ? r.account?.name : r.account || '').toLowerCase();
      const vendor = (r.vendor || '').toLowerCase();
      return (
        title.includes(q) ||
        category.includes(q) ||
        account.includes(q) ||
        vendor.includes(q)
      );
    });
  }, [recurringSchedules, recurringSearch, recurringStatusFilter]);

  const fetchExpenses = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const baseParams = new URLSearchParams();
      if (filters.categoryId) baseParams.append('categoryId', filters.categoryId);
      if (filters.accountId) baseParams.append('accountId', filters.accountId);
      if (filters.recipient) baseParams.append('recipient', filters.recipient);
      if (filters.startDate) baseParams.append('startDate', filters.startDate);
      if (filters.endDate) baseParams.append('endDate', filters.endDate);

      const REQUEST_LIMIT = 200;
      const MAX_AUTO_PAGES = 50;
      let page = 1;
      let hasMore = true;
      const allRows = [];

      while (hasMore && page <= MAX_AUTO_PAGES) {
        const params = new URLSearchParams(baseParams);
        params.set('page', String(page));
        params.set('limit', String(REQUEST_LIMIT));

        const res = await api.get(`${FINANCE_BASE}/expenses?${params.toString()}`, {}, true);
        const payload = res?.data ?? res;
        const pageRows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
          ? payload.items
          : [];

        allRows.push(...pageRows);

        const pagination = res?.pagination || payload?.pagination || null;
        const currentPage = Number(pagination?.page ?? page);
        const totalPages = Number(pagination?.pages ?? pagination?.totalPages ?? 0);
        const nextPage = Number(pagination?.nextPage ?? 0);

        const hasNextByMeta =
          typeof pagination?.hasNextPage === 'boolean'
            ? pagination.hasNextPage
            : (nextPage > currentPage) || (totalPages > 0 && currentPage < totalPages);

        const hasNextBySize = !pagination && pageRows.length === REQUEST_LIMIT;
        hasMore = hasNextByMeta || hasNextBySize;

        if (!hasMore) break;
        page = nextPage > currentPage ? nextPage : page + 1;
      }

      let list = allRows;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (i) =>
            (i.title || '').toLowerCase().includes(q) ||
            ((i.recipient && typeof i.recipient === 'object' && (i.recipient.name || '')) || '').toLowerCase().includes(q) ||
            (formatVoucherNumber(i.serialNumber) || '').toLowerCase().includes(q) ||
            (i.referenceNumber || '').toLowerCase().includes(q) ||
            (i.notes || '').toLowerCase().includes(q)
        );
      }
      setExpenses(list);
    } catch (err) {
      setError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [user?.college, filters.categoryId, filters.accountId, filters.recipient, filters.startDate, filters.endDate, filters.search]);

  const fetchCategories = useCallback(async () => {
    if (!user?.college) return;
    try {
      const res = await api.get(`${FINANCE_BASE}/categories`, {}, true);
      setCategories(Array.isArray(res?.data ?? res) ? (res?.data ?? res) : []);
    } catch (e) {
      console.error(e);
    }
  }, [user?.college]);

  const fetchAccounts = useCallback(async () => {
    if (!user?.college) return;
    try {
      const res = await api.get(`${FINANCE_BASE}/accounts`, {}, true);
      setAccounts(Array.isArray(res?.data ?? res) ? (res?.data ?? res) : []);
    } catch (e) {
      console.error(e);
    }
  }, [user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchCategories();
    fetchAccounts();
  }, [user?.college, fetchCategories, fetchAccounts]);

  const fetchRecurringSchedules = useCallback(async () => {
    if (!user?.college) return;
    try {
      setRecurringLoading(true);
      setRecurringError('');
      const res = await api.get(`${FINANCE_BASE}/recurring-expenses?limit=200&sortBy=nextDueDate&sortOrder=asc`, {}, true);
      const list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      setRecurringSchedules(list);
    } catch (err) {
      setRecurringError(err.message || 'Failed to load recurring expenses');
    } finally {
      setRecurringLoading(false);
    }
  }, [user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchRecurringSchedules();
  }, [user?.college, fetchRecurringSchedules]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'haveRecipient') {
      setForm((prev) => ({ ...prev, haveRecipient: checked, recipient: checked ? { ...prev.recipient } : { ...EMPTY_RECIPIENT } }));
      return;
    }
    if (name.startsWith('recipient.')) {
      const key = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        recipient: { ...(prev.recipient || {}), [key]: value },
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setForm(EMPTY_EXPENSE);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    setUploadingFile(true);
    setError('');
    try {
      const paths = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const fd = new FormData();
        fd.append('folder', 'expense');
        fd.append('file', file);
        const res = await api.uploadFile('/upload/single', fd, true);
        const path = res?.data?.path ?? res?.path;
        if (path) paths.push(path);
      }
      if (paths.length) setForm((prev) => ({ ...prev, files: [...(prev.files || []), ...paths] }));
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    setForm((prev) => ({
      ...prev,
      files: (prev.files || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const recipientPayload =
        form.haveRecipient && form.recipient
          ? {
              name: (form.recipient.name || '').trim() || undefined,
              phone: (form.recipient.phone || '').trim() || undefined,
              email: (form.recipient.email || '').trim().toLowerCase() || undefined,
              address: (form.recipient.address || '').trim() || undefined,
            }
          : undefined;
      const hasRecipient = recipientPayload && (recipientPayload.name || recipientPayload.phone || recipientPayload.email || recipientPayload.address);
      const payload = {
        title: form.title.trim(),
        amount: form.amount !== '' ? Number(form.amount) : undefined,
        date: form.date || undefined,
        category: form.category || undefined,
        account: form.account || undefined,
        referenceNumber: form.referenceNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        files: Array.isArray(form.files) ? form.files : [],
        isCancelled: !!form.isCancelled,
        ...(hasRecipient ? { recipient: recipientPayload } : {}),
      };
      await api.post(`${FINANCE_BASE}/expenses`, payload, {}, true);
      showSuccess('Expense recorded.');
      resetForm();
      fetchExpenses();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (row) => {
    if (!row?._id) return;
    const newCancelled = !row.isCancelled;
    if (!newCancelled && !window.confirm('Restore this expense record?')) return;
    if (newCancelled && !window.confirm('Mark this expense as cancelled?')) return;
    try {
      setCancellingId(row._id);
      await api.put(`${FINANCE_BASE}/expenses/${row._id}`, { isCancelled: newCancelled }, {}, true);
      showSuccess(newCancelled ? 'Expense marked as cancelled.' : 'Expense restored.');
      fetchExpenses();
    } catch (err) {
      setError(err.message || 'Failed to update');
    } finally {
      setCancellingId('');
    }
  };

  const exportCsv = () => {
    const headers = ['Voucher Number', 'Title', 'Amount', 'Date', 'Category', 'Recipient', 'Account', 'Reference', 'Notes'];
    const rows = expenses.map((i) => [
      formatVoucherNumber(i.serialNumber),
      i.title || '',
      i.amount ?? '',
      i.date ? new Date(i.date).toISOString().split('T')[0] : '',
      (i.category && (typeof i.category === 'object' ? i.category.name : i.category)) || '',
      (i.recipient && typeof i.recipient === 'object' ? i.recipient.name : i.vendor || '') || '',
      (i.account && (typeof i.account === 'object' ? i.account.name : i.account)) || '',
      i.referenceNumber || '',
      (i.notes || '').replace(/"/g, '""'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c)}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handlePayRecurringSchedule = (row) => {
    setScheduleToPay(row);
  };

  const handleDeleteRecurringSchedule = async (row) => {
    if (!row?._id) return;
    if (!window.confirm('Delete this recurring expense schedule?')) return;
    try {
      setRecurringError('');
      await api.delete(`${FINANCE_BASE}/recurring-expenses/${row._id}`, {}, true);
      showSuccess('Recurring expense deleted.');
      fetchRecurringSchedules();
    } catch (err) {
      setRecurringError(err.message || 'Failed to delete');
    }
  };

  const handleViewRecurringSchedule = async (row) => {
    if (!row?._id) return;
    setRecurringDetailsRow(row);
    setRecurringHistory([]);
    setRecurringHistoryError('');
    setRecurringHistoryLoading(true);
    try {
      const res = await api.get(`${FINANCE_BASE}/recurring-expenses/${row._id}/payment-history?limit=50`, {}, true);
      const list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      setRecurringHistory(list);
    } catch (err) {
      setRecurringHistoryError(err.message || 'Failed to load recurring payment history');
    } finally {
      setRecurringHistoryLoading(false);
    }
  };

  const closeRecurringDetails = () => {
    setRecurringDetailsRow(null);
    setRecurringHistory([]);
    setRecurringHistoryError('');
  };

  const columns = useMemo(
    () => [
      {
        id: 'serialNumber',
        accessorKey: 'serialNumber',
        header: 'Voucher Number',
        type: 'text',
        accessorFn: (row) => formatVoucherNumber(row.serialNumber),
        cell: ({ row }) => <span className="font-medium">{formatVoucherNumber(row.serialNumber) || '—'}</span>,
      },
      { id: 'title', accessorKey: 'title', header: 'Title', type: 'text', searchable: true, cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="font-medium">{row.title || 'Untitled'}</span>
          {row.isCancelled && <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Cancelled</span>}
        </span>
      ) },
      { id: 'amount', accessorKey: 'amount', header: 'Amount', type: 'currency', formatOptions: { locale: 'en-IN', currency: 'INR' }, cell: ({ row }) => <span className="text-red-600 font-medium">{formatCurrency(row.amount)}</span> },
      {
        id: 'date',
        accessorKey: 'date',
        header: 'Date',
        type: 'date',
        formatOptions: { locale: 'en-IN' },
        sortComparator: (a, b) => {
          const aDateKey = getDateOnlyKey(a?.date);
          const bDateKey = getDateOnlyKey(b?.date);
          if (aDateKey < bDateKey) return -1;
          if (aDateKey > bDateKey) return 1;

          const aCreatedAt = getTimestamp(a?.createdAt);
          const bCreatedAt = getTimestamp(b?.createdAt);
          if (aCreatedAt < bCreatedAt) return -1;
          if (aCreatedAt > bCreatedAt) return 1;
          return 0;
        },
      },
      { id: 'category', accessorKey: 'category', header: 'Category', type: 'text', cell: ({ row }) => (row.category ? (typeof row.category === 'object' ? row.category.name : row.category) : '—') },
      { id: 'recipient', accessorKey: 'recipient', header: 'Recipient', type: 'text', cell: ({ row }) => (row.recipient && typeof row.recipient === 'object' && row.recipient.name) ? row.recipient.name : (row.vendor || '—') },
      { id: 'account', accessorKey: 'account', header: 'Account', type: 'text', cell: ({ row }) => (row.account ? (typeof row.account === 'object' ? row.account.name : row.account) : '—') },
      { id: 'referenceNumber', accessorKey: 'referenceNumber', header: 'Reference', type: 'text' },
    ],
    []
  );

  const actions = useCallback(
    (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => router.push(`/app/expenses/${row._id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </DropdownMenuItem>
          <PermissionGate moduleKey="finance" action="delete">
            <DropdownMenuItem
              onClick={() => handleCancel(row)}
              disabled={cancellingId === row._id}
              className={row.isCancelled ? 'text-emerald-600' : ''}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {row.isCancelled ? 'Restore' : 'Cancel'}
            </DropdownMenuItem>
          </PermissionGate>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [cancellingId, router]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/finance/tracking">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Expense Tracking</h1>
            <p className="text-sm text-muted-foreground">Record and manage expense entries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <PermissionGate moduleKey="finance" action="view">
            <Button
              variant="outline"
              onClick={() => {
                setShowRecurringModal(true);
              }}
              className="gap-2"
            >
              <Repeat className="h-4 w-4" />
              Recurring
            </Button>
          </PermissionGate>
          <PermissionGate moduleKey="finance" action="create">
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </PermissionGate>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">{success}</div>}

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} className="pl-8 h-9" />
          </div>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.categoryId} onChange={(e) => setFilters((p) => ({ ...p, categoryId: e.target.value }))}>
            <option value="">All categories</option>
            {expenseCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.accountId} onChange={(e) => setFilters((p) => ({ ...p, accountId: e.target.value }))}>
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <Input placeholder="Recipient" className="h-9" value={filters.recipient} onChange={(e) => setFilters((p) => ({ ...p, recipient: e.target.value }))} />
          <Input type="date" className="h-9" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} />
          <Input type="date" className="h-9" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} />
          <Button variant="secondary" size="sm" onClick={fetchExpenses} className="lg:col-span-1">
            <RefreshCcw className="h-4 w-4 mr-1" /> Apply
          </Button>
        </div>
      </div>

      {/* Recurring schedules */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recurring expense manager</span>
            </div>
            <p className="text-xs text-muted-foreground">Track schedules, overdue items, missed payments and payment history.</p>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate moduleKey="finance" action="view">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchRecurringSchedules}
                disabled={recurringLoading}
                className="gap-1 h-8"
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${recurringLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </PermissionGate>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Total schedules</div>
            <div className="text-lg font-semibold mt-1">{recurringStats.total}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-lg font-semibold mt-1 text-emerald-600">{recurringStats.active}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Overdue</div>
            <div className="text-lg font-semibold mt-1 text-destructive">{recurringStats.overdue}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Missed payments</div>
            <div className="text-lg font-semibold mt-1">{recurringStats.missed}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={recurringSearch}
              onChange={(e) => setRecurringSearch(e.target.value)}
              placeholder="Search recurring schedules..."
              className="pl-8 h-9"
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={recurringStatusFilter}
            onChange={(e) => setRecurringStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        {recurringError && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{recurringError}</div>}

        {recurringLoading && recurringSchedules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filteredRecurringSchedules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">No schedules match your search/filter.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left font-medium px-3 py-2">Title</th>
                  <th className="text-left font-medium px-3 py-2">Amount</th>
                  <th className="text-left font-medium px-3 py-2">Next payment</th>
                  <th className="text-left font-medium px-3 py-2">Frequency</th>
                  <th className="text-left font-medium px-3 py-2">Last payment</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-right font-medium px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecurringSchedules.map((row) => {
                  const intervalNum = Number(row.interval ?? 1);
                  const status = row.currentStatus || (row.isActive === false ? 'paused' : 'active');
                  return (
                    <tr key={row._id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{row.title || 'Untitled'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {(row.category && (typeof row.category === 'object' ? row.category.name : row.category)) || 'No category'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 font-semibold">
                          {formatCurrency(row.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-md px-2 py-1 font-semibold ${
                          row.isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        }`}>
                          {row.nextDueDate ? formatDateForInput(row.nextDueDate) : '—'}
                        </span>
                        {row.isOverdue ? (
                          <div className="text-xs text-destructive mt-1">
                            Overdue by {row.overdueDays || 0} day{Number(row.overdueDays || 0) === 1 ? '' : 's'}
                          </div>
                        ) : null}
                        {Number(row.missedPayments || 0) > 0 ? (
                          <div className="text-xs text-destructive mt-0.5">
                            Missed payments: {row.missedPayments}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.frequency}
                        {intervalNum > 1 ? ` (every ${intervalNum})` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.lastPaymentDate ? formatDateForInput(row.lastPaymentDate) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${getRecurringStatusClass(status)}`}>
                          {getRecurringStatusLabel(status)}
                        </span>
                        {row.isActive === false && <span className="ml-2 text-xs text-amber-600">Paused</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <PermissionGate moduleKey="finance" action="view">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => handleViewRecurringSchedule(row)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </PermissionGate>
                          <PermissionGate moduleKey="finance" action="edit">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => handlePayRecurringSchedule(row)}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-destructive"
                              onClick={() => handleDeleteRecurringSchedule(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!recurringDetailsRow} onOpenChange={(open) => !open && closeRecurringDetails()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{recurringDetailsRow?.title || 'Recurring expense details'}</DialogTitle>
            <DialogDescription>Complete schedule and payment metadata.</DialogDescription>
          </DialogHeader>
          {recurringDetailsRow && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(recurringDetailsRow.amount)}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Next payment date</div>
                  <div className="mt-1 font-semibold text-amber-700 dark:text-amber-300">{recurringDetailsRow.nextDueDate ? formatDateForInput(recurringDetailsRow.nextDueDate) : '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Frequency</div>
                  <div className="mt-1">{recurringDetailsRow.frequency || '—'}{Number(recurringDetailsRow.interval ?? 1) > 1 ? ` (every ${Number(recurringDetailsRow.interval)})` : ''}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Schedule status</div>
                  <div className="mt-1">{recurringDetailsRow.currentStatus || (recurringDetailsRow.isActive === false ? 'paused' : 'active')}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Start date</div>
                  <div className="mt-1">{recurringDetailsRow.startDate ? formatDateForInput(recurringDetailsRow.startDate) : '—'}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">End date</div>
                  <div className="mt-1">{recurringDetailsRow.endDate ? formatDateForInput(recurringDetailsRow.endDate) : '—'}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Overdue days</div>
                  <div className="mt-1">{Number(recurringDetailsRow.overdueDays || 0)}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Missed payments</div>
                  <div className="mt-1">{Number(recurringDetailsRow.missedPayments || 0)}</div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="text-xs text-muted-foreground">Payment details</div>
                <div><span className="text-muted-foreground">Status:</span> {recurringDetailsRow.lastPaymentStatus || 'pending'}</div>
                <div><span className="text-muted-foreground">Date:</span> {recurringDetailsRow.lastPaymentDate ? formatDateForInput(recurringDetailsRow.lastPaymentDate) : '—'}</div>
                <div><span className="text-muted-foreground">Paid by:</span> {recurringDetailsRow.lastPaymentBy || '—'}</div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div><span className="text-muted-foreground">Category:</span> {(recurringDetailsRow.category && (typeof recurringDetailsRow.category === 'object' ? recurringDetailsRow.category.name : recurringDetailsRow.category)) || '—'}</div>
                <div><span className="text-muted-foreground">Account:</span> {(recurringDetailsRow.account && (typeof recurringDetailsRow.account === 'object' ? recurringDetailsRow.account.name : recurringDetailsRow.account)) || '—'}</div>
                <div><span className="text-muted-foreground">Vendor:</span> {recurringDetailsRow.vendor || '—'}</div>
                <div><span className="text-muted-foreground">Reference:</span> {recurringDetailsRow.referenceNumber || '—'}</div>
                <div><span className="text-muted-foreground">Notes:</span> {recurringDetailsRow.notes || '—'}</div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Payment history (from Expenses)</div>
                {recurringHistoryError ? (
                  <div className="text-sm text-destructive">{recurringHistoryError}</div>
                ) : recurringHistoryLoading ? (
                  <div className="text-sm text-muted-foreground">Loading payment history…</div>
                ) : recurringHistory.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recurring payments recorded yet.</div>
                ) : (
                  <div className="rounded border border-border overflow-x-auto">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-2 py-1.5">Date</th>
                          <th className="text-left px-2 py-1.5">Voucher</th>
                          <th className="text-left px-2 py-1.5">Amount</th>
                          <th className="text-left px-2 py-1.5">Account</th>
                          <th className="text-left px-2 py-1.5">Status</th>
                          <th className="text-left px-2 py-1.5">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recurringHistory.map((p) => (
                          <tr key={p._id} className="border-t border-border">
                            <td className="px-2 py-1.5">{p.date ? formatDateForInput(p.date) : '—'}</td>
                            <td className="px-2 py-1.5">{formatVoucherNumber(p.serialNumber) || '—'}</td>
                            <td className="px-2 py-1.5">{formatCurrency(p.amount)}</td>
                            <td className="px-2 py-1.5">{(p.account && (typeof p.account === 'object' ? p.account.name : p.account)) || '—'}</td>
                            <td className="px-2 py-1.5">{p.isCancelled ? 'Cancelled' : 'Completed'}</td>
                            <td className="px-2 py-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => router.push(`/app/expenses/${p._id}`)}
                              >
                                Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RecurringExpenseModal
        open={showRecurringModal}
        onOpenChange={setShowRecurringModal}
        expenseCategories={expenseCategories}
        accounts={accounts}
        onSaved={() => {
          fetchRecurringSchedules();
        }}
      />

      <PayRecurringExpenseModal
        open={!!scheduleToPay}
        onOpenChange={(v) => {
          if (!v) setScheduleToPay(null);
        }}
        recurring={scheduleToPay}
        accounts={accounts}
        onPaid={() => {
          setScheduleToPay(null);
          showSuccess('Recurring payment processed.');
          fetchRecurringSchedules();
          fetchExpenses();
          if (recurringDetailsRow && scheduleToPay?._id === recurringDetailsRow._id) {
            handleViewRecurringSchedule(scheduleToPay);
          }
        }}
      />

      {/* Expense form modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Expense</DialogTitle>
            <DialogDescription>
              Record new expense. Optionally add recipient details first.
            </DialogDescription>
          </DialogHeader>
          <PermissionGate moduleKey="finance" action="create">
          <form onSubmit={handleSave} className="space-y-5 mt-2">
            {/* Recipient — top */}
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="haveRecipient" checked={!!form.haveRecipient} onChange={handleFormChange} className="h-4 w-4 rounded border-input" />
                Have recipient
              </label>
              {form.haveRecipient && (
                <div className="grid grid-cols-2 gap-3 pl-5">
                  <div className="col-span-2">
                    <Input name="recipient.name" value={(form.recipient && form.recipient.name) || ''} onChange={handleFormChange} placeholder="Name" className="h-9" />
                  </div>
                  <Input name="recipient.phone" value={(form.recipient && form.recipient.phone) || ''} onChange={handleFormChange} placeholder="Phone" className="h-9" />
                  <Input name="recipient.email" type="email" value={(form.recipient && form.recipient.email) || ''} onChange={handleFormChange} placeholder="Email" className="h-9" />
                  <div className="col-span-2">
                    <Input name="recipient.address" value={(form.recipient && form.recipient.address) || ''} onChange={handleFormChange} placeholder="Address" className="h-9" />
                  </div>
                </div>
              )}
            </div>

            {/* Main fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                <Input name="title" value={form.title} onChange={handleFormChange} placeholder="Expense title" required className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount *</label>
                <Input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={handleFormChange} placeholder="0.00" required className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date *</label>
                <Input name="date" type="date" value={form.date} onChange={handleFormChange} className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                <select name="category" value={form.category} onChange={handleFormChange} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select</option>
                  {expenseCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Account</label>
                <select name="account" value={form.account} onChange={handleFormChange} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="">Select</option>
                  {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reference</label>
                <Input name="referenceNumber" value={form.referenceNumber} onChange={handleFormChange} placeholder="Ref no." className="h-9" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <Input name="notes" value={form.notes} onChange={handleFormChange} placeholder="Optional notes" className="h-9" />
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-2 border-t border-border pt-3">
              <label className="block text-xs font-medium text-muted-foreground">Attachments</label>
              <div className="flex flex-wrap gap-2 items-center">
                <Input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} disabled={uploadingFile} className="h-9 max-w-[200px] text-sm" />
                {uploadingFile && <span className="text-xs text-muted-foreground">Uploading...</span>}
              </div>
              {form.files?.length > 0 && (
                <ul className="space-y-1 mt-1">
                  {form.files.map((path, index) => (
                    <li key={`${path}-${index}`} className="flex items-center gap-2 text-xs">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={getUploadedImageUrl(path, API_URL)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
                        {path.split('/').pop() || path}
                      </a>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => removeFile(index)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={resetForm} className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Create Expense'}
              </Button>
            </div>
          </form>
          </PermissionGate>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataTable
          data={expenses}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          filterable
          sortable
          showColumnVisibility
          storageKey="finance-tracking-expenses"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          emptyMessage="No expense records found"
          onRowClick={(row) => router.push(`/app/expenses/${row._id}`)}
        />
      </div>
    </div>
  );
}
