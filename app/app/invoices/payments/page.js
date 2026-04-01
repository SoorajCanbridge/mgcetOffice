'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  CreditCard, Search, User, FileText, DollarSign, CheckCircle,
  XCircle, Calendar, Building2, Phone, Mail, MapPin, ArrowLeft,
  RefreshCcw, Filter, X, Plus, Minus, Receipt, Printer, Download,
  AlertCircle, TrendingUp, TrendingDown, ChevronRight, Banknote,
  Smartphone, Landmark, Hash, Clock, Check, Zap,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const INVOICE_BASE = '/finance/invoices';
const PAYMENTS_BASE = '/finance/payments';

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash',         icon: Banknote,   color: '#16a34a' },
  { value: 'upi',           label: 'UPI',           icon: Smartphone, color: '#7c3aed' },
  { value: 'card',          label: 'Card',          icon: CreditCard, color: '#2563eb' },
  { value: 'bank-transfer', label: 'Bank Transfer', icon: Landmark,   color: '#0891b2' },
  { value: 'cheque',        label: 'Cheque',        icon: FileText,   color: '#b45309' },
  { value: 'neft',          label: 'NEFT',          icon: Hash,       color: '#0369a1' },
  { value: 'rtgs',          label: 'RTGS',          icon: Zap,        color: '#dc2626' },
  { value: 'online',        label: 'Online',        icon: DollarSign, color: '#059669' },
  { value: 'other',         label: 'Other',         icon: Receipt,    color: '#6b7280' },
];

/* ─── helpers ─── */
const formatDateForInput = (date) => {
  if (!date) return '';
  try { return new Date(date).toISOString().split('T')[0]; } catch { return ''; }
};
const formatDateForDisplay = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
};
const formatCurrency = (value) => {
  if (!value && value !== 0) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  } catch { return String(value); }
};
const redistributeAccountSplits = (rows, totalAmount) => {
  const list = rows?.length ? [...rows] : [];
  const n = list.length;
  const total = Math.max(0, Math.round(Number(totalAmount) * 100) / 100);
  if (n === 0) return list;
  if (n === 1) return [{ ...list[0], amount: String(total) }];
  const share = Math.floor((total / n) * 100) / 100;
  let assigned = 0;
  return list.map((r, i) => {
    if (i < n - 1) { assigned += share; return { ...r, amount: String(share) }; }
    return { ...r, amount: String(Math.round((total - assigned) * 100) / 100) };
  });
};
const DEFAULT_LEVEL_LABELS = { A: 'Department', B: 'Year', C: 'Section' };
const normalizeLevelLabels = (l) => !l || typeof l !== 'object' ? DEFAULT_LEVEL_LABELS : { A: l.A || DEFAULT_LEVEL_LABELS.A, B: l.B || DEFAULT_LEVEL_LABELS.B, C: l.C || DEFAULT_LEVEL_LABELS.C };
const normalizeLevelValues = (v) => !v || typeof v !== 'object' ? { A: [], B: [], C: [] } : { A: Array.isArray(v.A) ? v.A : [], B: Array.isArray(v.B) ? v.B : [], C: Array.isArray(v.C) ? v.C : [] };
const formatAddressForDisplay = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address !== 'object') return '';
  return [address.street, address.city, address.state, address.pincode].filter(Boolean).join(', ');
};

