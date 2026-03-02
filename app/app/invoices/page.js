'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCcw,
  Eye,
  MoreHorizontal,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Share2,
  Download,
  Mail,
  XCircle,
  ChevronDown,
  Search,
  ArrowRight,
  ArrowLeft,
  User,
  Calendar,
  LayoutTemplate,
  Receipt,
  FileSpreadsheet,
  GraduationCap,
  Building2,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { getStudentPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const INVOICE_BASE = '/finance/invoices';

const EMPTY_INVOICE = {
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  status: 'draft',
  billTo: {
    name: '',
    address: '',
    email: '',
    phone: '',
  },
  items: [],
  taxCalculationMethod: 'total', // 'product' or 'total'
  taxRate: 0,
  discount: 0,
  paidAmount: 0,
  notes: '',
  terms: '',
  student: '',
  savedContent: '',
  studentImage: '',
};

const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
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

const formatAddressForDisplay = (address) => {
  if (address == null || address === '') return '—';
  if (typeof address === 'string') return address;
  if (typeof address === 'object' && !Array.isArray(address)) {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.pincode,
      address.country,
    ].filter(Boolean);
    return parts.join(', ') || '—';
  }
  return String(address);
};

const DEFAULT_LEVEL_LABELS = { A: 'Level A', B: 'Level B', C: 'Level C' };
const normalizeLevelLabels = (labels) => ({ ...DEFAULT_LEVEL_LABELS, ...(labels || {}) });

