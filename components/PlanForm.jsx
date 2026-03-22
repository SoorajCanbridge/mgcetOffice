'use client';

import { useCallback, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Loader2, ReceiptIndianRupee } from 'lucide-react';

const BILLING_CYCLES = ['monthly', 'yearly'];

const EMPTY_PLAN = {
  name: '',
  code: '',
  description: '',
  billingCycle: 'yearly',
  amount: '',
  currency: 'INR',
  trialDays: '',
  isActive: true,
  limits: {
    maxStudents: '',
    maxTeachers: '',
    maxCourses: '',
    maxStorageMB: '',
  },
};

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function validatePlanForm(data) {
  const errs = {};
  if (!data.name?.trim()) errs.name = 'Name is required';
  else if (data.name.trim().length > 100) errs.name = 'Max 100 characters';

  if (data.code?.trim() && data.code.trim().length > 50) errs.code = 'Max 50 characters';
  if (data.description?.trim() && data.description.trim().length > 500) errs.description = 'Max 500 characters';

  if (!BILLING_CYCLES.includes(data.billingCycle)) errs.billingCycle = 'Invalid billing cycle';

  const amount = toNumberOrNull(data.amount);
  if (amount !== null && amount < 0) errs.amount = 'Amount must be ≥ 0';

  const currency = (data.currency ?? '').trim().toUpperCase();
  if (!currency) errs.currency = 'Currency is required';
  else if (currency.length !== 3) errs.currency = 'Currency must be 3 letters';

  const trialDays = toNumberOrNull(data.trialDays);
  if (trialDays !== null && (!Number.isInteger(trialDays) || trialDays < 0)) errs.trialDays = 'Trial days must be a whole number ≥ 0';

  const limits = data.limits ?? {};
  ['maxStudents', 'maxTeachers', 'maxCourses', 'maxStorageMB'].forEach((k) => {
    const v = toNumberOrNull(limits[k]);
    if (v !== null && (!Number.isInteger(v) || v < 0)) errs[k] = 'Must be a whole number ≥ 0';
  });

  return errs;
}

