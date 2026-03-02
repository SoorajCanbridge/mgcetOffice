'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Plus,
  Edit2,
  Save,
  X,
  RefreshCcw,
  Search,
  Eye,
  BookOpen,
  CreditCard,
  PiggyBank,
  Landmark,
  Coins,
  WalletMinimal,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const ACCOUNTS_BASE = '/finance/accounts';

const EMPTY_ACCOUNT = {
  name: '',
  accountNumber: '',
  accountType: 'bank',
  bankName: '',
  branch: '',
  ifscCode: '',
  balance: 0,
  openingBalance: 0,
  openingBalanceDate: '',
  status: 'active',
  description: '',
  contactPerson: { name: '', phone: '', email: '' },
  isDefault: false,
};

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank account' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit-card', label: 'Credit card' },
  { value: 'savings', label: 'Savings account' },
  { value: 'current', label: 'Current account' },
  { value: 'fixed-deposit', label: 'Fixed deposit' },
  { value: 'loan', label: 'Loan' },
  { value: 'overdraft', label: 'Overdraft' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'investment', label: 'Investment' },
  { value: 'petty-cash', label: 'Petty cash' },
  { value: 'other', label: 'Other' },
];

const ACCOUNT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'closed', label: 'Closed' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
];

const getAccountTypeIcon = (type) => {
  switch (type) {
    case 'cash':
    case 'petty-cash':
      return Coins;
    case 'wallet':
      return WalletMinimal;
    case 'credit-card':
      return CreditCard;
    case 'savings':
    case 'investment':
      return PiggyBank;
    case 'loan':
    case 'overdraft':
    case 'fixed-deposit':
      return Landmark;
    case 'current':
    case 'bank':
    default:
      return Wallet;
  }
};

const getAccountTypeStyle = (type) => {
  switch (type) {
    case 'cash':
    case 'petty-cash':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300';
    case 'wallet':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300';
    case 'credit-card':
      return 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/10 dark:text-fuchsia-300';
    case 'savings':
    case 'investment':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300';
    case 'loan':
    case 'overdraft':
    case 'fixed-deposit':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300';
    case 'current':
    case 'bank':
    default:
      return 'bg-primary/10 text-primary';
  }
};

const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return String(value);
  }
};

const formatDateForDisplay = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '';
  }
};

