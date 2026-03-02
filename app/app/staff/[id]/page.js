'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  DollarSign,
  TrendingUp,
  RefreshCcw,
  Edit2,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  Building2,
  Briefcase,
  Award,
  ClipboardCheck,
  Calculator,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getStaffPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import StaffForm from '@/components/staff-form';
import { X } from 'lucide-react';

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

const formatTimeForDisplay = (time) => {
  if (!time) return '-';
  try {
    if (typeof time === 'string') {
      return time.substring(0, 5);
    }
    return time;
  } catch {
    return '-';
  }
};

// Helper function to get date key (YYYY-MM-DD)
const getDateKey = (date) => {
  if (!date) return null;
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return null;
  }
};

// Helper function to generate calendar weeks for 3 months
const generateCalendarWeeks = (startDate) => {
  const weeks = [];
  const currentDate = new Date(startDate);
  currentDate.setDate(1); // Start from first day of month
  
  // Go back to the first Monday of the week
  const dayOfWeek = currentDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentDate.setDate(currentDate.getDate() - daysToMonday);
  
  // Generate 3 months (approximately 13-14 weeks)
  const endDate = new Date(currentDate);
  endDate.setMonth(endDate.getMonth() + 3);
  
  let weekStart = new Date(currentDate);
  
  while (weekStart < endDate) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      week.push(new Date(day));
    }
    weeks.push(week);
    weekStart.setDate(weekStart.getDate() + 7);
  }
  
  return weeks;
};

// Get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'present':
      return 'bg-green-500/20 border-green-500/40';
    case 'absent':
      return 'bg-red-500/20 border-red-500/40';
    case 'leave':
      return 'bg-yellow-500/20 border-yellow-500/40';
    case 'half-day':
      return 'bg-blue-500/20 border-blue-500/40';
    case 'late':
      return 'bg-orange-500/20 border-orange-500/40';
    default:
      return 'bg-gray-500/10 border-gray-500/20';
  }
};

const getStaffId = (staff) => staff._id || staff.id;

