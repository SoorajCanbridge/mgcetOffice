'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCcw,
  Search,
  Eye,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  ArrowRight,
  ArrowLeftRight,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const LEDGERS_BASE = '/finance/ledgers';

// Each line: { account (id), transactionType: 'debit'|'credit', amount (number) }
const EMPTY_LINE = { account: '', transactionType: 'credit', amount: '' };
const EMPTY_LEDGER = {
  entryDate: '',
  entryType: 'income',
  description: '',
  reference: '',
  category: '',
  notes: '',
  lines: [{ ...EMPTY_LINE }],
};

const ENTRY_TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
];

const ENTRY_TYPE_ICONS = {
  income: { Icon: TrendingUp, label: 'Income', className: 'text-green-600 bg-green-500/10' },
  expense: { Icon: TrendingDown, label: 'Expense', className: 'text-red-600 bg-red-500/10' },
  transfer: { Icon: ArrowLeftRight, label: 'Transfer', className: 'text-blue-600 bg-blue-500/10' },
  adjustment: { Icon: SlidersHorizontal, label: 'Adjustment', className: 'text-amber-600 bg-amber-500/10' },
};

const TRANSACTION_TYPES = [
  { value: 'credit', label: 'Credit (Money In)' },
  { value: 'debit', label: 'Debit (Money Out)' },
];


const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
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

const formatDateForDisplay = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '';
  }
};

