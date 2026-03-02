'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCcw,
  Eye,
  Filter,
  Calculator,
  CreditCard,
  CheckCircle,
  XCircle,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  FileText,
  Send,
  Split,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const PAYROLL_BASE = '/teachers/payroll';

const EMPTY_PAYROLL_ITEM = {
  type: 'allowance',
  description: '',
  amount: '',
  category: '',
  isTaxable: true,
  isExempted: false,
  exemptionLimit: 0,
  reference: '',
  applicableFrom: '',
  applicableTo: '',
};

const EMPTY_PAYROLL = {
  staff: '',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  periodStart: '',
  periodEnd: '',
  items: [],
  overtimeHours: '',
  overtimeRate: '',
  leaveEncashment: {
    eligibleDays: '',
    encashedDays: '',
    ratePerDay: '',
  },
  bonus: '',
  incentives: '',
  arrears: {
    amount: '',
    fromPeriod: { month: '', year: '' },
    toPeriod: { month: '', year: '' },
    reason: '',
  },
  loanDeductions: [],
  advanceDeductions: [],
  reimbursements: [],
  taxDetails: {
    taxableIncome: 0,
    incomeTax: 0,
    tds: 0,
    providentFund: {
      employee: 0,
      employer: 0,
    },
    esi: {
      employee: 0,
      employer: 0,
    },
    professionalTax: 0,
    otherTaxes: 0,
  },
  taxExemptions: {
    section80C: 0,
    section80D: 0,
    section24: 0,
    hraExemption: 0,
    otherExemptions: 0,
  },
  department: '',
  costCenter: '',
  notes: '',
  internalNotes: '',
  tags: [],
};

const PAYROLL_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'reversed', label: 'Reversed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ITEM_TYPES = [
  { value: 'allowance', label: 'Allowance' },
  { value: 'deduction', label: 'Deduction' },
];

const ITEM_CATEGORIES = {
  allowance: [
    { value: 'hra', label: 'HRA' },
    { value: 'transport', label: 'Transport' },
    { value: 'medical', label: 'Medical' },
    { value: 'special', label: 'Special' },
    { value: 'performance', label: 'Performance' },
    { value: 'overtime', label: 'Overtime' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'incentive', label: 'Incentive' },
    { value: 'arrears', label: 'Arrears' },
    { value: 'reimbursement', label: 'Reimbursement' },
    { value: 'leave-encashment', label: 'Leave Encashment' },
    { value: 'other', label: 'Other' },
  ],
  deduction: [
    { value: 'income-tax', label: 'Income Tax' },
    { value: 'provident-fund', label: 'Provident Fund' },
    { value: 'professional-tax', label: 'Professional Tax' },
    { value: 'esi', label: 'ESI' },
    { value: 'loan', label: 'Loan' },
    { value: 'advance', label: 'Advance' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'other', label: 'Other' },
  ],
};

