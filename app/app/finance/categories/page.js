'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCcw,
  Search,
  Filter,
  Eye,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const FINANCE_BASE = '/finance';

const EMPTY_CATEGORY = {
  name: '',
  type: 'income',
  description: '',
  isActive: true,
};

const formatCurrency = (value) => {
  if (value == null || (value !== 0 && !value)) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  } catch {
    return String(value);
  }
};

export default function FinanceCategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({ search: '', type: '', isActive: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const fetchCategories = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.isActive !== '') params.append('isActive', filters.isActive);
      const res = await api.get(`${FINANCE_BASE}/categories?${params.toString()}`, {}, true);
      let list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (c) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q)
        );
      }
      setCategories(list);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [user?.college, filters.type, filters.isActive, filters.search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const editIdFromUrl = searchParams.get('edit');
  useEffect(() => {
    if (!editIdFromUrl || !categories.length) return;
    const cat = categories.find((c) => c._id === editIdFromUrl);
    if (cat) {
      setEditingId(cat._id);
      setForm({
        name: cat.name || '',
        type: cat.type || 'income',
        description: cat.description || '',
        isActive: cat.isActive ?? true,
      });
      setShowForm(true);
      router.replace('/app/finance/categories', { scroll: false });
    }
  }, [editIdFromUrl, categories, router]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setForm(EMPTY_CATEGORY);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim() || undefined,
        isActive: !!form.isActive,
      };
      if (editingId) {
        await api.put(`${FINANCE_BASE}/categories/${editingId}`, payload, {}, true);
        showSuccess('Category updated.');
      } else {
        await api.post(`${FINANCE_BASE}/categories`, payload, {}, true);
        showSuccess('Category created.');
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row._id);
    setForm({
      name: row.name || '',
      type: row.type || 'income',
      description: row.description || '',
      isActive: row.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleDelete = async (row) => {
    if (!row?._id || !window.confirm('Delete this category? This may affect existing income/expense records linked to it.')) return;
    try {
      setDeletingId(row._id);
      await api.delete(`${FINANCE_BASE}/categories/${row._id}`, {}, true);
      showSuccess('Category deleted.');
      fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    } finally {
      setDeletingId('');
    }
  };

  const stats = useMemo(() => {
    const total = categories.length;
    const income = categories.filter((c) => c.type === 'income').length;
    const expense = categories.filter((c) => c.type === 'expense').length;
    const both = categories.filter((c) => c.type === 'both').length;
    return { total, income, expense, both };
  }, [categories]);

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Category Name',
        type: 'text',
        searchable: true,
        cell: ({ row }) => <span className="font-medium">{row.name || '—'}</span>,
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: 'Type',
        type: 'text',
        filterable: true,
        cell: ({ row }) => {
          const t = row.type || 'income';
          const isIncome = t === 'income';
          const isBoth = t === 'both';
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                isBoth ? 'bg-primary/10 text-primary' : isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {isBoth ? <Layers className="h-3 w-3" /> : isIncome ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {t}
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
        cell: ({ row }) => <span className="text-muted-foreground text-sm truncate max-w-xs block">{row.description || '—'}</span>,
      },
      {
        id: 'isActive',
        accessorKey: 'isActive',
        header: 'Status',
        type: 'boolean',
        cell: ({ row }) => (
          <span className={`text-xs px-2 py-1 rounded-full ${row.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
            {row.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
    ],
    []
  );

  const actions = useCallback(
    (row) => (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/app/finance/categories/${row._id}`); }}>
          <Eye className="h-4 w-4 mr-1" /> View
        </Button>
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(row); }} disabled={deletingId === row._id}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
    [deletingId, router]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Finance Categories</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Manage income and expense categories for tracking and reporting
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">{success}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Categories</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm font-medium text-muted-foreground">Income</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.income}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-muted-foreground">Expense</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.expense}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-muted-foreground">Both</p>
          <p className="text-2xl font-bold text-primary mt-1">{stats.both}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or description..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} className="pl-8 h-9" />
          </div>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="both">Both</option>
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.isActive} onChange={(e) => setFilters((p) => ({ ...p, isActive: e.target.value }))}>
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <Button variant="secondary" size="sm" onClick={fetchCategories}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Apply
          </Button>
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Category' : 'New Category'}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name *</label>
                <Input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Tuition Fee" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select name="type" value={form.type} onChange={handleFormChange} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <Input name="description" value={form.description} onChange={handleFormChange} placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="cat-active" name="isActive" checked={!!form.isActive} onChange={handleFormChange} className="h-4 w-4 rounded border-input" />
                <label htmlFor="cat-active" className="text-sm font-medium">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              <Button type="submit" disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Categories table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold">All Categories</h2>
          <span className="text-sm text-muted-foreground">{categories.length} category{categories.length !== 1 ? 'ies' : ''}</span>
        </div>
        <DataTable
          data={categories}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          filterable
          sortable
          showColumnVisibility
          storageKey="finance-categories-table"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          emptyMessage="No categories found. Add one to organize income and expenses."
          onRowClick={(row) => router.push(`/app/finance/categories/${row._id}`)}
        />
      </div>
    </div>
  );
}