export default function AccountsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    search: '',
    accountType: '',
    status: '',
  });

  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);

  const fetchAccounts = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search.trim());
      if (filters.accountType) params.append('accountType', filters.accountType);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(
        `${ACCOUNTS_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      let list = Array.isArray(data) ? data : [];
      if (filters.search && !params.has('search')) {
        const q = filters.search.toLowerCase().trim();
        list = list.filter(
          (a) =>
            (a.name || '').toLowerCase().includes(q) ||
            (a.accountNumber || '').toLowerCase().includes(q) ||
            (a.bankName || '').toLowerCase().includes(q)
        );
      }
      setAccounts(list);
    } catch (err) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [user?.college, filters.search, filters.accountType, filters.status]);

  useEffect(() => {
    if (!user?.college) return;
    fetchAccounts();
  }, [user?.college, fetchAccounts]);

  const resetForm = useCallback(() => {
    setAccountForm(EMPTY_ACCOUNT);
    setEditingAccount(null);
    setShowForm(false);
  }, []);

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('contactPerson.')) {
      const key = name.split('.')[1];
      setAccountForm((prev) => ({
        ...prev,
        contactPerson: { ...(prev.contactPerson || {}), [key]: value },
      }));
      return;
    }
    setAccountForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const showBankDetails = [
    'bank',
    'current',
    'savings',
    'fixed-deposit',
    'loan',
    'overdraft',
    'investment',
    'credit-card',
  ].includes(accountForm.accountType);

  const showAccountNumber = !['cash', 'petty-cash', 'wallet'].includes(
    accountForm.accountType,
  );

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const openingBalanceNumber =
        accountForm.openingBalance !== '' ? Number(accountForm.openingBalance) : undefined;
      const contactPerson = accountForm.contactPerson && typeof accountForm.contactPerson === 'object'
        ? (accountForm.contactPerson.name || accountForm.contactPerson.phone || accountForm.contactPerson.email
            ? { name: (accountForm.contactPerson.name || '').trim(), phone: (accountForm.contactPerson.phone || '').trim(), email: (accountForm.contactPerson.email || '').trim() }
            : undefined)
        : (typeof accountForm.contactPerson === 'string' && accountForm.contactPerson.trim() ? accountForm.contactPerson.trim() : undefined);
      const payload = {
        name: accountForm.name.trim(),
        accountNumber: accountForm.accountNumber.trim() || undefined,
        accountType: accountForm.accountType,
        bankName: accountForm.bankName.trim() || undefined,
        branch: accountForm.branch.trim() || undefined,
        ifscCode: accountForm.ifscCode.trim() || undefined,
        balance: editingAccount
          ? (accountForm.balance !== '' ? Number(accountForm.balance) : undefined)
          : openingBalanceNumber,
        openingBalance: openingBalanceNumber,
        openingBalanceDate: accountForm.openingBalanceDate || undefined,
        status: accountForm.status,
        description: accountForm.description.trim() || undefined,
        contactPerson,
        isDefault: !!accountForm.isDefault,
      };

      if (editingAccount?._id) {
        await api.put(
          `${ACCOUNTS_BASE}/${editingAccount._id}`,
          payload,
          {},
          true,
        );
        showSuccess('Account updated successfully.');
      } else {
        await api.post(`${ACCOUNTS_BASE}`, payload, {}, true);
        showSuccess('Account created successfully.');
      }
      resetForm();
      await fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    const cp = account.contactPerson;
    const contactPerson = cp && typeof cp === 'object'
      ? { name: cp.name || '', phone: cp.phone || '', email: cp.email || '' }
      : { name: typeof cp === 'string' ? cp : '', phone: '', email: '' };
    setAccountForm({
      name: account.name || '',
      accountNumber: account.accountNumber || '',
      accountType: (account.accountType || 'bank').replace('_', '-'),
      bankName: account.bankName || '',
      branch: account.branch || '',
      ifscCode: account.ifscCode || '',
      balance: account.balance !== undefined ? String(account.balance) : '0',
      openingBalance: account.openingBalance !== undefined ? String(account.openingBalance) : '0',
      openingBalanceDate: formatDateForInput(account.openingBalanceDate),
      status: account.status || 'active',
      description: account.description || '',
      contactPerson,
      isDefault: account.isDefault ?? false,
    });
    setShowForm(true);
  };

  const handleViewAccount = (account) => {
    router.push(`/app/accounts/${account._id}`);
  };

  const handleStatusChange = async (account, newStatus) => {
    if (!account?._id || !newStatus || newStatus === account.status) return;
    try {
      setError('');
      // optimistic update
      setAccounts((prev) =>
        prev.map((a) => (a._id === account._id ? { ...a, status: newStatus } : a)),
      );
      await api.put(
        `${ACCOUNTS_BASE}/${account._id}`,
        { status: newStatus },
        {},
        true,
      );
      showSuccess('Account status updated.');
      await fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to update status');
      // reload from server to avoid stale UI
      fetchAccounts();
    }
  };

  const editIdFromUrl = searchParams.get('edit');
  useEffect(() => {
    if (!editIdFromUrl || !accounts.length) return;
    const acc = accounts.find((a) => a._id === editIdFromUrl);
    if (acc && !editingAccount) {
      setEditingAccount(acc);
      const cp = acc.contactPerson;
      const contactPerson = cp && typeof cp === 'object' ? { name: cp.name || '', phone: cp.phone || '', email: cp.email || '' } : { name: typeof cp === 'string' ? cp : '', phone: '', email: '' };
      setAccountForm({
        name: acc.name || '',
        accountNumber: acc.accountNumber || '',
        accountType: (acc.accountType || 'bank').replace('_', '-'),
        bankName: acc.bankName || '',
        branch: acc.branch || '',
        ifscCode: acc.ifscCode || '',
        balance: acc.balance !== undefined ? String(acc.balance) : '0',
        openingBalance: acc.openingBalance !== undefined ? String(acc.openingBalance) : '0',
        openingBalanceDate: formatDateForInput(acc.openingBalanceDate),
        status: acc.status || 'active',
        description: acc.description || '',
        contactPerson,
        isDefault: acc.isDefault ?? false,
      });
      setShowForm(true);
      router.replace('/app/accounts', { scroll: false });
    }
  }, [editIdFromUrl, accounts, editingAccount]);

  const summary = useMemo(() => {
    const sorted = [...accounts].sort((a, b) => {
      const order = {
        active: 0,
        pending: 1,
        frozen: 2,
        suspended: 2,
        inactive: 3,
        closed: 4,
        archived: 5,
      };
      const sa = order[a.status] ?? 99;
      const sb = order[b.status] ?? 99;
      if (sa !== sb) return sa - sb;
      return (a.name || '').localeCompare(b.name || '');
    });
    const totalBalance = sorted.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    return { totalBalance, count: sorted.length, sorted };
  }, [accounts]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Accounts</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage financial accounts, bank accounts, and payment methods.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchAccounts}
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
            New Account
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total balance (all accounts)</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalBalance)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Number of accounts</p>
          <p className="text-2xl font-bold mt-1">{summary.count}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or account number..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && fetchAccounts()}
              className="pl-9"
            />
          </div>
          <select
            value={filters.accountType}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, accountType: e.target.value }));
            }}
            className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Account Types</option>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, status: e.target.value }));
            }}
            className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {ACCOUNT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={fetchAccounts} className="gap-2">
            <Search className="h-4 w-4" />
            Apply
          </Button>
        </div>
      </div>

      {/* Account Form - Modal */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          } else {
            setShowForm(true);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit account' : 'New account'}</DialogTitle>
            <DialogDescription>
              {editingAccount
                ? 'Update account details and balances.'
                : 'Create a new financial account and set its opening balance.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAccount} className="space-y-6 mt-2">
            {/* 1. Basic */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                Basic details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Account name *</label>
                  <Input
                    name="name"
                    value={accountForm.name}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g. Main bank account"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Account type *</label>
                  <select
                    name="accountType"
                    value={accountForm.accountType}
                    onChange={handleFormChange}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {showAccountNumber && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Account / reference number
                    </label>
                    <Input
                      name="accountNumber"
                      value={accountForm.accountNumber}
                      onChange={handleFormChange}
                      placeholder="Optional"
                    />
                  </div>
                )}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    name="description"
                    value={accountForm.description}
                    onChange={handleFormChange}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Short note about how this account is used"
                  />
                </div>
              </div>
            </div>

            {/* 2. Bank / institution details */}
            {showBankDetails && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                  Bank / institution
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Bank / provider</label>
                    <Input
                      name="bankName"
                      value={accountForm.bankName}
                      onChange={handleFormChange}
                      placeholder="Bank or institution name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Branch</label>
                    <Input
                      name="branch"
                      value={accountForm.branch}
                      onChange={handleFormChange}
                      placeholder="Branch (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">IFSC / identifier</label>
                    <Input
                      name="ifscCode"
                      value={accountForm.ifscCode}
                      onChange={handleFormChange}
                      placeholder="IFSC or unique identifier"
                      maxLength={20}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Balance */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                Balance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Opening balance</label>
                  <Input
                    name="openingBalance"
                    type="number"
                    step="0.01"
                    value={accountForm.openingBalance}
                    onChange={handleFormChange}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use negative value for liabilities or overdraft.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Opening balance date</label>
                  <Input
                    name="openingBalanceDate"
                    type="date"
                    value={accountForm.openingBalanceDate}
                    onChange={handleFormChange}
                  />
                </div>
                {editingAccount && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Current balance</label>
                    <Input
                      name="balance"
                      type="number"
                      step="0.01"
                      value={accountForm.balance}
                      onChange={handleFormChange}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Changing this creates an adjustment in the ledger.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Status (edit only) */}
            {editingAccount && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                  Status
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    name="status"
                    value={accountForm.status}
                    onChange={handleFormChange}
                    className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {ACCOUNT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 5. Contact (optional) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                Contact (optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Contact person</label>
                  <Input
                    name="contactPerson.name"
                    value={(accountForm.contactPerson && accountForm.contactPerson.name) || ''}
                    onChange={handleFormChange}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    name="contactPerson.phone"
                    value={(accountForm.contactPerson && accountForm.contactPerson.phone) || ''}
                    onChange={handleFormChange}
                    placeholder="Phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    name="contactPerson.email"
                    type="email"
                    value={(accountForm.contactPerson && accountForm.contactPerson.email) || ''}
                    onChange={handleFormChange}
                    placeholder="Email"
                  />
                </div>
              </div>
            </div>

            {/* 6. Other */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                Other
              </h3>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={!!accountForm.isDefault}
                  onChange={handleFormChange}
                  className="h-4 w-4"
                />
                Set as default account
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              {editingAccount && (
                <Link href={`/app/accounts/${editingAccount._id}/ledger`} className="mr-auto">
                  <Button type="button" variant="ghost" className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    View ledger
                  </Button>
                </Link>
              )}
              <Button type="button" variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : editingAccount ? 'Update account' : 'Create account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account List - Card Grid */}
      <div className="bg-card border border-border rounded-lg p-4">
        {summary.count === 0 && !loading ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No accounts yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first account to start tracking balances and ledger entries.
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create account
            </Button>
          </div>
        ) : (
          <>
            {loading && (
              <p className="text-sm text-muted-foreground mb-4">Loading accounts...</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.sorted.map((account) => {
                const typeLabel =
                  ACCOUNT_TYPES.find((t) => t.value === account.accountType)?.label ||
                  account.accountType;
                const statusClasses =
                  account.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                    : account.status === 'inactive'
                    ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/40'
                    : account.status === 'pending'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40'
                    : account.status === 'frozen' || account.status === 'suspended'
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/40'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40';
                const contactName =
                  typeof account.contactPerson === 'object' && account.contactPerson
                    ? account.contactPerson.name
                    : typeof account.contactPerson === 'string'
                    ? account.contactPerson
                    : '';
                const TypeIcon = getAccountTypeIcon(account.accountType);
                const typeStyle = getAccountTypeStyle(account.accountType);

                return (
                  <div
                    key={account._id}
                    className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card/80 hover:bg-background/90 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => handleViewAccount(account)}
                  >
                    <div className="p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center shadow-sm ring-1 ring-border/60 ${typeStyle}`}
                          >
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold line-clamp-1">
                                {account.name || 'Untitled account'}
                              </h3>
                              {account.isDefault && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {typeLabel}
                              {account.accountNumber && ` • ${account.accountNumber}`}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full capitalize border ${statusClasses}`}
                        >
                          {account.status || 'active'}
                        </span>
                      </div>

                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Balance</span>
                        <span className="text-base font-semibold text-primary">
                          {formatCurrency(account.balance)}
                        </span>
                      </div>

                      {account.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {account.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {account.bankName && (
                          <div className="space-y-0.5 col-span-2">
                            <p className="text-muted-foreground">Bank</p>
                            <p className="text-sm">
                              {account.bankName}
                              {account.branch && (
                                <span className="text-muted-foreground">
                                  {` • ${account.branch}`}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        {contactName && (
                          <div className="space-y-0.5 col-span-2">
                            <p className="text-muted-foreground">Contact</p>
                            <p className="text-sm">{contactName}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-background/40 px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAccount(account);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAccount(account);
                          }}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit details
                        </Button>
                        <select
                          className="h-8 px-2 text-xs rounded-md border border-input bg-background/80 hover:bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          value={account.status || 'active'}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(account, e.target.value)}
                        >
                          {ACCOUNT_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

