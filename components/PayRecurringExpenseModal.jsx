'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreditCard, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

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

const PAYMENT_STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

export default function PayRecurringExpenseModal({
  open,
  onOpenChange,
  recurring,
  accounts = [],
  onPaid,
}) {
  const [account, setAccount] = useState('');
  const [paymentDate, setPaymentDate] = useState(formatDateForInput(new Date()));
  const [paymentBy, setPaymentBy] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('completed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAccount(recurring?.account?._id || recurring?.account || '');
    setPaymentDate(formatDateForInput(new Date()));
    setPaymentBy('');
    setPaymentStatus('completed');
    setError('');
  }, [open, recurring]);

  const accountName = useMemo(() => {
    if (!recurring?.account) return '—';
    return typeof recurring.account === 'object' ? recurring.account.name : recurring.account;
  }, [recurring]);

  const handlePay = async () => {
    if (!recurring?._id) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        recurringExpenseId: recurring._id,
        account: account || undefined,
        paymentDate: paymentDate || undefined,
        paymentBy: paymentBy.trim() || undefined,
        paymentStatus,
      };
      await api.post('/finance/pay-recurring-payment', payload, {}, true);
      onPaid?.();
      onOpenChange(false);
    } catch (e) {
      setError(e.message || 'Failed to process recurring payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Pay recurring expense
          </DialogTitle>
          <DialogDescription>
            Review this schedule, confirm payment details, and create an expense entry.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
          <div className="font-medium">{recurring?.title || 'Recurring expense'}</div>
          <div><span className="text-muted-foreground">Amount:</span> {formatCurrency(recurring?.amount)}</div>
          <div><span className="text-muted-foreground">Frequency:</span> {recurring?.frequency || '—'}</div>
          <div><span className="text-muted-foreground">Next due:</span> {formatDateForInput(recurring?.nextDueDate) || '—'}</div>
          <div><span className="text-muted-foreground">Default account:</span> {accountName}</div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Account</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Select</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment date</label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment status</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                {PAYMENT_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Payment by</label>
            <Input
              value={paymentBy}
              onChange={(e) => setPaymentBy(e.target.value)}
              placeholder="e.g. Cashier / Admin / Bank"
              className="h-9"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handlePay} disabled={loading || !account} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? 'Processing...' : 'Pay now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
