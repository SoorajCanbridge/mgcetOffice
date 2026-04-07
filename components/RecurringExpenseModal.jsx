'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Save, X, Repeat, FileText } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getUploadedImageUrl } from '@/lib/utils';
import PermissionGate from '@/components/PermissionGate';

const RECURRING_BASE = '/finance/recurring-expenses';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const EMPTY_RECIPIENT = { name: '', phone: '', email: '', address: '' };

const emptyForm = () => ({
  title: '',
  amount: '',
  category: '',
  account: '',
  vendor: '',
  referenceNumber: '',
  notes: '',
  files: [],
  frequency: 'monthly',
  interval: '1',
  startDate: formatDateForInput(new Date()),
  endDate: '',
  nextDueDate: formatDateForInput(new Date()),
  isActive: true,
  haveRecipient: false,
  recipient: { ...EMPTY_RECIPIENT },
});

const addIntervalToDateInput = (dateInput, frequency, intervalNum) => {
  if (!dateInput) return '';
  const base = new Date(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return '';
  if (!Number.isFinite(intervalNum) || intervalNum < 1) return '';

  const next = new Date(base.getTime());
  const addUtcMonthsWithClamp = (monthsToAdd) => {
    const y = next.getUTCFullYear();
    const m = next.getUTCMonth();
    const day = next.getUTCDate();
    const targetMonthIndex = m + monthsToAdd;
    const targetYear = y + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const clamped = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
    return clamped.toISOString().split('T')[0];
  };

  switch (frequency) {
    case 'daily':
      next.setUTCDate(next.getUTCDate() + intervalNum);
      break;
    case 'weekly':
      next.setUTCDate(next.getUTCDate() + intervalNum * 7);
      break;
    case 'monthly':
      return addUtcMonthsWithClamp(intervalNum);
    case 'yearly':
      return addUtcMonthsWithClamp(intervalNum * 12);
    default:
      return '';
  }

  return next.toISOString().split('T')[0];
};

/**
 * Dialog to create and edit recurring expense schedules (backed by /finance/recurring-expenses).
 *
 * The schedules list (saved schedules) is rendered on the finance tracking page, not inside this modal.
 */
export default function RecurringExpenseModal({ open, onOpenChange, expenseCategories, accounts, editingSchedule, onSaved }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const [manualNextDue, setManualNextDue] = useState(false);
  const [manualEndDate, setManualEndDate] = useState(false);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const resetForm = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setManualNextDue(false);
    setManualEndDate(false);
  }, []);

  const populateFormFromSchedule = useCallback((row) => {
    const rec = row?.recipient && typeof row.recipient === 'object' ? row.recipient : {};
    const hasRec = !!(rec.name || rec.phone || rec.email || rec.address);

    setEditingId(row?._id ?? null);
    // Keep values from backend while editing; auto-calc only resumes when user changes
    // frequency/interval/start date.
    setManualNextDue(true);
    setManualEndDate(true);
    setForm({
      title: row?.title || '',
      amount: row?.amount ?? '',
      category: row?.category?._id || row?.category || '',
      account: row?.account?._id || row?.account || '',
      vendor: row?.vendor || '',
      referenceNumber: row?.referenceNumber || '',
      notes: row?.notes || '',
      files: Array.isArray(row?.files) ? [...row.files] : [],
      frequency: row?.frequency || 'monthly',
      interval: String(row?.interval ?? 1),
      startDate: formatDateForInput(row?.startDate),
      endDate: formatDateForInput(row?.endDate),
      nextDueDate: formatDateForInput(row?.nextDueDate),
      isActive: row?.isActive !== false,
      haveRecipient: hasRec,
      recipient: {
        name: rec.name || '',
        phone: rec.phone || '',
        email: rec.email || '',
        address: rec.address || '',
      },
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editingSchedule && editingSchedule._id) {
      populateFormFromSchedule(editingSchedule);
    } else {
      resetForm();
    }
  }, [open, editingSchedule, populateFormFromSchedule, resetForm]);

  // Auto-calculate next due date and (optionally) end date from start date.
  // User manual edits to `nextDueDate`/`endDate` temporarily stop auto-updating until
  // frequency/interval/start date changes again.
  useEffect(() => {
    if (!open) return;
    const intervalNum = form.interval !== '' ? parseInt(form.interval, 10) : NaN;
    if (!form.startDate || !form.frequency || !Number.isFinite(intervalNum) || intervalNum < 1) return;

    const computedNextDue = addIntervalToDateInput(form.startDate, form.frequency, intervalNum);
    if (!computedNextDue) return;

    setForm((prev) => {
      const updates = {};
      if (!manualNextDue && prev.nextDueDate !== computedNextDue) updates.nextDueDate = computedNextDue;
      // If user hasn't manually edited end date, keep it in sync with the computed cycle end.
      if (!manualEndDate && prev.endDate !== computedNextDue) updates.endDate = computedNextDue;
      const changed = Object.keys(updates).length > 0;
      return changed ? { ...prev, ...updates } : prev;
    });
  }, [open, form.startDate, form.frequency, form.interval, manualNextDue, manualEndDate]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (['frequency', 'interval', 'startDate'].includes(name)) {
      setManualNextDue(false);
      setManualEndDate(false);
    }
    if (name === 'nextDueDate') setManualNextDue(true);
    if (name === 'endDate') setManualEndDate(true);
    if (name === 'haveRecipient') {
      setForm((prev) => ({
        ...prev,
        haveRecipient: checked,
        recipient: checked ? { ...prev.recipient } : { ...EMPTY_RECIPIENT },
      }));
      return;
    }
    if (name === 'isActive') {
      setForm((prev) => ({ ...prev, isActive: checked }));
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
    setForm((prev) => ({ ...prev, [name]: value }));
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
        fd.append('folder', 'expense');
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
      const hasRecipient =
        recipientPayload &&
        (recipientPayload.name ||
          recipientPayload.phone ||
          recipientPayload.email ||
          recipientPayload.address);

      const intervalNum = form.interval !== '' ? parseInt(form.interval, 10) : 1;
      const payload = {
        title: form.title.trim(),
        amount: form.amount !== '' ? Number(form.amount) : undefined,
        category: form.category || undefined,
        account: form.account || undefined,
        vendor: (form.vendor || '').trim() || undefined,
        referenceNumber: (form.referenceNumber || '').trim() || undefined,
        notes: (form.notes || '').trim() || undefined,
        files: Array.isArray(form.files) ? form.files : [],
        frequency: form.frequency,
        interval: Number.isFinite(intervalNum) && intervalNum >= 1 ? intervalNum : 1,
        startDate: form.startDate || undefined,
        endDate: form.endDate?.trim() ? form.endDate : undefined,
        nextDueDate: form.nextDueDate || undefined,
        isActive: !!form.isActive,
        ...(hasRecipient ? { recipient: recipientPayload } : {}),
      };

      if (editingId) {
        await api.put(`${RECURRING_BASE}/${editingId}`, payload, {}, true);
        showSuccess('Recurring expense updated.');
      } else {
        await api.post(`${RECURRING_BASE}`, payload, {}, true);
        showSuccess('Recurring expense created.');
      }
      resetForm();
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-muted-foreground" />
            Recurring expenses
          </DialogTitle>
          <DialogDescription>
            Schedules for repeating costs. Use next due date for when the next expense should be recorded (e.g. by a job or manual entry).
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">{success}</div>
        )}

        <PermissionGate moduleKey="finance" action="edit">
          <form onSubmit={handleSave} className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
            <div className="text-sm font-medium">{editingId ? 'Edit schedule' : 'New schedule'}</div>

            <div className="space-y-3 rounded-lg border border-border bg-background/80 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="haveRecipient"
                  checked={!!form.haveRecipient}
                  onChange={handleFormChange}
                  className="h-4 w-4 rounded border-input"
                />
                Recipient / payee
              </label>
              {form.haveRecipient && (
                <div className="grid grid-cols-2 gap-2 pl-5">
                  <div className="col-span-2">
                    <Input
                      name="recipient.name"
                      value={(form.recipient && form.recipient.name) || ''}
                      onChange={handleFormChange}
                      placeholder="Name"
                      className="h-9"
                    />
                  </div>
                  <Input
                    name="recipient.phone"
                    value={(form.recipient && form.recipient.phone) || ''}
                    onChange={handleFormChange}
                    placeholder="Phone"
                    className="h-9"
                  />
                  <Input
                    name="recipient.email"
                    type="email"
                    value={(form.recipient && form.recipient.email) || ''}
                    onChange={handleFormChange}
                    placeholder="Email"
                    className="h-9"
                  />
                  <div className="col-span-2">
                    <Input
                      name="recipient.address"
                      value={(form.recipient && form.recipient.address) || ''}
                      onChange={handleFormChange}
                      placeholder="Address"
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                <Input name="title" value={form.title} onChange={handleFormChange} placeholder="e.g. Rent" required className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount *</label>
                <Input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={handleFormChange}
                  required
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Vendor</label>
                <Input name="vendor" value={form.vendor} onChange={handleFormChange} className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Category *</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select</option>
                  {expenseCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Account *</label>
                <select
                  name="account"
                  value={form.account}
                  onChange={handleFormChange}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Frequency *</label>
                <select
                  name="frequency"
                  value={form.frequency}
                  onChange={handleFormChange}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {FREQUENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Every (interval)</label>
                <Input name="interval" type="number" min="1" step="1" value={form.interval} onChange={handleFormChange} className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Start date *</label>
                <Input name="startDate" type="date" value={form.startDate} onChange={handleFormChange} required className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">End date (auto)</label>
                <Input name="endDate" type="date" value={form.endDate} onChange={handleFormChange} className="h-9" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Next due *</label>
                <Input name="nextDueDate" type="date" value={form.nextDueDate} onChange={handleFormChange} required className="h-9" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reference</label>
                <Input name="referenceNumber" value={form.referenceNumber} onChange={handleFormChange} className="h-9" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <Input name="notes" value={form.notes} onChange={handleFormChange} className="h-9" />
              </div>
            </div>

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
                      <a
                        href={getUploadedImageUrl(path, API_URL)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-[200px]"
                      >
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm} className="gap-2">
                <X className="h-4 w-4" />
                {editingId ? 'Cancel edit' : 'Clear'}
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </PermissionGate>
      </DialogContent>
    </Dialog>
  );
}
