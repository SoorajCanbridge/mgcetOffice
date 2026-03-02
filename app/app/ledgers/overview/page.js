'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  ArrowLeft,
  Download,
  Printer,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  FileText,
  Calendar,
  Filter,
  Eye,
  Wallet,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const LEDGERS_BASE = '/finance/ledgers';
const ACCOUNTS_BASE = '/finance/accounts';

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

export default function LedgersOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const printRef = useRef(null);

  const [ledgers, setLedgers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const [filters, setFilters] = useState({
    accountId: '',
    entryType: '',
    transactionType: '',
  });

  const fetchAccounts = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get(ACCOUNTS_BASE, {}, true);
      const data = response?.data || response || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
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
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await api.get(
        `${LEDGERS_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      setLedgers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  }, [
    user?.college,
    filters.accountId,
    filters.entryType,
    dateRange.startDate,
    dateRange.endDate,
  ]);

  useEffect(() => {
    if (!user?.college) return;
    fetchAccounts();
  }, [user?.college, fetchAccounts]);

  useEffect(() => {
    if (!user?.college) return;
    fetchLedgers();
  }, [user?.college, fetchLedgers]);

  // Flatten ledgers to one row per line (for table)
  const flattenedLedgers = useMemo(() => {
    const out = [];
    ledgers.forEach((ledger) => {
      (ledger.lines || []).forEach((line) => {
        out.push({
          ...ledger,
          _lineId: line.account?._id || line.account,
          account: line.account,
          transactionType: line.transactionType,
          amount: line.amount,
          balanceAfter: line.balanceAfter,
        });
      });
    });
    if (filters.transactionType) {
      return out.filter((r) => r.transactionType === filters.transactionType);
    }
    return out;
  }, [ledgers, filters.transactionType]);

  // Group by account (from lines)
  const transactionsByAccount = useMemo(() => {
    const grouped = {};
    ledgers.forEach((ledger) => {
      (ledger.lines || []).forEach((line) => {
        const accountId = typeof line.account === 'object' ? line.account._id : line.account;
        const accountName = typeof line.account === 'object' ? line.account.name : accounts.find((acc) => acc._id === accountId)?.name || 'Unknown Account';
        if (!grouped[accountId]) {
          grouped[accountId] = {
            accountId,
            accountName,
            account: typeof line.account === 'object' ? line.account : accounts.find((acc) => acc._id === accountId),
            transactions: [],
            totalCredits: 0,
            totalDebits: 0,
          };
        }
        grouped[accountId].transactions.push({ ...ledger, ...line });
        if (line.transactionType === 'credit') {
          grouped[accountId].totalCredits += Number(line.amount) || 0;
        } else {
          grouped[accountId].totalDebits += Number(line.amount) || 0;
        }
      });
    });
    return grouped;
  }, [ledgers, accounts]);

  const stats = useMemo(() => {
    let totalCredits = 0, totalDebits = 0;
    ledgers.forEach((ledger) => {
      (ledger.lines || []).forEach((line) => {
        const amt = Number(line.amount) || 0;
        if (line.transactionType === 'credit') totalCredits += amt;
        else totalDebits += amt;
      });
    });
    const netAmount = totalCredits - totalDebits;
    const accountCount = Object.keys(transactionsByAccount).length;
    const byEntryType = {};
    ledgers.forEach((ledger) => {
      const type = ledger.entryType || 'other';
      if (!byEntryType[type]) byEntryType[type] = { count: 0, amount: 0 };
      byEntryType[type].count++;
      (ledger.lines || []).forEach((line) => {
        byEntryType[type].amount += Number(line.amount) || 0;
      });
    });
    return {
      totalCredits,
      totalDebits,
      netAmount,
      accountCount,
      transactionCount: flattenedLedgers.length,
      byEntryType,
    };
  }, [ledgers, transactionsByAccount, flattenedLedgers.length]);

  // Generate Balance Sheet
  const generateBalanceSheet = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return null;

    // Assets (Debit balances)
    const assets = [];
    // Liabilities (Credit balances)
    const liabilities = [];
    // Equity
    const equity = [];

    Object.values(transactionsByAccount).forEach((accountData) => {
      const account = accountData.account;
      if (!account) return;

      const openingBalance = account.openingBalance || 0;
      const netBalance = accountData.totalCredits - accountData.totalDebits;
      const closingBalance = openingBalance + netBalance;

      // Determine account type and categorize
      const accountType = account.accountType || 'other';
      
      if (accountType === 'bank' || accountType === 'cash' || accountType === 'savings' || accountType === 'current') {
        // Assets
        assets.push({
          name: account.name,
          balance: closingBalance,
          accountId: account._id,
        });
      } else if (accountType === 'credit_card' || accountType === 'credit-card') {
        // Liabilities (credit cards are debts)
        liabilities.push({
          name: account.name,
          balance: Math.abs(closingBalance),
          accountId: account._id,
        });
      } else {
        // Default: positive balance = asset, negative = liability
        if (closingBalance >= 0) {
          assets.push({
            name: account.name,
            balance: closingBalance,
            accountId: account._id,
          });
        } else {
          liabilities.push({
            name: account.name,
            balance: Math.abs(closingBalance),
            accountId: account._id,
          });
        }
      }
    });

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = totalAssets - totalLiabilities;

    return {
      assets,
      liabilities,
      equity: totalEquity,
      totalAssets,
      totalLiabilities,
      dateRange,
    };
  }, [transactionsByAccount, dateRange]);

  // Download Balance Sheet as CSV
  const handleDownloadBalanceSheet = useCallback(() => {
    if (!generateBalanceSheet) {
      alert('Please select a date range to generate balance sheet');
      return;
    }
    setExporting(true);
    try {
      const csvRows = [];
      
      csvRows.push(['Balance Sheet']);
      csvRows.push([]);
      csvRows.push(['From Date', formatDateForCSV(dateRange.startDate)]);
      csvRows.push(['To Date', formatDateForCSV(dateRange.endDate)]);
      csvRows.push(['Generated Date', formatDateForCSV(new Date())]);
      csvRows.push([]);
      
      csvRows.push(['ASSETS']);
      csvRows.push(['Account Name', 'Balance']);
      generateBalanceSheet.assets.forEach((asset) => {
        csvRows.push([asset.name, asset.balance]);
      });
      csvRows.push(['Total Assets', generateBalanceSheet.totalAssets]);
      csvRows.push([]);
      
      csvRows.push(['LIABILITIES']);
      csvRows.push(['Account Name', 'Balance']);
      generateBalanceSheet.liabilities.forEach((liability) => {
        csvRows.push([liability.name, liability.balance]);
      });
      csvRows.push(['Total Liabilities', generateBalanceSheet.totalLiabilities]);
      csvRows.push([]);
      
      csvRows.push(['EQUITY']);
      csvRows.push(['Total Equity', generateBalanceSheet.equity]);
      
      const csvContent = csvRows.map((row) => 
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fileName = `balance-sheet-${dateRange.startDate}-${dateRange.endDate}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export balance sheet:', err);
      alert('Failed to export balance sheet');
    } finally {
      setExporting(false);
    }
  }, [generateBalanceSheet, dateRange]);

  // Print Balance Sheet
  const handlePrintBalanceSheet = useCallback(() => {
    if (!generateBalanceSheet) {
      alert('Please select a date range to generate balance sheet');
      return;
    }
    if (!printRef.current) return;
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
          <title>Balance Sheet - ${dateRange.startDate} to ${dateRange.endDate}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              background: #ffffff;
              line-height: 1.6;
            }
            .balance-sheet-container {
              max-width: 900px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .date-range {
              font-size: 14px;
              color: #64748b;
            }
            .section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
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
            .total-row {
              font-weight: 700;
              background: #f8fafc;
              border-top: 2px solid #e2e8f0;
            }
            .summary {
              margin-top: 30px;
              padding: 20px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 16px;
            }
            .summary-row.total {
              border-top: 2px solid #1e293b;
              margin-top: 10px;
              padding-top: 15px;
              font-size: 20px;
              font-weight: 700;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
              @page { margin: 0.5cm; size: A4; }
            }
          </style>
        </head>
        <body>
          <div class="balance-sheet-container">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [generateBalanceSheet, dateRange]);

  // Ledger columns
  const ledgerColumns = useMemo(() => [
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
      id: 'account',
      accessorKey: 'account',
      header: 'Account',
      type: 'text',
      cell: ({ row }) => {
        if (!row.account) return '-';
        return typeof row.account === 'object' ? row.account.name : '-';
      },
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
  ], []);

  // Ledger actions
  const ledgerActions = useCallback((row) => {
    const actions = [];
    
    // Navigate to account
    if (row.account) {
      const accountId = typeof row.account === 'object' ? row.account._id : row.account;
      if (accountId) {
        actions.push(
          <Button
            key="account"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/app/accounts/${accountId}`);
            }}
          >
            <Wallet className="h-4 w-4" />
            View Account
          </Button>
        );
      }
    }

    // Navigate to payment if entry type is payment
    if (row.entryType === 'payment' && row.referenceId) {
      actions.push(
        <Button
          key="payment"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/app/payments/${row.referenceId}`);
          }}
        >
          <Receipt className="h-4 w-4" />
          View Payment
        </Button>
      );
    }

    // Navigate to invoice if entry type is invoice
    if (row.entryType === 'invoice' && row.referenceId) {
      actions.push(
        <Button
          key="invoice"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/app/invoices/${row.referenceId}`);
          }}
        >
          <FileText className="h-4 w-4" />
          View Invoice
        </Button>
      );
    }

    return actions.length > 0 ? <div className="flex items-center gap-2">{actions}</div> : null;
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/app/ledgers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Ledger Overview</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              View all ledger entries, transactions by account, and generate balance sheets
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchLedgers();
              fetchAccounts();
            }}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          {generateBalanceSheet && (
            <>
              <Button
                variant="outline"
                onClick={handleDownloadBalanceSheet}
                className="gap-2"
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Download Balance Sheet'}
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintBalanceSheet}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Balance Sheet
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats.totalCredits)}
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
                {formatCurrency(stats.totalDebits)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Amount</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(stats.netAmount)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold mt-1">{stats.transactionCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Across {stats.accountCount} account{stats.accountCount !== 1 ? 's' : ''}
              </p>
            </div>
            <FileText className="h-8 w-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">From Date</label>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To Date</label>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Account</label>
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
            <label className="block text-sm font-medium mb-2">Entry Type</label>
            <select
              value={filters.entryType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, entryType: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Types</option>
              <option value="manual">Manual</option>
              <option value="invoice">Invoice</option>
              <option value="payment">Payment</option>
              <option value="transfer">Transfer</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="adjustment">Adjustment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Transaction Type</label>
            <select
              value={filters.transactionType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, transactionType: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Balance Sheet Preview */}
      {generateBalanceSheet && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Balance Sheet Preview</h2>
            <span className="text-sm text-muted-foreground">
              {formatDateForDisplay(dateRange.startDate)} to {formatDateForDisplay(dateRange.endDate)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets */}
            <div>
              <h3 className="font-semibold mb-3 text-green-600">ASSETS</h3>
              <div className="space-y-2">
                {generateBalanceSheet.assets.map((asset) => (
                  <div
                    key={asset.accountId}
                    className="flex justify-between items-center p-2 bg-muted rounded"
                  >
                    <span className="text-sm">{asset.name}</span>
                    <span className="font-semibold">{formatCurrency(asset.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-2 bg-green-500/10 rounded border-t-2 border-green-500 mt-2">
                  <span className="font-semibold">Total Assets</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(generateBalanceSheet.totalAssets)}
                  </span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div>
              <h3 className="font-semibold mb-3 text-red-600">LIABILITIES</h3>
              <div className="space-y-2">
                {generateBalanceSheet.liabilities.map((liability) => (
                  <div
                    key={liability.accountId}
                    className="flex justify-between items-center p-2 bg-muted rounded"
                  >
                    <span className="text-sm">{liability.name}</span>
                    <span className="font-semibold">{formatCurrency(liability.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-2 bg-red-500/10 rounded border-t-2 border-red-500 mt-2">
                  <span className="font-semibold">Total Liabilities</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(generateBalanceSheet.totalLiabilities)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded border-t-2 border-primary mt-2">
                  <span className="font-semibold">Total Equity</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(generateBalanceSheet.equity)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions by Account */}
      {Object.keys(transactionsByAccount).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Transactions by Account</h2>
          {Object.values(transactionsByAccount).map((accountData) => (
            <div key={accountData.accountId} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">{accountData.accountName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {accountData.transactions.length} transaction{accountData.transactions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Credits</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(accountData.totalCredits)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Debits</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(accountData.totalDebits)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/app/accounts/${accountData.accountId}`)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Account
                  </Button>
                </div>
              </div>
              <DataTable
                data={accountData.transactions}
                columns={ledgerColumns}
                actions={ledgerActions}
                loading={false}
                searchable={true}
                filterable={true}
                sortable={true}
                showColumnVisibility={true}
                showSettings={true}
                storageKey={`ledger-account-${accountData.accountId}-table`}
                defaultPageSize={10}
                pageSizeOptions={[10, 20, 50]}
                emptyMessage="No transactions for this account"
              />
            </div>
          ))}
        </div>
      )}

      {/* All Transactions Table */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">All Transactions</h2>
          <span className="text-sm text-muted-foreground">
            {ledgers.length} transaction{ledgers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <DataTable
          data={flattenedLedgers}
          columns={ledgerColumns}
          actions={ledgerActions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="ledgers-overview-table"
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No ledger entries found"
        />
      </div>

      {/* Print Balance Sheet Content */}
      {generateBalanceSheet && (
        <div ref={printRef} className="hidden">
          <div className="header">
            <h1>Balance Sheet</h1>
            <div className="date-range">
              {formatDateForDisplay(dateRange.startDate)} to {formatDateForDisplay(dateRange.endDate)}
            </div>
          </div>

          <div className="section">
            <div className="section-title">ASSETS</div>
            <table>
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {generateBalanceSheet.assets.map((asset) => (
                  <tr key={asset.accountId}>
                    <td>{asset.name}</td>
                    <td className="text-right">{formatCurrency(asset.balance)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total Assets</td>
                  <td className="text-right">{formatCurrency(generateBalanceSheet.totalAssets)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="section">
            <div className="section-title">LIABILITIES</div>
            <table>
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {generateBalanceSheet.liabilities.map((liability) => (
                  <tr key={liability.accountId}>
                    <td>{liability.name}</td>
                    <td className="text-right">{formatCurrency(liability.balance)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total Liabilities</td>
                  <td className="text-right">{formatCurrency(generateBalanceSheet.totalLiabilities)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="summary">
            <div className="summary-row total">
              <span>Total Equity</span>
              <span>{formatCurrency(generateBalanceSheet.equity)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

