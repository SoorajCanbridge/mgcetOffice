'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tag,
  ArrowLeft,
  Calendar,
  Download,
  Printer,
  RefreshCcw,
  Edit2,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Eye,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const CATEGORIES_BASE = '/finance/categories';
const INCOMES_BASE = '/finance/incomes';
const EXPENSES_BASE = '/finance/expenses';
const LEDGERS_BASE = '/finance/ledgers';

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

export default function CategoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const categoryId = params?.id;
  const printRef = useRef(null);

  const [category, setCategory] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [incomesLoading, setIncomesLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchCategoryDetails = useCallback(async () => {
    if (!categoryId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`${CATEGORIES_BASE}/${categoryId}`, {}, true);
      const data = response?.data || response;
      setCategory(data);
    } catch (err) {
      setError(err.message || 'Failed to load category details');
    } finally {
      setLoading(false);
    }
  }, [categoryId, user?.college]);

  const fetchIncomes = useCallback(async () => {
    if (!categoryId || !user?.college) return;
    try {
      setIncomesLoading(true);
      const params = new URLSearchParams();
      params.append('categoryId', categoryId);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await api.get(
        `${INCOMES_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      setIncomes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load incomes:', err);
      setIncomes([]);
    } finally {
      setIncomesLoading(false);
    }
  }, [categoryId, user?.college, dateRange.startDate, dateRange.endDate]);

  const fetchExpenses = useCallback(async () => {
    if (!categoryId || !user?.college) return;
    try {
      setExpensesLoading(true);
      const params = new URLSearchParams();
      params.append('categoryId', categoryId);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await api.get(
        `${EXPENSES_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  }, [categoryId, user?.college, dateRange.startDate, dateRange.endDate]);

  const fetchTransactions = useCallback(async () => {
    if (!categoryId || !user?.college) return;
    try {
      setTransactionsLoading(true);
      const params = new URLSearchParams();
      params.append('category', categoryId);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await api.get(
        `${LEDGERS_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, [categoryId, user?.college, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    if (!user?.college) return;
    fetchCategoryDetails();
  }, [user?.college, categoryId, fetchCategoryDetails]);

  useEffect(() => {
    if (!user?.college || !categoryId) return;
    fetchIncomes();
    fetchExpenses();
    fetchTransactions();
  }, [user?.college, categoryId, fetchIncomes, fetchExpenses, fetchTransactions]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalIncome = incomes
      .filter((i) => !i.isCancelled)
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalExpense = expenses
      .filter((e) => !e.isCancelled)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netAmount = totalIncome - totalExpense;
    const totalTransactions = transactions.length;
    const creditTransactions = transactions.filter((t) => t.transactionType === 'credit').length;
    const debitTransactions = transactions.filter((t) => t.transactionType === 'debit').length;

    return {
      totalIncome,
      totalExpense,
      netAmount,
      totalTransactions,
      creditTransactions,
      debitTransactions,
      incomeCount: incomes.length,
      expenseCount: expenses.length,
    };
  }, [incomes, expenses, transactions]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    if (!category) return;
    setExporting(true);
    try {
      const csvRows = [];
      
      csvRows.push(['Category Details']);
      csvRows.push([]);
      
      csvRows.push(['Category Name', category.name || '']);
      csvRows.push(['Type', category.type || '']);
      csvRows.push(['Status', category.isActive ? 'Active' : 'Inactive']);
      csvRows.push(['Description', category.description || '']);
      if (dateRange.startDate) csvRows.push(['From Date', formatDateForCSV(dateRange.startDate)]);
      if (dateRange.endDate) csvRows.push(['To Date', formatDateForCSV(dateRange.endDate)]);
      csvRows.push([]);
      
      csvRows.push(['Statistics']);
      csvRows.push(['Total Income', stats.totalIncome]);
      csvRows.push(['Total Expense', stats.totalExpense]);
      csvRows.push(['Net Amount', stats.netAmount]);
      csvRows.push(['Income Count', stats.incomeCount]);
      csvRows.push(['Expense Count', stats.expenseCount]);
      csvRows.push(['Total Transactions', stats.totalTransactions]);
      csvRows.push([]);
      
      if (incomes.length > 0) {
        csvRows.push(['Incomes']);
        csvRows.push(['Title', 'Amount', 'Date', 'Source Type', 'Reference Number']);
        incomes.forEach((income) => {
          csvRows.push([
            income.title || '',
            income.amount || 0,
            formatDateForCSV(income.date),
            income.sourceType || '',
            income.referenceNumber || '',
          ]);
        });
        csvRows.push([]);
      }
      
      if (expenses.length > 0) {
        csvRows.push(['Expenses']);
        csvRows.push(['Title', 'Amount', 'Date', 'Vendor', 'Payment Method', 'Reference Number']);
        expenses.forEach((expense) => {
          csvRows.push([
            expense.title || '',
            expense.amount || 0,
            formatDateForCSV(expense.date),
            expense.vendor || '',
            expense.paymentMethod || '',
            expense.referenceNumber || '',
          ]);
        });
        csvRows.push([]);
      }
      
      if (transactions.length > 0) {
        csvRows.push(['Transactions']);
        csvRows.push(['Date', 'Account', 'Type', 'Entry Type', 'Description', 'Amount']);
        transactions.forEach((transaction) => {
          const accountName = typeof transaction.account === 'object' 
            ? transaction.account.name 
            : 'N/A';
          csvRows.push([
            formatDateForCSV(transaction.entryDate),
            accountName,
            transaction.transactionType || '',
            transaction.entryType || '',
            transaction.description || '',
            transaction.amount || 0,
          ]);
        });
      }
      
      const csvContent = csvRows.map((row) => 
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fileName = `category-${category.name || categoryId}-${dateRange.startDate || 'all'}-${dateRange.endDate || 'all'}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }, [category, incomes, expenses, transactions, stats, dateRange, categoryId]);

  // Print function
  const handlePrint = useCallback(() => {
    if (!category || !printRef.current) return;
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
          <title>Category - ${category.name || 'Details'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1a1a1a;
              background: #ffffff;
              line-height: 1.6;
            }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 28px; font-weight: 700; color: #2563eb; margin-bottom: 10px; }
            .section { margin-bottom: 30px; }
            .section h3 { font-size: 16px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .stat-item { padding: 15px; background: #f8fafc; border-radius: 6px; }
            .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .stat-value { font-size: 20px; font-weight: 700; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            table th { background: #f8fafc; padding: 10px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
              @page { margin: 0.5cm; size: A4; }
            }
          </style>
        </head>
        <body>
          <div>
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [category]);

  // Income columns
  const incomeColumns = useMemo(() => [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      type: 'text',
      searchable: true,
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
        <span className="font-semibold text-green-600">
          {formatCurrency(row.amount || 0)}
        </span>
      ),
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
    },
    {
      id: 'sourceType',
      accessorKey: 'sourceType',
      header: 'Source Type',
      type: 'text',
    },
  ], []);

  // Expense columns
  const expenseColumns = useMemo(() => [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      type: 'text',
      searchable: true,
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
        <span className="font-semibold text-red-600">
          {formatCurrency(row.amount || 0)}
        </span>
      ),
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
    },
    {
      id: 'vendor',
      accessorKey: 'vendor',
      header: 'Vendor',
      type: 'text',
    },
  ], []);

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
          {row.transactionType}
        </span>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      type: 'text',
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
    },
  ], []);

  // Income actions
  const incomeActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/app/incomes/${row._id}`);
        }}
      >
        <Eye className="h-4 w-4" />
        View
      </Button>
    </div>
  ), [router]);

  // Expense actions
  const expenseActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/app/expenses/${row._id}`);
        }}
      >
        <Eye className="h-4 w-4" />
        View
      </Button>
    </div>
  ), [router]);

  // Transaction actions
  const transactionActions = useCallback((row) => {
    const actions = [];
    
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
          <Eye className="h-4 w-4" />
          View Payment
        </Button>
      );
    }

    return actions.length > 0 ? <div className="flex items-center gap-2">{actions}</div> : null;
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading category details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Category not found'}</p>
            <Button onClick={() => router.push('/app/finance')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Finance
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/app/finance')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Tag className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">{category.name}</h1>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  category.isActive
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                }`}
              >
                {category.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
                {category.type}
              </span>
            </div>
            <p className="text-muted-foreground mt-2">
              {category.description || 'No description'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchCategoryDetails();
              fetchIncomes();
              fetchExpenses();
              fetchTransactions();
            }}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="gap-2"
            disabled={exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="default"
            onClick={() => router.push(`/app/finance?editCategory=${categoryId}`)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats.totalIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.incomeCount} record{stats.incomeCount !== 1 ? 's' : ''}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expense</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(stats.totalExpense)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.expenseCount} record{stats.expenseCount !== 1 ? 's' : ''}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Amount</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  stats.netAmount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
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
              <p className="text-2xl font-bold mt-1">{stats.totalTransactions}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.creditTransactions} credit, {stats.debitTransactions} debit
              </p>
            </div>
            <FileText className="h-8 w-8 text-primary opacity-50" />
          </div>
        </div>
      </div>

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
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
                className="w-full"
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Incomes Section */}
      {(category.type === 'income' || category.type === 'both') && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Incomes
            </h2>
            <span className="text-sm text-muted-foreground">
              {incomes.length} income{incomes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <DataTable
            data={incomes}
            columns={incomeColumns}
            actions={incomeActions}
            loading={incomesLoading}
            searchable={true}
            filterable={true}
            sortable={true}
            showColumnVisibility={true}
            showSettings={true}
            storageKey={`category-${categoryId}-incomes-table`}
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            emptyMessage="No income records found for this category"
            onRowClick={(row) => router.push(`/app/incomes/${row._id}`)}
          />
        </div>
      )}

      {/* Expenses Section */}
      {(category.type === 'expense' || category.type === 'both') && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Expenses
            </h2>
            <span className="text-sm text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </span>
          </div>
          <DataTable
            data={expenses}
            columns={expenseColumns}
            actions={expenseActions}
            loading={expensesLoading}
            searchable={true}
            filterable={true}
            sortable={true}
            showColumnVisibility={true}
            showSettings={true}
            storageKey={`category-${categoryId}-expenses-table`}
            defaultPageSize={10}
            pageSizeOptions={[10, 20, 50]}
            emptyMessage="No expense records found for this category"
            onRowClick={(row) => router.push(`/app/expenses/${row._id}`)}
          />
        </div>
      )}

      {/* Transactions Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <span className="text-sm text-muted-foreground">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <DataTable
          data={transactions}
          columns={transactionColumns}
          actions={transactionActions}
          loading={transactionsLoading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey={`category-${categoryId}-transactions-table`}
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No transactions found for this category"
        />
      </div>

      {/* Print Content */}
      <div ref={printRef} className="hidden">
        <div className="header">
          <h1>Category Report - {category.name}</h1>
          <p>Type: {category.type} | Status: {category.isActive ? 'Active' : 'Inactive'}</p>
          {dateRange.startDate && dateRange.endDate && (
            <p>
              Period: {formatDateForDisplay(dateRange.startDate)} to{' '}
              {formatDateForDisplay(dateRange.endDate)}
            </p>
          )}
        </div>

        <div className="section">
          <h3>Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Income</div>
              <div className="stat-value" style={{ color: '#10b981' }}>
                {formatCurrency(stats.totalIncome)}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Expense</div>
              <div className="stat-value" style={{ color: '#ef4444' }}>
                {formatCurrency(stats.totalExpense)}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Net Amount</div>
              <div className="stat-value">
                {formatCurrency(stats.netAmount)}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{stats.totalTransactions}</div>
            </div>
          </div>
        </div>

        {incomes.length > 0 && (
          <div className="section">
            <h3>Incomes ({incomes.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Source Type</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => (
                  <tr key={income._id}>
                    <td>{income.title || '-'}</td>
                    <td>{formatCurrency(income.amount || 0)}</td>
                    <td>{formatDateForDisplay(income.date)}</td>
                    <td>{income.sourceType || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {expenses.length > 0 && (
          <div className="section">
            <h3>Expenses ({expenses.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>{expense.title || '-'}</td>
                    <td>{formatCurrency(expense.amount || 0)}</td>
                    <td>{formatDateForDisplay(expense.date)}</td>
                    <td>{expense.vendor || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="section">
            <h3>Transactions ({transactions.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const accountName = typeof transaction.account === 'object' 
                    ? transaction.account.name 
                    : 'N/A';
                  return (
                    <tr key={transaction._id}>
                      <td>{formatDateForDisplay(transaction.entryDate)}</td>
                      <td>{accountName}</td>
                      <td className="capitalize">{transaction.transactionType}</td>
                      <td>{transaction.description || '-'}</td>
                      <td>{formatCurrency(transaction.amount || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="footer">
          <p>Generated on {formatDateForDisplay(new Date())}</p>
        </div>
      </div>
    </div>
  );
}

