'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  FileText,
  Download,
  Printer,
  Mail,
  Phone,
  MapPin,
  RefreshCcw,
  Edit2,
  Calculator,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Check,
  X,
  RotateCcw,
  Pause,
  Play,
  Split,
  Send,
  AlertCircle,
  Shield,
  Ban,
  MoreVertical,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const PAYROLL_BASE = '/teachers/payroll';

const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

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

/** Format category slug to title (e.g. provident-fund -> Provident Fund) */
const formatCategory = (category) => {
  if (!category) return '—';
  return String(category)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const PAYMENT_METHODS = [
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
];

export default function PayrollDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const payrollId = params?.id;
  const printRef = useRef(null);

  const [payroll, setPayroll] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showPaySlipSentModal, setShowPaySlipSentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentSplitModal, setShowPaymentSplitModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [reversalReason, setReversalReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [holdFrom, setHoldFrom] = useState('');
  const [holdTo, setHoldTo] = useState('');
  const [paySlipSentTo, setPaySlipSentTo] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    accountId: '',
    paymentDate: formatDateForInput(new Date()),
    paymentMethod: 'bank-transfer',
    transactionReference: '',
  });
  const [processingAction, setProcessingAction] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [ytdData, setYtdData] = useState(null);

  const fetchPayrollDetails = useCallback(async () => {
    if (!payrollId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`${PAYROLL_BASE}/${payrollId}`, {}, true);
      const data = response?.data || response;
      setPayroll(data);

      // Fetch teacher details if available
      if (data.teacher) {
        const teacherId = typeof data.teacher === 'object' ? data.teacher._id : data.teacher;
        if (teacherId) {
          try {
            const teacherResponse = await api.get(`/teachers/${teacherId}`, {}, true);
            const teacherData = teacherResponse?.data || teacherResponse;
            setTeacher(teacherData);
          } catch (err) {
            console.error('Failed to load teacher:', err);
            // Use embedded teacher data if available
            if (typeof data.teacher === 'object') {
              setTeacher(data.teacher);
            }
          }
        } else if (typeof data.teacher === 'object') {
          setTeacher(data.teacher);
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
      setError(err.message || 'Failed to load payroll details');
    } finally {
      setLoading(false);
    }
  }, [payrollId, user?.college]);

  const fetchAccounts = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/finance/accounts', {}, true);
      const data = response?.data || response || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, [user?.college]);

  const fetchYTD = useCallback(async () => {
    if (!payroll?.teacher || !payroll?.year) return;
    try {
      const teacherId = typeof payroll.teacher === 'object' ? payroll.teacher._id : payroll.teacher;
      const response = await api.get(
        `${PAYROLL_BASE}/ytd?teacherId=${teacherId}&year=${payroll.year}&month=${payroll.month}`,
        {},
        true
      );
      setYtdData(response?.data || response);
    } catch (err) {
      console.error('Failed to load YTD data:', err);
    }
  }, [payroll]);

  useEffect(() => {
    if (!user?.college) return;
    fetchPayrollDetails();
    fetchAccounts();
  }, [user?.college, payrollId, fetchPayrollDetails, fetchAccounts]);

  useEffect(() => {
    if (payroll) {
      fetchYTD();
    }
  }, [payroll, fetchYTD]);

  const showSuccessMessage = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleApprove = async () => {
    if (!payroll?._id) return;
    setError('');
    setProcessingAction('approving');
    try {
      await api.post(
        `${PAYROLL_BASE}/${payroll._id}/approve`,
        { comments: approvalComment },
        {},
        true
      );
      showSuccessMessage('Payroll approved successfully');
      setShowApprovalModal(false);
      setApprovalComment('');
      await fetchPayrollDetails();
    } catch (err) {
      setError(err.message || 'Failed to approve payroll');
    } finally {
      setProcessingAction('');
    }
  };

  const handleReject = async (e) => {
    e?.preventDefault?.();
    if (!payroll?._id || !rejectComment.trim()) return;
    setError('');
    setProcessingAction('rejecting');
    try {
      await api.post(
        `${PAYROLL_BASE}/${payroll._id}/reject`,
        { comments: rejectComment.trim() },
        {},
        true
      );
      showSuccessMessage('Payroll rejected');
      setShowRejectModal(false);
      setRejectComment('');
      await fetchPayrollDetails();
    } catch (err) {
      setError(err.message || 'Failed to reject payroll');
    } finally {
      setProcessingAction('');
    }
  };

  const handleReverse = async () => {
    if (!payroll?._id) return;
    setError('');
    setProcessingAction('reversing');
    try {
      await api.post(
        `${PAYROLL_BASE}/${payroll._id}/reverse`,
        { reason: reversalReason },
        {},
        true
      );
      showSuccessMessage('Payroll reversed successfully');
      setShowReversalModal(false);
      setReversalReason('');
      await fetchPayrollDetails();
    } catch (err) {
      setError(err.message || 'Failed to reverse payroll');
    } finally {
      setProcessingAction('');
    }
  };

  const handleHold = async () => {
    if (!payroll?._id) return;
    setError('');
    setProcessingAction('holding');
    try {
      await api.post(
        `${PAYROLL_BASE}/${payroll._id}/hold`,
        {
          reason: holdReason,
          holdFrom: holdFrom || undefined,
          holdTo: holdTo || undefined,
        },
        {},
        true
      );
      showSuccessMessage('Payroll put on hold');
      setShowHoldModal(false);
      setHoldReason('');
      setHoldFrom('');
      setHoldTo('');
      await fetchPayrollDetails();
    } catch (err) {
      setError(err.message || 'Failed to hold payroll');
    } finally {
      setProcessingAction('');
    }
  };

  const handleUnhold = async () => {
    if (!payroll?._id) return;
    setError('');
    setProcessingAction('unholding');
    try {
      await api.post(
        `${PAYROLL_BASE}/${payroll._id}/unhold`,
        {},
        {},
        true
      );
      showSuccessMessage('Payroll unhold successfully');
      await fetchPayrollDetails();
    } catch (err) {
      setError(err.message || 'Failed to unhold payroll');
    } finally {
      setProcessingAction('');
    }
  };

  const handleGeneratePaySlip = async () => {
    if (!payroll?._id) return;
    setError('');
    setProcessingAction('generating-payslip');
    try {
      await api.post(
        `${PAYROLL_BASE}/${payroll._id}/payslip/generate`,
        {},
        {},
        true
      );
      showSuccessMessage('Pay slip generated successfully');
      await fetchPayrollDetails();
    } catch (err) {
      setError(err.message || 'Failed to generate pay slip');
    } finally {
      setProcessingAction('');
    }
  };

  const handleMarkPaySlipSent = async (e) => {
    e?.preventDefault?.();
    if (!payroll?._id) return;
    setError('');
    setProcessingAction('sending-payslip');
    try {
      await api.post(
        `${PAYROLL_BASE}/${payroll._id}/payslip/sent`,
        { sentTo: paySlipSentTo?.trim() || '' },
        {},
        true
      );
      showSuccessMessage('Pay slip marked as sent');
      setShowPaySlipSentModal(false);
      setPaySlipSentTo('');
      await fetchPayrollDetails();
    } catch (err) {
      setError(err.message || 'Failed to mark pay slip as sent');
    } finally {
      setProcessingAction('');
    }
  };

  const handleProcessPayment = async (e) => {
    e?.preventDefault?.();
    if (!payroll?._id) return;
    setError('');
    setProcessingAction('payment');
    try {
      await api.post(
        `${PAYROLL_BASE}/${payroll._id}/pay`,
        {
          accountId: paymentForm.accountId || undefined,
          paymentDate: paymentForm.paymentDate || undefined,
          paymentMethod: paymentForm.paymentMethod || undefined,
          transactionReference: paymentForm.transactionReference?.trim() || undefined,
        },
        {},
        true
      );
      showSuccessMessage('Payment processed successfully');
      setShowPaymentModal(false);
      setPaymentForm({
        accountId: '',
        paymentDate: formatDateForInput(new Date()),
        paymentMethod: 'bank-transfer',
        transactionReference: '',
      });
      await fetchPayrollDetails();
      await fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessingAction('');
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (!payroll) return null;
    const baseSalary = payroll.baseSalary || 0;
    const allowances = (payroll.items || [])
      .filter((item) => item.type === 'allowance')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const deductions = (payroll.items || [])
      .filter((item) => item.type === 'deduction')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const gross = baseSalary + allowances;
    const net = gross - deductions;
    return { baseSalary, allowances, deductions, gross, net };
  }, [payroll]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    if (!payroll) return;
    setExporting(true);
    try {
      const csvRows = [];
      
      // Header
      csvRows.push(['Payroll Details']);
      csvRows.push([]);
      
      // Basic Information
      csvRows.push(['Payroll Number', payroll.payrollNumber || '']);
      csvRows.push(['Teacher', teacher?.name || payroll.teacher?.name || '']);
      csvRows.push(['Employee ID', teacher?.employeeId || payroll.teacher?.employeeId || '']);
      csvRows.push(['Period', `${payroll.month}/${payroll.year}`]);
      csvRows.push(['Status', payroll.status || '']);
      csvRows.push(['Created Date', formatDateForCSV(payroll.createdAt)]);
      csvRows.push([]);
      
      // Attendance Information
      csvRows.push(['Attendance Details']);
      csvRows.push(['Present Days', payroll.presentDays || 0]);
      csvRows.push(['Absent Days', payroll.absentDays || 0]);
      csvRows.push(['Leave Days', payroll.leaveDays || 0]);
      csvRows.push(['Half Days', payroll.halfDays || 0]);
      csvRows.push([]);
      
      // Salary Breakdown
      csvRows.push(['Salary Breakdown']);
      csvRows.push(['Base Salary', payroll.baseSalary || 0]);
      csvRows.push(['Gross Salary', payroll.grossSalary || 0]);
      csvRows.push(['Net Salary', payroll.netSalary || 0]);
      csvRows.push([]);
      
      // Salary breakup items
      if (payroll.items && payroll.items.length > 0) {
        csvRows.push(['Salary breakup']);
        csvRows.push(['Type', 'Description', 'Category', 'Amount', 'Taxable', 'Exempted']);
        payroll.items.forEach((item) => {
          csvRows.push([
            item.type || '',
            item.description || item.name || '',
            item.category || '',
            item.amount || 0,
            item.isTaxable !== false ? 'Yes' : 'No',
            item.isExempted ? 'Yes' : 'No',
          ]);
        });
        csvRows.push([]);
      }
      
      // Payment Information
      if (payroll.paymentDate) {
        csvRows.push(['Payment Information']);
        csvRows.push(['Payment Date', formatDateForCSV(payroll.paymentDate)]);
        csvRows.push(['Payment Method', payroll.paymentMethod || '']);
        csvRows.push(['Transaction Reference', payroll.transactionReference || '']);
        csvRows.push(['Account', account?.name || payroll.account?.name || '']);
      }
      
      // Convert to CSV string
      const csvContent = csvRows.map((row) => 
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payroll-${payroll.payrollNumber || payrollId}.csv`);
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
  }, [payroll, teacher, account, payrollId]);

  // Export to PDF (using browser print)
  const handleExportPDF = useCallback(() => {
    if (!payroll || !printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }
    
    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payroll - ${payroll.payrollNumber || 'Details'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { font-size: 24px; margin-bottom: 10px; }
            .section { margin-bottom: 30px; }
            .section h2 { font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .item { margin-bottom: 10px; }
            .item-label { font-weight: bold; color: #666; font-size: 12px; }
            .item-value { font-size: 14px; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table th, table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            table th { background-color: #f0f0f0; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .text-right { text-align: right; }
            .summary-box { border: 1px solid #ccc; padding: 15px; margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .summary-row.total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: bold; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [payroll]);

  // Print function
  const handlePrint = useCallback(() => {
    if (!payroll || !printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    
    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payroll - ${payroll.payrollNumber || 'Details'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; background: #fff; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { font-size: 24px; margin-bottom: 10px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section h2 { font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .section h3 { font-size: 16px; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
            .item { margin-bottom: 10px; }
            .item-label { font-weight: bold; color: #666; font-size: 12px; }
            .item-value { font-size: 14px; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table th, table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            table th { background-color: #f0f0f0; font-weight: bold; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .text-right { text-align: right; }
            .summary-box { border: 1px solid #ccc; padding: 15px; margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .summary-row.total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: bold; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }, [payroll]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading payroll details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payroll) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Payroll not found'}</p>
            <Button onClick={() => router.push('/app/payroll')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Payroll
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusBadgeClass = {
    paid: 'bg-green-500/10 text-green-600 dark:text-green-400',
    approved: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    'on-hold': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    reversed: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Header - compact */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/app/payroll')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold truncate">
                {payroll.payrollNumber || 'Payroll'}
              </h1>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                  statusBadgeClass[payroll.status] || 'bg-muted text-muted-foreground'
                }`}
              >
                {payroll.status}
              </span>
              {payroll.isOnHold && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                  On hold
                </span>
              )}
              {payroll.isReversed && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600">
                  Reversed
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Period {payroll.month}/{payroll.year}
              {teacher?.name || payroll.teacher?.name ? ` · ${teacher?.name || payroll.teacher?.name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchPayrollDetails} disabled={loading} className="gap-1.5">
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting...' : 'CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <MoreVertical className="h-3.5 w-3.5" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {(payroll.status === 'pending' || payroll.status === 'draft') && (
                <>
                  <DropdownMenuItem onClick={() => { setApprovalComment(''); setShowApprovalModal(true); }}>
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setRejectComment(''); setShowRejectModal(true); }} className="text-destructive focus:text-destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              {payroll.status === 'paid' && !payroll.isReversed && (
                <DropdownMenuItem onClick={() => setShowReversalModal(true)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reverse
                </DropdownMenuItem>
              )}
              {!payroll.isOnHold && (payroll.status === 'pending' || payroll.status === 'approved') && payroll.status !== 'paid' && (
                <DropdownMenuItem onClick={() => setShowHoldModal(true)}>
                  <Pause className="h-4 w-4 mr-2" />
                  Put on hold
                </DropdownMenuItem>
              )}
              {payroll.isOnHold && (
                <DropdownMenuItem onClick={handleUnhold}>
                  <Play className="h-4 w-4 mr-2" />
                  Release hold
                </DropdownMenuItem>
              )}
              {payroll.status === 'approved' && (
                <DropdownMenuItem onClick={() => { setPaymentForm({ accountId: '', paymentDate: formatDateForInput(new Date()), paymentMethod: 'bank-transfer', transactionReference: '' }); setShowPaymentModal(true); }}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Process payment
                </DropdownMenuItem>
              )}
              {payroll.status !== 'paid' && payroll.status !== 'reversed' && !payroll.isReversed && (
                <DropdownMenuItem onClick={() => router.push(`/app/payroll?edit=${payrollId}`)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit payroll
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Main content - print/export area */}
      <div ref={printRef} className="rounded-lg border bg-card p-5 space-y-5">
        {/* Header Section */}
        <div className="border-b border-border pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Payroll Statement</h2>
              <p className="text-muted-foreground mt-1">
                {payroll.payrollNumber || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Generated Date</p>
              <p className="font-semibold">
                {formatDateForDisplay(payroll.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Teacher Information */}
        <div className="border-b border-border pb-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <User className="h-5 w-5" />
            Teacher Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium mt-1">
                {teacher?.name || payroll.teacher?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employee ID</p>
              <p className="font-medium mt-1">
                {teacher?.employeeId || payroll.teacher?.employeeId || 'N/A'}
              </p>
            </div>
            {teacher?.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{teacher.email}</p>
                </div>
              </div>
            )}
            {teacher?.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{teacher.phone}</p>
                </div>
              </div>
            )}
            {teacher?.department && (
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium mt-1">{teacher.department}</p>
              </div>
            )}
            {teacher?.designation && (
              <div>
                <p className="text-sm text-muted-foreground">Designation</p>
                <p className="font-medium mt-1">{teacher.designation}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payroll Period & Status */}
        <div className="border-b border-border pb-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payroll Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Month</p>
              <p className="font-medium mt-1">{payroll.month}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year</p>
              <p className="font-medium mt-1">{payroll.year}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium mt-1 capitalize">{payroll.status}</p>
            </div>
            {payroll.createdAt && (
              <div>
                <p className="text-sm text-muted-foreground">Created Date</p>
                <p className="font-medium mt-1">
                  {formatDateForDisplay(payroll.createdAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Information */}
        <div className="border-b border-border pb-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Attendance Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Present Days</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {payroll.presentDays || 0}
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Absent Days</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {payroll.absentDays || 0}
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Leave Days</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {payroll.leaveDays || 0}
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Half Days</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {payroll.halfDays || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Salary Breakdown - Full breakup */}
        <div className="border-b border-border pb-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Salary breakup
          </h3>

          <div className="space-y-5">
            {/* Base salary */}
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Base salary</span>
                <span className="font-semibold">{formatCurrency(payroll.baseSalary || 0)}</span>
              </div>
            </div>

            {/* Allowances */}
            {(payroll.items || []).filter((i) => i.type === 'allowance').length > 0 && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-500 mb-2">
                  Allowances
                </h4>
                <div className="space-y-2">
                  {payroll.items
                    .filter((i) => i.type === 'allowance')
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-start gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.description || '—'}</p>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {item.category && (
                              <span className="text-xs text-muted-foreground">
                                {formatCategory(item.category)}
                              </span>
                            )}
                            {item.isExempted && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                Exempt
                              </span>
                            )}
                            {item.isTaxable === false && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400">
                                Non-taxable
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-medium text-green-600 dark:text-green-400 shrink-0">
                          +{formatCurrency(item.amount || 0)}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-green-500/20">
                  <span>Total allowances</span>
                  <span className="text-green-600 dark:text-green-400">
                    +{formatCurrency(totals?.allowances || 0)}
                  </span>
                </div>
              </div>
            )}

            {/* Gross */}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Gross salary</span>
                <span className="font-semibold">
                  {formatCurrency(payroll.grossSalary || totals?.gross || 0)}
                </span>
              </div>
            </div>

            {/* Deductions */}
            {(payroll.items || []).filter((i) => i.type === 'deduction').length > 0 && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-500 mb-2">
                  Deductions
                </h4>
                <div className="space-y-2">
                  {payroll.items
                    .filter((i) => i.type === 'deduction')
                    .map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-start gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.description || '—'}</p>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {item.category && (
                              <span className="text-xs text-muted-foreground">
                                {formatCategory(item.category)}
                              </span>
                            )}
                            {item.isExempted && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                Exempt
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-medium text-red-600 dark:text-red-400 shrink-0">
                          −{formatCurrency(item.amount || 0)}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-red-500/20">
                  <span>Total deductions</span>
                  <span className="text-red-600 dark:text-red-400">
                    −{formatCurrency(totals?.deductions || 0)}
                  </span>
                </div>
              </div>
            )}

            {/* Net salary */}
            <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Net salary</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(payroll.netSalary || totals?.net || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {payroll.paymentDate && (
          <div className="border-b border-border pb-4">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment Date</p>
                <p className="font-medium mt-1">
                  {formatDateForDisplay(payroll.paymentDate)}
                </p>
              </div>
              {payroll.paymentMethod && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium mt-1 capitalize">
                    {payroll.paymentMethod.replace('-', ' ')}
                  </p>
                </div>
              )}
              {payroll.transactionReference && (
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Reference</p>
                  <p className="font-medium mt-1">{payroll.transactionReference}</p>
                </div>
              )}
              {account && (
                <div>
                  <p className="text-sm text-muted-foreground">Account</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{account.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-border">
          <div className="text-center text-sm text-muted-foreground">
            <p>This is a computer-generated document. No signature required.</p>
            <p className="mt-1">
              Generated on {formatDateForDisplay(new Date())}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards - compact */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Base</p>
          <p className="text-lg font-semibold mt-1">{formatCurrency(payroll.baseSalary || 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Gross</p>
          <p className="text-lg font-semibold mt-1">{formatCurrency(payroll.grossSalary || totals?.gross || 0)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net</p>
          <p className="text-lg font-semibold text-primary mt-1">{formatCurrency(payroll.netSalary || totals?.net || 0)}</p>
        </div>
      </div>

      {/* Payslip section - after approval */}
      {(payroll.status === 'approved' || payroll.status === 'paid') && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4" />
            Payslip
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {!payroll.paySlipGenerated ? (
              <>
                <p className="text-sm text-muted-foreground">Generate pay slip for this payroll.</p>
                <Button
                  size="sm"
                  onClick={handleGeneratePaySlip}
                  disabled={processingAction === 'generating-payslip'}
                  className="gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {processingAction === 'generating-payslip' ? 'Generating...' : 'Generate pay slip'}
                </Button>
              </>
            ) : !payroll.paySlipSent ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Generated {payroll.paySlipGeneratedAt ? formatDateForDisplay(payroll.paySlipGeneratedAt) : ''}.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setPaySlipSentTo(payroll.paySlipSentTo || ''); setShowPaySlipSentModal(true); }}
                  disabled={processingAction === 'sending-payslip'}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {processingAction === 'sending-payslip' ? 'Sending...' : 'Mark as sent'}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Sent to {payroll.paySlipSentTo || '—'} {payroll.paySlipSentAt ? `on ${formatDateForDisplay(payroll.paySlipSentAt)}` : ''}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showApprovalModal} onOpenChange={(o) => { if (!o) { setShowApprovalModal(false); setApprovalComment(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Comments (optional)</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Approval comments..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowApprovalModal(false); setApprovalComment(''); }}>Cancel</Button>
              <Button onClick={handleApprove} disabled={processingAction === 'approving'}>
                {processingAction === 'approving' ? 'Approving...' : 'Approve'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectModal} onOpenChange={(o) => { if (!o) setShowRejectModal(false); setRejectComment(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payroll</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reason <span className="text-destructive">*</span></label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Rejection reason (required)"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowRejectModal(false); setRejectComment(''); }}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={!rejectComment.trim() || processingAction === 'rejecting'}>
                {processingAction === 'rejecting' ? 'Rejecting...' : 'Reject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showReversalModal} onOpenChange={(o) => { if (!o) { setShowReversalModal(false); setReversalReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse Payroll</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleReverse(); }} className="space-y-4">
            <p className="text-sm text-muted-foreground">This will create a reversal entry and revert finance records.</p>
            <div>
              <label className="block text-sm font-medium mb-2">Reason (optional)</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Reason for reversal..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowReversalModal(false); setReversalReason(''); }}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={processingAction === 'reversing'}>
                {processingAction === 'reversing' ? 'Reversing...' : 'Reverse'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showHoldModal} onOpenChange={(o) => { if (!o) { setShowHoldModal(false); setHoldReason(''); setHoldFrom(''); setHoldTo(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Put Payroll on Hold</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleHold(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reason (optional)</label>
              <Input value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="Hold reason" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Hold from</label>
                <Input type="date" value={holdFrom} onChange={(e) => setHoldFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hold to (optional)</label>
                <Input type="date" value={holdTo} onChange={(e) => setHoldTo(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowHoldModal(false); setHoldReason(''); setHoldFrom(''); setHoldTo(''); }}>Cancel</Button>
              <Button type="submit" disabled={processingAction === 'holding'}>
                {processingAction === 'holding' ? 'Holding...' : 'Put on hold'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaySlipSentModal} onOpenChange={(o) => { if (!o) { setShowPaySlipSentModal(false); setPaySlipSentTo(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Pay Slip Sent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMarkPaySlipSent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sent to (e.g. email)</label>
              <Input
                value={paySlipSentTo}
                onChange={(e) => setPaySlipSentTo(e.target.value)}
                placeholder="Email or contact"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowPaySlipSentModal(false); setPaySlipSentTo(''); }}>Cancel</Button>
              <Button type="submit" disabled={processingAction === 'sending-payslip'}>
                {processingAction === 'sending-payslip' ? 'Saving...' : 'Mark sent'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentModal} onOpenChange={(o) => { if (!o) setShowPaymentModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProcessPayment} className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">{payroll.payrollNumber}</p>
              <p className="text-muted-foreground">Net: {formatCurrency(payroll.netSalary || 0)}</p>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Account</label>
                <select
                  value={paymentForm.accountId}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, accountId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment date</label>
                <Input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Transaction reference</label>
                <Input value={paymentForm.transactionReference} onChange={(e) => setPaymentForm((p) => ({ ...p, transactionReference: e.target.value }))} placeholder="Reference" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button type="submit" disabled={processingAction === 'payment'}>
                {processingAction === 'payment' ? 'Processing...' : 'Process payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Additional Information Sections */}
      {payroll && (
        <>
          {/* Approval Workflow */}
          {payroll.approvalWorkflow && payroll.approvalWorkflow.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Approval Workflow
              </h3>
              <div className="space-y-3">
                {payroll.approvalWorkflow.map((approval, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md border ${
                      approval.status === 'approved'
                        ? 'bg-green-500/10 border-green-500/20'
                        : approval.status === 'rejected'
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-gray-500/10 border-gray-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {approval.approver?.name || 'Approver'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Level {approval.level}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded capitalize ${
                          approval.status === 'approved'
                            ? 'bg-green-500/20 text-green-600'
                            : approval.status === 'rejected'
                            ? 'bg-red-500/20 text-red-600'
                            : 'bg-gray-500/20 text-gray-600'
                        }`}
                      >
                        {approval.status}
                      </span>
                    </div>
                    {approval.comments && (
                      <p className="text-sm mt-2 text-muted-foreground">
                        {approval.comments}
                      </p>
                    )}
                    {approval.approvedAt && (
                      <p className="text-xs mt-1 text-muted-foreground">
                        {formatDateForDisplay(approval.approvedAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Splits */}
          {payroll.paymentSplits && payroll.paymentSplits.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Split className="h-5 w-5" />
                Payment Splits
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold">Amount</th>
                      <th className="text-left p-3 font-semibold">Payment Date</th>
                      <th className="text-left p-3 font-semibold">Method</th>
                      <th className="text-left p-3 font-semibold">Account</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.paymentSplits.map((split, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-3">{formatCurrency(split.amount || 0)}</td>
                        <td className="p-3">
                          {split.paymentDate
                            ? formatDateForDisplay(split.paymentDate)
                            : '-'}
                        </td>
                        <td className="p-3 capitalize">
                          {split.paymentMethod?.replace('-', ' ') || '-'}
                        </td>
                        <td className="p-3">
                          {split.account?.name || '-'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              split.status === 'paid'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-yellow-500/10 text-yellow-600'
                            }`}
                          >
                            {split.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* YTD Information */}
          {ytdData && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Year-to-Date (YTD) Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">YTD Gross Salary</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(ytdData.grossSalary || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">YTD Net Salary</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(ytdData.netSalary || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Payrolls</p>
                  <p className="text-2xl font-bold mt-1">
                    {ytdData.payrolls?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reversal Information */}
          {payroll.isReversed && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Reversal Information
              </h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Reversed At:</span>{' '}
                  {payroll.reversedAt
                    ? formatDateForDisplay(payroll.reversedAt)
                    : '-'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Reversed By:</span>{' '}
                  {payroll.reversedBy?.name || '-'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Reason:</span>{' '}
                  {payroll.reversalReason || '-'}
                </p>
                {payroll.reversalPayroll && (
                  <p className="text-sm">
                    <span className="font-medium">Reversal Payroll:</span>{' '}
                    {payroll.reversalPayroll.payrollNumber || '-'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Hold Information */}
          {payroll.isOnHold && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Pause className="h-5 w-5" />
                Hold Information
              </h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Reason:</span> {payroll.holdReason || '-'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Hold From:</span>{' '}
                  {payroll.holdFrom
                    ? formatDateForDisplay(payroll.holdFrom)
                    : '-'}
                </p>
                {payroll.holdTo && (
                  <p className="text-sm">
                    <span className="font-medium">Hold To:</span>{' '}
                    {formatDateForDisplay(payroll.holdTo)}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

