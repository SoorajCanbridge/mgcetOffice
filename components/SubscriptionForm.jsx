'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, CreditCard } from 'lucide-react';

export const EMPTY_SUBSCRIPTION = {
  college: '',
  plan: '',
  status: 'trial',
  startDate: '',
  endDate: '',
  billingCycle: 'yearly',
  amount: '',
  currency: 'INR',
  trialEndsAt: '',
  autoRenew: true,
};

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function validateSubscriptionForm(data) {
  const errs = {};

  if (!data.college?.trim()) errs.college = 'College ID is required';

  if (!data.plan) errs.plan = 'Plan is required';

  return errs;
}

export default function SubscriptionForm({ open, onOpenChange, onSuccess, collegeId, embedded = false }) {
  const [subscription, setSubscription] = useState(EMPTY_SUBSCRIPTION);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);

  const resetAndClose = useCallback(() => {
    setSubscription(EMPTY_SUBSCRIPTION);
    setErrors({});
    setSubmitting(false);
    setError('');
    if (!embedded) {
      onOpenChange?.(false);
    }
  }, [onOpenChange, embedded]);

  const handleChange = useCallback((field, value) => {
    setSubscription((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  }, [errors]);

  const handleToggleAutoRenew = useCallback(() => {
    setSubscription((prev) => ({ ...prev, autoRenew: !prev.autoRenew }));
    setError('');
  }, []);

  useEffect(() => {
    if (!open && !embedded) return;
    const today = new Date();
    const plus14 = new Date(today);
    plus14.setDate(today.getDate() + 14);
    const todayStr = today.toISOString().split('T')[0];
    const plus14Str = plus14.toISOString().split('T')[0];

    setSubscription((prev) => {
      const firstplan = plans[0]?._id ?? plans[0]?.id ?? '';
      const plan =
        plans.find((p) => String(p._id ?? p.id) === String(prev.plan || firstplan)) ||
        plans[0] ||
        null;
      return {
        ...prev,
        // college id is taken from code (prop), not user input
        college: collegeId || prev.college,
        status: 'trial',
        startDate: todayStr,
        endDate: plus14Str,
        trialEndsAt: plus14Str,
        plan: prev.plan || firstplan,
        billingCycle: (plan?.billingCycle || prev.billingCycle || 'yearly').toLowerCase(),
        amount: plan?.amount ?? prev.amount ?? '',
        currency: (plan?.currency || prev.currency || 'INR').toUpperCase(),
        autoRenew: false,
      };
    });
  }, [open, collegeId, plans, embedded]);

  useEffect(() => {
    if (!open && !embedded) return;
    let cancelled = false;
    api
      .get('/plans', {}, true)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res ?? [];
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, embedded]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validateSubscriptionForm(subscription);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      const selectedPlan =
        plans.find((p) => String(p._id ?? p.id) === String(subscription.plan)) || null;
      const payload = {
        college: subscription.college.trim(),
        plan: subscription.plan,
        status: 'trial',
        startDate: subscription.startDate ? new Date(subscription.startDate).toISOString() : undefined,
        endDate: new Date(subscription.endDate).toISOString(),
        billingCycle: (selectedPlan?.billingCycle || 'yearly').toLowerCase(),
        amount: toNumberOrNull(selectedPlan?.amount) ?? 0,
        currency: (selectedPlan?.currency || 'INR').trim().toUpperCase(),
        trialEndsAt: subscription.trialEndsAt
          ? new Date(subscription.trialEndsAt).toISOString()
          : undefined,
        autoRenew: false,
      };

      await api.post('/subscriptions', payload, {}, true);
      onSuccess?.();
      resetAndClose();
    } catch (err) {
      setError(err?.message || 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  }, [onSuccess, resetAndClose, subscription, plans]);

  const content = (
    <>
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form
        id="subscription-form"
        onSubmit={handleSubmit}
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sub-plan" className="block text-sm font-medium mb-1.5">
                Plan
              </label>
              <select
                id="sub-plan"
                value={subscription.plan}
                onChange={(e) => handleChange('plan', e.target.value)}
                className={`w-full h-10 rounded-md border border-border bg-background px-3 text-sm ${
                  errors.plan ? 'border-destructive' : ''
                }`}
              >
                <option value="">Select plan</option>
                {plans.map((p) => (
                  <option key={p._id ?? p.id} value={p._id ?? p.id}>
                    {p.name} ({p.billingCycle}) – {p.amount} {p.currency ?? 'INR'}
                  </option>
                ))}
              </select>
              {errors.plan && <p className="text-xs text-destructive mt-1">{errors.plan}</p>}
            </div>
          </div>
          {errors.college && <p className="text-xs text-destructive -mt-2">{errors.college}</p>}

          {subscription.plan && (
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Selected Plan Details</p>
              </div>
              {(() => {
                const selectedPlan =
                  plans.find((p) => String(p._id ?? p.id) === String(subscription.plan)) || null;
                if (!selectedPlan) {
                  return <p className="text-sm text-muted-foreground">Plan details unavailable.</p>;
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Plan Name</p>
                      <p className="font-medium">{selectedPlan.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plan Code</p>
                      <p className="font-medium">{selectedPlan.code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Billing Cycle</p>
                      <p className="font-medium">{(selectedPlan.billingCycle || 'yearly').toLowerCase()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">
                        {toNumberOrNull(selectedPlan.amount) ?? 0} {(selectedPlan.currency || 'INR').toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">trial</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Auto Renew</p>
                      <p className="font-medium">Disabled</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

      </form>

      {embedded ? (
        <div className="flex justify-end pt-4">
          <Button form="subscription-form" type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Creating...' : 'Create subscription'}
          </Button>
        </div>
      ) : (
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={resetAndClose} disabled={submitting}>
            Cancel
          </Button>
          <Button form="subscription-form" type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Creating...' : 'Create subscription'}
          </Button>
        </DialogFooter>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAndClose();
        else onOpenChange?.(v);
      }}
    >
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>New Subscription</DialogTitle>
          <DialogDescription>
            Create a subscription for a college using the backend Subscription model.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

