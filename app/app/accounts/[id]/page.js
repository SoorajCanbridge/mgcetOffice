'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Wallet,
  ArrowLeft,
  Download,
  Printer,
  RefreshCcw,
  Edit2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Eye,
  Filter,
  BookOpen,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const ACCOUNTS_BASE = '/finance/accounts';
const LEDGERS_BASE = '/finance/ledgers';
const PAYMENTS_BASE = '/finance/payments';

const formatDateForDisplay = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '-';
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

const formatDateForCSV = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const ACCOUNT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'closed', label: 'Closed' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
];

export default function AccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const accountId = params?.id;
  const printRef = useRef(null);
  const txAccountRef = useRef(accountId);

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const [txPagination, setTxPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [transactionsPageFromApi, setTransactionsPageFromApi] = useState(false);

  const fetchAccountDetails = useCallback(async () => {
    if (!accountId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`${ACCOUNTS_BASE}/${accountId}`, {}, true);
      const data = response?.data || response;
      setAccount(data);
    } catch (err) {
      setError(err.message || 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  }, [accountId, user?.college]);

  const fetchTransactions = useCallback(async () => {
    if (!accountId || !user?.college) return;
    const switchedAccount = txAccountRef.current !== accountId;
    if (switchedAccount) {
      txAccountRef.current = accountId;
    }
    const requestedPage = switchedAccount ? 1 : txPagination.page;
    const requestedLimit = switchedAccount ? 20 : txPagination.limit;
    try {
      setTransactionsLoading(true);
      if (switchedAccount) {
        setTransactions([]);
        setTransactionsPageFromApi(false);
        setTxPagination({ page: 1, limit: 20, total: 0, pages: 0 });
      }

      const applyResponse = (res, pageNum, limitNum) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        setTransactions(list);
        const p = res?.pagination;
        const hasPaginationMeta =
          p &&
          typeof p === 'object' &&
          (typeof p.total === 'number' ||
            (typeof p.pages === 'number' && p.pages >= 1));
        if (hasPaginationMeta) {
          setTransactionsPageFromApi(true);
          setTxPagination((prev) => ({
            ...prev,
            ...p,
            page: p.page ?? pageNum,
            limit: p.limit ?? p.pageSize ?? prev.limit ?? limitNum,
            total: typeof p.total === 'number' ? p.total : prev.total,
            pages: typeof p.pages === 'number' ? p.pages : prev.pages,
          }));
        } else {
          setTransactionsPageFromApi(false);
          const total = list.length;
          const pages = Math.max(1, Math.ceil(total / limitNum) || 1);
          setTxPagination({
            page: Math.min(pageNum, pages),
            limit: limitNum,
            total,
            pages,
          });
        }
      };

      const primaryParams = new URLSearchParams();
      primaryParams.set('page', String(requestedPage));
      primaryParams.set('limit', String(requestedLimit));
      primaryParams.set('sortBy', 'entryDate');
      primaryParams.set('sortOrder', 'desc');
      if (dateRange.startDate) primaryParams.set('startDate', dateRange.startDate);
      if (dateRange.endDate) primaryParams.set('endDate', dateRange.endDate);

      try {
        const res = await api.get(
          `${ACCOUNTS_BASE}/${accountId}/ledgers?${primaryParams.toString()}`,
          {},
          true,
        );
        applyResponse(res, requestedPage, requestedLimit);
      } catch {
        const params = new URLSearchParams();
        params.append('accountId', accountId);
        params.set('page', String(requestedPage));
        params.set('limit', String(requestedLimit));
        params.set('sortBy', 'entryDate');
        params.set('sortOrder', 'desc');
        if (dateRange.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange.endDate) params.append('endDate', dateRange.endDate);
        const response = await api.get(`${LEDGERS_BASE}?${params.toString()}`, {}, true);
        applyResponse(response, requestedPage, requestedLimit);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setTransactions([]);
      setTransactionsPageFromApi(false);
      setTxPagination((prev) => ({ ...prev, total: 0, pages: 1 }));
    } finally {
      setTransactionsLoading(false);
    }
  }, [
    accountId,
    user?.college,
    dateRange.startDate,
    dateRange.endDate,
    txPagination.page,
    txPagination.limit,
  ]);

  const handleStatusChange = useCallback(
    async (newStatus) => {
      if (!accountId || !newStatus || newStatus === account?.status) return;
      const previousStatus = account?.status;
      try {
        setStatusSaving(true);
        setError('');
        setAccount((prev) => (prev ? { ...prev, status: newStatus } : prev));
        await api.put(`${ACCOUNTS_BASE}/${accountId}`, { status: newStatus }, {}, true);
      } catch (err) {
        setError(err.message || 'Failed to update account status');
        setAccount((prev) => (prev ? { ...prev, status: previousStatus } : prev));
        try {
          const response = await api.get(`${ACCOUNTS_BASE}/${accountId}`, {}, true);
          setAccount(response?.data || response);
        } catch {
          /* ignore */
        }
      } finally {
        setStatusSaving(false);
      }
    },
    [accountId, account?.status],
  );

  useEffect(() => {
    if (!user?.college) return;
    fetchAccountDetails();
  }, [user?.college, accountId, fetchAccountDetails]);

  useEffect(() => {
    if (!user?.college || !accountId) return;
    fetchTransactions();
  }, [user?.college, accountId, fetchTransactions]);

  // Flatten: each ledger has lines; pick the line for this account
  const transactionsForAccount = useMemo(() => {
    if (!accountId) return [];
    return transactions.flatMap((ledger) => {
      const lines = ledger.lines || [];
      const line = lines.find((ln) => {
        const aid = typeof ln.account === 'object' ? ln.account?._id : ln.account;
        return aid === accountId;
      });
      if (!line) return [];
      return [{ ...ledger, transactionType: line.transactionType, amount: line.amount, balance: line.balanceAfter }];
    });
  }, [transactions, accountId]);

  const statementIncomplete = useMemo(
    () =>
      transactionsPageFromApi &&
      typeof txPagination.total === 'number' &&
      txPagination.total > transactionsForAccount.length,
    [transactionsPageFromApi, txPagination.total, transactionsForAccount.length],
  );

  const displayedTransactionCount = useMemo(
    () =>
      transactionsPageFromApi && typeof txPagination.total === 'number'
        ? txPagination.total
        : transactionsForAccount.length,
    [transactionsPageFromApi, txPagination.total, transactionsForAccount.length],
  );

  const stats = useMemo(() => {
    const credits = transactionsForAccount
      .filter((t) => t.transactionType === 'credit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const debits = transactionsForAccount
      .filter((t) => t.transactionType === 'debit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const net = credits - debits;
    return { credits, debits, net, count: transactionsForAccount.length };
  }, [transactionsForAccount]);

  const handleDownloadStatement = useCallback(() => {
    if (!account || transactionsForAccount.length === 0) {
      alert('No transactions to export');
      return;
    }
    setExporting(true);
    try {
      const csvRows = [];
      csvRows.push(['Account Statement']);
      csvRows.push([]);
      csvRows.push(['Account Name', account.name || '']);
      csvRows.push(['Account Number', account.accountNumber || '']);
      csvRows.push(['Account Type', account.accountType || '']);
      if (account.bankName) csvRows.push(['Bank Name', account.bankName]);
      if (dateRange.startDate) csvRows.push(['From Date', formatDateForCSV(dateRange.startDate)]);
      if (dateRange.endDate) csvRows.push(['To Date', formatDateForCSV(dateRange.endDate)]);
      csvRows.push(['Generated Date', formatDateForCSV(new Date())]);
      csvRows.push([]);
      csvRows.push(['Opening Balance', account.openingBalance || 0]);
      csvRows.push([]);
      csvRows.push(['Transactions']);
      csvRows.push(['Date', 'Type', 'Entry Type', 'Description', 'Reference', 'Debit', 'Credit', 'Balance']);
      transactionsForAccount.forEach((t) => {
        const date = formatDateForCSV(t.entryDate);
        const type = t.transactionType || '';
        const entryType = t.entryType || '';
        const description = t.description || '';
        const reference = t.reference || t.referenceId || '';
        const amount = Number(t.amount) || 0;
        if (t.transactionType === 'credit') {
          csvRows.push([date, type, entryType, description, reference, '', amount, t.balance ?? '']);
        } else {
          csvRows.push([date, type, entryType, description, reference, amount, '', t.balance ?? '']);
        }
      });
      csvRows.push([]);
      csvRows.push(['Summary']);
      csvRows.push(['Total Credits', stats.credits]);
      csvRows.push(['Total Debits', stats.debits]);
      csvRows.push(['Net Amount', stats.net]);
      csvRows.push(['Closing Balance', (account.openingBalance || 0) + stats.net]);
      const csvContent = csvRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `account-statement-${account.name || accountId}-${dateRange.startDate || 'all'}-${dateRange.endDate || 'all'}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export statement:', err);
      alert('Failed to export statement');
    } finally {
      setExporting(false);
    }
  }, [account, transactionsForAccount, stats, dateRange, accountId]);

  // Print Statement
  const handlePrintStatement = useCallback(() => {
    if (!account || !printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    
    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Account Statement - ${account.name || 'Details'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              background: #ffffff;
              line-height: 1.6;
            }
            .statement-container {
              max-width: 900px;
              margin: 0 auto;
              background: #fff;
            }
            .statement-header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .statement-header h1 {
              font-size: 28px;
              font-weight: 700;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .statement-header .account-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              font-size: 14px;
            }
            .statement-header .info-item {
              margin-bottom: 8px;
            }
            .statement-header .info-label {
              font-weight: 600;
              color: #64748b;
            }
            .summary-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .summary-row:last-child {
              border-bottom: none;
              font-weight: 700;
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            table th {
              background: #f8fafc;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              color: #64748b;
              border-bottom: 2px solid #e2e8f0;
            }
            table td {
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
            }
            .text-right { text-align: right; }
            .credit { color: #10b981; font-weight: 600; }
            .debit { color: #ef4444; font-weight: 600; }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #94a3b8;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
              @page { margin: 0.5cm; size: A4 landscape; }
            }
          </style>
        </head>
        <body>
          <div class="statement-container">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [account]);

  // Transaction columns
  const transactionColumns = useMemo(() => [
    {
      id: 'entryDate',
      accessorKey: 'entryDate',
      header: 'Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
    },
    {
      id: 'transactionType',
      accessorKey: 'transactionType',
      header: 'Type',
      type: 'text',
      cell: ({ row }) => (
        <span
          className={`text-xs px-2 py-1 rounded capitalize ${
            row.transactionType === 'credit'
              ? 'bg-green-500/10 text-green-600'
              : 'bg-red-500/10 text-red-600'
          }`}
        >
          {row.transactionType === 'credit' ? (
            <TrendingUp className="h-3 w-3 inline mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 inline mr-1" />
          )}
          {row.transactionType}
        </span>
      ),
    },
    {
      id: 'entryType',
      accessorKey: 'entryType',
      header: 'Entry Type',
      type: 'text',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
          {row.entryType}
        </span>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      type: 'text',
      searchable: true,
    },
    {
      id: 'reference',
      accessorKey: 'reference',
      header: 'Reference',
      type: 'text',
      cell: ({ row }) => row.reference || row.referenceId || '-',
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Amount',
      type: 'currency',
      formatOptions: {
        locale: 'en-IN',
        currency: 'INR',
      },
      cell: ({ row }) => (
        <span
          className={`font-semibold ${
            row.transactionType === 'credit'
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {row.transactionType === 'credit' ? '+' : '-'}
          {formatCurrency(row.amount || 0)}
        </span>
      ),
    },
    {
      id: 'balance',
      accessorKey: 'balance',
      header: 'Balance after',
      type: 'currency',
      formatOptions: {
        locale: 'en-IN',
        currency: 'INR',
      },
    },
  ], []);

  // Transaction actions
  const transactionActions = useCallback((row) => {
    // Navigate to payment details if it's a payment entry
    if (row.entryType === 'payment' && row.referenceId) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/app/payments/${row.referenceId}`);
            }}
          >
            <Eye className="h-4 w-4" />
            View Payment
          </Button>
        </div>
      );
    }
    // Navigate to invoice if it's an invoice entry
    if (row.entryType === 'invoice' && row.referenceId) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/app/invoices/${row.referenceId}`);
            }}
          >
            <Eye className="h-4 w-4" />
            View Invoice
          </Button>
        </div>
      );
    }
    return null;
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading account details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Account not found'}</p>
            <Button onClick={() => router.push('/app/accounts')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Accounts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const transactionsWithBalance = transactionsForAccount;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/app/accounts')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">{account.name}</h1>
              {account.isDefault && (
                <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Default
                </span>
              )}
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground whitespace-nowrap">Status</span>
                <select
                  className="h-8 min-w-[9rem] rounded-md border border-input bg-background px-2 text-xs capitalize focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={account.status || 'active'}
                  disabled={statusSaving}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  {ACCOUNT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-muted-foreground mt-2">
              {account.accountType && (
                <span className="capitalize">{account.accountType.replace('_', ' ')}</span>
              )}
              {account.accountNumber && (
                <> • Account: <span className="font-semibold">{account.accountNumber}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchAccountDetails();
              fetchTransactions();
            }}
            className="gap-2"
            disabled={loading || transactionsLoading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadStatement}
            className="gap-2"
            disabled={exporting || transactionsForAccount.length === 0 || statementIncomplete}
            title={
              statementIncomplete
                ? 'CSV includes only the current page. Open Ledgers (this account) for a full export.'
                : undefined
            }
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Download Statement'}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrintStatement}
            className="gap-2"
            disabled={transactionsForAccount.length === 0 || statementIncomplete}
            title={
              statementIncomplete
                ? 'Print includes only the current page. Open Ledgers (this account) for the full statement.'
                : undefined
            }
          >
            <Printer className="h-4 w-4" />
            Print Statement
          </Button>
          {/* <Link href={`/app/ledgers?accountId=${accountId}`}>
            <Button variant="outline" className="gap-2">
              <BookOpen className="h-4 w-4" />
              View in ledgers
            </Button>
          </Link> */}
          <Button
            variant="default"
            onClick={() => router.push(`/app/accounts?edit=${accountId}`)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {account.accountNumber && (
            <div>
              <p className="text-sm text-muted-foreground">Account Number</p>
              <p className="font-medium mt-1">{account.accountNumber}</p>
            </div>
          )}
          {account.bankName && (
            <div>
              <p className="text-sm text-muted-foreground">Bank Name</p>
              <p className="font-medium mt-1">{account.bankName}</p>
            </div>
          )}
          {account.branch && (
            <div>
              <p className="text-sm text-muted-foreground">Branch</p>
              <p className="font-medium mt-1">{account.branch}</p>
            </div>
          )}
          {account.ifscCode && (
            <div>
              <p className="text-sm text-muted-foreground">IFSC Code</p>
              <p className="font-medium mt-1">{account.ifscCode}</p>
            </div>
          )}
          {(account.contactPerson && (typeof account.contactPerson === 'object' ? (account.contactPerson.name || account.contactPerson.phone || account.contactPerson.email) : account.contactPerson)) && (
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium mt-1">
                {typeof account.contactPerson === 'object'
                  ? [account.contactPerson.name, account.contactPerson.phone, account.contactPerson.email].filter(Boolean).join(' · ')
                  : account.contactPerson}
              </p>
            </div>
          )}
          {account.openingBalanceDate && (
            <div>
              <p className="text-sm text-muted-foreground">Opening Balance Date</p>
              <p className="font-medium mt-1">
                {formatDateForDisplay(account.openingBalanceDate)}
              </p>
            </div>
          )}
          {account.description && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium mt-1">{account.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(account.balance || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats.credits)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Debits</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(stats.debits)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold mt-1">{displayedTransactionCount}</p>
            </div>
            <FileText className="h-8 w-8 text-primary opacity-50" />
          </div>
        </div>
      </div>
      {statementIncomplete && (
        <p className="text-xs text-muted-foreground -mt-2">
          Credit and debit totals below reflect this page only. Total transaction count is from the server.
        </p>
      )}

      {/* Date Range Filter */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From Date</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }));
                  setTxPagination((p) => ({ ...p, page: 1 }));
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Date</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }));
                  setTxPagination((p) => ({ ...p, page: 1 }));
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDateRange({ startDate: '', endDate: '' });
                  setTxPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full"
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions / Ledger section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <div className="flex items-center gap-2">
            {/* <span className="text-sm text-muted-foreground">
              {displayedTransactionCount} transaction{displayedTransactionCount !== 1 ? 's' : ''}
              {statementIncomplete ? ' (loaded page)' : ''}
            </span> */}
            {/* <Link href={`/app/ledgers?accountId=${accountId}`}>
              <Button variant="ghost" size="sm" className="gap-1">
                <BookOpen className="h-4 w-4" />
                View in ledgers
              </Button>
            </Link> */}
            {/* <Link href={`/app/ledgers?accountId=${accountId}`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add ledger entry
              </Button>
            </Link> */}
          </div>
        </div>
        {transactionsForAccount.length === 0 &&
        !transactionsLoading &&
        (!transactionsPageFromApi || (txPagination.total ?? 0) === 0) ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No transactions yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add a ledger entry to record money in or out of this account.</p>
            <Link href={`/app/ledgers?accountId=${accountId}`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add ledger entry
              </Button>
            </Link>
          </div>
        ) : (
          <DataTable
            data={transactionsWithBalance}
            columns={transactionColumns}
            actions={transactionActions}
            loading={transactionsLoading}
            searchable={true}
            filterable={true}
            sortable={true}
            showColumnVisibility={true}
            showSettings={true}
            storageKey={`account-${accountId}-transactions-table`}
            defaultPageSize={20}
            pageSizeOptions={[10, 20, 50, 100]}
            emptyMessage="No transactions found for this account"
            {...(transactionsPageFromApi
              ? {
                  pagination: {
                    page: txPagination.page,
                    limit: txPagination.limit,
                    total: txPagination.total,
                    pages: txPagination.pages,
                  },
                  onPaginationChange: ({ page, pageSize }) =>
                    setTxPagination((p) => ({ ...p, page, limit: pageSize })),
                }
              : {})}
          />
        )}
      </div>

      {/* Print Statement Content */}
      <div ref={printRef} className="hidden">
        <div className="statement-header">
          <h1>Account Statement</h1>
          <div className="account-info">
            <div>
              <div className="info-item">
                <span className="info-label">Account Name:</span> {account.name}
              </div>
              {account.accountNumber && (
                <div className="info-item">
                  <span className="info-label">Account Number:</span> {account.accountNumber}
                </div>
              )}
              {account.bankName && (
                <div className="info-item">
                  <span className="info-label">Bank:</span> {account.bankName}
                </div>
              )}
            </div>
            <div>
              {dateRange.startDate && (
                <div className="info-item">
                  <span className="info-label">From:</span> {formatDateForDisplay(dateRange.startDate)}
                </div>
              )}
              {dateRange.endDate && (
                <div className="info-item">
                  <span className="info-label">To:</span> {formatDateForDisplay(dateRange.endDate)}
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Generated:</span> {formatDateForDisplay(new Date())}
              </div>
            </div>
          </div>
        </div>

        <div className="summary-box">
          <div className="summary-row">
            <span>Opening Balance:</span>
            <span>{formatCurrency(account.openingBalance || 0)}</span>
          </div>
          <div className="summary-row">
            <span>Total Credits:</span>
            <span className="credit">{formatCurrency(stats.credits)}</span>
          </div>
          <div className="summary-row">
            <span>Total Debits:</span>
            <span className="debit">{formatCurrency(stats.debits)}</span>
          </div>
          <div className="summary-row">
            <span>Net Amount:</span>
            <span>{formatCurrency(stats.net)}</span>
          </div>
          <div className="summary-row">
            <span>Closing Balance:</span>
            <span>{formatCurrency((account.openingBalance || 0) + stats.net)}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Entry Type</th>
              <th>Description</th>
              <th>Reference</th>
              <th className="text-right">Debit</th>
              <th className="text-right">Credit</th>
              <th className="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {transactionsForAccount.map((transaction, index) => (
              <tr key={transaction._id || index}>
                <td>{formatDateForDisplay(transaction.entryDate)}</td>
                <td className="capitalize">{transaction.transactionType}</td>
                <td className="capitalize">{transaction.entryType}</td>
                <td>{transaction.description || '-'}</td>
                <td>{transaction.reference || transaction.referenceId || '-'}</td>
                <td className="text-right">
                  {transaction.transactionType === 'debit' ? (
                    <span className="debit">{formatCurrency(transaction.amount || 0)}</span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="text-right">
                  {transaction.transactionType === 'credit' ? (
                    <span className="credit">{formatCurrency(transaction.amount || 0)}</span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="text-right">{formatCurrency(transaction.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="footer">
          <p>This is a computer-generated statement. No signature required.</p>
        </div>
      </div>
    </div>
  );
}

