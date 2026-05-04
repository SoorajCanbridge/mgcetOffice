'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  CreditCard,
  FileText,
  DollarSign,
  TrendingUp,
  RefreshCcw,
  Edit2,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  Share2,
  Download,
  Trash2,
  Percent,
  Bookmark,
  Tags,
} from 'lucide-react';
import { api, API_URL, deleteUploadedFile } from '@/lib/api';
import { getStudentPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import StudentForm from '@/components/student-form';

const INVOICE_BASE = '/finance/invoices';

const financeCategoryId = (ref) => {
  if (ref == null || ref === '') return '';
  if (typeof ref === 'object' && ref !== null) {
    return String(ref._id || ref.id || '');
  }
  return String(ref);
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

const EMPTY_STUDENT = {
  name: '',
  email: '',
  phone: '',
  alternatePhone: '',
  dateOfBirth: '',
  gender: '',
  address: {
    street: '',
    city: '',
    state: '',
    pincode: '',
  },
  rollNumber: '',
  course: '',
  category: '',
  tags: [],
  enrollmentDate: '',
  enrollmentStatus: 'enrolled',
  graduationDate: '',
  guardianInfo: {
    name: '',
    relationship: '',
    phone: '',
    email: '',
  },
  photo: '',
  isActive: true,
};

const normalizeCollegeId = (college) => {
  if (!college) return '';
  if (typeof college === 'object') return college._id || college.id || '';
  return String(college);
};

const normalizeCategoryId = (student) => {
  const c = student?.category;
  if (!c) return '';
  return typeof c === 'object' ? (c._id || c.id || '') : String(c);
};

const normalizeTagIds = (student) => {
  const raw = student?.tags;
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => (typeof t === 'object' ? (t._id || t.id) : t)).filter(Boolean);
};

const DEFAULT_TAG_SWATCH = '#6366f1';

function tagSwatchColor(tag) {
  if (!tag || typeof tag !== 'object') return DEFAULT_TAG_SWATCH;
  const v = (tag.color || '').trim();
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v) ? v : DEFAULT_TAG_SWATCH;
}

