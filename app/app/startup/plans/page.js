'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ReceiptIndianRupee, CreditCard, RefreshCcw, Sparkles } from 'lucide-react';
import PlanForm from '@/components/PlanForm';
import SubscriptionForm from '@/components/SubscriptionForm';
import { api } from '@/lib/api';

const PLANS_BASE = '/plans';
const SUBSCRIPTIONS_BASE = '/subscriptions';

export default function StartupPlansPage() {
  const [activeTab, setActiveTab] = useState('plans');

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const plansEmpty = useMemo(() => !loadingPlans && plans.length === 0, [loadingPlans, plans.length]);
  const subsEmpty = useMemo(
    () => !loadingSubscriptions && subscriptions.length === 0,
    [loadingSubscriptions, subscriptions.length]
  );

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setError('');
    try {
      const res = await api.get(PLANS_BASE, {}, true);
      const data = res?.data ?? res ?? [];
      setPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load plans');
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true);
    setError('');
    try {
      const res = await api.get(SUBSCRIPTIONS_BASE, {}, true);
      const data = res?.data ?? res ?? [];
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load subscriptions');
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
    loadSubscriptions();
  }, [loadPlans, loadSubscriptions]);

  const handlePlanSuccess = useCallback(() => {
    setSuccess('Plan saved successfully.');
    setShowPlanForm(false);
    setTimeout(() => setSuccess(''), 3000);
    loadPlans();
  }, [loadPlans]);

  const handleSubscriptionSuccess = useCallback(() => {
    setSuccess('Subscription saved successfully.');
    setShowSubscriptionForm(false);
    setTimeout(() => setSuccess(''), 3000);
    loadSubscriptions();
  }, [loadSubscriptions]);

  const formatCurrency = useCallback((value, currency = 'INR') => {
    const amount = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(amount)) return '-';
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

  const formatLimitValue = useCallback((value) => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n < 0) return 'Unlimited';
    return `${n}`;
  }, []);

  const getPlanSubscriptionCount = useCallback(
    (plan) => {
      const planId = String(plan?._id ?? plan?.id ?? '');
      const code = String(plan?.code ?? '').toLowerCase();
      const name = String(plan?.name ?? '').toLowerCase();

      return subscriptions.filter((sub) => {
        const subPlanValue = String(sub?.plan ?? '').toLowerCase();
        return (
          (planId && subPlanValue === planId.toLowerCase()) ||
          (code && subPlanValue === code) ||
          (name && subPlanValue === name)
        );
      }).length;
    },
    [subscriptions]
  );

  const planMetrics = useMemo(() => {
    const activePlans = plans.filter((plan) => plan.isActive !== false).length;
    return [
      { label: 'Total Plans', value: plans.length, icon: ReceiptIndianRupee },
      { label: 'Active Plans', value: activePlans, icon: Sparkles },
    ];
  }, [plans]);

  const subscriptionMetrics = useMemo(() => {
    const activeSubs = subscriptions.filter((sub) => sub.status === 'active').length;
    const trialSubs = subscriptions.filter((sub) => sub.status === 'trial').length;
    return [
      { label: 'Total Subscriptions', value: subscriptions.length, icon: CreditCard },
      { label: 'Active', value: activeSubs, icon: Sparkles },
      { label: 'Trial', value: trialSubs, icon: ReceiptIndianRupee },
    ];
  }, [subscriptions]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage plan catalog, subscriptions, and billing visibility from one workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadPlans();
              loadSubscriptions();
            }}
            className="gap-2"
            disabled={loadingPlans || loadingSubscriptions}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          {activeTab === 'plans' ? (
            <Button onClick={() => setShowPlanForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Plan
            </Button>
          ) : (
            <Button onClick={() => setShowSubscriptionForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Subscription
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'plans'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ReceiptIndianRupee className="h-4 w-4" />
          Plans
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'subscriptions'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Subscriptions
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {activeTab === 'plans' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {planMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="rounded-lg border border-border bg-card p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-semibold mt-1">{metric.value}</p>
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {loadingPlans ? (
            <p className="text-sm text-muted-foreground">Loading plans...</p>
          ) : plansEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
              <ReceiptIndianRupee className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No plans yet. Create your first plan.</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowPlanForm(true)}>
                <Plus className="h-4 w-4" />
                New Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((p) => (
                <div
                  key={p._id ?? p.id ?? `${p.name}-${p.code ?? ''}`}
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 rounded-md border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{p.name}</p>
                      {p.code ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          {p.code}
                        </span>
                      ) : null}
                      {p.isActive === false ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          Inactive
                        </span>
                      ) : null}
                      {p.isActive !== false ? (
                        <span className="text-xs px-2 py-0.5 rounded border bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20">
                          Active
                        </span>
                      ) : null}
                    </div>
                    {p.description ? (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border">
                        Trial: {Number.isFinite(Number(p.trialDays)) ? `${Number(p.trialDays)} days` : 'Not set'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border">
                        Students: {formatLimitValue(p?.limits?.maxStudents)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border">
                        Teachers: {formatLimitValue(p?.limits?.maxTeachers)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border">
                        Courses: {formatLimitValue(p?.limits?.maxCourses)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border">
                        Storage: {formatLimitValue(p?.limits?.maxStorageMB)} MB
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded border bg-muted text-muted-foreground border-border">
                        Subscriptions: {getPlanSubscriptionCount(p)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(p.amount, p.currency ?? 'INR')}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {p.billingCycle ?? 'yearly'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {subscriptionMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="rounded-lg border border-border bg-card p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-semibold mt-1">{metric.value}</p>
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {loadingSubscriptions ? (
            <p className="text-sm text-muted-foreground">Loading subscriptions...</p>
          ) : subsEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No subscriptions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((s) => (
                <div
                  key={s._id ?? s.id ?? `${s.college ?? ''}-${s.plan ?? ''}`}
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-4 rounded-md border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {s.college?.name ?? s.college?.code ?? 'College'}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {s.plan}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${
                          s.status === 'active'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
                            : s.status === 'trial'
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'} →{' '}
                      {s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'} (
                      {s.billingCycle ?? 'yearly'})
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(s.amount, s.currency ?? 'INR')}
                    </p>
                    {typeof s.daysRemaining === 'number' ? (
                      <p className="text-xs text-muted-foreground">
                        {s.daysRemaining} day{s.daysRemaining === 1 ? '' : 's'} remaining
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      <PlanForm open={showPlanForm} onOpenChange={setShowPlanForm} onSuccess={handlePlanSuccess} />
      <SubscriptionForm
        open={showSubscriptionForm}
        onOpenChange={setShowSubscriptionForm}
        onSuccess={handleSubscriptionSuccess}
      />
    </div>
  );
}