export default function LedgersPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [ledgers, setLedgers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingLedger, setEditingLedger] = useState(null);
  const [viewingLedger, setViewingLedger] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showForm, setShowForm] = useState(false);

  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    search: '',
    accountId: searchParams.get('accountId') || '',
    entryType: '',
    transactionType: '',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const [sortBy, setSortBy] = useState('entryDate');
  const [sortOrder, setSortOrder] = useState('desc');

  const [ledgerForm, setLedgerForm] = useState(JSON.parse(JSON.stringify(EMPTY_LEDGER)));
  const isTransfer = (ledgerForm.entryType || '') === 'transfer';

  const fetchAccounts = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/finance/accounts', {}, true);
      const data = response?.data || response || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, [user?.college]);

  const fetchCategories = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/finance/categories', {}, true);
      const data = response?.data || response || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [user?.college]);

  const fetchLedgers = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();

      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.entryType) params.append('entryType', filters.entryType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(
        `${LEDGERS_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      let list = Array.isArray(data) ? data : [];
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        list = list.filter(
          (l) =>
            (l.description || '').toLowerCase().includes(q) ||
            (l.reference || '').toLowerCase().includes(q) ||
            (String(l.referenceId || '')).toLowerCase().includes(q)
        );
      }
      if (filters.transactionType) {
        list = list.filter((l) =>
          (l.lines || []).some((ln) => ln.transactionType === filters.transactionType)
        );
      }
      setLedgers(list);
    } catch (err) {
      setError(err.message || 'Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  }, [
    user?.college,
    filters.accountId,
    filters.entryType,
    filters.transactionType,
    filters.startDate,
    filters.endDate,
    filters.search,
  ]);

  useEffect(() => {
    if (!user?.college) return;
    fetchAccounts();
    fetchCategories();
  }, [user?.college, fetchAccounts, fetchCategories]);

  useEffect(() => {
    if (!user?.college) return;
    fetchLedgers();
  }, [user?.college, fetchLedgers]);

  const accountIdFromUrl = searchParams.get('accountId');
  const editIdFromUrl = searchParams.get('edit');
  useEffect(() => {
    if (!accountIdFromUrl || !accounts.length) return;
    setLedgerForm((prev) => ({
      ...prev,
      lines: [{ account: accountIdFromUrl, transactionType: 'credit', amount: '' }],
    }));
    setShowForm(true);
    router.replace('/app/ledgers', { scroll: false });
  }, [accountIdFromUrl, accounts.length, router]);
  useEffect(() => {
    if (!editIdFromUrl || !ledgers.length || editingLedger) return;
    const entry = ledgers.find((l) => l._id === editIdFromUrl);
    if (entry) {
      setEditingLedger(entry);
      const lines = Array.isArray(entry.lines) && entry.lines.length
        ? entry.lines.map((ln) => ({
            account: ln.account?._id || ln.account || '',
            transactionType: ln.transactionType || 'credit',
            amount: ln.amount !== undefined ? String(ln.amount) : '',
          }))
        : [{ account: '', transactionType: 'credit', amount: '' }];
      setLedgerForm({
        entryDate: formatDateForInput(entry.entryDate),
        entryType: entry.entryType || 'income',
      description: entry.description || '',
      reference: entry.reference || '',
      category: entry.category?._id || entry.category || '',
      notes: entry.notes || '',
        lines,
      });
      setShowForm(true);
      router.replace('/app/ledgers', { scroll: false });
    }
  }, [editIdFromUrl, ledgers.length, editingLedger, router]);

  // First line account for balance preview
  const firstLineAccountId = ledgerForm.lines?.[0]?.account;
  useEffect(() => {
    if (firstLineAccountId) {
      const account = accounts.find((acc) => acc._id === firstLineAccountId);
      setSelectedAccount(account || null);
    } else {
      setSelectedAccount(null);
    }
  }, [firstLineAccountId, accounts]);

  // Categories filtered by entry type: income -> income & both; expense -> expense & both; others -> all
  const categoriesByEntryType = useMemo(() => {
    const et = ledgerForm.entryType || '';
    if (et === 'income') return categories.filter((c) => c.type === 'income' || c.type === 'both');
    if (et === 'expense') return categories.filter((c) => c.type === 'expense' || c.type === 'both');
    return categories;
  }, [categories, ledgerForm.entryType]);

  const resetForm = useCallback(() => {
    setLedgerForm(JSON.parse(JSON.stringify(EMPTY_LEDGER)));
    setEditingLedger(null);
    setSelectedAccount(null);
    setShowForm(false);
  }, []);

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const lineMatch = name.match(/^lines\[(\d+)\]\.(\w+)$/);
    if (lineMatch) {
      const idx = parseInt(lineMatch[1], 10);
      const key = lineMatch[2];
      setLedgerForm((prev) => {
        const next = { ...prev, lines: [...(prev.lines || [])] };
        if (!next.lines[idx]) next.lines[idx] = { ...EMPTY_LINE };
        next.lines[idx] = { ...next.lines[idx], [key]: key === 'amount' ? value : value };
        // Transfer: keep second line amount in sync with first
        if (prev.entryType === 'transfer' && key === 'amount' && idx === 0 && next.lines[1]) {
          next.lines[1] = { ...next.lines[1], amount: value };
        }
        return next;
      });
      return;
    }
    if (name === 'entryType') {
      setLedgerForm((prev) => {
        const next = { ...prev, entryType: value };
        // Clear category if it won't be in the filtered list
        const isIncome = value === 'income';
        const isExpense = value === 'expense';
        if (prev.category && (isIncome || isExpense)) {
          const cat = categories.find((c) => c._id === prev.category);
          if (cat && ((isIncome && cat.type === 'expense') || (isExpense && cat.type === 'income'))) {
            next.category = '';
          }
        }
        // Update lines based on entry type: Transfer = 2 lines (debit, credit), else 1 line with auto type
        if (value === 'transfer') {
          const first = prev.lines?.[0] || EMPTY_LINE;
          next.lines = [
            { ...first, transactionType: 'debit' },
            { account: '', transactionType: 'credit', amount: first.amount ?? '' },
          ];
        } else {
          const newType = value === 'income' ? 'credit' : value === 'expense' ? 'debit' : (prev.lines?.[0]?.transactionType || 'credit');
          next.lines = prev.lines?.length ? [prev.lines[0]] : [{ ...EMPTY_LINE }];
          if (next.lines[0]) next.lines[0] = { ...next.lines[0], transactionType: newType };
        }
        return next;
      });
      return;
    }
    setLedgerForm((prev) => ({ ...prev, [name]: value }));
  };

  const setLine = (index, key, value) => {
    setLedgerForm((prev) => {
      const lines = [...(prev.lines || [])];
      if (!lines[index]) lines[index] = { ...EMPTY_LINE };
      lines[index] = { ...lines[index], [key]: value };
      if (prev.entryType === 'transfer' && key === 'amount' && index === 0 && lines[1]) {
        lines[1] = { ...lines[1], amount: value };
      }
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setLedgerForm((prev) => ({
      ...prev,
      lines: [...(prev.lines || []), { ...EMPTY_LINE }],
    }));
  };

  const removeLine = (index) => {
    setLedgerForm((prev) => {
      const lines = (prev.lines || []).filter((_, i) => i !== index);
      return { ...prev, lines: lines.length ? lines : [{ ...EMPTY_LINE }] };
    });
  };

  const projectedBalance = useMemo(() => {
    if (!selectedAccount || !ledgerForm.lines?.[0]) return null;
    const line = ledgerForm.lines[0];
    const amount = Number(line.amount) || 0;
    const currentBalance = selectedAccount.balance || 0;
    if (line.transactionType === 'credit') return currentBalance + amount;
    return currentBalance - amount;
  }, [selectedAccount, ledgerForm.lines]);

  const handleSaveLedger = async (e) => {
    e.preventDefault();
    setError('');
    let lines = (ledgerForm.lines || []).filter((ln) => ln.account && (ln.amount !== '' && ln.amount !== undefined));
    if (lines.length === 0) {
      setError('At least one line (account, transaction type, amount) is required.');
      return;
    }
    // Transfer: second line uses first line amount (no re-entry)
    if (ledgerForm.entryType === 'transfer' && lines.length === 2) {
      lines = [lines[0], { ...lines[1], amount: lines[0].amount }];
    }
    const linesPayload = lines.map((ln) => ({
      account: ln.account,
      transactionType: ln.transactionType === 'debit' ? 'debit' : 'credit',
      amount: Number(ln.amount) >= 0 ? Number(ln.amount) : 0,
    }));
    if (ledgerForm.entryType === 'transfer' && linesPayload.length === 2) {
      const [a, b] = linesPayload;
      if (a.account === b.account) {
        setError('Transfer: cannot use the same account for both lines. Select different accounts.');
        return;
      }
      if (a.amount !== b.amount) {
        setError('Transfer: both lines must have the same amount.');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        entryDate: ledgerForm.entryDate || undefined,
        entryType: ledgerForm.entryType,
        description: (ledgerForm.description || '').trim() || undefined,
        reference: (ledgerForm.reference || '').trim() || undefined,
        category: ledgerForm.category || undefined,
        notes: (ledgerForm.notes || '').trim() || undefined,
        lines: linesPayload,
      };

      if (editingLedger?._id) {
        await api.put(`${LEDGERS_BASE}/${editingLedger._id}`, payload, {}, true);
        showSuccess('Ledger entry updated successfully.');
      } else {
        await api.post(`${LEDGERS_BASE}`, payload, {}, true);
        showSuccess('Ledger entry created successfully.');
      }
      resetForm();
      await fetchLedgers();
      await fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to save ledger entry');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLedger = (ledger) => {
    setEditingLedger(ledger);
    const lines = Array.isArray(ledger.lines) && ledger.lines.length
      ? ledger.lines.map((ln) => ({
          account: ln.account?._id || ln.account || '',
          transactionType: ln.transactionType || 'credit',
          amount: ln.amount !== undefined ? String(ln.amount) : '',
        }))
      : [{ ...EMPTY_LINE }];
    setLedgerForm({
      entryDate: formatDateForInput(ledger.entryDate),
      entryType: lines.length === 2 ? 'transfer' : (ledger.entryType || 'income'),
      description: ledger.description || '',
      reference: ledger.reference || '',
      category: ledger.category?._id || ledger.category || '',
      notes: ledger.notes || '',
      lines,
    });
    setShowForm(true);
  };

  const handleViewLedger = async (ledgerId) => {
    try {
      const response = await api.get(`${LEDGERS_BASE}/${ledgerId}`, {}, true);
      const data = response?.data || response;
      setViewingLedger(data);
    } catch (err) {
      setError(err.message || 'Failed to load ledger details');
    }
  };

  const handleDeleteLedger = async (ledger) => {
    if (!ledger?._id) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            'Delete this ledger entry? This will also revert the account balance change.',
          )
        : true;
    if (!confirmed) return;
    try {
      setDeletingId(ledger._id);
      setError('');
      await api.delete(`${LEDGERS_BASE}/${ledger._id}`, {}, true);
      showSuccess('Ledger entry deleted.');
      await fetchLedgers();
      await fetchAccounts(); // Refresh accounts to get updated balances
    } catch (err) {
      setError(err.message || 'Failed to delete ledger entry');
    } finally {
      setDeletingId('');
    }
  };

  const summary = useMemo(() => {
    let credits = 0, debits = 0;
    ledgers.forEach((l) => {
      (l.lines || []).forEach((ln) => {
        const amt = Number(ln.amount) || 0;
        if (ln.transactionType === 'credit') credits += amt;
        else debits += amt;
      });
    });
    return {
      credits,
      debits,
      net: credits - debits,
      count: ledgers.length,
    };
  }, [ledgers]);

  const formatLedgerLinesDisplay = (ledger) => {
    const lines = ledger.lines || [];
    if (!lines.length) return '-';
    return lines.map((ln) => {
      const name = typeof ln.account === 'object' ? (ln.account?.name ?? '') : ln.account ?? '';
      const amt = formatCurrency(ln.amount || 0);
      const type = ln.transactionType === 'credit' ? 'credit' : 'debit';
      return `${name}: ${ln.transactionType === 'credit' ? '+' : '-'}${amt} (${type})`;
    }).join(' · ');
  };

  const handleExportCsv = useCallback(() => {
    if (ledgers.length === 0) return;
    const headers = ['Date', 'Entry Type', 'Description', 'Reference', 'Account', 'Type', 'Amount', 'Balance after'];
    const rows = [];
    ledgers.forEach((l) => {
      (l.lines || []).forEach((ln) => {
        rows.push([
          formatDateForDisplay(l.entryDate),
          l.entryType ?? '',
          (l.description ?? '').replace(/"/g, '""'),
          ((l.reference || l.referenceId) ?? '').replace(/"/g, '""'),
          typeof ln.account === 'object' ? (ln.account?.name ?? '') : ln.account ?? '',
          ln.transactionType ?? '',
          ln.amount ?? '',
          ln.balanceAfter ?? '',
        ]);
      });
    });
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c)}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ledger-entries-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [ledgers]);

  const ledgerColumns = useMemo(() => [
    {
      id: 'entryDate',
      accessorKey: 'entryDate',
      header: 'Date',
      type: 'date',
      formatOptions: { locale: 'en-US' },
      cell: ({ row }) => formatDateForDisplay(row.entryDate),
    },
    {
      id: 'entryType',
      accessorKey: 'entryType',
      header: 'Entry type',
      filterable: true,
      filterType: 'select',
      filterOptions: ENTRY_TYPES,
      cell: ({ row }) => {
        const c = ENTRY_TYPE_ICONS[row.entryType] || {
          Icon: null,
          label: (row.entryType || '').replace(/-/g, ' '),
          className: 'bg-muted text-muted-foreground',
        };
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded capitalize ${c.className}`}>
            {c.Icon && <c.Icon className="h-3.5 w-3.5 shrink-0" />}
            {c.label}
          </span>
        );
      },
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <span className="font-medium">{row.description || '—'}</span>
      ),
    },
    {
      id: 'lines',
      header: 'Accounts / Lines',
      cell: ({ row }) => {
        const lines = row.lines || [];
        if (!lines.length) return '-';
        return (
          <div className="text-sm space-y-0.5">
            {lines.map((ln, i) => {
              const name = typeof ln.account === 'object' ? (ln.account?.name ?? '') : (ln.account ?? '');
              const amt = formatCurrency(ln.amount || 0);
              const isCredit = ln.transactionType === 'credit';
              return (
                <span key={i} className="block">
                  <span className="text-muted-foreground">{name}</span>
                  {' '}
                  <span className={isCredit ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {isCredit ? '+' : '-'}{amt}
                  </span>
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        if (!row.category) return '-';
        return typeof row.category === 'object' ? row.category.name : row.category;
      },
    },
    {
      id: 'reference',
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) =>
        row.reference ? (
          <span className="text-sm">
            {row.reference}
            {row.referenceModel && (
              <span className="text-xs text-muted-foreground ml-1">({row.referenceModel})</span>
            )}
          </span>
        ) : (
          '-'
        ),
    },
  ], []);

  // Define actions for Ledgers DataTable
  const ledgerActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleViewLedger(row._id);
        }}
      >
        <Eye className="h-4 w-4" />
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleEditLedger(row);
        }}
      >
        <Edit2 className="h-4 w-4" />
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteLedger(row);
        }}
        disabled={deletingId === row._id}
      >
        <Trash2 className="h-4 w-4" />
        {deletingId === row._id ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  ), [deletingId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Ledger</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage financial ledger entries and track account transactions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/app/ledgers/overview')}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Overview & Balance Sheet
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              try {
                await Promise.all([fetchLedgers(), fetchAccounts()]);
                showSuccess('Data refreshed.');
              } catch {
                // error already handled
              } finally {
                setLoading(false);
              }
            }}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="gap-2"
            disabled={ledgers.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">
            {success}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {ledgers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Credits</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.credits)}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Debits</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.debits)}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Net Amount</div>
            <div
              className={`text-2xl font-bold ${
                summary.net >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary.net)}
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Entries</div>
            <div className="text-2xl font-bold">{summary.count}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Search (description / reference)</label>
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && fetchLedgers()}
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Account</label>
            <select
              value={filters.accountId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, accountId: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Accounts</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Entry type</label>
            <select
              value={filters.entryType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, entryType: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Entry Types</option>
              {ENTRY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Transaction type</label>
            <select
              value={filters.transactionType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, transactionType: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Types</option>
              {TRANSACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Start date</label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">End date</label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="h-9"
            />
          </div>
          <Button onClick={fetchLedgers}>Apply</Button>
        </div>
      </div>

      {/* Ledger Form */}
      {showForm && (
        <form
          onSubmit={handleSaveLedger}
          className="bg-card border border-border rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              {editingLedger ? 'Edit Ledger Entry' : 'New Ledger Entry'}
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedAccount && !isTransfer && ledgerForm.lines?.length === 1 && (
            <div className="flex items-center gap-4 py-2 px-3 mb-3 rounded-md bg-muted/50 text-sm">
              <span><span className="text-muted-foreground">Account:</span> <strong>{selectedAccount.name}</strong></span>
              <span><span className="text-muted-foreground">Balance:</span> {formatCurrency(selectedAccount.balance || 0)}</span>
              {projectedBalance != null && ledgerForm.lines[0]?.amount !== '' && (
                <span><span className="text-muted-foreground">After:</span> <strong className={projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(projectedBalance)}</strong></span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Entry Date *</label>
              <Input
                name="entryDate"
                type="date"
                value={ledgerForm.entryDate}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Entry Type *</label>
              <select
                name="entryType"
                value={ledgerForm.entryType}
                onChange={handleFormChange}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {ENTRY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer: single row — Debit account → Credit account | Amount */}
          {isTransfer ? (
            <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
              <label className="block text-sm font-medium">Transfer</label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[140px]">
                  <span className="block text-xs text-muted-foreground mb-1">Debit account</span>
                  <select
                    value={ledgerForm.lines?.[0]?.account ?? ''}
                    onChange={(e) => setLine(0, 'account', e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">From account</option>
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>{acc.name}</option>
                    ))}
                  </select>
                  {(() => {
                    const acc = accounts.find((a) => a._id === (ledgerForm.lines?.[0]?.account ?? ''));
                    return acc ? <p className="text-xs text-muted-foreground mt-1">Balance: <span className="font-medium text-foreground">{formatCurrency(acc.balance ?? 0)}</span></p> : null;
                  })()}
                </div>
                <div className="flex items-center pb-2">
                  <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <span className="block text-xs text-muted-foreground mb-1">Credit account</span>
                  <select
                    value={ledgerForm.lines?.[1]?.account ?? ''}
                    onChange={(e) => setLine(1, 'account', e.target.value)}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">To account</option>
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>{acc.name}</option>
                    ))}
                  </select>
                  {(() => {
                    const acc = accounts.find((a) => a._id === (ledgerForm.lines?.[1]?.account ?? ''));
                    return acc ? <p className="text-xs text-muted-foreground mt-1">Balance: <span className="font-medium text-foreground">{formatCurrency(acc.balance ?? 0)}</span></p> : null;
                  })()}
                </div>
                <div className="w-32 shrink-0">
                  <span className="block text-xs text-muted-foreground mb-1">Amount *</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ledgerForm.lines?.[0]?.amount ?? ''}
                    onChange={(e) => setLine(0, 'amount', e.target.value)}
                    placeholder="0.00"
                    required
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Lines *</label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" /> Add line
                </Button>
              </div>
              {(ledgerForm.lines || []).map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-3 p-3 rounded-md border bg-muted/30">
                  <div className="flex-1 min-w-[160px]">
                    <span className="block text-xs text-muted-foreground mb-1">Account</span>
                    <select
                      value={line.account}
                      onChange={(e) => setLine(idx, 'account', e.target.value)}
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select account</option>
                      {accounts.map((acc) => (
                        <option key={acc._id} value={acc._id}>{acc.name}</option>
                      ))}
                    </select>
                    {(() => {
                      const acc = accounts.find((a) => a._id === line.account);
                      return acc ? <p className="text-xs text-muted-foreground mt-1">Balance: <span className="font-medium text-foreground">{formatCurrency(acc.balance ?? 0)}</span></p> : null;
                    })()}
                  </div>
                  <div className="w-36">
                    <span className="block text-xs text-muted-foreground mb-1">Type</span>
                    <select
                      value={line.transactionType}
                      onChange={(e) => setLine(idx, 'transactionType', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {TRANSACTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <span className="block text-xs text-muted-foreground mb-1">Amount *</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.amount}
                      onChange={(e) => setLine(idx, 'amount', e.target.value)}
                      placeholder="0.00"
                      required
                      className="h-9"
                    />
                  </div>
                  {ledgerForm.lines?.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => removeLine(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ledgerForm.entryType !== 'transfer' && (
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  name="category"
                  value={ledgerForm.category}
                  onChange={handleFormChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Select Category</option>
                  {categoriesByEntryType.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Reference</label>
              <Input
                name="reference"
                value={ledgerForm.reference}
                onChange={handleFormChange}
                placeholder="Reference or note"
                className="h-9"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description *</label>
              <Input
                name="description"
                value={ledgerForm.description}
                onChange={handleFormChange}
                required
                placeholder="Transaction description"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                name="notes"
                value={ledgerForm.notes}
                onChange={handleFormChange}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? 'Saving...'
                : editingLedger
                ? 'Update Entry'
                : 'Create Entry'}
            </Button>
          </div>
        </form>
      )}

      {/* Ledger List - DataTable */}
      <div className="bg-card border border-border rounded-lg p-4">
        <DataTable
          data={ledgers}
          columns={ledgerColumns}
          actions={ledgerActions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="ledgers-table"
          defaultPageSize={50}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No ledger entries found"
          onRowClick={(row) => handleViewLedger(row._id)}
        />
      </div>

      {/* View Ledger Modal */}
      {viewingLedger && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Ledger Entry Details</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingLedger(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Entry Date</p>
                  <p className="font-medium">{formatDateForDisplay(viewingLedger.entryDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entry Type</p>
                  {(() => {
                    const c = ENTRY_TYPE_ICONS[viewingLedger.entryType] || { Icon: null, label: (viewingLedger.entryType || '').replace(/-/g, ' '), className: '' };
                    return (
                      <p className={`font-medium capitalize inline-flex items-center gap-1.5 ${c.className}`}>
                        {c.Icon && <c.Icon className="h-4 w-4 shrink-0" />}
                        {c.label}
                      </p>
                    );
                  })()}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Lines</p>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">Account</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-right p-2">Balance after</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingLedger.lines || []).map((ln, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="p-2">{typeof ln.account === 'object' ? ln.account?.name : ln.account || '—'}</td>
                          <td className="p-2 capitalize">{ln.transactionType || '—'}</td>
                          <td className={`p-2 text-right font-medium ${ln.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {ln.transactionType === 'credit' ? '+' : '-'}{formatCurrency(ln.amount || 0)}
                          </td>
                          <td className="p-2 text-right">{formatCurrency(ln.balanceAfter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {viewingLedger.category && (
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">
                    {viewingLedger.category.name}
                  </p>
                </div>
              )}
                {viewingLedger.student && (
                  <div>
                    <p className="text-sm text-muted-foreground">Student</p>
                    <p className="font-medium">
                      {viewingLedger.student.name} (
                      {viewingLedger.student.studentId || 'N/A'})
                    </p>
                  </div>
                )}
                {viewingLedger.reference && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-medium">{viewingLedger.reference}</p>
                  </div>
                )}
                {viewingLedger.referenceModel && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Reference Model
                    </p>
                    <p className="font-medium">
                      {viewingLedger.referenceModel}
                    </p>
                  </div>
                )}
                {viewingLedger.referenceId && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Reference ID
                    </p>
                    <p className="font-medium">{viewingLedger.referenceId}</p>
                  </div>
                )}
              {viewingLedger.description && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingLedger.description}
                  </p>
                </div>
              )}
              {viewingLedger.notes && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingLedger.notes}
                  </p>
                </div>
              )}
              {viewingLedger.createdBy && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    Created by: {viewingLedger.createdBy.name || 'N/A'} •{' '}
                    {viewingLedger.createdAt &&
                      formatDateForDisplay(viewingLedger.createdAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

