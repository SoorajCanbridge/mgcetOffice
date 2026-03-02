'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  FileText,
  ArrowLeft,
  CreditCard,
  Download,
  Printer,
  Mail,
  Phone,
  RefreshCcw,
  Edit2,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getLogoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const INVOICE_BASE = '/finance/invoices';

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

const PRINT_STYLES = `
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
    border-bottom: 2px solid #1e40af;
    margin-bottom: 28px;
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
    background: #eff6ff;
    border-radius: 8px;
    border: 1px solid #bfdbfe;
    display: flex; align-items: center; justify-content: center;
    color: #1e40af;
    font-size: 24px;
    font-weight: 700;
  }
  .print-college-info h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
  .print-college-info .sub { font-size: 12px; color: #64748b; line-height: 1.5; }
  .print-college-info .contact { font-size: 11px; color: #64748b; margin-top: 6px; }
  .print-invoice-meta { text-align: right; }
  .print-invoice-meta .label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .print-invoice-meta .number { font-size: 22px; font-weight: 700; color: #0f172a; }
  .print-invoice-meta .status {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .print-invoice-meta .status.paid { background: #10b981; color: #fff; }
  .print-invoice-meta .status.pending { background: #f59e0b; color: #fff; }
  .print-invoice-meta .status.overdue { background: #ef4444; color: #fff; }
  .print-invoice-meta .status.sent { background: #3b82f6; color: #fff; }
  .print-invoice-meta .status.draft { background: #94a3b8; color: #fff; }
  .print-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
  .print-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
  .print-section h3 { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
  .print-section p { font-size: 14px; color: #1e293b; margin-bottom: 6px; }
  .print-section strong { font-weight: 600; color: #0f172a; }
  .print-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .print-table thead { background: #f8fafc; }
  .print-table th { padding: 12px 10px; text-align: left; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  .print-table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1e293b; }
  .print-table .tr-right { text-align: right; }
  .print-summary { margin-left: auto; width: 280px; }
  .print-summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
  .print-summary-row.total { border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 14px; font-size: 17px; font-weight: 700; color: #0f172a; }
  .print-summary-row.balance { border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 12px; font-size: 15px; font-weight: 600; }
  .print-summary-row.balance.positive { color: #ef4444; }
  .print-summary-row.balance.negative { color: #10b981; }
  .print-notes { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
  .print-notes h3 { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
  .print-notes p { font-size: 13px; color: #475569; line-height: 1.6; }
  .print-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
  @media print {
    body { padding: 12px; }
    .no-print { display: none !important; }
    @page { margin: 12mm; size: A4; }
  }
`;

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const invoiceId = params?.id;
  const printRef = useRef(null);
  const hasTriggeredDownloadRef = useRef(false);

  const [invoice, setInvoice] = useState(null);
  const [student, setStudent] = useState(null);
  const [account, setAccount] = useState(null);
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const collegeLogoUrl = useMemo(() => {
    if (!college?.logo) return '';
    return getLogoUrl(college.logo, API_URL, true);
  }, [college?.logo]);

  const fetchInvoiceDetails = useCallback(async () => {
    if (!invoiceId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const [invResponse, collegeResponse] = await Promise.all([
        api.get(`${INVOICE_BASE}/${invoiceId}`, {}, true),
        api.get(`/colleges/${user.college}`, {}, true).catch(() => ({ data: null })),
      ]);
      const data = invResponse?.data || invResponse;
      setInvoice(data);
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
            // Use embedded student data if available
            if (typeof data.student === 'object') {
              setStudent(data.student);
            }
          }
        } else if (typeof data.student === 'object') {
          setStudent(data.student);
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
            // Use embedded account data if available
            if (typeof data.account === 'object') {
              setAccount(data.account);
            }
          }
        } else if (typeof data.account === 'object') {
          setAccount(data.account);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [invoiceId, user?.college]);

  const handleMarkAsSent = useCallback(async () => {
    if (!invoice || invoice.status === 'sent') return;
    try {
      setUpdatingStatus(true);
      const payload = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        status: 'sent',
        billTo: invoice.billTo || {},
        items: invoice.items || [],
        taxRate: invoice.taxRate ?? 0,
        discount: invoice.discount ?? 0,
        paidAmount: invoice.paidAmount ?? 0,
        notes: invoice.notes,
        terms: invoice.terms,
        student: invoice.student?._id || invoice.student || undefined,
        savedContent: invoice.savedContent?._id || invoice.savedContent || undefined,
      };
      await api.put(`${INVOICE_BASE}/${invoiceId}`, payload, {}, true);
      await fetchInvoiceDetails();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }, [invoice, invoiceId, fetchInvoiceDetails]);

  useEffect(() => {
    if (!user?.college) return;
    fetchInvoiceDetails();
  }, [user?.college, invoiceId, fetchInvoiceDetails]);

  // Calculate totals 
  const totals = useMemo(() => {
    if (!invoice) return null;
    const subtotal = invoice.subtotal || (invoice.items || []).reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    
    let taxAmount = 0;
    const taxCalculationMethod = invoice.taxCalculationMethod || 'total';
    
    if (taxCalculationMethod === 'product') {
      // Product-level tax: sum of all item taxAmounts
      taxAmount = (invoice.items || []).reduce(
        (sum, item) => sum + (Number(item.taxAmount) || 0),
        0
      );
    } else {
      // Total-level tax: calculate tax on subtotal
      const taxRate = invoice.taxRate || 0;
      taxAmount = (subtotal * taxRate) / 100;
    }
    
    const discount = invoice.discount || 0;
    const totalAmount = subtotal + taxAmount - discount;
    const paidAmount = invoice.paidAmount || 0;
    const balanceAmount = totalAmount - paidAmount;
    return { 
      subtotal, 
      taxRate: invoice.taxRate || 0, 
      taxAmount, 
      taxCalculationMethod,
      discount, 
      totalAmount, 
      paidAmount, 
      balanceAmount 
    };
  }, [invoice]);

  const getPrintBodyHtml = useCallback(() => {
    if (!invoice) return '';
    const statusClass = invoice.status === 'paid' ? 'paid' : invoice.status === 'overdue' ? 'overdue' : invoice.status === 'sent' ? 'sent' : invoice.status === 'pending' ? 'pending' : 'draft';
    const collegeName = college?.name || 'Institution';
    const collegeAddr = [college?.address, [college?.city, college?.state, college?.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
    const collegeContact = [college?.phone, college?.email, college?.website].filter(Boolean).join(' | ');
    const logoImg = collegeLogoUrl
      ? `<img src="${collegeLogoUrl}" alt="${collegeName}" class="print-college-logo" />`
      : `<div class="print-college-placeholder">${collegeName.charAt(0)}</div>`;

    let rows = '';
    (invoice.items || []).forEach((item, i) => {
      const itemAmount = item.amount || 0;
      const itemPaid = item.paidAmount || 0;
      const itemBalance = itemAmount - itemPaid;
      const taxCols = totals?.taxCalculationMethod === 'product'
        ? `<td class="tr-right">${item.taxRate ? item.taxRate + '%' : '-'}</td><td class="tr-right">${formatCurrency(item.taxAmount || 0)}</td>`
        : '';
      rows += `<tr>
        <td>${(item.description || '-').replace(/</g, '&lt;')}</td>
        <td class="tr-right">${item.quantity || 0}</td>
        <td class="tr-right">${formatCurrency(item.unitPrice || 0)}</td>
        <td class="tr-right">${formatCurrency(itemAmount)}</td>
        ${taxCols}
        <td class="tr-right">${formatCurrency(itemPaid)}</td>
        <td class="tr-right">${formatCurrency(itemBalance)}</td>
      </tr>`;
    });

    const taxHeader = totals?.taxCalculationMethod === 'product'
      ? '<th class="tr-right">Tax Rate</th><th class="tr-right">Tax Amount</th>'
      : '';

    const billToLines = [];
    if (invoice.billTo?.name) billToLines.push(`<p><strong>${invoice.billTo.name}</strong></p>`);
    if (invoice.billTo?.address) billToLines.push(`<p>${invoice.billTo.address}</p>`);
    if (invoice.billTo?.email) billToLines.push(`<p>${invoice.billTo.email}</p>`);
    if (invoice.billTo?.phone) billToLines.push(`<p>${invoice.billTo.phone}</p>`);

    return `
      <div class="print-college-header">
        <div class="print-college-brand">
          ${logoImg}
          <div class="print-college-info">
            <h1>${collegeName.replace(/</g, '&lt;')}</h1>
            ${collegeAddr ? `<div class="sub">${collegeAddr.replace(/</g, '&lt;')}</div>` : ''}
            ${collegeContact ? `<div class="contact">${collegeContact.replace(/</g, '&lt;')}</div>` : ''}
          </div>
        </div>
        <div class="print-invoice-meta">
          <div class="label">Invoice</div>
          <div class="number">${(invoice.invoiceNumber || 'N/A').replace(/</g, '&lt;')}</div>
          <span class="status ${statusClass}">${(invoice.status || '').replace(/</g, '&lt;')}</span>
        </div>
      </div>
      <div class="print-title">Tax Invoice / Bill of Supply</div>
      <div class="print-two-col">
        <div class="print-section">
          <h3>Bill To</h3>
          ${billToLines.length ? billToLines.join('') : '<p>—</p>'}
        </div>
        <div class="print-section">
          <h3>Invoice Details</h3>
          <p><strong>Invoice Date:</strong> ${formatDateForDisplay(invoice.invoiceDate)}</p>
          ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${formatDateForDisplay(invoice.dueDate)}</p>` : ''}
          ${student ? `<p><strong>Student:</strong> ${student.name} (${student.studentId || student.rollNumber || 'N/A'})</p>` : ''}
          ${account ? `<p><strong>Account:</strong> ${account.name}</p>` : ''}
        </div>
      </div>
      ${(invoice.items && invoice.items.length) ? `
      <table class="print-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="tr-right">Qty</th>
            <th class="tr-right">Unit Price</th>
            <th class="tr-right">Amount</th>
            ${taxHeader}
            <th class="tr-right">Paid</th>
            <th class="tr-right">Balance</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ` : ''}
      <div class="print-summary">
        <div class="print-summary-row"><span>Subtotal</span><span>${formatCurrency(totals?.subtotal || 0)}</span></div>
        ${totals && totals.taxAmount > 0 ? `<div class="print-summary-row"><span>${totals.taxCalculationMethod === 'product' ? 'Tax (Product)' : `Tax (${totals.taxRate}%)`}</span><span>${formatCurrency(totals.taxAmount)}</span></div>` : ''}
        ${totals && totals.discount > 0 ? `<div class="print-summary-row"><span>Discount</span><span>-${formatCurrency(totals.discount)}</span></div>` : ''}
        <div class="print-summary-row total"><span>Total Amount</span><span>${formatCurrency(totals?.totalAmount || 0)}</span></div>
        <div class="print-summary-row"><span>Paid</span><span>${formatCurrency(totals?.paidAmount || 0)}</span></div>
        <div class="print-summary-row balance ${(totals?.balanceAmount || 0) > 0 ? 'positive' : (totals?.balanceAmount || 0) < 0 ? 'negative' : ''}"><span>Balance</span><span>${formatCurrency(totals?.balanceAmount || 0)}</span></div>
      </div>
      ${(invoice.notes || invoice.terms) ? `
      <div class="print-notes">
        ${invoice.notes ? `<h3>Notes</h3><p>${String(invoice.notes).replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>` : ''}
        ${invoice.terms ? `<h3>Terms &amp; Conditions</h3><p>${String(invoice.terms).replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>` : ''}
      </div>
      ` : ''}
      <div class="print-footer">
        <p>This is a computer-generated invoice. No signature required.</p>
        <p style="margin-top:6px">Generated on ${formatDateForDisplay(new Date())}</p>
      </div>
    `;
  }, [invoice, college, collegeLogoUrl, student, account, totals]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    if (!invoice) return;
    setExporting(true);
    try {
      const csvRows = [];
      
      // Header
      csvRows.push(['Invoice Details']);
      csvRows.push([]);
      
      // Basic Information
      csvRows.push(['Invoice Number', invoice.invoiceNumber || '']);
      csvRows.push(['Invoice Date', formatDateForCSV(invoice.invoiceDate)]);
      csvRows.push(['Due Date', formatDateForCSV(invoice.dueDate)]);
      csvRows.push(['Status', invoice.status || '']);
      csvRows.push(['Created Date', formatDateForCSV(invoice.createdAt)]);
      csvRows.push([]);
      
      // Bill To Information
      if (invoice.billTo) {
        csvRows.push(['Bill To Information']);
        csvRows.push(['Name', invoice.billTo.name || '']);
        csvRows.push(['Address', invoice.billTo.address || '']);
        csvRows.push(['Email', invoice.billTo.email || '']);
        csvRows.push(['Phone', invoice.billTo.phone || '']);
        csvRows.push([]);
      }
      
      // Student Information
      if (student) {
        csvRows.push(['Student Information']);
        csvRows.push(['Name', student.name || '']);
        csvRows.push(['Student ID', student.studentId || student.rollNumber || '']);
        csvRows.push([]);
      }
      
      // Items
      if (invoice.items && invoice.items.length > 0) {
        csvRows.push(['Items']);
        csvRows.push(['Description', 'Quantity', 'Unit Price', 'Amount']);
        invoice.items.forEach((item) => {
          csvRows.push([
            item.description || '',
            item.quantity || 0,
            item.unitPrice || 0,
            item.amount || 0,
          ]);
        });
        csvRows.push([]);
      }
      
      // Financial Summary
      csvRows.push(['Financial Summary']);
      csvRows.push(['Subtotal', totals?.subtotal || 0]);
      csvRows.push(['Tax Rate (%)', totals?.taxRate || 0]);
      csvRows.push(['Tax Amount', totals?.taxAmount || 0]);
      csvRows.push(['Discount', totals?.discount || 0]);
      csvRows.push(['Total Amount', totals?.totalAmount || 0]);
      csvRows.push(['Paid Amount', totals?.paidAmount || 0]);
      csvRows.push(['Balance Amount', totals?.balanceAmount || 0]);
      
      // Convert to CSV string
      const csvContent = csvRows.map((row) => 
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `invoice-${invoice.invoiceNumber || invoiceId}.csv`);
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
  }, [invoice, student, totals, invoiceId]);

  // Export to PDF (using browser print with professional styling and college header)
  const handleExportPDF = useCallback(() => {
    if (!invoice) return;
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
          <title>Invoice - ${(invoice.invoiceNumber || 'Details').replace(/</g, '&lt;')}</title>
          <style>${PRINT_STYLES}</style>
        </head>
        <body>
          <div class="print-container">${bodyHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }, [invoice, getPrintBodyHtml]);

  // Print with professional styling and college header
  const handlePrint = useCallback(() => {
    if (!invoice) return;
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
          <title>Invoice - ${(invoice.invoiceNumber || 'Details').replace(/</g, '&lt;')}</title>
          <style>${PRINT_STYLES}</style>
        </head>
        <body>
          <div class="print-container">${bodyHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }, [invoice, getPrintBodyHtml]);

  // Auto-trigger print when opened with ?download=1 (e.g. from invoice creation actions)
  useEffect(() => {
    if (!invoice || loading || hasTriggeredDownloadRef.current) return;
    if (searchParams.get('download') !== '1') return;
    hasTriggeredDownloadRef.current = true;
    const path = `/app/invoices/${invoiceId}`;
    window.history.replaceState(null, '', path);
    handlePrint();
  }, [invoice, loading, invoiceId, searchParams, handlePrint]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoice details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Invoice not found'}</p>
            <Button onClick={() => router.push('/app/invoices')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    paid: 'bg-green-500/10 text-green-600 dark:text-green-400',
    overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
    sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/app/invoices')}
            aria-label="Back to invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <FileText className="h-6 w-6 text-primary flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Invoice {invoice.invoiceNumber || 'Details'}
              </h1>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                  statusColors[invoice.status] || statusColors.draft
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Date: <span className="font-semibold text-foreground">{formatDateForDisplay(invoice.invoiceDate)}</span>
              {invoice.dueDate && (
                <> · Due: <span className="font-semibold text-foreground">{formatDateForDisplay(invoice.dueDate)}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={fetchInvoiceDetails}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          {invoice.status === 'draft' && (
            <Button
              onClick={handleMarkAsSent}
              className="gap-2"
              disabled={updatingStatus}
            >
              <Mail className="h-4 w-4" />
              {updatingStatus ? 'Marking...' : 'Mark as Sent'}
            </Button>
          )}
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
            variant="outline"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/app/invoices/payments?invoiceId=${invoiceId}`)}
            className="gap-2"
            disabled={totals && totals.balanceAmount <= 0}
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </Button>
          <Button
            variant="default"
            onClick={() => router.push(`/app/invoices?edit=${invoiceId}`)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Print/Export Content - professional invoice layout */}
      <div ref={printRef} className="invoice-document max-w-4xl mx-auto bg-card border border-border rounded-xl overflow-hidden shadow-sm print:shadow-none print:border print:rounded-none print:max-w-none">
        {/* College header - professional letterhead style */}
        <div className="college-header invoice-college-header bg-slate-50 dark:bg-slate-900/50 border-b border-border px-8 py-6 print:py-4">
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
                <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Building2 className="h-8 w-8 md:h-10 md:w-10 text-primary" />
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Invoice</p>
              <p className="text-2xl font-bold text-foreground">{invoice.invoiceNumber || 'N/A'}</p>
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                  invoice.status === 'paid'
                    ? 'bg-green-500 text-white'
                    : invoice.status === 'overdue'
                    ? 'bg-red-500 text-white'
                    : invoice.status === 'sent'
                    ? 'bg-blue-500 text-white'
                    : invoice.status === 'pending'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}
              >
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8 print:p-6">
        {/* Invoice title strip */}
        <div className="border-b border-border pb-6">
          <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">Tax Invoice / Bill of Supply</h2>
        </div>

        {/* Invoice Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bill To */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Bill To
            </h3>
            <div className="space-y-2">
              {invoice.billTo?.name && (
                <p className="font-semibold text-lg">{invoice.billTo.name}</p>
              )}
              {invoice.billTo?.address && (
                <p className="text-muted-foreground">{invoice.billTo.address}</p>
              )}
              {invoice.billTo?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <p>{invoice.billTo.email}</p>
                </div>
              )}
              {invoice.billTo?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <p>{invoice.billTo.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Invoice Details
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span className="font-medium">{formatDateForDisplay(invoice.invoiceDate)}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{formatDateForDisplay(invoice.dueDate)}</span>
                </div>
              )}
              {student && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-medium">
                    {student.name} ({student.studentId || student.rollNumber || 'N/A'})
                  </span>
                </div>
              )}
              {account && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium">{account.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        {invoice.items && invoice.items.length > 0 && (
          <div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted border-b-2 border-border">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Description
                  </th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Quantity
                  </th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Unit Price
                  </th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Amount
                  </th>
                  {totals?.taxCalculationMethod === 'product' && (
                    <>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Tax Rate
                      </th>
                      <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Tax Amount
                      </th>
                    </>
                  )}
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Paid
                  </th>
                  <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => {
                  const itemAmount = item.amount || 0;
                  const itemPaid = item.paidAmount || 0;
                  const itemBalance = itemAmount - itemPaid;
                  return (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4 font-medium">{item.description || '-'}</td>
                      <td className="p-4 text-right">{item.quantity || 0}</td>
                      <td className="p-4 text-right">{formatCurrency(item.unitPrice || 0)}</td>
                      <td className="p-4 text-right font-semibold">
                        {formatCurrency(itemAmount)}
                      </td>
                      {totals?.taxCalculationMethod === 'product' && (
                        <>
                          <td className="p-4 text-right text-muted-foreground">
                            {item.taxRate ? `${item.taxRate}%` : '-'}
                          </td>
                          <td className="p-4 text-right text-muted-foreground">
                            {formatCurrency(item.taxAmount || 0)}
                          </td>
                        </>
                      )}
                      <td className="p-4 text-right">
                        <span className={itemPaid > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                          {formatCurrency(itemPaid)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={itemBalance > 0 ? 'text-red-600 font-medium' : itemBalance < 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                          {formatCurrency(itemBalance)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Section */}
        <div className="flex justify-end">
          <div className="w-full md:w-80 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(totals?.subtotal || 0)}
              </span>
            </div>
            {totals && totals.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {totals.taxCalculationMethod === 'product' 
                    ? 'Tax (Product-Level):' 
                    : `Tax (${totals.taxRate}%):`}
                </span>
                <span className="font-medium text-foreground">
                  {formatCurrency(totals.taxAmount || 0)}
                </span>
              </div>
            )}
            {totals && totals.discount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Discount:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(totals.discount || 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-4 border-t-2 border-border mt-2">
              <span>Total Amount:</span>
              <span className="text-primary">
                {formatCurrency(totals?.totalAmount || invoice.totalAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground pt-2">
              <span>Paid Amount:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(totals.paidAmount || invoice.paidAmount || 0)}
              </span>
            </div>
            <div
              className={`flex justify-between text-base font-semibold pt-2 border-t border-border ${
                totals && totals.balanceAmount > 0
                  ? 'text-red-600'
                  : totals && totals.balanceAmount < 0
                  ? 'text-green-600'
                  : 'text-foreground'
              }`}
            >
              <span>Balance:</span>
              <span>
                {formatCurrency(totals?.balanceAmount || invoice.balanceAmount || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="border-t border-border pt-6 space-y-6">
            {invoice.notes && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Terms & Conditions
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>This is a computer-generated invoice. No signature required.</p>
          <p className="mt-1">Generated on {formatDateForDisplay(new Date())}</p>
        </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Amount</p>
              <p className="text-xl font-bold mt-1.5 tabular-nums">
                {formatCurrency(totals?.totalAmount || invoice.totalAmount || 0)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paid</p>
              <p className="text-xl font-bold text-green-600 mt-1.5 tabular-nums">
                {formatCurrency(totals?.paidAmount || invoice.paidAmount || 0)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</p>
              <p
                className={`text-xl font-bold mt-1.5 tabular-nums ${
                  totals && totals.balanceAmount > 0
                    ? 'text-red-600'
                    : totals && totals.balanceAmount < 0
                    ? 'text-green-600'
                    : 'text-primary'
                }`}
              >
                {formatCurrency(totals?.balanceAmount || invoice.balanceAmount || 0)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

