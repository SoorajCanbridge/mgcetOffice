'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  ArrowLeft,
  Download,
  Printer,
  Mail,
  Phone,
  MapPin,
  RefreshCcw,
  Edit2,
  Building2,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Receipt,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getLogoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const PAYMENTS_BASE = '/finance/payments';

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

const RECEIPT_PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    padding: 24px;
    color: #1e293b;
    background: #fff;
    line-height: 1.5;
    font-size: 14px;
  }
  .print-container { max-width: 210mm; margin: 0 auto; }
  .print-college-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 20px 0 24px;
    border-bottom: 2px solid #059669;
    margin-bottom: 20px;
  }
  .print-college-brand { display: flex; align-items: flex-start; gap: 16px; }
  .print-college-logo {
    width: 72px; height: 72px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  .print-college-placeholder {
    width: 72px; height: 72px;
    background: #ecfdf5;
    border-radius: 8px;
    border: 1px solid #a7f3d0;
    display: flex; align-items: center; justify-content: center;
    color: #059669;
    font-size: 24px;
    font-weight: 700;
  }
  .print-college-info h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
  .print-college-info .sub { font-size: 12px; color: #64748b; line-height: 1.5; }
  .print-college-info .contact { font-size: 11px; color: #64748b; margin-top: 6px; }
  .print-receipt-meta { text-align: right; }
  .print-receipt-meta .label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .print-receipt-meta .number { font-size: 22px; font-weight: 700; color: #0f172a; }
  .print-receipt-meta .date { font-size: 13px; color: #64748b; margin-top: 4px; }
  .print-receipt-meta .status {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .print-receipt-meta .status.completed { background: #10b981; color: #fff; }
  .print-receipt-meta .status.pending { background: #f59e0b; color: #fff; }
  .print-receipt-meta .status.failed { background: #ef4444; color: #fff; }
  .print-receipt-meta .status.cancelled { background: #94a3b8; color: #fff; }
  .print-doc-title { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; }
  .print-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
  .print-section { margin-bottom: 22px; }
  .print-section h3 { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .print-section p { font-size: 14px; color: #1e293b; margin-bottom: 4px; }
  .print-section strong { font-weight: 600; color: #0f172a; }
  .print-amount-box {
    background: #ecfdf5;
    border: 2px solid #10b981;
    border-radius: 10px;
    padding: 20px 24px;
    text-align: center;
    margin-bottom: 24px;
  }
  .print-amount-box .label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .print-amount-box .amount { font-size: 26px; font-weight: 700; color: #059669; }
  .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .print-grid-item { background: #f8fafc; padding: 10px 12px; border-radius: 6px; }
  .print-grid-item .k { font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
  .print-grid-item .v { font-size: 13px; font-weight: 600; color: #1e293b; }
  .print-balance-table { width: 100%; max-width: 320px; margin-left: auto; border-collapse: collapse; }
  .print-balance-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
  .print-balance-table td:first-child { color: #64748b; }
  .print-balance-table td:last-child { text-align: right; font-weight: 600; color: #1e293b; }
  .print-balance-table tr.total td { border-bottom: none; border-top: 2px solid #e2e8f0; font-weight: 700; font-size: 14px; padding-top: 12px; }
  .print-balance-table tr.total td:last-child { color: #059669; }
  .print-balance-table tr.balance-due td:last-child { color: #dc2626; }
  .print-other { background: #f8fafc; padding: 14px; border-radius: 8px; margin-bottom: 20px; }
  .print-other h3 { margin-bottom: 8px; }
  .print-other p { font-size: 13px; color: #475569; line-height: 1.6; margin-bottom: 0; }
  .print-footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
  .print-footer strong { color: #64748b; }
  @media print {
    body { padding: 12px; }
    .no-print { display: none !important; }
    @page { margin: 12mm; size: A4; }
  }
`;

export default function PaymentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const paymentId = params?.id;
  const printRef = useRef(null);

  const [payment, setPayment] = useState(null);
  const [student, setStudent] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [account, setAccount] = useState(null);
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const collegeLogoUrl = useMemo(() => {
    if (!college?.logo) return '';
    return getLogoUrl(college.logo, API_URL, true);
  }, [college?.logo]);

  const fetchPaymentDetails = useCallback(async () => {
    if (!paymentId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const collegeId = typeof user.college === 'object' ? (user.college._id || user.college.id || '') : String(user.college);
      const [payResponse, collegeResponse] = await Promise.all([
        api.get(`${PAYMENTS_BASE}/${paymentId}`, {}, true),
        api.get(`/colleges/${collegeId}`, {}, true).catch(() => ({ data: null })),
      ]);
      const data = payResponse?.data || payResponse;
      setPayment(data);
      const collegeData = collegeResponse?.data || collegeResponse;
      if (collegeData) setCollege(collegeData);

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

      // Fetch invoice details if available
      if (data.invoice) {
        const invoiceId = typeof data.invoice === 'object' ? data.invoice._id : data.invoice;
        if (invoiceId) {
          try {
            const invoiceResponse = await api.get(`/finance/invoices/${invoiceId}`, {}, true);
            const invoiceData = invoiceResponse?.data || invoiceResponse;
            setInvoice(invoiceData);
          } catch (err) {
            console.error('Failed to load invoice:', err);
            if (typeof data.invoice === 'object') {
              setInvoice(data.invoice);
            }
          }
        } else if (typeof data.invoice === 'object') {
          setInvoice(data.invoice);
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
    } catch (err) {
      setError(err.message || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  }, [paymentId, user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchPaymentDetails();
  }, [user?.college, paymentId, fetchPaymentDetails]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    if (!payment) return;
    setExporting(true);
    try {
      const csvRows = [];
      
      csvRows.push(['Payment Receipt']);
      csvRows.push([]);
      
      csvRows.push(['Payment Number', payment.paymentNumber || '']);
      csvRows.push(['Payment Date', formatDateForCSV(payment.paymentDate)]);
      csvRows.push(['Amount', payment.amount || 0]);
      csvRows.push(['Status', payment.status || '']);
      csvRows.push(['Payment Method', payment.paymentMethod || '']);
      csvRows.push([]);
      
      if (student) {
        csvRows.push(['Student Information']);
        csvRows.push(['Name', student.name || '']);
        csvRows.push(['Student ID', student.studentId || student.rollNumber || '']);
        csvRows.push(['Email', student.email || '']);
        csvRows.push(['Phone', student.phone || '']);
        csvRows.push([]);
      }
      
      if (invoice) {
        csvRows.push(['Invoice Information']);
        csvRows.push(['Invoice Number', invoice.invoiceNumber || '']);
        csvRows.push(['Invoice Date', formatDateForCSV(invoice.invoiceDate)]);
        csvRows.push(['Total Amount', invoice.totalAmount || 0]);
        csvRows.push([]);
      }
      
      if (account) {
        csvRows.push(['Account Information']);
        csvRows.push(['Account Name', account.name || '']);
        csvRows.push(['Account Type', account.accountType || '']);
        csvRows.push([]);
      }
      
      if (payment.referenceNumber) {
        csvRows.push(['Reference Number', payment.referenceNumber]);
      }
      if (payment.transactionId) {
        csvRows.push(['Transaction ID', payment.transactionId]);
      }
      if (payment.chequeNumber) {
        csvRows.push(['Cheque Number', payment.chequeNumber]);
      }
      if (payment.chequeDate) {
        csvRows.push(['Cheque Date', formatDateForCSV(payment.chequeDate)]);
      }
      if (payment.bankName) {
        csvRows.push(['Bank Name', payment.bankName]);
      }
      if (payment.description) {
        csvRows.push(['Description', payment.description]);
      }
      if (payment.notes) {
        csvRows.push(['Notes', payment.notes]);
      }
      
      const csvContent = csvRows.map((row) => 
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payment-receipt-${payment.paymentNumber || paymentId}.csv`);
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
  }, [payment, student, invoice, account, paymentId]);

  const getPrintBodyHtml = useCallback(() => {
    if (!payment) return '';
    const statusClass = payment.status || 'pending';
    const collegeName = college?.name || 'Institution';
    const collegeAddr = [college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
    const collegeContact = [college?.phone, college?.email, college?.website].filter(Boolean).join(' | ');
    const logoImg = collegeLogoUrl
      ? `<img src="${collegeLogoUrl}" alt="${collegeName}" class="print-college-logo" />`
      : `<div class="print-college-placeholder">${collegeName.charAt(0)}</div>`;

    const esc = (s) => (s ?? '').toString().replace(/</g, '&lt;');

    // 1. Recipient (paid by)
    const recipientHtml = student
      ? `
    <div class="print-section">
      <h3>Received From / Recipient</h3>
      <p><strong>${esc(student.name)}</strong></p>
      ${student.studentId ? `<p>Student ID: ${esc(student.studentId)}</p>` : ''}
      ${student.rollNumber && !student.studentId ? `<p>Roll No: ${esc(student.rollNumber)}</p>` : ''}
      ${student.email ? `<p>${esc(student.email)}</p>` : ''}
      ${student.phone ? `<p>${esc(student.phone)}</p>` : ''}
      ${student.address ? `<p>${esc([student.address.street, student.address.city, student.address.state, student.address.pincode].filter(Boolean).join(', '))}</p>` : ''}
    </div>`
      : '<div class="print-section"><h3>Received From / Recipient</h3><p>—</p></div>';

    // 2. Payment information
    const payInfoItems = [
      { k: 'Payment Date', v: formatDateForDisplay(payment.paymentDate) },
      { k: 'Payment Method', v: (payment.paymentMethod || '').replace(/_/g, ' ') || 'N/A' },
      payment.referenceNumber && { k: 'Reference No.', v: payment.referenceNumber },
      payment.transactionId && { k: 'Transaction ID', v: payment.transactionId },
      payment.chequeNumber && { k: 'Cheque No.', v: payment.chequeNumber },
      payment.chequeDate && { k: 'Cheque Date', v: formatDateForDisplay(payment.chequeDate) },
      payment.bankName && { k: 'Bank Name', v: payment.bankName },
      account && { k: 'Account', v: account.name },
    ].filter(Boolean);
    const payInfoGrid = payInfoItems.map((item) => `
      <div class="print-grid-item"><div class="k">${esc(item.k)}</div><div class="v">${esc(item.v)}</div></div>
    `).join('');

    // 3. Invoice information
    let invoiceHtml = '';
    if (invoice) {
      invoiceHtml = `
    <div class="print-section">
      <h3>Invoice Information</h3>
      <p><strong>Invoice No.: ${esc(invoice.invoiceNumber || 'N/A')}</strong></p>
      ${invoice.invoiceDate ? `<p>Invoice Date: ${formatDateForDisplay(invoice.invoiceDate)}</p>` : ''}
      ${invoice.dueDate ? `<p>Due Date: ${formatDateForDisplay(invoice.dueDate)}</p>` : ''}
    </div>`;
    }

    // 4. Balance information (summary)
    const invTotal = invoice?.totalAmount ?? invoice?.subtotal;
    const invPaid = invoice?.paidAmount ?? 0;
    const invBalance = invoice?.balanceAmount ?? (invTotal != null ? invTotal - invPaid : null);
    const hasBalance = invTotal != null || invPaid != null || invBalance != null;
    let balanceHtml = '';
    if (hasBalance) {
      balanceHtml = `
    <div class="print-section">
      <h3>Balance Information</h3>
      <table class="print-balance-table">
        ${invTotal != null ? `<tr><td>Invoice Total</td><td>${formatCurrency(invTotal)}</td></tr>` : ''}
        <tr><td>Amount Paid (this receipt)</td><td>${formatCurrency(payment.amount || 0)}</td></tr>
        ${invPaid != null && invTotal != null ? `<tr><td>Total Paid (on invoice)</td><td>${formatCurrency(invPaid)}</td></tr>` : ''}
        ${invBalance != null ? `<tr class="total balance-due"><td>Balance Due</td><td>${formatCurrency(invBalance)}</td></tr>` : ''}
      </table>
    </div>`;
    } else {
      balanceHtml = `
    <div class="print-section">
      <h3>Amount Received</h3>
      <table class="print-balance-table">
        <tr class="total"><td>Amount Paid</td><td>${formatCurrency(payment.amount || 0)}</td></tr>
      </table>
    </div>`;
    }

    // 5. Other receipt info (description, notes)
    const otherHtml = (payment.description || payment.notes)
      ? `
    <div class="print-other">
      <h3>${payment.description ? 'Description / Notes' : 'Notes'}</h3>
      <p>${esc(String(payment.description || payment.notes || '')).replace(/\n/g, '<br/>')}</p>
    </div>`
      : '';

    return `
      <div class="print-college-header">
        <div class="print-college-brand">
          ${logoImg}
          <div class="print-college-info">
            <h1>${esc(collegeName)}</h1>
            ${collegeAddr ? `<div class="sub">${esc(collegeAddr)}</div>` : ''}
            ${collegeContact ? `<div class="contact">${esc(collegeContact)}</div>` : ''}
          </div>
        </div>
        <div class="print-receipt-meta">
          <div class="label">Payment Receipt</div>
          <div class="number">${esc(payment.paymentNumber || 'N/A')}</div>
          <div class="date">${formatDateForDisplay(payment.paymentDate)}</div>
          <span class="status ${statusClass}">${esc(payment.status || '')}</span>
        </div>
      </div>
      <div class="print-doc-title">Payment Receipt</div>
      <div class="print-two-col">
        ${recipientHtml}
        <div>
          <div class="print-amount-box">
            <div class="label">Amount Received</div>
            <div class="amount">${formatCurrency(payment.amount || 0)}</div>
          </div>
          <div class="print-section">
            <h3>Payment Information</h3>
            <div class="print-grid">${payInfoGrid}</div>
          </div>
        </div>
      </div>
      ${invoiceHtml}
      ${balanceHtml}
      ${otherHtml}
      <div class="print-footer">
        <p><strong>Thank you for your payment.</strong></p>
        <p style="margin-top:8px">This is a computer-generated receipt. No signature required.</p>
        <p style="margin-top:6px">Generated on ${formatDateForDisplay(new Date())}</p>
      </div>
    `;
  }, [payment, college, collegeLogoUrl, student, invoice, account]);

  const handlePrint = useCallback(() => {
    if (!payment) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    const bodyHtml = getPrintBodyHtml();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Receipt - ${(payment.paymentNumber || 'Details').replace(/</g, '&lt;')}</title>
          <style>${RECEIPT_PRINT_STYLES}</style>
        </head>
        <body>
          <div class="print-container">${bodyHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }, [payment, getPrintBodyHtml]);

  const handleExportPDF = useCallback(() => {
    if (!payment) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }
    const bodyHtml = getPrintBodyHtml();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Receipt - ${(payment.paymentNumber || 'Details').replace(/</g, '&lt;')}</title>
          <style>${RECEIPT_PRINT_STYLES}</style>
        </head>
        <body>
          <div class="print-container">${bodyHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }, [payment, getPrintBodyHtml]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Payment not found'}</p>
            <Button onClick={() => router.push('/app/payments')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Payments
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
    pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
    cancelled: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };

  const statusIcons = {
    completed: CheckCircle,
    pending: Clock,
    failed: XCircle,
    cancelled: XCircle,
  };

  const StatusIcon = statusIcons[payment.status] || Clock;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/app/payments')}
            aria-label="Back to payments"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Receipt className="h-6 w-6 text-primary flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Payment Receipt {payment.paymentNumber || 'Details'}
              </h1>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize flex items-center gap-1 ${
                  statusColors[payment.status] || statusColors.pending
                }`}
              >
                <StatusIcon className="h-3 w-3" />
                {payment.status}
              </span>
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Date: <span className="font-semibold text-foreground">{formatDateForDisplay(payment.paymentDate)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={fetchPaymentDetails}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="gap-2"
            disabled={exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="default"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
          {payment.status !== 'completed' && (
            <Button
              variant="outline"
              onClick={() => router.push(`/app/payments?edit=${paymentId}`)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Receipt document - same style as invoice */}
      <div ref={printRef} className="receipt-document max-w-4xl mx-auto bg-card border border-border rounded-xl overflow-hidden shadow-sm print:shadow-none print:border print:rounded-none print:max-w-none">
        {/* College header */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-border px-8 py-6 print:py-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-5 min-w-0">
              {collegeLogoUrl ? (
                <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-white dark:bg-slate-800 border border-border flex items-center justify-center">
                  <img
                    src={collegeLogoUrl}
                    alt={college?.name || 'College logo'}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Building2 className="h-8 w-8 md:h-10 md:w-10 text-green-600" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {college?.name || 'Institution Name'}
                </h1>
                {(college?.address || college?.city || college?.state || college?.pincode) && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {[college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0 mt-2 text-xs text-muted-foreground">
                  {college?.phone && <span>{college.phone}</span>}
                  {college?.email && <span>{college.email}</span>}
                  {college?.website && <span>{college.website}</span>}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payment Receipt</p>
              <p className="text-2xl font-bold text-foreground">{payment.paymentNumber || 'N/A'}</p>
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                  payment.status === 'completed'
                    ? 'bg-green-500 text-white'
                    : payment.status === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : payment.status === 'failed'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}
              >
                {payment.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6 print:p-6">
        <div className="border-b border-border pb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment Receipt</h2>
        </div>

        {/* Two-column: Recipient (left) | Amount + Payment info (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recipient information */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">
              Received From / Recipient
            </h3>
            {student ? (
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-base">{student.name}</p>
                {(student.studentId || student.rollNumber) && (
                  <p className="text-muted-foreground">
                    {student.studentId ? `Student ID: ${student.studentId}` : `Roll No: ${student.rollNumber}`}
                  </p>
                )}
                {student.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>{student.email}</span>
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{student.phone}</span>
                  </div>
                )}
                {student.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {student.address.street && `${student.address.street}, `}
                      {[student.address.city, student.address.state, student.address.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>

          {/* Amount + Payment information */}
          <div className="space-y-5">
            <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500 rounded-xl p-5 text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Amount Received
              </p>
              <p className="text-2xl md:text-3xl font-bold text-green-600 tabular-nums">
                {formatCurrency(payment.amount || 0)}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">
                Payment Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Payment Date</p>
                  <p className="font-semibold text-sm">{formatDateForDisplay(payment.paymentDate)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Payment Method</p>
                  <p className="font-semibold text-sm capitalize">{payment.paymentMethod?.replace(/_/g, ' ') || 'N/A'}</p>
                </div>
                {payment.referenceNumber && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border/50 sm:col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Reference No.</p>
                    <p className="font-semibold text-sm">{payment.referenceNumber}</p>
                  </div>
                )}
                {payment.transactionId && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border/50 sm:col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Transaction ID</p>
                    <p className="font-semibold text-sm font-mono">{payment.transactionId}</p>
                  </div>
                )}
                {payment.chequeNumber && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Cheque No.</p>
                    <p className="font-semibold text-sm">{payment.chequeNumber}</p>
                  </div>
                )}
                {payment.chequeDate && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Cheque Date</p>
                    <p className="font-semibold text-sm">{formatDateForDisplay(payment.chequeDate)}</p>
                  </div>
                )}
                {payment.bankName && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Bank Name</p>
                    <p className="font-semibold text-sm">{payment.bankName}</p>
                  </div>
                )}
                {account && (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Account</p>
                    <p className="font-semibold text-sm">{account.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Information */}
        {invoice && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">
              Invoice Information
            </h3>
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Invoice No.: {invoice.invoiceNumber || 'N/A'}</span>
              </div>
              {invoice.invoiceDate && (
                <span className="text-sm text-muted-foreground">Date: {formatDateForDisplay(invoice.invoiceDate)}</span>
              )}
              {invoice.dueDate && (
                <span className="text-sm text-muted-foreground">Due: {formatDateForDisplay(invoice.dueDate)}</span>
              )}
            </div>
          </div>
        )}

        {/* Balance Information */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 border-b border-border pb-2">
            Balance Information
          </h3>
          <div className="max-w-sm ml-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {invoice?.totalAmount != null && (
                  <tr className="border-b border-border">
                    <td className="py-2.5 text-muted-foreground">Invoice Total</td>
                    <td className="py-2.5 text-right font-semibold">{formatCurrency(invoice.totalAmount)}</td>
                  </tr>
                )}
                <tr className="border-b border-border">
                  <td className="py-2.5 text-muted-foreground">Amount Paid (this receipt)</td>
                  <td className="py-2.5 text-right font-semibold text-green-600">{formatCurrency(payment.amount || 0)}</td>
                </tr>
                {invoice?.paidAmount != null && invoice?.totalAmount != null && (
                  <tr className="border-b border-border">
                    <td className="py-2.5 text-muted-foreground">Total Paid (on invoice)</td>
                    <td className="py-2.5 text-right font-semibold">{formatCurrency(invoice.paidAmount)}</td>
                  </tr>
                )}
                {invoice?.balanceAmount !== undefined && (
                  <tr className="border-t-2 border-border">
                    <td className="pt-3 pb-2 font-semibold text-foreground">Balance Due</td>
                    <td className="pt-3 pb-2 text-right font-bold text-red-600">{formatCurrency(invoice.balanceAmount || 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {!invoice && (
              <table className="w-full border-collapse text-sm mt-2">
                <tbody>
                  <tr className="border-t-2 border-border">
                    <td className="pt-3 font-semibold text-foreground">Amount Received</td>
                    <td className="pt-3 text-right font-bold text-green-600">{formatCurrency(payment.amount || 0)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Other receipt information (description / notes) */}
        {(payment.description || payment.notes) && (
          <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Description / Notes
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {payment.description || payment.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p className="font-semibold text-foreground/80 mb-1">Thank you for your payment.</p>
          <p>This is a computer-generated receipt. No signature required.</p>
          <p className="mt-2 text-xs">Generated on {formatDateForDisplay(new Date())}</p>
        </div>
        </div>
      </div>

      {/* Summary cards - same style as invoice page */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Amount</p>
              <p className="text-xl font-bold mt-1.5 tabular-nums">
                {formatCurrency(payment.amount || 0)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
              <p className="text-xl font-bold mt-1.5 capitalize">{payment.status}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <StatusIcon className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Method</p>
              <p className="text-xl font-bold mt-1.5 capitalize">
                {payment.paymentMethod?.replace(/_/g, ' ') || 'N/A'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

