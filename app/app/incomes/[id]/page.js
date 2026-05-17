'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  ArrowLeft,
  Download,
  Printer,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Receipt,
  Building2,
  CalendarDays,
  Hash,
  Tag,
  Landmark,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Paperclip,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getUploadedImageUrl, getLogoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';

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

const formatDateShort = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800 ${className}`} />;
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value || value === '-') return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-200 break-words">{value}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          {Icon && <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />}
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{title}</h3>
        </div>
      )}
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

// ── Print HTML ──────────────────────────────────────────────────────────────

const buildPrintHtml = ({ income, college, category, account, student, incomeId }) => {
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
  const statusColor = income.isCancelled ? '#dc2626' : '#059669';
  const statusBg = income.isCancelled ? '#fef2f2' : '#ecfdf5';
  const statusText = income.isCancelled ? 'Cancelled' : 'Active';
  const studentAddress = student?.address ? formatAddress(student.address) : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Income Receipt · ${escapeHtml(receiptNum || income.title || 'Details')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --ink:#0d1117; --ink-2:#374151; --ink-3:#6b7280; --rule:#e5e7eb; --rule-light:#f3f4f6; --accent:#0f766e; --accent-bg:#f0fdfa; --page-bg:#f9fafb; --white:#fff; --mono:'IBM Plex Mono', monospace; --serif:'Playfair Display', Georgia, serif; --sans:'IBM Plex Sans', system-ui, sans-serif; }
    body { font-family: var(--sans); background: var(--page-bg); color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 28px 20px; font-size: 13px; line-height: 1.5; }
    .page { max-width: 720px; margin: 0 auto; background: var(--white); border: 1px solid var(--rule); border-radius: 2px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.07); }
    .accent-bar { height: 3px; background: var(--accent); }
    .header { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 24px; padding: 22px 28px 18px; border-bottom: 1px solid var(--rule); }
    .org-logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .logo-img, .logo-fallback { width: 40px; height: 40px; border-radius: 4px; border: 1px solid #99f6e4; background: var(--accent-bg); display:flex; align-items:center; justify-content:center; flex-shrink: 0; }
    .logo-fallback { font-family: var(--mono); font-size: 18px; color: var(--accent); }
    .org-name { font-family: var(--mono); font-size: 17px; font-weight: 600; color: var(--ink); line-height: 1.2; }
    .org-sub { font-size: 10.5px; color: var(--ink-3); font-weight: 300; margin-top: 1px; }
    .org-contact { font-size: 10px; color: var(--ink-2); margin-top: 5px; line-height: 1.7; }
    .header-right { text-align: right; }
    .doc-type { font-size: 9px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 5px; }
    .voucher-num { font-family: var(--mono); font-size: 20px; font-weight: 500; color: var(--ink); letter-spacing: 0.04em; line-height: 1; margin-bottom: 8px; }
    .status-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:2px; font-size:9px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; }
    .status-badge .dot { width: 5px; height: 5px; border-radius: 50%; }
    .header-date { font-size: 10px; color: var(--ink-2); margin-top: 6px; font-weight: 300; }
    .amount-banner { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--rule); }
    .banner-cell { padding: 14px 28px; } .banner-cell + .banner-cell { border-left: 1px solid var(--rule); } .banner-cell.highlight { background: var(--accent-bg); }
    .bc-label { font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 4px; }
    .banner-cell.highlight .bc-label { color: #0f766e; opacity: 0.7; }
    .bc-value { font-family: var(--mono); font-size: 26px; font-weight: 600; color: var(--ink); line-height: 1; }
    .banner-cell.highlight .bc-value { color: var(--accent); }
    .bc-sub { font-size: 10px; color: var(--ink-2); margin-top: 3px; font-weight: 300; }
    .title-row { padding: 14px 28px 12px; border-bottom: 1px solid var(--rule-light); }
    .income-heading { font-family: var(--mono); font-size: 19px; font-weight: 500; color: var(--ink); line-height: 1.3; }
    .body-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--rule); }
    .body-col { padding: 16px 28px; } .body-col + .body-col { border-left: 1px solid var(--rule); }
    .section-label { font-size: 9px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--rule-light); }
    .recip-name { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
    .recip-line { font-size: 11px; color: var(--ink-3); font-weight: 300; line-height: 1.8; display: flex; align-items: baseline; gap: 6px; }
    .dtable { width: 100%; border-collapse: collapse; } .dtable tr td { padding: 5px 0; border-bottom: 1px dashed var(--rule-light); vertical-align: top; } .dtable tr:last-child td { border-bottom: none; }
    .dtable .dl { font-size: 10.5px; color: var(--ink-2); width: 40%; font-weight: 400; padding-right: 8px; } .dtable .dv { font-size: 11px; color: var(--ink-2); font-weight: 500; } .dtable .dv.mono { font-family: var(--mono); font-size: 10.5px; }
    .notes-row { padding: 12px 28px; border-bottom: 1px solid var(--rule); background: #f0fdfa; }
    .notes-inner-label { font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #0f766e; margin-bottom: 5px; opacity: 0.75; }
    .notes-text { font-size: 11px; color: #134e4a; font-weight: 300; font-style: italic; line-height: 1.65; white-space: pre-wrap; }
    .attach-row { padding: 10px 28px; border-bottom: 1px solid var(--rule); display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; }
    .attach-heading { font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-2); margin-right: 4px; flex-shrink: 0; }
    .attach-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: var(--rule-light); border: 1px solid var(--rule); border-radius: 2px; font-size: 10.5px; color: #0f766e; font-weight: 500; text-decoration: none; }
    .sig-row { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--rule); }
    .sig-cell { padding: 10px 16px 14px; min-height: 72px; display: flex; flex-direction: column; justify-content: flex-end; } .sig-cell + .sig-cell { border-left: 1px solid var(--rule); }
    .sig-line-rule { border-top: 1px solid var(--ink-3); padding-top: 5px; font-size: 9px; font-weight: 600; letter-spacing: 0.04em; color: var(--ink-3); line-height: 1.4; }
    .footer { padding: 10px 28px; display: flex; align-items: center; justify-content: space-between; background: var(--rule-light); }
    .footer-right { font-family: var(--mono); font-size: 9px; font-weight: 500; color: var(--ink-2); letter-spacing: 0.08em; text-transform: uppercase; }
    @media print { body { background:#fff; padding:0; } .page { box-shadow:none; border:none; border-radius:0; } @page { size:A4; margin:0.5cm; } }
  </style>
</head>
<body>
<div class="page">
  <div class="accent-bar"></div>
  <div class="header">
    <div>
      <div class="org-logo-row">
        ${collegeLogoUrl ? `<img class="logo-img" src="${escapeHtml(collegeLogoUrl)}" alt="" />` : `<div class="logo-fallback">₹</div>`}
        <div><div class="org-name">${escapeHtml(collegeName)}</div>${collegeAddress ? `<div class="org-sub">${escapeHtml(collegeAddress)}</div>` : ''}</div>
      </div>
      ${collegeContact ? `<div class="org-contact">${escapeHtml(collegeContact)}</div>` : ''}
    </div>
    <div class="header-right">
      <div class="doc-type">Income Receipt</div>
      <div class="voucher-num">${escapeHtml(receiptNum || income.referenceNumber || incomeId?.slice(-8) || '—')}</div>
      <div><span class="status-badge" style="background:${statusBg};color:${statusColor};"><span class="dot" style="background:${statusColor};"></span>${statusText}</span></div>
      <div class="header-date">Issued: ${escapeHtml(formatDateForDisplay(income.date))}</div>
    </div>
  </div>
  <div class="amount-banner">
    <div class="banner-cell highlight"><div class="bc-label">Amount Received</div><div class="bc-value">${escapeHtml(amountStr)}</div></div>
    <div class="banner-cell"><div class="bc-label">Receipt No.</div><div class="bc-value" style="font-family:var(--mono);font-size:18px;font-weight:500;color:var(--ink-2);">${escapeHtml(receiptNum || income.referenceNumber || incomeId?.slice(-8) || '—')}</div>${income.referenceNumber ? `<div class="bc-sub">Ref: ${escapeHtml(income.referenceNumber)}</div>` : ''}</div>
  </div>
  <div class="title-row"><div class="income-heading">${escapeHtml(income.title || 'Income')}</div></div>
  <div class="body-grid">
    <div class="body-col">
      <div class="section-label">Received From</div>
      ${rec.name ? `<div class="recip-name">${escapeHtml(rec.name)}</div>` : ''}
      ${rec.phone ? `<div class="recip-line"><span>Phone :</span>${escapeHtml(rec.phone)}</div>` : ''}
      ${rec.email ? `<div class="recip-line"><span>Email :</span>${escapeHtml(rec.email)}</div>` : ''}
      ${rec.address ? `<div class="recip-line"><span>Address :</span>${escapeHtml(rec.address)}</div>` : ''}
      ${student ? `<div class="section-label" style="margin-top:14px;">Student</div>
      <div class="recip-name">${escapeHtml(student.name || '-')}</div>
      ${(student.studentId || student.rollNumber) ? `<div class="recip-line"><span>ID :</span>${escapeHtml(student.studentId || student.rollNumber)}</div>` : ''}
      ${courseName ? `<div class="recip-line"><span>Course :</span>${escapeHtml(courseName)}</div>` : ''}
      ${student.phone ? `<div class="recip-line"><span>Phone :</span>${escapeHtml(student.phone)}</div>` : ''}
      ${studentAddress ? `<div class="recip-line"><span>Address :</span>${escapeHtml(studentAddress)}</div>` : ''}` : ''}
    </div>
    <div class="body-col">
      <div class="section-label">Transaction Details</div>
      <table class="dtable">
        <tr><td class="dl">Date</td><td class="dv">${escapeHtml(formatDateForDisplay(income.date))}</td></tr>
        ${category ? `<tr><td class="dl">Category</td><td class="dv">${escapeHtml(category.name)}</td></tr>` : ''}
        ${account ? `<tr><td class="dl">Account</td><td class="dv">${escapeHtml(account.name)}${account.accountNumber ? ` <span style="color:#64748b;">(${escapeHtml(account.accountNumber)})</span>` : ''}</td></tr>` : ''}
        ${income.referenceNumber ? `<tr><td class="dl">Reference No.</td><td class="dv mono">${escapeHtml(income.referenceNumber)}</td></tr>` : ''}
        <tr><td class="dl">Status</td><td class="dv" style="color:${statusColor};">${statusText}</td></tr>
      </table>
    </div>
  </div>
  ${income.notes ? `<div class="notes-row"><div class="notes-inner-label">Notes</div><div class="notes-text">${escapeHtml(income.notes)}</div></div>` : ''}
  ${Array.isArray(income.files) && income.files.length > 0 ? `<div class="attach-row"><span class="attach-heading">Attachments (${income.files.length})</span>${income.files.map((path) => `<a class="attach-chip" href="${escapeHtml(getUploadedImageUrl(path, API_URL))}" target="_blank">📎 ${escapeHtml(path.split('/').pop() || path)}</a>`).join('')}</div>` : ''}

  <div class="footer"><span></span><span class="footer-right">${escapeHtml(collegeName)}</span></div>
</div>
</body>
</html>`;
};

