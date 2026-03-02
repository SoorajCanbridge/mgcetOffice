'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Calendar,
  Download,
  Printer,
  RefreshCcw,
  Scale,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const LEDGERS_BASE = '/finance/ledgers';
const ACCOUNTS_BASE = '/finance/accounts';

const formatCurrency = (value) => {
  if (value != null && value !== 0 && !value) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return '₹0.00';
  }
};

const formatDateForDisplay = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getDefaultPeriod = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
};

// Group account types for professional categories
const ASSET_CATEGORIES = {
  'Current Assets': ['bank', 'cash', 'savings', 'current'],
  'Other Assets': ['other'],
};

const LIABILITY_CATEGORIES = {
  'Current Liabilities': ['credit-card', 'credit_card'],
  'Other Liabilities': ['other'],
};

export default function BalanceSheetPage() {
  const { user } = useAuth();
  const printRef = useRef(null);

  const [ledgers, setLedgers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState(getDefaultPeriod);

  const fetchAccounts = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get(ACCOUNTS_BASE, {}, true);
      const data = response?.data ?? response ?? [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, [user?.college]);

  const fetchLedgers = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (period.startDate) params.append('startDate', period.startDate);
      if (period.endDate) params.append('endDate', period.endDate);
      const response = await api.get(`${LEDGERS_BASE}?${params.toString()}`, {}, true);
      const data = response?.data ?? response ?? [];
      setLedgers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  }, [user?.college, period.startDate, period.endDate]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!user?.college) return;
    fetchLedgers();
  }, [fetchLedgers]);

  // Group ledger lines by account and compute credits/debits
  const transactionsByAccount = useMemo(() => {
    const grouped = {};
    ledgers.forEach((ledger) => {
      (ledger.lines || []).forEach((line) => {
        const accountId = typeof line.account === 'object' ? line.account._id : line.account;
        const account = typeof line.account === 'object' ? line.account : accounts.find((a) => a._id === accountId);
        const accountName = account?.name ?? 'Unknown';
        if (!grouped[accountId]) {
          grouped[accountId] = {
            accountId,
            accountName,
            account,
            totalCredits: 0,
            totalDebits: 0,
          };
        }
        const amt = Number(line.amount) || 0;
        if (line.transactionType === 'credit') grouped[accountId].totalCredits += amt;
        else grouped[accountId].totalDebits += amt;
      });
    });
    return grouped;
  }, [ledgers, accounts]);

  // Build balance sheet: category-wise Assets, Liabilities, Equity
  const balanceSheet = useMemo(() => {
    if (!period.startDate || !period.endDate) return null;

    const assetsByCategory = {};
    const liabilitiesByCategory = {};

    Object.values(transactionsByAccount).forEach((data) => {
      const account = data.account;
      if (!account) return;
      const opening = Number(account.openingBalance) || 0;
      const net = data.totalCredits - data.totalDebits;
      const closing = opening + net;
      const accountType = (account.accountType || 'other').toLowerCase().replace('_', '-');

      if (['bank', 'cash', 'savings', 'current'].includes(accountType)) {
        if (closing >= 0) {
          const cat = 'Current Assets';
          if (!assetsByCategory[cat]) assetsByCategory[cat] = [];
          assetsByCategory[cat].push({ name: account.name, balance: closing, accountId: account._id });
        } else {
          const cat = 'Current Liabilities';
          if (!liabilitiesByCategory[cat]) liabilitiesByCategory[cat] = [];
          liabilitiesByCategory[cat].push({ name: account.name, balance: Math.abs(closing), accountId: account._id });
        }
      } else if (accountType === 'credit-card' || accountType === 'credit_card') {
        const cat = 'Current Liabilities';
        if (!liabilitiesByCategory[cat]) liabilitiesByCategory[cat] = [];
        liabilitiesByCategory[cat].push({ name: account.name, balance: Math.abs(closing), accountId: account._id });
      } else {
        if (closing >= 0) {
          const cat = 'Other Assets';
          if (!assetsByCategory[cat]) assetsByCategory[cat] = [];
          assetsByCategory[cat].push({ name: account.name, balance: closing, accountId: account._id });
        } else {
          const cat = 'Other Liabilities';
          if (!liabilitiesByCategory[cat]) liabilitiesByCategory[cat] = [];
          liabilitiesByCategory[cat].push({ name: account.name, balance: Math.abs(closing), accountId: account._id });
        }
      }
    });

    const assetCategories = [
      { label: 'Current Assets', items: assetsByCategory['Current Assets'] || [] },
      { label: 'Other Assets', items: assetsByCategory['Other Assets'] || [] },
    ].filter((c) => c.items.length > 0);

    const liabilityCategories = [
      { label: 'Current Liabilities', items: liabilitiesByCategory['Current Liabilities'] || [] },
      { label: 'Other Liabilities', items: liabilitiesByCategory['Other Liabilities'] || [] },
    ].filter((c) => c.items.length > 0);

    let totalAssets = 0;
    assetCategories.forEach((c) => c.items.forEach((i) => (totalAssets += i.balance)));
    let totalLiabilities = 0;
    liabilityCategories.forEach((c) => c.items.forEach((i) => (totalLiabilities += i.balance)));
    const totalEquity = totalAssets - totalLiabilities;

    return {
      assetCategories,
      liabilityCategories,
      totalAssets,
      totalLiabilities,
      totalEquity,
      asAtDate: period.endDate,
      fromDate: period.startDate,
      toDate: period.endDate,
    };
  }, [transactionsByAccount, period]);

  const handleDownloadCSV = useCallback(() => {
    if (!balanceSheet) return;
    setExporting(true);
    try {
      const rows = [
        ['Balance Sheet'],
        ['As at', formatDateForDisplay(balanceSheet.asAtDate)],
        ['Period', `${formatDateForDisplay(balanceSheet.fromDate)} to ${formatDateForDisplay(balanceSheet.toDate)}`],
        [],
        ['ASSETS', ''],
        ...balanceSheet.assetCategories.flatMap((cat) => [
          [cat.label, ''],
          ...cat.items.map((i) => [i.name, i.balance]),
          ['Subtotal', cat.items.reduce((s, i) => s + i.balance, 0)],
          [],
        ]),
        ['Total Assets', balanceSheet.totalAssets],
        [],
        ['LIABILITIES', ''],
        ...balanceSheet.liabilityCategories.flatMap((cat) => [
          [cat.label, ''],
          ...cat.items.map((i) => [i.name, i.balance]),
          ['Subtotal', cat.items.reduce((s, i) => s + i.balance, 0)],
          [],
        ]),
        ['Total Liabilities', balanceSheet.totalLiabilities],
        [],
        ['EQUITY', ''],
        ['Net Equity', balanceSheet.totalEquity],
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c)}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `balance-sheet-${period.startDate}-to-${period.endDate}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }, [balanceSheet, period]);

  const handlePrint = useCallback(() => {
    if (!balanceSheet || !printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to print');
      return;
    }
    const content = printRef.current.innerHTML;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Balance Sheet - ${period.endDate}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1e293b; font-size: 14px; }
            .container { max-width: 900px; margin: 0 auto; }
            .report-title { text-align: center; font-size: 22px; font-weight: 700; margin-bottom: 8px; }
            .report-subtitle { text-align: center; color: #64748b; margin-bottom: 24px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
            .category-title { font-weight: 600; color: #334155; margin: 12px 0 6px 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 6px 12px; border-bottom: 1px solid #f1f5f9; }
            td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
            .total-row td { font-weight: 700; border-top: 2px solid #e2e8f0; padding-top: 10px; }
            .grand-total td { font-size: 16px; border-top: 2px solid #1e293b; padding-top: 12px; }
            .pl-4 { padding-left: 16px; }
            @media print { body { padding: 16px; } @page { margin: 12mm; size: A4; } }
          </style>
        </head>
        <body><div class="container">${content}</div></body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }, [balanceSheet, period]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/app/ledgers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
            <p className="text-sm text-muted-foreground">Generate balance sheet report for a selected period</p>
          </div>
        </div>
      </div>

      {/* Period & actions */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Period</span>
          </div>
          <Input
            type="date"
            className="w-40"
            value={period.startDate}
            onChange={(e) => setPeriod((p) => ({ ...p, startDate: e.target.value }))}
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-40"
            value={period.endDate}
            onChange={(e) => setPeriod((p) => ({ ...p, endDate: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLedgers} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {balanceSheet && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={exporting}>
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button variant="default" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !balanceSheet && (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Loading ledger data...
        </div>
      )}

      {!loading && balanceSheet && (
        <div ref={printRef} className="rounded-xl border border-border bg-card overflow-hidden print:shadow-none">
          {/* Report header */}
          <div className="border-b border-border bg-muted/40 px-6 py-5">
            <h2 className="report-title text-center text-xl font-bold">Balance Sheet</h2>
            <p className="report-subtitle text-center text-sm text-muted-foreground">
              As at {formatDateForDisplay(balanceSheet.asAtDate)}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              For the period {formatDateForDisplay(balanceSheet.fromDate)} to {formatDateForDisplay(balanceSheet.toDate)}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* ASSETS */}
            <div className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-4 pb-2 border-b border-border">
                Assets
              </h3>
              {balanceSheet.assetCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No asset accounts in this period.</p>
              ) : (
                <div className="space-y-6">
                  {balanceSheet.assetCategories.map((category) => (
                    <div key={category.label}>
                      <p className="text-sm font-semibold text-foreground/90 mb-2">{category.label}</p>
                      <table className="w-full">
                        <tbody>
                          {category.items.map((item) => (
                            <tr key={item.accountId} className="border-b border-border/50">
                              <td className="py-2 pl-4 text-sm">{item.name}</td>
                              <td className="py-2 text-right text-sm font-medium tabular-nums">
                                {formatCurrency(item.balance)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-b border-border">
                            <td className="py-2 pl-4 text-sm font-medium">Subtotal</td>
                            <td className="py-2 text-right text-sm font-semibold tabular-nums">
                              {formatCurrency(category.items.reduce((s, i) => s + i.balance, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                  <div className="border-t-2 border-emerald-500/30 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground">Total Assets</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(balanceSheet.totalAssets)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LIABILITIES & EQUITY */}
            <div className="p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-4 pb-2 border-b border-border">
                Liabilities & Equity
              </h3>
              {balanceSheet.liabilityCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No liability accounts in this period.</p>
              ) : (
                <div className="space-y-6">
                  {balanceSheet.liabilityCategories.map((category) => (
                    <div key={category.label}>
                      <p className="text-sm font-semibold text-foreground/90 mb-2">{category.label}</p>
                      <table className="w-full">
                        <tbody>
                          {category.items.map((item) => (
                            <tr key={item.accountId} className="border-b border-border/50">
                              <td className="py-2 pl-4 text-sm">{item.name}</td>
                              <td className="py-2 text-right text-sm font-medium tabular-nums">
                                {formatCurrency(item.balance)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-b border-border">
                            <td className="py-2 pl-4 text-sm font-medium">Subtotal</td>
                            <td className="py-2 text-right text-sm font-semibold tabular-nums">
                              {formatCurrency(category.items.reduce((s, i) => s + i.balance, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                  <div className="border-t-2 border-rose-500/30 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground">Total Liabilities</span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatCurrency(balanceSheet.totalLiabilities)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-6 border-t-2 border-primary/30 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Total Equity</span>
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      balanceSheet.totalEquity >= 0 ? 'text-primary' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(balanceSheet.totalEquity)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Assets − Liabilities</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && period.startDate && period.endDate && balanceSheet && balanceSheet.totalAssets === 0 && balanceSheet.totalLiabilities === 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No ledger activity in the selected period. Adjust the date range or add ledger entries.</p>
        </div>
      )}
    </div>
  );
}