export default function InvoicePaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentFilters, setStudentFilters] = useState({ courseId: '', levelA: '', levelB: '', levelC: '' });
  const [levelLabels, setLevelLabels] = useState(DEFAULT_LEVEL_LABELS);
  const [levelValues, setLevelValues] = useState({ A: [], B: [], C: [] });
  const [courses, setCourses] = useState([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState('payment');

  const [paymentForm, setPaymentForm] = useState({
    paymentDate: formatDateForInput(new Date()),
    paymentMethod: 'cash',
    account: '',
    accountSplitEnabled: false,
    accountSplits: [],
    reference: '',
    transactionId: '',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    description: '',
    itemPayments: [],
    paymentMode: 'full',
    amount: '',
  });

  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [applyingDiscounts, setApplyingDiscounts] = useState(false);
  const [discountEditorItemIndex, setDiscountEditorItemIndex] = useState(null);
  const [discountEditorValue, setDiscountEditorValue] = useState('');
  const [showPostSubmitPopover, setShowPostSubmitPopover] = useState(false);
  const [createdPaymentId, setCreatedPaymentId] = useState('');

  const normalizeCollegeId = (college) => {
    if (!college) return '';
    if (typeof college === 'object') return college._id || college.id || '';
    return String(college);
  };

  const fetchCourses = useCallback(async () => {
    if (!user?.college) return;
    try {
      const cId = normalizeCollegeId(user.college);
      const res = await api.get(`/academic/courses?collegeId=${cId}`, {}, true);
      const data = res?.data || res || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch {}
  }, [user?.college]);

  const fetchLevelLabels = useCallback(async () => {
    if (!user?.college) return;
    try {
      const cId = normalizeCollegeId(user.college);
      const res = await api.get(`/academic/config/${cId}`);
      const config = res?.data || res || {};
      setLevelLabels(normalizeLevelLabels(config.levelNames));
      setLevelValues(normalizeLevelValues(config.levelValues));
    } catch {
      setLevelLabels(DEFAULT_LEVEL_LABELS);
      setLevelValues({ A: [], B: [], C: [] });
    }
  }, [user?.college]);

  const fetchAccounts = useCallback(async () => {
    if (!user?.college) return;
    try {
      const res = await api.get('/finance/accounts', {}, true);
      const data = res?.data || res || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch {}
  }, [user?.college]);

  const searchStudents = useCallback(async () => {
    if (!user?.college) return;
    try {
      setStudentLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '50'); params.set('page', '1');
      if (studentSearch?.trim()) params.set('search', studentSearch.trim());
      if (studentFilters.courseId) params.set('courseId', studentFilters.courseId);
      if (studentFilters.levelA) params.set('levelA', studentFilters.levelA);
      if (studentFilters.levelB) params.set('levelB', studentFilters.levelB);
      if (studentFilters.levelC) params.set('levelC', studentFilters.levelC);
      const res = await api.get(`/students?${params.toString()}`, {}, true);
      const data = res?.data ?? res ?? [];
      setStudents(Array.isArray(data) ? data : []);
    } catch { setStudents([]); } finally { setStudentLoading(false); }
  }, [user?.college, studentSearch, studentFilters]);

  const fetchStudentInvoices = useCallback(async () => {
    if (!selectedStudent?._id || !user?.college) { setInvoices([]); return []; }
    try {
      setInvoiceLoading(true);
      const res = await api.get(`${INVOICE_BASE}?studentId=${selectedStudent._id}`, {}, true);
      const data = res?.data || res || [];
      const next = Array.isArray(data) ? data : [];
      setInvoices(next);
      return next;
    } catch {
      setInvoices([]);
      return [];
    } finally { setInvoiceLoading(false); }
  }, [selectedStudent, user?.college]);

  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId');
    if (invoiceId && user?.college) {
      api.get(`${INVOICE_BASE}/${invoiceId}`, {}, true).then((res) => {
        const invoice = res?.data || res;
        if (invoice) {
          setSelectedInvoice(invoice);
          setSelectedInvoices([invoice]);
          if (invoice.student) {
            const sid = typeof invoice.student === 'object' ? invoice.student._id : invoice.student;
            if (sid) {
              api.get(`/students/${sid}`, {}, true)
                .then((sr) => { const s = sr?.data || sr; if (s) setSelectedStudent(s); })
                .catch(() => { if (typeof invoice.student === 'object') setSelectedStudent(invoice.student); });
            } else if (typeof invoice.student === 'object') setSelectedStudent(invoice.student);
          }
        }
      }).catch(() => {});
    }
  }, [searchParams, user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchCourses(); fetchLevelLabels(); fetchAccounts();
  }, [user?.college, fetchCourses, fetchLevelLabels, fetchAccounts]);

  useEffect(() => {
    if (!showStudentPicker) return;
    const t = setTimeout(searchStudents, studentSearch ? 400 : 0);
    return () => clearTimeout(t);
  }, [showStudentPicker, studentSearch, studentFilters, searchStudents]);

  useEffect(() => { if (selectedStudent?._id) fetchStudentInvoices(); }, [selectedStudent, fetchStudentInvoices]);

  useEffect(() => {
    if (!selectedInvoice?._id || !Array.isArray(invoices) || invoices.length === 0) return;
    const refreshedActive = invoices.find((inv) => inv._id === selectedInvoice._id);
    if (refreshedActive && refreshedActive !== selectedInvoice) {
      setSelectedInvoice(refreshedActive);
    }
    setSelectedInvoices((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      const next = prev
        .map((oldInv) => invoices.find((inv) => inv._id === oldInv._id))
        .filter(Boolean);
      return next.length > 0 ? next : prev;
    });
  }, [invoices, selectedInvoice]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student); setShowStudentPicker(false);
    setSelectedInvoices([]); setStudentSearch('');
  };

  const handleToggleInvoice = (invoice) => {
    setSelectedInvoices((prev) => {
      const exists = prev.find((inv) => inv._id === invoice._id);
      if (exists) {
        const next = prev.filter((inv) => inv._id !== invoice._id);
        if (selectedInvoice?._id === invoice._id) setSelectedInvoice(next.length > 0 ? next[0] : null);
        return next;
      }
      const next = [...prev, invoice];
      if (!selectedInvoice) setSelectedInvoice(invoice);
      return next;
    });
  };

  const handleSelectInvoiceForDetails = (invoice) => {
    setSelectedInvoice(invoice);
    if (!selectedInvoices.find((inv) => inv._id === invoice._id)) {
      setSelectedInvoices((prev) => [...prev, invoice]);
    }
  };

  const calculateInvoiceBalance = (invoice) => {
    const subtotal = invoice.subtotal || (invoice.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    let taxAmount = 0;
    if ((invoice.taxCalculationMethod || 'total') === 'product') {
      taxAmount = (invoice.items || []).reduce((s, i) => s + (Number(i.taxAmount) || 0), 0);
    } else {
      taxAmount = (subtotal * (invoice.taxRate || 0)) / 100;
    }
    return Math.max(0, subtotal + taxAmount - (invoice.discount || 0) - (invoice.paidAmount || 0));
  };

  const calculateInvoiceTotals = useCallback((inv) => {
    if (!inv) return { subtotal: 0, taxAmount: 0, totalAmount: 0, balanceAmount: 0 };
    const subtotal = inv.subtotal || (inv.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const taxCalculationMethod = inv.taxCalculationMethod || 'total';
    let taxAmount = 0;
    if (taxCalculationMethod === 'product') {
      taxAmount = (inv.items || []).reduce((s, i) => s + (Number(i.taxAmount) || 0), 0);
    } else {
      taxAmount = (subtotal * (inv.taxRate || 0)) / 100;
    }
    const totalAmount = subtotal + taxAmount - (inv.discount || 0);
    return { subtotal, taxAmount, totalAmount, balanceAmount: totalAmount - (inv.paidAmount || 0), taxCalculationMethod };
  }, []);

  const getItemTotalWithTax = useCallback((inv, item, subtotal, taxAmount) => {
    if (!inv || !item) return 0;
    const amount = Number(item.amount) || 0;
    const discount = Number(item.discount) || 0;
    const netAmount = Math.max(0, amount - discount);
    if ((inv.taxCalculationMethod || 'total') === 'product') return netAmount + (Number(item.taxAmount) || 0);
    const invSub = subtotal || (inv.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    if (!invSub || invSub <= 0) return netAmount;
    return netAmount + (amount / invSub) * (taxAmount || 0);
  }, []);

  const getItemBalanceForPayment = useCallback((inv, item, itemIndex, subtotal, taxAmount) => {
    if (!inv || !item) return 0;
    return Math.max(0, getItemTotalWithTax(inv, item, subtotal, taxAmount) - (Number(item.paidAmount) || 0));
  }, [getItemTotalWithTax]);

  const openPaymentModal = useCallback(async (invoice) => {
    if (!invoice) return;
    let fullInvoice = invoice;
    if (!invoice.items || invoice.items.length === 0) {
      try {
        const res = await api.get(`${INVOICE_BASE}/${invoice._id}`, {}, true);
        fullInvoice = res?.data || res;
      } catch {}
    }
    const totals = calculateInvoiceTotals(fullInvoice);
    setSelectedInvoice(fullInvoice);
    setPaymentForm({
      amount: totals.balanceAmount > 0 ? String(totals.balanceAmount) : '',
      paymentDate: formatDateForInput(new Date()),
      paymentMethod: 'cash',
      reference: '',
      account: fullInvoice.account?._id || fullInvoice.account || '',
      accountSplitEnabled: false,
      accountSplits: [],
      itemPayments: [],
      paymentMode: 'full',
      transactionId: '',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      description: '',
      itemDiscounts: (fullInvoice.items || []).map((item, index) => ({
        itemIndex: index,
        discount: Number(item.discount) || 0,
      })),
    });
    setPaymentModalTab('payment');
    setShowPaymentModal(true);
    setDiscountEditorItemIndex(null);
    setDiscountEditorValue('');
    setError('');
  }, [calculateInvoiceTotals]);

  const closePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    setPaymentModalTab('payment');
    setDiscountEditorItemIndex(null);
    setDiscountEditorValue('');
    setError('');
  }, []);

  const extractCreatedPaymentId = (response) => {
    if (!response) return '';
    return (
      response?.data?.payment?._id ||
      response?.payment?._id ||
      response?.data?._id ||
      response?._id ||
      response?.data?.paymentId ||
      response?.paymentId ||
      ''
    );
  };

  const handleApplySingleItemDiscount = useCallback(async (itemIndex, rawDiscount) => {
    if (!selectedInvoice?._id) return;
    const item = selectedInvoice.items?.[itemIndex];
    if (!item) return;
    const discountValue = Math.max(0, Number(rawDiscount) || 0);
    const itemAmount = Number(item.amount) || 0;
    if (discountValue > itemAmount) {
      setError(`Discount cannot exceed item amount (${formatCurrency(itemAmount)}).`);
      return;
    }

    const invoiceDiscount = Number(selectedInvoice.discount) || 0;
    const otherItemsDiscountTotal = (selectedInvoice.items || []).reduce((sum, it, idx) => {
      if (idx === itemIndex) return sum;
      return sum + (Number(it.discount) || 0);
    }, 0);
    if (otherItemsDiscountTotal + discountValue > invoiceDiscount) {
      setError(`Total item discounts cannot exceed invoice discount (${formatCurrency(invoiceDiscount)}).`);
      return;
    }

    setApplyingDiscounts(true);
    setError('');
    try {
      let response;
      try {
        response = await api.put(
          `${INVOICE_BASE}/${selectedInvoice._id}/item-discounts`,
          { itemDiscounts: [{ itemIndex, discount: discountValue }], discount: invoiceDiscount },
          {},
          true
        );
      } catch {
        response = await api.put(
          `${INVOICE_BASE}/${selectedInvoice._id}/apply-item-discounts`,
          { itemDiscounts: [{ itemIndex, discount: discountValue }], discount: invoiceDiscount },
          {},
          true
        );
      }

      const updated = response?.data || response;
      if (updated?._id) {
        setSelectedInvoice(updated);
        setInvoices((prev) => prev.map((inv) => (inv._id === updated._id ? updated : inv)));
      }
      setPaymentForm((prev) => ({ ...prev, itemPayments: [], amount: '' }));
      setDiscountEditorItemIndex(null);
      setDiscountEditorValue('');
      setSuccess('Discount applied.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.message || 'Failed to apply item discount.');
    } finally {
      setApplyingDiscounts(false);
    }
  }, [selectedInvoice]);

  const handleProcessPayment = async (e) => {
    e?.preventDefault();
    if (paymentModalTab !== 'summary') {
      return;
    }
    if (!selectedInvoice?._id) { setError('No invoice selected.'); return; }
    if (!paymentForm.paymentDate) { setError('Please select a payment date.'); return; }

    const totals = calculateInvoiceTotals(selectedInvoice);
    const invoiceBalance = totals.balanceAmount;
    const payAmt = paymentForm.paymentMode === 'full'
      ? Number(paymentForm.amount) || 0
      : paymentForm.itemPayments.reduce((s, ip) => s + (Number(ip.amount) || 0), 0);

    if (paymentForm.paymentMode === 'items' && paymentForm.itemPayments.filter(ip => ip.amount > 0).length === 0) {
      setError('Please select at least one item to pay.'); return;
    }
    if (paymentForm.paymentMode === 'full') {
      if (!payAmt || payAmt <= 0) { setError('Please enter a valid payment amount.'); return; }
      if (payAmt > invoiceBalance) { setError('Amount exceeds outstanding balance.'); return; }
    }
    if (!paymentForm.accountSplitEnabled && !paymentForm.account) {
      setPaymentModalTab('account'); return;
    }
    if (paymentForm.accountSplitEnabled) {
      const rows = (paymentForm.accountSplits || []).filter(r => Number(r.amount) > 0);
      if (rows.length < 2 || new Set(rows.map(r => String(r.account))).size < 2) {
        setError('Add at least 2 different accounts.'); setPaymentModalTab('account'); return;
      }
      const splitSum = rows.reduce((s, r) => s + Number(r.amount), 0);
      if (Math.abs(splitSum - payAmt) > 0.01) {
        setError(`Splits must sum to ${formatCurrency(payAmt)}`); setPaymentModalTab('account'); return;
      }
    }

    setError('');
    setProcessingPayment(true);
    try {
      let createdId = '';
      const accountSplitsPayload = paymentForm.accountSplitEnabled
        ? (paymentForm.accountSplits || []).filter(r => Number(r.amount) > 0 && r.account).map(r => ({ account: r.account, amount: Number(r.amount) }))
        : [];
      const primaryAccount = paymentForm.accountSplitEnabled && accountSplitsPayload.length >= 2
        ? accountSplitsPayload[0].account
        : paymentForm.account || selectedInvoice.account?._id || selectedInvoice.account;

      if (paymentForm.paymentMode === 'items') {
        const itemPayments = paymentForm.itemPayments.filter(ip => ip.amount > 0).map(ip => ({ itemIndex: ip.itemIndex, amount: Number(ip.amount) }));
        const payItemsResponse = await api.post(`${INVOICE_BASE}/${selectedInvoice._id}/pay-items`, {
          itemPayments, account: primaryAccount,
          ...(accountSplitsPayload.length >= 2 ? { accountSplits: accountSplitsPayload } : {}),
          paymentDate: paymentForm.paymentDate, paymentMethod: paymentForm.paymentMethod || 'cash',
          notes: paymentForm.description || undefined,
        }, {}, true);
        createdId = extractCreatedPaymentId(payItemsResponse);
      } else {
        const payload = {
          invoice: selectedInvoice._id, amount: Number(paymentForm.amount),
          paymentDate: paymentForm.paymentDate, paymentMethod: paymentForm.paymentMethod,
          account: primaryAccount, status: 'completed',
          referenceNumber: paymentForm.reference || undefined,
          transactionId: paymentForm.transactionId || undefined,
          chequeNumber: paymentForm.chequeNumber || undefined,
          chequeDate: paymentForm.chequeDate || undefined,
          bankName: paymentForm.bankName || undefined,
          description: paymentForm.description || undefined,
          student: selectedInvoice.student?._id || selectedInvoice.student || selectedStudent?._id || undefined,
        };
        if (accountSplitsPayload.length >= 2) payload.accountSplits = accountSplitsPayload;
        const paymentResponse = await api.post(PAYMENTS_BASE, payload, {}, true);
        createdId = extractCreatedPaymentId(paymentResponse);
      }
      setSuccess('Payment recorded successfully.');
      const paidInvoiceId = selectedInvoice?._id;
      if (selectedStudent?._id) {
        const refreshedInvoices = await fetchStudentInvoices();
        if (refreshedInvoices.length > 0) {
          setSelectedInvoices((prevSelected) => {
            const selectedIds = new Set((prevSelected || []).map((inv) => inv._id));
            const refreshedSelected = refreshedInvoices.filter((inv) => selectedIds.has(inv._id));
            if (refreshedSelected.length > 0) return refreshedSelected;
            const paidInvoice = refreshedInvoices.find((inv) => inv._id === paidInvoiceId);
            return paidInvoice ? [paidInvoice] : [];
          });
          setSelectedInvoice((prevInvoice) => {
            const preferredId = prevInvoice?._id || paidInvoiceId;
            const preferred = refreshedInvoices.find((inv) => inv._id === preferredId);
            return preferred || refreshedInvoices[0] || null;
          });
        }
      }
      closePaymentModal();
      setCreatedPaymentId(createdId || '');
      setShowPostSubmitPopover(true);
      setPaymentForm({ paymentDate: formatDateForInput(new Date()), paymentMethod: 'cash', account: '', accountSplitEnabled: false, accountSplits: [], reference: '', transactionId: '', chequeNumber: '', chequeDate: '', bankName: '', description: '', itemPayments: [], itemDiscounts: [], paymentMode: 'full', amount: '' });
    } catch (err) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  const studentLevelOptions = useMemo(() => {
    const lA = levelValues.A || [];
    const lB = (levelValues.B || []).filter(i => i.parent === studentFilters.levelA).flatMap(i => i.values || []);
    const lC = (levelValues.C || []).filter(i => i.parent === studentFilters.levelB || i.parent === studentFilters.levelA).flatMap(i => i.values || []);
    return { levelA: [...new Set(lA)].sort(), levelB: [...new Set(lB)].sort(), levelC: [...new Set(lC)].sort() };
  }, [levelValues, studentFilters.levelA, studentFilters.levelB]);

  const isOverdue = (inv) => {
    if (!inv?.dueDate || inv.status === 'paid' || inv.status === 'cancelled') return false;
    try { return new Date(inv.dueDate) < new Date(new Date().toDateString()); } catch { return false; }
  };

  const pendingCount = invoices.filter(inv => calculateInvoiceBalance(inv) > 0).length;
  const totalOutstanding = invoices.reduce((s, inv) => s + calculateInvoiceBalance(inv), 0);

  /* ─── Payment modal internals ─── */
  const renderPaymentModal = () => {
    if (!selectedInvoice) return null;
    const totals = calculateInvoiceTotals(selectedInvoice);
    const invoiceBalance = totals.balanceAmount;
    const paymentAmount = paymentForm.paymentMode === 'full'
      ? (Number(paymentForm.amount) || 0)
      : paymentForm.itemPayments.reduce((s, ip) => s + (Number(ip.amount) || 0), 0);
    const remainingBalance = invoiceBalance - paymentAmount;
    const accountSplitsSum = (paymentForm.accountSplits || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const invoiceDiscountCap = Number(selectedInvoice.discount) || 0;
    const totalAppliedItemDiscount = (selectedInvoice.items || []).reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
    const remainingDiscountCapacity = Math.max(0, invoiceDiscountCap - totalAppliedItemDiscount);
    const isPaymentStepComplete = paymentForm.paymentMode === 'full'
      ? paymentAmount > 0 && paymentAmount <= invoiceBalance
      : paymentForm.itemPayments.some((ip) => Number(ip.amount) > 0);
    const isDateStepComplete = Boolean(paymentForm.paymentDate && paymentForm.paymentMethod);
    const isAccountStepComplete = paymentForm.accountSplitEnabled
      ? Math.abs(accountSplitsSum - paymentAmount) <= 0.01 &&
        (paymentForm.accountSplits || []).filter((r) => Number(r.amount) > 0 && r.account).length >= 2
      : Boolean(paymentForm.account);
    const selectedMethodObj = PAYMENT_METHODS.find(m => m.value === paymentForm.paymentMethod);
    const MethodIcon = selectedMethodObj?.icon || CreditCard;

    return (
      <Dialog open={showPaymentModal} onOpenChange={(open) => { if (!open) closePaymentModal(); }}>
        <DialogContent className="max-w-6xl h-[94vh] max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          {/* POS Header */}
          <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }} className="px-7 pt-6 pb-5 flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Fee Collection</p>
                <h2 className="text-white text-xl font-bold">{selectedInvoice.invoiceNumber || 'Invoice'}</h2>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs mb-1">Outstanding</p>
                <p className="text-white text-2xl font-black tabular-nums">{formatCurrency(invoiceBalance)}</p>
              </div>
            </div>

            {/* Student strip */}
            {(selectedStudent || selectedInvoice.student) && (
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                <div className="h-8 w-8 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-blue-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {selectedStudent?.name || (typeof selectedInvoice.student === 'object' ? selectedInvoice.student.name : '') || 'Student'}
                  </p>
                  <p className="text-slate-400 text-xs truncate">
                    {selectedStudent?.rollNumber || selectedStudent?.studentId || ''}
                    {selectedStudent?.email ? ` · ${selectedStudent.email}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Paid {formatCurrency(selectedInvoice.paidAmount || 0)} of {formatCurrency(totals.totalAmount)}</span>
                <span>{totals.totalAmount > 0 ? Math.round(((selectedInvoice.paidAmount || 0) / totals.totalAmount) * 100) : 0}% paid</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${totals.totalAmount > 0 ? Math.min(100, ((selectedInvoice.paidAmount || 0) / totals.totalAmount) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1 min-h-0 bg-background">
            <div className="flex-1 overflow-y-auto">
              {error && (
                <div className="mx-5 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}

              <Tabs
                value={paymentModalTab}
                onValueChange={setPaymentModalTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 w-auto gap-2 mx-5 mb-5 h-11">
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                  <TabsTrigger value="date" disabled={!isPaymentStepComplete}>Date & Method</TabsTrigger>
                  <TabsTrigger value="account" disabled={!isPaymentStepComplete || !isDateStepComplete}>Account</TabsTrigger>
                  <TabsTrigger value="summary" disabled={!isPaymentStepComplete || !isDateStepComplete || !isAccountStepComplete}>Summary</TabsTrigger>
                </TabsList>

                <TabsContent value="payment" className="px-5 pb-5 space-y-6 min-h-[56vh]">
                  {/* Payment Mode Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'full', label: 'Full Invoice', sub: `Pay ${formatCurrency(invoiceBalance)}` },
                      { value: 'items', label: 'Select Items', sub: 'Pay specific fees' },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => {
                          if (opt.value === 'full') {
                            setPaymentForm(prev => ({ ...prev, paymentMode: 'full', amount: String(invoiceBalance > 0 ? invoiceBalance : ''), itemPayments: [] }));
                          } else {
                            setPaymentForm(prev => ({ ...prev, paymentMode: 'items', amount: '' }));
                          }
                        }}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          paymentForm.paymentMode === opt.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                            : 'border-border hover:border-blue-300 bg-card'
                        }`}
                      >
                        {paymentForm.paymentMode === opt.value && (
                          <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                        <p className={`font-semibold text-sm ${paymentForm.paymentMode === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
                      </button>
                    ))}
                  </div>

                  {/* Full Payment Amount */}
                  {paymentForm.paymentMode === 'full' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payment Amount</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">₹</span>
                        <Input
                          type="number" min="0" step="0.01" max={invoiceBalance} required
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="pl-8 h-12 text-lg font-bold tabular-nums rounded-xl border-2 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      {paymentForm.amount && Number(paymentForm.amount) > invoiceBalance && (
                        <p className="text-xs text-destructive mt-1.5 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Exceeds outstanding balance</p>
                      )}
                      {/* Quick amount buttons */}
                      <div className="flex gap-2.5 mt-3">
                        {[
                          { label: 'Full', fn: () => invoiceBalance },
                          { label: '75%', fn: () => Math.round(invoiceBalance * 0.75 * 100) / 100 },
                          { label: '50%', fn: () => Math.round(invoiceBalance * 0.50 * 100) / 100 },
                          { label: '25%', fn: () => Math.round(invoiceBalance * 0.25 * 100) / 100 },
                        ].map(btn => (
                          <button key={btn.label} type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, amount: String(btn.fn()) }))}
                            className="flex-1 py-2 text-xs font-semibold rounded-lg border border-border hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Item-Level Payment */}
                  {paymentForm.paymentMode === 'items' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Fee Items</label>
                        <div className="flex items-center gap-3">
                          <button type="button"
                            onClick={() => {
                              const items = (selectedInvoice.items || []).map((item, i) => {
                                const bal = getItemBalanceForPayment(selectedInvoice, item, i, totals.subtotal, totals.taxAmount);
                                return bal > 0 ? { itemIndex: i, amount: bal } : null;
                              }).filter(Boolean);
                              setPaymentForm(prev => ({ ...prev, itemPayments: items, amount: String(items.reduce((s, ip) => s + ip.amount, 0)) }));
                            }}
                            className="text-xs text-blue-600 font-semibold hover:text-blue-700"
                          >
                            Select All
                          </button>
                        </div>
                      </div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Discount used: {formatCurrency(totalAppliedItemDiscount)} / {formatCurrency(invoiceDiscountCap)}
                        </p>
                        {invoiceDiscountCap > 0 && (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${remainingDiscountCapacity > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                            Remaining: {formatCurrency(remainingDiscountCapacity)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {(selectedInvoice.items || []).map((item, index) => {
                          const bal = getItemBalanceForPayment(selectedInvoice, item, index, totals.subtotal, totals.taxAmount);
                          if (bal <= 0) return null;
                          const amount = Number(item.amount) || 0;
                          const itemTax = (amount - (Number(item.discount) || 0)) * ((Number(item.taxRate) || 0) / 100);
                          const itemNet = getItemTotalWithTax(item);
                          const itemPaid = Number(item.paidAmount) || 0;
                          const itemDiscount = Number(item.discount) || 0;
                          const maxAdditionalDiscount = Math.max(0, Math.min(
                            remainingDiscountCapacity,
                            Math.max(0, amount - itemDiscount)
                          ));
                          const canShowDiscountAction = invoiceDiscountCap > 0 && maxAdditionalDiscount > 0;
                          const ip = paymentForm.itemPayments.find(x => x.itemIndex === index) || { itemIndex: index, amount: 0 };
                          const isChecked = ip.amount > 0;
                          return (
                            <div key={index} className={`p-3 rounded-xl border transition-all ${isChecked ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-950/20' : 'border-border'}`}>
                              <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
                                <input type="checkbox" checked={isChecked} className="w-4 h-4 accent-blue-500"
                                  onChange={(e) => {
                                    const updated = paymentForm.itemPayments.filter(x => x.itemIndex !== index);
                                    if (e.target.checked) updated.push({ itemIndex: index, amount: bal });
                                    setPaymentForm(prev => ({ ...prev, itemPayments: updated, amount: String(updated.reduce((s, x) => s + x.amount, 0)) }));
                                  }}
                                />
                                <div className="min-w-[200px] flex-1">
                                  <p className="text-sm font-semibold truncate">{item.description || `Item ${index + 1}`}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Gross {formatCurrency(amount)} | Tax {formatCurrency(itemTax)} | Net {formatCurrency(itemNet)}
                                  </p>
                                </div>
                                <div className="text-[11px] text-muted-foreground min-w-[210px]">
                                  <span className="font-medium text-foreground">{formatCurrency(itemPaid)}</span> paid /
                                  <span className="font-semibold text-blue-700 dark:text-blue-300"> {formatCurrency(bal)}</span> balance
                                </div>

                                <div className="min-w-[120px] text-right">
                                  <p className="text-[11px] text-muted-foreground">Discount</p>
                                  <p className="text-sm font-semibold text-emerald-600">{formatCurrency(itemDiscount)}</p>
                                </div>
                                {canShowDiscountAction && (
                                  <div className="min-w-[220px]">
                                    {discountEditorItemIndex === index ? (
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          max={maxAdditionalDiscount}
                                          value={discountEditorValue}
                                          placeholder="More discount"
                                          onChange={(e) => setDiscountEditorValue(e.target.value)}
                                          className="h-9 w-32 text-sm text-right tabular-nums"
                                        />
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-9 px-3 text-xs"
                                          disabled={applyingDiscounts}
                                          onClick={() => {
                                            const additional = Math.max(0, Number(discountEditorValue) || 0);
                                            if (additional > maxAdditionalDiscount) {
                                              setError(`Additional discount cannot exceed ${formatCurrency(maxAdditionalDiscount)}.`);
                                              return;
                                            }
                                            handleApplySingleItemDiscount(index, itemDiscount + additional);
                                          }}
                                        >
                                          {applyingDiscounts ? 'Applying…' : (itemDiscount > 0 ? 'Apply More' : 'Apply')}
                                        </Button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="text-xs text-emerald-600 font-semibold hover:text-emerald-700"
                                        onClick={() => {
                                          setDiscountEditorItemIndex(index);
                                          setDiscountEditorValue(String(maxAdditionalDiscount));
                                        }}
                                      >
                                        {itemDiscount > 0 ? 'More Discount' : 'Apply Discount'}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {isChecked && (
                                  <Input type="number" min="0" step="0.01" max={bal}
                                    value={ip.amount || ''} placeholder="0.00"
                                    className="w-32 h-9 text-sm text-right tabular-nums"
                                    onChange={(e) => {
                                      const amt = Math.min(Number(e.target.value) || 0, bal);
                                      const updated = paymentForm.itemPayments.filter(x => x.itemIndex !== index);
                                      if (amt > 0) updated.push({ itemIndex: index, amount: amt });
                                      setPaymentForm(prev => ({ ...prev, itemPayments: updated, amount: String(updated.reduce((s, x) => s + x.amount, 0)) }));
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {paymentForm.itemPayments.length > 0 && (
                        <div className="mt-2 flex justify-between text-sm font-semibold px-1">
                          <span className="text-muted-foreground">Selected total:</span>
                          <span className="text-blue-600">{formatCurrency(paymentAmount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="date" className="px-5 pb-5 space-y-6 min-h-[56vh]">
                  {/* Payment Method — visual grid */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Payment Method</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {PAYMENT_METHODS.map((m) => {
                        const Icon = m.icon;
                        const active = paymentForm.paymentMethod === m.value;
                        return (
                          <button key={m.value} type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, paymentMethod: m.value }))}
                            className={`relative flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border-2 transition-all ${
                              active ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-sm' : 'border-border hover:border-blue-200 bg-card'
                            }`}
                          >
                            {active && (
                              <div className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="h-2 w-2 text-white" />
                              </div>
                            )}
                            <Icon className="h-5 w-5" style={{ color: active ? m.color : undefined }} />
                            <span className={`text-xs font-medium leading-tight text-center ${active ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>
                              {m.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Method-specific fields */}
                  {paymentForm.paymentMethod === 'cheque' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cheque Number</label>
                        <Input value={paymentForm.chequeNumber} onChange={(e) => setPaymentForm(p => ({ ...p, chequeNumber: e.target.value }))} placeholder="Enter cheque number" className="rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cheque Date</label>
                        <Input type="date" value={paymentForm.chequeDate} onChange={(e) => setPaymentForm(p => ({ ...p, chequeDate: e.target.value }))} className="rounded-xl" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Bank Name</label>
                        <Input value={paymentForm.bankName} onChange={(e) => setPaymentForm(p => ({ ...p, bankName: e.target.value }))} placeholder="Enter bank name" className="rounded-xl" />
                      </div>
                    </div>
                  )}
                  {['bank-transfer', 'upi', 'neft', 'rtgs'].includes(paymentForm.paymentMethod) && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Transaction ID / Reference</label>
                      <Input value={paymentForm.transactionId} onChange={(e) => setPaymentForm(p => ({ ...p, transactionId: e.target.value }))} placeholder="Enter transaction ID" className="rounded-xl" />
                    </div>
                  )}

                  {/* Payment Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment Date *</label>
                      <Input
                        type="date"
                        required
                        value={paymentForm.paymentDate}
                        onChange={(e) => setPaymentForm(p => ({ ...p, paymentDate: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="account" className="px-5 pb-5 space-y-6 min-h-[56vh]">
                  {/* Account */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ledger Account *</label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={paymentForm.accountSplitEnabled}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const payAmt = paymentForm.paymentMode === 'full'
                                ? Number(paymentForm.amount) || 0
                                : paymentForm.itemPayments.reduce((s, ip) => s + (Number(ip.amount) || 0), 0);
                              const half = Math.round((payAmt / 2) * 100) / 100;
                              setPaymentForm(prev => ({
                                ...prev,
                                accountSplitEnabled: true,
                                accountSplits: [
                                  { account: prev.account, amount: String(half) },
                                  { account: '', amount: String(Math.round((payAmt - half) * 100) / 100) },
                                ],
                              }));
                            } else {
                              setPaymentForm(prev => ({ ...prev, accountSplitEnabled: false, accountSplits: [], account: prev.accountSplits?.[0]?.account || prev.account }));
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">Split accounts</span>
                      </label>
                    </div>
                    {!paymentForm.accountSplitEnabled ? (
                      <Select
                        value={paymentForm.account || undefined}
                        onValueChange={(v) => setPaymentForm(p => ({ ...p, account: v }))}
                      >
                        <SelectTrigger className="rounded-xl h-10">
                          <SelectValue placeholder="Select ledger account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc._id} value={acc._id}>
                              {acc.name} {acc.accountType ? `(${acc.accountType})` : ''} — {formatCurrency(acc.balance || 0)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-2">
                        {(paymentForm.accountSplits || []).map((row, idx) => (
                          <div key={idx} className="flex gap-2.5 items-center">
                            <Select
                              value={row.account || undefined}
                              onValueChange={(v) => setPaymentForm(prev => {
                                const n = [...(prev.accountSplits || [])];
                                n[idx] = { ...n[idx], account: v };
                                return { ...prev, accountSplits: n };
                              })}
                            >
                              <SelectTrigger className="flex-1 rounded-xl h-10 text-sm">
                                <SelectValue placeholder="Account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map(acc => (
                                  <SelectItem key={acc._id} value={acc._id}>
                                    {acc.name} — {formatCurrency(acc.balance || 0)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => setPaymentForm(prev => {
                                const n = [...(prev.accountSplits || [])];
                                n[idx] = { ...n[idx], amount: e.target.value };
                                return { ...prev, accountSplits: n };
                              })}
                              placeholder="0.00"
                              className="w-32 rounded-xl h-10 text-sm text-right"
                            />
                            {(paymentForm.accountSplits || []).length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPaymentForm(prev => {
                                  const l = [...(prev.accountSplits || [])];
                                  l.splice(idx, 1);
                                  return { ...prev, accountSplits: redistributeAccountSplits(l, paymentAmount) };
                                })}
                                className="text-muted-foreground hover:text-destructive p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, accountSplits: redistributeAccountSplits([...(prev.accountSplits || []), { account: '', amount: '' }], paymentAmount) }))}
                            className="text-xs text-blue-600 font-semibold flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add account
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, accountSplits: redistributeAccountSplits(prev.accountSplits, paymentAmount) }))}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Auto-split equally
                          </button>
                        </div>
                        {Math.abs(accountSplitsSum - paymentAmount) > 0.01 && (
                          <p className="text-xs text-amber-600">Splits ({formatCurrency(accountSplitsSum)}) must equal payment ({formatCurrency(paymentAmount)})</p>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="px-5 pb-5 space-y-6 min-h-[56vh]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payment Summary</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center border border-border/50 bg-muted/20 rounded-xl px-4 py-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Paying</p>
                        <p className="text-base font-black text-blue-600 tabular-nums">{formatCurrency(paymentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className={`text-base font-black tabular-nums ${remainingBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {formatCurrency(Math.max(0, remainingBalance))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className={`text-sm font-bold ${remainingBalance <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {remainingBalance <= 0 ? '✓ Cleared' : 'Partial'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Reference Id (optional)</label>
                      <Input
                        value={paymentForm.reference}
                        onChange={(e) => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                        placeholder="Optional reference"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Notes (optional)</label>
                    <textarea
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Add a payment note..."
                      rows={2}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* POS Footer */}
            <div className="flex-shrink-0 border-t border-border bg-muted/30">
              <div className="px-5 py-4 flex gap-3">
                <Button type="button" variant="outline" onClick={closePaymentModal} className="flex-1 rounded-xl h-11">
                  Cancel
                </Button>
                {paymentModalTab !== 'payment' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (paymentModalTab === 'date') setPaymentModalTab('payment');
                      else if (paymentModalTab === 'account') setPaymentModalTab('date');
                      else if (paymentModalTab === 'summary') setPaymentModalTab('account');
                    }}
                    className="rounded-xl h-11"
                  >
                    Back
                  </Button>
                )}
                {paymentModalTab !== 'summary' ? (
                  <Button
                    type="button"
                    className="flex-[2] rounded-xl h-11 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setError('');
                      if (paymentModalTab === 'payment') {
                        if (!isPaymentStepComplete) {
                          setError(paymentForm.paymentMode === 'full'
                            ? 'Enter a valid payment amount to continue.'
                            : 'Select at least one fee item to continue.');
                          return;
                        }
                        setPaymentModalTab('date');
                        return;
                      }
                      if (paymentModalTab === 'date') {
                        if (!isDateStepComplete) {
                          setError('Select payment date and method to continue.');
                          return;
                        }
                        setPaymentModalTab('account');
                        return;
                      }
                      if (paymentModalTab === 'account') {
                        if (!isAccountStepComplete) {
                          setError(paymentForm.accountSplitEnabled
                            ? 'Fix split accounts to continue.'
                            : 'Choose an account to continue.');
                          return;
                        }
                        setPaymentModalTab('summary');
                      }
                    }}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleProcessPayment}
                    disabled={
                      processingPayment || paymentAmount <= 0 ||
                      (paymentForm.paymentMode === 'items' && paymentForm.itemPayments.length === 0) ||
                      (paymentForm.accountSplitEnabled && Math.abs(accountSplitsSum - paymentAmount) > 0.01)
                    }
                    className="flex-[2] rounded-xl h-11 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {processingPayment ? (
                      <span className="flex items-center gap-2"><RefreshCcw className="h-4 w-4 animate-spin" /> Processing…</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <MethodIcon className="h-4 w-4" />
                        Collect {paymentAmount > 0 ? formatCurrency(paymentAmount) : ''}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  /* ─── Main layout ─── */
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-5 space-y-5">

        {/* Top Bar */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/app/invoices')} className="rounded-xl h-10 w-10 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Fee Payment
            </h1>
            <p className="text-xs text-muted-foreground">Select student → choose invoice → collect payment</p>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setSelectedStudent(null); setSelectedInvoices([]); setStudentSearch(''); }}>
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
            </Button>
          </div>
        </div>

        {/* Banners */}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />{success}
          </div>
        )}
        {error && !showPaymentModal && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ── Left panel ── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Step 1 — Student */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <span className="text-sm font-semibold">Select Student</span>
              </div>

              <div className="p-4">
                {!selectedStudent ? (
                  <button type="button" onClick={() => setShowStudentPicker(true)} className="w-full flex items-center gap-3 p-3.5 border-2 border-dashed border-border rounded-xl hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                      <Search className="h-5 w-5 text-muted-foreground group-hover:text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-muted-foreground group-hover:text-blue-600">Search & select student</p>
                      <p className="text-xs text-muted-foreground">Name, roll number, or email</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{selectedStudent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedStudent.rollNumber || selectedStudent.studentId || ''}
                        {selectedStudent.email ? ` · ${selectedStudent.email}` : ''}
                      </p>
                    </div>
                    <button onClick={() => { setSelectedStudent(null); setSelectedInvoices([]); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2 — Invoice list */}
            {selectedStudent && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <span className="text-sm font-semibold">Invoices</span>
                    {pendingCount > 0 && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-full">
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                  {totalOutstanding > 0 && (
                    <span className="text-xs font-bold text-red-600">{formatCurrency(totalOutstanding)}</span>
                  )}
                </div>

                <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                  {invoiceLoading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
                  ) : invoices.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">No invoices found</div>
                  ) : invoices.map((invoice) => {
                    const balance = calculateInvoiceBalance(invoice);
                    const isActive = selectedInvoice?._id === invoice._id;
                    const overdue = isOverdue(invoice);
                    return (
                      <div key={invoice._id}
                        onClick={() => handleSelectInvoiceForDetails(invoice)}
                        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-muted/50'} ${balance <= 0 ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          invoice.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                          overdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                        }`}>
                          <FileText className={`h-4 w-4 ${invoice.status === 'paid' ? 'text-emerald-600' : overdue ? 'text-red-600' : 'text-amber-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm font-semibold truncate">{invoice.invoiceNumber || 'N/A'}</span>
                            {overdue && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded flex-shrink-0">OVERDUE</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDateForDisplay(invoice.invoiceDate)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold tabular-nums ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {formatCurrency(balance)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">balance</p>
                        </div>
                        {isActive && <div className="w-1 h-8 bg-blue-500 rounded-full flex-shrink-0 -mr-1" />}
                      </div>
                    );
                  })}
                </div>
                {selectedInvoices.length > 0 && (
                  <div className="px-4 py-3 border-t border-border bg-muted/20">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Selected Invoices ({selectedInvoices.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedInvoices.map((inv) => (
                        <span
                          key={inv._id}
                          className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        >
                          {inv.invoiceNumber || inv._id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right panel — Invoice detail ── */}
          <div className="lg:col-span-8">
            {selectedInvoice ? (() => {
              const totals = calculateInvoiceTotals(selectedInvoice);
              const balance = totals.balanceAmount;
              const overdue = isOverdue(selectedInvoice);
              const selectedInvoiceRows = selectedInvoices.length > 0
                ? selectedInvoices
                : [selectedInvoice];
              const selectionTotal = selectedInvoiceRows.reduce(
                (sum, inv) => sum + (calculateInvoiceTotals(inv).totalAmount || 0),
                0
              );
              const selectionPaid = selectedInvoiceRows.reduce(
                (sum, inv) => sum + (Number(inv.paidAmount) || 0),
                0
              );
              const selectionBalance = selectedInvoiceRows.reduce(
                (sum, inv) => sum + calculateInvoiceBalance(inv),
                0
              );
              const selectionOverdue = selectedInvoiceRows.filter((inv) => isOverdue(inv)).length;
              return (
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden sticky top-5">
                  {/* Selected invoices summary */}
                  <div className="px-6 py-4 border-b border-border bg-blue-50/60 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Current Selection</p>
                        <p className="text-sm font-semibold text-foreground">
                          {selectedInvoiceRows.length} invoice{selectedInvoiceRows.length > 1 ? 's' : ''} selected
                          {selectionOverdue > 0 ? ` · ${selectionOverdue} overdue` : ''}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 min-w-[360px]">
                        <div className="rounded-lg border border-border bg-background px-3 py-2 text-right">
                          <p className="text-[10px] text-muted-foreground">Total</p>
                          <p className="text-xs font-bold tabular-nums">{formatCurrency(selectionTotal)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-3 py-2 text-right">
                          <p className="text-[10px] text-muted-foreground">Paid</p>
                          <p className="text-xs font-bold text-emerald-600 tabular-nums">{formatCurrency(selectionPaid)}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-3 py-2 text-right">
                          <p className="text-[10px] text-muted-foreground">Balance</p>
                          <p className={`text-xs font-bold tabular-nums ${selectionBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {formatCurrency(selectionBalance)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedInvoiceRows.map((inv) => (
                        <span
                          key={inv._id}
                          className={`text-[11px] px-2 py-1 rounded-full border ${selectedInvoice?._id === inv._id ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300' : 'bg-background border-border text-muted-foreground'}`}
                        >
                          {inv.invoiceNumber || inv._id}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Invoice header bar */}
                  <div className="px-6 py-5 border-b border-border">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-bold">{selectedInvoice.invoiceNumber || 'Invoice'}</h2>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                            selectedInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}>
                            {overdue ? 'Overdue' : selectedInvoice.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateForDisplay(selectedInvoice.invoiceDate)}</span>
                          {selectedInvoice.dueDate && <span>Due: {formatDateForDisplay(selectedInvoice.dueDate)}</span>}
                        </div>
                      </div>
                      {/* Balance callout */}
                      <div className={`text-right px-4 py-2.5 rounded-xl ${balance > 0 ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'}`}>
                        <p className="text-xs text-muted-foreground mb-0.5">Outstanding</p>
                        <p className={`text-2xl font-black tabular-nums ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(balance)}</p>
                      </div>
                    </div>

                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Invoice Total', value: formatCurrency(totals.totalAmount), muted: false },
                        { label: 'Paid', value: formatCurrency(selectedInvoice.paidAmount || 0), green: true },
                        { label: 'Balance Due', value: formatCurrency(balance), red: balance > 0 },
                      ].map(item => (
                        <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                          <p className={`text-sm font-bold tabular-nums ${item.green ? 'text-emerald-600' : item.red ? 'text-red-600' : ''}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Items table */}
                  {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                    <div className="px-6 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Fee Breakdown</p>
                      <div className="border border-border rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="text-xs py-2.5">Description</TableHead>
                              <TableHead className="text-xs py-2.5 text-right">Amount</TableHead>
                              <TableHead className="text-xs py-2.5 text-right text-emerald-600">Paid</TableHead>
                              <TableHead className="text-xs py-2.5 text-right text-red-600">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedInvoice.items.map((item, i) => {
                              const amt = item.amount || 0;
                              const paid = item.paidAmount || 0;
                              const bal = amt - paid;
                              return (
                                <TableRow key={i} className="hover:bg-muted/20">
                                  <TableCell className="text-sm py-2.5">
                                    <div>
                                      <p className="font-medium">{item.description || `Item ${i + 1}`}</p>
                                      {item.quantity > 1 && <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice || 0)}</p>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm py-2.5 text-right font-medium tabular-nums">{formatCurrency(amt)}</TableCell>
                                  <TableCell className="text-sm py-2.5 text-right text-emerald-600 font-medium tabular-nums">{formatCurrency(paid)}</TableCell>
                                  <TableCell className={`text-sm py-2.5 text-right font-bold tabular-nums ${bal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(bal)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Tax / Discount breakdown */}
                      {(totals.taxAmount > 0 || (selectedInvoice.discount || 0) > 0) && (
                        <div className="mt-3 space-y-1.5 px-1">
                          {totals.taxAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tax</span>
                              <span className="font-medium tabular-nums">+ {formatCurrency(totals.taxAmount)}</span>
                            </div>
                          )}
                          {(selectedInvoice.discount || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Discount</span>
                              <span className="font-medium text-emerald-600 tabular-nums">− {formatCurrency(selectedInvoice.discount || 0)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="px-6 pb-5">
                    <Button
                      className="w-full h-12 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                      onClick={() => openPaymentModal(selectedInvoice)}
                      disabled={balance <= 0}
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      {balance <= 0 ? 'Fully Paid' : `Collect Payment — ${formatCurrency(balance)}`}
                    </Button>
                  </div>
                </div>
              );
            })() : (
              <div className="flex flex-col items-center justify-center min-h-[360px] bg-card border border-border rounded-2xl text-center p-12">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Receipt className="h-8 w-8 text-muted-foreground opacity-40" />
                </div>
                <p className="text-base font-semibold text-muted-foreground">No invoice selected</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {selectedStudent ? 'Pick an invoice from the list' : 'Search for a student to get started'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Picker Dialog */}
      <Dialog open={showPostSubmitPopover} onOpenChange={setShowPostSubmitPopover}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Payment Submitted</DialogTitle>
            <DialogDescription>
              Payment has been recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPostSubmitPopover(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!createdPaymentId}
              onClick={() => {
                if (!createdPaymentId) return;
                setShowPostSubmitPopover(false);
                router.push(`/app/payments/${createdPaymentId}`);
              }}
            >
              View Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showStudentPicker} onOpenChange={setShowStudentPicker}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle>Find Student</DialogTitle>
            <DialogDescription>Search by name, roll number, or email</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="pl-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'courseId', placeholder: 'Course', options: courses.map(c => ({ value: c._id, label: c.name })), resetKeys: [] },
                { key: 'levelA', placeholder: levelLabels.A, options: studentLevelOptions.levelA.map(v => ({ value: v, label: v })), resetKeys: ['levelB', 'levelC'] },
                { key: 'levelB', placeholder: levelLabels.B, options: studentLevelOptions.levelB.map(v => ({ value: v, label: v })), disabled: !studentFilters.levelA, resetKeys: ['levelC'] },
                { key: 'levelC', placeholder: levelLabels.C, options: studentLevelOptions.levelC.map(v => ({ value: v, label: v })), disabled: !studentFilters.levelB, resetKeys: [] },
              ].map(f => (
                <Select key={f.key} value={studentFilters[f.key] || undefined} disabled={f.disabled}
                  onValueChange={(v) => setStudentFilters(prev => { const n = { ...prev, [f.key]: v === 'all' ? '' : v }; (f.resetKeys || []).forEach(k => { n[k] = ''; }); return n; })}>
                  <SelectTrigger className="rounded-xl text-sm h-9"><SelectValue placeholder={f.placeholder} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {f.placeholder}</SelectItem>
                    {f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ))}
            </div>
            <div className="border border-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              {studentLoading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Searching…</div>
              ) : students.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No students found</div>
              ) : students.map(student => (
                <div key={student._id} onClick={() => handleSelectStudent(student)}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 cursor-pointer border-b border-border last:border-0 transition-colors group">
                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.rollNumber || student.studentId || 'N/A'} · {student.email || 'No email'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {renderPaymentModal()}
    </div>
  );
}