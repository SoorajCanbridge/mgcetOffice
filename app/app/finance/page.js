'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCcw,
  Search,
  Eye,
  Activity,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const FINANCE_BASE = '/finance';

const EMPTY_CATEGORY = {
  name: '',
  type: 'income',
  description: '',
  isActive: true,
};

const EMPTY_RECIPIENT = { name: '', phone: '', email: '', address: '' };

const EMPTY_INCOME = {
  title: '',
  amount: '',
  date: '',
  category: '',
  account: '',
  student: '',
  referenceNumber: '',
  notes: '',
  isCancelled: false,
  haveRecipient: false,
  recipient: { ...EMPTY_RECIPIENT },
};

const EMPTY_EXPENSE = {
  title: '',
  amount: '',
  date: '',
  category: '',
  account: '',
  referenceNumber: '',
  notes: '',
  isCancelled: false,
  haveRecipient: false,
  recipient: { ...EMPTY_RECIPIENT },
};

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

export default function FinancePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('summary');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Categories
  const [categories, setCategories] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState({
    search: '',
    type: '',
    isActive: '',
  });
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY);
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState('');

  // Accounts
  const [accounts, setAccounts] = useState([]);

  // Incomes
  const [incomes, setIncomes] = useState([]);
  const [incomeFilters, setIncomeFilters] = useState({
    search: '',
    categoryId: '',
    accountId: '',
    studentId: '',
    isCancelled: '',
    startDate: '',
    endDate: '',
  });
  const [incomePagination, setIncomePagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [incomeSortBy, setIncomeSortBy] = useState('date');
  const [incomeSortOrder, setIncomeSortOrder] = useState('desc');
  const [incomeForm, setIncomeForm] = useState(EMPTY_INCOME);
  const [editingIncome, setEditingIncome] = useState(null);
  const [savingIncome, setSavingIncome] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState('');

  // Expenses
  const [expenses, setExpenses] = useState([]);
  const [expenseFilters, setExpenseFilters] = useState({
    search: '',
    categoryId: '',
    recipient: '',
    accountId: '',
    isCancelled: '',
    startDate: '',
    endDate: '',
  });
  const [expensePagination, setExpensePagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [expenseSortBy, setExpenseSortBy] = useState('date');
  const [expenseSortOrder, setExpenseSortOrder] = useState('desc');
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [editingExpense, setEditingExpense] = useState(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState('');

  // Summary
  const [summary, setSummary] = useState(null);
  const [summaryFilters, setSummaryFilters] = useState({
    startDate: '',
    endDate: '',
  });

  const resetCategoryForm = useCallback(() => {
    setCategoryForm(EMPTY_CATEGORY);
    setEditingCategory(null);
  }, []);

  const resetIncomeForm = useCallback(() => {
    setIncomeForm({ ...EMPTY_INCOME, date: formatDateForInput(new Date()) });
    setEditingIncome(null);
  }, []);

  const openIncomeForm = useCallback(() => {
    resetIncomeForm();
    setShowIncomeModal(true);
  }, [resetIncomeForm]);

  const closeIncomeModal = useCallback(() => {
    setShowIncomeModal(false);
    resetIncomeForm();
  }, [resetIncomeForm]);

  const resetExpenseForm = useCallback(() => {
    setExpenseForm({ ...EMPTY_EXPENSE, date: formatDateForInput(new Date()) });
    setEditingExpense(null);
  }, []);

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const fetchCategories = useCallback(async () => {
    if (!user?.college) return;
    try {
      setError('');
      const params = new URLSearchParams();
      if (categoryFilters.type) params.append('type', categoryFilters.type);
      if (categoryFilters.isActive !== '') {
        params.append('isActive', categoryFilters.isActive);
      }
      const res = await api.get(
        `${FINANCE_BASE}/categories?${params.toString()}`,
        {},
        true,
      );
      const data = res?.data || res || [];
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    }
  }, [user?.college, categoryFilters.type, categoryFilters.isActive]);

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

  const fetchIncomes = useCallback(async () => {
    if (!user?.college) return;
    try {
      setError('');
      const params = new URLSearchParams();
      if (incomeFilters.categoryId)
        params.append('categoryId', incomeFilters.categoryId);
      if (incomeFilters.accountId)
        params.append('accountId', incomeFilters.accountId);
      if (incomeFilters.studentId)
        params.append('studentId', incomeFilters.studentId);
      if (incomeFilters.isCancelled !== '')
        params.append('isCancelled', incomeFilters.isCancelled);
      if (incomeFilters.startDate)
        params.append('startDate', incomeFilters.startDate);
      if (incomeFilters.endDate)
        params.append('endDate', incomeFilters.endDate);

      const res = await api.get(
        `${FINANCE_BASE}/incomes?${params.toString()}`,
        {},
        true,
      );
      const data = res?.data || res || [];
      const list = Array.isArray(data) ? data : [];
      setIncomes(list);
    } catch (err) {
      setError(err.message || 'Failed to load incomes');
    }
  }, [
    user?.college,
    incomeFilters.categoryId,
    incomeFilters.accountId,
    incomeFilters.studentId,
    incomeFilters.isCancelled,
    incomeFilters.startDate,
    incomeFilters.endDate,
  ]);

  const fetchExpenses = useCallback(async () => {
    if (!user?.college) return;
    try {
      setError('');
      const params = new URLSearchParams();
      if (expenseFilters.categoryId)
        params.append('categoryId', expenseFilters.categoryId);
      if (expenseFilters.recipient)
        params.append('recipient', expenseFilters.recipient);
      if (expenseFilters.accountId)
        params.append('accountId', expenseFilters.accountId);
      if (expenseFilters.isCancelled !== '')
        params.append('isCancelled', expenseFilters.isCancelled);
      if (expenseFilters.startDate)
        params.append('startDate', expenseFilters.startDate);
      if (expenseFilters.endDate)
        params.append('endDate', expenseFilters.endDate);

      const res = await api.get(
        `${FINANCE_BASE}/expenses?${params.toString()}`,
        {},
        true,
      );
      const data = res?.data || res || [];
      const list = Array.isArray(data) ? data : [];
      setExpenses(list);
    } catch (err) {
      setError(err.message || 'Failed to load expenses');
    }
  }, [
    user?.college,
    expenseFilters.categoryId,
    expenseFilters.recipient,
    expenseFilters.accountId,
    expenseFilters.isCancelled,
    expenseFilters.startDate,
    expenseFilters.endDate,
  ]);

  const fetchSummary = useCallback(async () => {
    if (!user?.college) return;
    try {
      setError('');
      const params = new URLSearchParams();
      if (summaryFilters.startDate)
        params.append('startDate', summaryFilters.startDate);
      if (summaryFilters.endDate)
        params.append('endDate', summaryFilters.endDate);

      const res = await api.get(
        `${FINANCE_BASE}/summary?${params.toString()}`,
        {},
        true,
      );
      const data = res?.data || res || null;
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load finance summary');
    }
  }, [user?.college, summaryFilters]);

  useEffect(() => {
    if (!user?.college) return;
    fetchSummary();
    fetchCategories();
    fetchAccounts();
  }, [user?.college, fetchSummary, fetchCategories, fetchAccounts]);

  useEffect(() => {
    if (!user?.college) return;
    fetchIncomes();
  }, [user?.college, fetchIncomes]);

  useEffect(() => {
    if (!user?.college) return;
    fetchExpenses();
  }, [user?.college, fetchExpenses]);

  const handleCategoryChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCategoryForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleIncomeChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'haveRecipient') {
      setIncomeForm((prev) => ({ ...prev, haveRecipient: checked, recipient: checked ? { ...prev.recipient } : { ...EMPTY_RECIPIENT } }));
      return;
    }
    if (name.startsWith('recipient.')) {
      const key = name.split('.')[1];
      setIncomeForm((prev) => ({ ...prev, recipient: { ...(prev.recipient || {}), [key]: value } }));
      return;
    }
    setIncomeForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleExpenseChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'haveRecipient') {
      setExpenseForm((prev) => ({ ...prev, haveRecipient: checked, recipient: checked ? { ...prev.recipient } : { ...EMPTY_RECIPIENT } }));
      return;
    }
    if (name.startsWith('recipient.')) {
      const key = name.split('.')[1];
      setExpenseForm((prev) => ({ ...prev, recipient: { ...(prev.recipient || {}), [key]: value } }));
      return;
    }
    setExpenseForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setError('');
    setSavingCategory(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        type: categoryForm.type,
        description: categoryForm.description.trim() || undefined,
        isActive: !!categoryForm.isActive,
      };
      if (editingCategory?._id) {
        await api.put(
          `${FINANCE_BASE}/categories/${editingCategory._id}`,
          payload,
          {},
          true,
        );
        showSuccess('Category updated successfully.');
      } else {
        await api.post(`${FINANCE_BASE}/categories`, payload, {}, true);
        showSuccess('Category created successfully.');
      }
      resetCategoryForm();
      await fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || '',
      type: category.type || 'income',
      description: category.description || '',
      isActive: category.isActive ?? true,
    });
  };

  const handleDeleteCategory = async (category) => {
    if (!category?._id) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Delete this category?')
        : true;
    if (!confirmed) return;
    try {
      setDeletingCategoryId(category._id);
      setError('');
      await api.delete(
        `${FINANCE_BASE}/categories/${category._id}`,
        {},
        true,
      );
      showSuccess('Category deleted.');
      await fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setDeletingCategoryId('');
    }
  };

  const handleSaveIncome = async (e) => {
    e.preventDefault();
    setError('');
    setSavingIncome(true);
    try {
      const recipientPayload =
        incomeForm.haveRecipient && incomeForm.recipient
          ? {
              name: (incomeForm.recipient.name || '').trim() || undefined,
              phone: (incomeForm.recipient.phone || '').trim() || undefined,
              email: (incomeForm.recipient.email || '').trim().toLowerCase() || undefined,
              address: (incomeForm.recipient.address || '').trim() || undefined,
            }
          : undefined;
      const hasRecipient = recipientPayload && (recipientPayload.name || recipientPayload.phone || recipientPayload.email || recipientPayload.address);
      const payload = {
        title: incomeForm.title.trim(),
        amount:
          incomeForm.amount !== ''
            ? Number(incomeForm.amount)
            : undefined,
        date: incomeForm.date || undefined,
        category: incomeForm.category || undefined,
        account: incomeForm.account || undefined,
        student: incomeForm.student || undefined,
        referenceNumber: incomeForm.referenceNumber.trim() || undefined,
        notes: incomeForm.notes.trim() || undefined,
        isCancelled: !!incomeForm.isCancelled,
        ...(hasRecipient ? { recipient: recipientPayload } : {}),
      };
      if (editingIncome?._id) {
        await api.put(
          `${FINANCE_BASE}/incomes/${editingIncome._id}`,
          payload,
          {},
          true,
        );
        showSuccess('Income updated successfully.');
      } else {
        await api.post(`${FINANCE_BASE}/incomes`, payload, {}, true);
        showSuccess('Income created successfully.');
      }
      resetIncomeForm();
      setShowIncomeModal(false);
      await fetchIncomes();
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'Failed to save income');
    } finally {
      setSavingIncome(false);
    }
  };

  const handleEditIncome = (income) => {
    setEditingIncome(income);
    const rec = income.recipient && typeof income.recipient === 'object' ? income.recipient : {};
    const hasRec = !!(rec.name || rec.phone || rec.email || rec.address);
    setIncomeForm({
      title: income.title || '',
      amount:
        income.amount !== undefined && income.amount !== null
          ? String(income.amount)
          : '',
      date: formatDateForInput(income.date),
      category: income.category?._id || income.category || '',
      account: income.account?._id || income.account || '',
      student: income.student?._id || income.student || '',
      referenceNumber: income.referenceNumber || '',
      notes: income.notes || '',
      isCancelled: income.isCancelled ?? false,
      haveRecipient: hasRec,
      recipient: { name: rec.name || '', phone: rec.phone || '', email: rec.email || '', address: rec.address || '' },
    });
    setShowIncomeModal(true);
  };

  const handleDeleteIncome = async (income) => {
    if (!income?._id) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Delete this income record?')
        : true;
    if (!confirmed) return;
    try {
      setDeletingIncomeId(income._id);
      setError('');
      await api.delete(
        `${FINANCE_BASE}/incomes/${income._id}`,
        {},
        true,
      );
      showSuccess('Income deleted.');
      await fetchIncomes();
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'Failed to delete income');
    } finally {
      setDeletingIncomeId('');
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setError('');
    setSavingExpense(true);
    try {
      const recipientPayload =
        expenseForm.haveRecipient && expenseForm.recipient
          ? {
              name: (expenseForm.recipient.name || '').trim() || undefined,
              phone: (expenseForm.recipient.phone || '').trim() || undefined,
              email: (expenseForm.recipient.email || '').trim().toLowerCase() || undefined,
              address: (expenseForm.recipient.address || '').trim() || undefined,
            }
          : undefined;
      const hasRecipient = recipientPayload && (recipientPayload.name || recipientPayload.phone || recipientPayload.email || recipientPayload.address);
      const payload = {
        title: expenseForm.title.trim(),
        amount:
          expenseForm.amount !== ''
            ? Number(expenseForm.amount)
            : undefined,
        date: expenseForm.date || undefined,
        category: expenseForm.category || undefined,
        account: expenseForm.account || undefined,
        referenceNumber: expenseForm.referenceNumber.trim() || undefined,
        notes: expenseForm.notes.trim() || undefined,
        isCancelled: !!expenseForm.isCancelled,
        ...(hasRecipient ? { recipient: recipientPayload } : {}),
      };
      if (editingExpense?._id) {
        await api.put(
          `${FINANCE_BASE}/expenses/${editingExpense._id}`,
          payload,
          {},
          true,
        );
        showSuccess('Expense updated successfully.');
      } else {
        await api.post(`${FINANCE_BASE}/expenses`, payload, {}, true);
        showSuccess('Expense created successfully.');
      }
      resetExpenseForm();
      await fetchExpenses();
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    const rec = expense.recipient && typeof expense.recipient === 'object' ? expense.recipient : (expense.vendor ? { name: expense.vendor, phone: '', email: '', address: '' } : {});
    const hasRec = !!(rec.name || rec.phone || rec.email || rec.address);
    setExpenseForm({
      title: expense.title || '',
      amount:
        expense.amount !== undefined && expense.amount !== null
          ? String(expense.amount)
          : '',
      date: formatDateForInput(expense.date),
      category: expense.category?._id || expense.category || '',
      account: expense.account?._id || expense.account || '',
      referenceNumber: expense.referenceNumber || '',
      notes: expense.notes || '',
      isCancelled: expense.isCancelled ?? false,
      haveRecipient: hasRec,
      recipient: { name: rec.name || '', phone: rec.phone || '', email: rec.email || '', address: rec.address || '' },
    });
  };

  const handleDeleteExpense = async (expense) => {
    if (!expense?._id) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Delete this expense record?')
        : true;
    if (!confirmed) return;
    try {
      setDeletingExpenseId(expense._id);
      setError('');
      await api.delete(
        `${FINANCE_BASE}/expenses/${expense._id}`,
        {},
        true,
      );
      showSuccess('Expense deleted.');
      await fetchExpenses();
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'Failed to delete expense');
    } finally {
      setDeletingExpenseId('');
    }
  };

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Total Income',
        value: formatCurrency(summary.totalIncome),
        className: 'text-green-600',
      },
      {
        label: 'Total Expense',
        value: formatCurrency(summary.totalExpense),
        className: 'text-red-600',
      },
      {
        label: 'Net',
        value: formatCurrency(summary.net),
        className:
          (summary.net || 0) >= 0 ? 'text-green-600' : 'text-red-600',
      },
      {
        label: 'Income Records',
        value: summary.totalIncomeCount || 0,
      },
      {
        label: 'Expense Records',
        value: summary.totalExpenseCount || 0,
      },
    ];
  }, [summary]);

  const incomeCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === 'income' || c.type === 'both',
      ),
    [categories],
  );

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === 'expense' || c.type === 'both',
      ),
    [categories],
  );

  // Define columns for Categories DataTable
  const categoryColumns = useMemo(() => [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      type: 'text',
      searchable: true,
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Type',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'income', label: 'Income' },
        { value: 'expense', label: 'Expense' },
        { value: 'both', label: 'Both' },
      ],
      cell: ({ row }) => (
        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
          {row.type}
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
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Status',
      type: 'boolean',
      formatOptions: {
        trueLabel: 'Active',
        falseLabel: 'Inactive',
      },
      cell: ({ row }) => (
        <span
          className={`text-xs px-2 py-1 rounded ${
            row.isActive
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
          }`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ], []);

  // Define actions for Categories DataTable
  const categoryActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/app/categories/${row._id}`);
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
          handleEditCategory(row);
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
          handleDeleteCategory(row);
        }}
        disabled={deletingCategoryId === row._id}
      >
        <Trash2 className="h-4 w-4" />
        {deletingCategoryId === row._id ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  ), [deletingCategoryId, router]);

  // Define columns for Income DataTable
  const incomeColumns = useMemo(() => [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.title || 'Untitled'}</span>
          {row.isCancelled && (
            <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-400">
              Cancelled
            </span>
          )}
        </div>
      ),
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
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.category) return '-';
        return typeof row.category === 'object' ? row.category.name : row.category;
      },
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
      id: 'recipient',
      accessorKey: 'recipient',
      header: 'Recipient',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (row.recipient && typeof row.recipient === 'object' && row.recipient.name) ? row.recipient.name : '—',
    },
    {
      id: 'referenceNumber',
      accessorKey: 'referenceNumber',
      header: 'Reference',
      type: 'text',
      searchable: true,
    },
    {
      id: 'notes',
      accessorKey: 'notes',
      header: 'Notes',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-xs">
          {row.notes || '-'}
        </span>
      ),
    },
  ], []);

  // Define actions for Income DataTable
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
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleEditIncome(row);
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
          handleDeleteIncome(row);
        }}
        disabled={deletingIncomeId === row._id}
      >
        <Trash2 className="h-4 w-4" />
        {deletingIncomeId === row._id ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  ), [deletingIncomeId, router]);

  // Define columns for Expense DataTable
  const expenseColumns = useMemo(() => [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.title || 'Untitled'}</span>
          {row.isCancelled && (
            <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-400">
              Cancelled
            </span>
          )}
        </div>
      ),
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
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.category) return '-';
        return typeof row.category === 'object' ? row.category.name : row.category;
      },
    },
    {
      id: 'recipient',
      accessorKey: 'recipient',
      header: 'Recipient',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (row.recipient && typeof row.recipient === 'object' && row.recipient.name) ? row.recipient.name : (row.vendor || '—'),
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
      id: 'referenceNumber',
      accessorKey: 'referenceNumber',
      header: 'Reference',
      type: 'text',
      searchable: true,
    },
    {
      id: 'notes',
      accessorKey: 'notes',
      header: 'Notes',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-xs">
          {row.notes || '-'}
        </span>
      ),
    },
  ], []);

  // Define actions for Expense DataTable
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
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleEditExpense(row);
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
          handleDeleteExpense(row);
        }}
        disabled={deletingExpenseId === row._id}
      >
        <Trash2 className="h-4 w-4" />
        {deletingExpenseId === row._id ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  ), [deletingExpenseId, router]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Finance</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage finance categories, income, expenses and view summary.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/app/finance/categories" className="gap-2">
              <Tag className="h-4 w-4" />
              Categories
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app/finance/tracking" className="gap-2">
              <Activity className="h-4 w-4" />
              Income & Expense Tracking
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              try {
                await Promise.all([
                  fetchSummary(),
                  fetchCategories(),
                  fetchIncomes(),
                  fetchExpenses(),
                ]);
                showSuccess('Finance data refreshed.');
              } catch {
                // error already handled in individual fetchers
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

      <div className="flex gap-2 border-b border-border">
        <Button
          variant={activeTab === 'summary' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </Button>
        <Button
          variant={activeTab === 'categories' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </Button>
        <Button
          variant={activeTab === 'income' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('income')}
        >
          Income
        </Button>
        <Button
          variant={activeTab === 'expense' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('expense')}
        >
          Expense
        </Button>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={summaryFilters.startDate}
                  onChange={(e) =>
                    setSummaryFilters((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={summaryFilters.endDate}
                  onChange={(e) =>
                    setSummaryFilters((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={fetchSummary}
                  className="w-full"
                  disabled={loading}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {summaryCards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="text-sm text-muted-foreground">
                    {card.label}
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      card.className || ''
                    }`}
                  >
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {summary?.incomeByCategory?.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">
                Income by Category
              </h2>
              <div className="space-y-2">
                {summary.incomeByCategory.map((item) => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {item.categoryName}
                      </div>
                      <div className="text-muted-foreground">
                        {item.count} records
                      </div>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(item.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary?.expenseByCategory?.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">
                Expenses by Category
              </h2>
              <div className="space-y-2">
                {summary.expenseByCategory.map((item) => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {item.categoryName}
                      </div>
                      <div className="text-muted-foreground">
                        {item.count} records
                      </div>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(item.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Server-side Filters */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <select
                value={categoryFilters.type}
                onChange={(e) =>
                  setCategoryFilters((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="both">Both</option>
              </select>
              <select
                value={categoryFilters.isActive}
                onChange={(e) =>
                  setCategoryFilters((prev) => ({
                    ...prev,
                    isActive: e.target.value,
                  }))
                }
                className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <Button onClick={fetchCategories} variant="outline">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <form
            onSubmit={handleSaveCategory}
            className="bg-card border border-border rounded-lg p-4 space-y-3"
          >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h2>
                {editingCategory && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={resetCategoryForm}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Name
                  </label>
                  <Input
                    name="name"
                    value={categoryForm.name}
                    onChange={handleCategoryChange}
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type
                  </label>
                  <select
                    name="type"
                    value={categoryForm.type}
                    onChange={handleCategoryChange}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={!!categoryForm.isActive}
                      onChange={handleCategoryChange}
                      className="h-4 w-4"
                    />
                    Active
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={categoryForm.description}
                  onChange={handleCategoryChange}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Short description (optional)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCategoryForm}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={savingCategory}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingCategory
                    ? 'Saving...'
                    : editingCategory
                    ? 'Update Category'
                    : 'Create Category'}
                </Button>
              </div>
            </form>

          {/* Category List - DataTable */}
          <div className="bg-card border border-border rounded-lg p-4">
            <DataTable
              data={categories}
              columns={categoryColumns}
              actions={categoryActions}
              loading={false}
              searchable={true}
              filterable={true}
              sortable={true}
              showColumnVisibility={true}
              showSettings={true}
              storageKey="finance-categories-table"
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50, 100]}
              emptyMessage="No categories found"
              onRowClick={(row) => router.push(`/app/categories/${row._id}`)}
            />
          </div>
        </div>
      )}

      {activeTab === 'income' && (
        <div className="space-y-4">
          {/* Server-side Filters */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <select
                value={incomeFilters.categoryId}
                onChange={(e) =>
                  setIncomeFilters((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Categories</option>
                {incomeCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={incomeFilters.accountId}
                onChange={(e) =>
                  setIncomeFilters((prev) => ({
                    ...prev,
                    accountId: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Student ID"
                value={incomeFilters.studentId}
                onChange={(e) =>
                  setIncomeFilters((prev) => ({
                    ...prev,
                    studentId: e.target.value,
                  }))
                }
              />
              <select
                value={incomeFilters.isCancelled}
                onChange={(e) =>
                  setIncomeFilters((prev) => ({
                    ...prev,
                    isCancelled: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All</option>
                <option value="false">Active</option>
                <option value="true">Cancelled</option>
              </select>
              <Input
                type="date"
                placeholder="Start Date"
                value={incomeFilters.startDate}
                onChange={(e) =>
                  setIncomeFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
              <Input
                type="date"
                placeholder="End Date"
                value={incomeFilters.endDate}
                onChange={(e) =>
                  setIncomeFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
              <Button onClick={fetchIncomes} className="md:col-span-1">
                Apply Filters
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={openIncomeForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Income
            </Button>
          </div>

          <Dialog open={showIncomeModal} onOpenChange={(open) => !open && closeIncomeModal()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingIncome ? 'Edit Income' : 'New Income'}</DialogTitle>
                <DialogDescription>
                  {editingIncome ? 'Update income details and recipient.' : 'Record new income. Optionally add recipient details first.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveIncome} className="space-y-5 mt-2">
                {/* Recipient — top */}
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="haveRecipient" checked={!!incomeForm.haveRecipient} onChange={handleIncomeChange} className="h-4 w-4 rounded border-input" />
                    Have recipient
                  </label>
                  {incomeForm.haveRecipient && (
                    <div className="grid grid-cols-2 gap-3 pl-5">
                      <div className="col-span-2">
                        <Input name="recipient.name" value={(incomeForm.recipient && incomeForm.recipient.name) || ''} onChange={handleIncomeChange} placeholder="Name" className="h-9" />
                      </div>
                      <Input name="recipient.phone" value={(incomeForm.recipient && incomeForm.recipient.phone) || ''} onChange={handleIncomeChange} placeholder="Phone" className="h-9" />
                      <Input name="recipient.email" type="email" value={(incomeForm.recipient && incomeForm.recipient.email) || ''} onChange={handleIncomeChange} placeholder="Email" className="h-9" />
                      <div className="col-span-2">
                        <Input name="recipient.address" value={(incomeForm.recipient && incomeForm.recipient.address) || ''} onChange={handleIncomeChange} placeholder="Address" className="h-9" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Main fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                    <Input name="title" value={incomeForm.title} onChange={handleIncomeChange} placeholder="Income title" required className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Amount *</label>
                    <Input name="amount" type="number" min="0" step="0.01" value={incomeForm.amount} onChange={handleIncomeChange} placeholder="0.00" required className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Date *</label>
                    <Input name="date" type="date" value={incomeForm.date} onChange={handleIncomeChange} className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                    <select name="category" value={incomeForm.category} onChange={handleIncomeChange} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">Select</option>
                      {incomeCategories.map((cat) => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Account</label>
                    <select name="account" value={incomeForm.account} onChange={handleIncomeChange} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">Select</option>
                      {accounts.map((acc) => (
                        <option key={acc._id} value={acc._id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Student ID</label>
                    <Input name="student" value={incomeForm.student} onChange={handleIncomeChange} placeholder="Optional" className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Reference</label>
                    <Input name="referenceNumber" value={incomeForm.referenceNumber} onChange={handleIncomeChange} placeholder="Receipt / ref" className="h-9" />
                  </div>
                  <div className="col-span-2 flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" name="isCancelled" checked={!!incomeForm.isCancelled} onChange={handleIncomeChange} className="h-4 w-4 rounded border-input" />
                      Cancelled
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                    <textarea name="notes" value={incomeForm.notes} onChange={handleIncomeChange} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Optional notes" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" onClick={closeIncomeModal} className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingIncome} className="gap-2">
                    <Save className="h-4 w-4" />
                    {savingIncome ? 'Saving...' : editingIncome ? 'Update Income' : 'Create Income'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Income List - DataTable */}
          <div className="bg-card border border-border rounded-lg p-4">
            <DataTable
              data={incomes}
              columns={incomeColumns}
              actions={incomeActions}
              loading={false}
              searchable={true}
              filterable={true}
              sortable={true}
              showColumnVisibility={true}
              showSettings={true}
              storageKey="finance-incomes-table"
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50, 100]}
              emptyMessage="No income records found"
              onRowClick={(row) => router.push(`/app/incomes/${row._id}`)}
            />
          </div>
        </div>
      )}

      {activeTab === 'expense' && (
        <div className="space-y-4">
          {/* Server-side Filters */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <select
                value={expenseFilters.categoryId}
                onChange={(e) =>
                  setExpenseFilters((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Categories</option>
                {expenseCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Recipient"
                value={expenseFilters.recipient}
                onChange={(e) =>
                  setExpenseFilters((prev) => ({
                    ...prev,
                    recipient: e.target.value,
                  }))
                }
              />
              <select
                value={expenseFilters.accountId}
                onChange={(e) =>
                  setExpenseFilters((prev) => ({
                    ...prev,
                    accountId: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name}
                  </option>
                ))}
              </select>
              <select
                value={expenseFilters.isCancelled}
                onChange={(e) =>
                  setExpenseFilters((prev) => ({
                    ...prev,
                    isCancelled: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">All</option>
                <option value="false">Active</option>
                <option value="true">Cancelled</option>
              </select>
              <Input
                type="date"
                placeholder="Start Date"
                value={expenseFilters.startDate}
                onChange={(e) =>
                  setExpenseFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
              <Input
                type="date"
                placeholder="End Date"
                value={expenseFilters.endDate}
                onChange={(e) =>
                  setExpenseFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
              <Button onClick={fetchExpenses} className="md:col-span-1">
                Apply Filters
              </Button>
            </div>
          </div>

          <form
            onSubmit={handleSaveExpense}
            className="bg-card border border-border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                {editingExpense ? 'Edit Expense' : 'New Expense'}
              </h2>
              {editingExpense && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={resetExpenseForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Title
                </label>
                <Input
                  name="title"
                  value={expenseForm.title}
                  onChange={handleExpenseChange}
                  placeholder="Expense title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Amount
                </label>
                <Input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={handleExpenseChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date
                </label>
                <Input
                  name="date"
                  type="date"
                  value={expenseForm.date}
                  onChange={handleExpenseChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={expenseForm.category}
                  onChange={handleExpenseChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select category</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <input type="checkbox" name="haveRecipient" checked={!!expenseForm.haveRecipient} onChange={handleExpenseChange} className="h-4 w-4 rounded border-input" />
                  Have recipient
                </label>
                {expenseForm.haveRecipient && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pl-4 border-l-2 border-muted">
                    <Input name="recipient.name" value={(expenseForm.recipient && expenseForm.recipient.name) || ''} onChange={handleExpenseChange} placeholder="Recipient name" />
                    <Input name="recipient.phone" value={(expenseForm.recipient && expenseForm.recipient.phone) || ''} onChange={handleExpenseChange} placeholder="Phone" />
                    <Input name="recipient.email" type="email" value={(expenseForm.recipient && expenseForm.recipient.email) || ''} onChange={handleExpenseChange} placeholder="Email" />
                    <Input name="recipient.address" value={(expenseForm.recipient && expenseForm.recipient.address) || ''} onChange={handleExpenseChange} placeholder="Address" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Account
                </label>
                <select
                  name="account"
                  value={expenseForm.account}
                  onChange={handleExpenseChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name}
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
                  value={expenseForm.referenceNumber}
                  onChange={handleExpenseChange}
                  placeholder="Invoice / transaction ID"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="isCancelled"
                    checked={!!expenseForm.isCancelled}
                    onChange={handleExpenseChange}
                    className="h-4 w-4"
                  />
                  Cancelled
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={expenseForm.notes}
                onChange={handleExpenseChange}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Additional details (optional)"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetExpenseForm}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
              <Button
                type="submit"
                disabled={savingExpense}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingExpense
                  ? 'Saving...'
                  : editingExpense
                  ? 'Update Expense'
                  : 'Create Expense'}
              </Button>
            </div>
          </form>

          {/* Expense List - DataTable */}
          <div className="bg-card border border-border rounded-lg p-4">
            <DataTable
              data={expenses}
              columns={expenseColumns}
              actions={expenseActions}
              loading={false}
              searchable={true}
              filterable={true}
              sortable={true}
              showColumnVisibility={true}
              showSettings={true}
              storageKey="finance-expenses-table"
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50, 100]}
              emptyMessage="No expense records found"
              onRowClick={(row) => router.push(`/app/expenses/${row._id}`)}
            />
          </div>
        </div>
      )}
    </div>
  );
}