// ── Main Component ──────────────────────────────────────────────────────────

export default function IncomeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const incomeId = params?.id;

  const [income, setIncome] = useState(null);
  const [college, setCollege] = useState(null);
  const [category, setCategory] = useState(null);
  const [account, setAccount] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
  const handleCancelToggle = useCallback(async () => {
    if (!income?._id) return;
    const newCancelled = !income.isCancelled;
    if (!newCancelled && !window.confirm('Restore this income record?')) return;
    if (newCancelled && !window.confirm('Mark this income as cancelled?')) return;
    try {
      setCancelling(true);
      await api.put(`${INCOMES_BASE}/${income._id}`, { isCancelled: newCancelled }, {}, true);
      await fetchIncomeDetails();
    } catch (err) {
      setError(err.message || 'Failed to update income status');
    } finally {
      setCancelling(false);
    }
  }, [income, fetchIncomeDetails]);

  const handlePrint = useCallback(() => {
    if (!income) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow popups to print'); return; }
    const html = buildPrintHtml({ income, college, category, account, student, incomeId });
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  }, [income, college, category, account, student, incomeId]);

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-9 w-9" />
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-3 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonBlock className="h-52 rounded-2xl" />
            <SkeletonBlock className="h-44 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-36 rounded-2xl" />
            <SkeletonBlock className="h-44 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !income) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-center">
          <XCircle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Unable to load income</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error || 'This income record could not be found.'}</p>
        </div>
        <button onClick={() => router.push('/app/finance')} className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><ArrowLeft className="h-4 w-4" />Back to Finance</button>
      </div>
    );
  }

  const hasRecipient = income.recipient && typeof income.recipient === 'object'
    && (income.recipient.name || income.recipient.phone || income.recipient.email || income.recipient.address);
  const recipient = income.recipient && typeof income.recipient === 'object' ? income.recipient : {};
  const courseName = student?.course && typeof student.course === 'object' ? student.course.name : null;
  const receiptNum = formatReceiptNumber(income.serialNumber);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/app/finance/tracking/income')} className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm transition-all duration-150"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">Income Detail</h1>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              <span className="font-mono text-sm text-slate-400 dark:text-slate-500">{receiptNum || income.referenceNumber || incomeId?.slice(-8)}</span>
              {income.isCancelled && <span className="flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400"><XCircle className="h-3 w-3" /> Cancelled</span>}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatDateShort(income.date)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchIncomeDetails} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"><RefreshCcw className="h-3.5 w-3.5" /> Refresh</button>
          <button onClick={handleExportCSV} disabled={exporting} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all duration-150 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all duration-150"><Printer className="h-3.5 w-3.5" /> Print</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-650 to-emerald-700 text-white shadow-lg shadow-emerald-600/20">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-6 top-8 h-32 w-32 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 rounded-full bg-black/10" />
            <div className="relative px-6 pt-6 pb-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center"><Receipt className="h-4 w-4 text-white" /></div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">Income Receipt</span></div>
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${income.isCancelled ? 'bg-white/10 border-white/20 text-red-200' : 'bg-white/15 border-white/25 text-white'}`}>{income.isCancelled ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{income.isCancelled ? 'Cancelled' : 'Active'}</div>
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight mb-5 max-w-sm">{income.title || 'Untitled Income'}</h2>
              <div className="flex items-end justify-between gap-4 pt-4 border-t border-white/15">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300/80 mb-1">Amount Received</p><p className="text-3xl font-bold text-white">{formatCurrency(income.amount ?? 0)}</p></div>
                <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300/80 mb-1">Date</p><p className="text-sm font-semibold text-white">{formatDateShort(income.date)}</p>{(receiptNum || income.referenceNumber) && <p className="text-[11px] font-mono text-emerald-300/70 mt-0.5">#{receiptNum || income.referenceNumber}</p>}</div>
              </div>
            </div>
          </div>

          <SectionCard title="Transaction Details" icon={BarChart3}>
            <InfoRow icon={CalendarDays} label="Date" value={formatDateForDisplay(income.date)} />
            {category && <InfoRow icon={Tag} label="Category" value={category.name + (category.type ? ` · ${category.type}` : '')} />}
            {account && <InfoRow icon={Landmark} label="Account" value={account.name + (account.accountNumber ? ` (${account.accountNumber})` : '')} />}
            {income.referenceNumber && <InfoRow icon={Hash} label="Reference No." value={income.referenceNumber} />}
            {receiptNum && <InfoRow icon={Receipt} label="Receipt No." value={receiptNum} />}
          </SectionCard>

          {hasRecipient && (
            <SectionCard title="Received From" icon={User}>
              {recipient.name && <InfoRow icon={User} label="Name" value={recipient.name} />}
              {recipient.phone && <InfoRow icon={Phone} label="Phone" value={recipient.phone} />}
              {recipient.email && <InfoRow icon={Mail} label="Email" value={recipient.email} />}
              {recipient.address && <InfoRow icon={MapPin} label="Address" value={recipient.address} />}
            </SectionCard>
          )}

          {student && (
            <SectionCard title="Student" icon={User}>
              <InfoRow icon={User} label="Name" value={student.name} />
              <InfoRow icon={Hash} label="Student ID" value={student.studentId || student.rollNumber} />
              <InfoRow icon={Tag} label="Course" value={courseName} />
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Phone" value={student.phone || student.alternatePhone} />
              <InfoRow icon={MapPin} label="Address" value={formatAddress(student.address)} />
            </SectionCard>
          )}

          {income.notes && <SectionCard title="Notes" icon={FileText}><div className="py-4"><p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{income.notes}</p></div></SectionCard>}

          {Array.isArray(income.files) && income.files.length > 0 && (
            <SectionCard title={`Attachments · ${income.files.length}`} icon={Paperclip}>
              <ul className="py-2 space-y-0.5">
                {income.files.map((path, i) => (
                  <li key={`${path}-${i}`} className="py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <a href={getUploadedImageUrl(path, API_URL)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center shrink-0"><Paperclip className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /></div>
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline truncate">{path.split('/').pop() || path}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-2">Total Income</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(income.amount || 0)}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500 dark:text-slate-400">Status</span><span className={`flex items-center gap-1.5 font-semibold ${income.isCancelled ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}><span className={`h-1.5 w-1.5 rounded-full inline-block ${income.isCancelled ? 'bg-red-500' : 'bg-emerald-500'}`} />{income.isCancelled ? 'Cancelled' : 'Active'}</span></div>
              {category && <div className="flex items-center justify-between text-sm gap-3"><span className="text-slate-500 dark:text-slate-400 shrink-0">Category</span><span className="font-medium text-slate-700 dark:text-slate-300 truncate text-right">{category.name}</span></div>}
              {account && <div className="flex items-center justify-between text-sm gap-3"><span className="text-slate-500 dark:text-slate-400 shrink-0">Account</span><span className="font-medium text-slate-700 dark:text-slate-300 truncate text-right">{account.name}</span></div>}
            </div>
          </div>

          {college && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"><Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /><h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Institution</h3></div>
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  {college.logo ? <img src={getLogoUrl(college.logo, API_URL, true)} alt="" className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 object-contain p-1 bg-slate-50 dark:bg-slate-800 shrink-0" /> : <div className="h-10 w-10 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 font-bold text-base shrink-0">₹</div>}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{college.name}</p>
                    {(college.city || college.state) && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{[college.city, college.state].filter(Boolean).join(', ')}</p>}
                    {college.email && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{college.email}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"><Receipt className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /><h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Quick Actions</h3></div>
            <div className="px-4 py-3 space-y-1">
              {[{ icon: Printer, label: 'Print Receipt', onClick: handlePrint, teal: false }, { icon: Download, label: exporting ? 'Exporting…' : 'Export as CSV', onClick: handleExportCSV, disabled: exporting, teal: false }].map(({ icon: Icon, label, onClick, disabled, teal }, i) => (
                <button key={i} onClick={onClick} disabled={disabled} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left group disabled:opacity-50 ${teal ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${teal ? 'bg-emerald-50 dark:bg-emerald-950/30 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/50' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                    <Icon className={`h-3.5 w-3.5 ${teal ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  </div>
                  <span className="font-medium">{label}</span>
                </button>
              ))}
              <PermissionGate moduleKey="finance" action="delete">
                <button
                  type="button"
                  onClick={handleCancelToggle}
                  disabled={cancelling}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left group disabled:opacity-50 ${income.isCancelled ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'}`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${income.isCancelled ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                    <XCircle className={`h-3.5 w-3.5 ${income.isCancelled ? 'text-emerald-500' : 'text-red-500'}`} />
                  </div>
                  <span className="font-medium">{cancelling ? 'Updating…' : income.isCancelled ? 'Restore income' : 'Cancel income'}</span>
                </button>
              </PermissionGate>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-3">Record Info</p>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2"><span className="text-slate-400 dark:text-slate-500">Income ID</span><span className="font-mono text-slate-600 dark:text-slate-400 truncate">{incomeId?.slice(-12)}</span></div>
              {receiptNum && <div className="flex justify-between gap-2"><span className="text-slate-400 dark:text-slate-500">Receipt</span><span className="font-mono font-medium text-slate-700 dark:text-slate-300">{receiptNum}</span></div>}
              {income.referenceNumber && <div className="flex justify-between gap-2"><span className="text-slate-400 dark:text-slate-500">Reference</span><span className="font-mono text-slate-600 dark:text-slate-400 truncate">{income.referenceNumber}</span></div>}
              <div className="flex justify-between gap-2"><span className="text-slate-400 dark:text-slate-500">Generated</span><span className="text-slate-500 dark:text-slate-400">{formatDateShort(new Date())}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}