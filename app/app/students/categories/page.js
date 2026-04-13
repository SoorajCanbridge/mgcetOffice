'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bookmark, Plus, Edit2, Trash2, Save, RefreshCcw, Search, Filter, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';
import { DataTable } from '@/components/data-table';

const API_BASE = '/student-categories';

const EMPTY = {
  name: '',
  description: '',
  isActive: true,
};

const normalizeCollegeId = (college) => {
  if (!college) return '';
  if (typeof college === 'object') return college._id || college.id || '';
  return String(college);
};

export default function StudentCategoriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({ search: '', isActive: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const collegeId = normalizeCollegeId(user?.college);

  const fetchRows = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (collegeId) params.append('collegeId', collegeId);
      if (filters.isActive !== '') params.append('isActive', filters.isActive);
      const q = params.toString();
      const res = await api.get(`${API_BASE}${q ? `?${q}` : ''}`, {}, true);
      let list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(
          (r) =>
            (r.name || '').toLowerCase().includes(s) ||
            (r.description || '').toLowerCase().includes(s),
        );
      }
      setRows(list);
    } catch (err) {
      setError(err.message || 'Failed to load student categories');
    } finally {
      setLoading(false);
    }
  }, [user?.college, collegeId, filters.isActive, filters.search]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const closeDialog = () => {
    setForm(EMPTY);
    setEditingId(null);
    setDialogOpen(false);
  };

  const openNewDialog = () => {
    setForm(EMPTY);
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isActive: !!form.isActive,
        college: collegeId || undefined,
      };
      if (editingId) {
        await api.put(`${API_BASE}/${editingId}`, payload, {}, true);
        showSuccess('Category updated.');
      } else {
        await api.post(API_BASE, payload, {}, true);
        showSuccess('Category created.');
      }
      closeDialog();
      fetchRows();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = useCallback((row) => {
    setEditingId(row._id);
    setForm({
      name: row.name || '',
      description: row.description || '',
      isActive: row.isActive ?? true,
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (row) => {
    if (!row?._id || !window.confirm('Delete this student category? Linked students may need to be updated.')) return;
    try {
      setDeletingId(row._id);
      await api.delete(`${API_BASE}/${row._id}`, {}, true);
      showSuccess('Category deleted.');
      fetchRows();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    } finally {
      setDeletingId('');
    }
  }, [fetchRows]);

  const goToDetail = useCallback(
    (row) => {
      if (row?._id) router.push(`/app/students/categories/${row._id}`);
    },
    [router],
  );

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        type: 'text',
        searchable: true,
        cell: ({ row }) => <span className="font-medium">{row.name || '—'}</span>,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        type: 'text',
        searchable: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm truncate max-w-md block">{row.description || '—'}</span>
        ),
      },
      {
        id: 'isActive',
        accessorKey: 'isActive',
        header: 'Status',
        type: 'boolean',
        cell: ({ row }) => (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              row.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
            }`}
          >
            {row.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
    ],
    [],
  );

  const actions = useCallback(
    (row) => (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            goToDetail(row);
          }}
          className="gap-1"
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
        <PermissionGate moduleKey="students" action="edit">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </PermissionGate>
        <PermissionGate moduleKey="students" action="delete">
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            disabled={deletingId === row._id}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </PermissionGate>
      </div>
    ),
    [deletingId, goToDetail, handleEdit, handleDelete],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bookmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Student categories</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Labels such as scholarship type, stream, or admission batch for students
              </p>
            </div>
          </div>
        </div>
        <PermissionGate moduleKey="students" action="create">
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add category
          </Button>
        </PermissionGate>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or description..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              className="pl-8 h-9"
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.isActive}
            onChange={(e) => setFilters((p) => ({ ...p, isActive: e.target.value }))}
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <Button variant="secondary" size="sm" onClick={fetchRows} className="w-fit">
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
          else setDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the name, description, or active status.' : 'Create a category to assign when registering or editing students.'}
            </DialogDescription>
          </DialogHeader>
          <form id="student-category-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name *</label>
              <Input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Merit scholarship" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <Input name="description" value={form.description} onChange={handleFormChange} placeholder="Optional" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cat-active-modal"
                name="isActive"
                checked={!!form.isActive}
                onChange={handleFormChange}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="cat-active-modal" className="text-sm font-medium">
                Active
              </label>
            </div>
          </form>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" form="student-category-form" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold">All categories</h2>
          <span className="text-sm text-muted-foreground">
            {rows.length} categor{rows.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable
          filterable
          sortable
          showColumnVisibility
          storageKey="student-categories-table"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50]}
          emptyMessage="No student categories yet. Add one to use it when registering students."
          onRowClick={(row) => goToDetail(row)}
        />
      </div>
    </div>
  );
}
