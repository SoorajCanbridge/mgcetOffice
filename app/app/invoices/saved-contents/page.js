'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCcw,
  Search,
  User,
  Receipt,
  DollarSign,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const SAVED_CONTENT_BASE = '/finance/saved-invoice-contents';

const EMPTY_CONTENT = {
  name: '',
  description: '',
  billTo: {
    name: '',
    address: '',
    email: '',
    phone: '',
  },
  items: [],
  taxCalculationMethod: 'total', // 'product' or 'total'
  taxRate: 0,
  discount: 0,
  notes: '',
  terms: '',
  isActive: true,
};

export default function SavedInvoiceContentsPage() {
  const { user } = useAuth();

  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingContent, setEditingContent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const [contentForm, setContentForm] = useState(EMPTY_CONTENT);

  const fetchContents = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filterActive !== '') {
        params.append('isActive', filterActive);
      }

      const response = await api.get(
        `${SAVED_CONTENT_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      let list = Array.isArray(data) ? data : [];

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        list = list.filter(
          (c) =>
            c.name?.toLowerCase().includes(term) ||
            c.description?.toLowerCase().includes(term),
        );
      }

      setContents(list);
    } catch (err) {
      setError(err.message || 'Failed to load saved fees');
    } finally {
      setLoading(false);
    }
  }, [user?.college, filterActive, searchTerm]);

  useEffect(() => {
    if (!user?.college) return;
    fetchContents();
  }, [user?.college, fetchContents]);

  const resetForm = useCallback(() => {
    setContentForm(EMPTY_CONTENT);
    setEditingContent(null);
    setShowForm(false);
  }, []);

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('billTo.')) {
      const field = name.split('.')[1];
      setContentForm((prev) => ({
        ...prev,
        billTo: {
          ...prev.billTo,
          [field]: value,
        },
      }));
    } else {
      setContentForm((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setContentForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
      // Recalculate amount if quantity or unitPrice changes
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = Number(newItems[index].quantity || 0);
        const unitPrice = Number(newItems[index].unitPrice || 0);
        newItems[index].amount = quantity * unitPrice;
        
        // Recalculate item tax if using product-level tax
        if (prev.taxCalculationMethod === 'product' && newItems[index].taxRate) {
          const itemAmount = newItems[index].amount;
          const itemTaxRate = Number(newItems[index].taxRate) || 0;
          newItems[index].taxAmount = (itemAmount * itemTaxRate) / 100;
        }
      }
      // Recalculate item taxAmount if taxRate changes (product-level tax)
      if (field === 'taxRate' && prev.taxCalculationMethod === 'product') {
        const itemAmount = Number(newItems[index].amount) || 0;
        const itemTaxRate = Number(value) || 0;
        newItems[index].taxAmount = (itemAmount * itemTaxRate) / 100;
      }
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setContentForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          taxRate: prev.taxCalculationMethod === 'product' ? (prev.taxRate || 0) : 0,
          taxAmount: 0,
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setContentForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSaveContent = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: contentForm.name.trim(),
        description: contentForm.description.trim() || undefined,
        billTo: contentForm.billTo,
        items: contentForm.items.filter(
          (item) => item.description && item.amount > 0,
        ).map(item => ({
          ...item,
          taxRate: contentForm.taxCalculationMethod === 'product' ? (Number(item.taxRate) || 0) : 0,
          taxAmount: contentForm.taxCalculationMethod === 'product' ? (Number(item.taxAmount) || 0) : 0,
        })),
        taxCalculationMethod: contentForm.taxCalculationMethod || 'total',
        taxRate: Number(contentForm.taxRate) || 0,
        discount: Number(contentForm.discount) || 0,
        notes: contentForm.notes.trim() || undefined,
        terms: contentForm.terms.trim() || undefined,
        isActive: !!contentForm.isActive,
      };

      if (editingContent?._id) {
        await api.put(
          `${SAVED_CONTENT_BASE}/${editingContent._id}`,
          payload,
          {},
          true,
        );
        showSuccess('Fees updated successfully.');
      } else {
        await api.post(`${SAVED_CONTENT_BASE}`, payload, {}, true);
        showSuccess('Fees created successfully.');
      }
      resetForm();
      await fetchContents();
    } catch (err) {
      setError(err.message || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleEditContent = (content) => {
    setEditingContent(content);
    setContentForm({
      name: content.name || '',
      description: content.description || '',
      billTo: content.billTo || {
        name: '',
        address: '',
        email: '',
        phone: '',
      },
      items: (content.items || []).map(item => ({
        ...item,
        taxRate: item.taxRate || 0,
        taxAmount: item.taxAmount || 0,
      })),
      taxCalculationMethod: content.taxCalculationMethod || 'total',
      taxRate: content.taxRate || 0,
      discount: content.discount || 0,
      notes: content.notes || '',
      terms: content.terms || '',
      isActive: content.isActive ?? true,
    });
    setShowForm(true);
  };

  const handleDeleteContent = async (content) => {
    if (!content?._id) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Delete this fee?')
        : true;
    if (!confirmed) return;
    try {
      setDeletingId(content._id);
      setError('');
      await api.delete(`${SAVED_CONTENT_BASE}/${content._id}`, {}, true);
      showSuccess('Fees deleted.');
      await fetchContents();
    } catch (err) {
      setError(err.message || 'Failed to delete content');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Saved Fees</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Create and manage reusable fees with pre-filled content.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchContents}
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
            New Fees
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

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search saved fees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Form in modal */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="flex flex-col p-0 gap-0 max-w-4xl max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-border bg-muted/20">
            <DialogTitle className="text-xl font-semibold">
              {editingContent ? 'Edit Fees' : 'New Fees'}
            </DialogTitle>
            <DialogDescription className="mt-0.5">
              {editingContent ? 'Update fee structure and line items' : 'Create a reusable fee structure with line items and tax settings.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveContent} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Fees details */}
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Fees Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fees Name *</label>
                <Input
                  name="name"
                  value={contentForm.name}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g., Tuition Fees"
                  className="h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={!!contentForm.isActive}
                    onChange={handleFormChange}
                    className="h-4 w-4"
                  />
                  Active
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                <Input
                  name="description"
                  value={contentForm.description}
                  onChange={handleFormChange}
                  placeholder="Brief description of this fee structure"
                  className="h-9"
                />
              </div>
            </div>
          </section>

          {/* Bill To */}
          {/* <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Bill To</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label>
                <Input
                  name="billTo.name"
                  value={contentForm.billTo.name}
                  onChange={handleFormChange}
                  placeholder="Customer name"
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <Input
                  name="billTo.email"
                  type="email"
                  value={contentForm.billTo.email}
                  onChange={handleFormChange}
                  placeholder="customer@example.com"
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone</label>
                <Input
                  name="billTo.phone"
                  value={contentForm.billTo.phone}
                  onChange={handleFormChange}
                  placeholder="Phone number"
                  className="h-9"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Address</label>
                <textarea
                  name="billTo.address"
                  value={contentForm.billTo.address}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]"
                  placeholder="Full address"
                />
              </div>
            </div>
          </section> */}

          {/* Line Items */}
          <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold">Line Items</h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {contentForm.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-end p-3 border border-border rounded-lg bg-background/50"
                >
                  <div className={contentForm.taxCalculationMethod === 'product' ? 'col-span-4' : 'col-span-5'}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Qty</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Price</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount || 0}
                      readOnly
                      className="h-9 bg-muted"
                    />
                  </div>
                  {contentForm.taxCalculationMethod === 'product' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Tax %</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max="100"
                        value={item.taxRate || 0}
                        onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  )}
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {contentForm.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-muted/20">
                  <Receipt className="h-10 w-10 text-muted-foreground mb-2 opacity-60" />
                  <p className="text-sm font-medium text-muted-foreground">No line items yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add at least one item.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Tax & Totals */}
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Tax & Totals</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Tax Calculation Method</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="taxCalculationMethod"
                      value="total"
                      checked={contentForm.taxCalculationMethod === 'total'}
                      onChange={(e) => {
                        setContentForm((prev) => ({
                          ...prev,
                          taxCalculationMethod: e.target.value,
                          items: prev.items.map(item => ({ ...item, taxRate: 0, taxAmount: 0 })),
                        }));
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Total-Level Tax</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="taxCalculationMethod"
                      value="product"
                      checked={contentForm.taxCalculationMethod === 'product'}
                      onChange={(e) => {
                        setContentForm((prev) => ({
                          ...prev,
                          taxCalculationMethod: e.target.value,
                          items: prev.items.map(item => ({
                            ...item,
                            taxRate: item.taxRate || prev.taxRate || 0,
                            taxAmount: item.amount ? ((item.amount * (item.taxRate || prev.taxRate || 0)) / 100) : 0,
                          })),
                        }));
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Product-Level Tax</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {contentForm.taxCalculationMethod === 'total'
                    ? 'Tax calculated on total subtotal'
                    : 'Tax calculated per item'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contentForm.taxCalculationMethod === 'total' && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tax Rate (%)</label>
                    <Input
                      name="taxRate"
                      type="number"
                      min="0"
                      step="0.01"
                      max="100"
                      value={contentForm.taxRate}
                      onChange={handleFormChange}
                      className="h-9"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Discount</label>
                  <Input
                    name="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={contentForm.discount}
                    onChange={handleFormChange}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Notes & Terms */}
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Notes & Terms</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
                <textarea
                  name="notes"
                  value={contentForm.notes}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]"
                  placeholder="Additional notes"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Terms</label>
                <textarea
                  name="terms"
                  value={contentForm.terms}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]"
                  placeholder="Payment terms and conditions"
                />
              </div>
            </div>
          </section>

            </div>
            <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex-shrink-0 gap-3">
              <Button type="button" variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : editingContent ? 'Update Fees' : 'Create Fees'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Content List */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Saved Fees</h2>
          <span className="text-sm text-muted-foreground">
            {contents.length} fees
          </span>
        </div>
        {loading && contents.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Loading fees...
          </div>
        ) : contents.length === 0 ? (
          <div className="p-6 text-muted-foreground">
            No saved fees found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contents.map((content) => (
              <div
                key={content._id}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {content.name}
                    </span>
                    {!content.isActive && (
                      <span className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  {content.description && (
                    <p className="text-sm text-muted-foreground">
                      {content.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {content.items?.length || 0} items • Tax Method:{' '}
                    {content.taxCalculationMethod === 'product' ? 'Product-Level' : 'Total-Level'}
                    {content.taxCalculationMethod === 'total' && ` • Tax Rate: ${content.taxRate || 0}%`}
                    {' • Discount: '}
                    {content.discount || 0}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleEditContent(content)}
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleDeleteContent(content)}
                    disabled={deletingId === content._id}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === content._id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