export default function StaffDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const staffId = params?.id;

  const [staff, setStaff] = useState(null);
  const [courses, setCourses] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);

  const fetchCourses = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get(`/academic/courses?college=${user.college}`, {}, true);
      const data = response?.data || response || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setCourses([]);
    }
  }, [user?.college]);

  const fetchStaffDetails = useCallback(async () => {
    if (!staffId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/teachers/${staffId}`, {}, true);
      const data = response?.data || response;
      setStaff(data);
    } catch (err) {
      setError(err.message || 'Failed to load staff details');
    } finally {
      setLoading(false);
    }
  }, [staffId, user?.college]);

  const fetchAttendances = useCallback(async () => {
    if (!staffId || !user?.college) return;
    try {
      const response = await api.get(`/teachers/attendance?teacherId=${staffId}&limit=100`, {}, true);
      const data = response?.data || response || [];
      setAttendances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load attendances:', err);
      setAttendances([]);
    }
  }, [staffId, user?.college]);

  const fetchAttendanceSummary = useCallback(async () => {
    if (!staffId || !user?.college) return;
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await api.get(
        `/teachers/attendance/summary?teacherId=${staffId}&month=${month}&year=${year}`,
        {},
        true,
      );
      const data = response?.data || response;
      setAttendanceSummary(data);
    } catch (err) {
      console.error('Failed to load attendance summary:', err);
    }
  }, [staffId, user?.college]);

  const fetchPayrolls = useCallback(async () => {
    if (!staffId || !user?.college) return;
    try {
      const response = await api.get(`/teachers/payroll?teacherId=${staffId}`, {}, true);
      const data = response?.data || response || [];
      setPayrolls(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load payrolls:', err);
      setPayrolls([]);
    }
  }, [staffId, user?.college]);

  const calculateStats = useCallback(() => {
    if (!staff) return;

    // Attendance stats
    const totalAttendances = attendances.length;
    const presentDays = attendances.filter((a) => a.status === 'present').length;
    const absentDays = attendances.filter((a) => a.status === 'absent').length;
    const leaveDays = attendances.filter((a) => a.status === 'leave').length;
    const halfDays = attendances.filter((a) => a.status === 'half-day').length;

    // Payroll stats
    const totalPayrolls = payrolls.length;
    const paidPayrolls = payrolls.filter((p) => p.status === 'paid').length;
    const pendingPayrolls = payrolls.filter((p) => p.status === 'pending' || p.status === 'draft').length;
    const totalPaidAmount = payrolls
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const totalPendingAmount = payrolls
      .filter((p) => p.status === 'pending' || p.status === 'draft')
      .reduce((sum, p) => sum + (p.netSalary || 0), 0);

    setStats({
      attendance: {
        total: totalAttendances,
        present: presentDays,
        absent: absentDays,
        leave: leaveDays,
        halfDay: halfDays,
      },
      payroll: {
        total: totalPayrolls,
        paid: paidPayrolls,
        pending: pendingPayrolls,
        totalPaidAmount,
        totalPendingAmount,
      },
    });
  }, [staff, attendances, payrolls]);

  useEffect(() => {
    if (!user?.college) return;
    fetchStaffDetails();
    fetchCourses();
  }, [user?.college, staffId, fetchStaffDetails, fetchCourses]);

  useEffect(() => {
    if (staffId) {
      fetchAttendances();
      fetchAttendanceSummary();
      fetchPayrolls();
    }
  }, [staffId, fetchAttendances, fetchAttendanceSummary, fetchPayrolls]);

  useEffect(() => {
    if (staff && attendances.length >= 0 && payrolls.length >= 0) {
      calculateStats();
    }
  }, [staff, attendances, payrolls, calculateStats]);

  // Generate calendar attendance view
  const calendarAttendanceView = useMemo(() => {
    // Create attendance map by date
    const attendanceMap = new Map();
    attendances.forEach((attendance) => {
      const dateKey = getDateKey(attendance.date);
      if (dateKey) {
        attendanceMap.set(dateKey, attendance);
      }
    });

    // Generate calendar for last 3 months
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 2);
    startDate.setDate(1);
    
    // Generate all dates for 3 months continuously
    const allDates = [];
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of current month
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Sunday to Saturday repeated twice for optimization
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return { attendanceMap, allDates, dayNames, today, startDate };
  }, [attendances]);

  // Define columns for Attendance DataTable
  const attendanceColumns = useMemo(
    () => [
      {
        id: 'date',
        accessorKey: 'date',
        header: 'Date',
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
        filterOptions: [
          { value: 'present', label: 'Present' },
          { value: 'absent', label: 'Absent' },
          { value: 'leave', label: 'Leave' },
          { value: 'half-day', label: 'Half Day' },
        ],
        cell: ({ row }) => {
          const status = row.status || 'present';
          const statusColors = {
            present: 'bg-green-500/10 text-green-600 dark:text-green-400',
            absent: 'bg-red-500/10 text-red-600 dark:text-red-400',
            leave: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
            'half-day': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
          };
          return (
            <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[status] || 'bg-gray-500/10 text-gray-600'}`}>
              {status}
            </span>
          );
        },
      },
      {
        id: 'checkIn',
        accessorKey: 'checkIn',
        header: 'Check In',
        type: 'text',
        cell: ({ row }) => (row.checkIn ? formatTimeForDisplay(row.checkIn) : '-'),
      },
      {
        id: 'checkOut',
        accessorKey: 'checkOut',
        header: 'Check Out',
        type: 'text',
        cell: ({ row }) => (row.checkOut ? formatTimeForDisplay(row.checkOut) : '-'),
      },
      {
        id: 'workingHours',
        accessorKey: 'workingHours',
        header: 'Working Hours',
        type: 'number',
        cell: ({ row }) => (row.workingHours ? `${row.workingHours} hrs` : '-'),
      },
      {
        id: 'leaveType',
        accessorKey: 'leaveType',
        header: 'Leave Type',
        type: 'text',
        cell: ({ row }) =>
          row.leaveType ? (
            <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-600 capitalize">
              {row.leaveType}
            </span>
          ) : (
            '-'
          ),
      },
      {
        id: 'remarks',
        accessorKey: 'remarks',
        header: 'Remarks',
        type: 'text',
        searchable: true,
        cell: ({ row }) => row.remarks || '-',
      },
    ],
    [],
  );

  // Define columns for Payroll DataTable
  const payrollColumns = useMemo(
    () => [
      {
        id: 'payrollNumber',
        accessorKey: 'payrollNumber',
        header: 'Payroll Number',
        type: 'text',
        searchable: true,
      },
      {
        id: 'period',
        accessorKey: 'month',
        header: 'Period',
        type: 'text',
        cell: ({ row }) => `${row.month || '-'}/${row.year || '-'}`,
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
          { value: 'pending', label: 'Pending' },
          { value: 'paid', label: 'Paid' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        cell: ({ row }) => {
          const status = row.status || 'draft';
          const statusColors = {
            paid: 'bg-green-500/10 text-green-600 dark:text-green-400',
            pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
            draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
            cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
          };
          return (
            <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[status] || 'bg-gray-500/10 text-gray-600'}`}>
              {status}
            </span>
          );
        },
      },
      {
        id: 'baseSalary',
        accessorKey: 'baseSalary',
        header: 'Base Salary',
        type: 'currency',
        formatOptions: {
          locale: 'en-IN',
          currency: 'INR',
        },
        searchable: false,
      },
      {
        id: 'grossSalary',
        accessorKey: 'grossSalary',
        header: 'Gross Salary',
        type: 'currency',
        formatOptions: {
          locale: 'en-IN',
          currency: 'INR',
        },
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
        cell: ({ row }) => {
          const net = row.netSalary || 0;
          return <span className="font-semibold text-primary">{formatCurrency(net)}</span>;
        },
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Created Date',
        type: 'date',
        formatOptions: {
          locale: 'en-US',
        },
      },
    ],
    [],
  );

  // Define actions for Attendance DataTable
  const attendanceActions = useCallback(
    (row) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/app/staff-attendance?attendanceId=${row._id}`);
          }}
        >
          View
        </Button>
      </div>
    ),
    [router],
  );

  // Define actions for Payroll DataTable
  const payrollActions = useCallback(
    (row) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/app/payroll/${row._id}`);
          }}
        >
          View
        </Button>
      </div>
    ),
    [router],
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading staff details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Staff not found'}</p>
            <Button onClick={() => router.push('/app/staff')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Staff
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
          <Button variant="outline" size="icon" onClick={() => router.push('/app/staff')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border border-border">
            {getStaffPhotoUrl(staff.image ?? staff.photo, API_URL) ? (
              <img
                src={getStaffPhotoUrl(staff.image ?? staff.photo, API_URL)}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{staff.name}</h1>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  staff.isActive
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                }`}
              >
                {staff.isActive ? 'Active' : 'Inactive'}
              </span>
              {staff.employmentStatus && (
                <span
                  className={`text-xs px-2 py-1 rounded capitalize ${
                    staff.employmentStatus === 'active'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : staff.employmentStatus === 'on-leave'
                      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {staff.employmentStatus}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              Employee ID: <span className="font-semibold">{staff.employeeId || 'N/A'}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchStaffDetails();
              fetchAttendances();
              fetchAttendanceSummary();
              fetchPayrolls();
            }}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowEditForm(true)} className="gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Staff
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Attendance</p>
                <p className="text-2xl font-bold mt-1">{stats.attendance.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.attendance.present} present
                </p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payrolls</p>
                <p className="text-2xl font-bold mt-1">{stats.payroll.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.payroll.paid} paid
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats.payroll.totalPaidAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {formatCurrency(stats.payroll.totalPendingAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.payroll.pending} pending
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{staff.email || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{staff.phone || '-'}</p>
            </div>
          </div>
          {staff.alternatePhone && (
            <div>
              <p className="text-sm text-muted-foreground">Alternate Phone</p>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{staff.alternatePhone}</p>
              </div>
            </div>
          )}
          {staff.dateOfBirth && (
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{formatDateForDisplay(staff.dateOfBirth)}</p>
              </div>
            </div>
          )}
          {staff.gender && (
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium mt-1 capitalize">{staff.gender}</p>
            </div>
          )}
          {staff.address && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground">Address</p>
              <div className="flex items-start gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  {staff.address.street && <p className="font-medium">{staff.address.street}</p>}
                  <p className="text-sm text-muted-foreground">
                    {[staff.address.city, staff.address.state, staff.address.pincode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Professional Information */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Professional Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{staff.department || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Designation</p>
            <div className="flex items-center gap-2 mt-1">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium capitalize">{staff.designation || '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Staff Type</p>
            <p className="font-medium mt-1 capitalize">{staff.staffType || '-'}</p>
          </div>
          {staff.joiningDate && (
            <div>
              <p className="text-sm text-muted-foreground">Joining Date</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{formatDateForDisplay(staff.joiningDate)}</p>
              </div>
            </div>
          )}
          {staff.salary && (
            <div>
              <p className="text-sm text-muted-foreground">Salary</p>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{formatCurrency(staff.salary)}</p>
              </div>
            </div>
          )}
          {staff.experience && (
            <>
              {staff.experience.totalYears && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Experience</p>
                  <p className="font-medium mt-1">{staff.experience.totalYears} years</p>
                </div>
              )}
              {staff.experience.teachingYears && (
                <div>
                  <p className="text-sm text-muted-foreground">Teaching Experience</p>
                  <p className="font-medium mt-1">{staff.experience.teachingYears} years</p>
                </div>
              )}
              {staff.experience.industryYears && (
                <div>
                  <p className="text-sm text-muted-foreground">Industry Experience</p>
                  <p className="font-medium mt-1">{staff.experience.industryYears} years</p>
                </div>
              )}
            </>
          )}
          {Array.isArray(staff.specialization) && staff.specialization.length > 0 && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground mb-1">Specialization</p>
              <div className="flex flex-wrap gap-2">
                {staff.specialization.map((spec, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(staff.courses) && staff.courses.length > 0 && (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-sm text-muted-foreground mb-1">Assigned Courses</p>
              <div className="flex flex-wrap gap-2">
                {staff.courses.map((course, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  >
                    {typeof course === 'object' ? `${course.name}${course.batch ? ` (${course.batch})` : ''}` : course}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Attendance Summary */}
      {attendanceSummary && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Attendance Summary (Current Month)
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/app/staff-attendance?staffId=${staffId}`)}
              className="gap-2"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Present</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {attendanceSummary.presentDays || 0}
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Absent</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {attendanceSummary.absentDays || 0}
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Leave</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {attendanceSummary.leaveDays || 0}
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Half Days</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {attendanceSummary.halfDays || 0}
              </p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Days</p>
              <p className="text-2xl font-bold mt-1">{attendanceSummary.totalDays || 0}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Attendance %</p>
              <p className="text-2xl font-bold mt-1">
                {attendanceSummary.attendancePercentage || 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records - Calendar View */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Attendance Records (Last 3 Months)</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {attendances.length} record{attendances.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/app/staff-attendance?staffId=${staffId}`)}
              className="gap-2"
            >
              View All
            </Button>
          </div>
        </div>
        
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {calendarAttendanceView.dayNames.map((day) => (
                    <th
                      key={day}
                      className="border border-border p-2 text-xs font-medium bg-muted/50 dark:bg-muted/30 text-center min-w-[60px] text-foreground"
                    >
                      {day}
                    </th>
                  ))}                 
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Distribute dates continuously across rows (14 columns per row: Sun-Sat, Sun-Sat)
                  const rows = [];
                  const allDates = calendarAttendanceView.allDates || [];
                  const COLUMNS_PER_ROW = 14; // Sun-Sat, Sun-Sat
                  
                  // Calculate blank cells needed at the start based on the starting date's day of week
                  // getDay() returns: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
                  const startDate = calendarAttendanceView.startDate;
                  const startDayOfWeek = startDate ? startDate.getDay() : 0; // 0 = Sunday
                  const initialBlankCells = startDayOfWeek; // Number of blank cells before first date
                  
                  // Helper function to render a date cell
                  const renderDateCell = (day, cellIndex, rowIndex) => {
                    const dateKey = getDateKey(day);
                    const attendance = dateKey ? calendarAttendanceView.attendanceMap.get(dateKey) : null;
                    const isToday = dateKey === getDateKey(new Date());
                    const isFirstOfMonth = day.getDate() === 1;
                    const isCurrentMonth = day.getMonth() === calendarAttendanceView.today.getMonth() && day.getFullYear() === calendarAttendanceView.today.getFullYear();
                    const isPastMonth = day < calendarAttendanceView.startDate || (day.getMonth() < calendarAttendanceView.today.getMonth() - 2 && day.getFullYear() === calendarAttendanceView.today.getFullYear());
                    
                    const status = attendance?.status || 'no-data';
                    const bgColor = attendance ? getStatusColor(status) : (isPastMonth ? 'bg-muted/10 dark:bg-muted/5 border-muted/20' : 'bg-transparent border-border/30');
                    
                    // Get month name abbreviation
                    const monthName = day.toLocaleDateString('en-US', { month: 'short' });

                    return (
                      <td
                        key={`${rowIndex}-${cellIndex}`}
                        className={`border border-border p-0 relative ${bgColor} ${isToday ? 'ring-2 ring-primary ring-offset-1 border-t-2 border-r-2' : ''} ${!isCurrentMonth ? 'opacity-50' : ''}`}
                        style={{ minWidth: '60px', height: '60px' }}
                      >
                        <div 
                          className="w-full h-full p-1 cursor-pointer hover:bg-muted/20 dark:hover:bg-muted/30 transition-colors relative"
                          onClick={() => {
                            if (attendance || !attendance) {
                              setSelectedAttendance({ day, attendance });
                            }
                          }}
                        >
                          {/* Month label - top left, only on 1st of month */}
                          {isFirstOfMonth && (
                            <div className="text-[7px] font-semibold text-primary dark:text-primary/90 absolute top-0 left-0 px-1 py-0.5 bg-primary/10 dark:bg-primary/20 rounded-br z-20">
                              {monthName}
                            </div>
                          )}
                          
                          {/* Date number - bottom right */}
                          <div className={`text-[9px] font-medium absolute bottom-0.5 right-0.5 px-1 z-10 ${
                            isToday 
                              ? 'font-bold text-primary dark:text-primary' 
                              : 'text-foreground/70 dark:text-foreground/60'
                          }`}>
                            {day.getDate()}
                          </div>
                          
                          {/* Status indicator - positioned to avoid overlap with month label */}
                          {attendance && (
                            <div className={`absolute z-10 ${isFirstOfMonth ? 'top-3 left-0.5' : 'top-0.5 left-0.5'}`}>
                              <div className={`w-2.5 h-2.5 rounded-full ${
                                status === 'present' ? 'bg-green-500 dark:bg-green-400' : 
                                status === 'absent' ? 'bg-red-500 dark:bg-red-400' : 
                                status === 'leave' ? 'bg-yellow-500 dark:bg-yellow-400' : 
                                status === 'half-day' ? 'bg-blue-500 dark:bg-blue-400' : 
                                status === 'late' ? 'bg-orange-500 dark:bg-orange-400' : 
                                'bg-muted-foreground/40'
                              }`} />
                            </div>
                          )}
                          
                          {/* Today indicator - top right, only if today */}
                          {isToday && (
                            <div className="absolute top-0.5 right-0.5 z-10">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary ring-1 ring-primary dark:ring-primary/50 ring-offset-1"></div>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  };
                  
                  // Helper function to render a blank cell
                  const renderBlankCell = (cellIndex, rowIndex) => (
                    <td 
                      key={`blank-${rowIndex}-${cellIndex}`} 
                      className="border border-border p-0 bg-muted/20 dark:bg-muted/10" 
                      style={{ minWidth: '60px', height: '60px' }}
                    />
                  );
                  
                  // Process dates and create rows
                  let dateIndex = 0;
                  let rowIndex = 0;
                  
                  // First row: add initial blank cells, then dates
                  if (allDates.length > 0) {
                    const firstRowCells = [];
                    
                    // Add blank cells for days before the starting date
                    for (let i = 0; i < initialBlankCells; i++) {
                      firstRowCells.push(renderBlankCell(i, rowIndex));
                    }
                    
                    // Add dates for the remaining cells in the first row
                    const remainingCellsInFirstRow = COLUMNS_PER_ROW - initialBlankCells;
                    for (let i = 0; i < remainingCellsInFirstRow && dateIndex < allDates.length; i++) {
                      firstRowCells.push(renderDateCell(allDates[dateIndex], initialBlankCells + i, rowIndex));
                      dateIndex++;
                    }
                    
                    // Fill remaining cells if row is not full
                    while (firstRowCells.length < COLUMNS_PER_ROW) {
                      firstRowCells.push(renderBlankCell(firstRowCells.length, rowIndex));
                    }
                    
                    rows.push(<tr key={rowIndex}>{firstRowCells}</tr>);
                    rowIndex++;
                  }
                  
                  // Subsequent rows: fill with dates continuously
                  while (dateIndex < allDates.length) {
                    const rowCells = [];
                    const datesInThisRow = Math.min(COLUMNS_PER_ROW, allDates.length - dateIndex);
                    
                    for (let i = 0; i < datesInThisRow; i++) {
                      rowCells.push(renderDateCell(allDates[dateIndex], i, rowIndex));
                      dateIndex++;
                    }
                    
                    // Fill remaining cells if row is not full
                    while (rowCells.length < COLUMNS_PER_ROW) {
                      rowCells.push(renderBlankCell(rowCells.length, rowIndex));
                    }
                    
                    rows.push(<tr key={rowIndex}>{rowCells}</tr>);
                    rowIndex++;
                  }
                  
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="font-medium">Legend:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>No Record</span>
              </div>
            </div>
          </div>
      </div>

      {/* Payroll Records */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Payroll Records</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {payrolls.length} payroll{payrolls.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/app/payroll?staffId=${staffId}`)}
              className="gap-2"
            >
              View All
            </Button>
          </div>
        </div>
        <DataTable
          data={payrolls}
          columns={payrollColumns}
          actions={payrollActions}
          loading={false}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey={`staff-${staffId}-payroll-table`}
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No payroll records found for this staff member"
        />
      </div>

      {/* Edit Staff Form Modal */}
      {showEditForm && (
        <StaffForm
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          editingStaff={staff}
          courses={courses}
          onSuccess={() => {
            setShowEditForm(false);
            fetchStaffDetails();
          }}
        />
      )}

            {/* Qualifications */}
            {Array.isArray(staff.qualifications) && staff.qualifications.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Qualifications
          </h2>
          <div className="space-y-4">
            {staff.qualifications.map((qual, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Degree</p>
                    <p className="font-medium mt-1">{qual.degree || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Institution</p>
                    <p className="font-medium mt-1">{qual.institution || '-'}</p>
                  </div>
                  {qual.year && (
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-medium mt-1">{qual.year}</p>
                    </div>
                  )}
                  {qual.percentage !== undefined && qual.percentage !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground">Percentage</p>
                      <p className="font-medium mt-1">{qual.percentage}%</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      {staff.emergencyContact && (staff.emergencyContact.name || staff.emergencyContact.phone) && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {staff.emergencyContact.name && (
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium mt-1">{staff.emergencyContact.name}</p>
              </div>
            )}
            {staff.emergencyContact.relation && (
              <div>
                <p className="text-sm text-muted-foreground">Relation</p>
                <p className="font-medium mt-1 capitalize">{staff.emergencyContact.relation}</p>
              </div>
            )}
            {staff.emergencyContact.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{staff.emergencyContact.phone}</p>
                </div>
              </div>
            )}
            {staff.emergencyContact.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{staff.emergencyContact.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance Details Modal */}
      {selectedAttendance && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAttendance(null)}
        >
          <div 
            className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Attendance Details
              </h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedAttendance(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selectedAttendance.attendance ? (
              <div className="space-y-4">
                {/* Date */}
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold text-foreground">{formatDateForDisplay(selectedAttendance.attendance.date)}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                      selectedAttendance.attendance.status === 'present' 
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                        : selectedAttendance.attendance.status === 'absent'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : selectedAttendance.attendance.status === 'leave'
                        ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                        : selectedAttendance.attendance.status === 'half-day'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : selectedAttendance.attendance.status === 'late'
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {selectedAttendance.attendance.status ? selectedAttendance.attendance.status.charAt(0).toUpperCase() + selectedAttendance.attendance.status.slice(1) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Check In */}
                {selectedAttendance.attendance.checkIn && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Check In</p>
                      <p className="font-medium text-foreground">{formatTimeForDisplay(selectedAttendance.attendance.checkIn)}</p>
                    </div>
                  </div>
                )}

                {/* Check Out */}
                {selectedAttendance.attendance.checkOut && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Check Out</p>
                      <p className="font-medium text-foreground">{formatTimeForDisplay(selectedAttendance.attendance.checkOut)}</p>
                    </div>
                  </div>
                )}

                {/* Working Hours */}
                {selectedAttendance.attendance.workingHours && (
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Total Working Hours</p>
                      <p className="font-semibold text-foreground text-lg">{selectedAttendance.attendance.workingHours} hrs</p>
                    </div>
                  </div>
                )}

                {/* Leave Type */}
                {selectedAttendance.attendance.leaveType && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Leave Type</p>
                      <p className="font-medium text-foreground capitalize">{selectedAttendance.attendance.leaveType}</p>
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {selectedAttendance.attendance.remarks && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Remarks</p>
                    <p className="text-sm text-foreground bg-muted/50 dark:bg-muted/30 p-3 rounded-md">
                      {selectedAttendance.attendance.remarks}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-semibold text-foreground text-lg mb-1">
                    {formatDateForDisplay(selectedAttendance.day)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    No attendance record for this date
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

