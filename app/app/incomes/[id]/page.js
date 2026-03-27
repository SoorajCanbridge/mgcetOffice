'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  ArrowLeft,
  Download,
  Printer,
  RefreshCcw,
  Edit2,
  DollarSign,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getUploadedImageUrl, getLogoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const INCOMES_BASE = '/finance/incomes';

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

const formatAddress = (addr) => {
  if (!addr || typeof addr !== 'object') return '';
  const parts = [
    addr.street,
    [addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
  ].filter(Boolean);
  return parts.join(', ');
};

const escapeHtml = (s) => {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const formatReceiptNumber = (serialNumber) => {
  if (serialNumber === null || serialNumber === undefined || serialNumber === '') return '';
  const digits = String(serialNumber).replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(5, '0').slice(-5);
};

// ── Sub-components ─────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-border-color last:border-0">
      <span className="text-xs font-medium text-text-tertiary uppercase tracking-widest shrink-0 w-28">{label}</span>
      <span className="text-sm font-medium text-text-secondary text-right">{value}</span>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-xl border border-border-color overflow-hidden bg-bg-primary">
      <div className="bg-bg-secondary border-b border-border-color px-4 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-tertiary">{title}</p>
      </div>
      <div className="px-4 py-3 space-y-1">{children}</div>
    </div>
  );
}

// ── Print HTML ──────────────────────────────────────────────────────────────