export default function PlanForm({ open, onOpenChange, onSuccess, initialPlan = null }) {
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = useMemo(() => Boolean(initialPlan?._id || initialPlan?.id), [initialPlan]);

  const resetAndClose = useCallback(() => {
    setPlan(EMPTY_PLAN);
    setErrors({});
    setSubmitting(false);
    setError('');
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleChange = useCallback((field, value) => {
    setPlan((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  }, [errors]);

  const handleLimitChange = useCallback((field, value) => {
    setPlan((prev) => ({ ...prev, limits: { ...(prev.limits ?? {}), [field]: value } }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  }, [errors]);

  const handleToggleActive = useCallback(() => {
    setPlan((prev) => ({ ...prev, isActive: !prev.isActive }));
    setError('');
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validatePlanForm(plan);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: plan.name.trim(),
        code: plan.code?.trim() ? plan.code.trim().toUpperCase() : null,
        description: plan.description?.trim() ? plan.description.trim() : null,
        billingCycle: plan.billingCycle,
        amount: toNumberOrNull(plan.amount) ?? 0,
        currency: (plan.currency ?? 'INR').trim().toUpperCase(),
        trialDays: toNumberOrNull(plan.trialDays),
        isActive: Boolean(plan.isActive),
        limits: {
          maxStudents: toNumberOrNull(plan.limits?.maxStudents),
          maxTeachers: toNumberOrNull(plan.limits?.maxTeachers),
          maxCourses: toNumberOrNull(plan.limits?.maxCourses),
          maxStorageMB: toNumberOrNull(plan.limits?.maxStorageMB),
        },
      };

      if (isEdit) {
        const id = initialPlan?._id ?? initialPlan?.id;
        await api.put(`/plans/${id}`, payload, {}, true);
      } else {
        await api.post('/plans', payload, {}, true);
      }

      onSuccess?.();
      resetAndClose();
    } catch (err) {
      setError(err?.message || 'Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  }, [initialPlan, isEdit, onSuccess, plan, resetAndClose]);

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
          <DialogTitle>{isEdit ? 'Edit Plan' : 'New Plan'}</DialogTitle>
          <DialogDescription>Create or update a subscription plan.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form id="plan-form" onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="plan-name" className="block text-sm font-medium mb-1.5">Name</label>
              <Input
                id="plan-name"
                value={plan.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Basic"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="plan-code" className="block text-sm font-medium mb-1.5">Code (optional)</label>
              <Input
                id="plan-code"
                value={plan.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="e.g. BASIC_2026"
                className={errors.code ? 'border-destructive' : ''}
              />
              {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="plan-description" className="block text-sm font-medium mb-1.5">Description (optional)</label>
            <Input
              id="plan-description"
              value={plan.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Short description"
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="plan-billing" className="block text-sm font-medium mb-1.5">Billing cycle</label>
              <select
                id="plan-billing"
                value={plan.billingCycle}
                onChange={(e) => handleChange('billingCycle', e.target.value)}
                className={`w-full h-10 rounded-md border border-border bg-background px-3 text-sm ${errors.billingCycle ? 'border-destructive' : ''}`}
              >
                {BILLING_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.billingCycle && <p className="text-xs text-destructive mt-1">{errors.billingCycle}</p>}
            </div>

            <div>
              <label htmlFor="plan-amount" className="block text-sm font-medium mb-1.5">Amount</label>
              <Input
                id="plan-amount"
                inputMode="numeric"
                value={plan.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="0"
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label htmlFor="plan-currency" className="block text-sm font-medium mb-1.5">Currency</label>
              <Input
                id="plan-currency"
                value={plan.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                placeholder="INR"
                className={errors.currency ? 'border-destructive' : ''}
              />
              {errors.currency && <p className="text-xs text-destructive mt-1">{errors.currency}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="plan-trial" className="block text-sm font-medium mb-1.5">Trial days (optional)</label>
              <Input
                id="plan-trial"
                inputMode="numeric"
                value={plan.trialDays}
                onChange={(e) => handleChange('trialDays', e.target.value)}
                placeholder="e.g. 14"
                className={errors.trialDays ? 'border-destructive' : ''}
              />
              {errors.trialDays && <p className="text-xs text-destructive mt-1">{errors.trialDays}</p>}
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleToggleActive}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm flex items-center justify-between"
              >
                <span className="font-medium">Active</span>
                <span className="text-muted-foreground">{plan.isActive ? 'Yes' : 'No'}</span>
              </button>
            </div>
          </div>

          <div className="border border-border rounded-md p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ReceiptIndianRupee className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">Limits (optional)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="limit-students" className="block text-sm font-medium mb-1.5">Max students</label>
                <Input
                  id="limit-students"
                  inputMode="numeric"
                  value={plan.limits.maxStudents}
                  onChange={(e) => handleLimitChange('maxStudents', e.target.value)}
                  placeholder="Unlimited"
                  className={errors.maxStudents ? 'border-destructive' : ''}
                />
                {errors.maxStudents && <p className="text-xs text-destructive mt-1">{errors.maxStudents}</p>}
              </div>

              <div>
                <label htmlFor="limit-teachers" className="block text-sm font-medium mb-1.5">Max teachers</label>
                <Input
                  id="limit-teachers"
                  inputMode="numeric"
                  value={plan.limits.maxTeachers}
                  onChange={(e) => handleLimitChange('maxTeachers', e.target.value)}
                  placeholder="Unlimited"
                  className={errors.maxTeachers ? 'border-destructive' : ''}
                />
                {errors.maxTeachers && <p className="text-xs text-destructive mt-1">{errors.maxTeachers}</p>}
              </div>

              <div>
                <label htmlFor="limit-courses" className="block text-sm font-medium mb-1.5">Max courses</label>
                <Input
                  id="limit-courses"
                  inputMode="numeric"
                  value={plan.limits.maxCourses}
                  onChange={(e) => handleLimitChange('maxCourses', e.target.value)}
                  placeholder="Unlimited"
                  className={errors.maxCourses ? 'border-destructive' : ''}
                />
                {errors.maxCourses && <p className="text-xs text-destructive mt-1">{errors.maxCourses}</p>}
              </div>

              <div>
                <label htmlFor="limit-storage" className="block text-sm font-medium mb-1.5">Max storage (MB)</label>
                <Input
                  id="limit-storage"
                  inputMode="numeric"
                  value={plan.limits.maxStorageMB}
                  onChange={(e) => handleLimitChange('maxStorageMB', e.target.value)}
                  placeholder="Unlimited"
                  className={errors.maxStorageMB ? 'border-destructive' : ''}
                />
                {errors.maxStorageMB && <p className="text-xs text-destructive mt-1">{errors.maxStorageMB}</p>}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={resetAndClose} disabled={submitting}>
            Cancel
          </Button>
          <Button form="plan-form" type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Saving...' : 'Save plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

