'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCcw,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const PAYMENTS_BASE = '/finance/payments';

const EMPTY_PAYMENT = {
  paymentNumber: '',
  paymentDate: '',
  amount: '',
  paymentMethod: 'cash',
  status: 'pending',
  account: '',
  invoice: '',
  student: '',
  referenceNumber: '',
  transactionId: '',
  chequeNumber: '',
  chequeDate: '',
  bankName: '',
  description: '',
  notes: '',
};

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online Payment' },
  { value: 'upi', label: 'UPI' },
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'other', label: 'Other' },
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

export default function PaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingPayment, setEditingPayment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentMethod: '',
    invoiceId: '',
    studentId: '',
    accountId: '',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [sortBy, setSortBy] = useState('paymentDate');
  const [sortOrder, setSortOrder] = useState('desc');

  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);

  const fetchInvoices = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/finance/invoices?limit=1000', {}, true);
      const data = response?.data || response || [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  }, [user?.college]);

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

  const fetchStudents = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/students?limit=1000', {}, true);
      const data = response?.data || response || [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, [user?.college]);

  const fetchPayments = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.paymentMethod)
        params.append('paymentMethod', filters.paymentMethod);
      if (filters.invoiceId) params.append('invoiceId', filters.invoiceId);
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(
        `${PAYMENTS_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      const list = Array.isArray(data) ? data : [];

      setPayments(list);
    } catch (err) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [
    user?.college,
    filters.status,
    filters.paymentMethod,
    filters.invoiceId,
    filters.studentId,
    filters.accountId,
    filters.startDate,
    filters.endDate,
  ]);

  useEffect(() => {
    if (!user?.college) return;
    fetchInvoices();
    fetchAccounts();
    fetchStudents();
  }, [user?.college, fetchInvoices, fetchAccounts, fetchStudents]);

  useEffect(() => {
    if (!user?.college) return;
    fetchPayments();
  }, [user?.college, fetchPayments]);

  // Fetch invoice details when invoice is selected
  useEffect(() => {
    if (paymentForm.invoice) {
      const invoice = invoices.find((inv) => inv._id === paymentForm.invoice);
      if (invoice) {
        setSelectedInvoice(invoice);
        // Auto-fill student if invoice has student
        if (invoice.student && !paymentForm.student) {
          setPaymentForm((prev) => ({
            ...prev,
            student: invoice.student._id || invoice.student,
          }));
        }
      }
    } else {
      setSelectedInvoice(null);
    }
  }, [paymentForm.invoice, invoices]);

  // Fetch account details when account is selected
  useEffect(() => {
    if (paymentForm.account) {
      const account = accounts.find((acc) => acc._id === paymentForm.account);
      if (account) {
        setSelectedAccount(account);
      }
    } else {
      setSelectedAccount(null);
    }
  }, [paymentForm.account, accounts]);

  const resetForm = useCallback(() => {
    setPaymentForm(EMPTY_PAYMENT);
    setEditingPayment(null);
    setSelectedInvoice(null);
    setSelectedAccount(null);
    setShowForm(false);
  }, []);

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        paymentNumber: paymentForm.paymentNumber.trim(),
        paymentDate: paymentForm.paymentDate || undefined,
        amount: paymentForm.amount !== '' ? Number(paymentForm.amount) : undefined,
        paymentMethod: paymentForm.paymentMethod,
        status: paymentForm.status,
        account: paymentForm.account || undefined,
        invoice: paymentForm.invoice || undefined,
        student: paymentForm.student || undefined,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
        transactionId: paymentForm.transactionId.trim() || undefined,
        chequeNumber: paymentForm.chequeNumber.trim() || undefined,
        chequeDate: paymentForm.chequeDate || undefined,
        bankName: paymentForm.bankName.trim() || undefined,
        description: paymentForm.description.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      };

      if (editingPayment?._id) {
        await api.put(
          `${PAYMENTS_BASE}/${editingPayment._id}`,
          payload,
          {},
          true,
        );
        showSuccess('Payment updated successfully.');
      } else {
        await api.post(`${PAYMENTS_BASE}`, payload, {}, true);
        showSuccess('Payment created successfully.');
      }
      resetForm();
      await fetchPayments();
      await fetchInvoices(); // Refresh invoices to get updated balances
      await fetchAccounts(); // Refresh accounts to get updated balances
    } catch (err) {
      setError(err.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      paymentNumber: payment.paymentNumber || '',
      paymentDate: formatDateForInput(payment.paymentDate),
      amount: payment.amount !== undefined ? String(payment.amount) : '',
      paymentMethod: payment.paymentMethod || 'cash',
      status: payment.status || 'pending',
      account: payment.account?._id || payment.account || '',
      invoice: payment.invoice?._id || payment.invoice || '',
      student: payment.student?._id || payment.student || '',
      referenceNumber: payment.referenceNumber || '',
      transactionId: payment.transactionId || '',
      chequeNumber: payment.chequeNumber || '',
      chequeDate: formatDateForInput(payment.chequeDate),
      bankName: payment.bankName || '',
      description: payment.description || '',
      notes: payment.notes || '',
    });
    setShowForm(true);
  };

  const handleViewPayment = (paymentId) => {
    router.push(`/app/payments/${paymentId}`);
  };

  const handleDeletePayment = async (payment) => {
    if (!payment?._id) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            'Delete this payment? This will revert account balance and invoice updates if payment was completed.',
          )
        : true;
    if (!confirmed) return;
    try {
      setDeletingId(payment._id);
      setError('');
      await api.delete(`${PAYMENTS_BASE}/${payment._id}`, {}, true);
      showSuccess('Payment deleted.');
      await fetchPayments();
      await fetchInvoices(); // Refresh invoices to get updated balances
      await fetchAccounts(); // Refresh accounts to get updated balances
    } catch (err) {
      setError(err.message || 'Failed to delete payment');
    } finally {
      setDeletingId('');
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const completed = payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const pending = payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return {
      completed,
      pending,
      total: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      count: payments.length,
      completedCount: payments.filter((p) => p.status === 'completed').length,
    };
  }, [payments]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  // Define columns for Payments DataTable
  const paymentColumns = useMemo(() => [
    {
      id: 'paymentNumber',
      accessorKey: 'paymentNumber',
      header: 'Payment Number',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.status)}
          <span className="font-medium">{row.paymentNumber}</span>
        </div>
      ),
    },
    {
      id: 'paymentDate',
      accessorKey: 'paymentDate',
      header: 'Payment Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
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
      searchable: false,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: PAYMENT_STATUSES,
      cell: ({ row }) => (
        <span
          className={`text-xs px-2 py-1 rounded capitalize ${
            row.status === 'completed'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : row.status === 'pending'
              ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
              : row.status === 'failed'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      id: 'paymentMethod',
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: PAYMENT_METHODS,
      cell: ({ row }) => (
        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
          {row.paymentMethod}
        </span>
      ),
    },
    {
      id: 'account',
      accessorKey: 'account',
      header: 'Account',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.account) return '-';
        return typeof row.account === 'object' ? row.account.name : row.account;
      },
    },
    {
      id: 'invoice',
      accessorKey: 'invoice',
      header: 'Invoice',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.invoice) return '-';
        return typeof row.invoice === 'object' ? row.invoice.invoiceNumber : row.invoice;
      },
    },
    {
      id: 'student',
      accessorKey: 'student',
      header: 'Student',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.student) return '-';
        const student = typeof row.student === 'object' ? row.student : null;
        return student ? `${student.name}${student.studentId ? ` (${student.studentId})` : ''}` : '-';
      },
    },
    {
      id: 'referenceNumber',
      accessorKey: 'referenceNumber',
      header: 'Reference',
      type: 'text',
      searchable: true,
    },
    {
      id: 'transactionId',
      accessorKey: 'transactionId',
      header: 'Transaction ID',
      type: 'text',
      searchable: true,
    },
  ], []);

  // Define actions for Payments DataTable
  const paymentActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleViewPayment(row._id);
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
          handleEditPayment(row);
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
          handleDeletePayment(row);
        }}
        disabled={deletingId === row._id}
      >
        <Trash2 className="h-4 w-4" />
        {deletingId === row._id ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  ), [deletingId, router]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Payments</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage payment records, track invoice payments, and update account balances.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              try {
                await Promise.all([
                  fetchPayments(),
                  fetchInvoices(),
                  fetchAccounts(),
                ]);
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
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Payment
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
      {payments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Payments</div>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.total)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.count} payments
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.completed)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.completedCount} payments
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(summary.pending)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {payments.filter((p) => p.status === 'pending').length} payments
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                payments
                  .filter((p) => p.status === 'failed')
                  .reduce((sum, p) => sum + (p.amount || 0), 0),
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {payments.filter((p) => p.status === 'failed').length} payments
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Cancelled</div>
            <div className="text-2xl font-bold text-gray-600">
              {formatCurrency(
                payments
                  .filter((p) => p.status === 'cancelled')
                  .reduce((sum, p) => sum + (p.amount || 0), 0),
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {payments.filter((p) => p.status === 'cancelled').length} payments
            </div>
          </div>
        </div>
      )}

      {/* Server-side Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            value={filters.paymentMethod}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                paymentMethod: e.target.value,
              }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Methods</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
          <select
            value={filters.invoiceId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, invoiceId: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Invoices</option>
            {invoices.map((invoice) => (
              <option key={invoice._id} value={invoice._id}>
                {invoice.invoiceNumber}
              </option>
            ))}
          </select>
          <Input
            type="date"
            placeholder="Start Date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, startDate: e.target.value }))
            }
          />
          <Input
            type="date"
            placeholder="End Date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, endDate: e.target.value }))
            }
          />
          <Button onClick={fetchPayments} className="md:col-span-1">
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Payment Form */}
      {showForm && (
        <form
          onSubmit={handleSavePayment}
          className="bg-card border border-border rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editingPayment ? 'Edit Payment' : 'New Payment'}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetForm}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Invoice Balance Preview */}
          {selectedInvoice && (
            <div className="p-4 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice</p>
                  <p className="font-semibold">
                    {selectedInvoice.invoiceNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedInvoice.totalAmount || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Paid Amount</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedInvoice.paidAmount || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p
                    className={`font-semibold text-lg ${
                      (selectedInvoice.balanceAmount || 0) > 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(selectedInvoice.balanceAmount || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account Balance Preview */}
          {selectedAccount && (
            <div className="p-4 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Account</p>
                  <p className="font-semibold">{selectedAccount.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Current Balance
                  </p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedAccount.balance || 0)}
                  </p>
                </div>
                {paymentForm.amount &&
                  paymentForm.status === 'completed' && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        New Balance
                      </p>
                      <p className="font-semibold text-lg text-green-600">
                        {formatCurrency(
                          (selectedAccount.balance || 0) +
                            Number(paymentForm.amount || 0),
                        )}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Number *
              </label>
              <Input
                name="paymentNumber"
                value={paymentForm.paymentNumber}
                onChange={handleFormChange}
                required
                placeholder="PAY-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Date *
              </label>
              <Input
                name="paymentDate"
                type="date"
                value={paymentForm.paymentDate}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount *
              </label>
              <Input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={handleFormChange}
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Method *
              </label>
              <select
                name="paymentMethod"
                value={paymentForm.paymentMethod}
                onChange={handleFormChange}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Status *
              </label>
              <select
                name="status"
                value={paymentForm.status}
                onChange={handleFormChange}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Account *
              </label>
              <select
                name="account"
                value={paymentForm.account}
                onChange={handleFormChange}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name} ({formatCurrency(account.balance || 0)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Invoice</label>
              <select
                name="invoice"
                value={paymentForm.invoice}
                onChange={handleFormChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Invoice (Optional)</option>
                {invoices.map((invoice) => (
                  <option key={invoice._id} value={invoice._id}>
                    {invoice.invoiceNumber} - Balance:{' '}
                    {formatCurrency(invoice.balanceAmount || 0)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Student</label>
              <select
                name="student"
                value={paymentForm.student}
                onChange={handleFormChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Student (Optional)</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.studentId || student.rollNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Reference Number
              </label>
              <Input
                name="referenceNumber"
                value={paymentForm.referenceNumber}
                onChange={handleFormChange}
                placeholder="Reference number"
              />
            </div>
            {paymentForm.paymentMethod === 'cheque' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cheque Number
                  </label>
                  <Input
                    name="chequeNumber"
                    value={paymentForm.chequeNumber}
                    onChange={handleFormChange}
                    placeholder="Cheque number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cheque Date
                  </label>
                  <Input
                    name="chequeDate"
                    type="date"
                    value={paymentForm.chequeDate}
                    onChange={handleFormChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bank Name
                  </label>
                  <Input
                    name="bankName"
                    value={paymentForm.bankName}
                    onChange={handleFormChange}
                    placeholder="Bank name"
                  />
                </div>
              </>
            )}
            {(paymentForm.paymentMethod === 'online' ||
              paymentForm.paymentMethod === 'bank_transfer' ||
              paymentForm.paymentMethod === 'upi' ||
              paymentForm.paymentMethod === 'neft' ||
              paymentForm.paymentMethod === 'rtgs') && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Transaction ID
                </label>
                <Input
                  name="transactionId"
                  value={paymentForm.transactionId}
                  onChange={handleFormChange}
                  placeholder="Transaction ID"
                />
              </div>
            )}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Input
                name="description"
                value={paymentForm.description}
                onChange={handleFormChange}
                placeholder="Payment description"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                name="notes"
                value={paymentForm.notes}
                onChange={handleFormChange}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Additional notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? 'Saving...'
                : editingPayment
                ? 'Update Payment'
                : 'Create Payment'}
            </Button>
          </div>
        </form>
      )}

      {/* Payment List - DataTable */}
      <div className="bg-card border border-border rounded-lg p-4">
        <DataTable
          data={payments}
          columns={paymentColumns}
          actions={paymentActions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="payments-table"
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No payments found"
          onRowClick={(row) => router.push(`/app/payments/${row._id}`)}
        />
      </div>

    </div>
  );
}

