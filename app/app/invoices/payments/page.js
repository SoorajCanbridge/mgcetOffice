'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Search,
  User,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  RefreshCcw,
  Filter,
  X,
  Plus,
  Minus,
  Receipt,
  Printer,
  Download,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const INVOICE_BASE = '/finance/invoices';
const PAYMENTS_BASE = '/finance/payments';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'bank-transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'cheque', label: 'Cheque', icon: '📝' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'neft', label: 'NEFT', icon: '💸' },
  { value: 'rtgs', label: 'RTGS', icon: '💸' },
  { value: 'online', label: 'Online Payment', icon: '🌐' },
  { value: 'other', label: 'Other', icon: '📄' },
];

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
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return '₹0.00';
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

const DEFAULT_LEVEL_LABELS = {
  A: 'Department',
  B: 'Year',
  C: 'Section',
};

const normalizeLevelLabels = (labels) => {
  if (!labels || typeof labels !== 'object') return DEFAULT_LEVEL_LABELS;
  return {
    A: labels.A || DEFAULT_LEVEL_LABELS.A,
    B: labels.B || DEFAULT_LEVEL_LABELS.B,
    C: labels.C || DEFAULT_LEVEL_LABELS.C,
  };
};

const normalizeLevelValues = (values) => {
  if (!values || typeof values !== 'object') return { A: [], B: [], C: [] };
  return {
    A: Array.isArray(values.A) ? values.A : [],
    B: Array.isArray(values.B) ? values.B : [],
    C: Array.isArray(values.C) ? values.C : [],
  };
};

const formatAddressForDisplay = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address !== 'object') return '';
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.pincode) parts.push(address.pincode);
  return parts.join(', ');
};