const normalizeLevelValues = (levelValues) => {
  const leaf = (v) => {
    if (Array.isArray(v)) return v.map((x) => `${x}`.trim()).filter(Boolean);
    if (v == null) return [];
    const s = `${v}`.trim();
    return s ? [s] : [];
  };
  const nested = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        const parent = `${item?.parent ?? ''}`.trim();
        const values = leaf(item?.values);
        return parent ? { parent, values } : null;
      })
      .filter(Boolean);
  };
  return {
    A: leaf(levelValues?.A),
    B: nested(levelValues?.B),
    C: nested(levelValues?.C),
  };
};

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [courses, setCourses] = useState([]);
  const [savedContents, setSavedContents] = useState([]);
  const [studentSelectModalOpen, setStudentSelectModalOpen] = useState(false);
  const [studentsForPicker, setStudentsForPicker] = useState([]);
  const [studentPickerLoading, setStudentPickerLoading] = useState(false);
  const [studentPickerSearch, setStudentPickerSearch] = useState('');
  const [studentPickerCourseId, setStudentPickerCourseId] = useState('');
  const [studentPickerLevelA, setStudentPickerLevelA] = useState('');
  const [studentPickerLevelB, setStudentPickerLevelB] = useState('');
  const [studentPickerLevelC, setStudentPickerLevelC] = useState('');
  const [levelLabels, setLevelLabels] = useState(DEFAULT_LEVEL_LABELS);
  const [levelValues, setLevelValues] = useState({ A: [], B: [], C: [] });
  const [studentsFilterList, setStudentsFilterList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: formatDateForInput(new Date()),
    paymentMethod: 'bank-transfer',
    reference: '',
    account: '',
    itemPayments: [], // Array of { itemIndex, amount }
    paymentMode: 'full', // 'full' or 'items'
    transactionId: '',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    description: '',
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState(null);
  const [emailTo, setEmailTo] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [recipientManualEntry, setRecipientManualEntry] = useState(false);
  const [recipientTypeChosen, setRecipientTypeChosen] = useState(false);
  const [invoiceFormStep, setInvoiceFormStep] = useState(1);
  const [savedDraftInvoice, setSavedDraftInvoice] = useState(null);
  const [markingAsSent, setMarkingAsSent] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    accountId: '',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [sortBy, setSortBy] = useState('invoiceDate');
  const [sortOrder, setSortOrder] = useState('desc');
 
  const [invoiceForm, setInvoiceForm] = useState(() => ({
    ...EMPTY_INVOICE,
    invoiceDate: formatDateForInput(new Date()),
  }));

  const fetchCourses = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get(`/academic/courses?college=${user.college}`, {}, true);
      const data = response?.data || response || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, [user?.college]);

  const fetchLevelLabels = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get(`/academic/config/${user.college}`);
      const config = response?.data || response || {};
      setLevelLabels(normalizeLevelLabels(config.levelNames));
      setLevelValues(normalizeLevelValues(config.levelValues));
    } catch {
      setLevelLabels(DEFAULT_LEVEL_LABELS);
      setLevelValues({ A: [], B: [], C: [] });
    }
  }, [user?.college]);

  const fetchStudentsForPicker = useCallback(async (page = 1) => {
    if (!user?.college) return;
    try {
      setStudentPickerLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '20');
      params.set('page', String(page));
      if (studentPickerSearch?.trim()) params.set('search', studentPickerSearch.trim());
      if (studentPickerCourseId) params.set('courseId', studentPickerCourseId);
      if (studentPickerLevelA) params.set('levelA', studentPickerLevelA);
      if (studentPickerLevelB) params.set('levelB', studentPickerLevelB);
      if (studentPickerLevelC) params.set('levelC', studentPickerLevelC);
      const response = await api.get(`/students?${params.toString()}`, {}, true);
      const data = response?.data ?? response ?? [];
      setStudentsForPicker(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load students:', err);
      setStudentsForPicker([]);
    } finally {
      setStudentPickerLoading(false);
    }
  }, [user?.college, studentPickerSearch, studentPickerCourseId, studentPickerLevelA, studentPickerLevelB, studentPickerLevelC]);

  const fetchSavedContents = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/finance/saved-invoice-contents', {}, true);
      const data = response?.data || response || [];
      setSavedContents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load saved contents:', err);
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

  const fetchInvoices = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(
        `${INVOICE_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      const list = Array.isArray(data) ? data : [];

      setInvoices(list);
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [
    user?.college,
    filters.status,
    filters.accountId,
    filters.startDate,
    filters.endDate,
  ]);

  useEffect(() => {
    if (!user?.college) return;
    fetchCourses();
    fetchLevelLabels();
    fetchSavedContents();
    fetchAccounts();
  }, [user?.college, fetchCourses, fetchLevelLabels, fetchSavedContents, fetchAccounts]);

  useEffect(() => {
    if (!user?.college) return;
    fetchInvoices();
  }, [user?.college, fetchInvoices]);

  useEffect(() => {
    if (!studentSelectModalOpen) return;
    const t = setTimeout(() => fetchStudentsForPicker(1), studentPickerSearch ? 400 : 0);
    return () => clearTimeout(t);
  }, [studentSelectModalOpen, studentPickerSearch, studentPickerCourseId, studentPickerLevelA, studentPickerLevelB, studentPickerLevelC, fetchStudentsForPicker]);

  const resetForm = useCallback(() => {
    setInvoiceForm({
      ...EMPTY_INVOICE,
      invoiceDate: formatDateForInput(new Date()),
    });
    setEditingInvoice(null);
    setShowForm(false);
    setRecipientManualEntry(false);
    setRecipientTypeChosen(false);
    setInvoiceFormStep(1);
    setSavedDraftInvoice(null);
    setStudentSelectModalOpen(false);
    setStudentPickerSearch('');
    setStudentPickerCourseId('');
    setStudentPickerLevelA('');
    setStudentPickerLevelB('');
    setStudentPickerLevelC('');
    setStudentsForPicker([]);
  }, []);

  const hasRecipient = !!(
    invoiceForm.student ||
    (recipientManualEntry && invoiceForm.billTo?.name?.trim())
  );

  const canGoNext = hasRecipient;

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('billTo.')) {
      const field = name.split('.')[1];
      setInvoiceForm((prev) => ({
        ...prev,
        billTo: {
          ...prev.billTo,
          [field]: value,
        },
      }));
    } else {
      setInvoiceForm((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setInvoiceForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
      // Recalculate amount if quantity or unitPrice changes
      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = Number(newItems[index].quantity || 0);
        const unitPrice = Number(newItems[index].unitPrice || 0);
        newItems[index].amount = quantity * unitPrice;
        
        // Recalculate item tax if using product-level tax
        if (prev.taxCalculationMethod === 'product' && newItems[index].taxRate) {
          const itemAmount = newItems[index].amount;
          const itemTaxRate = Number(newItems[index].taxRate) || 0;
          newItems[index].taxAmount = (itemAmount * itemTaxRate) / 100;
        }
      }
      // Recalculate item taxAmount if taxRate changes (product-level tax)
      if (field === 'taxRate' && prev.taxCalculationMethod === 'product') {
        const itemAmount = Number(newItems[index].amount) || 0;
        const itemTaxRate = Number(value) || 0;
        newItems[index].taxAmount = (itemAmount * itemTaxRate) / 100;
      }
      // Ensure paidAmount doesn't exceed amount
      if (field === 'paidAmount') {
        const paidAmount = Number(value) || 0;
        const itemAmount = Number(newItems[index].amount) || 0;
        newItems[index].paidAmount = Math.min(paidAmount, itemAmount);
      }
      // Recalculate total paidAmount from items
      const totalPaid = newItems.reduce((sum, item) => sum + (Number(item.paidAmount) || 0), 0);
      return { ...prev, items: newItems, paidAmount: totalPaid };
    });
  };

  const addItem = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          taxRate: prev.taxCalculationMethod === 'product' ? (prev.taxRate || 0) : 0,
          taxAmount: 0,
          paidAmount: 0,
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const loadSavedContent = (contentId) => {
    const content = savedContents.find((c) => c._id === contentId);
    if (content) {
      setInvoiceForm((prev) => {
        const taxCalculationMethod = content.taxCalculationMethod || 'total';
        const templateTaxRate = Number(content.taxRate) || 0;
        const items = (content.items || []).map((item) => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          const amount = quantity * unitPrice;
          const itemTaxRate = taxCalculationMethod === 'product' ? (Number(item.taxRate) || 0) : 0;
          const taxAmount = taxCalculationMethod === 'product' ? (amount * itemTaxRate) / 100 : 0;
          return {
            description: item.description || '',
            quantity,
            unitPrice,
            amount,
            taxRate: itemTaxRate,
            taxAmount,
            paidAmount: 0,
          };
        });
        return {
          ...prev,
          items,
          taxCalculationMethod,
          taxRate: templateTaxRate,
          discount: Number(content.discount) || 0,
          savedContent: contentId,
        };
      });
    }
  };

  const handleSelectRecipient = (student) => {
    if (!student) {
      setInvoiceForm((prev) => ({ ...prev, student: '', studentImage: '' }));
      setStudentSelectModalOpen(false);
      return;
    }
    const id = typeof student === 'object' ? student._id : student;
    const s = typeof student === 'object' ? student : null;
    if (!s) {
      setInvoiceForm((prev) => ({ ...prev, student: id, studentImage: '' }));
      setStudentSelectModalOpen(false);
      return;
    }
    const rawAddress = s.address || s.permanentAddress;
    const address = typeof rawAddress === 'object' && rawAddress !== null && !Array.isArray(rawAddress)
      ? formatAddressForDisplay(rawAddress)
      : (rawAddress || '');
    setInvoiceForm((prev) => ({
      ...prev,
      student: id,
      studentImage: s.image || '',
      billTo: {
        name: s.name || prev.billTo.name,
        email: s.email || s.parentEmail || s.guardianEmail || prev.billTo.email,
        phone: s.phone || s.parentPhone || s.guardianPhone || prev.billTo.phone,
        address,
      },
    }));
    setStudentSelectModalOpen(false);
  };

  const studentLevelOptions = useMemo(() => {
    const levelA = levelValues.A || [];
    const levelB = (levelValues.B || [])
      .filter((item) => item.parent === studentPickerLevelA)
      .flatMap((item) => item.values || []);
    const levelC = (levelValues.C || [])
      .filter((item) => item.parent === studentPickerLevelB || item.parent === studentPickerLevelA)
      .flatMap((item) => item.values || []);
    return {
      levelA: [...new Set(levelA)].sort(),
      levelB: [...new Set(levelB)].sort(),
      levelC: [...new Set(levelC)].sort(),
    };
  }, [levelValues, studentPickerLevelA, studentPickerLevelB]);

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (savedDraftInvoice) return;
    setError('');
    setSaving(true);
    try {
    const filteredItems = invoiceForm.items.filter(
      (item) => item.description && item.amount > 0,
    ).map(item => {
      const itemData = {
        ...item,
        paidAmount: item.paidAmount || 0,
      };
      
      // Include tax fields based on tax calculation method
      if (invoiceForm.taxCalculationMethod === 'product') {
        itemData.taxRate = Number(item.taxRate) || 0;
        const itemAmount = item.amount || 0;
        itemData.taxAmount = (itemAmount * itemData.taxRate) / 100;
      } else {
        // For total-level tax, item tax fields should be 0
        itemData.taxRate = 0;
        itemData.taxAmount = 0;
      }
      
      return itemData;
    });

    const isEditing = !!editingInvoice?._id;

    const payload = {
      invoiceNumber: invoiceForm.invoiceNumber.trim(),
      invoiceDate: invoiceForm.invoiceDate || undefined,
      dueDate: invoiceForm.dueDate || undefined,
      status: isEditing ? invoiceForm.status : 'draft',
      billTo: invoiceForm.billTo,
      items: filteredItems,
      taxCalculationMethod: invoiceForm.taxCalculationMethod || 'total',
      taxRate: Number(invoiceForm.taxRate) || 0,
      discount: Number(invoiceForm.discount) || 0,
      paidAmount: filteredItems.reduce((sum, item) => sum + (Number(item.paidAmount) || 0), 0),
      notes: invoiceForm.notes.trim() || undefined,
      terms: invoiceForm.terms.trim() || undefined,
      student: invoiceForm.student || undefined,
      savedContent: invoiceForm.savedContent || undefined,
    };

      if (isEditing && editingInvoice?._id) {
        await api.put(
          `${INVOICE_BASE}/${editingInvoice._id}`,
          payload,
          {},
          true,
        );
        showSuccess('Invoice updated successfully.');
      } else {
        const response = await api.post(`${INVOICE_BASE}`, payload, {}, true);
        const created = response?.data || response || {};
        const createdId = created._id || created.id;
        showSuccess('Invoice saved as draft.');
        if (createdId) {
          setSavedDraftInvoice({
            _id: createdId,
            invoiceNumber: payload.invoiceNumber || created.invoiceNumber,
            billTo: payload.billTo || created.billTo,
            status: 'draft',
            ...created,
          });
          setInvoiceFormStep(3);
          await fetchInvoices();
          return;
        }
      }
      resetForm();
      await fetchInvoices();
    } catch (err) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    const hasStudent = !!(invoice.student?._id || invoice.student);
    setRecipientManualEntry(!hasStudent);
    setInvoiceFormStep(2);
    const rawBillTo = invoice.billTo || { name: '', address: '', email: '', phone: '' };
    const billToAddress = rawBillTo.address;
    const normalizedAddress = typeof billToAddress === 'object' && billToAddress !== null && !Array.isArray(billToAddress)
      ? formatAddressForDisplay(billToAddress)
      : (billToAddress ?? '');
    setInvoiceForm({
      invoiceNumber: invoice.invoiceNumber || '',
      invoiceDate: formatDateForInput(invoice.invoiceDate),
      dueDate: formatDateForInput(invoice.dueDate),
      status: invoice.status || 'draft',
      billTo: {
        name: rawBillTo.name ?? '',
        email: rawBillTo.email ?? '',
        phone: rawBillTo.phone ?? '',
        address: normalizedAddress,
      },
      items: (invoice.items || []).map(item => ({
        ...item,
        taxRate: item.taxRate || 0,
        taxAmount: item.taxAmount || 0,
        paidAmount: item.paidAmount || 0,
      })),
      taxCalculationMethod: invoice.taxCalculationMethod || 'total',
      taxRate: invoice.taxRate || 0,
      discount: invoice.discount || 0,
      paidAmount: invoice.paidAmount || 0,
      notes: invoice.notes || '',
      terms: invoice.terms || '',
      student: invoice.student?._id || invoice.student || '',
      savedContent: invoice.savedContent?._id || invoice.savedContent || '',
      studentImage: (invoice.student && invoice.student.image) || '',
    });
    setShowForm(true);
  };

  const handleViewInvoice = (invoiceId) => {
    router.push(`/app/invoices/${invoiceId}`);
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!invoice?._id) return;
    if (invoice.status === 'paid') {
      setError('Paid invoices cannot be deleted.');
      return;
    }
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Delete this invoice?')
        : true;
    if (!confirmed) return;
    try {
      setDeletingId(invoice._id);
      setError('');
      await api.delete(`${INVOICE_BASE}/${invoice._id}`, {}, true);
      showSuccess('Invoice deleted.');
      await fetchInvoices();
    } catch (err) {
      setError(err.message || 'Failed to delete invoice');
    } finally {
      setDeletingId('');
    }
  };

  const handleCancelInvoice = async (invoice) => {
    if (!invoice?._id || invoice.status === 'paid') return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Mark this invoice as cancelled?')
        : true;
    if (!confirmed) return;
    try {
      setCancellingId(invoice._id);
      setError('');
      const response = await api.get(`${INVOICE_BASE}/${invoice._id}`, {}, true);
      const full = response?.data || response;
      const payload = {
        invoiceNumber: full.invoiceNumber,
        invoiceDate: full.invoiceDate,
        dueDate: full.dueDate,
        status: 'cancelled',
        billTo: full.billTo || {},
        items: full.items || [],
        taxRate: full.taxRate ?? 0,
        discount: full.discount ?? 0,
        paidAmount: full.paidAmount ?? 0,
        notes: full.notes,
        terms: full.terms,
        student: full.student?._id || full.student || undefined,
        savedContent: full.savedContent?._id || full.savedContent || undefined,
      };
      await api.put(`${INVOICE_BASE}/${invoice._id}`, payload, {}, true);
      showSuccess('Invoice cancelled.');
      await fetchInvoices();
    } catch (err) {
      setError(err.message || 'Failed to cancel invoice');
    } finally {
      setCancellingId('');
    }
  };

  const getInvoiceViewUrl = (id, searchParams = {}) => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}/app/invoices/${id}`;
    if (Object.keys(searchParams).length === 0) return base;
    const qs = new URLSearchParams(searchParams).toString();
    return `${base}?${qs}`;
  };

  const handleShareInvoice = async (invoice) => {
    const url = getInvoiceViewUrl(invoice._id);
    try {
      await navigator.clipboard.writeText(url);
      showSuccess('Invoice link copied to clipboard.');
    } catch {
      setError('Could not copy link.');
    }
  };

  const handleDownloadInvoice = (invoice, options = {}) => {
    const url = options.autoDownload
      ? getInvoiceViewUrl(invoice._id, { download: '1' })
      : getInvoiceViewUrl(invoice._id);
    window.open(url, '_blank');
  };

  const openEmailDialog = useCallback((inv) => {
    setEmailInvoice(inv);
    setEmailTo(inv?.billTo?.email || '');
    setShowEmailDialog(true);
    setError('');
  }, []);

  const handleMarkAsSentInModal = useCallback(async () => {
    if (!savedDraftInvoice?._id || savedDraftInvoice.status === 'sent') return;
    try {
      setMarkingAsSent(true);
      setError('');
      const response = await api.get(`${INVOICE_BASE}/${savedDraftInvoice._id}`, {}, true);
      const full = response?.data || response;
      const payload = {
        invoiceNumber: full.invoiceNumber,
        invoiceDate: full.invoiceDate,
        dueDate: full.dueDate,
        status: 'sent',
        billTo: full.billTo || {},
        items: full.items || [],
        taxRate: full.taxRate ?? 0,
        discount: full.discount ?? 0,
        paidAmount: full.paidAmount ?? 0,
        notes: full.notes,
        terms: full.terms,
        student: full.student?._id || full.student || undefined,
        savedContent: full.savedContent?._id || full.savedContent || undefined,
      };
      await api.put(`${INVOICE_BASE}/${savedDraftInvoice._id}`, payload, {}, true);
      setSavedDraftInvoice((prev) => (prev ? { ...prev, status: 'sent' } : null));
      showSuccess('Invoice marked as Sent.');
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setMarkingAsSent(false);
    }
  }, [savedDraftInvoice]);

  const handleDownloadFromActions = useCallback(async () => {
    if (!savedDraftInvoice?._id) return;
    if (savedDraftInvoice.status === 'draft') {
      await handleMarkAsSentInModal();
    }
    handleDownloadInvoice(savedDraftInvoice, { autoDownload: true });
  }, [savedDraftInvoice, handleMarkAsSentInModal]);

  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!emailInvoice?._id || !emailTo?.trim()) return;
    const url = getInvoiceViewUrl(emailInvoice._id);
    const subject = encodeURIComponent(`Invoice ${emailInvoice.invoiceNumber || emailInvoice._id}`);
    const body = encodeURIComponent(`Please view your invoice: ${url}`);
    window.location.href = `mailto:${emailTo.trim()}?subject=${subject}&body=${body}`;
    setShowEmailDialog(false);
    setEmailInvoice(null);
    setEmailTo('');
    showSuccess('Email client opened.');
  };

  // Calculate invoice totals including taxes
  const calculateInvoiceTotals = useCallback((inv) => {
    if (!inv) return { subtotal: 0, taxAmount: 0, totalAmount: 0, balanceAmount: 0 };
    
    const subtotal = inv.subtotal || (inv.items || []).reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    
    let taxAmount = 0;
    const taxCalculationMethod = inv.taxCalculationMethod || 'total';
    
    if (taxCalculationMethod === 'product') {
      // Product-level tax: sum of all item taxAmounts
      taxAmount = (inv.items || []).reduce(
        (sum, item) => sum + (Number(item.taxAmount) || 0),
        0
      );
    } else {
      // Total-level tax: calculate tax on subtotal
      const taxRate = inv.taxRate || 0;
      taxAmount = (subtotal * taxRate) / 100;
    }
    
    const discount = inv.discount || 0;
    const totalAmount = subtotal + taxAmount - discount;
    const paidAmount = inv.paidAmount || 0;
    const balanceAmount = totalAmount - paidAmount;
    
    return { subtotal, taxAmount, totalAmount, balanceAmount, taxCalculationMethod };
  }, []);

  // Total amount per product including tax (for payments)
  const getItemTotalWithTax = useCallback((inv, item, subtotal, taxAmount) => {
    if (!inv || !item) return 0;
    const amount = Number(item.amount) || 0;
    const method = inv.taxCalculationMethod || 'total';
    if (method === 'product') {
      const itemTax = Number(item.taxAmount) || 0;
      return amount + itemTax;
    }
    // Total-level tax: allocate tax proportionally to this item
    const invSubtotal = subtotal || (inv.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    if (!invSubtotal || invSubtotal <= 0) return amount;
    const itemShareOfTax = (amount / invSubtotal) * (taxAmount || 0);
    return amount + itemShareOfTax;
  }, []);

  // Item balance for payment (product total including tax minus paid)
  const getItemBalanceForPayment = useCallback((inv, item, itemIndex, subtotal, taxAmount) => {
    if (!inv || !item) return 0;
    const totalWithTax = getItemTotalWithTax(inv, item, subtotal, taxAmount);
    const paid = Number(item.paidAmount) || 0;
    return Math.max(0, totalWithTax - paid);
  }, [getItemTotalWithTax]);

  const openPaymentDialog = useCallback(async (invoice) => {
    setPaymentInvoice(invoice);
    
    // Fetch full invoice details if needed
    let fullInvoice = invoice;
    if (!invoice.items || invoice.items.length === 0) {
      try {
        const response = await api.get(`${INVOICE_BASE}/${invoice._id}`, {}, true);
        fullInvoice = response?.data || response;
      } catch (err) {
        console.error('Failed to load invoice details:', err);
      }
    }
    
    // Recalculate totals including taxes to ensure accuracy
    const calculatedTotals = calculateInvoiceTotals(fullInvoice);
    const balance = calculatedTotals.balanceAmount;
    
    setPaymentForm({
      amount: balance > 0 ? String(balance) : '',
      paymentDate: formatDateForInput(new Date()),
      paymentMethod: 'bank-transfer',
      reference: '',
      account: fullInvoice.account?._id || fullInvoice.account || '',
      itemPayments: [],
      paymentMode: 'full',
      transactionId: '',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      description: '',
    });
    setPaymentInvoice(fullInvoice);
    setShowPaymentDialog(true);
    setError('');
  }, [calculateInvoiceTotals]);

  const closePaymentDialog = useCallback(() => {
    setShowPaymentDialog(false);
    setPaymentInvoice(null);
    setPaymentForm({
      amount: '',
      paymentDate: formatDateForInput(new Date()),
      paymentMethod: 'bank-transfer',
      reference: '',
      account: '',
      itemPayments: [],
      paymentMode: 'full',
      transactionId: '',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      description: '',
    });
  }, []);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentInvoice?._id) return;
    
    setError('');
    setProcessingPayment(true);
    try {
      // If payment mode is 'items', use payInvoiceItems endpoint
      if (paymentForm.paymentMode === 'items' && paymentForm.itemPayments.length > 0) {
        const itemPayments = paymentForm.itemPayments
          .filter(ip => ip.amount > 0)
          .map(ip => ({
            itemIndex: ip.itemIndex,
            amount: Number(ip.amount),
          }));
        
        if (itemPayments.length === 0) {
          setError('Please specify payment amounts for at least one item.');
          setProcessingPayment(false);
          return;
        }

        await api.post(
          `${INVOICE_BASE}/${paymentInvoice._id}/pay-items`,
          { itemPayments },
          {},
          true
        );
        showSuccess('Item-level payment recorded successfully.');
      } else {
        // Full payment mode - create a payment record
        const amount = Number(paymentForm.amount);
        if (!amount || amount <= 0) {
          setError('Please enter a valid payment amount.');
          setProcessingPayment(false);
          return;
        }

        if (!paymentForm.account) {
          setError('Please select an account.');
          setProcessingPayment(false);
          return;
        }

        const paymentPayload = {
          invoice: paymentInvoice._id,
          amount,
          paymentDate: paymentForm.paymentDate,
          paymentMethod: paymentForm.paymentMethod,
          account: paymentForm.account,
          status: 'completed',
          referenceNumber: paymentForm.reference || undefined,
          transactionId: paymentForm.transactionId || undefined,
          chequeNumber: paymentForm.chequeNumber || undefined,
          chequeDate: paymentForm.chequeDate || undefined,
          bankName: paymentForm.bankName || undefined,
          description: paymentForm.description || undefined,
          student: paymentInvoice.student?._id || paymentInvoice.student || undefined,
        };

        // If item payments are specified, include them
        if (paymentForm.itemPayments && paymentForm.itemPayments.length > 0) {
          const itemPayments = paymentForm.itemPayments
            .filter(ip => ip.amount > 0)
            .map(ip => ({
              itemIndex: ip.itemIndex,
              amount: Number(ip.amount),
            }));
          if (itemPayments.length > 0) {
            paymentPayload.itemPayments = itemPayments;
          }
        }

        await api.post('/finance/payments', paymentPayload, {}, true);
        showSuccess('Payment recorded successfully.');
      }
      
      closePaymentDialog();
      await fetchInvoices();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const isOverdue = useCallback((inv) => {
    if (!inv?.dueDate || inv.status === 'paid' || inv.status === 'cancelled') return false;
    try {
      return new Date(inv.dueDate) < new Date(new Date().toDateString());
    } catch {
      return false;
    }
  }, []);

  const displayStatus = useCallback((inv) => {
    if (isOverdue(inv)) return 'overdue';
    return inv?.status || '';
  }, [isOverdue]);

  const invoiceStats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter((i) => i.status === 'paid').length;
    const totalOutstanding = invoices.reduce((sum, i) => {
      if (i.status === 'paid' || i.status === 'cancelled') return sum;
      const bal = Number(i.balanceAmount) ?? (Number(i.totalAmount) - (Number(i.paidAmount) || 0));
      return sum + Math.max(0, bal);
    }, 0);
    const overdue = invoices.filter((i) => isOverdue(i)).length;
    return { total, paid, totalOutstanding, overdue };
  }, [invoices, isOverdue]);

  const calculateTotals = useMemo(() => {
    const subtotal = invoiceForm.items.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );
    
    let taxAmount = 0;
    if (invoiceForm.taxCalculationMethod === 'product') {
      // Product-level tax: sum of all item taxAmounts
      taxAmount = invoiceForm.items.reduce(
        (sum, item) => {
          const itemAmount = item.amount || 0;
          const itemTaxRate = item.taxRate || 0;
          const itemTax = (itemAmount * itemTaxRate) / 100;
          return sum + itemTax;
        },
        0,
      );
    } else {
      // Total-level tax: calculate tax on subtotal
      const taxRate = Number(invoiceForm.taxRate) || 0;
      taxAmount = (subtotal * taxRate) / 100;
    }
    
    const discount = Number(invoiceForm.discount) || 0;
    const totalAmount = subtotal + taxAmount - discount;
    const balanceAmount = totalAmount - (Number(invoiceForm.paidAmount) || 0);

    return {
      subtotal,
      taxAmount,
      discount,
      totalAmount,
      balanceAmount,
    };
  }, [invoiceForm.items, invoiceForm.taxRate, invoiceForm.taxCalculationMethod, invoiceForm.discount, invoiceForm.paidAmount]);

  // Define columns for Invoices DataTable
  const invoiceColumns = useMemo(() => [
    {
      id: 'invoiceNumber',
      accessorKey: 'invoiceNumber',
      header: 'Invoice Number',
      type: 'text',
      searchable: true,
    },
    {
      id: 'invoiceDate',
      accessorKey: 'invoiceDate',
      header: 'Invoice Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: 'Due Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: INVOICE_STATUSES,
      cell: ({ row }) => {
        const status = displayStatus(row);
        return (
          <span
            className={`text-xs px-2 py-1 rounded capitalize ${
              status === 'paid'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : status === 'overdue'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : status === 'cancelled'
                ? 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                : status === 'sent'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      id: 'student',
      accessorKey: 'student',
      header: 'Student',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.student) return row.billTo?.name || '-';
        const student = typeof row.student === 'object' ? row.student : null;
        return student ? `${student.name}${student.studentId ? ` (${student.studentId})` : ''}` : (row.billTo?.name || '-');
      },
    },
    {
      id: 'totalAmount',
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      type: 'currency',
      formatOptions: {
        locale: 'en-IN',
        currency: 'INR',
      },
      searchable: false,
    },
    {
      id: 'paidAmount',
      accessorKey: 'paidAmount',
      header: 'Paid Amount',
      type: 'currency',
      formatOptions: {
        locale: 'en-IN',
        currency: 'INR',
      },
      searchable: false,
    },
    {
      id: 'balanceAmount',
      accessorKey: 'balanceAmount',
      header: 'Balance',
      type: 'currency',
      formatOptions: {
        locale: 'en-IN',
        currency: 'INR',
      },
      searchable: false,
      cell: ({ row }) => {
        const balance = row.balanceAmount || 0;
        const items = row.items || [];
        const hasPartialPayments = items.some(item => {
          const itemPaid = item.paidAmount || 0;
          const itemAmount = item.amount || 0;
          return itemPaid > 0 && itemPaid < itemAmount;
        });
        return (
          <div className="flex flex-col">
            <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
              {formatCurrency(balance)}
            </span>
            {hasPartialPayments && (
              <span className="text-xs text-yellow-600 mt-0.5">Partial payments</span>
            )}
          </div>
        );
      },
    },
  ], [displayStatus]);

  const rowBalance = useCallback((row) => row.balanceAmount ?? (row.totalAmount - (row.paidAmount || 0)), []);

  const invoiceActions = useCallback((row) => {
    const balance = rowBalance(row);
    const canPay = balance > 0 && row.status !== 'cancelled';
    const canCancel = row.status !== 'paid' && row.status !== 'cancelled';
    const isDraft = row.status === 'draft';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => handleViewInvoice(row._id)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </DropdownMenuItem>
          {isDraft && (
            <DropdownMenuItem onClick={() => handleEditInvoice(row)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {canPay && (
            <>
              <DropdownMenuItem onClick={() => router.push(`/app/invoices/payments?invoiceId=${row._id}`)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment (Full Page)
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={() => handleShareInvoice(row)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownloadInvoice(row)}>
            <Download className="h-4 w-4 mr-2" />
            Download / Print
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEmailDialog(row)}>
            <Mail className="h-4 w-4 mr-2" />
            Send via email
          </DropdownMenuItem>
          {canCancel && (
            <DropdownMenuItem
              onClick={() => handleCancelInvoice(row)}
              disabled={cancellingId === row._id}
              className="text-amber-600 dark:text-amber-400 focus:text-amber-600"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {cancellingId === row._id ? 'Cancelling...' : 'Cancel invoice'}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {isDraft && (
            <DropdownMenuItem
              onClick={() => handleDeleteInvoice(row)}
              disabled={deletingId === row._id}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deletingId === row._id ? 'Deleting...' : 'Delete'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, [deletingId, cancellingId, openPaymentDialog, openEmailDialog, rowBalance]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Invoices</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage invoices, create new invoices, and track payments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              try {
                await Promise.all([
                  fetchInvoices(),
                  fetchCourses(),
                  fetchLevelLabels(),
                  fetchSavedContents(),
                ]);
                showSuccess('Data refreshed.');
              } catch {
                // error already handled
              } finally {
                setLoading(false);
              }
            }}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/app/invoices/payments')}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">
            {success}
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-semibold">{invoiceStats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-semibold">{invoiceStats.paid}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-semibold">{formatCurrency(invoiceStats.totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-semibold">{invoiceStats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Server-side Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Filters</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              {INVOICE_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">From date</label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">To date</label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={fetchInvoices}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilters({
                  search: '',
                  status: '',
                  accountId: '',
                  startDate: '',
                  endDate: '',
                });
                setTimeout(() => fetchInvoices(), 0);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className={`flex flex-col p-0 gap-0 ${invoiceFormStep === 2 && !editingInvoice ? 'max-w-5xl' : 'max-w-4xl'} max-h-[90vh]`}>
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    {invoiceFormStep === 3 ? 'Invoice saved' : editingInvoice ? 'Edit Invoice' : invoiceFormStep === 1 ? 'New Invoice' : 'Invoice Details'}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5">
                    {invoiceFormStep === 1
                      ? 'Select who this invoice is for'
                      : invoiceFormStep === 3
                      ? 'Mark as sent, download, or send via email'
                      : editingInvoice ? 'Update details and line items' : 'Add dates, line items, and totals'}
                  </DialogDescription>
                </div>
              </div>
              {/* Step indicator */}
              <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 shrink-0">
                <div className={`flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ${invoiceFormStep === 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/20">1</span>
                  <span className="hidden sm:inline">Recipient</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className={`flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ${invoiceFormStep === 2 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/20">2</span>
                  <span className="hidden sm:inline">Details</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className={`flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ${invoiceFormStep === 3 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/20">3</span>
                  <span className="hidden sm:inline">Actions</span>
                </div>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSaveInvoice} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {invoiceFormStep === 3 && savedDraftInvoice ? (
            /* Step 3: Post-save actions – boxed cards with icons */
            <section className="max-w-2xl">
              {/* Success strip */}
              <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 mb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Invoice saved as draft</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {savedDraftInvoice.invoiceNumber || savedDraftInvoice._id}
                    {savedDraftInvoice.billTo?.name && ` · ${savedDraftInvoice.billTo.name}`}
                    {savedDraftInvoice.status === 'sent' && (
                      <span className="ml-1.5 text-blue-600 dark:text-blue-400 font-medium">· Sent</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action boxes */}
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">What would you like to do?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {savedDraftInvoice.status === 'draft' && (
                  <button
                    type="button"
                    onClick={handleMarkAsSentInModal}
                    disabled={markingAsSent}
                    className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:bg-muted/40 disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Send className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Mark as Sent</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Update status to sent</p>
                    </div>
                    {markingAsSent && <span className="text-xs text-muted-foreground">Marking...</span>}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadFromActions}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Download className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Download / Print</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Open in new tab</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openEmailDialog(savedDraftInvoice)}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-card p-5 text-center transition-all hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Send via email</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Open email client</p>
                  </div>
                </button>
              </div>
            </section>
          ) : invoiceFormStep === 1 ? (
            /* Step 1: Choose recipient – two options then show form */
            <section className="max-w-2xl">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold">Bill To</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Who is this invoice for?
                </p>

                {/* Two choice boxes in a row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientManualEntry(false);
                      setRecipientTypeChosen(true);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-5 transition-all min-h-[100px] text-left w-full ${
                      recipientTypeChosen && !recipientManualEntry
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <GraduationCap className={`h-8 w-8 shrink-0 ${recipientTypeChosen && !recipientManualEntry ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">Student</span>
                    <span className="text-xs text-muted-foreground text-center">From your records</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientManualEntry(true);
                      setRecipientTypeChosen(true);
                      setInvoiceForm((prev) => ({ ...prev, student: '' }));
                    }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-5 transition-all min-h-[100px] text-left w-full ${
                      recipientTypeChosen && recipientManualEntry
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <Building2 className={`h-8 w-8 shrink-0 ${recipientTypeChosen && recipientManualEntry ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">Non-student</span>
                    <span className="text-xs text-muted-foreground text-center">Enter details manually</span>
                  </button>
                </div>

                {/* Show student picker or manual form after a choice is made */}
                {recipientTypeChosen && !recipientManualEntry && (
                  <div className="pt-2 border-t border-border">
                    <label className="block text-sm font-medium mb-2">Select student</label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-11 text-left font-normal"
                      onClick={() => setStudentSelectModalOpen(true)}
                    >
                      <span className="truncate flex items-center gap-2">
                        {invoiceForm.student ? (
                          <>
                            <User className="h-4 w-4 shrink-0 text-primary" />
                            <span className="font-medium">{invoiceForm.billTo?.name || 'Student selected'}</span>
                            {invoiceForm.billTo?.email && (
                              <span className="text-muted-foreground hidden sm:inline">— {invoiceForm.billTo.email}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Search and select a student</span>
                        )}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </div>
                )}
                {recipientTypeChosen && recipientManualEntry && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1.5">Name *</label>
                      <Input
                        name="billTo.name"
                        value={invoiceForm.billTo.name}
                        onChange={handleFormChange}
                        placeholder="Recipient or company name"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Email</label>
                      <Input
                        name="billTo.email"
                        type="email"
                        value={invoiceForm.billTo.email}
                        onChange={handleFormChange}
                        placeholder="email@example.com"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Phone</label>
                      <Input
                        name="billTo.phone"
                        value={invoiceForm.billTo.phone}
                        onChange={handleFormChange}
                        placeholder="Phone number"
                        className="h-10"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1.5">Address</label>
                      <textarea
                        name="billTo.address"
                        value={invoiceForm.billTo.address}
                        onChange={handleFormChange}
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                        placeholder="Street, city, state, pincode"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          ) : (
            /* Step 2: Selected recipient summary + Details, Items, Totals, Notes */
            <>
            {/* Recipient summary */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden">
                    {invoiceForm.student && invoiceForm.studentImage ? (
                      <img
                        src={getStudentPhotoUrl(invoiceForm.studentImage)}
                        alt={invoiceForm.billTo?.name || 'Student'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {(invoiceForm.billTo?.name || '—')
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm min-w-0">
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <p className="font-medium truncate">{invoiceForm.billTo?.name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="truncate">{invoiceForm.billTo?.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone</span>
                      <p>{invoiceForm.billTo?.phone || '—'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Address</span>
                      <p className="whitespace-pre-wrap text-muted-foreground">{formatAddressForDisplay(invoiceForm.billTo?.address) || '—'}</p>
                    </div>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => { setRecipientTypeChosen(true); setInvoiceFormStep(1); }} className="shrink-0">
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Change
                </Button>
              </div>
            </section>

            {/* Invoice details: dates + template */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold">Invoice Details</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Invoice Date *</label>
                  <Input
                    name="invoiceDate"
                    type="date"
                    value={invoiceForm.invoiceDate}
                    onChange={handleFormChange}
                    required
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Due Date</label>
                  <Input
                    name="dueDate"
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={handleFormChange}
                    className="h-10"
                  />
                </div>
                {savedContents.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">
                      <LayoutTemplate className="h-4 w-4 inline mr-1.5 align-middle" />
                      Load template
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          loadSavedContent(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Items and calculations only...</option>
                      {savedContents.map((content) => (
                        <option key={content._id} value={content._id}>
                          {content.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Recipient and notes stay unchanged.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Line items */}
            <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold">Line Items</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="p-4 space-y-3">
              {invoiceForm.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-end p-3 border border-border rounded-lg bg-background/50"
                >
                  <div className={invoiceForm.taxCalculationMethod === 'product' ? 'col-span-4' : 'col-span-5'}>
                    <label className="block text-xs font-medium mb-1">
                      Description
                    </label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, 'description', e.target.value)
                      }
                      placeholder="Item description"
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">
                      Qty
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          'quantity',
                          Number(e.target.value),
                        )
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">
                      Unit Price
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          'unitPrice',
                          Number(e.target.value),
                        )
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">
                      Amount
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount || 0}
                      readOnly
                      className="h-9 bg-muted"
                    />
                  </div>
                  {invoiceForm.taxCalculationMethod === 'product' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">
                        Tax %
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max="100"
                        value={item.taxRate || 0}
                        onChange={(e) =>
                          handleItemChange(index, 'taxRate', Number(e.target.value))
                        }
                        placeholder="0.00"
                        className="h-9"
                      />
                    </div>
                  )}
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {invoiceForm.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border bg-muted/20">
                  <Receipt className="h-10 w-10 text-muted-foreground mb-2 opacity-60" />
                  <p className="text-sm font-medium text-muted-foreground">No line items yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add at least one item to create the invoice.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              )}
              </div>
            </section>

            {/* Tax & Totals */}
            <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold">Tax & Totals</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left: Tax options */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Tax Calculation Method</label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="taxCalculationMethod"
                            value="total"
                            checked={invoiceForm.taxCalculationMethod === 'total'}
                            onChange={(e) => {
                              setInvoiceForm((prev) => ({
                                ...prev,
                                taxCalculationMethod: e.target.value,
                                items: prev.items.map(item => ({ ...item, taxRate: 0, taxAmount: 0 })),
                              }));
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Total-Level Tax</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="taxCalculationMethod"
                            value="product"
                            checked={invoiceForm.taxCalculationMethod === 'product'}
                            onChange={(e) => {
                              setInvoiceForm((prev) => ({
                                ...prev,
                                taxCalculationMethod: e.target.value,
                                items: prev.items.map(item => ({
                                  ...item,
                                  taxRate: item.taxRate || prev.taxRate || 0,
                                  taxAmount: item.amount ? ((item.amount * (item.taxRate || prev.taxRate || 0)) / 100) : 0,
                                })),
                              }));
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Product-Level Tax</span>
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {invoiceForm.taxCalculationMethod === 'total' ? 'Tax on total subtotal' : 'Tax per line item'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {invoiceForm.taxCalculationMethod === 'total' && (
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Tax Rate (%)</label>
                          <Input
                            name="taxRate"
                            type="number"
                            min="0"
                            step="0.01"
                            max="100"
                            value={invoiceForm.taxRate}
                            onChange={handleFormChange}
                            className="h-10"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Discount (₹)</label>
                        <Input
                          name="discount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={invoiceForm.discount}
                          onChange={handleFormChange}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Paid (₹)</label>
                        <Input
                          name="paidAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={invoiceForm.paidAmount}
                          onChange={handleFormChange}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Right: Summary */}
                  <div className="lg:col-span-3 flex flex-col items-end">
            <div className="p-4 rounded-lg border border-border bg-muted/30 w-full min-w-[240px] max-w-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Summary</p>
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateTotals.subtotal)}</span>
              </div>
              {invoiceForm.taxCalculationMethod === 'product' ? (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Tax (Product-Level):</span>
                    <span>{formatCurrency(calculateTotals.taxAmount)}</span>
                  </div>
                  {invoiceForm.items.some(item => item.taxRate > 0) && (
                    <div className="text-xs text-muted-foreground mb-2 pl-2 border-l-2 border-border">
                      {invoiceForm.items
                        .filter(item => item.taxRate > 0)
                        .map((item, idx) => (
                          <div key={idx} className="flex justify-between mb-1">
                            <span>{item.description || `Item ${idx + 1}`}:</span>
                            <span>{item.taxRate}% = {formatCurrency(item.taxAmount || 0)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between text-sm mb-1">
                  <span>Tax ({invoiceForm.taxRate || 0}%):</span>
                  <span>{formatCurrency(calculateTotals.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mb-1">
                <span>Discount:</span>
                <span>{formatCurrency(calculateTotals.discount)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t border-border">
                <span>Total Amount:</span>
                <span>{formatCurrency(calculateTotals.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>Balance:</span>
                <span
                  className={
                    calculateTotals.balanceAmount > 0
                      ? 'text-red-600 font-medium'
                      : 'text-green-600 font-medium'
                  }
                >
                  {formatCurrency(calculateTotals.balanceAmount)}
                </span>
              </div>
            </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Notes & Terms */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold">Notes & Terms</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Notes</label>
                  <textarea
                    name="notes"
                    value={invoiceForm.notes}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Additional notes for the invoice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Terms & Conditions</label>
                  <textarea
                    name="terms"
                    value={invoiceForm.terms}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Payment terms and conditions"
                  />
                </div>
              </div>
            </section>

            </>
          )}

            </div>
            <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex-shrink-0 gap-3">
              {invoiceFormStep === 3 ? (
                <Button type="button" onClick={resetForm} className="ml-auto">
                  Done
                </Button>
              ) : invoiceFormStep === 1 ? (
                <>
                  <Button type="button" variant="outline" onClick={resetForm} className="order-2 sm:order-1">
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => setInvoiceFormStep(2)} disabled={!canGoNext} className="order-1 sm:order-2">
                    Continue to Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setInvoiceFormStep(1)} className="sm:mr-auto">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Select Student Modal */}
      <Dialog
        open={studentSelectModalOpen}
        onOpenChange={(open) => {
          setStudentSelectModalOpen(open);
          if (!open) {
            setStudentPickerSearch('');
            setStudentPickerCourseId('');
            setStudentPickerLevelA('');
            setStudentPickerLevelB('');
            setStudentPickerLevelC('');
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5" />
              Select student
            </DialogTitle>
            <DialogDescription>
              Search by name, ID or roll number, or filter by course and level to find a student. Click a row to select.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 flex-shrink-0">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name, Student ID, Phone..."
                    value={studentPickerSearch}
                    onChange={(e) => setStudentPickerSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Course</label>
                <select
                  value={studentPickerCourseId}
                  onChange={(e) => {
                    setStudentPickerCourseId(e.target.value);
                    setStudentPickerLevelA('');
                    setStudentPickerLevelB('');
                    setStudentPickerLevelC('');
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  {courses.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}{c.batch ? ` (${c.batch})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{levelLabels.A}</label>
                <select
                  value={studentPickerLevelA}
                  onChange={(e) => {
                    setStudentPickerLevelA(e.target.value);
                    setStudentPickerLevelB('');
                    setStudentPickerLevelC('');
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  {studentLevelOptions.levelA.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{levelLabels.B}</label>
                <select
                  value={studentPickerLevelB}
                  onChange={(e) => {
                    setStudentPickerLevelB(e.target.value);
                    setStudentPickerLevelC('');
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  {studentLevelOptions.levelB.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{levelLabels.C}</label>
                <select
                  value={studentPickerLevelC}
                  onChange={(e) => setStudentPickerLevelC(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  {studentLevelOptions.levelC.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-auto rounded-md border border-border">
              {studentPickerLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <RefreshCcw className="h-8 w-8 animate-spin mr-2" />
                  Loading students...
                </div>
              ) : studentsForPicker.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center px-4">
                  <Search className="h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">No students found</p>
                  <p className="text-sm mt-1">Try a different search or adjust filters to load students.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">Student</TableHead>
                      <TableHead className="font-semibold">Batch</TableHead>
                      <TableHead className="font-semibold">{levelLabels.A}</TableHead>
                      <TableHead className="font-semibold">{levelLabels.B}</TableHead>
                      <TableHead className="font-semibold">{levelLabels.C}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForPicker.map((student) => {
                      const course = typeof student.course === 'object' ? student.course : null;
                      return (
                        <TableRow
                          key={student._id}
                          className="cursor-pointer hover:bg-accent/50 focus:bg-accent/50"
                          onClick={() => handleSelectRecipient(student)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                {student.image ? (
                                  <img
                                    src={getStudentPhotoUrl(student.image)}
                                    alt={student.name || 'Student'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  ((student.name || '—')
                                    .split(' ')
                                    .map((part) => part[0])
                                    .join('')
                                    .slice(0, 2) || 'ST'
                                  ).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span>{student.name || '—'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {student.studentId || '—'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{course ? `${course.name}` : '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{course?.levelA || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{course?.levelB || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{course?.levelC || '—'}</TableCell>
                          
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => setStudentSelectModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice List - DataTable */}
      <div className="bg-card border border-border rounded-lg p-4">
        <DataTable
          data={invoices}
          columns={invoiceColumns}
          actions={invoiceActions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="invoices-table"
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No invoices found"
          // onRowClick={(row) => router.push(`/app/invoices/${row._id}`)}
        />
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => { if (!open) closePaymentDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              {paymentInvoice && (
                <span>
                  Invoice <strong>{paymentInvoice.invoiceNumber}</strong>
                  {paymentInvoice.billTo?.name && ` · ${paymentInvoice.billTo.name}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {paymentInvoice && (() => {
            // Calculate totals including taxes
            const calculatedTotals = calculateInvoiceTotals(paymentInvoice);
            const invoiceBalance = calculatedTotals.balanceAmount;
            const invoiceTotalAmount = calculatedTotals.totalAmount;
            const invoiceTaxAmount = calculatedTotals.taxAmount;
            const invoiceSubtotal = calculatedTotals.subtotal;
            const taxCalculationMethod = calculatedTotals.taxCalculationMethod;
            
            const selectedAccount = accounts.find(acc => acc._id === paymentForm.account);
            const totalItemPayment = paymentForm.itemPayments.reduce((sum, ip) => sum + (ip.amount || 0), 0);
            const paymentAmount = paymentForm.paymentMode === 'full' 
              ? (Number(paymentForm.amount) || 0)
              : totalItemPayment;
            const remainingBalance = invoiceBalance - paymentAmount;
            
            return (
              <form onSubmit={handleSubmitPayment} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {/* Invoice Summary Card */}
                  <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subtotal:</span>
                      <span className="text-sm font-semibold">{formatCurrency(invoiceSubtotal)}</span>
                    </div>
                    {invoiceTaxAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {taxCalculationMethod === 'product' ? 'Tax (Product-Level):' : `Tax (${paymentInvoice.taxRate || 0}%):`}
                        </span>
                        <span className="text-sm font-semibold">{formatCurrency(invoiceTaxAmount)}</span>
                      </div>
                    )}
                    {paymentInvoice.discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Discount:</span>
                        <span className="text-sm font-semibold text-red-600">-{formatCurrency(paymentInvoice.discount || 0)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm font-medium">Total Amount:</span>
                      <span className="text-sm font-semibold">{formatCurrency(invoiceTotalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Paid Amount:</span>
                      <span className="text-sm font-semibold text-green-600">{formatCurrency(paymentInvoice.paidAmount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm font-medium">Outstanding Balance:</span>
                      <span className={`text-sm font-bold ${invoiceBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(invoiceBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Mode Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3">Payment Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const totals = calculateInvoiceTotals(paymentInvoice);
                          const balance = totals.balanceAmount;
                          setPaymentForm((prev) => ({ 
                            ...prev, 
                            paymentMode: 'full',
                            amount: balance > 0 ? String(balance) : '',
                            itemPayments: []
                          }));
                        }}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          paymentForm.paymentMode === 'full'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="paymentMode"
                            value="full"
                            checked={paymentForm.paymentMode === 'full'}
                            onChange={() => {}}
                            className="w-4 h-4"
                          />
                          <span className="font-medium">Full Payment</span>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">Pay the entire outstanding balance</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentForm((prev) => ({ 
                          ...prev, 
                          paymentMode: 'items',
                          amount: ''
                        }))}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          paymentForm.paymentMode === 'items'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="paymentMode"
                            value="items"
                            checked={paymentForm.paymentMode === 'items'}
                            onChange={() => {}}
                            className="w-4 h-4"
                          />
                          <span className="font-medium">Item-Level Payment</span>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">Pay specific invoice items</p>
                      </button>
                    </div>
                  </div>

                {/* Account Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Account *
                    {selectedAccount && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (Balance: {formatCurrency(selectedAccount.balance || 0)})
                      </span>
                    )}
                  </label>
                  <select
                    value={paymentForm.account}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, account: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select account</option>
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} {acc.accountType ? `(${acc.accountType})` : ''} - {formatCurrency(acc.balance || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                {paymentForm.paymentMode === 'full' ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">Amount (₹) *</label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const totals = calculateInvoiceTotals(paymentInvoice);
                              const balance = totals.balanceAmount;
                              setPaymentForm((prev) => ({ ...prev, amount: String(balance) }));
                            }}
                            className="h-7 text-xs"
                          >
                            Pay Full
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const totals = calculateInvoiceTotals(paymentInvoice);
                              const balance = totals.balanceAmount;
                              setPaymentForm((prev) => ({ ...prev, amount: String(Math.max(0, balance * 0.5)) }));
                            }}
                            className="h-7 text-xs"
                          >
                            Pay 50%
                          </Button>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max={invoiceBalance}
                        required
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                      />
                      {paymentForm.amount && Number(paymentForm.amount) > invoiceBalance && (
                        <p className="text-xs text-red-600 mt-1">Amount exceeds outstanding balance</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium">Item Payments</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const itemPayments = (paymentInvoice.items || [])
                              .map((item, index) => {
                                const itemBalance = getItemBalanceForPayment(
                                  paymentInvoice,
                                  item,
                                  index,
                                  invoiceSubtotal,
                                  invoiceTaxAmount
                                );
                                return itemBalance > 0 ? { itemIndex: index, amount: itemBalance } : null;
                              })
                              .filter(Boolean);
                            const totalAmount = itemPayments.reduce((sum, ip) => sum + (ip.amount || 0), 0);
                            setPaymentForm((prev) => ({ 
                              ...prev, 
                              itemPayments,
                              amount: String(totalAmount)
                            }));
                          }}
                          className="h-7 text-xs"
                        >
                          Pay All Items
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-md p-3">
                        {(paymentInvoice.items || []).map((item, index) => {
                          const itemTotalWithTax = getItemTotalWithTax(
                            paymentInvoice,
                            item,
                            invoiceSubtotal,
                            invoiceTaxAmount
                          );
                          const itemBalance = getItemBalanceForPayment(
                            paymentInvoice,
                            item,
                            index,
                            invoiceSubtotal,
                            invoiceTaxAmount
                          );
                          if (itemBalance <= 0) return null;
                          
                          const itemPayment = paymentForm.itemPayments.find(ip => ip.itemIndex === index) || { itemIndex: index, amount: 0 };
                          const isSelected = itemPayment.amount > 0;
                          
                          return (
                            <div key={index} className={`border rounded-md p-3 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const updatedPayments = paymentForm.itemPayments.filter(ip => ip.itemIndex !== index);
                                    if (e.target.checked) {
                                      updatedPayments.push({ itemIndex: index, amount: itemBalance });
                                    }
                                    const totalAmount = updatedPayments.reduce((sum, ip) => sum + (ip.amount || 0), 0);
                                    setPaymentForm((prev) => ({ 
                                      ...prev, 
                                      itemPayments: updatedPayments,
                                      amount: String(totalAmount)
                                    }));
                                  }}
                                  className="mt-1 w-4 h-4"
                                />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{item.description || `Item ${index + 1}`}</p>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                        <span>Amount: {formatCurrency(item.amount || 0)}</span>
                                        {itemTotalWithTax > (item.amount || 0) && (
                                          <span>Tax: {formatCurrency(itemTotalWithTax - (item.amount || 0))}</span>
                                        )}
                                        <span className="font-medium">Total (incl. tax): {formatCurrency(itemTotalWithTax)}</span>
                                        <span>Paid: {formatCurrency(item.paidAmount || 0)}</span>
                                        <span className="font-medium text-red-600">Balance: {formatCurrency(itemBalance)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      max={itemBalance}
                                      value={itemPayment.amount || 0}
                                      onChange={(e) => {
                                        const amount = Number(e.target.value) || 0;
                                        const updatedPayments = paymentForm.itemPayments.filter(ip => ip.itemIndex !== index);
                                        if (amount > 0) {
                                          updatedPayments.push({ itemIndex: index, amount: Math.min(amount, itemBalance) });
                                        }
                                        const totalAmount = updatedPayments.reduce((sum, ip) => sum + (ip.amount || 0), 0);
                                        setPaymentForm((prev) => ({ 
                                          ...prev, 
                                          itemPayments: updatedPayments,
                                          amount: String(totalAmount)
                                        }));
                                      }}
                                      placeholder="0.00"
                                      className="mt-2"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {paymentForm.itemPayments.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Select items to pay by checking the boxes above
                          </p>
                        )}
                        {paymentForm.itemPayments.length > 0 && (
                          <div className="pt-2 border-t border-border mt-2">
                            <div className="flex justify-between text-sm font-semibold">
                              <span>Total Payment:</span>
                              <span className="text-primary">{formatCurrency(totalItemPayment)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Payment Details */}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Date *</label>
                    <Input
                      type="date"
                      required
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Payment Method Specific Fields */}
                {(paymentForm.paymentMethod === 'cheque' || paymentForm.paymentMethod === 'bank-transfer') && (
                  <div className="grid grid-cols-2 gap-4">
                    {paymentForm.paymentMethod === 'cheque' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Cheque Number</label>
                          <Input
                            value={paymentForm.chequeNumber}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, chequeNumber: e.target.value }))}
                            placeholder="Cheque number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Cheque Date</label>
                          <Input
                            type="date"
                            value={paymentForm.chequeDate}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, chequeDate: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-2">Bank Name</label>
                          <Input
                            value={paymentForm.bankName}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, bankName: e.target.value }))}
                            placeholder="Bank name"
                          />
                        </div>
                      </>
                    )}
                    {(paymentForm.paymentMethod === 'bank-transfer' || paymentForm.paymentMethod === 'upi' || paymentForm.paymentMethod === 'neft' || paymentForm.paymentMethod === 'rtgs') && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2">Transaction ID / Reference</label>
                        <Input
                          value={paymentForm.transactionId}
                          onChange={(e) => setPaymentForm((prev) => ({ ...prev, transactionId: e.target.value }))}
                          placeholder="Transaction ID or reference number"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Reference / Notes</label>
                  <Input
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                    placeholder="Additional reference or notes"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Payment description (optional)"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* Payment Summary */}
                {paymentAmount > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Payment Amount:</span>
                      <span className="text-sm font-bold text-primary">{formatCurrency(paymentAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Remaining Balance:</span>
                      <span className={`text-sm font-semibold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(remainingBalance)}
                      </span>
                    </div>
                    {remainingBalance <= 0 && (
                      <p className="text-xs text-green-600 font-medium mt-2">✓ Invoice will be marked as paid</p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="px-6 py-4 border-t border-border flex-shrink-0 gap-2">
                <Button type="button" variant="outline" onClick={closePaymentDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={processingPayment || paymentAmount <= 0 || (paymentForm.paymentMode === 'items' && paymentForm.itemPayments.length === 0)}
                >
                  {processingPayment ? 'Recording...' : `Record Payment ${paymentAmount > 0 ? `(${formatCurrency(paymentAmount)})` : ''}`}
                </Button>
              </DialogFooter>
            </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Send via email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={(open) => { if (!open) { setShowEmailDialog(false); setEmailInvoice(null); setEmailTo(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send invoice via email
            </DialogTitle>
            <DialogDescription>
              {emailInvoice && (
                <span>
                  Invoice <strong>{emailInvoice.invoiceNumber}</strong>
                  {emailInvoice.billTo?.name && ` to ${emailInvoice.billTo.name}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {emailInvoice && (
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient email *</label>
                <Input
                  type="email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowEmailDialog(false); setEmailInvoice(null); }}>Cancel</Button>
                <Button type="submit">Open email</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

