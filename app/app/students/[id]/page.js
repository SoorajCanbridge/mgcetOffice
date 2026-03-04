'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { api, API_URL, deleteUploadedFile } from '@/lib/api';
import { getStudentPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import StudentForm from '@/components/student-form';

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

  const fetchCourses = useCallback(async () => {
    if (!user?.college) return;
    try {
      const collegeId = typeof user.college === 'object' ? (user.college._id || user.college.id || '') : String(user.college);
      const response = await api.get(`/academic/courses?college=${collegeId}`, {}, true);
      const data = response?.data || response || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setCourses([]);
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
  }, [user?.college, studentId, fetchStudentDetails, fetchCourses]);

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
        college: user.college,
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

  // Define actions for Invoices DataTable
  const invoiceActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/app/invoices?invoiceId=${row._id}`);
        }}
      >
        View
      </Button>
    </div>
  ), [router]);

  // Define actions for Payments DataTable
  const paymentActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/app/payments?paymentId=${row._id}`);
        }}
      >
        View
      </Button>
    </div>
  ), [router]);

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

      {/* Edit Student Form Modal */}
      {showEditForm && (
        <StudentForm
          formData={formData}
          formErrors={formErrors}
          courses={courses}
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