const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const getStudentId = (student) => student._id || student.id;

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const studentId = params?.id;

  const [student, setStudent] = useState(null);
  const [course, setCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [studentCategories, setStudentCategories] = useState([]);
  const [studentTags, setStudentTags] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_STUDENT);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [photoPreviewDataUrl, setPhotoPreviewDataUrl] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const [flash, setFlash] = useState(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState('');
  const [cancellingInvoiceId, setCancellingInvoiceId] = useState('');
  const [feeWaiverOpen, setFeeWaiverOpen] = useState(false);
  const [feeWaiverInvoice, setFeeWaiverInvoice] = useState(null);
  const [feeWaiverDiscount, setFeeWaiverDiscount] = useState('');
  const [feeWaiverNotes, setFeeWaiverNotes] = useState('');
  const [savingFeeWaiver, setSavingFeeWaiver] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState(null);
  const [emailTo, setEmailTo] = useState('');

  const showFlash = useCallback((text, type = 'success') => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 3500);
  }, []);

  const fetchCourses = useCallback(async () => {
    if (!user?.college) return;
    try {
      const collegeId = normalizeCollegeId(user.college);
      const response = await api.get(`/academic/courses?collegeId=${collegeId}`, {}, true);
      const data = response?.data || response || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setCourses([]);
    }
  }, [user?.college]);

  const fetchStudentTaxonomy = useCallback(async () => {
    if (!user?.college) return;
    const collegeId = normalizeCollegeId(user.college);
    const qs = collegeId ? `?collegeId=${encodeURIComponent(collegeId)}` : '';
    try {
      const [catRes, tagRes] = await Promise.all([
        api.get(`/student-categories${qs}`, {}, true),
        api.get(`/student-tags${qs}`, {}, true),
      ]);
      const cats = catRes?.data ?? catRes;
      const tags = tagRes?.data ?? tagRes;
      setStudentCategories(Array.isArray(cats) ? cats : []);
      setStudentTags(Array.isArray(tags) ? tags : []);
    } catch (err) {
      console.error('Failed to load student categories/tags:', err);
      setStudentCategories([]);
      setStudentTags([]);
    }
  }, [user?.college]);

  const fetchStudentDetails = useCallback(async () => {
    if (!studentId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/students/${studentId}`, {}, true);
      const data = response?.data || response;
      setStudent(data);

      // Fetch course details if student has a course
      if (data.course) {
        const courseId = typeof data.course === 'object' ? data.course._id : data.course;
        if (courseId) {
          try {
            const courseResponse = await api.get(`/academic/courses/${courseId}`, {}, true);
            const courseData = courseResponse?.data || courseResponse;
            setCourse(courseData);
          } catch (err) {
            console.error('Failed to load course:', err);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  }, [studentId, user?.college]);

  const fetchInvoices = useCallback(async () => {
    if (!studentId || !user?.college) return;
    try {
      const response = await api.get(`/finance/invoices?studentId=${studentId}`, {}, true);
      const data = response?.data || response || [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  }, [studentId, user?.college]);

  const fetchPayments = useCallback(async () => {
    if (!studentId || !user?.college) return;
    try {
      const response = await api.get(`/finance/payments?studentId=${studentId}`, {}, true);
      const data = response?.data || response || [];
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
  }, [studentId, user?.college]);

  const calculateStats = useCallback(() => {
    if (!student) return;

    // Invoice stats
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'sent').length;
    const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue').length;
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paidInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const balanceAmount = invoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    // Payment stats
    const totalPayments = payments.length;
    const completedPayments = payments.filter((p) => p.status === 'completed').length;
    const pendingPayments = payments.filter((p) => p.status === 'pending').length;
    const totalPaidAmount = payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    setStats({
      invoices: {
        total: totalInvoices,
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices,
        totalAmount : totalInvoiceAmount,
        paidAmount: paidInvoiceAmount,
        balanceAmount : balanceAmount,
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
        pending: pendingPayments,
        totalAmount: totalPaidAmount,
      },
    });
  }, [student, invoices, payments]);

  useEffect(() => {
    if (!user?.college) return;
    fetchStudentDetails();
    fetchCourses();
    fetchStudentTaxonomy();
  }, [user?.college, studentId, fetchStudentDetails, fetchCourses, fetchStudentTaxonomy]);

  useEffect(() => {
    if (studentId) {
      fetchInvoices();
      fetchPayments();
    }
  }, [studentId, fetchInvoices, fetchPayments]);

  useEffect(() => {
    if (student && invoices.length >= 0 && payments.length >= 0) {
      calculateStats();
    }
  }, [student, invoices, payments, calculateStats]);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_STUDENT);
    setFormErrors({});
    setFormError('');
    setFormSuccess('');
    setPhotoPreviewDataUrl(null);
    setSelectedPhotoFile(null);
    setShowEditForm(false);
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested address fields
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
      
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.address;
        return newErrors;
      });
    }
    // Handle nested guardianInfo fields
    else if (name.startsWith('guardianInfo.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        guardianInfo: {
          ...prev.guardianInfo,
          [field]: value,
        },
      }));
      
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.guardianInfo;
        return newErrors;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
      
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setFormError('');
  }, []);

  const handleTagToggle = useCallback((tagId) => {
    setFormData((prev) => {
      const tags = Array.isArray(prev.tags) ? [...prev.tags] : [];
      const idx = tags.indexOf(tagId);
      if (idx >= 0) tags.splice(idx, 1);
      else tags.push(tagId);
      return { ...prev, tags };
    });
  }, []);

  const validateForm = useCallback(() => {
    const nextErrors = {};
    const name = formData.name.trim();
    const email = formData.email.trim();
    
    if (!name) nextErrors.name = 'Name is required';
    if (!email) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) nextErrors.phone = 'Phone is required';
    if (!formData.course) nextErrors.course = 'Course is required';
    if (!formData.enrollmentDate) nextErrors.enrollmentDate = 'Enrollment date is required';
    
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

  const handleFormSubmit = useCallback(async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!validateForm()) {
      setFormError('Please fix the errors in the form.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        address: formData.address.street || formData.address.city || formData.address.state || formData.address.pincode
          ? {
              street: formData.address.street.trim() || undefined,
              city: formData.address.city.trim() || undefined,
              state: formData.address.state.trim() || undefined,
              pincode: formData.address.pincode.trim() || undefined,
            }
          : undefined,
        rollNumber: formData.rollNumber.trim() || undefined,
        course: formData.course,
        category: formData.category || null,
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        enrollmentDate: formData.enrollmentDate,
        enrollmentStatus: formData.enrollmentStatus,
        graduationDate: formData.graduationDate || undefined,
        guardianInfo: formData.guardianInfo.name || formData.guardianInfo.phone
          ? {
              name: formData.guardianInfo.name.trim() || undefined,
              relationship: formData.guardianInfo.relationship.trim() || undefined,
              phone: formData.guardianInfo.phone.trim() || undefined,
              email: formData.guardianInfo.email.trim() || undefined,
            }
          : undefined,
        isActive: !!formData.isActive,
        college: user.college._id,
      };

      await api.put(`/students/${studentId}`, payload, {}, true);
      setFormSuccess('Student updated successfully.');
      
      await fetchStudentDetails();
      resetForm();
    } catch (err) {
      setFormError(err.message || 'Failed to save student');
    } finally {
      setSaving(false);
      setTimeout(() => setFormSuccess(''), 3000);
    }
  }, [formData, validateForm, studentId, user.college, fetchStudentDetails, resetForm]);

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedPhotoFile(null);
      setPhotoPreviewDataUrl(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image must be less than 5MB');
      return;
    }
    setSelectedPhotoFile(file);
    setFormError('');
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreviewDataUrl(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const handlePhotoUpload = useCallback(async () => {
    if (!selectedPhotoFile || !studentId) return;
    setUploadingPhoto(true);
    setFormError('');
    try {
      const oldPath = student?.image ?? student?.photo ?? formData.photo;
      if (oldPath) await deleteUploadedFile(oldPath);
      const fd = new FormData();
      fd.append('folder', 'students');
      fd.append('file', selectedPhotoFile);
      const response = await api.uploadFile('/upload/single', fd, true);
      const path = response?.data?.path ?? response?.path;
      if (path) {
        await api.put(`/students/${studentId}`, { image: path }, {}, true);
        setFormData((prev) => ({ ...prev, photo: path }));
        setStudent((prev) => (prev ? { ...prev, photo: path } : null));
      }
      setPhotoPreviewDataUrl(null);
      setSelectedPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setFormSuccess('Photo updated.');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      setFormError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [selectedPhotoFile, studentId, student, formData.photo]);

  const handlePhotoClear = useCallback(async () => {
    if (!studentId) return;
    setUploadingPhoto(true);
    setFormError('');
    try {
      const currentPath = formData.photo || (student?.image ?? student?.photo);
      if (currentPath) await deleteUploadedFile(currentPath);
      await api.put(`/students/${studentId}`, { image: '' }, {}, true);
      setFormData((prev) => ({ ...prev, photo: '' }));
      setStudent((prev) => (prev ? { ...prev, photo: '' } : null));
      setPhotoPreviewDataUrl(null);
      setSelectedPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setFormSuccess('Photo cleared.');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      setFormError(err.message || 'Failed to clear photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [studentId, formData.photo, student]);

  const handleEditClick = useCallback(() => {
    if (!student) return;
    setFormData({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      alternatePhone: student.alternatePhone || '',
      dateOfBirth: formatDateForInput(student.dateOfBirth),
      gender: student.gender || '',
      address: {
        street: student.address?.street || '',
        city: student.address?.city || '',
        state: student.address?.state || '',
        pincode: student.address?.pincode || '',
      },
      rollNumber: student.rollNumber || '',
      course: student.course?._id || student.course || '',
      category: normalizeCategoryId(student),
      tags: normalizeTagIds(student),
      enrollmentDate: formatDateForInput(student.enrollmentDate),
      enrollmentStatus: student.enrollmentStatus || 'enrolled',
      graduationDate: formatDateForInput(student.graduationDate),
      guardianInfo: {
        name: student.guardianInfo?.name || '',
        relationship: student.guardianInfo?.relationship || '',
        phone: student.guardianInfo?.phone || '',
        email: student.guardianInfo?.email || '',
      },
      photo: student.image ?? student.photo ?? '',
      isActive: student.isActive ?? true,
    });
    setPhotoPreviewDataUrl(null);
    setSelectedPhotoFile(null);
    setFormErrors({});
    setFormError('');
    setFormSuccess('');
    setShowEditForm(true);
  }, [student]);

  const rowBalance = useCallback(
    (row) => row.balanceAmount ?? ((row.totalAmount || 0) - (row.paidAmount || 0)),
    [],
  );

  const getInvoiceViewUrl = useCallback((id, searchParams = {}) => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}/app/invoices/${id}`;
    if (Object.keys(searchParams).length === 0) return base;
    const qs = new URLSearchParams(searchParams).toString();
    return `${base}?${qs}`;
  }, []);

  const handleViewInvoice = useCallback(
    (invoiceId) => {
      router.push(`/app/invoices/${invoiceId}`);
    },
    [router],
  );

  const handleShareInvoice = useCallback(
    async (invoice) => {
      const url = getInvoiceViewUrl(invoice._id);
      try {
        await navigator.clipboard.writeText(url);
        showFlash('Invoice link copied to clipboard.');
      } catch {
        showFlash('Could not copy link.', 'error');
      }
    },
    [getInvoiceViewUrl, showFlash],
  );

  const handleDownloadInvoice = useCallback(
    (invoice, options = {}) => {
      const url = options.autoDownload
        ? getInvoiceViewUrl(invoice._id, { download: '1' })
        : getInvoiceViewUrl(invoice._id);
      window.open(url, '_blank');
    },
    [getInvoiceViewUrl],
  );

  const openEmailDialog = useCallback((inv) => {
    setEmailInvoice(inv);
    setEmailTo(inv?.billTo?.email || '');
    setShowEmailDialog(true);
  }, []);

  const handleSendEmail = useCallback(
    (e) => {
      e.preventDefault();
      if (!emailInvoice?._id || !emailTo?.trim()) return;
      const url = getInvoiceViewUrl(emailInvoice._id);
      const subject = encodeURIComponent(`Invoice ${emailInvoice.invoiceNumber || emailInvoice._id}`);
      const body = encodeURIComponent(`Please view your invoice: ${url}`);
      window.location.href = `mailto:${emailTo.trim()}?subject=${subject}&body=${body}`;
      setShowEmailDialog(false);
      setEmailInvoice(null);
      setEmailTo('');
      showFlash('Email client opened.');
    },
    [emailInvoice, emailTo, getInvoiceViewUrl, showFlash],
  );

  const openFeeWaiverDialog = useCallback((inv) => {
    if (!inv?._id || inv.status === 'cancelled') return;
    setFeeWaiverInvoice(inv);
    setFeeWaiverDiscount(inv.discount != null ? String(inv.discount) : '');
    setFeeWaiverNotes(inv.notes || '');
    setFeeWaiverOpen(true);
  }, []);

  const closeFeeWaiverDialog = useCallback(() => {
    setFeeWaiverOpen(false);
    setFeeWaiverInvoice(null);
    setFeeWaiverDiscount('');
    setFeeWaiverNotes('');
  }, []);

  const handleFeeWaiverSubmit = async (e) => {
    e.preventDefault();
    if (!feeWaiverInvoice?._id) return;
    setSavingFeeWaiver(true);
    try {
      const response = await api.get(`${INVOICE_BASE}/${feeWaiverInvoice._id}`, {}, true);
      const full = response?.data || response;
      const discountNum = Number(feeWaiverDiscount) || 0;
      const payload = {
        invoiceNumber: full.invoiceNumber,
        invoiceDate: full.invoiceDate,
        dueDate: full.dueDate,
        status: full.status,
        billTo: full.billTo || {},
        items: full.items || [],
        taxCalculationMethod: full.taxCalculationMethod || 'total',
        taxRate: full.taxRate ?? 0,
        discount: discountNum,
        paidAmount: full.paidAmount ?? 0,
        notes: feeWaiverNotes.trim() || undefined,
        terms: full.terms,
        student: full.student?._id || full.student || undefined,
        savedContent: full.savedContent?._id || full.savedContent || undefined,
        category: financeCategoryId(full.category) || undefined,
      };
      await api.put(`${INVOICE_BASE}/${feeWaiverInvoice._id}`, payload, {}, true);
      showFlash('Fee waiver applied.');
      closeFeeWaiverDialog();
      await fetchInvoices();
    } catch (err) {
      showFlash(err.message || 'Failed to update invoice', 'error');
    } finally {
      setSavingFeeWaiver(false);
    }
  };

  const handleCancelInvoice = useCallback(
    async (invoice) => {
      if (!invoice?._id || invoice.status === 'paid') return;
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Mark this invoice as cancelled?')
          : true;
      if (!confirmed) return;
      try {
        setCancellingInvoiceId(invoice._id);
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
          category: financeCategoryId(full.category) || undefined,
        };
        await api.put(`${INVOICE_BASE}/${invoice._id}`, payload, {}, true);
        showFlash('Invoice cancelled.');
        await fetchInvoices();
      } catch (err) {
        showFlash(err.message || 'Failed to cancel invoice', 'error');
      } finally {
        setCancellingInvoiceId('');
      }
    },
    [fetchInvoices, showFlash],
  );

  const handleDeleteInvoice = useCallback(
    async (invoice) => {
      if (!invoice?._id) return;
      if (invoice.status === 'paid') {
        showFlash('Paid invoices cannot be deleted.', 'error');
        return;
      }
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Delete this invoice?')
          : true;
      if (!confirmed) return;
      try {
        setDeletingInvoiceId(invoice._id);
        await api.delete(`${INVOICE_BASE}/${invoice._id}`, {}, true);
        showFlash('Invoice deleted.');
        await fetchInvoices();
      } catch (err) {
        showFlash(err.message || 'Failed to delete invoice', 'error');
      } finally {
        setDeletingInvoiceId('');
      }
    },
    [fetchInvoices, showFlash],
  );

  const handleViewPayment = useCallback(
    (paymentId) => {
      router.push(`/app/payments/${paymentId}`);
    },
    [router],
  );

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
      header: 'Date',
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
      cell: ({ row }) => row.dueDate ? formatDateForDisplay(row.dueDate) : '-',
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      cell: ({ row }) => {
        const status = row.status || 'draft';
        const statusColors = {
          paid: 'bg-green-500/10 text-green-600 dark:text-green-400',
          overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
          sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
          draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
          cancelled: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
        };
        return (
          <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[status] || 'bg-gray-500/10 text-gray-600'}`}>
            {status}
          </span>
        );
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
      header: 'Paid',
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
        return (
          <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            {formatCurrency(balance)}
          </span>
        );
      },
    },
  ], []);

  // Define columns for Payments DataTable
  const paymentColumns = useMemo(() => [
    {
      id: 'paymentNumber',
      accessorKey: 'paymentNumber',
      header: 'Payment Number',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.status === 'completed' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : row.status === 'failed' ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : (
            <Clock className="h-4 w-4 text-yellow-600" />
          )}
          <span className="font-medium">{row.paymentNumber}</span>
        </div>
      ),
    },
    {
      id: 'paymentDate',
      accessorKey: 'paymentDate',
      header: 'Payment Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Amount',
      type: 'currency',
      formatOptions: {
        locale: 'en-IN',
        currency: 'INR',
      },
      searchable: false,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
      cell: ({ row }) => {
        const status = row.status || 'pending';
        const statusColors = {
          completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
          pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
          failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
          cancelled: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
        };
        return (
          <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[status] || 'bg-gray-500/10 text-gray-600'}`}>
            {status}
          </span>
        );
      },
    },
    {
      id: 'paymentMethod',
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      type: 'text',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
          {row.paymentMethod || '-'}
        </span>
      ),
    },
    {
      id: 'invoice',
      accessorKey: 'invoice',
      header: 'Invoice',
      type: 'text',
      cell: ({ row }) => {
        if (!row.invoice) return '-';
        return typeof row.invoice === 'object' ? row.invoice.invoiceNumber : row.invoice;
      },
    },
    {
      id: 'referenceNumber',
      accessorKey: 'referenceNumber',
      header: 'Reference',
      type: 'text',
      searchable: true,
    },
  ], []);

  // Define actions for Invoices DataTable (aligned with /app/invoices)
  const invoiceActions = useCallback(
    (row) => {
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
              <DropdownMenuItem onClick={() => router.push(`/app/invoices?edit=${row._id}`)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {canPay && (
              <DropdownMenuItem
                onClick={() => router.push(`/app/invoices/payments?invoiceId=${row._id}`)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment (Full Page)
              </DropdownMenuItem>
            )}
            {row.status !== 'cancelled' && (
              <DropdownMenuItem onClick={() => openFeeWaiverDialog(row)}>
                <Percent className="h-4 w-4 mr-2" />
                Fee Waiver
              </DropdownMenuItem>
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
                disabled={cancellingInvoiceId === row._id}
                className="text-amber-600 dark:text-amber-400 focus:text-amber-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {cancellingInvoiceId === row._id ? 'Cancelling...' : 'Cancel invoice'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isDraft && (
              <DropdownMenuItem
                onClick={() => handleDeleteInvoice(row)}
                disabled={deletingInvoiceId === row._id}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deletingInvoiceId === row._id ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    [
      rowBalance,
      router,
      handleViewInvoice,
      handleShareInvoice,
      handleDownloadInvoice,
      openEmailDialog,
      openFeeWaiverDialog,
      handleCancelInvoice,
      handleDeleteInvoice,
      cancellingInvoiceId,
      deletingInvoiceId,
    ],
  );

  // Define actions for Payments DataTable
  const paymentActions = useCallback(
    (row) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            handleViewPayment(row._id);
          }}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      </div>
    ),
    [handleViewPayment],
  );

  const resolvedCategory = useMemo(() => {
    if (!student?.category) return null;
    const c = student.category;
    if (typeof c === 'object' && c !== null) {
      const id = c._id || c.id;
      return {
        id: id != null ? String(id) : null,
        name: (c.name || '').trim() || '—',
        description: (c.description || '').trim(),
      };
    }
    const id = String(c);
    const fromList = studentCategories.find((x) => String(x._id || x.id) === id);
    return {
      id,
      name: (fromList?.name || '').trim() || 'Category',
      description: (fromList?.description || '').trim(),
    };
  }, [student, studentCategories]);

  const resolvedTags = useMemo(() => {
    if (!student?.tags || !Array.isArray(student.tags) || student.tags.length === 0) return [];
    return student.tags.map((t, idx) => {
      if (typeof t === 'object' && t !== null && (t.name || t._id || t.id)) {
        const id = t._id || t.id;
        return {
          key: id != null ? String(id) : `tag-${idx}`,
          id: id != null ? String(id) : null,
          name: (t.name || '').trim() || 'Tag',
          color: tagSwatchColor(t),
        };
      }
      const id = String(t);
      const fromList = studentTags.find((x) => String(x._id || x.id) === id);
      return {
        key: id,
        id,
        name: (fromList?.name || '').trim() || 'Tag',
        color: tagSwatchColor(fromList || { color: '' }),
      };
    });
  }, [student, studentTags]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading student details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Student not found'}</p>
            <Button onClick={() => router.push('/app/students')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/app/students')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
            {getStudentPhotoUrl(student.image ?? student.photo, API_URL) ? (
              <img
                src={getStudentPhotoUrl(student.image ?? student.photo, API_URL)}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{student.name}</h1>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  student.isActive
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                }`}
              >
                {student.isActive ? 'Active' : 'Inactive'}
              </span>
              {student.enrollmentStatus && (
                <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">
                  {student.enrollmentStatus}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              Student ID: <span className="font-semibold">{student.studentId || student.rollNumber || 'N/A'}</span>
            </p>
            {(resolvedCategory || resolvedTags.length > 0) && (
              <div className="mt-3 flex flex-col gap-2.5 max-w-3xl">
                {resolvedCategory && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">Category</span>
                    {resolvedCategory.id ? (
                      <Link
                        href={`/app/students/categories/${resolvedCategory.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/5 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Bookmark className="h-3.5 w-3.5 shrink-0" />
                        {resolvedCategory.name}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-sm font-medium">
                        <Bookmark className="h-3.5 w-3.5 shrink-0" />
                        {resolvedCategory.name}
                      </span>
                    )}
                  </div>
                )}
                {resolvedTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Tags className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                    <div className="flex flex-wrap gap-1.5">
                      {resolvedTags.map((tg) => (
                        <span
                          key={tg.key}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium"
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0 ring-1 ring-border"
                            style={{ backgroundColor: tg.color }}
                            aria-hidden
                          />
                          {tg.name}
                        </span>
                      ))}
                    </div>
                    <Link
                      href="/app/students/tags"
                      className="text-xs text-primary hover:underline ml-1"
                    >
                      Manage tags
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchStudentDetails();
              fetchInvoices();
              fetchPayments();
            }}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleEditClick}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Student
          </Button>
        </div>
      </div>

      {flash && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            flash.type === 'success'
              ? 'border-green-200 bg-green-500/10 text-green-800 dark:border-green-900 dark:text-green-200'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {flash.text}
        </div>
      )}

      {/* Student Information */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{student.email || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{student.phone || '-'}</p>
            </div>
          </div>
          {student.alternatePhone && (
            <div>
              <p className="text-sm text-muted-foreground">Alternate Phone</p>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{student.alternatePhone}</p>
              </div>
            </div>
          )}
          {student.dateOfBirth && (
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{formatDateForDisplay(student.dateOfBirth)}</p>
              </div>
            </div>
          )}
          {student.gender && (
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium mt-1 capitalize">{student.gender}</p>
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-border bg-muted/20 p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Bookmark className="h-4 w-4 text-primary" />
              Category & tags
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Student category</p>
                {resolvedCategory ? (
                  <div className="space-y-1">
                    {resolvedCategory.id ? (
                      <Link
                        href={`/app/students/categories/${resolvedCategory.id}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Bookmark className="h-4 w-4 shrink-0" />
                        {resolvedCategory.name}
                      </Link>
                    ) : (
                      <p className="font-semibold">{resolvedCategory.name}</p>
                    )}
                    {resolvedCategory.description ? (
                      <p className="text-sm text-muted-foreground">{resolvedCategory.description}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No category assigned. Use Edit student to set one.</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Tags</p>
                {resolvedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {resolvedTags.map((tg) => (
                      <span
                        key={tg.key}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background pl-1 pr-3 py-1 text-sm font-medium shadow-sm"
                      >
                        <span
                          className="h-6 w-6 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: tg.color }}
                          aria-hidden
                        />
                        {tg.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags assigned.</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  Edit this student to change category or tags, or{' '}
                  <Link href="/app/students/tags" className="text-primary font-medium hover:underline">
                    open the tags page
                  </Link>{' '}
                  to manage tag definitions.
                </p>
              </div>
            </div>
          </div>

          {student.address && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">Address</p>
              <div className="flex items-start gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  {student.address.street && <p className="font-medium">{student.address.street}</p>}
                  <p className="text-sm text-muted-foreground">
                    {[student.address.city, student.address.state, student.address.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Information */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Enrollment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {course && (
            <div>
              <p className="text-sm text-muted-foreground">Course</p>
              <div className="flex items-center gap-2 mt-1">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{course.name}</p>
                  <p className="text-xs text-muted-foreground">Batch: {course.batch}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-2"
                onClick={() => router.push(`/app/courses/${course._id || course.id}`)}
              >
                View Course Details
              </Button>
            </div>
          )}
          {student.enrollmentDate && (
            <div>
              <p className="text-sm text-muted-foreground">Enrollment Date</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{formatDateForDisplay(student.enrollmentDate)}</p>
              </div>
            </div>
          )}
          {student.graduationDate && (
            <div>
              <p className="text-sm text-muted-foreground">Graduation Date</p>
              <div className="flex items-center gap-2 mt-1">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{formatDateForDisplay(student.graduationDate)}</p>
              </div>
            </div>
          )}
          {student.enrollmentStatus && (
            <div>
              <p className="text-sm text-muted-foreground">Enrollment Status</p>
              <p className="font-medium mt-1 capitalize">{student.enrollmentStatus}</p>
            </div>
          )}
        </div>
      </div>

      {/* Guardian Information */}
      {student.guardianInfo && (student.guardianInfo.name || student.guardianInfo.phone) && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Guardian Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {student.guardianInfo.name && (
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium mt-1">{student.guardianInfo.name}</p>
              </div>
            )}
            {student.guardianInfo.relationship && (
              <div>
                <p className="text-sm text-muted-foreground">Relationship</p>
                <p className="font-medium mt-1 capitalize">{student.guardianInfo.relationship}</p>
              </div>
            )}
            {student.guardianInfo.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{student.guardianInfo.phone}</p>
                </div>
              </div>
            )}
            {student.guardianInfo.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{student.guardianInfo.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold mt-1">{stats.invoices.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(stats.invoices.totalAmount)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats.invoices.paidAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.invoices.paid} paid
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(stats.invoices.balanceAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.invoices.pending + stats.invoices.overdue} pending
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold mt-1">{stats.payments.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(stats.payments.totalAmount)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Generated Invoices</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/app/invoices?studentId=${studentId}`)}
              className="gap-2"
            >
              View All
            </Button>
          </div>
        </div>
        <DataTable
          data={invoices}
          columns={invoiceColumns}
          actions={invoiceActions}
          loading={false}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey={`student-${studentId}-invoices-table`}
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No invoices found for this student"
        />
      </div>

      {/* Payment History */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Payment History</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/app/payments?studentId=${studentId}`)}
              className="gap-2"
            >
              View All
            </Button>
          </div>
        </div>
        <DataTable
          data={payments}
          columns={paymentColumns}
          actions={paymentActions}
          loading={false}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey={`student-${studentId}-payments-table`}
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No payment records found for this student"
        />
      </div>

      {/* Fee Waiver — same flow as /app/invoices */}
      <Dialog
        open={feeWaiverOpen}
        onOpenChange={(open) => {
          if (!open) closeFeeWaiverDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Fee Waiver
            </DialogTitle>
            <DialogDescription>
              {feeWaiverInvoice && (
                <span>
                  Set discount and notes for invoice{' '}
                  <strong>{feeWaiverInvoice.invoiceNumber || feeWaiverInvoice._id}</strong>
                  {feeWaiverInvoice.billTo?.name && ` — ${feeWaiverInvoice.billTo.name}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {feeWaiverInvoice && (
            <form onSubmit={handleFeeWaiverSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Discount</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={feeWaiverDiscount}
                  onChange={(e) => setFeeWaiverDiscount(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">Amount waived (same as invoice discount).</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={feeWaiverNotes}
                  onChange={(e) => setFeeWaiverNotes(e.target.value)}
                  placeholder="Reason or details for this waiver"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[88px]"
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeFeeWaiverDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingFeeWaiver}>
                  {savingFeeWaiver ? 'Saving...' : 'Apply'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEmailDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowEmailDialog(false);
            setEmailInvoice(null);
            setEmailTo('');
          }
        }}
      >
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEmailDialog(false);
                    setEmailInvoice(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Open email</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Form Modal */}
      {showEditForm && (
        <StudentForm
          formData={formData}
          formErrors={formErrors}
          courses={courses}
          studentCategories={studentCategories}
          studentTags={studentTags}
          onTagToggle={handleTagToggle}
          editingStudent={student}
          saving={saving}
          error={formError}
          success={formSuccess}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          onCancel={resetForm}
          photoDisplayUrl={photoPreviewDataUrl || getStudentPhotoUrl(formData.photo, API_URL)}
          onPhotoChange={handlePhotoChange}
          onPhotoUpload={handlePhotoUpload}
          onPhotoClear={handlePhotoClear}
          uploadingPhoto={uploadingPhoto}
          hasSelectedPhoto={!!selectedPhotoFile}
          hasCurrentPhoto={!!formData.photo}
          photoInputRef={photoInputRef}
        />
      )}
    </div>
  );
}

