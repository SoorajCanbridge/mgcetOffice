'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  TrendingDown,
  ArrowLeft,
  Download,
  Printer,
  RefreshCcw,
  Edit2,
  DollarSign,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getUploadedImageUrl, getLogoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const EXPENSES_BASE = '/finance/expenses';

const formatDateForDisplay = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '-';
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

const formatDateForCSV = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const escapeHtml = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

export default function ExpenseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const expenseId = params?.id;
  const printRef = useRef(null);

  const [expense, setExpense] = useState(null);
  const [college, setCollege] = useState(null);
  const [category, setCategory] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchExpenseDetails = useCallback(async () => {
    if (!expenseId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const collegeId = typeof user.college === 'object' ? (user.college._id || user.college.id || '') : String(user.college);
      const [expenseResponse, collegeResponse] = await Promise.all([
        api.get(`${EXPENSES_BASE}/${expenseId}`, {}, true),
        api.get(`/colleges/${collegeId}`, {}, true).catch(() => ({ data: null })),
      ]);
      const data = expenseResponse?.data || expenseResponse;
      setExpense(data);
      const collegeData = collegeResponse?.data || collegeResponse;
      if (collegeData) setCollege(collegeData);

      if (data.category) {
        const categoryId = typeof data.category === 'object' ? data.category._id : data.category;
        if (categoryId) {
          try {
            const categoryResponse = await api.get(`/finance/categories/${categoryId}`, {}, true);
            const categoryData = categoryResponse?.data || categoryResponse;
            setCategory(categoryData);
          } catch (err) {
            console.error('Failed to load category:', err);
            if (typeof data.category === 'object') setCategory(data.category);
          }
        } else if (typeof data.category === 'object') {
          setCategory(data.category);
        }
      }

      if (data.account) {
        const accountId = typeof data.account === 'object' ? data.account._id : data.account;
        if (accountId) {
          try {
            const accountResponse = await api.get(`/finance/accounts/${accountId}`, {}, true);
            const accountData = accountResponse?.data || accountResponse;
            setAccount(accountData);
          } catch (err) {
            console.error('Failed to load account:', err);
            if (typeof data.account === 'object') setAccount(data.account);
          }
        } else if (typeof data.account === 'object') {
          setAccount(data.account);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load expense details');
    } finally {
      setLoading(false);
    }
  }, [expenseId, user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchExpenseDetails();
  }, [user?.college, expenseId, fetchExpenseDetails]);

  const handleExportCSV = useCallback(() => {
    if (!expense) return;
    setExporting(true);
    try {
      const csvRows = [];
      csvRows.push(['Expense Details']);
      csvRows.push([]);
      csvRows.push(['Title', expense.title || '']);
      csvRows.push(['Amount', expense.amount || 0]);
      csvRows.push(['Date', formatDateForCSV(expense.date)]);
      csvRows.push(['Reference Number', expense.referenceNumber || '']);
      csvRows.push(['Status', expense.isCancelled ? 'Cancelled' : 'Active']);
      const rec = expense.recipient && typeof expense.recipient === 'object' ? expense.recipient : {};
      if (rec.name || rec.phone || rec.email || rec.address || expense.vendor) {
        csvRows.push(['Recipient', rec.name || expense.vendor || '']);
        if (rec.phone) csvRows.push(['Recipient Phone', rec.phone]);
        if (rec.email) csvRows.push(['Recipient Email', rec.email]);
        if (rec.address) csvRows.push(['Recipient Address', rec.address]);
      }
      csvRows.push([]);
      if (category) {
        csvRows.push(['Category Information']);
        csvRows.push(['Name', category.name || '']);
        csvRows.push(['Type', category.type || '']);
        csvRows.push([]);
      }
      if (account) {
        csvRows.push(['Account Information']);
        csvRows.push(['Name', account.name || '']);
        csvRows.push(['Account Number', account.accountNumber || '']);
        csvRows.push(['Account Type', account.accountType || '']);
        csvRows.push([]);
      }
      if (expense.notes) csvRows.push(['Notes', expense.notes]);
      const csvContent = csvRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `expense-${expense.title || expenseId}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }, [expense, category, account, expenseId]);

  const handlePrint = useCallback(() => {
    if (!expense) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    const rec = expense.recipient && typeof expense.recipient === 'object' ? expense.recipient : {};
    const hasRec = !!(rec.name || rec.phone || rec.email || rec.address || expense.vendor);
    const collegeName = college?.name || 'College';
    const collegeLogoUrl = college?.logo ? getLogoUrl(college.logo, API_URL, true) : '';
    const collegeAddress = [college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
    const collegeContact = [college?.phone, college?.email, college?.website].filter(Boolean).map((x) => escapeHtml(x)).join(' · ');
    const recipientName = rec.name || expense.vendor || '';

    const receiptHtml = `
    <div style="max-width:21cm;margin:0 auto;background:#fff;color:#0f172a;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;line-height:1.5;font-size:14px;">
      <div style="display:flex;align-items:flex-start;gap:16px;padding:20px 24px 16px;border-bottom:2px solid #dc2626;">
        ${collegeLogoUrl ? `<img src="${escapeHtml(collegeLogoUrl)}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;" />` : `<div style="width:56px;height:56px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;color:#dc2626;font-weight:700;font-size:20px;">₹</div>`}
        <div style="flex:1;">
          <h1 style="font-size:18px;font-weight:700;color:#0f172a;margin:0;">${escapeHtml(collegeName)}</h1>
          ${collegeAddress ? `<p style="font-size:11px;color:#64748b;margin:4px 0 0;">${escapeHtml(collegeAddress)}</p>` : ''}
          ${collegeContact ? `<p style="font-size:11px;color:#64748b;margin:4px 0 0;">${collegeContact}</p>` : ''}
          <p style="font-size:11px;color:#64748b;margin:6px 0 0;font-weight:500;">Expense Voucher</p>
        </div>
        <div style="text-align:right;font-size:11px;color:#64748b;">
          <p style="margin:0;">Voucher # ${escapeHtml(expense.referenceNumber || expenseId?.slice(-8) || '—')}</p>
          <p style="margin:4px 0 0;">${escapeHtml(formatDateForDisplay(expense.date))}</p>
        </div>
      </div>
      <div style="padding:20px 24px;">
        <h2 style="font-size:20px;font-weight:600;color:#b91c1c;margin:0 0 8px;">${escapeHtml(expense.title || 'Expense')}</h2>
        ${expense.isCancelled ? '<p style="margin:0 0 16px;font-size:12px;font-weight:600;color:#dc2626;">CANCELLED</p>' : ''}
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
          <p style="font-size:11px;letter-spacing:0.05em;color:#b91c1c;margin:0 0 4px;">AMOUNT PAID</p>
          <p style="font-size:28px;font-weight:700;color:#b91c1c;margin:0;">${escapeHtml(formatCurrency(expense.amount ?? 0))}</p>
        </div>
        ${hasRec ? `
        <div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;margin-bottom:20px;">
          <p style="font-size:10px;font-weight:600;letter-spacing:0.05em;color:#64748b;margin:0 0 8px;">PAID TO / RECIPIENT</p>
          ${recipientName ? `<p style="font-weight:600;margin:0 0 4px;">${escapeHtml(recipientName)}</p>` : ''}
          ${rec.phone ? `<p style="font-size:12px;color:#475569;margin:0;">${escapeHtml(rec.phone)}</p>` : ''}
          ${rec.email ? `<p style="font-size:12px;color:#475569;margin:0;">${escapeHtml(rec.email)}</p>` : ''}
          ${rec.address ? `<p style="font-size:12px;color:#475569;margin:4px 0 0;">${escapeHtml(rec.address)}</p>` : ''}
        </div>
        ` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
          <tr><td style="padding:6px 0;color:#64748b;width:28%;">Date</td><td style="padding:6px 0;font-weight:500;">${escapeHtml(formatDateForDisplay(expense.date))}</td></tr>
          ${category ? `<tr><td style="padding:6px 0;color:#64748b;">Category</td><td style="padding:6px 0;font-weight:500;">${escapeHtml(category.name)}</td></tr>` : ''}
          ${account ? `<tr><td style="padding:6px 0;color:#64748b;">Account</td><td style="padding:6px 0;font-weight:500;">${escapeHtml(account.name)}${account.accountNumber ? ' (' + escapeHtml(account.accountNumber) + ')' : ''}</td></tr>` : ''}
          ${expense.referenceNumber ? `<tr><td style="padding:6px 0;color:#64748b;">Reference</td><td style="padding:6px 0;font-weight:500;">${escapeHtml(expense.referenceNumber)}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#64748b;">Status</td><td style="padding:6px 0;font-weight:500;">${expense.isCancelled ? 'Cancelled' : 'Active'}</td></tr>
        </table>
        ${expense.notes ? `<p style="font-size:11px;color:#64748b;margin:0 0 4px;">NOTES</p><p style="font-size:13px;margin:0 0 16px;white-space:pre-wrap;color:#334155;">${escapeHtml(expense.notes)}</p>` : ''}
        ${Array.isArray(expense.files) && expense.files.length > 0 ? `<p style="font-size:11px;color:#64748b;margin:0 0 4px;">ATTACHMENTS</p><ul style="font-size:12px;margin:0 0 16px;padding-left:18px;color:#475569;">${expense.files.map((path) => `<li>${escapeHtml(path.split('/').pop() || path)}</li>`).join('')}</ul>` : ''}
      </div>
      <div style="border-top:1px solid #e2e8f0;padding:12px 24px;text-align:center;font-size:11px;color:#94a3b8;">
        <p style="margin:0;">Generated on ${escapeHtml(formatDateForDisplay(new Date()))} · Computer-generated voucher</p>
      </div>
    </div>
    `;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Expense Voucher - ${escapeHtml(expense.title || 'Details')}</title>
          <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #fff; padding: 12px; } @media print { body { padding: 0; } @page { size: A4; margin: 1cm; } }</style>
        </head>
        <body>${receiptHtml}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }, [expense, expenseId, category, account, college]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading expense details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Expense not found'}</p>
            <Button onClick={() => router.push('/app/finance')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Finance
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasRecipient = expense.recipient && typeof expense.recipient === 'object' && (expense.recipient.name || expense.recipient.phone || expense.recipient.email || expense.recipient.address) || expense.vendor;
  const recipient = expense.recipient && typeof expense.recipient === 'object' ? expense.recipient : {};
  const recipientName = recipient.name || expense.vendor || '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/app/finance/tracking/expenses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Expense Voucher</h1>
              {expense.isCancelled && (
                <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">Cancelled</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{expense.referenceNumber || expenseId}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchExpenseDetails()} disabled={loading} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting} className="gap-2">
            <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          {!expense.isCancelled && (
            <Button size="sm" onClick={() => router.push(`/app/finance?editExpense=${expenseId}`)} className="gap-2">
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div
        ref={printRef}
        className="receipt-paper bg-white dark:bg-white text-slate-900 shadow-lg border border-slate-200 rounded-lg print:shadow-none print:border print:rounded-none print:max-w-none overflow-hidden"
        style={{ maxWidth: '21cm' }}
      >
        <div className="flex items-start gap-4 px-6 sm:px-8 py-4 border-b-2 border-red-600">
          {college?.logo ? (
            <img src={getLogoUrl(college.logo, API_URL, true)} alt="" className="h-14 w-14 object-contain rounded-lg border border-slate-200 shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center text-red-600 font-bold text-xl shrink-0">₹</div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{college?.name || 'College'}</h2>
            {(college?.address || college?.city || college?.state || college?.pincode) && (
              <p className="text-xs text-slate-500 mt-1">
                {[college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ')}
              </p>
            )}
            {(college?.phone || college?.email || college?.website) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0 mt-1.5 text-xs text-slate-500">
                {college?.phone && <span>{college.phone}</span>}
                {college?.email && <span>{college.email}</span>}
                {college?.website && <span>{college.website}</span>}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1 font-medium">Expense Voucher</p>
          </div>
          <div className="text-right shrink-0 text-sm">
            <p className="font-medium text-slate-700">Voucher # {expense.referenceNumber || expenseId?.slice(-8) || '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatDateForDisplay(expense.date)}</p>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-5">
          <h3 className="text-xl font-semibold text-red-700">{expense.title || 'Expense'}</h3>
          {expense.isCancelled && <span className="inline-block mt-1 text-xs font-semibold text-red-600">CANCELLED</span>}
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-red-700/90 mb-1">Amount Paid</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-700">{formatCurrency(expense.amount ?? 0)}</p>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-5">
          {hasRecipient && (
            <div className="mb-5">
              <div className="receipt-block rounded-lg border border-slate-200 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Paid To / Recipient</p>
                {recipientName && <p className="font-semibold text-slate-900">{recipientName}</p>}
                {recipient.phone && <p className="text-sm text-slate-600">{recipient.phone}</p>}
                {recipient.email && <p className="text-sm text-slate-600">{recipient.email}</p>}
                {recipient.address && <p className="text-sm text-slate-600 mt-1">{recipient.address}</p>}
              </div>
            </div>
          )}

          <div className="receipt-block text-sm">
            <table className="w-full">
              <tbody>
                <tr><td className="py-1.5 text-slate-500 w-28">Date</td><td className="py-1.5 font-medium">{formatDateForDisplay(expense.date)}</td></tr>
                {category && <tr><td className="py-1.5 text-slate-500">Category</td><td className="py-1.5 font-medium">{category.name}</td></tr>}
                {account && <tr><td className="py-1.5 text-slate-500">Account</td><td className="py-1.5 font-medium">{account.name}{account.accountNumber ? ` (${account.accountNumber})` : ''}</td></tr>}
                {expense.referenceNumber && <tr><td className="py-1.5 text-slate-500">Reference</td><td className="py-1.5 font-medium">{expense.referenceNumber}</td></tr>}
                <tr><td className="py-1.5 text-slate-500">Status</td><td className="py-1.5 font-medium">{expense.isCancelled ? 'Cancelled' : 'Active'}</td></tr>
              </tbody>
            </table>
          </div>

          {expense.notes && (
            <div className="receipt-block mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}

          {Array.isArray(expense.files) && expense.files.length > 0 && (
            <div className="receipt-block mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Attachments</p>
              <ul className="text-sm space-y-0.5">
                {expense.files.map((path, index) => (
                  <li key={`${path}-${index}`}>
                    <a href={getUploadedImageUrl(path, API_URL)} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:underline">
                      {path.split('/').pop() || path}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 sm:px-8 py-3 text-center text-xs text-slate-400">
          Generated on {formatDateForDisplay(new Date())} · Computer-generated voucher
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expense Amount</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(expense.amount || 0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold mt-1 capitalize">{expense.isCancelled ? 'Cancelled' : 'Active'}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-primary opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
