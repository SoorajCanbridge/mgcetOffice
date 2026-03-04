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

      // Fetch category details if available
      if (data.category) {
        const categoryId = typeof data.category === 'object' ? data.category._id : data.category;
        if (categoryId) {
          try {
            const categoryResponse = await api.get(`/finance/categories/${categoryId}`, {}, true);
            const categoryData = categoryResponse?.data || categoryResponse;
            setCategory(categoryData);
          } catch (err) {
            console.error('Failed to load category:', err);
            if (typeof data.category === 'object') {
              setCategory(data.category);
            }
          }
        } else if (typeof data.category === 'object') {
          setCategory(data.category);
        }
      }

      // Fetch account details if available
      if (data.account) {
        const accountId = typeof data.account === 'object' ? data.account._id : data.account;
        if (accountId) {
          try {
            const accountResponse = await api.get(`/finance/accounts/${accountId}`, {}, true);
            const accountData = accountResponse?.data || accountResponse;
            setAccount(accountData);
          } catch (err) {
            console.error('Failed to load account:', err);
            if (typeof data.account === 'object') {
              setAccount(data.account);
            }
          }
        } else if (typeof data.account === 'object') {
          setAccount(data.account);
        }
      }

      // Fetch student details if available
      if (data.student) {
        const studentId = typeof data.student === 'object' ? data.student._id : data.student;
        if (studentId) {
          try {
            const studentResponse = await api.get(`/students/${studentId}`, {}, true);
            const studentData = studentResponse?.data || studentResponse;
            setStudent(studentData);
          } catch (err) {
            console.error('Failed to load student:', err);
            if (typeof data.student === 'object') {
              setStudent(data.student);
            }
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

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    if (!income) return;
    setExporting(true);
    try {
      const csvRows = [];
      
      csvRows.push(['Income Details']);
      csvRows.push([]);
      
      csvRows.push(['Title', income.title || '']);
      csvRows.push(['Amount', income.amount || 0]);
      csvRows.push(['Date', formatDateForCSV(income.date)]);
      csvRows.push(['Reference Number', income.referenceNumber || '']);
      csvRows.push(['Status', income.isCancelled ? 'Cancelled' : 'Active']);
      if (income.recipient && typeof income.recipient === 'object' && (income.recipient.name || income.recipient.phone || income.recipient.email || income.recipient.address)) {
        csvRows.push(['Recipient', income.recipient.name || '']);
        if (income.recipient.phone) csvRows.push(['Recipient Phone', income.recipient.phone]);
        if (income.recipient.email) csvRows.push(['Recipient Email', income.recipient.email]);
        if (income.recipient.address) csvRows.push(['Recipient Address', income.recipient.address]);
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
      
      if (student) {
        csvRows.push(['Student Information']);
        csvRows.push(['Name', student.name || '']);
        csvRows.push(['Student ID', student.studentId || student.rollNumber || '']);
        csvRows.push([]);
      }
      
      if (income.notes) {
        csvRows.push(['Notes', income.notes]);
      }
      
      const csvContent = csvRows.map((row) => 
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `income-${income.title || incomeId}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  }, [income, category, account, student, incomeId]);

  // Print function — receipt with college header and optimized layout
  const handlePrint = useCallback(() => {
    if (!income) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    const rec = income.recipient && typeof income.recipient === 'object' ? income.recipient : {};
    const hasRec = !!(rec.name || rec.phone || rec.email || rec.address);
    const courseName = student?.course && (typeof student.course === 'object' ? student.course.name : null);
    const collegeName = college?.name || 'College';
    const collegeLogoUrl = college?.logo ? getLogoUrl(college.logo, API_URL, true) : '';
    const collegeAddress = [college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
    const collegeContact = [college?.phone, college?.email, college?.website].filter(Boolean).map((x) => escapeHtml(x)).join(' · ');

    const receiptHtml = `
    <div style="max-width:21cm;margin:0 auto;background:#fff;color:#0f172a;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;line-height:1.5;font-size:14px;">
      <!-- College header -->
      <div style="display:flex;align-items:flex-start;gap:16px;padding:20px 24px 16px;border-bottom:2px solid #059669;">
        ${collegeLogoUrl ? `<img src="${escapeHtml(collegeLogoUrl)}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;" />` : `<div style="width:56px;height:56px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;display:flex;align-items:center;justify-content:center;color:#059669;font-weight:700;font-size:20px;">₹</div>`}
        <div style="flex:1;">
          <h1 style="font-size:18px;font-weight:700;color:#0f172a;margin:0;">${escapeHtml(collegeName)}</h1>
          ${collegeAddress ? `<p style="font-size:11px;color:#64748b;margin:4px 0 0;">${escapeHtml(collegeAddress)}</p>` : ''}
          ${collegeContact ? `<p style="font-size:11px;color:#64748b;margin:4px 0 0;">${collegeContact}</p>` : ''}
          <p style="font-size:11px;color:#64748b;margin:6px 0 0;font-weight:500;">Income Receipt</p>
        </div>
        <div style="text-align:right;font-size:11px;color:#64748b;">
          <p style="margin:0;">Receipt # ${escapeHtml(income.referenceNumber || incomeId?.slice(-8) || '—')}</p>
          <p style="margin:4px 0 0;">${escapeHtml(formatDateForDisplay(income.date))}</p>
        </div>
      </div>

      <!-- Title & amount -->
      <div style="padding:20px 24px;">
        <h2 style="font-size:20px;font-weight:600;color:#047857;margin:0 0 8px;">${escapeHtml(income.title || 'Income')}</h2>
        ${income.isCancelled ? '<p style="margin:0 0 16px;font-size:12px;font-weight:600;color:#dc2626;">CANCELLED</p>' : ''}
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
          <p style="font-size:11px;letter-spacing:0.05em;color:#047857;margin:0 0 4px;">AMOUNT RECEIVED</p>
          <p style="font-size:28px;font-weight:700;color:#047857;margin:0;">${escapeHtml(formatCurrency(income.amount ?? 0))}</p>
        </div>

        <!-- Recipient & Student -->
        ${(hasRec || student) ? `
        <div style="display:grid;grid-template-columns:${hasRec && student ? '1fr 1fr' : '1fr'};gap:16px;margin-bottom:20px;">
          ${hasRec ? `
          <div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;">
            <p style="font-size:10px;font-weight:600;letter-spacing:0.05em;color:#64748b;margin:0 0 8px;">RECEIVED FROM</p>
            ${rec.name ? `<p style="font-weight:600;margin:0 0 4px;">${escapeHtml(rec.name)}</p>` : ''}
            ${rec.phone ? `<p style="font-size:12px;color:#475569;margin:0;">${escapeHtml(rec.phone)}</p>` : ''}
            ${rec.email ? `<p style="font-size:12px;color:#475569;margin:0;">${escapeHtml(rec.email)}</p>` : ''}
            ${rec.address ? `<p style="font-size:12px;color:#475569;margin:4px 0 0;">${escapeHtml(rec.address)}</p>` : ''}
          </div>
          ` : ''}
          ${student ? `
          <div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;">
            <p style="font-size:10px;font-weight:600;letter-spacing:0.05em;color:#64748b;margin:0 0 8px;">STUDENT</p>
            <p style="font-weight:600;margin:0 0 4px;">${escapeHtml(student.name || '')}</p>
            ${(student.studentId || student.rollNumber) ? `<p style="font-size:12px;color:#475569;margin:0;">ID: ${escapeHtml(student.studentId || student.rollNumber)}</p>` : ''}
            ${courseName ? `<p style="font-size:12px;color:#475569;margin:0;">${escapeHtml(courseName)}</p>` : ''}
            ${student.email ? `<p style="font-size:12px;color:#475569;margin:0;">${escapeHtml(student.email)}</p>` : ''}
            ${student.phone ? `<p style="font-size:12px;color:#475569;margin:0;">${escapeHtml(student.phone)}</p>` : ''}
            ${student.address && formatAddress(student.address) ? `<p style="font-size:12px;color:#475569;margin:4px 0 0;">${escapeHtml(formatAddress(student.address))}</p>` : ''}
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Payment details table -->
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
          <tr><td style="padding:6px 0;color:#64748b;width:28%;">Date</td><td style="padding:6px 0;font-weight:500;">${escapeHtml(formatDateForDisplay(income.date))}</td></tr>
          ${category ? `<tr><td style="padding:6px 0;color:#64748b;">Category</td><td style="padding:6px 0;font-weight:500;">${escapeHtml(category.name)}</td></tr>` : ''}
          ${account ? `<tr><td style="padding:6px 0;color:#64748b;">Account</td><td style="padding:6px 0;font-weight:500;">${escapeHtml(account.name)}${account.accountNumber ? ' (' + escapeHtml(account.accountNumber) + ')' : ''}</td></tr>` : ''}
          ${income.referenceNumber ? `<tr><td style="padding:6px 0;color:#64748b;">Reference</td><td style="padding:6px 0;font-weight:500;">${escapeHtml(income.referenceNumber)}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#64748b;">Status</td><td style="padding:6px 0;font-weight:500;">${income.isCancelled ? 'Cancelled' : 'Active'}</td></tr>
        </table>

        ${income.notes ? `<p style="font-size:11px;color:#64748b;margin:0 0 4px;">NOTES</p><p style="font-size:13px;margin:0 0 16px;white-space:pre-wrap;color:#334155;">${escapeHtml(income.notes)}</p>` : ''}
        ${Array.isArray(income.files) && income.files.length > 0 ? `<p style="font-size:11px;color:#64748b;margin:0 0 4px;">ATTACHMENTS</p><ul style="font-size:12px;margin:0 0 16px;padding-left:18px;color:#475569;">${income.files.map((path) => `<li>${escapeHtml(path.split('/').pop() || path)}</li>`).join('')}</ul>` : ''}
      </div>

      <div style="border-top:1px solid #e2e8f0;padding:12px 24px;text-align:center;font-size:11px;color:#94a3b8;">
        <p style="margin:0;">Generated on ${escapeHtml(formatDateForDisplay(new Date()))} · Computer-generated receipt</p>
      </div>
    </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Income Receipt - ${escapeHtml(income.title || 'Details')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #fff; padding: 12px; }
            @media print { body { padding: 0; } @page { size: A4; margin: 1cm; } }
          </style>
        </head>
        <body>${receiptHtml}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }, [income, incomeId, category, account, student, college]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading income details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !income) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Income not found'}</p>
            <Button onClick={() => router.push('/app/finance')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Finance
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasRecipient = income.recipient && typeof income.recipient === 'object' && (income.recipient.name || income.recipient.phone || income.recipient.email || income.recipient.address);
  const recipient = income.recipient && typeof income.recipient === 'object' ? income.recipient : {};
  const courseName = student?.course && (typeof student.course === 'object' ? student.course.name : null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toolbar — no print */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/app/finance/tracking/income')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Income Receipt</h1>
              {income.isCancelled && (
                <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                  Cancelled
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{income.referenceNumber || incomeId}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchIncomeDetails()} disabled={loading} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          {!income.isCancelled && (
            <Button size="sm" onClick={() => router.push(`/app/finance?editIncome=${incomeId}`)} className="gap-2">
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Receipt — printable, with college header */}
      <div
        ref={printRef}
        className="receipt-paper bg-white dark:bg-white text-slate-900 shadow-lg border border-slate-200 rounded-lg print:shadow-none print:border print:rounded-none print:max-w-none overflow-hidden"
        style={{ maxWidth: '21cm' }}
      >
        {/* College header */}
        <div className="flex items-start gap-4 px-6 sm:px-8 py-4 border-b-2 border-emerald-600">
          {college?.logo ? (
            <img
              src={getLogoUrl(college.logo, API_URL, true)}
              alt=""
              className="h-14 w-14 object-contain rounded-lg border border-slate-200 shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xl shrink-0">
              ₹
            </div>
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
            <p className="text-xs text-slate-500 mt-1 font-medium">Income Receipt</p>
          </div>
          <div className="text-right shrink-0 text-sm">
            <p className="font-medium text-slate-700">Receipt # {income.referenceNumber || incomeId?.slice(-8) || '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatDateForDisplay(income.date)}</p>
          </div>
        </div>

        {/* Title & amount */}
        <div className="px-6 sm:px-8 py-5">
          <h3 className="text-xl font-semibold text-emerald-700">{income.title || 'Income'}</h3>
          {income.isCancelled && (
            <span className="inline-block mt-1 text-xs font-semibold text-red-600">CANCELLED</span>
          )}
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-700/90 mb-1">Amount Received</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700">{formatCurrency(income.amount ?? 0)}</p>
          </div>
        </div>

        {/* Recipient & Student */}
        <div className="px-6 sm:px-8 pb-5">
          {(hasRecipient || student) && (
            <div className={`grid gap-4 mb-5 ${hasRecipient && student ? 'sm:grid-cols-2' : ''}`}>
              {hasRecipient && (
                <div className="receipt-block rounded-lg border border-slate-200 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Received From</p>
                  {recipient.name && <p className="font-semibold text-slate-900">{recipient.name}</p>}
                  {recipient.phone && <p className="text-sm text-slate-600">{recipient.phone}</p>}
                  {recipient.email && <p className="text-sm text-slate-600">{recipient.email}</p>}
                  {recipient.address && <p className="text-sm text-slate-600 mt-1">{recipient.address}</p>}
                </div>
              )}
              {student && (
                <div className="receipt-block rounded-lg border border-slate-200 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Student</p>
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  {(student.studentId || student.rollNumber) && (
                    <p className="text-sm text-slate-600">ID: {student.studentId || student.rollNumber}</p>
                  )}
                  {courseName && <p className="text-sm text-slate-600">{courseName}</p>}
                  {student.email && <p className="text-sm text-slate-600">{student.email}</p>}
                  {student.phone && <p className="text-sm text-slate-600">{student.phone}</p>}
                  {student.alternatePhone && <p className="text-sm text-slate-600">{student.alternatePhone}</p>}
                  {student.address && formatAddress(student.address) && (
                    <p className="text-sm text-slate-600 mt-1">{formatAddress(student.address)}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment details — compact table */}
          <div className="receipt-block text-sm">
            <table className="w-full">
              <tbody>
                <tr><td className="py-1.5 text-slate-500 w-28">Date</td><td className="py-1.5 font-medium">{formatDateForDisplay(income.date)}</td></tr>
                {category && <tr><td className="py-1.5 text-slate-500">Category</td><td className="py-1.5 font-medium">{category.name}</td></tr>}
                {account && <tr><td className="py-1.5 text-slate-500">Account</td><td className="py-1.5 font-medium">{account.name}{account.accountNumber ? ` (${account.accountNumber})` : ''}</td></tr>}
                {income.referenceNumber && <tr><td className="py-1.5 text-slate-500">Reference</td><td className="py-1.5 font-medium">{income.referenceNumber}</td></tr>}
                <tr><td className="py-1.5 text-slate-500">Status</td><td className="py-1.5 font-medium">{income.isCancelled ? 'Cancelled' : 'Active'}</td></tr>
              </tbody>
            </table>
          </div>

          {income.notes && (
            <div className="receipt-block mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{income.notes}</p>
            </div>
          )}

          {Array.isArray(income.files) && income.files.length > 0 && (
            <div className="receipt-block mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Attachments</p>
              <ul className="text-sm space-y-0.5">
                {income.files.map((path, index) => (
                  <li key={`${path}-${index}`}>
                    <a href={getUploadedImageUrl(path, API_URL)} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                      {path.split('/').pop() || path}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 sm:px-8 py-3 text-center text-xs text-slate-400">
          Generated on {formatDateForDisplay(new Date())} · Computer-generated receipt
        </div>
      </div>

      {/* Stats — no print */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Income Amount</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(income.amount || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold mt-1 capitalize">
                {income.isCancelled ? 'Cancelled' : 'Active'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

