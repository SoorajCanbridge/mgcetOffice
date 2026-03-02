'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  ArrowLeft,
  Plus,
  Search,
  RefreshCcw,
  Eye,
  Edit2,
  MoreVertical,
  XCircle,
  Save,
  X,
  Download,
  Filter,
  FileText,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getUploadedImageUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
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

const EMPTY_RECIPIENT = { name: '', phone: '', email: '', address: '' };

const EMPTY_INCOME = {
  title: '',
  amount: '',
  date: formatDateForInput(new Date()),
  category: '',
  account: '',
  student: '',
  referenceNumber: '',
  notes: '',
  files: [],
  isCancelled: false,
  haveRecipient: false,
  recipient: { ...EMPTY_RECIPIENT },
};

export default function FinanceTrackingIncomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    categoryId: searchParams.get('categoryId') || '',
    accountId: '',
    startDate: '',
    endDate: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_INCOME);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const incomeCategories = useMemo(() => categories.filter((c) => c.type === 'income' || c.type === 'both'), [categories]);

  const fetchIncomes = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const res = await api.get(`${FINANCE_BASE}/incomes?${params.toString()}`, {}, true);
      let list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(
          (i) =>
            (i.title || '').toLowerCase().includes(q) ||
            (i.referenceNumber || '').toLowerCase().includes(q) ||
            (i.notes || '').toLowerCase().includes(q) ||
            (i.recipient && typeof i.recipient === 'object' && (i.recipient.name || '').toLowerCase().includes(q))
        );
      }
      setIncomes(list);
    } catch (err) {
      setError(err.message || 'Failed to load income');
    } finally {
      setLoading(false);
    }
  }, [user?.college, filters.categoryId, filters.accountId, filters.startDate, filters.endDate, filters.search]);

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

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

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
    setForm(EMPTY_INCOME);
    setEditingId(null);
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
        fd.append('folder', 'income');
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
        student: form.student || undefined,
        referenceNumber: form.referenceNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        files: Array.isArray(form.files) ? form.files : [],
        isCancelled: !!form.isCancelled,
        ...(hasRecipient ? { recipient: recipientPayload } : {}),
      };
      if (editingId) {
        await api.put(`${FINANCE_BASE}/incomes/${editingId}`, payload, {}, true);
        showSuccess('Income updated.');
      } else {
        await api.post(`${FINANCE_BASE}/incomes`, payload, {}, true);
        showSuccess('Income recorded.');
      }
      resetForm();
      fetchIncomes();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row._id);
    const rec = row.recipient && typeof row.recipient === 'object' ? row.recipient : {};
    const hasRec = !!(rec.name || rec.phone || rec.email || rec.address);
    setForm({
      title: row.title || '',
      amount: row.amount ?? '',
      date: formatDateForInput(row.date),
      category: row.category?._id || row.category || '',
      account: row.account?._id || row.account || '',
      student: row.student?._id || row.student || '',
      referenceNumber: row.referenceNumber || '',
      notes: row.notes || '',
      files: Array.isArray(row.files) ? [...row.files] : [],
      isCancelled: row.isCancelled ?? false,
      haveRecipient: hasRec,
      recipient: { name: rec.name || '', phone: rec.phone || '', email: rec.email || '', address: rec.address || '' },
    });
    setShowForm(true);
  };

  const handleCancel = async (row) => {
    if (!row?._id) return;
    const newCancelled = !row.isCancelled;
    if (!newCancelled && !window.confirm('Restore this income record?')) return;
    if (newCancelled && !window.confirm('Mark this income as cancelled?')) return;
    try {
      setCancellingId(row._id);
      await api.put(`${FINANCE_BASE}/incomes/${row._id}`, { isCancelled: newCancelled }, {}, true);
      showSuccess(newCancelled ? 'Income marked as cancelled.' : 'Income restored.');
      fetchIncomes();
    } catch (err) {
      setError(err.message || 'Failed to update');
    } finally {
      setCancellingId('');
    }
  };

  const exportCsv = () => {
    const headers = ['Title', 'Amount', 'Date', 'Category', 'Account', 'Recipient', 'Reference', 'Notes'];
    const rows = incomes.map((i) => [
      i.title || '',
      i.amount ?? '',
      i.date ? new Date(i.date).toISOString().split('T')[0] : '',
      (i.category && (typeof i.category === 'object' ? i.category.name : i.category)) || '',
      (i.account && (typeof i.account === 'object' ? i.account.name : i.account)) || '',
      (i.recipient && typeof i.recipient === 'object' ? i.recipient.name : '') || '',
      i.referenceNumber || '',
      (i.notes || '').replace(/"/g, '""'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c)}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `income-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const columns = useMemo(
    () => [
      { id: 'title', accessorKey: 'title', header: 'Title', type: 'text', searchable: true, cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="font-medium">{row.title || 'Untitled'}</span>
          {row.isCancelled && <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Cancelled</span>}
        </span>
      ) },
      { id: 'amount', accessorKey: 'amount', header: 'Amount', type: 'currency', formatOptions: { locale: 'en-IN', currency: 'INR' }, cell: ({ row }) => <span className="text-emerald-600 font-medium">{formatCurrency(row.amount)}</span> },
      { id: 'date', accessorKey: 'date', header: 'Date', type: 'date', formatOptions: { locale: 'en-IN' } },
      { id: 'category', accessorKey: 'category', header: 'Category', type: 'text', cell: ({ row }) => (row.category ? (typeof row.category === 'object' ? row.category.name : row.category) : '—') },
      { id: 'account', accessorKey: 'account', header: 'Account', type: 'text', cell: ({ row }) => (row.account ? (typeof row.account === 'object' ? row.account.name : row.account) : '—') },
      { id: 'recipient', accessorKey: 'recipient', header: 'Recipient', type: 'text', cell: ({ row }) => (row.recipient && typeof row.recipient === 'object' && row.recipient.name) ? row.recipient.name : '—' },
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
          <DropdownMenuItem onClick={() => router.push(`/app/incomes/${row._id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEdit(row)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleCancel(row)}
            disabled={cancellingId === row._id}
            className={row.isCancelled ? 'text-emerald-600' : ''}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {row.isCancelled ? 'Restore' : 'Cancel'}
          </DropdownMenuItem>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Income Tracking</h1>
            <p className="text-sm text-muted-foreground">Record and manage income entries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Income
          </Button>
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
            {incomeCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.accountId} onChange={(e) => setFilters((p) => ({ ...p, accountId: e.target.value }))}>
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <Input type="date" className="h-9" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} />
          <Input type="date" className="h-9" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} />
          <Button variant="secondary" size="sm" onClick={fetchIncomes}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Apply
          </Button>
        </div>
      </div>

      {/* Income form modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Income' : 'New Income'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update income details and recipient.' : 'Record new income. Optionally add recipient details first.'}
            </DialogDescription>
          </DialogHeader>
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
                <Input name="title" value={form.title} onChange={handleFormChange} placeholder="Income title" required className="h-9" />
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
                  {incomeCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
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
                {saving ? 'Saving...' : editingId ? 'Update Income' : 'Create Income'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataTable
          data={incomes}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          filterable
          sortable
          showColumnVisibility
          storageKey="finance-tracking-income"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          emptyMessage="No income records found"
          onRowClick={(row) => router.push(`/app/incomes/${row._id}`)}
        />
      </div>
    </div>
  );
}