export default function InvoicePaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Student selection state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentFilters, setStudentFilters] = useState({
    courseId: '',
    levelA: '',
    levelB: '',
    levelC: '',
  });
  const [levelLabels, setLevelLabels] = useState(DEFAULT_LEVEL_LABELS);
  const [levelValues, setLevelValues] = useState({ A: [], B: [], C: [] });
  const [courses, setCourses] = useState([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  // Invoice state
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null); // Single selected invoice for details view
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: formatDateForInput(new Date()),
    paymentMethod: 'cash',
    account: '',
    reference: '',
    transactionId: '',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    description: '',
    itemPayments: [], // For item-level payments
    paymentMode: 'full', // 'full' or 'items'
  });

  // Accounts and other data
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const normalizeCollegeId = (college) => {
    if (!college) return '';
    if (typeof college === 'object') {
      return college._id || college.id || '';
    }
    return String(college);
  };

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    if (!user?.college) return;
    try {
      const collegeId = normalizeCollegeId(user.college);
      const response = await api.get(`/academic/courses?college=${collegeId}`, {}, true);
      const data = response?.data || response || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, [user?.college]);

  // Fetch level labels
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

  // Fetch accounts
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

  // Search students
  const searchStudents = useCallback(async () => {
    if (!user?.college) return;
    try {
      setStudentLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('page', '1');
      if (studentSearch?.trim()) params.set('search', studentSearch.trim());
      if (studentFilters.courseId) params.set('courseId', studentFilters.courseId);
      if (studentFilters.levelA) params.set('levelA', studentFilters.levelA);
      if (studentFilters.levelB) params.set('levelB', studentFilters.levelB);
      if (studentFilters.levelC) params.set('levelC', studentFilters.levelC);

      const response = await api.get(`/students?${params.toString()}`, {}, true);
      const data = response?.data ?? response ?? [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to search students:', err);
      setStudents([]);
    } finally {
      setStudentLoading(false);
    }
  }, [user?.college, studentSearch, studentFilters]);

  // Fetch invoices for selected student
  const fetchStudentInvoices = useCallback(async () => {
    if (!selectedStudent?._id || !user?.college) {
      setInvoices([]);
      return;
    }
    try {
      setInvoiceLoading(true);
      const response = await api.get(
        `${INVOICE_BASE}?studentId=${selectedStudent._id}`,
        {},
        true
      );
      const data = response?.data || response || [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setInvoices([]);
    } finally {
      setInvoiceLoading(false);
    }
  }, [selectedStudent, user?.college]);

  // Handle navigation from invoice page
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId');
    if (invoiceId && user?.college) {
      // Fetch invoice and set up student
      api.get(`${INVOICE_BASE}/${invoiceId}`, {}, true)
        .then((response) => {
          const invoice = response?.data || response;
          if (invoice) {
            // Set selected invoice and invoices
            setSelectedInvoice(invoice);
            setSelectedInvoices([invoice]);
            
            // Set student if available
            if (invoice.student) {
              const studentId = typeof invoice.student === 'object' ? invoice.student._id : invoice.student;
              if (studentId) {
                api.get(`/students/${studentId}`, {}, true)
                  .then((studentResponse) => {
                    const studentData = studentResponse?.data || studentResponse;
                    if (studentData) {
                      setSelectedStudent(studentData);
                    }
                  })
                  .catch(() => {
                    if (typeof invoice.student === 'object') {
                      setSelectedStudent(invoice.student);
                    }
                  });
              } else if (typeof invoice.student === 'object') {
                setSelectedStudent(invoice.student);
              }
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load invoice:', err);
        });
    }
  }, [searchParams, user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchCourses();
    fetchLevelLabels();
    fetchAccounts();
  }, [user?.college, fetchCourses, fetchLevelLabels, fetchAccounts]);

  useEffect(() => {
    if (showStudentPicker) {
      const timer = setTimeout(() => {
        searchStudents();
      }, studentSearch ? 400 : 0);
      return () => clearTimeout(timer);
    }
  }, [showStudentPicker, studentSearch, studentFilters, searchStudents]);

  useEffect(() => {
    if (selectedStudent?._id) {
      fetchStudentInvoices();
    }
  }, [selectedStudent, fetchStudentInvoices]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setShowStudentPicker(false);
    setSelectedInvoices([]);
    setStudentSearch('');
  };

  const handleToggleInvoice = (invoice) => {
    setSelectedInvoices((prev) => {
      const exists = prev.find((inv) => inv._id === invoice._id);
      if (exists) {
        const newList = prev.filter((inv) => inv._id !== invoice._id);
        // If this was the selected invoice, clear it
        if (selectedInvoice?._id === invoice._id) {
          setSelectedInvoice(newList.length > 0 ? newList[0] : null);
        }
        return newList;
      } else {
        const newList = [...prev, invoice];
        // Set as selected invoice if none selected
        if (!selectedInvoice) {
          setSelectedInvoice(invoice);
        }
        return newList;
      }
    });
  };

  const handleSelectInvoiceForDetails = (invoice) => {
    setSelectedInvoice(invoice);
    // Add to selected invoices if not already there
    if (!selectedInvoices.find((inv) => inv._id === invoice._id)) {
      setSelectedInvoices((prev) => [...prev, invoice]);
    }
  };

  const handleSelectAllInvoices = () => {
    const payableInvoices = invoices.filter((inv) => {
      const balance = calculateInvoiceBalance(inv);
      return balance > 0;
    });
    setSelectedInvoices(payableInvoices);
  };

  const handleDeselectAllInvoices = () => {
    setSelectedInvoices([]);
  };

  const calculateInvoiceBalance = (invoice) => {
    const subtotal = invoice.subtotal || (invoice.items || []).reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    
    let taxAmount = 0;
    const taxCalculationMethod = invoice.taxCalculationMethod || 'total';
    
    if (taxCalculationMethod === 'product') {
      taxAmount = (invoice.items || []).reduce(
        (sum, item) => sum + (Number(item.taxAmount) || 0),
        0
      );
    } else {
      const taxRate = invoice.taxRate || 0;
      taxAmount = (subtotal * taxRate) / 100;
    }
    
    const discount = invoice.discount || 0;
    const totalAmount = subtotal + taxAmount - discount;
    const paidAmount = invoice.paidAmount || 0;
    return Math.max(0, totalAmount - paidAmount);
  };

  const calculateTotals = useMemo(() => {
    const totals = selectedInvoices.reduce(
      (acc, invoice) => {
        const balance = calculateInvoiceBalance(invoice);
        return {
          totalAmount: acc.totalAmount + balance,
          invoiceCount: acc.invoiceCount + 1,
        };
      },
      { totalAmount: 0, invoiceCount: 0 }
    );
    return totals;
  }, [selectedInvoices]);

  const handlePaymentFormChange = (field, value) => {
    setPaymentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate invoice totals helper
  const calculateInvoiceTotals = useCallback((inv) => {
    if (!inv) return { subtotal: 0, taxAmount: 0, totalAmount: 0, balanceAmount: 0 };
    
    const subtotal = inv.subtotal || (inv.items || []).reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    
    let taxAmount = 0;
    const taxCalculationMethod = inv.taxCalculationMethod || 'total';
    
    if (taxCalculationMethod === 'product') {
      taxAmount = (inv.items || []).reduce(
        (sum, item) => sum + (Number(item.taxAmount) || 0),
        0
      );
    } else {
      const taxRate = inv.taxRate || 0;
      taxAmount = (subtotal * taxRate) / 100;
    }
    
    const discount = inv.discount || 0;
    const totalAmount = subtotal + taxAmount - discount;
    const paidAmount = inv.paidAmount || 0;
    const balanceAmount = totalAmount - paidAmount;
    
    return { subtotal, taxAmount, totalAmount, balanceAmount, taxCalculationMethod };
  }, []);

  // Item total with tax
  const getItemTotalWithTax = useCallback((inv, item, subtotal, taxAmount) => {
    if (!inv || !item) return 0;
    const amount = Number(item.amount) || 0;
    const method = inv.taxCalculationMethod || 'total';
    if (method === 'product') {
      const itemTax = Number(item.taxAmount) || 0;
      return amount + itemTax;
    }
    const invSubtotal = subtotal || (inv.items || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    if (!invSubtotal || invSubtotal <= 0) return amount;
    const itemShareOfTax = (amount / invSubtotal) * (taxAmount || 0);
    return amount + itemShareOfTax;
  }, []);

  // Item balance for payment
  const getItemBalanceForPayment = useCallback((inv, item, itemIndex, subtotal, taxAmount) => {
    if (!inv || !item) return 0;
    const totalWithTax = getItemTotalWithTax(inv, item, subtotal, taxAmount);
    const paid = Number(item.paidAmount) || 0;
    return Math.max(0, totalWithTax - paid);
  }, [getItemTotalWithTax]);

  const openPaymentModal = useCallback(async (invoice) => {
    if (!invoice) return;
    
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
    
    const calculatedTotals = calculateInvoiceTotals(fullInvoice);
    const balance = calculatedTotals.balanceAmount;
    
    setSelectedInvoice(fullInvoice);
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
    setShowPaymentModal(true);
    setError('');
  }, [calculateInvoiceTotals]);

  const closePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    setError('');
  }, []);

  const handleProcessPayment = async (e) => {
    e?.preventDefault();
    if (!selectedInvoice?._id) {
      setError('No invoice selected for payment.');
      return;
    }

    if (!paymentForm.account) {
      setError('Please select a payment account.');
      return;
    }

    if (!paymentForm.paymentDate) {
      setError('Please select a payment date.');
      return;
    }

    setError('');
    setProcessingPayment(true);

    try {
      const calculatedTotals = calculateInvoiceTotals(selectedInvoice);
      const invoiceBalance = calculatedTotals.balanceAmount;
      
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
          `${INVOICE_BASE}/${selectedInvoice._id}/pay-items`,
          {
            itemPayments,
            account: paymentForm.account || selectedInvoice.account?._id || selectedInvoice.account,
            paymentDate: paymentForm.paymentDate,
            paymentMethod: paymentForm.paymentMethod || 'cash',
            notes: paymentForm.description || undefined,
          },
          {},
          true
        );
        setSuccess('Item-level payment recorded successfully.');
      } else {
        // Full payment mode
        const amount = Number(paymentForm.amount);
        if (!amount || amount <= 0) {
          setError('Please enter a valid payment amount.');
          setProcessingPayment(false);
          return;
        }

        if (amount > invoiceBalance) {
          setError('Payment amount exceeds outstanding balance.');
          setProcessingPayment(false);
          return;
        }

        const paymentPayload = {
          invoice: selectedInvoice._id,
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
          student: selectedInvoice.student?._id || selectedInvoice.student || selectedStudent?._id || undefined,
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

        await api.post(PAYMENTS_BASE, paymentPayload, {}, true);
        setSuccess('Payment recorded successfully.');
      }
      
      closePaymentModal();
      
      // Reset form
      setPaymentForm({
        paymentDate: formatDateForInput(new Date()),
        paymentMethod: 'bank-transfer',
        account: '',
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

      // Refresh invoices
      if (selectedStudent?._id) {
        await fetchStudentInvoices();
      }
    } catch (err) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const studentLevelOptions = useMemo(() => {
    const levelA = levelValues.A || [];
    const levelB = (levelValues.B || [])
      .filter((item) => item.parent === studentFilters.levelA)
      .flatMap((item) => item.values || []);
    const levelC = (levelValues.C || [])
      .filter((item) => item.parent === studentFilters.levelB || item.parent === studentFilters.levelA)
      .flatMap((item) => item.values || []);

    return {
      levelA: [...new Set(levelA)].sort(),
      levelB: [...new Set(levelB)].sort(),
      levelC: [...new Set(levelC)].sort(),
    };
  }, [levelValues, studentFilters.levelA, studentFilters.levelB]);

  const isOverdue = (invoice) => {
    if (!invoice?.dueDate || invoice.status === 'paid' || invoice.status === 'cancelled') return false;
    try {
      return new Date(invoice.dueDate) < new Date(new Date().toDateString());
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/app/invoices')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <CreditCard className="h-8 w-8 text-primary" />
                Record Invoice Payment
              </h1>
              <p className="text-muted-foreground mt-1">
                Process payments for student invoices
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedStudent(null);
                setSelectedInvoices([]);
                setStudentSearch('');
              }}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Student Selection & Invoices */}
          <div className="lg:col-span-1 space-y-6">
            {/* Student Selection Card */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Student
                </h2>
              </div>

              {!selectedStudent ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, roll number, email..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        onFocus={() => setShowStudentPicker(true)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowStudentPicker(true)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </div>

                  {/* Student Picker Dialog */}
                  <Dialog open={showStudentPicker} onOpenChange={setShowStudentPicker}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Select Student</DialogTitle>
                        <DialogDescription>
                          Search and filter students to find invoices
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search students..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Select
                            value={studentFilters.courseId || undefined}
                            onValueChange={(value) =>
                              setStudentFilters((prev) => ({ ...prev, courseId: value === 'all' ? '' : value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Course" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Courses</SelectItem>
                              {courses.map((course) => (
                                <SelectItem key={course._id} value={course._id}>
                                  {course.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={studentFilters.levelA || undefined}
                            onValueChange={(value) =>
                              setStudentFilters((prev) => ({ ...prev, levelA: value === 'all' ? '' : value, levelB: '', levelC: '' }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={levelLabels.A} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All {levelLabels.A}</SelectItem>
                              {studentLevelOptions.levelA.map((val) => (
                                <SelectItem key={val} value={val}>
                                  {val}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={studentFilters.levelB || undefined}
                            onValueChange={(value) =>
                              setStudentFilters((prev) => ({ ...prev, levelB: value === 'all' ? '' : value, levelC: '' }))
                            }
                            disabled={!studentFilters.levelA}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={levelLabels.B} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All {levelLabels.B}</SelectItem>
                              {studentLevelOptions.levelB.map((val) => (
                                <SelectItem key={val} value={val}>
                                  {val}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={studentFilters.levelC || undefined}
                            onValueChange={(value) =>
                              setStudentFilters((prev) => ({ ...prev, levelC: value === 'all' ? '' : value }))
                            }
                            disabled={!studentFilters.levelB}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={levelLabels.C} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All {levelLabels.C}</SelectItem>
                              {studentLevelOptions.levelC.map((val) => (
                                <SelectItem key={val} value={val}>
                                  {val}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Student List */}
                        <div className="border rounded-lg max-h-96 overflow-y-auto">
                          {studentLoading ? (
                            <div className="p-8 text-center text-muted-foreground">
                              Loading students...
                            </div>
                          ) : students.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                              No students found
                            </div>
                          ) : (
                            <div className="divide-y">
                              {students.map((student) => (
                                <div
                                  key={student._id}
                                  onClick={() => handleSelectStudent(student)}
                                  className="p-4 hover:bg-muted cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold">{student.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {student.rollNumber || student.studentId || 'N/A'} • {student.email || 'No email'}
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                      Select
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Student Info */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{selectedStudent.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {selectedStudent.rollNumber || selectedStudent.studentId || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                          {selectedStudent.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              {selectedStudent.email}
                            </div>
                          )}
                          {selectedStudent.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              {selectedStudent.phone}
                            </div>
                          )}
                          {selectedStudent.address && (
                            <div className="flex items-start gap-2 text-muted-foreground col-span-2">
                              <MapPin className="h-4 w-4 mt-0.5" />
                              <span className="text-xs">
                                {formatAddressForDisplay(selectedStudent.address)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(null);
                          setSelectedInvoices([]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoices List */}
            {selectedStudent && (
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Available Invoices
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllInvoices}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllInvoices}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                {invoiceLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading invoices...
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No pending invoices found for this student
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((invoice) => {
                      const balance = calculateInvoiceBalance(invoice);
                      const isSelected = selectedInvoices.some((inv) => inv._id === invoice._id);
                      const overdue = isOverdue(invoice);

                      return (
                        <div
                          key={invoice._id}
                          className={`border rounded-lg p-4 transition-all cursor-pointer ${
                            isSelected || selectedInvoice?._id === invoice._id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          } ${balance <= 0 ? 'opacity-50' : ''}`}
                          onClick={() => handleSelectInvoiceForDetails(invoice)}
                        >
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(e) => {
                                e.stopPropagation();
                                handleToggleInvoice(invoice);
                              }}
                              disabled={balance <= 0}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">
                                      {invoice.invoiceNumber || 'N/A'}
                                    </span>
                                    {overdue && (
                                      <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded">
                                        Overdue
                                      </span>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                                      invoice.status === 'paid'
                                        ? 'bg-green-500/10 text-green-600'
                                        : invoice.status === 'sent'
                                        ? 'bg-blue-500/10 text-blue-600'
                                        : 'bg-yellow-500/10 text-yellow-600'
                                    }`}>
                                      {invoice.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {formatDateForDisplay(invoice.invoiceDate)}
                                    </span>
                                    {invoice.dueDate && (
                                      <span className="flex items-center gap-1">
                                        Due: {formatDateForDisplay(invoice.dueDate)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">
                                    {formatCurrency(balance)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Balance
                                  </div>
                                </div>
                              </div>
                              {invoice.items && invoice.items.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  {invoice.items.length} item(s)
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Invoice Details */}
          <div className=" lg:col-span-2 space-y-6">
            {selectedInvoice ? (
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm sticky top-6 space-y-6">
                {/* Invoice Header */}
                <div className="border-b-2 border-primary pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="text-2xl font-bold text-primary mb-1">INVOICE</h2>
                      <p className="text-muted-foreground text-sm">Invoice Statement</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold mb-2">
                        {selectedInvoice.invoiceNumber || 'N/A'}
                      </p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        selectedInvoice.status === 'paid'
                          ? 'bg-green-500 text-white'
                          : selectedInvoice.status === 'overdue'
                          ? 'bg-red-500 text-white'
                          : selectedInvoice.status === 'sent'
                          ? 'bg-blue-500 text-white'
                          : selectedInvoice.status === 'pending'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}>
                        {selectedInvoice.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invoice Information */}
                <div className="space-y-4">
                  {/* Bill To */}
                  {/* {selectedInvoice.billTo && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Bill To
                      </h3>
                      <div className="space-y-1">
                        {selectedInvoice.billTo.name && (
                          <p className="font-semibold">{selectedInvoice.billTo.name}</p>
                        )}
                        {selectedInvoice.billTo.address && (
                          <p className="text-sm text-muted-foreground">{selectedInvoice.billTo.address}</p>
                        )}
                        {selectedInvoice.billTo.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {selectedInvoice.billTo.email}
                          </div>
                        )}
                        {selectedInvoice.billTo.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {selectedInvoice.billTo.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  )} */}

                  {/* Invoice Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Invoice Details
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice Date:</span>
                        <span className="font-medium">{formatDateForDisplay(selectedInvoice.invoiceDate)}</span>
                      </div>
                      {selectedInvoice.dueDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Due Date:</span>
                          <span className="font-medium">{formatDateForDisplay(selectedInvoice.dueDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Items
                      </h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Description</TableHead>
                              <TableHead className="text-xs text-right">Qty</TableHead>
                              <TableHead className="text-xs text-right">Price</TableHead>
                              <TableHead className="text-xs text-right">Amount</TableHead>
                              <TableHead className="text-xs text-right">Paid</TableHead>
                              <TableHead className="text-xs text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedInvoice.items.map((item, index) => {
                              const itemAmount = item.amount || 0;
                              const itemPaid = item.paidAmount || 0;
                              const itemBalance = itemAmount - itemPaid;
                              return (
                                <TableRow key={index}>
                                  <TableCell className="text-sm">{item.description || '-'}</TableCell>
                                  <TableCell className="text-sm text-right">{item.quantity || 0}</TableCell>
                                  <TableCell className="text-sm text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                                  <TableCell className="text-sm text-right font-medium">{formatCurrency(itemAmount)}</TableCell>
                                  <TableCell className="text-sm text-right text-green-600">{formatCurrency(itemPaid)}</TableCell>
                                  <TableCell className="text-sm text-right font-medium text-red-600">{formatCurrency(itemBalance)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {(() => {
                    const totals = calculateInvoiceTotals(selectedInvoice);
                    return (
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        {totals.taxAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {totals.taxCalculationMethod === 'product' ? 'Tax (Product-Level):' : `Tax (${selectedInvoice.taxRate || 0}%):`}
                            </span>
                            <span className="font-semibold">{formatCurrency(totals.taxAmount)}</span>
                          </div>
                        )}
                        {selectedInvoice.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount:</span>
                            <span className="font-semibold text-red-600">-{formatCurrency(selectedInvoice.discount || 0)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between">
                          <span className="font-medium">Total Amount:</span>
                          <span className="font-bold">{formatCurrency(totals.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Paid Amount:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(selectedInvoice.paidAmount || 0)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="font-medium">Outstanding Balance:</span>
                          <span className={`font-bold ${totals.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(totals.balanceAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Button */}
                  {(() => {
                    const totals = calculateInvoiceTotals(selectedInvoice);
                    const balance = totals.balanceAmount;
                    return (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => openPaymentModal(selectedInvoice)}
                        disabled={balance <= 0}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Record Payment
                      </Button>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 shadow-sm text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Select an invoice to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => { if (!open) closePaymentModal(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice && (
                <span>
                  Invoice <strong>{selectedInvoice.invoiceNumber}</strong>
                  {selectedInvoice.billTo?.name && ` · ${selectedInvoice.billTo.name}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (() => {
            const calculatedTotals = calculateInvoiceTotals(selectedInvoice);
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
              <form onSubmit={handleProcessPayment} className="flex flex-col flex-1 min-h-0">
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
                          {taxCalculationMethod === 'product' ? 'Tax (Product-Level):' : `Tax (${selectedInvoice.taxRate || 0}%):`}
                        </span>
                        <span className="text-sm font-semibold">{formatCurrency(invoiceTaxAmount)}</span>
                      </div>
                    )}
                    {selectedInvoice.discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Discount:</span>
                        <span className="text-sm font-semibold text-red-600">-{formatCurrency(selectedInvoice.discount || 0)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm font-medium">Total Amount:</span>
                      <span className="text-sm font-semibold">{formatCurrency(invoiceTotalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Paid Amount:</span>
                      <span className="text-sm font-semibold text-green-600">{formatCurrency(selectedInvoice.paidAmount || 0)}</span>
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
                          const totals = calculateInvoiceTotals(selectedInvoice);
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
                    <Select
                      value={paymentForm.account || undefined}
                      onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, account: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc._id} value={acc._id}>
                            {acc.name} {acc.accountType ? `(${acc.accountType})` : ''} - {formatCurrency(acc.balance || 0)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                                const totals = calculateInvoiceTotals(selectedInvoice);
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
                                const totals = calculateInvoiceTotals(selectedInvoice);
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
                              const itemPayments = (selectedInvoice.items || [])
                                .map((item, index) => {
                                  const itemBalance = getItemBalanceForPayment(
                                    selectedInvoice,
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
                          {(selectedInvoice.items || []).map((item, index) => {
                            const itemTotalWithTax = getItemTotalWithTax(
                              selectedInvoice,
                              item,
                              invoiceSubtotal,
                              invoiceTaxAmount
                            );
                            const itemBalance = getItemBalanceForPayment(
                              selectedInvoice,
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
                      <Select
                        value={paymentForm.paymentMethod}
                        onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, paymentMethod: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              <span className="flex items-center gap-2">
                                <span>{m.icon}</span>
                                {m.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Payment Method Specific Fields */}
                  {(paymentForm.paymentMethod === 'cheque' || paymentForm.paymentMethod === 'bank-transfer' || paymentForm.paymentMethod === 'upi' || paymentForm.paymentMethod === 'neft' || paymentForm.paymentMethod === 'rtgs') && (
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
                <div className="px-6 py-4 border-t border-border flex-shrink-0 flex gap-2">
                  <Button type="button" variant="outline" onClick={closePaymentModal} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={processingPayment || paymentAmount <= 0 || (paymentForm.paymentMode === 'items' && paymentForm.itemPayments.length === 0)}
                    className="flex-1"
                  >
                    {processingPayment ? 'Recording...' : `Record Payment ${paymentAmount > 0 ? `(${formatCurrency(paymentAmount)})` : ''}`}
                  </Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