const REIMBURSEMENT_TYPES = [
  { value: 'travel', label: 'Travel' },
  { value: 'medical', label: 'Medical' },
  { value: 'meal', label: 'Meal' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
  { value: 'neft', label: 'NEFT' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'imps', label: 'IMPS' },
];

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

export default function PayrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [payrolls, setPayrolls] = useState([]);
  const [staff, setStaff] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [processingPayment, setProcessingPayment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [showSplitsDialog, setShowSplitsDialog] = useState(false);
  const [showYTDDialog, setShowYTDDialog] = useState(false);
  const [showPaySlipSentDialog, setShowPaySlipSentDialog] = useState(false);
  const [actionPayroll, setActionPayroll] = useState(null);
  const [processingAction, setProcessingAction] = useState('');
  const [approvalForm, setApprovalForm] = useState({ comments: '', level: '' });
  const [rejectForm, setRejectForm] = useState({ comments: '', level: '' });
  const [reverseForm, setReverseForm] = useState({ reason: '' });
  const [holdForm, setHoldForm] = useState({ reason: '', holdFrom: '', holdTo: '' });
  const [splitForm, setSplitForm] = useState({
    amount: '',
    paymentDate: formatDateForInput(new Date()),
    paymentMethod: 'bank-transfer',
    account: '',
    transactionReference: '',
  });
  const [ytdFilters, setYtdFilters] = useState({
    teacherId: '',
    year: new Date().getFullYear().toString(),
    month: new Date().getMonth() + 1,
  });
  const [ytdData, setYtdData] = useState(null);
  const [paySlipSentTo, setPaySlipSentTo] = useState('');
  const [usePaymentSplits, setUsePaymentSplits] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    teacherId: '',
    status: '',
    month: '',
    year: new Date().getFullYear().toString(),
    department: '',
    costCenter: '',
    isReversed: '',
    isOnHold: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [payrollForm, setPayrollForm] = useState(EMPTY_PAYROLL);
  const [paymentForm, setPaymentForm] = useState({
    accountId: '',
    paymentDate: formatDateForInput(new Date()),
    paymentMethod: 'bank-transfer',
    transactionReference: '',
  });

  const fetchStaff = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/teachers?limit=1000', {}, true);
      const data = response?.data || response || [];
      // Filter to only non-teaching staff
      const nonTeachingStaff = Array.isArray(data) ? data.filter(s => s.staffType === 'non-teaching') : [];
      setStaff(data);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  }, [user?.college]);

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

  const fetchPayrolls = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();

      if (filters.teacherId) params.append('teacherId', filters.teacherId);
      if (filters.status) params.append('status', filters.status);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      if (filters.department) params.append('department', filters.department);
      if (filters.costCenter) params.append('costCenter', filters.costCenter);
      if (filters.isReversed !== '') params.append('isReversed', filters.isReversed);
      if (filters.isOnHold !== '') params.append('isOnHold', filters.isOnHold);
      
      // Add pagination
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await api.get(
        `${PAYROLL_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      const list = Array.isArray(data) ? data : [];
      
      // Update pagination if available
      if (response?.pagination) {
        setPagination(response.pagination);
      }

      setPayrolls(list);
    } catch (err) {
      setError(err.message || 'Failed to load payrolls');
    } finally {
      setLoading(false);
    }
  }, [
    user?.college,
    filters.teacherId,
    filters.status,
    filters.month,
    filters.year,
  ]);

  useEffect(() => {
    if (!user?.college) return;
    fetchStaff();
    fetchAccounts();
  }, [user?.college, fetchStaff, fetchAccounts]);

  useEffect(() => {
    if (!user?.college) return;
    fetchPayrolls();
  }, [user?.college, fetchPayrolls]);

  // Open edit form when navigating from details with ?edit=id
  const editIdFromUrl = searchParams.get('edit');
  const openedEditIdRef = useRef(null);
  useEffect(() => {
    if (!editIdFromUrl || payrolls.length === 0 || openedEditIdRef.current === editIdFromUrl) return;
    const payroll = payrolls.find((p) => p._id === editIdFromUrl);
    if (payroll) {
      openedEditIdRef.current = editIdFromUrl;
      handleEditPayroll(payroll);
      router.replace('/app/payroll', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdFromUrl, payrolls]);

  const resetForm = useCallback(() => {
    setPayrollForm(EMPTY_PAYROLL);
    setEditingPayroll(null);
    setShowForm(false);
  }, []);

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setPayrollForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setPayrollForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setPayrollForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_PAYROLL_ITEM }],
    }));
  };

  const addLoanDeduction = () => {
    setPayrollForm((prev) => ({
      ...prev,
      loanDeductions: [...(prev.loanDeductions || []), {
        description: '',
        principal: '',
        interest: '',
      }],
    }));
  };

  const removeLoanDeduction = (index) => {
    setPayrollForm((prev) => ({
      ...prev,
      loanDeductions: prev.loanDeductions.filter((_, i) => i !== index),
    }));
  };

  const handleLoanDeductionChange = (index, field, value) => {
    setPayrollForm((prev) => {
      const newDeductions = [...(prev.loanDeductions || [])];
      newDeductions[index] = {
        ...newDeductions[index],
        [field]: value,
      };
      return { ...prev, loanDeductions: newDeductions };
    });
  };

  const addAdvanceDeduction = () => {
    setPayrollForm((prev) => ({
      ...prev,
      advanceDeductions: [...(prev.advanceDeductions || []), {
        description: '',
        amount: '',
      }],
    }));
  };

  const removeAdvanceDeduction = (index) => {
    setPayrollForm((prev) => ({
      ...prev,
      advanceDeductions: prev.advanceDeductions.filter((_, i) => i !== index),
    }));
  };

  const handleAdvanceDeductionChange = (index, field, value) => {
    setPayrollForm((prev) => {
      const newDeductions = [...(prev.advanceDeductions || [])];
      newDeductions[index] = {
        ...newDeductions[index],
        [field]: value,
      };
      return { ...prev, advanceDeductions: newDeductions };
    });
  };

  const addReimbursement = () => {
    setPayrollForm((prev) => ({
      ...prev,
      reimbursements: [...(prev.reimbursements || []), {
        type: 'travel',
        description: '',
        amount: '',
        receiptNumber: '',
        receiptDate: '',
      }],
    }));
  };

  const removeReimbursement = (index) => {
    setPayrollForm((prev) => ({
      ...prev,
      reimbursements: prev.reimbursements.filter((_, i) => i !== index),
    }));
  };

  const handleReimbursementChange = (index, field, value) => {
    setPayrollForm((prev) => {
      const newReimbursements = [...(prev.reimbursements || [])];
      newReimbursements[index] = {
        ...newReimbursements[index],
        [field]: value,
      };
      return { ...prev, reimbursements: newReimbursements };
    });
  };

  const removeItem = (index) => {
    setPayrollForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const payload = {
        teacherId: payrollForm.staff,
        month: parseInt(payrollForm.month),
        year: parseInt(payrollForm.year),
        periodStart: payrollForm.periodStart || undefined,
        periodEnd: payrollForm.periodEnd || undefined,
        items: payrollForm.items
          .filter((item) => item.description && item.amount)
          .map(item => ({
            description: item.description,
            amount: parseFloat(item.amount),
            type: item.type,
            category: item.category || undefined,
            isTaxable: item.isTaxable !== false,
            isExempted: item.isExempted === true,
            exemptionLimit: item.exemptionLimit ? parseFloat(item.exemptionLimit) : 0,
            reference: item.reference || undefined,
            applicableFrom: item.applicableFrom || undefined,
            applicableTo: item.applicableTo || undefined,
          })),
        overtimeHours: payrollForm.overtimeHours ? parseFloat(payrollForm.overtimeHours) : undefined,
        overtimeRate: payrollForm.overtimeRate ? parseFloat(payrollForm.overtimeRate) : undefined,
        leaveEncashment: payrollForm.leaveEncashment?.encashedDays && payrollForm.leaveEncashment?.ratePerDay
          ? {
              eligibleDays: payrollForm.leaveEncashment.eligibleDays ? parseFloat(payrollForm.leaveEncashment.eligibleDays) : 0,
              encashedDays: parseFloat(payrollForm.leaveEncashment.encashedDays),
              ratePerDay: parseFloat(payrollForm.leaveEncashment.ratePerDay),
            }
          : undefined,
        bonus: payrollForm.bonus ? parseFloat(payrollForm.bonus) : undefined,
        incentives: payrollForm.incentives ? parseFloat(payrollForm.incentives) : undefined,
        arrears: payrollForm.arrears?.amount
          ? {
              amount: parseFloat(payrollForm.arrears.amount),
              fromPeriod: payrollForm.arrears.fromPeriod?.month && payrollForm.arrears.fromPeriod?.year
                ? {
                    month: parseInt(payrollForm.arrears.fromPeriod.month),
                    year: parseInt(payrollForm.arrears.fromPeriod.year),
                  }
                : undefined,
              toPeriod: payrollForm.arrears.toPeriod?.month && payrollForm.arrears.toPeriod?.year
                ? {
                    month: parseInt(payrollForm.arrears.toPeriod.month),
                    year: parseInt(payrollForm.arrears.toPeriod.year),
                  }
                : undefined,
              reason: payrollForm.arrears.reason || undefined,
            }
          : undefined,
        loanDeductions: payrollForm.loanDeductions
          ?.filter(ld => ld.description && (ld.principal || ld.interest))
          .map(ld => ({
            description: ld.description,
            principal: ld.principal ? parseFloat(ld.principal) : 0,
            interest: ld.interest ? parseFloat(ld.interest) : 0,
            total: (parseFloat(ld.principal || 0) + parseFloat(ld.interest || 0)),
          })) || [],
        advanceDeductions: payrollForm.advanceDeductions
          ?.filter(ad => ad.description && ad.amount)
          .map(ad => ({
            description: ad.description,
            amount: parseFloat(ad.amount),
          })) || [],
        reimbursements: payrollForm.reimbursements
          ?.filter(r => r.description && r.amount)
          .map(r => ({
            type: r.type,
            description: r.description,
            amount: parseFloat(r.amount),
            receiptNumber: r.receiptNumber || undefined,
            receiptDate: r.receiptDate || undefined,
          })) || [],
        taxDetails: payrollForm.taxDetails || {},
        taxExemptions: payrollForm.taxExemptions || {},
        department: payrollForm.department || undefined,
        costCenter: payrollForm.costCenter || undefined,
        notes: payrollForm.notes || undefined,
        internalNotes: payrollForm.internalNotes || undefined,
        tags: payrollForm.tags?.filter(t => t) || [],
      };

      await api.post(`${PAYROLL_BASE}/generate`, payload, {}, true);
      showSuccess('Payroll generated successfully.');
      resetForm();
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdatePayroll = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        items: payrollForm.items
          .filter((item) => item.description && item.amount)
          .map(item => ({
            description: item.description,
            amount: parseFloat(item.amount),
            type: item.type,
            category: item.category || undefined,
            isTaxable: item.isTaxable !== false,
            isExempted: item.isExempted === true,
            exemptionLimit: item.exemptionLimit ? parseFloat(item.exemptionLimit) : 0,
            reference: item.reference || undefined,
            applicableFrom: item.applicableFrom || undefined,
            applicableTo: item.applicableTo || undefined,
          })),
        status: editingPayroll.status,
        overtimeHours: payrollForm.overtimeHours ? parseFloat(payrollForm.overtimeHours) : undefined,
        overtimeRate: payrollForm.overtimeRate ? parseFloat(payrollForm.overtimeRate) : undefined,
        leaveEncashment: payrollForm.leaveEncashment?.encashedDays && payrollForm.leaveEncashment?.ratePerDay
          ? {
              eligibleDays: payrollForm.leaveEncashment.eligibleDays ? parseFloat(payrollForm.leaveEncashment.eligibleDays) : 0,
              encashedDays: parseFloat(payrollForm.leaveEncashment.encashedDays),
              ratePerDay: parseFloat(payrollForm.leaveEncashment.ratePerDay),
            }
          : undefined,
        bonus: payrollForm.bonus ? parseFloat(payrollForm.bonus) : undefined,
        incentives: payrollForm.incentives ? parseFloat(payrollForm.incentives) : undefined,
        arrears: payrollForm.arrears?.amount
          ? {
              amount: parseFloat(payrollForm.arrears.amount),
              fromPeriod: payrollForm.arrears.fromPeriod?.month && payrollForm.arrears.fromPeriod?.year
                ? {
                    month: parseInt(payrollForm.arrears.fromPeriod.month),
                    year: parseInt(payrollForm.arrears.fromPeriod.year),
                  }
                : undefined,
              toPeriod: payrollForm.arrears.toPeriod?.month && payrollForm.arrears.toPeriod?.year
                ? {
                    month: parseInt(payrollForm.arrears.toPeriod.month),
                    year: parseInt(payrollForm.arrears.toPeriod.year),
                  }
                : undefined,
              reason: payrollForm.arrears.reason || undefined,
            }
          : undefined,
        loanDeductions: payrollForm.loanDeductions
          ?.filter(ld => ld.description && (ld.principal || ld.interest))
          .map(ld => ({
            description: ld.description,
            principal: ld.principal ? parseFloat(ld.principal) : 0,
            interest: ld.interest ? parseFloat(ld.interest) : 0,
            total: (parseFloat(ld.principal || 0) + parseFloat(ld.interest || 0)),
          })) || [],
        advanceDeductions: payrollForm.advanceDeductions
          ?.filter(ad => ad.description && ad.amount)
          .map(ad => ({
            description: ad.description,
            amount: parseFloat(ad.amount),
          })) || [],
        reimbursements: payrollForm.reimbursements
          ?.filter(r => r.description && r.amount)
          .map(r => ({
            type: r.type,
            description: r.description,
            amount: parseFloat(r.amount),
            receiptNumber: r.receiptNumber || undefined,
            receiptDate: r.receiptDate || undefined,
          })) || [],
        taxDetails: payrollForm.taxDetails || {},
        taxExemptions: payrollForm.taxExemptions || {},
        department: payrollForm.department || undefined,
        costCenter: payrollForm.costCenter || undefined,
        notes: payrollForm.notes || undefined,
        internalNotes: payrollForm.internalNotes || undefined,
      };

      await api.put(
        `${PAYROLL_BASE}/${editingPayroll._id}`,
        payload,
        {},
        true,
      );
      showSuccess('Payroll updated successfully.');
      resetForm();
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to update payroll');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPayroll = (payroll) => {
    setEditingPayroll(payroll);
    setPayrollForm({
      staff: payroll.teacher?._id || payroll.teacher || payroll.staff?._id || payroll.staff || '',
      month: payroll.month || new Date().getMonth() + 1,
      year: payroll.year || new Date().getFullYear(),
      periodStart: payroll.periodStart ? formatDateForInput(payroll.periodStart) : '',
      periodEnd: payroll.periodEnd ? formatDateForInput(payroll.periodEnd) : '',
      items: payroll.items?.map(item => ({
        type: item.type || 'allowance',
        description: item.description || '',
        amount: item.amount || '',
        category: item.category || '',
        isTaxable: item.isTaxable !== false,
        isExempted: item.isExempted === true,
        exemptionLimit: item.exemptionLimit || '',
        reference: item.reference || '',
        applicableFrom: item.applicableFrom ? formatDateForInput(item.applicableFrom) : '',
        applicableTo: item.applicableTo ? formatDateForInput(item.applicableTo) : '',
      })) || [],
      overtimeHours: payroll.overtimeHours || '',
      overtimeRate: payroll.overtimeRate || '',
      leaveEncashment: payroll.leaveEncashment ? {
        eligibleDays: payroll.leaveEncashment.eligibleDays || '',
        encashedDays: payroll.leaveEncashment.encashedDays || '',
        ratePerDay: payroll.leaveEncashment.ratePerDay || '',
      } : { eligibleDays: '', encashedDays: '', ratePerDay: '' },
      bonus: payroll.bonus || '',
      incentives: payroll.incentives || '',
      arrears: payroll.arrears ? {
        amount: payroll.arrears.amount || '',
        fromPeriod: {
          month: payroll.arrears.fromPeriod?.month || '',
          year: payroll.arrears.fromPeriod?.year || '',
        },
        toPeriod: {
          month: payroll.arrears.toPeriod?.month || '',
          year: payroll.arrears.toPeriod?.year || '',
        },
        reason: payroll.arrears.reason || '',
      } : { amount: '', fromPeriod: { month: '', year: '' }, toPeriod: { month: '', year: '' }, reason: '' },
      loanDeductions: payroll.loanDeductions?.map(ld => ({
        description: ld.description || '',
        principal: ld.principal || '',
        interest: ld.interest || '',
      })) || [],
      advanceDeductions: payroll.advanceDeductions?.map(ad => ({
        description: ad.description || '',
        amount: ad.amount || '',
      })) || [],
      reimbursements: payroll.reimbursements?.map(r => ({
        type: r.type || 'travel',
        description: r.description || '',
        amount: r.amount || '',
        receiptNumber: r.receiptNumber || '',
        receiptDate: r.receiptDate ? formatDateForInput(r.receiptDate) : '',
      })) || [],
      taxDetails: payroll.taxDetails ? {
        taxableIncome: payroll.taxDetails.taxableIncome || '',
        incomeTax: payroll.taxDetails.incomeTax || '',
        tds: payroll.taxDetails.tds || '',
        providentFund: {
          employee: payroll.taxDetails.providentFund?.employee || '',
          employer: payroll.taxDetails.providentFund?.employer || '',
        },
        esi: {
          employee: payroll.taxDetails.esi?.employee || '',
          employer: payroll.taxDetails.esi?.employer || '',
        },
        professionalTax: payroll.taxDetails.professionalTax || '',
        otherTaxes: payroll.taxDetails.otherTaxes || '',
      } : {
        taxableIncome: '',
        incomeTax: '',
        tds: '',
        providentFund: { employee: '', employer: '' },
        esi: { employee: '', employer: '' },
        professionalTax: '',
        otherTaxes: '',
      },
      taxExemptions: payroll.taxExemptions ? {
        section80C: payroll.taxExemptions.section80C || '',
        section80D: payroll.taxExemptions.section80D || '',
        section24: payroll.taxExemptions.section24 || '',
        hraExemption: payroll.taxExemptions.hraExemption || '',
        otherExemptions: payroll.taxExemptions.otherExemptions || '',
      } : {
        section80C: '',
        section80D: '',
        section24: '',
        hraExemption: '',
        otherExemptions: '',
      },
      department: payroll.department?._id || payroll.department || '',
      costCenter: payroll.costCenter?._id || payroll.costCenter || '',
      notes: payroll.notes || '',
      internalNotes: payroll.internalNotes || '',
      tags: payroll.tags || [],
    });
    setShowForm(true);
  };

  const handleViewPayroll = (payrollId) => {
    router.push(`/app/payroll/${payrollId}`);
  };

  const handleDeletePayroll = async (payroll) => {
    if (!payroll?._id) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(
            'Delete this payroll? This will revert finance entries if payment was processed.',
          )
        : true;
    if (!confirmed) return;
    try {
      setDeletingId(payroll._id);
      setError('');
      await api.delete(`${PAYROLL_BASE}/${payroll._id}`, {}, true);
      showSuccess('Payroll deleted.');
      await fetchPayrolls();
      await fetchAccounts(); // Refresh accounts
    } catch (err) {
      setError(err.message || 'Failed to delete payroll');
    } finally {
      setDeletingId('');
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!editingPayroll?._id) return;
    setError('');
    setProcessingPayment(editingPayroll._id);
    try {
      const payload = {
        accountId: paymentForm.accountId || undefined,
        paymentDate: paymentForm.paymentDate || undefined,
        paymentMethod: paymentForm.paymentMethod || undefined,
        transactionReference: paymentForm.transactionReference.trim() || undefined,
        useSplits: usePaymentSplits && editingPayroll?.paymentSplits?.length > 0,
      };

      await api.post(
        `${PAYROLL_BASE}/${editingPayroll._id}/pay`,
        payload,
        {},
        true,
      );
      showSuccess('Payment processed successfully.');
      setShowPaymentForm(false);
      setPaymentForm({
        accountId: '',
        paymentDate: formatDateForInput(new Date()),
        paymentMethod: 'bank-transfer',
        transactionReference: '',
      });
      setUsePaymentSplits(false);
      await fetchPayrolls();
      await fetchAccounts(); // Refresh accounts
    } catch (err) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessingPayment('');
    }
  };

  // Approval workflow
  const handleApprove = async (e) => {
    e.preventDefault();
    if (!actionPayroll?._id) return;
    setError('');
    setProcessingAction('approve');
    try {
      await api.post(
        `${PAYROLL_BASE}/${actionPayroll._id}/approve`,
        { comments: approvalForm.comments || undefined, level: approvalForm.level ? parseInt(approvalForm.level) : undefined },
        {},
        true,
      );
      showSuccess('Payroll approved.');
      setShowApproveDialog(false);
      setActionPayroll(null);
      setApprovalForm({ comments: '', level: '' });
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to approve payroll');
    } finally {
      setProcessingAction('');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!actionPayroll?._id) return;
    setError('');
    setProcessingAction('reject');
    try {
      await api.post(
        `${PAYROLL_BASE}/${actionPayroll._id}/reject`,
        { comments: rejectForm.comments || undefined, level: rejectForm.level ? parseInt(rejectForm.level) : undefined },
        {},
        true,
      );
      showSuccess('Payroll rejected.');
      setShowRejectDialog(false);
      setActionPayroll(null);
      setRejectForm({ comments: '', level: '' });
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to reject payroll');
    } finally {
      setProcessingAction('');
    }
  };

  const handleReverse = async (e) => {
    e.preventDefault();
    if (!actionPayroll?._id) return;
    setError('');
    setProcessingAction('reverse');
    try {
      await api.post(
        `${PAYROLL_BASE}/${actionPayroll._id}/reverse`,
        { reason: reverseForm.reason || 'Payroll reversal' },
        {},
        true,
      );
      showSuccess('Payroll reversed.');
      setShowReverseDialog(false);
      setActionPayroll(null);
      setReverseForm({ reason: '' });
      await fetchPayrolls();
      await fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to reverse payroll');
    } finally {
      setProcessingAction('');
    }
  };

  const handleHold = async (e) => {
    e.preventDefault();
    if (!actionPayroll?._id) return;
    setError('');
    setProcessingAction('hold');
    try {
      await api.post(
        `${PAYROLL_BASE}/${actionPayroll._id}/hold`,
        {
          reason: holdForm.reason || undefined,
          holdFrom: holdForm.holdFrom || undefined,
          holdTo: holdForm.holdTo || undefined,
        },
        {},
        true,
      );
      showSuccess('Payroll put on hold.');
      setShowHoldDialog(false);
      setActionPayroll(null);
      setHoldForm({ reason: '', holdFrom: '', holdTo: '' });
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to put payroll on hold');
    } finally {
      setProcessingAction('');
    }
  };

  const handleUnhold = async (payroll) => {
    if (!payroll?._id) return;
    setError('');
    setProcessingAction(payroll._id);
    try {
      await api.post(`${PAYROLL_BASE}/${payroll._id}/unhold`, {}, {}, true);
      showSuccess('Payroll released from hold.');
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to release hold');
    } finally {
      setProcessingAction('');
    }
  };

  const handleAddPaymentSplit = async (e) => {
    e.preventDefault();
    if (!actionPayroll?._id) return;
    const amount = parseFloat(splitForm.amount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    const totalSplits = (actionPayroll.paymentSplits || []).reduce((sum, s) => sum + (s.amount || 0), 0);
    if (totalSplits + amount > (actionPayroll.netSalary || 0)) {
      setError('Total payment splits cannot exceed net salary.');
      return;
    }
    setError('');
    setProcessingAction('split');
    try {
      await api.post(
        `${PAYROLL_BASE}/${actionPayroll._id}/payment-split`,
        {
          amount,
          paymentDate: splitForm.paymentDate || new Date(),
          paymentMethod: splitForm.paymentMethod || 'bank-transfer',
          account: splitForm.account || undefined,
          transactionReference: splitForm.transactionReference || undefined,
        },
        {},
        true,
      );
      showSuccess('Payment split added.');
      setSplitForm({
        amount: '',
        paymentDate: formatDateForInput(new Date()),
        paymentMethod: 'bank-transfer',
        account: '',
        transactionReference: '',
      });
      const updated = await api.get(`${PAYROLL_BASE}/${actionPayroll._id}`, {}, true);
      setActionPayroll(updated?.data || updated);
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to add payment split');
    } finally {
      setProcessingAction('');
    }
  };

  const fetchYTD = useCallback(async () => {
    if (!ytdFilters.teacherId || !ytdFilters.year) return;
    try {
      const params = new URLSearchParams({
        teacherId: ytdFilters.teacherId,
        year: ytdFilters.year,
      });
      if (ytdFilters.month) params.append('month', ytdFilters.month);
      const response = await api.get(`${PAYROLL_BASE}/ytd?${params.toString()}`, {}, true);
      setYtdData(response?.data || response);
    } catch (err) {
      setError(err.message || 'Failed to load YTD data');
      setYtdData(null);
    }
  }, [ytdFilters.teacherId, ytdFilters.year, ytdFilters.month]);

  const handleGeneratePaySlip = async (payroll) => {
    if (!payroll?._id) return;
    setError('');
    setProcessingAction(payroll._id);
    try {
      await api.post(`${PAYROLL_BASE}/${payroll._id}/payslip/generate`, {}, {}, true);
      showSuccess('Pay slip generated.');
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to generate pay slip');
    } finally {
      setProcessingAction('');
    }
  };

  const handleMarkPaySlipSent = async (e) => {
    e.preventDefault();
    if (!actionPayroll?._id) return;
    setError('');
    setProcessingAction('payslip-sent');
    try {
      await api.post(
        `${PAYROLL_BASE}/${actionPayroll._id}/payslip/sent`,
        { sentTo: paySlipSentTo || '' },
        {},
        true,
      );
      showSuccess('Pay slip marked as sent.');
      setShowPaySlipSentDialog(false);
      setActionPayroll(null);
      setPaySlipSentTo('');
      await fetchPayrolls();
    } catch (err) {
      setError(err.message || 'Failed to mark pay slip sent');
    } finally {
      setProcessingAction('');
    }
  };

  // Calculate totals for form (edit or generate): use description or name for item presence
  const formBaseSalary = useMemo(() => {
    if (editingPayroll?.baseSalary != null) return Number(editingPayroll.baseSalary) || 0;
    if (!payrollForm.staff) return 0;
    const s = staff.find((x) => x._id === payrollForm.staff);
    return Number(s?.salary) || 0;
  }, [editingPayroll, payrollForm.staff, staff]);

  const calculateTotals = useMemo(() => {
    const baseSalary = formBaseSalary;
    const allowances = payrollForm.items
      .filter((item) => item.type === 'allowance' && (item.description || item.name) && item.amount)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const deductions = payrollForm.items
      .filter((item) => item.type === 'deduction' && (item.description || item.name) && item.amount)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const gross = baseSalary + allowances;
    const net = gross - deductions;
    return { gross, net, allowances, deductions, baseSalary };
  }, [formBaseSalary, payrollForm.items]);

  const summary = useMemo(() => {
    const total = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const paid = payrolls
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const pending = payrolls
      .filter((p) => p.status === 'pending' || p.status === 'draft')
      .reduce((sum, p) => sum + (p.netSalary || 0), 0);
    return { total, paid, pending, count: payrolls.length };
  }, [payrolls]);

  // Define columns for Payroll DataTable
  const payrollColumns = useMemo(() => [
    {
      id: 'payrollNumber',
      accessorKey: 'payrollNumber',
      header: 'Payroll Number',
      type: 'text',
      searchable: true,
    },
    {
      id: 'staff',
      accessorKey: 'staff',
      header: 'Staff',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        const person = row.staff || row.teacher;
        if (!person) return '-';
        const obj = typeof person === 'object' ? person : null;
        return obj ? `${obj.name || ''}${obj.employeeId ? ` (${obj.employeeId})` : ''}`.trim() : '-';
      },
    },
    {
      id: 'month',
      accessorKey: 'month',
      header: 'Month',
      type: 'text',
      cell: ({ row }) => `${row.month}/${row.year}`,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: PAYROLL_STATUSES,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded capitalize ${
              row.status === 'paid'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : row.status === 'approved'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : row.status === 'pending'
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : row.status === 'draft'
                ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                : row.status === 'on-hold'
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                : row.status === 'reversed'
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            {row.status}
          </span>
          {row.isReversed && (
            <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-600">
              REV
            </span>
          )}
          {row.isOnHold && (
            <span className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-600">
              HOLD
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'presentDays',
      accessorKey: 'presentDays',
      header: 'Present Days',
      type: 'number',
      searchable: false,
    },
    {
      id: 'absentDays',
      accessorKey: 'absentDays',
      header: 'Absent Days',
      type: 'number',
      searchable: false,
    },
    {
      id: 'netSalary',
      accessorKey: 'netSalary',
      header: 'Net Salary',
      type: 'currency',
      formatOptions: {
        locale: 'en-IN',
        currency: 'INR',
      },
      searchable: false,
    },
    {
      id: 'paymentDate',
      accessorKey: 'paymentDate',
      header: 'Payment Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
      cell: ({ row }) => row.paymentDate ? formatDateForDisplay(row.paymentDate) : '-',
    },
  ], []);

  // Define actions for Payroll DataTable - compact: View + primary action + More dropdown
  const payrollActions = useCallback((row) => (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => handleViewPayroll(row._id)}
        title="View"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {(row.status === 'pending' || row.status === 'draft') && (
        <>
          <Button
            size="sm"
            className="h-8 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              setActionPayroll(row);
              setApprovalForm({ comments: '', level: '' });
              setShowApproveDialog(true);
            }}
            title="Approve"
          >
            <CheckCircle className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setActionPayroll(row);
              setRejectForm({ comments: '', level: '' });
              setShowRejectDialog(true);
            }}
            title="Reject"
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      {(row.status === 'approved' || row.status === 'pending') && !row.isOnHold && (
        <Button
          size="sm"
          className="h-8 gap-1"
          onClick={() => {
            setEditingPayroll(row);
            setUsePaymentSplits(false);
            setShowPaymentForm(true);
          }}
          title="Process payment"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Pay
        </Button>
      )}
      {row.status !== 'paid' && row.status !== 'reversed' && !row.isReversed && (row.status !== 'pending' && row.status !== 'draft') && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleEditPayroll(row)}
          title="Edit"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleViewPayroll(row._id)}>
            <Eye className="h-4 w-4 mr-2" />
            View details
          </DropdownMenuItem>
          {row.status !== 'paid' && row.status !== 'reversed' && !row.isReversed && (
            <DropdownMenuItem onClick={() => handleEditPayroll(row)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {(row.status === 'pending' || row.status === 'draft') && (
            <>
              <DropdownMenuItem onClick={() => { setActionPayroll(row); setApprovalForm({ comments: '', level: '' }); setShowApproveDialog(true); }}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActionPayroll(row); setRejectForm({ comments: '', level: '' }); setShowRejectDialog(true); }} className="text-destructive focus:text-destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </DropdownMenuItem>
            </>
          )}
          {row.status === 'paid' && !row.isReversed && (
            <DropdownMenuItem onClick={() => { setActionPayroll(row); setReverseForm({ reason: '' }); setShowReverseDialog(true); }}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reverse
            </DropdownMenuItem>
          )}
          {(row.status === 'pending' || row.status === 'approved') && !row.isOnHold && (
            <DropdownMenuItem onClick={() => { setActionPayroll(row); setHoldForm({ reason: '', holdFrom: formatDateForInput(new Date()), holdTo: '' }); setShowHoldDialog(true); }}>
              <PauseCircle className="h-4 w-4 mr-2" />
              Put on hold
            </DropdownMenuItem>
          )}
          {row.isOnHold && (
            <DropdownMenuItem onClick={() => handleUnhold(row)} disabled={processingAction === row._id}>
              <PlayCircle className="h-4 w-4 mr-2" />
              {processingAction === row._id ? 'Releasing...' : 'Release hold'}
            </DropdownMenuItem>
          )}
          {(row.status === 'pending' || row.status === 'approved') && !row.isOnHold && (
            <DropdownMenuItem onClick={() => { setActionPayroll(row); setSplitForm({ amount: '', paymentDate: formatDateForInput(new Date()), paymentMethod: 'bank-transfer', account: '', transactionReference: '' }); setShowSplitsDialog(true); }}>
              <Split className="h-4 w-4 mr-2" />
              Payment splits
            </DropdownMenuItem>
          )}
          {(row.status === 'approved' || row.status === 'paid') && !row.paySlipGenerated && (
            <DropdownMenuItem onClick={() => handleGeneratePaySlip(row)} disabled={processingAction === row._id}>
              <FileText className="h-4 w-4 mr-2" />
              {processingAction === row._id ? 'Generating...' : 'Generate pay slip'}
            </DropdownMenuItem>
          )}
          {row.paySlipGenerated && !row.paySlipSent && (
            <DropdownMenuItem onClick={() => { setActionPayroll(row); setPaySlipSentTo(row.paySlipSentTo || ''); setShowPaySlipSentDialog(true); }}>
              <Send className="h-4 w-4 mr-2" />
              Mark pay slip sent
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => { setActionPayroll(row); setYtdFilters({ teacherId: row.teacher?._id || row.teacher || row.staff?._id || row.staff || '', year: String(row.year || new Date().getFullYear()), month: String(row.month || new Date().getMonth() + 1) }); setYtdData(null); setShowYTDDialog(true); }}>
            <Calendar className="h-4 w-4 mr-2" />
            YTD
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => handleDeletePayroll(row)}
            disabled={deletingId === row._id}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deletingId === row._id ? 'Deleting...' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ), [deletingId, processingAction, router]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-8">
      {/* Header - compact */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Payroll
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate and process staff payroll.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayrolls} disabled={loading} className="gap-1.5">
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5">
            <Calculator className="h-3.5 w-3.5" />
            Generate Payroll
          </Button>
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

      {/* Summary - compact cards */}
      {payrolls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-lg font-semibold mt-0.5">{formatCurrency(summary.total)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary.count} payrolls</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Paid</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-0.5">{formatCurrency(summary.paid)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
            <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mt-0.5">{formatCurrency(summary.pending)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-semibold text-red-600 dark:text-red-400 mt-0.5">{formatCurrency(summary.pending)}</p>
          </div>
        </div>
      )}

      {/* Filters - compact single row */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.teacherId}
            onChange={(e) => setFilters((prev) => ({ ...prev, teacherId: e.target.value }))}
            className="h-8 min-w-[140px] rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Staff</option>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>{s.name} ({s.employeeId || 'N/A'})</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="h-8 min-w-[120px] rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {PAYROLL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Input
            type="number"
            min="1"
            max="12"
            placeholder="Month"
            value={filters.month}
            onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
            className="h-8 w-20 text-sm"
          />
          <Input
            type="number"
            placeholder="Year"
            value={filters.year}
            onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
            className="h-8 w-20 text-sm"
          />
          <Button size="sm" variant="secondary" onClick={fetchPayrolls} className="h-8 gap-1">
            <Filter className="h-3.5 w-3.5" />
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            {showFilters ? 'Less' : 'More'} filters
          </Button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
            <Input
              placeholder="Department"
              value={filters.department}
              onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
              className="h-8 w-36 text-sm"
            />
            <Input
              placeholder="Cost Center"
              value={filters.costCenter}
              onChange={(e) => setFilters((prev) => ({ ...prev, costCenter: e.target.value }))}
              className="h-8 w-36 text-sm"
            />
            <select
              value={filters.isReversed}
              onChange={(e) => setFilters((prev) => ({ ...prev, isReversed: e.target.value }))}
              className="h-8 min-w-[120px] rounded-md border border-input bg-background px-2.5 text-sm"
            >
              <option value="">Reversal: All</option>
              <option value="true">Reversed</option>
              <option value="false">Not reversed</option>
            </select>
            <select
              value={filters.isOnHold}
              onChange={(e) => setFilters((prev) => ({ ...prev, isOnHold: e.target.value }))}
              className="h-8 min-w-[100px] rounded-md border border-input bg-background px-2.5 text-sm"
            >
              <option value="">Hold: All</option>
              <option value="true">On hold</option>
              <option value="false">Not on hold</option>
            </select>
          </div>
        )}
      </div>

      {/* Generate/Edit Payroll Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-xl">
              {editingPayroll ? 'Edit Payroll' : 'Generate Payroll'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={
              editingPayroll ? handleUpdatePayroll : handleGeneratePayroll
            }
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="px-6 pb-4 overflow-y-auto flex-1 space-y-5">

            {editingPayroll && (
              <div className="p-3 bg-muted/80 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Payroll Number</p>
                    <p className="font-semibold">{editingPayroll.payrollNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Base Salary</p>
                    <p className="font-semibold">
                      {formatCurrency(editingPayroll.baseSalary || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Present Days</p>
                    <p className="font-semibold">{editingPayroll.presentDays}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Absent Days</p>
                    <p className="font-semibold">{editingPayroll.absentDays}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Staff *
              </label>
              <select
                name="staff"
                value={payrollForm.staff}
                onChange={handleFormChange}
                required
                disabled={!!editingPayroll}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Staff</option>
                {staff.map((staffMember) => (
                  <option key={staffMember._id} value={staffMember._id}>
                    {staffMember.name} ({staffMember.employeeId || 'N/A'}) -{' '}
                    {formatCurrency(staffMember.salary || 0)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Month *</label>
              <Input
                name="month"
                type="number"
                min="1"
                max="12"
                value={payrollForm.month}
                onChange={handleFormChange}
                required
                disabled={!!editingPayroll}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Year *</label>
              <Input
                name="year"
                type="number"
                value={payrollForm.year}
                onChange={handleFormChange}
                required
                disabled={!!editingPayroll}
              />
            </div>
          </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">
                  Allowances & Deductions
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {payrollForm.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border border-border rounded-md bg-muted/30 space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <label className="block text-sm font-medium mb-1">
                          Type
                        </label>
                        <select
                          value={item.type || 'allowance'}
                          onChange={(e) => {
                            handleItemChange(index, 'type', e.target.value);
                            handleItemChange(index, 'category', ''); // Reset category when type changes
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {ITEM_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium mb-1">
                          Category
                        </label>
                        <select
                          value={item.category || ''}
                          onChange={(e) =>
                            handleItemChange(index, 'category', e.target.value)
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">Select Category</option>
                          {(ITEM_CATEGORIES[item.type] || []).map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <label className="block text-sm font-medium mb-1">
                          Description *
                        </label>
                        <Input
                          value={item.description || ''}
                          onChange={(e) =>
                            handleItemChange(index, 'description', e.target.value)
                          }
                          placeholder="Item description"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Amount *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount || ''}
                          onChange={(e) =>
                            handleItemChange(index, 'amount', e.target.value)
                          }
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={item.isTaxable !== false}
                            onCheckedChange={(checked) =>
                              handleItemChange(index, 'isTaxable', checked)
                            }
                          />
                          <span>Taxable</span>
                        </label>
                      </div>
                      <div className="col-span-3">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={item.isExempted === true}
                            onCheckedChange={(checked) =>
                              handleItemChange(index, 'isExempted', checked)
                            }
                          />
                          <span>Exempted</span>
                        </label>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium mb-1">
                          Exemption Limit
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.exemptionLimit || ''}
                          onChange={(e) =>
                            handleItemChange(index, 'exemptionLimit', e.target.value)
                          }
                          placeholder="0.00"
                          disabled={!item.isExempted}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium mb-1">
                          Reference
                        </label>
                        <Input
                          value={item.reference || ''}
                          onChange={(e) =>
                            handleItemChange(index, 'reference', e.target.value)
                          }
                          placeholder="Reference number"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                {payrollForm.items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items added. Click "Add Item" to add allowances or deductions.
                  </p>
                )}
              </div>
            </div>

            {/* Additional Payroll Fields - Accordion */}
            <Accordion type="multiple" className="w-full">
              {/* Overtime & Leave Encashment */}
              <AccordionItem value="overtime-leave">
                <AccordionTrigger className="text-base font-semibold py-3">
                  Overtime & Leave Encashment
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-sm font-medium mb-1">Overtime Hours</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={payrollForm.overtimeHours || ''}
                        onChange={(e) => setPayrollForm(prev => ({ ...prev, overtimeHours: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Overtime Rate (per hour)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.overtimeRate || ''}
                        onChange={(e) => setPayrollForm(prev => ({ ...prev, overtimeRate: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Leave Encashment - Eligible Days</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={payrollForm.leaveEncashment?.eligibleDays || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          leaveEncashment: { ...prev.leaveEncashment, eligibleDays: e.target.value }
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Leave Encashment - Encashed Days</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={payrollForm.leaveEncashment?.encashedDays || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          leaveEncashment: { ...prev.leaveEncashment, encashedDays: e.target.value }
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Leave Encashment Rate (per day)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.leaveEncashment?.ratePerDay || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          leaveEncashment: { ...prev.leaveEncashment, ratePerDay: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Bonus, Incentives & Arrears */}
              <AccordionItem value="bonus-incentives">
                <AccordionTrigger className="text-base font-semibold py-3">
                  Bonus, Incentives & Arrears
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-sm font-medium mb-1">Bonus</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.bonus || ''}
                        onChange={(e) => setPayrollForm(prev => ({ ...prev, bonus: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Incentives</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.incentives || ''}
                        onChange={(e) => setPayrollForm(prev => ({ ...prev, incentives: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Arrears Amount</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.arrears?.amount || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          arrears: { ...prev.arrears, amount: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Arrears Reason</label>
                      <Input
                        value={payrollForm.arrears?.reason || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          arrears: { ...prev.arrears, reason: e.target.value }
                        }))}
                        placeholder="Reason for arrears"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Arrears From - Month</label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={payrollForm.arrears?.fromPeriod?.month || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          arrears: {
                            ...prev.arrears,
                            fromPeriod: { ...prev.arrears?.fromPeriod, month: e.target.value }
                          }
                        }))}
                        placeholder="1-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Arrears From - Year</label>
                      <Input
                        type="number"
                        min="2000"
                        value={payrollForm.arrears?.fromPeriod?.year || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          arrears: {
                            ...prev.arrears,
                            fromPeriod: { ...prev.arrears?.fromPeriod, year: e.target.value }
                          }
                        }))}
                        placeholder="Year"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Arrears To - Month</label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={payrollForm.arrears?.toPeriod?.month || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          arrears: {
                            ...prev.arrears,
                            toPeriod: { ...prev.arrears?.toPeriod, month: e.target.value }
                          }
                        }))}
                        placeholder="1-12"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Arrears To - Year</label>
                      <Input
                        type="number"
                        min="2000"
                        value={payrollForm.arrears?.toPeriod?.year || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          arrears: {
                            ...prev.arrears,
                            toPeriod: { ...prev.arrears?.toPeriod, year: e.target.value }
                          }
                        }))}
                        placeholder="Year"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Loan Deductions */}
              <AccordionItem value="loan-deductions">
                <AccordionTrigger className="text-base font-semibold py-3">
                  Loan Deductions
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-3">
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={addLoanDeduction}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Loan Deduction
                      </Button>
                    </div>
                    {payrollForm.loanDeductions?.map((loan, index) => (
                      <div key={index} className="p-3 border border-border rounded-md bg-muted/30">
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-5">
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <Input
                              value={loan.description || ''}
                              onChange={(e) => handleLoanDeductionChange(index, 'description', e.target.value)}
                              placeholder="Loan description"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Principal</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={loan.principal || ''}
                              onChange={(e) => handleLoanDeductionChange(index, 'principal', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Interest</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={loan.interest || ''}
                              onChange={(e) => handleLoanDeductionChange(index, 'interest', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Total</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={(Number(loan.principal || 0) + Number(loan.interest || 0)).toFixed(2)}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeLoanDeduction(index)}
                              className="mt-6"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!payrollForm.loanDeductions || payrollForm.loanDeductions.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No loan deductions added.
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Advance Deductions */}
              <AccordionItem value="advance-deductions">
                <AccordionTrigger className="text-base font-semibold py-3">
                  Advance Deductions
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-3">
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={addAdvanceDeduction}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Advance Deduction
                      </Button>
                    </div>
                    {payrollForm.advanceDeductions?.map((advance, index) => (
                      <div key={index} className="p-3 border border-border rounded-md bg-muted/30">
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-8">
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <Input
                              value={advance.description || ''}
                              onChange={(e) => handleAdvanceDeductionChange(index, 'description', e.target.value)}
                              placeholder="Advance description"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-sm font-medium mb-1">Amount</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={advance.amount || ''}
                              onChange={(e) => handleAdvanceDeductionChange(index, 'amount', e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeAdvanceDeduction(index)}
                              className="mt-6"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!payrollForm.advanceDeductions || payrollForm.advanceDeductions.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No advance deductions added.
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Reimbursements */}
              <AccordionItem value="reimbursements">
                <AccordionTrigger className="text-base font-semibold py-3">
                  Reimbursements
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-3">
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={addReimbursement}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Reimbursement
                      </Button>
                    </div>
                    {payrollForm.reimbursements?.map((reimb, index) => (
                      <div key={index} className="p-3 border border-border rounded-md bg-muted/30 space-y-3">
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-3">
                            <label className="block text-sm font-medium mb-1">Type *</label>
                            <select
                              value={reimb.type || 'travel'}
                              onChange={(e) => handleReimbursementChange(index, 'type', e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              {REIMBURSEMENT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-5">
                            <label className="block text-sm font-medium mb-1">Description *</label>
                            <Input
                              value={reimb.description || ''}
                              onChange={(e) => handleReimbursementChange(index, 'description', e.target.value)}
                              placeholder="Reimbursement description"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Amount *</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={reimb.amount || ''}
                              onChange={(e) => handleReimbursementChange(index, 'amount', e.target.value)}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div className="col-span-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeReimbursement(index)}
                              className="mt-6"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-4">
                            <label className="block text-sm font-medium mb-1">Receipt Number</label>
                            <Input
                              value={reimb.receiptNumber || ''}
                              onChange={(e) => handleReimbursementChange(index, 'receiptNumber', e.target.value)}
                              placeholder="Receipt number"
                            />
                          </div>
                          <div className="col-span-4">
                            <label className="block text-sm font-medium mb-1">Receipt Date</label>
                            <Input
                              type="date"
                              value={reimb.receiptDate || ''}
                              onChange={(e) => handleReimbursementChange(index, 'receiptDate', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!payrollForm.reimbursements || payrollForm.reimbursements.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No reimbursements added.
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Tax Details */}
              <AccordionItem value="tax-details">
                <AccordionTrigger className="text-base font-semibold py-3">
                  Tax Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Taxable Income</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.taxableIncome || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: { ...prev.taxDetails, taxableIncome: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Income Tax</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.incomeTax || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: { ...prev.taxDetails, incomeTax: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">TDS</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.tds || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: { ...prev.taxDetails, tds: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Professional Tax</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.professionalTax || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: { ...prev.taxDetails, professionalTax: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">PF - Employee</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.providentFund?.employee || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: {
                            ...prev.taxDetails,
                            providentFund: { ...prev.taxDetails?.providentFund, employee: e.target.value }
                          }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">PF - Employer</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.providentFund?.employer || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: {
                            ...prev.taxDetails,
                            providentFund: { ...prev.taxDetails?.providentFund, employer: e.target.value }
                          }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ESI - Employee</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.esi?.employee || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: {
                            ...prev.taxDetails,
                            esi: { ...prev.taxDetails?.esi, employee: e.target.value }
                          }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ESI - Employer</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.esi?.employer || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: {
                            ...prev.taxDetails,
                            esi: { ...prev.taxDetails?.esi, employer: e.target.value }
                          }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Other Taxes</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxDetails?.otherTaxes || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxDetails: { ...prev.taxDetails, otherTaxes: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Tax Exemptions */}
              <AccordionItem value="tax-exemptions">
                <AccordionTrigger className="text-base font-semibold py-3">
                  Tax Exemptions
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Section 80C</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxExemptions?.section80C || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxExemptions: { ...prev.taxExemptions, section80C: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Section 80D</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxExemptions?.section80D || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxExemptions: { ...prev.taxExemptions, section80D: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Section 24</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxExemptions?.section24 || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxExemptions: { ...prev.taxExemptions, section24: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">HRA Exemption</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxExemptions?.hraExemption || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxExemptions: { ...prev.taxExemptions, hraExemption: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Other Exemptions</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payrollForm.taxExemptions?.otherExemptions || ''}
                        onChange={(e) => setPayrollForm(prev => ({
                          ...prev,
                          taxExemptions: { ...prev.taxExemptions, otherExemptions: e.target.value }
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Other Details */}
              <AccordionItem value="other-details">
                <AccordionTrigger className="text-base font-semibold py-3">
                  Other Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Cost Center</label>
                      <Input
                        value={payrollForm.costCenter || ''}
                        onChange={(e) => setPayrollForm(prev => ({ ...prev, costCenter: e.target.value }))}
                        placeholder="Cost Center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Period Start</label>
                      <Input
                        type="date"
                        value={payrollForm.periodStart || ''}
                        onChange={(e) => setPayrollForm(prev => ({ ...prev, periodStart: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Period End</label>
                      <Input
                        type="date"
                        value={payrollForm.periodEnd || ''}
                        onChange={(e) => setPayrollForm(prev => ({ ...prev, periodEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={payrollForm.notes || ''}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Internal Notes</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={payrollForm.internalNotes || ''}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, internalNotes: e.target.value }))}
                      placeholder="Internal notes (not visible to employee)..."
                      rows={3}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Live summary (generate and edit) */}
            {(formBaseSalary > 0 || payrollForm.items.length > 0) && (
              <div className="border-t border-border pt-4">
                <div className="p-3 bg-muted/80 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Summary</p>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Base salary</span>
                    <span>{formatCurrency(calculateTotals.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Allowances</span>
                    <span className="text-green-600 dark:text-green-400">+{formatCurrency(calculateTotals.allowances)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Deductions</span>
                    <span className="text-red-600 dark:text-red-400">-{formatCurrency(calculateTotals.deductions)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold mt-2 pt-2 border-t border-border">
                    <span>Net salary</span>
                    <span>{formatCurrency(calculateTotals.net)}</span>
                  </div>
                </div>
              </div>
            )}

            </div>
            <DialogFooter className="px-6 py-4 border-t border-border bg-background flex-shrink-0 rounded-b-lg">
              <Button type="button" variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={generating || saving}>
                <Save className="h-4 w-4 mr-2" />
                {generating
                  ? 'Generating...'
                  : saving
                  ? 'Saving...'
                  : editingPayroll
                  ? 'Update Payroll'
                  : 'Generate Payroll'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve Payroll Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={(open) => { if (!open) { setShowApproveDialog(false); setActionPayroll(null); setApprovalForm({ comments: '', level: '' }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Payroll</DialogTitle>
          </DialogHeader>
          {actionPayroll && (
            <form onSubmit={handleApprove} className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">{actionPayroll.payrollNumber}</p>
                <p className="text-muted-foreground">Net: {formatCurrency(actionPayroll.netSalary || 0)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comments (optional)</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={approvalForm.comments}
                  onChange={(e) => setApprovalForm((p) => ({ ...p, comments: e.target.value }))}
                  placeholder="Approval comments"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Approval level (optional)</label>
                <Input
                  type="number"
                  min="1"
                  value={approvalForm.level}
                  onChange={(e) => setApprovalForm((p) => ({ ...p, level: e.target.value }))}
                  placeholder="Level"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowApproveDialog(false); setActionPayroll(null); }}>Cancel</Button>
                <Button type="submit" disabled={processingAction === 'approve'}>
                  {processingAction === 'approve' ? 'Approving...' : 'Approve'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Payroll Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={(open) => { if (!open) { setShowRejectDialog(false); setActionPayroll(null); setRejectForm({ comments: '', level: '' }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payroll</DialogTitle>
          </DialogHeader>
          {actionPayroll && (
            <form onSubmit={handleReject} className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">{actionPayroll.payrollNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason / Comments *</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={rejectForm.comments}
                  onChange={(e) => setRejectForm((p) => ({ ...p, comments: e.target.value }))}
                  placeholder="Rejection reason (required)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Level (optional)</label>
                <Input
                  type="number"
                  min="1"
                  value={rejectForm.level}
                  onChange={(e) => setRejectForm((p) => ({ ...p, level: e.target.value }))}
                  placeholder="Level"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowRejectDialog(false); setActionPayroll(null); }}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={processingAction === 'reject' || !rejectForm.comments.trim()}>
                  {processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reverse Payroll Dialog */}
      <Dialog open={showReverseDialog} onOpenChange={(open) => { if (!open) { setShowReverseDialog(false); setActionPayroll(null); setReverseForm({ reason: '' }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse Payroll</DialogTitle>
          </DialogHeader>
          {actionPayroll && (
            <form onSubmit={handleReverse} className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">{actionPayroll.payrollNumber}</p>
                <p className="text-muted-foreground">Net: {formatCurrency(actionPayroll.netSalary || 0)}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">This will create a reversal entry and revert finance records.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={reverseForm.reason}
                  onChange={(e) => setReverseForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Reason for reversal"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowReverseDialog(false); setActionPayroll(null); }}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={processingAction === 'reverse'}>
                  {processingAction === 'reverse' ? 'Reversing...' : 'Reverse'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Hold Payroll Dialog */}
      <Dialog open={showHoldDialog} onOpenChange={(open) => { if (!open) { setShowHoldDialog(false); setActionPayroll(null); setHoldForm({ reason: '', holdFrom: '', holdTo: '' }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Put Payroll on Hold</DialogTitle>
          </DialogHeader>
          {actionPayroll && (
            <form onSubmit={handleHold} className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">{actionPayroll.payrollNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <Input
                  value={holdForm.reason}
                  onChange={(e) => setHoldForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Hold reason"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Hold from</label>
                  <Input
                    type="date"
                    value={holdForm.holdFrom}
                    onChange={(e) => setHoldForm((p) => ({ ...p, holdFrom: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hold to (optional)</label>
                  <Input
                    type="date"
                    value={holdForm.holdTo}
                    onChange={(e) => setHoldForm((p) => ({ ...p, holdTo: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowHoldDialog(false); setActionPayroll(null); }}>Cancel</Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={processingAction === 'hold'}>
                  {processingAction === 'hold' ? 'Holding...' : 'Put on Hold'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Splits Dialog */}
      <Dialog open={showSplitsDialog} onOpenChange={(open) => { if (!open) { setShowSplitsDialog(false); setActionPayroll(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Splits</DialogTitle>
          </DialogHeader>
          {actionPayroll && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm flex justify-between items-center">
                <span>Net salary: {formatCurrency(actionPayroll.netSalary || 0)}</span>
                <span>Total splits: {formatCurrency((actionPayroll.paymentSplits || []).reduce((s, sp) => s + (sp.amount || 0), 0))}</span>
              </div>
              {(actionPayroll.paymentSplits || []).length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Method</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionPayroll.paymentSplits.map((sp, i) => (
                        <tr key={sp._id || i} className="border-t">
                          <td className="p-2">{formatCurrency(sp.amount)}</td>
                          <td className="p-2">{formatDateForDisplay(sp.paymentDate)}</td>
                          <td className="p-2">{sp.paymentMethod || '-'}</td>
                          <td className="p-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${sp.status === 'paid' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                              {sp.status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <form onSubmit={handleAddPaymentSplit} className="space-y-3 border-t pt-4">
                <h4 className="font-medium">Add split</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount *</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={splitForm.amount}
                      onChange={(e) => setSplitForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <Input
                      type="date"
                      value={splitForm.paymentDate}
                      onChange={(e) => setSplitForm((p) => ({ ...p, paymentDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Method</label>
                    <select
                      value={splitForm.paymentMethod}
                      onChange={(e) => setSplitForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account</label>
                    <select
                      value={splitForm.account}
                      onChange={(e) => setSplitForm((p) => ({ ...p, account: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select</option>
                      {accounts.map((acc) => (
                        <option key={acc._id} value={acc._id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Transaction reference</label>
                  <Input
                    value={splitForm.transactionReference}
                    onChange={(e) => setSplitForm((p) => ({ ...p, transactionReference: e.target.value }))}
                    placeholder="Reference"
                  />
                </div>
                <Button type="submit" size="sm" disabled={processingAction === 'split'}>
                  {processingAction === 'split' ? 'Adding...' : 'Add split'}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* YTD Dialog */}
      <Dialog open={showYTDDialog} onOpenChange={(open) => { if (!open) { setShowYTDDialog(false); setYtdData(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Year-to-Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Staff</label>
                <select
                  value={ytdFilters.teacherId}
                  onChange={(e) => setYtdFilters((p) => ({ ...p, teacherId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Select staff</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.employeeId || 'N/A'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <Input
                  type="number"
                  value={ytdFilters.year}
                  onChange={(e) => setYtdFilters((p) => ({ ...p, year: e.target.value }))}
                  placeholder="Year"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Up to month (optional)</label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={ytdFilters.month}
                  onChange={(e) => setYtdFilters((p) => ({ ...p, month: e.target.value }))}
                  placeholder="1-12"
                />
              </div>
            </div>
            <Button type="button" onClick={fetchYTD} className="gap-2">
              <Calculator className="h-4 w-4" />
              Load YTD
            </Button>
            {ytdData && (
              <div className="border rounded-md p-4 space-y-2">
                <h4 className="font-semibold">YTD Summary</h4>
                <p className="text-sm text-muted-foreground">
                  Period: {ytdData.period?.year} — Month {ytdData.period?.month}
                </p>
                {ytdData.grossYTD != null && <p>Gross YTD: {formatCurrency(ytdData.grossYTD)}</p>}
                {ytdData.netYTD != null && <p>Net YTD: {formatCurrency(ytdData.netYTD)}</p>}
                {ytdData.payrolls?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">Payrolls in period</p>
                    <ul className="text-sm space-y-1">
                      {ytdData.payrolls.slice(0, 10).map((p) => (
                        <li key={p._id}>
                          {p.payrollNumber} — {p.month}/{p.year} — {formatCurrency(p.netSalary)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Pay Slip Sent Dialog */}
      <Dialog open={showPaySlipSentDialog} onOpenChange={(open) => { if (!open) { setShowPaySlipSentDialog(false); setActionPayroll(null); setPaySlipSentTo(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Pay Slip Sent</DialogTitle>
          </DialogHeader>
          {actionPayroll && (
            <form onSubmit={handleMarkPaySlipSent} className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium">{actionPayroll.payrollNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sent to (e.g. email)</label>
                <Input
                  value={paySlipSentTo}
                  onChange={(e) => setPaySlipSentTo(e.target.value)}
                  placeholder="Email or contact"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowPaySlipSentDialog(false); setActionPayroll(null); }}>Cancel</Button>
                <Button type="submit" disabled={processingAction === 'payslip-sent'}>
                  {processingAction === 'payslip-sent' ? 'Saving...' : 'Mark Sent'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Processing Form Modal */}
      <Dialog open={showPaymentForm} onOpenChange={(open) => {
        if (!open) {
          setShowPaymentForm(false);
          setUsePaymentSplits(false);
          setPaymentForm({
            accountId: '',
            paymentDate: formatDateForInput(new Date()),
            paymentMethod: 'bank-transfer',
            transactionReference: '',
          });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Process Payment</DialogTitle>
          </DialogHeader>
          
          {editingPayroll && (
            <form
              onSubmit={handleProcessPayment}
              className="space-y-4"
            >

              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Payroll</p>
                <p className="font-semibold">{editingPayroll.payrollNumber}</p>
                <p className="text-sm text-muted-foreground mt-1">Net Salary</p>
                <p className="font-semibold text-lg">
                  {formatCurrency(editingPayroll.netSalary || 0)}
                </p>
                {editingPayroll.paymentSplits?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={usePaymentSplits}
                        onCheckedChange={(checked) => setUsePaymentSplits(!!checked)}
                      />
                      <span className="text-sm font-medium">
                        Use payment splits ({editingPayroll.paymentSplits.length} split{editingPayroll.paymentSplits.length !== 1 ? 's' : ''} — {formatCurrency((editingPayroll.paymentSplits || []).reduce((s, sp) => s + (sp.amount || 0), 0))})
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Account</label>
                  <select
                    value={paymentForm.accountId}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        accountId: e.target.value,
                      }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.name} ({formatCurrency(account.balance || 0)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment Date
                  </label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value,
                      }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Transaction Reference
                  </label>
                  <Input
                    value={paymentForm.transactionReference}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        transactionReference: e.target.value,
                      }))
                    }
                    placeholder="Transaction reference number"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentForm({
                      accountId: '',
                      paymentDate: formatDateForInput(new Date()),
                      paymentMethod: 'bank-transfer',
                      transactionReference: '',
                    });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={processingPayment === editingPayroll._id}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {processingPayment === editingPayroll._id
                    ? 'Processing...'
                    : 'Process Payment'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Payroll table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <DataTable
          data={payrolls}
          columns={payrollColumns}
          actions={payrollActions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="payroll-table"
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No payrolls found. Generate a payroll or adjust filters."
          onRowClick={(row) => router.push(`/app/payroll/${row._id}`)}
        />
      </div>

    </div>
  );
}