const buildPrintHtml = ({ income, college, category, account, student, incomeId, theme }) => {
  const rec = income.recipient && typeof income.recipient === 'object' ? income.recipient : {};
  const hasRec = !!(rec.name || rec.phone || rec.email || rec.address);
  const courseName = student?.course && typeof student.course === 'object' ? student.course.name : null;
  const collegeName = college?.name || 'Institution';
  const collegeLogoUrl = college?.logo ? getLogoUrl(college.logo, API_URL, true) : '';
  const collegeAddressParts = [college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean);
  const collegeAddress = collegeAddressParts.join(' • ');
  const collegeContact = [college?.phone, college?.email, college?.website].filter(Boolean).map(escapeHtml).join(' • ');
  const receiptNum = formatReceiptNumber(income.serialNumber) || '—';
  const amountStr = formatCurrency(income.amount ?? 0);
  const t = theme || {};
  const bgPrimary = t.bgPrimary || '#ffffff';
  const textPrimary = t.textPrimary || '#1a1a1a';
  const textSecondary = t.textSecondary || '#6c757d';
  const textTertiary = t.textTertiary || '#adb5bd';
  const borderColor = t.borderColor || '#dee2e6';
  const success = t.success || '#10b981';
  const error = t.error || '#ef4444';
  const gradStart = t.bgGradientStart || '#667eea';
  const gradEnd = t.bgGradientEnd || '#764ba2';
  const primaryLight = t.primaryLight || '#e7ecff';

  return `
    <div style="max-width:19cm;margin:0 auto;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:${escapeHtml(textPrimary)};background:${escapeHtml(bgPrimary)};">

      <!-- Watermark for cancelled -->
      ${income.isCancelled ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(239,68,68,0.07);letter-spacing:0.1em;pointer-events:none;z-index:0;">CANCELLED</div>` : ''}

      <!-- Header -->
      <div style="padding:28px 28px 22px;background:${escapeHtml(bgPrimary)};color:${escapeHtml(textPrimary)};">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;">
          <div style="display:flex;align-items:flex-start;gap:16px;min-width:0;">
            ${collegeLogoUrl
              ? `<div style="width:54px;height:54px;border-radius:12px;overflow:hidden;border:1px solid ${escapeHtml(borderColor)};background:${escapeHtml(t.bgSecondary || '#f8f9fa')};display:flex;align-items:center;justify-content:center;">
                  <img src="${escapeHtml(collegeLogoUrl)}" alt="" style="width:100%;height:100%;object-fit:contain;" />
                 </div>`
              : `<div style="width:54px;height:54px;border-radius:12px;border:1px solid ${escapeHtml(borderColor)};background:${escapeHtml(primaryLight)};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:${escapeHtml(success)};">
                  ${escapeHtml((college?.name || 'I').charAt(0))}
                 </div>`
            }
            <div style="flex:1;min-width:0;">
              <h1 style="font-size:18px;font-weight:800;margin:0;letter-spacing:-0.01em;color:${escapeHtml(textPrimary)};">${escapeHtml(collegeName)}</h1>
              ${collegeAddress ? `<p style="font-size:10px;color:${escapeHtml(textTertiary)};margin:5px 0 0;">${escapeHtml(collegeAddress)}</p>` : ''}
              ${collegeContact ? `<p style="font-size:10px;color:${escapeHtml(textTertiary)};margin:3px 0 0;">${escapeHtml(collegeContact)}</p>` : ''}
            </div>
          </div>

          <div style="text-align:right;flex-shrink:0;">
            <p style="font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:${escapeHtml(textTertiary)};margin:0 0 8px;">Income Receipt</p>
            <p style="font-size:22px;font-weight:800;color:${escapeHtml(textPrimary)};margin:0;letter-spacing:0.02em;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
              ${escapeHtml(receiptNum)}
            </p>
            <div style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:5px 10px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;border:1px solid ${
              income.isCancelled ? `rgba(239,68,68,0.25)` : `rgba(16,185,129,0.25)`
            };background:${income.isCancelled ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)'};color:${
              income.isCancelled ? 'rgba(239,68,68,1)' : 'rgba(16,185,129,1)'
            };">
              <span style="width:6px;height:6px;border-radius:999px;background:${
                income.isCancelled ? 'rgba(239,68,68,1)' : 'rgba(16,185,129,1)'
              };"></span>
              ${income.isCancelled ? 'Cancelled' : 'Active'}
            </div>
            <p style="font-size:10px;color:${escapeHtml(textTertiary)};margin:8px 0 0;">${escapeHtml(formatDateForDisplay(income.date))}</p>
          </div>
        </div>
        <!-- Thin accent line -->
        <div style="height:1px;background:linear-gradient(90deg,transparent,${escapeHtml(borderColor)},transparent);margin-top:22px;"></div>
      </div>

      <!-- Body -->
      <div style="padding:24px 28px;">

        <!-- Title + Amount -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid ${escapeHtml(borderColor)};">
          <div>
            <p style="font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:${escapeHtml(textTertiary)};margin:0 0 6px;">Description</p>
            <h2 style="font-size:17px;font-weight:600;color:${escapeHtml(textPrimary)};margin:0 0 4px;">${escapeHtml(income.title || 'Income')}</h2>
            ${income.isCancelled ? `<span style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${escapeHtml(error)};background:rgba(239,68,68,0.10);padding:2px 8px;border-radius:999px;border:1px solid rgba(239,68,68,0.22);">Cancelled</span>` : `<span style="font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${escapeHtml(success)};background:rgba(16,185,129,0.10);padding:2px 8px;border-radius:999px;border:1px solid rgba(16,185,129,0.22);">Active</span>`}
          </div>
          <div style="text-align:right;background:${escapeHtml(primaryLight)};border:1px solid ${escapeHtml(borderColor)};border-radius:10px;padding:12px 18px;">
            <p style="font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:${escapeHtml(textSecondary)};margin:0 0 4px;">Amount Received</p>
            <p style="font-size:24px;font-weight:700;color:${escapeHtml(textPrimary)};margin:0;letter-spacing:-0.02em;">${escapeHtml(amountStr)}</p>
          </div>
        </div>

        <!-- Recipient + Student -->
        ${(hasRec || student) ? `
        <div style="display:grid;grid-template-columns:${hasRec && student ? '1fr 1fr' : '1fr'};gap:14px;margin-bottom:22px;">
          ${hasRec ? `
          <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:6px 12px;">
              <p style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;margin:0;">Received From</p>
            </div>
            <div style="padding:10px 12px;">
              ${rec.name ? `<p style="font-weight:600;color:#0f172a;font-size:13px;margin:0 0 4px;">${escapeHtml(rec.name)}</p>` : ''}
              ${rec.phone ? `<p style="font-size:11px;color:#64748b;margin:0;">${escapeHtml(rec.phone)}</p>` : ''}
              ${rec.email ? `<p style="font-size:11px;color:#64748b;margin:0;">${escapeHtml(rec.email)}</p>` : ''}
              ${rec.address ? `<p style="font-size:11px;color:#64748b;margin:4px 0 0;">${escapeHtml(rec.address)}</p>` : ''}
            </div>
          </div>` : ''}
          ${student ? `
          <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:6px 12px;">
              <p style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;margin:0;">Student</p>
            </div>
            <div style="padding:10px 12px;">
              <p style="font-weight:600;color:#0f172a;font-size:13px;margin:0 0 4px;">${escapeHtml(student.name || '')}</p>
              ${(student.studentId || student.rollNumber) ? `<p style="font-size:11px;color:#64748b;margin:0;">ID: ${escapeHtml(student.studentId || student.rollNumber)}</p>` : ''}
              ${courseName ? `<p style="font-size:11px;color:#64748b;margin:0;">${escapeHtml(courseName)}</p>` : ''}
              ${student.email ? `<p style="font-size:11px;color:#64748b;margin:0;">${escapeHtml(student.email)}</p>` : ''}
              ${student.phone ? `<p style="font-size:11px;color:#64748b;margin:0;">${escapeHtml(student.phone)}</p>` : ''}
              ${student.address && formatAddress(student.address) ? `<p style="font-size:11px;color:#64748b;margin:4px 0 0;">${escapeHtml(formatAddress(student.address))}</p>` : ''}
            </div>
          </div>` : ''}
        </div>` : ''}

        <!-- Transaction details -->
        <div style="margin-bottom:20px;">
          <p style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px;">Transaction Details</p>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:7px 0;color:#64748b;width:30%;">Date</td><td style="padding:7px 0;font-weight:500;color:#1e293b;">${escapeHtml(formatDateForDisplay(income.date))}</td></tr>
            ${category ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:7px 0;color:#64748b;">Category</td><td style="padding:7px 0;font-weight:500;color:#1e293b;">${escapeHtml(category.name)}</td></tr>` : ''}
            ${account ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:7px 0;color:#64748b;">Account</td><td style="padding:7px 0;font-weight:500;color:#1e293b;">${escapeHtml(account.name)}${account.accountNumber ? ` <span style="color:#94a3b8;">(${escapeHtml(account.accountNumber)})</span>` : ''}</td></tr>` : ''}
            ${income.referenceNumber ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:7px 0;color:#64748b;">Reference #</td><td style="padding:7px 0;font-weight:500;color:#1e293b;font-family:monospace;">${escapeHtml(income.referenceNumber)}</td></tr>` : ''}
            <tr><td style="padding:7px 0;color:#64748b;">Status</td><td style="padding:7px 0;"><span style="font-weight:600;color:${income.isCancelled ? '#ef4444' : '#059669'};">${income.isCancelled ? 'Cancelled' : 'Active'}</span></td></tr>
          </table>
        </div>

        ${income.notes ? `
        <div style="background:#f8fafc;border-left:3px solid #10b981;border-radius:0 6px 6px 0;padding:10px 14px;margin-bottom:16px;">
          <p style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;margin:0 0 5px;">Notes</p>
          <p style="font-size:12px;color:#475569;margin:0;white-space:pre-wrap;">${escapeHtml(income.notes)}</p>
        </div>` : ''}

        ${Array.isArray(income.files) && income.files.length > 0 ? `
        <div style="margin-top:12px;">
          <p style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;margin:0 0 6px;">Attachments (${income.files.length})</p>
          ${income.files.map(path => `<p style="font-size:11px;color:#0284c7;margin:2px 0;">${escapeHtml(path.split('/').pop() || path)}</p>`).join('')}
        </div>` : ''}
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #e2e8f0;padding:12px 28px;display:flex;justify-content:space-between;align-items:center;">
        <p style="font-size:10px;color:#94a3b8;margin:0;">Generated on ${escapeHtml(formatDateForDisplay(new Date()))}</p>
        <p style="font-size:10px;color:#cbd5e1;margin:0;">Computer-generated receipt • Not a tax invoice</p>
      </div>
    </div>
  `;
};

// ── Main Component ──────────────────────────────────────────────────────────

export default function IncomeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const incomeId = params?.id;
  const printRef = useRef(null);

  const [income, setIncome] = useState(null);
  const [college, setCollege] = useState(null);
  const [category, setCategory] = useState(null);
  const [account, setAccount] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchIncomeDetails = useCallback(async () => {
    if (!incomeId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const collegeId = typeof user.college === 'object' ? (user.college._id || user.college.id || '') : String(user.college);
      const [incomeResponse, collegeResponse] = await Promise.all([
        api.get(`${INCOMES_BASE}/${incomeId}`, {}, true),
        api.get(`/colleges/${collegeId}`, {}, true).catch(() => ({ data: null })),
      ]);
      const data = incomeResponse?.data || incomeResponse;
      setIncome(data);
      const collegeData = collegeResponse?.data || collegeResponse;
      if (collegeData) setCollege(collegeData);

      if (data.category) {
        const categoryId = typeof data.category === 'object' ? data.category._id : data.category;
        if (categoryId) {
          try {
            const res = await api.get(`/finance/categories/${categoryId}`, {}, true);
            setCategory(res?.data || res);
          } catch {
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
            const res = await api.get(`/finance/accounts/${accountId}`, {}, true);
            setAccount(res?.data || res);
          } catch {
            if (typeof data.account === 'object') setAccount(data.account);
          }
        } else if (typeof data.account === 'object') {
          setAccount(data.account);
        }
      }

      if (data.student) {
        const studentId = typeof data.student === 'object' ? data.student._id : data.student;
        if (studentId) {
          try {
            const res = await api.get(`/students/${studentId}`, {}, true);
            setStudent(res?.data || res);
          } catch {
            if (typeof data.student === 'object') setStudent(data.student);
          }
        } else if (typeof data.student === 'object') {
          setStudent(data.student);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load income details');
    } finally {
      setLoading(false);
    }
  }, [incomeId, user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchIncomeDetails();
  }, [user?.college, incomeId, fetchIncomeDetails]);

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (!income) return;
    setExporting(true);
    try {
      const csvRows = [
        ['Income Details'],
        [],
        ['Title', income.title || ''],
        ['Amount', income.amount || 0],
        ['Date', formatDateForCSV(income.date)],
        ['Reference Number', income.referenceNumber || ''],
        ['Status', income.isCancelled ? 'Cancelled' : 'Active'],
      ];
      const rec = income.recipient && typeof income.recipient === 'object' ? income.recipient : {};
      if (rec.name || rec.phone || rec.email || rec.address) {
        csvRows.push(['Recipient', rec.name || '']);
        if (rec.phone) csvRows.push(['Recipient Phone', rec.phone]);
        if (rec.email) csvRows.push(['Recipient Email', rec.email]);
        if (rec.address) csvRows.push(['Recipient Address', rec.address]);
      }
      csvRows.push([]);
      if (category) {
        csvRows.push(['Category Information'], ['Name', category.name || ''], ['Type', category.type || ''], []);
      }
      if (account) {
        csvRows.push(['Account Information'], ['Name', account.name || ''], ['Account Number', account.accountNumber || ''], ['Account Type', account.accountType || ''], []);
      }
      if (student) {
        csvRows.push(['Student Information'], ['Name', student.name || ''], ['Student ID', student.studentId || student.rollNumber || ''], []);
      }
      if (income.notes) csvRows.push(['Notes', income.notes]);

      const csvContent = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `income-${income.title || incomeId}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }, [income, category, account, student, incomeId]);

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    if (!income) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow popups to print'); return; }

    // Read theme variables so print matches app theme.
    const css = getComputedStyle(document.documentElement);
    const theme = {
      bgPrimary: css.getPropertyValue('--bg-primary')?.trim(),
      textPrimary: css.getPropertyValue('--text-primary')?.trim(),
      textSecondary: css.getPropertyValue('--text-secondary')?.trim(),
      textTertiary: css.getPropertyValue('--text-tertiary')?.trim(),
      borderColor: css.getPropertyValue('--border-color')?.trim(),
      bgGradientStart: css.getPropertyValue('--bg-gradient-start')?.trim(),
      bgGradientEnd: css.getPropertyValue('--bg-gradient-end')?.trim(),
      success: css.getPropertyValue('--success')?.trim(),
      error: css.getPropertyValue('--error')?.trim(),
      primaryLight: css.getPropertyValue('--primary-light')?.trim(),
    };

    const html = buildPrintHtml({ income, college, category, account, student, incomeId, theme });
    printWindow.document.write(`
      <!DOCTYPE html><html>
      <head>
        <title>Receipt #${escapeHtml(formatReceiptNumber(income.serialNumber) || income.title || 'Details')}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box;}
          body{background:#fff;padding:0;}
          @media print{body{padding:0;}@page{size:A4;margin:0.8cm;}}
        </style>
      </head>
      <body>${html}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }, [income, college, category, account, student, incomeId]);

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-border-color" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[color:var(--primary)] animate-spin" />
          </div>
          <p className="text-sm text-text-tertiary tracking-wide">Loading receipt…</p>
        </div>
      </div>
    );
  }

  if (error || !income) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-text-secondary">{error || 'Income not found'}</p>
          <Button onClick={() => router.push('/app/finance')} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Finance
          </Button>
        </div>
      </div>
    );
  }

  const hasRecipient = income.recipient && typeof income.recipient === 'object'
    && (income.recipient.name || income.recipient.phone || income.recipient.email || income.recipient.address);
  const recipient = income.recipient && typeof income.recipient === 'object' ? income.recipient : {};
  const courseName = student?.course && typeof student.course === 'object' ? student.course.name : null;
  const receiptNum = formatReceiptNumber(income.serialNumber);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border-color hover:bg-bg-secondary text-text-secondary"
            onClick={() => router.push('/app/finance/tracking/income')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">Income Receipt</h1>
              {income.isCancelled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--error)]/10 border-[color:var(--error)]/25 px-2.5 py-0.5 text-xs font-semibold text-[color:var(--error)]">
                  <XCircle className="w-3 h-3" /> Cancelled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--success)]/10 border-[color:var(--success)]/25 px-2.5 py-0.5 text-xs font-semibold text-[color:var(--success)]">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-text-tertiary font-mono mt-0.5">
              {receiptNum ? `#${receiptNum}` : income.referenceNumber || incomeId}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchIncomeDetails}
            disabled={loading}
            className="gap-1.5 h-9 text-text-secondary border-border-color hover:bg-bg-secondary"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting}
            className="gap-1.5 h-9 text-text-secondary border-border-color hover:bg-bg-secondary"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 h-9 text-text-secondary border-border-color hover:bg-bg-secondary"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          
        </div>
      </div>

      {/* ── Receipt Card ────────────────────────────────────────────────── */}
      <div
        ref={printRef}
        className="bg-bg-primary text-text-primary rounded-xl overflow-hidden shadow-md border border-border-color print:shadow-none print:rounded-none"
      >
        {/* Header — Payment Receipt-style */}
        <div className="px-8 pt-8 pb-7 border-b border-border-color">
          <div className="flex items-start justify-between gap-6">
            {/* Brand */}
            <div className="flex items-start gap-4 min-w-0">
              {college?.logo ? (
                <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-bg-secondary border border-border-color flex items-center justify-center">
                  <img src={getLogoUrl(college.logo, API_URL, true)} alt={college?.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary-light border border-border-color flex items-center justify-center text-[color:var(--success)] font-bold text-2xl font-serif">
                  {(college?.name || 'I').charAt(0)}
                </div>
              )}
              <div className="min-w-0 pt-0.5">
                <h2 className="text-lg font-bold text-text-primary leading-tight">{college?.name || 'Institution Name'}</h2>
                {(college?.address || college?.city) && (
                  <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                    {[college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' • ')}
                  </p>
                )}
                {(college?.phone || college?.email || college?.website) && (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {college?.phone && <span className="text-xs text-text-tertiary">{college.phone}</span>}
                    {college?.email && <span className="text-xs text-text-tertiary">{college.email}</span>}
                    {college?.website && <span className="text-xs text-text-tertiary">{college.website}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Receipt identity */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] font-bold tracking-[0.15em] text-text-tertiary uppercase mb-1">Income Receipt</p>
              <p className="text-2xl font-bold text-text-primary tabular-nums">{receiptNum || '—'}</p>
              <span
                className={`inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${
                  income.isCancelled
                    ? 'bg-[color:var(--error)]/10 border-[color:var(--error)]/25 text-[color:var(--error)]'
                    : 'bg-[color:var(--success)]/10 border-[color:var(--success)]/25 text-[color:var(--success)]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    income.isCancelled ? 'bg-[color:var(--error)]' : 'bg-[color:var(--success)]'
                  }`}
                />
                {income.isCancelled ? 'Cancelled' : 'Active'}
              </span>
              <p className="text-xs text-text-tertiary mt-2">{formatDateForDisplay(income.date)}</p>
            </div>
          </div>

          {/* Thin accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-[color:var(--border-color-hover)] to-transparent mt-5" />
        </div>

        {/* Body */}
        <div className="px-6 sm:px-8 py-6 space-y-6">

          {/* Title + Amount row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Description</p>
              <h3 className="text-xl font-bold text-text-primary leading-tight">{income.title || 'Income'}</h3>
            </div>

            <div className="sm:text-right bg-primary-light border border-border-color rounded-xl px-5 py-4 shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1.5">Amount Received</p>
              <p className="text-3xl font-bold text-text-primary leading-none tracking-tight">
                {formatCurrency(income.amount ?? 0)}
              </p>
            </div>
          </div>

          {/* Recipient + Student */}
          {(hasRecipient || student) && (
            <div className={`grid gap-4 ${hasRecipient && student ? 'sm:grid-cols-2' : ''}`}>
              {hasRecipient && (
                <InfoCard title="Received From">
                  {recipient.name && <p className="text-sm font-semibold text-text-primary">{recipient.name}</p>}
                  {recipient.phone && <p className="text-sm text-text-secondary">{recipient.phone}</p>}
                  {recipient.email && <p className="text-sm text-text-secondary">{recipient.email}</p>}
                  {recipient.address && <p className="text-sm text-text-secondary mt-1">{recipient.address}</p>}
                </InfoCard>
              )}
              {student && (
                <InfoCard title="Student">
                  <p className="text-sm font-semibold text-text-primary">{student.name}</p>
                  {(student.studentId || student.rollNumber) && (
                    <p className="text-sm text-text-secondary">ID: {student.studentId || student.rollNumber}</p>
                  )}
                  {courseName && <p className="text-sm text-text-secondary">{courseName}</p>}
                  {student.email && <p className="text-sm text-text-secondary">{student.email}</p>}
                  {student.phone && <p className="text-sm text-text-secondary">{student.phone}</p>}
                  {student.alternatePhone && <p className="text-sm text-text-secondary">{student.alternatePhone}</p>}
                  {student.address && formatAddress(student.address) && (
                    <p className="text-sm text-text-secondary mt-1">{formatAddress(student.address)}</p>
                  )}
                </InfoCard>
              )}
            </div>
          )}

          {/* Transaction details */}
          <div className="rounded-xl border border-border-color overflow-hidden bg-bg-primary">
            <div className="bg-bg-secondary border-b border-border-color px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-tertiary">Transaction Details</p>
            </div>
            <div className="px-4 divide-y divide-border-color">
              <DetailRow label="Date" value={formatDateForDisplay(income.date)} />
              {category && <DetailRow label="Category" value={category.name} />}
              {account && (
                <DetailRow
                  label="Account"
                  value={`${account.name}${account.accountNumber ? ` (${account.accountNumber})` : ''}`}
                />
              )}
              {income.referenceNumber && (
                <div className="flex items-baseline justify-between py-2.5 border-b border-border-color last:border-0">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-widest shrink-0 w-28">Reference</span>
                  <span className="text-sm font-mono font-medium text-text-secondary text-right">{income.referenceNumber}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between py-2.5">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-widest shrink-0 w-28">Status</span>
                <span className={`text-sm font-semibold ${income.isCancelled ? 'text-[color:var(--error)]' : 'text-[color:var(--success)]'}`}>
                  {income.isCancelled ? 'Cancelled' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {income.notes && (
            <div className="rounded-xl bg-bg-secondary border-l-4 border-[color:var(--success)] pl-4 pr-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-tertiary mb-1.5">Notes</p>
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{income.notes}</p>
            </div>
          )}

          {/* Attachments */}
          {Array.isArray(income.files) && income.files.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-tertiary mb-2">
                Attachments ({income.files.length})
              </p>
              <div className="space-y-1.5">
                {income.files.map((path, index) => (
                  <a
                    key={`${path}-${index}`}
                    href={getUploadedImageUrl(path, API_URL)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[color:var(--primary)] hover:underline"
                  >
                    <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    {path.split('/').pop() || path}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-color px-6 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-2 bg-bg-secondary">
          <p className="text-[11px] text-text-tertiary">
            Generated on {formatDateForDisplay(new Date())}
          </p>
          <p className="text-[11px] text-text-tertiary">Computer-generated receipt • Not a tax invoice</p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
        <div className="rounded-xl bg-bg-primary border border-border-color shadow-sm p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary-light border border-border-color flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-[color:var(--success)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Income Amount</p>
            <p className="text-xl font-bold text-text-primary mt-0.5 leading-tight">
              {formatCurrency(income.amount || 0)}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-bg-primary border border-border-color shadow-sm p-5 flex items-center gap-4">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${income.isCancelled ? 'bg-[color:var(--error)]/10 border border-[color:var(--error)]/20' : 'bg-bg-secondary border border-border-color'}`}>
            {income.isCancelled
              ? <XCircle className="h-5 w-5 text-red-500" />
              : <CheckCircle2 className="h-5 w-5 text-[color:var(--success)]" />
            }
          </div>
          <div>
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Status</p>
            <p className={`text-xl font-bold mt-0.5 leading-tight ${income.isCancelled ? 'text-[color:var(--error)]' : 'text-text-primary'}`}>
              {income.isCancelled ? 'Cancelled' : 'Active'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}