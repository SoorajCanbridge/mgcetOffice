'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import SubscriptionForm from '@/components/SubscriptionForm';
import { ArrowLeft, Building2, Mail, Phone, MapPin, RefreshCcw, ArrowUpRight, XCircle, Loader2, ReceiptIndianRupee } from 'lucide-react';
import { api } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function StartupClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id;

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClient = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/client/${clientId}`, {}, true);
      const data = res?.data ?? res ?? null;
      setClient(data);
    } catch (err) {
      setError(err?.message || 'Failed to load client details');
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const college = client?.college ?? null;
  const subscription = college?.subscription ?? null;
  console.log(subscription);
  const plan = subscription?.plan ?? null;
  const paymentHistory = Array.isArray(subscription?.paymentHistory) ? subscription.paymentHistory : [];
  const hasSubscription = Boolean(subscription?._id || subscription?.id || subscription?.status);
  const formatOptional = useCallback((value) => {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }, []);

  const computeDaysRemaining = useCallback((endDate) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) return 0;
    const diff = end.getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, []);

  const formattedAddress = useMemo(() => {
    if (!college) return '';
    const parts = [
      college.address,
      college.city,
      college.state,
      college.pincode,
    ].filter(Boolean);
    return parts.join(', ');
  }, [college]);

  const formatDate = useCallback((value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  }, []);

  const formatDateTime = useCallback((value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }, []);

  const formatCurrency = useCallback((value, currency = 'INR') => {
    const amount = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(amount)) return '—';
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: String(currency || 'INR').toUpperCase(),
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount} ${currency || 'INR'}`;
    }
  }, []);

  const formatLimit = useCallback((value, suffix = '') => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) return 'Unlimited';
    return `${n}${suffix}`;
  }, []);

  const subscriptionId = subscription?._id ?? subscription?.id ?? null;

  const toDateInputValue = useCallback((value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    // Use UTC to avoid timezone shifting the date input by +/- 1 day.
    return d.toISOString().slice(0, 10);
  }, []);

  const parseDateInputToISOString = useCallback((dateInputValue) => {
    if (!dateInputValue) return undefined;
    // Interpret input as UTC date.
    const d = new Date(`${dateInputValue}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }, []);

  const addBillingCycleToDate = useCallback((baseDate, billingCycle) => {
    if (!baseDate) return null;
    const d = new Date(baseDate);
    if (Number.isNaN(d.getTime())) return null;
    const cycle = String(billingCycle || '').toLowerCase();
    if (cycle === 'monthly' || cycle === 'month') {
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    if (cycle === 'yearly' || cycle === 'annual' || cycle === 'year') {
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    // Unknown billing cycle.
    return null;
  }, []);

  const [plansForUpgrade, setPlansForUpgrade] = useState([]);
  const [loadingPlansForUpgrade, setLoadingPlansForUpgrade] = useState(false);

  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [renewForm, setRenewForm] = useState({
    newEndDate: '',
    amount: '',
    currency: 'INR',
    paymentRef: ''
  });

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeForm, setUpgradeForm] = useState({
    planId: '',
    newEndDate: '',
    amount: '',
    currency: '',
    paymentRef: ''
  });

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const canCreateSubscription = !hasSubscription || subscription?.status === 'cancelled';
  const [showCreateSubscriptionDialog, setShowCreateSubscriptionDialog] = useState(false);

  const handleCreateSubscriptionSuccess = useCallback(async () => {
    await fetchClient();
  }, [fetchClient]);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'INR',
    paymentRef: '',
    periodStart: '',
    periodEnd: '',
    extendEndDate: true
  });

  const isCancelled = subscription?.status === 'cancelled';

  const selectedUpgradePlan = useMemo(
    () => plansForUpgrade.find((p) => String(p._id ?? p.id) === String(upgradeForm.planId)) || null,
    [plansForUpgrade, upgradeForm.planId]
  );

  const openPaymentDialog = useCallback(() => {
    if (!subscription || !subscriptionId) return;

    const start = toDateInputValue(subscription.endDate) || toDateInputValue(new Date());
    const suggestedEnd = addBillingCycleToDate(
      subscription.endDate,
      subscription.billingCycle || subscription.plan?.billingCycle
    );

    setPaymentForm({
      amount: subscription.amount != null ? String(subscription.amount) : '',
      currency: subscription.currency ? String(subscription.currency) : 'INR',
      paymentRef: '',
      periodStart: start,
      periodEnd: suggestedEnd ? suggestedEnd.toISOString().slice(0, 10) : '',
      extendEndDate: true
    });
    setPaymentError('');
    setShowPaymentDialog(true);
  }, [subscription, subscriptionId, toDateInputValue, addBillingCycleToDate]);

  const closePaymentDialog = useCallback(() => {
    setShowPaymentDialog(false);
    setPaymentError('');
  }, []);

  const handlePaymentSubmit = useCallback(async () => {
    if (!subscriptionId) return;
    setPaymentSubmitting(true);
    setPaymentError('');

    try {
      const amt = Number(paymentForm.amount);
      if (!Number.isFinite(amt) || amt < 0) {
        setPaymentError('Amount must be a number >= 0.');
        return;
      }

      const psIso = parseDateInputToISOString(paymentForm.periodStart);
      const peIso = parseDateInputToISOString(paymentForm.periodEnd);
      if (!psIso || !peIso) {
        setPaymentError('periodStart and periodEnd are required (and must be valid dates).');
        return;
      }
      if (new Date(peIso) <= new Date(psIso)) {
        setPaymentError('periodEnd must be after periodStart.');
        return;
      }

      const payload = {
        amount: amt,
        currency: paymentForm.currency?.trim()
          ? paymentForm.currency.trim().toUpperCase()
          : undefined,
        paymentRef: paymentForm.paymentRef?.trim()
          ? paymentForm.paymentRef.trim().slice(0, 200)
          : undefined,
        periodStart: psIso,
        periodEnd: peIso,
        extendEndDate: Boolean(paymentForm.extendEndDate)
      };

      await api.post(`/subscriptions/${subscriptionId}/payment`, payload, {}, true);
      setShowPaymentDialog(false);
      await fetchClient();
    } catch (err) {
      setPaymentError(err?.message || 'Failed to add payment');
    } finally {
      setPaymentSubmitting(false);
    }
  }, [subscriptionId, paymentForm, parseDateInputToISOString, fetchClient]);

  const openRenewDialog = useCallback(() => {
    if (!subscription || !subscription.endDate) return;
    const suggested = addBillingCycleToDate(subscription.endDate, subscription.billingCycle || plan?.billingCycle);
    setRenewForm({
      newEndDate: suggested ? suggested.toISOString().slice(0, 10) : '',
      amount: subscription.amount != null ? String(subscription.amount) : '',
      currency: subscription.currency ? String(subscription.currency) : 'INR',
      paymentRef: ''
    });
    setRenewError('');
    setShowRenewDialog(true);
  }, [subscription, plan?.billingCycle, addBillingCycleToDate]);

  const openUpgradeDialog = useCallback(async () => {
    if (!subscription) return;

    const currentPlanId = subscription.plan?._id ?? subscription.plan?.id ?? '';

    if (!plansForUpgrade.length) {
      setLoadingPlansForUpgrade(true);
      setPlansForUpgrade([]);
      try {
        const res = await api.get('/plans', {}, true);
        const data = res?.data ?? res ?? [];
        setPlansForUpgrade(Array.isArray(data) ? data : []);
      } catch (e) {
        // Keep dialog open; we'll show error on submit if needed.
        setPlansForUpgrade([]);
      } finally {
        setLoadingPlansForUpgrade(false);
      }
    }

    const selectedCurrentPlan =
      plansForUpgrade.find((p) => String(p._id ?? p.id) === String(currentPlanId)) || subscription?.plan || null;
    const suggested = addBillingCycleToDate(
      subscription.endDate,
      selectedCurrentPlan?.billingCycle || subscription.billingCycle
    );

    setUpgradeForm({
      planId: currentPlanId || '',
      newEndDate: suggested ? suggested.toISOString().slice(0, 10) : '',
      amount:
        selectedCurrentPlan?.amount != null
          ? String(selectedCurrentPlan.amount)
          : subscription.amount != null
          ? String(subscription.amount)
          : '',
      currency:
        selectedCurrentPlan?.currency != null
          ? String(selectedCurrentPlan.currency)
          : subscription.currency
          ? String(subscription.currency)
          : (subscription.plan?.currency ?? 'INR'),
      paymentRef: ''
    });
    setUpgradeError('');
    setShowUpgradeDialog(true);
  }, [subscription, plansForUpgrade, addBillingCycleToDate]);

  const openCancelDialog = useCallback(() => {
    setCancelReason(subscription?.cancelReason || '');
    setCancelError('');
    setShowCancelDialog(true);
  }, [subscription?.cancelReason]);

  useEffect(() => {
    if (!showUpgradeDialog) return;
    // Ensure plan list is loaded when opening.
    if (plansForUpgrade.length > 0) return;
    (async () => {
      setLoadingPlansForUpgrade(true);
      setPlansForUpgrade([]);
      try {
        const res = await api.get('/plans', {}, true);
        const data = res?.data ?? res ?? [];
        setPlansForUpgrade(Array.isArray(data) ? data : []);
      } catch {
        setPlansForUpgrade([]);
      } finally {
        setLoadingPlansForUpgrade(false);
      }
    })();
  }, [showUpgradeDialog, plansForUpgrade.length]);

  const handleRenewSubmit = useCallback(async () => {
    if (!subscriptionId) return;
    setRenewSubmitting(true);
    setRenewError('');

    try {
      const nextEndIso = parseDateInputToISOString(renewForm.newEndDate);
      if (!nextEndIso) {
        setRenewError('newEndDate is required (and must be a valid date).');
        return;
      }

      const prevEnd = new Date(subscription.endDate);
      const nextEnd = new Date(nextEndIso);
      if (Number.isNaN(prevEnd.getTime()) || Number.isNaN(nextEnd.getTime()) || nextEnd <= prevEnd) {
        setRenewError('newEndDate must be after current endDate.');
        return;
      }

      const amt = Number(renewForm.amount);
      if (!Number.isFinite(amt) || amt < 0) {
        setRenewError('Amount must be a number >= 0.');
        return;
      }

      const payload = {
        newEndDate: nextEndIso,
        amount: amt,
        currency: renewForm.currency?.trim() ? renewForm.currency.trim().toUpperCase() : undefined,
        paymentRef: renewForm.paymentRef?.trim() ? renewForm.paymentRef.trim() : undefined
      };

      await api.post(`/subscriptions/${subscriptionId}/renew`, payload, {}, true);
      setShowRenewDialog(false);
      await fetchClient();
    } catch (err) {
      setRenewError(err?.message || 'Failed to renew subscription');
    } finally {
      setRenewSubmitting(false);
    }
  }, [subscriptionId, subscription?.endDate, renewForm, parseDateInputToISOString, fetchClient]);

  const handleUpgradeSubmit = useCallback(async () => {
    if (!subscriptionId) return;
    setUpgradeSubmitting(true);
    setUpgradeError('');

    try {
      const selectedPlanId = upgradeForm.planId;
      if (!selectedPlanId) {
        setUpgradeError('Please select a plan.');
        return;
      }

      const nextEndIso = parseDateInputToISOString(upgradeForm.newEndDate);

      const amountTrimmed = upgradeForm.amount?.trim() ?? '';
      const amt = amountTrimmed ? Number(amountTrimmed) : undefined;
      if (amt != null && (!Number.isFinite(amt) || amt < 0)) {
        setUpgradeError('Amount must be a number >= 0.');
        return;
      }

      const payload = {
        plan: selectedPlanId,
        newEndDate: nextEndIso,
        amount: amt,
        currency: upgradeForm.currency?.trim() ? upgradeForm.currency.trim().toUpperCase() : undefined,
        paymentRef: upgradeForm.paymentRef?.trim() ? upgradeForm.paymentRef.trim() : undefined
      };

      await api.post(`/subscriptions/${subscriptionId}/upgrade`, payload, {}, true);
      setShowUpgradeDialog(false);
      await fetchClient();
    } catch (err) {
      setUpgradeError(err?.message || 'Failed to upgrade subscription');
    } finally {
      setUpgradeSubmitting(false);
    }
  }, [subscriptionId, upgradeForm, parseDateInputToISOString, fetchClient]);

  const handleCancelSubmit = useCallback(async () => {
    if (!subscriptionId) return;
    setCancelSubmitting(true);
    setCancelError('');

    try {
      const reasonTrim = cancelReason.trim();
      const payload = {
        cancelReason: reasonTrim || undefined,
        reason: reasonTrim || undefined
      };

      await api.post(`/subscriptions/${subscriptionId}/cancel`, payload, {}, true);
      setShowCancelDialog(false);
      await fetchClient();
    } catch (err) {
      setCancelError(err?.message || 'Failed to cancel subscription');
    } finally {
      setCancelSubmitting(false);
    }
  }, [subscriptionId, cancelReason, fetchClient]);

  const closeRenewDialog = useCallback(() => {
    setShowRenewDialog(false);
    setRenewError('');
  }, []);

  const closeUpgradeDialog = useCallback(() => {
    setShowUpgradeDialog(false);
    setUpgradeError('');
  }, []);

  const closeCancelDialog = useCallback(() => {
    setShowCancelDialog(false);
    setCancelError('');
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/app/startup/clients')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground mt-2">
            Client ID: {clientId || '—'}
          </p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" onClick={fetchClient} className="gap-2" disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {loading && (
        <div className="py-10 text-center text-muted-foreground">Loading client...</div>
      )}

      {!loading && error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && client && (
        <div className="space-y-6">
          {/* Top summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold truncate">{client.name || '—'}</h2>
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    <Mail className="inline h-4 w-4 mr-1 align-text-bottom" />
                    {client.email || '—'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formattedAddress || 'Address not provided'}
                  </div>
                </div>
              </div>

              <span
                className={`text-xs px-3 py-1 rounded-full border ${
                  client.isActive
                    ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {client.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {hasSubscription ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold mt-1">{plan?.name || '—'}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="text-lg font-semibold mt-1 capitalize">{formatOptional(subscription.status)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold mt-1">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Days Remaining</p>
                <p className="text-lg font-semibold mt-1">{computeDaysRemaining(subscription.endDate)}</p>
              </div>
            </div>
          ) : null}

          {/* Main sections */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Client */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4 lg:col-span-4">
              <div>
                <p className="text-sm font-semibold">Client</p>
                <p className="text-xs text-muted-foreground mt-1">Client account and college details</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{client.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{client.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Created by</span>
                  <span className="text-right font-medium">
                    {client.createdBy?.name || client.createdBy?.email || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">College name</span>
                  <span className="font-medium">{college?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">College code</span>
                  <span className="font-medium">{college?.code || '—'}</span>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-muted-foreground text-xs flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4" /> Address
                  </div>
                  <div className="break-words text-sm">{formattedAddress || '—'}</div>
                </div>
                {college?.phone ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{college.phone}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Subscription */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4 lg:col-span-8">
              <div>
                <p className="text-sm font-semibold">Subscription</p>
                <p className="text-xs text-muted-foreground mt-1">Plan, billing, timeline, and actions</p>
              </div>

              {hasSubscription ? (
                <div className="space-y-4 text-sm">
                  {/* Overview */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-medium capitalize">{formatOptional(subscription.status)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {computeDaysRemaining(subscription.endDate)} day(s) remaining
                      </p>
                    </div>

                    <span
                      className={`text-xs px-3 py-1 rounded-full border ${
                        subscription.status === 'trial'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                          : subscription.status === 'active'
                          ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
                          : subscription.status === 'cancelled'
                          ? 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {formatOptional(subscription.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-medium mt-1">{plan?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Code: {formatOptional(plan?.code)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Billing: {formatOptional(subscription.billingCycle)}
                      </p>
                    </div>

                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-medium mt-1">
                        {formatCurrency(subscription.amount, subscription.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto renew: {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-2">Timeline</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Start</p>
                        <p className="font-medium">{formatDate(subscription.startDate)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">End</p>
                        <p className="font-medium">{formatDate(subscription.endDate)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Trial ends</p>
                        <p className="font-medium">{formatDate(subscription.trialEndsAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Limits */}
                  {subscription.limits ? (
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-2">Limits</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Max students</p>
                          <p className="font-medium">{formatLimit(subscription.limits.maxStudents)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Max teachers</p>
                          <p className="font-medium">{formatLimit(subscription.limits.maxTeachers)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Max courses</p>
                          <p className="font-medium">{formatLimit(subscription.limits.maxCourses)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Max storage (MB)</p>
                          <p className="font-medium">{formatLimit(subscription.limits.maxStorageMB, ' MB')}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Subscription actions */}
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-2">Manage subscription</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        onClick={openRenewDialog}
                        disabled={!subscriptionId || isCancelled || renewSubmitting || upgradeSubmitting || cancelSubmitting || paymentSubmitting}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        {subscription.status === 'past_due' ? 'Renew Subscription' : 'Extend Subscription'}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={openUpgradeDialog}
                        disabled={!subscriptionId || isCancelled || renewSubmitting || upgradeSubmitting || cancelSubmitting || paymentSubmitting}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        Upgrade
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={openCancelDialog}
                        disabled={!subscriptionId || isCancelled || renewSubmitting || upgradeSubmitting || cancelSubmitting || paymentSubmitting}
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </Button>

                      {/* <Button
                        variant="outline"
                        onClick={openPaymentDialog}
                        disabled={!subscriptionId || renewSubmitting || upgradeSubmitting || cancelSubmitting || paymentSubmitting}
                      >
                        <ReceiptIndianRupee className="h-4 w-4" />
                        Add Payment
                      </Button> */}
                    </div>
                    {isCancelled ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">This subscription has been cancelled.</p>
                        <Button
                          type="button"
                          onClick={() => setShowCreateSubscriptionDialog(true)}
                          disabled={!college?._id}
                          className="w-full sm:w-auto"
                        >
                          Create new subscription
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {/* Payment dialog */}
                  <Dialog
                    open={showPaymentDialog}
                    onOpenChange={(v) => {
                      if (!v) closePaymentDialog();
                      else setShowPaymentDialog(v);
                    }}
                  >
                    <DialogContent className="sm:max-w-[620px]">
                      <DialogHeader>
                        <DialogTitle>Add payment</DialogTitle>
                        <DialogDescription>
                          Record a payment against this subscription and optionally extend the end date.
                        </DialogDescription>
                      </DialogHeader>

                      {paymentError ? (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                          <p className="text-sm text-destructive">{paymentError}</p>
                        </div>
                      ) : null}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handlePaymentSubmit();
                        }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="pay-amount" className="block text-sm font-medium mb-1.5">
                              Amount
                            </label>
                            <Input
                              id="pay-amount"
                              inputMode="decimal"
                              value={paymentForm.amount}
                              onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                              placeholder="e.g. 4999"
                              required
                            />
                          </div>

                          <div>
                            <label htmlFor="pay-currency" className="block text-sm font-medium mb-1.5">
                              Currency (3-letter)
                            </label>
                            <Input
                              id="pay-currency"
                              value={paymentForm.currency}
                              onChange={(e) =>
                                setPaymentForm((p) => ({ ...p, currency: e.target.value }))
                              }
                              placeholder="INR"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="pay-ref" className="block text-sm font-medium mb-1.5">
                            Payment reference (optional)
                          </label>
                          <Input
                            id="pay-ref"
                            value={paymentForm.paymentRef}
                            onChange={(e) => setPaymentForm((p) => ({ ...p, paymentRef: e.target.value }))}
                            placeholder="e.g. UTR/Txn ID"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="pay-start" className="block text-sm font-medium mb-1.5">
                              Period start
                            </label>
                            <Input
                              id="pay-start"
                              type="date"
                              value={paymentForm.periodStart}
                              onChange={(e) =>
                                setPaymentForm((p) => ({ ...p, periodStart: e.target.value }))
                              }
                              required
                              min={toDateInputValue(new Date())}
                            />
                          </div>

                          <div>
                            <label htmlFor="pay-end" className="block text-sm font-medium mb-1.5">
                              Period end
                            </label>
                            <Input
                              id="pay-end"
                              type="date"
                              value={paymentForm.periodEnd}
                              onChange={(e) =>
                                setPaymentForm((p) => ({ ...p, periodEnd: e.target.value }))
                              }
                              required
                              min={toDateInputValue(new Date())}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="pay-extend"
                            checked={paymentForm.extendEndDate}
                            onCheckedChange={(v) => setPaymentForm((p) => ({ ...p, extendEndDate: Boolean(v) }))}
                          />
                          <label htmlFor="pay-extend" className="text-sm font-medium leading-none">
                            Extend subscription end date to period end
                          </label>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button type="button" variant="outline" onClick={closePaymentDialog} disabled={paymentSubmitting}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={paymentSubmitting}>
                            {paymentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {paymentSubmitting ? 'Saving...' : 'Save payment'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Cancellation */}
                  {subscription.cancelReason || subscription.cancelledAt ? (
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-2">Cancellation</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Cancelled at</span>
                          <span className="font-medium">{formatDate(subscription.cancelledAt)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Reason</span>
                          <span className="font-medium text-right">
                            {subscription.cancelReason || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Renewal history */}
                  {Array.isArray(subscription.renewalHistory) && subscription.renewalHistory.length > 0 ? (
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-2">Renewal history</p>
                      <div className="space-y-3">
                        {subscription.renewalHistory.map((rh, idx) => (
                          <div key={String(rh.renewedAt || idx)} className="border border-border rounded-md p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-muted-foreground">Renewed at</span>
                              <span className="text-sm font-medium">{formatDateTime(rh.renewedAt)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Previous end</p>
                                <p className="font-medium">{formatDate(rh.previousEndDate)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">New end</p>
                                <p className="font-medium">{formatDate(rh.newEndDate)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Renew dialog */}
                  <Dialog open={showRenewDialog} onOpenChange={(v) => { if (!v) closeRenewDialog(); else setShowRenewDialog(v); }}>
                    <DialogContent className="sm:max-w-[560px]">
                      <DialogHeader>
                        <DialogTitle>Renew subscription</DialogTitle>
                        <DialogDescription>Extend the subscription end date and record payment history.</DialogDescription>
                      </DialogHeader>

                      {renewError ? (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                          <p className="text-sm text-destructive">{renewError}</p>
                        </div>
                      ) : null}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleRenewSubmit();
                        }}
                        className="space-y-4"
                      >
                        <div className="rounded-md border border-border p-4">
                          <p className="text-xs text-muted-foreground mb-3">
                            Renewal details are prefilled from the current subscription.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Plan to renew</p>
                              <p className="font-medium">
                                {plan?.name || formatOptional(subscription?.plan?.name)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Code: {formatOptional(plan?.code || subscription?.plan?.code)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Billing cycle</p>
                              <p className="font-medium capitalize">
                                {formatOptional(subscription?.billingCycle || plan?.billingCycle)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Current end date</p>
                              <p className="font-medium">{formatDate(subscription?.endDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">New end date</p>
                              <p className="font-medium">
                                {renewForm.newEndDate ? formatDate(renewForm.newEndDate) : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="font-medium">
                                {formatCurrency(renewForm.amount, renewForm.currency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Currency</p>
                              <p className="font-medium">{formatOptional(renewForm.currency)}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs text-muted-foreground">Payment reference</p>
                              <Input
                                id="renew-paymentRef"
                                value={renewForm.paymentRef}
                                onChange={(e) => setRenewForm((p) => ({ ...p, paymentRef: e.target.value }))}
                                placeholder="e.g. UTR/Txn ID"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button type="button" variant="outline" onClick={closeRenewDialog} disabled={renewSubmitting}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={renewSubmitting}>
                            {renewSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {renewSubmitting ? 'Renewing...' : 'Renew'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Upgrade dialog */}
                  <Dialog open={showUpgradeDialog} onOpenChange={(v) => { if (!v) closeUpgradeDialog(); else setShowUpgradeDialog(v); }}>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Upgrade subscription</DialogTitle>
                        <DialogDescription>Change the plan, extend the end date, and record payment history.</DialogDescription>
                      </DialogHeader>

                      {upgradeError ? (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                          <p className="text-sm text-destructive">{upgradeError}</p>
                        </div>
                      ) : null}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleUpgradeSubmit();
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label htmlFor="upgrade-plan" className="block text-sm font-medium mb-1.5">
                            Plan
                          </label>
                          <select
                            id="upgrade-plan"
                            value={upgradeForm.planId}
                            onChange={(e) => {
                              const nextPlanId = e.target.value;
                              const selected = plansForUpgrade.find((p) => String(p._id ?? p.id) === String(nextPlanId)) || null;
                              const suggested = addBillingCycleToDate(
                                subscription?.endDate,
                                selected?.billingCycle || subscription?.billingCycle
                              );
                              setUpgradeForm((prev) => ({
                                ...prev,
                                planId: nextPlanId,
                                newEndDate: suggested ? suggested.toISOString().slice(0, 10) : prev.newEndDate,
                                amount:
                                  selected?.amount != null
                                    ? String(selected.amount)
                                    : subscription?.amount != null
                                    ? String(subscription.amount)
                                    : prev.amount,
                                currency:
                                  selected?.currency != null
                                    ? String(selected.currency)
                                    : subscription?.currency != null
                                    ? String(subscription.currency)
                                    : (prev.currency || 'INR')
                              }));
                            }}
                            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                            required
                            disabled={loadingPlansForUpgrade}
                          >
                            <option value="">{loadingPlansForUpgrade ? 'Loading...' : 'Select plan'}</option>
                            {plansForUpgrade.map((p) => (
                              <option key={p._id ?? p.id} value={p._id ?? p.id}>
                                {p.name} ({p.billingCycle}) - {p.amount} {p.currency ?? 'INR'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-md border border-border p-4">
                          <p className="text-xs text-muted-foreground mb-3">
                            Upgrade details are auto-calculated from the selected plan.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Selected plan</p>
                              <p className="font-medium">{selectedUpgradePlan?.name || '—'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Code: {formatOptional(selectedUpgradePlan?.code)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Billing cycle</p>
                              <p className="font-medium capitalize">
                                {formatOptional(selectedUpgradePlan?.billingCycle || subscription?.billingCycle)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Current end date</p>
                              <p className="font-medium">{formatDate(subscription?.endDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">New end date</p>
                              <p className="font-medium">
                                {upgradeForm.newEndDate ? formatDate(upgradeForm.newEndDate) : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="font-medium">
                                {formatCurrency(upgradeForm.amount, upgradeForm.currency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Currency</p>
                              <p className="font-medium">{formatOptional(upgradeForm.currency)}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="upgrade-paymentRef" className="block text-sm font-medium mb-1.5">
                            Payment reference (optional)
                          </label>
                          <Input
                            id="upgrade-paymentRef"
                            value={upgradeForm.paymentRef}
                            onChange={(e) => setUpgradeForm((p) => ({ ...p, paymentRef: e.target.value }))}
                            placeholder="e.g. UTR/Txn ID"
                          />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button type="button" variant="outline" onClick={closeUpgradeDialog} disabled={upgradeSubmitting}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={upgradeSubmitting}>
                            {upgradeSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {upgradeSubmitting ? 'Upgrading...' : 'Upgrade'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Cancel dialog */}
                  <Dialog open={showCancelDialog} onOpenChange={(v) => { if (!v) closeCancelDialog(); else setShowCancelDialog(v); }}>
                    <DialogContent className="sm:max-w-[520px]">
                      <DialogHeader>
                        <DialogTitle>Cancel subscription</DialogTitle>
                        <DialogDescription>Cancel this subscription and record an optional reason.</DialogDescription>
                      </DialogHeader>

                      {cancelError ? (
                        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                          <p className="text-sm text-destructive">{cancelError}</p>
                        </div>
                      ) : null}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCancelSubmit();
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label htmlFor="cancel-reason" className="block text-sm font-medium mb-1.5">
                            Reason (optional)
                          </label>
                          <Input
                            id="cancel-reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="e.g. College requested cancellation"
                          />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button type="button" variant="outline" onClick={closeCancelDialog} disabled={cancelSubmitting}>
                            Keep subscription
                          </Button>
                          <Button type="submit" variant="destructive" disabled={cancelSubmitting}>
                            {cancelSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {cancelSubmitting ? 'Cancelling...' : 'Cancel subscription'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Payment history */}
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-2">Payment history</p>
                    {paymentHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No payment records found.</p>
                    ) : (
                      <div className="space-y-3">
                        {paymentHistory.map((ph, idx) => (
                          <div key={String(ph.paidAt || idx)} className="border border-border rounded-md p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-muted-foreground">Paid at</span>
                              <span className="text-sm font-medium">{formatDateTime(ph.paidAt)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Amount</p>
                                <p className="font-medium">
                                  {formatOptional(ph.amount)} {formatOptional(ph.currency)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Reference</p>
                                <p className="font-medium">{ph.paymentRef || '—'}</p>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Period: {formatDate(ph.periodStart)} → {formatDate(ph.periodEnd)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  {subscription.metadata && Object.keys(subscription.metadata).length > 0 ? (
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-2">Metadata</p>
                      <pre className="text-xs bg-muted/30 border border-border rounded-md p-3 overflow-x-auto">
                        {JSON.stringify(subscription.metadata, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    No current subscription found for this college.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setShowCreateSubscriptionDialog(true)}
                    disabled={!college?._id}
                  >
                    Create new subscription
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Create subscription dialog */}
          <SubscriptionForm
            open={showCreateSubscriptionDialog}
            onOpenChange={setShowCreateSubscriptionDialog}
            onSuccess={handleCreateSubscriptionSuccess}
            collegeId={college?._id ?? ''}
          />

          {/* Audit */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold">Audit</p>
                <p className="text-xs text-muted-foreground mt-1">Creation and update timestamps</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Created at</p>
                  <p className="text-sm font-medium mt-1">{formatDateTime(client.createdAt)}</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Updated at</p>
                  <p className="text-sm font-medium mt-1">{formatDateTime(client.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !client && (
        <div className="py-10 text-center text-muted-foreground">Client not found.</div>
      )}
    </div>
  );
}
