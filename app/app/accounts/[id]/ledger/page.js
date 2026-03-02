'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  RefreshCcw,
  Eye,
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ACCOUNTS_BASE = '/finance/accounts';
const LEDGERS_BASE = '/finance/ledgers';

const ENTRY_TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'payment', label: 'Payment' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'opening', label: 'Opening' },
  { value: 'manual', label: 'Manual' },
  { value: 'other', label: 'Other' },
];

const TRANSACTION_TYPES = [
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
];

const formatCurrency = (value) => {
  if (value != null && value !== '' && (value !== 0 || value === 0)) {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
    } catch {}
  }
  return '-';
};

const formatDateForDisplay = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '-';
  }
};

export default function AccountLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const accountId = params?.id;

  const [account, setAccount] = useState(null);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [viewingEntry, setViewingEntry] = useState(null);
  const [filters, setFilters] = useState({
    entryType: '',
    transactionType: '',
    startDate: '',
    endDate: '',
  });

  const fetchAccount = useCallback(async () => {
    if (!accountId || !user?.college) return;
    try {
      const res = await api.get(`${ACCOUNTS_BASE}/${accountId}`, {}, true);
      setAccount(res?.data ?? res);
    } catch (err) {
      setError(err.message || 'Failed to load account');
    }
  }, [accountId, user?.college]);

  const fetchLedgers = useCallback(async () => {
    if (!accountId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.append('accountId', accountId);
      if (filters.entryType) params.append('entryType', filters.entryType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      try {
        const res = await api.get(`${ACCOUNTS_BASE}/${accountId}/ledgers?${params.toString()}`, {}, true);
        const data = res?.data ?? res ?? [];
        setLedgers(Array.isArray(data) ? data : []);
      } catch {
        const res = await api.get(`${LEDGERS_BASE}?${params.toString()}`, {}, true);
        const data = res?.data ?? res ?? [];
        setLedgers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  }, [accountId, user?.college, filters.entryType, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (!accountId || !user?.college) return;
    fetchLedgers();
  }, [accountId, user?.college, fetchLedgers]);

  const handleDeleteLedger = useCallback(async (row) => {
    if (!row?._id || !window.confirm('Delete this ledger entry? This will revert the account balance change.')) return;
    try {
      setDeletingId(row._id);
      setError('');
      await api.delete(`${LEDGERS_BASE}/${row._id}`, {}, true);
      await fetchLedgers();
      await fetchAccount();
      setViewingEntry(null);
    } catch (err) {
      setError(err.message || 'Failed to delete');
    } finally {
      setDeletingId('');
    }
  }, [fetchLedgers, fetchAccount]);

  const handleViewEntry = useCallback(async (id) => {
    try {
      const res = await api.get(`${LEDGERS_BASE}/${id}`, {}, true);
      setViewingEntry(res?.data ?? res);
    } catch (err) {
      setError(err.message || 'Failed to load entry');
    }
  }, []);

  // Flatten: for each ledger, use the line for this account
  const ledgersWithBalance = useMemo(() => {
    if (!accountId) return [];
    const sorted = [...ledgers].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
    let list = sorted.flatMap((ledger) => {
      const line = (ledger.lines || []).find((ln) => {
        const aid = typeof ln.account === 'object' ? ln.account?._id : ln.account;
        return aid === accountId;
      });
      if (!line) return [];
      return [{ ...ledger, transactionType: line.transactionType, amount: line.amount, balance: line.balanceAfter }];
    });
    if (filters.transactionType) {
      list = list.filter((r) => r.transactionType === filters.transactionType);
    }
    return list;
  }, [ledgers, accountId, filters.transactionType]);

  const columns = useMemo(() => [
    {
      id: 'entryDate',
      accessorKey: 'entryDate',
      header: 'Date',
      type: 'date',
      cell: ({ row }) => formatDateForDisplay(row.entryDate),
    },
    {
      id: 'entryType',
      accessorKey: 'entryType',
      header: 'Entry type',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
          {(row.entryType || '').replace(/-/g, ' ')}
        </span>
      ),
    },
    {
      id: 'transactionType',
      accessorKey: 'transactionType',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`text-xs px-2 py-1 rounded capitalize ${
            row.transactionType === 'credit'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {row.transactionType === 'credit' ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />}
          {row.transactionType}
        </span>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className={row.transactionType === 'credit' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {row.transactionType === 'credit' ? '+' : '-'}
          {formatCurrency(row.amount || 0)}
        </span>
      ),
    },
    {
      id: 'balance',
      accessorKey: 'balance',
      header: 'Balance after',
      cell: ({ row }) => formatCurrency(row.balance),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => row.description || '-',
    },
    {
      id: 'reference',
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => row.reference || row.referenceId || '-',
    },
  ], []);

  const actions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); handleViewEntry(row._id); }}>
        <Eye className="h-4 w-4" />
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={(e) => { e.stopPropagation(); router.push(`/app/ledgers?edit=${row._id}`); }}
      >
        <Edit2 className="h-4 w-4" />
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-1"
        onClick={(e) => { e.stopPropagation(); handleDeleteLedger(row); }}
        disabled={deletingId === row._id}
      >
        <Trash2 className="h-4 w-4" />
        {deletingId === row._id ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  ), [deletingId, handleViewEntry, handleDeleteLedger, router]);

  if (!accountId) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <p className="text-destructive">Missing account.</p>
        <Link href="/app/accounts"><Button variant="outline" className="mt-4">Back to Accounts</Button></Link>
      </div>
    );
  }

  if (error && !account) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <p className="text-destructive">{error}</p>
        <Link href="/app/accounts"><Button variant="outline" className="mt-4">Back to Accounts</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/app/accounts" className="hover:text-foreground">Accounts</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/app/accounts/${accountId}`} className="hover:text-foreground">{account?.name || 'Account'}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Ledger</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Ledger
          </h1>
          <p className="text-muted-foreground mt-1">
            {account?.name && (
              <>
                <span className="font-medium text-foreground">{account.name}</span>
                {account.accountType && (
                  <span className="capitalize ml-2">({(account.accountType || '').replace(/-/g, ' ')})</span>
                )}
                {' · '}
                Current balance: <span className="font-semibold text-foreground">{formatCurrency(account?.balance ?? 0)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchLedgers(); fetchAccount(); }} disabled={loading} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Link href={`/app/ledgers?accountId=${accountId}`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add ledger entry
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.entryType}
            onChange={(e) => setFilters((p) => ({ ...p, entryType: e.target.value }))}
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">All entry types</option>
            {ENTRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filters.transactionType}
            onChange={(e) => setFilters((p) => ({ ...p, transactionType: e.target.value }))}
            className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">All types</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
            className="w-40"
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
            className="w-40"
          />
          <Button variant="secondary" size="sm" onClick={fetchLedgers}>Apply</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg p-4">
        <DataTable
          data={ledgersWithBalance}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          sortable
          storageKey={`account-ledger-${accountId}`}
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No ledger entries for this account"
        />
      </div>

      {/* View entry dialog */}
      <Dialog open={!!viewingEntry} onOpenChange={(open) => !open && setViewingEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ledger entry</DialogTitle>
          </DialogHeader>
          {viewingEntry && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Date:</span> {formatDateForDisplay(viewingEntry.entryDate)}</p>
              <p><span className="text-muted-foreground">Entry type:</span> <span className="capitalize">{(viewingEntry.entryType || '').replace(/-/g, ' ')}</span></p>
              <p><span className="text-muted-foreground">Description:</span> {viewingEntry.description || '-'}</p>
              <p><span className="text-muted-foreground">Reference:</span> {viewingEntry.reference || viewingEntry.referenceId || '-'}</p>
              {viewingEntry.lines && viewingEntry.lines.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2">Lines</p>
                  <table className="w-full text-sm border rounded overflow-hidden">
                    <thead><tr className="bg-muted/50"><th className="text-left p-2">Account</th><th className="text-left p-2">Type</th><th className="text-right p-2">Amount</th><th className="text-right p-2">Balance after</th></tr></thead>
                    <tbody>
                      {viewingEntry.lines.map((ln, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{typeof ln.account === 'object' ? ln.account?.name : ln.account || '—'}</td>
                          <td className="p-2 capitalize">{ln.transactionType}</td>
                          <td className={`p-2 text-right ${ln.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{ln.transactionType === 'credit' ? '+' : '-'}{formatCurrency(ln.amount || 0)}</td>
                          <td className="p-2 text-right">{formatCurrency(ln.balanceAfter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {viewingEntry.notes && <p><span className="text-muted-foreground">Notes:</span> {viewingEntry.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
