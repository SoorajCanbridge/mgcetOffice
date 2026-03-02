'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ClipboardCheck,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCcw,
  Search,
  Eye,
  Filter,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';

const ATTENDANCE_BASE = '/teachers/attendance';

const EMPTY_ATTENDANCE = {
  date: '',
  status: 'present',
  checkIn: '',
  checkOut: '',
  workingHours: '',
  leaveType: '',
  remarks: '',
  staff: '',
};

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'Leave' },
  { value: 'half-day', label: 'Half Day' },
];

const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
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

const formatTimeForInput = (time) => {
  if (!time) return '';
  try {
    if (typeof time === 'string' && time.includes('T')) {
      return time.split('T')[1]?.substring(0, 5) || '';
    }
    return time;
  } catch {
    return '';
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

const formatTimeForDisplay = (time) => {
  if (!time) return '';
  try {
    if (typeof time === 'string') {
      return time.substring(0, 5);
    }
    return time;
  } catch {
    return '';
  }
};

export default function StaffAttendancePage() {
  const { user } = useAuth();

  const [attendances, setAttendances] = useState([]);
  const [staff, setStaff] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [viewingAttendance, setViewingAttendance] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    staffId: '',
    status: '',
    startDate: '',
    endDate: '',
    month: '',
    year: new Date().getFullYear().toString(),
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const [attendanceForm, setAttendanceForm] = useState(EMPTY_ATTENDANCE);

  const [summaryFilters, setSummaryFilters] = useState({
    staffId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const fetchStaff = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/teachers?limit=1000', {}, true);
      const data = response?.data || response || [];
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  }, [user?.college]);

  const fetchAttendances = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();

      if (filters.staffId) params.append('staffId', filters.staffId);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);

      const response = await api.get(
        `${ATTENDANCE_BASE}?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response || [];
      const list = Array.isArray(data) ? data : [];

      setAttendances(list);
    } catch (err) {
      setError(err.message || 'Failed to load attendances');
    } finally {
      setLoading(false);
    }
  }, [
    user?.college,
    filters.staffId,
    filters.status,
    filters.startDate,
    filters.endDate,
    filters.month,
    filters.year,
  ]);

  const fetchAttendanceSummary = useCallback(async () => {
    if (!summaryFilters.staffId || !summaryFilters.month || !summaryFilters.year) {
      return;
    }
    try {
      const params = new URLSearchParams({
        staffId: summaryFilters.staffId,
        month: summaryFilters.month.toString(),
        year: summaryFilters.year.toString(),
      });
      const response = await api.get(
        `${ATTENDANCE_BASE}/summary?${params.toString()}`,
        {},
        true,
      );
      const data = response?.data || response;
      setAttendanceSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load attendance summary');
    }
  }, [summaryFilters]);

  useEffect(() => {
    if (!user?.college) return;
    fetchStaff();
  }, [user?.college, fetchStaff]);

  useEffect(() => {
    if (!user?.college) return;
    fetchAttendances();
  }, [user?.college, fetchAttendances]);

  const resetForm = useCallback(() => {
    setAttendanceForm(EMPTY_ATTENDANCE);
    setEditingAttendance(null);
    setShowForm(false);
  }, []);

  const showSuccess = useCallback((msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setAttendanceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate working hours
  useEffect(() => {
    if (attendanceForm.checkIn && attendanceForm.checkOut) {
      try {
        const checkIn = new Date(`2000-01-01T${attendanceForm.checkIn}`);
        const checkOut = new Date(`2000-01-01T${attendanceForm.checkOut}`);
        const diff = (checkOut - checkIn) / (1000 * 60 * 60); // hours
        if (diff > 0) {
          setAttendanceForm((prev) => ({
            ...prev,
            workingHours: diff.toFixed(2),
          }));
        }
      } catch {
        // ignore
      }
    }
  }, [attendanceForm.checkIn, attendanceForm.checkOut]);

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Convert time values to ISO datetime format
      let checkInISO = undefined;
      let checkOutISO = undefined;

      if (attendanceForm.checkIn && attendanceForm.date) {
        try {
          checkInISO = new Date(`${attendanceForm.date}T${attendanceForm.checkIn}:00`).toISOString();
        } catch {
          // If conversion fails, use the time as is
          checkInISO = attendanceForm.checkIn;
        }
      }

      if (attendanceForm.checkOut && attendanceForm.date) {
        try {
          checkOutISO = new Date(`${attendanceForm.date}T${attendanceForm.checkOut}:00`).toISOString();
        } catch {
          // If conversion fails, use the time as is
          checkOutISO = attendanceForm.checkOut;
        }
      }

      const payload = {
        date: attendanceForm.date || undefined,
        status: attendanceForm.status,
        staff: attendanceForm.staff || undefined,
        checkIn: checkInISO,
        checkOut: checkOutISO,
        workingHours:
          attendanceForm.workingHours !== ''
            ? Number(attendanceForm.workingHours)
            : undefined,
        leaveType: attendanceForm.leaveType || undefined,
        remarks: attendanceForm.remarks.trim() || undefined,
      };

      if (editingAttendance?._id) {
        await api.put(
          `${ATTENDANCE_BASE}/${editingAttendance._id}`,
          payload,
          {},
          true,
        );
        showSuccess('Attendance updated successfully.');
      } else {
        await api.post(`${ATTENDANCE_BASE}`, payload, {}, true);
        showSuccess('Attendance created successfully.');
      }
      resetForm();
      await fetchAttendances();
    } catch (err) {
      setError(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAttendance = (attendance) => {
    setEditingAttendance(attendance);
    setAttendanceForm({
      date: formatDateForInput(attendance.date),
      status: attendance.status || 'present',
      staff: attendance.staff?._id || attendance.staff || '',
      checkIn: formatTimeForInput(attendance.checkIn),
      checkOut: formatTimeForInput(attendance.checkOut),
      workingHours:
        attendance.workingHours !== undefined
          ? String(attendance.workingHours)
          : '',
      leaveType: attendance.leaveType || '',
      remarks: attendance.remarks || '',
    });
    setShowForm(true);
  };

  const handleViewAttendance = async (attendanceId) => {
    try {
      const response = await api.get(
        `${ATTENDANCE_BASE}/${attendanceId}`,
        {},
        true,
      );
      const data = response?.data || response;
      setViewingAttendance(data);
    } catch (err) {
      setError(err.message || 'Failed to load attendance details');
    }
  };

  const handleDeleteAttendance = async (attendance) => {
    if (!attendance?._id) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Delete this attendance record?')
        : true;
    if (!confirmed) return;
    try {
      setDeletingId(attendance._id);
      setError('');
      await api.delete(`${ATTENDANCE_BASE}/${attendance._id}`, {}, true);
      showSuccess('Attendance deleted.');
      await fetchAttendances();
    } catch (err) {
      setError(err.message || 'Failed to delete attendance');
    } finally {
      setDeletingId('');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-500/10 text-green-600';
      case 'absent':
        return 'bg-red-500/10 text-red-600';
      case 'leave':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'half-day':
        return 'bg-blue-500/10 text-blue-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  // Define columns for Attendance DataTable
  const attendanceColumns = useMemo(() => [
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
      id: 'staff',
      accessorKey: 'staff',
      header: 'Staff',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.staff) return '-';
        const staffMember = typeof row.staff === 'object' ? row.staff : null;
        return staffMember ? (
          <div>
            <div className="font-medium">{staffMember.name}</div>
            <div className="text-xs text-muted-foreground">
              {staffMember.employeeId || 'N/A'}
            </div>
          </div>
        ) : '-';
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: ATTENDANCE_STATUSES,
      cell: ({ row }) => (
        <span className={`text-xs px-2 py-1 rounded capitalize ${getStatusColor(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    {
      id: 'leaveType',
      accessorKey: 'leaveType',
      header: 'Leave Type',
      type: 'text',
      cell: ({ row }) => {
        if (!row.leaveType) return '-';
        return (
          <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-600 capitalize">
            {row.leaveType}
          </span>
        );
      },
    },
    {
      id: 'checkIn',
      accessorKey: 'checkIn',
      header: 'Check In',
      type: 'text',
      cell: ({ row }) => row.checkIn ? formatTimeForDisplay(row.checkIn) : '-',
    },
    {
      id: 'checkOut',
      accessorKey: 'checkOut',
      header: 'Check Out',
      type: 'text',
      cell: ({ row }) => row.checkOut ? formatTimeForDisplay(row.checkOut) : '-',
    },
    {
      id: 'workingHours',
      accessorKey: 'workingHours',
      header: 'Working Hours',
      type: 'number',
      cell: ({ row }) => row.workingHours ? `${row.workingHours} hrs` : '-',
    },
    {
      id: 'remarks',
      accessorKey: 'remarks',
      header: 'Remarks',
      type: 'text',
      searchable: true,
      cell: ({ row }) => row.remarks || '-',
    },
  ], []);

  // Define actions for Attendance DataTable
  const attendanceActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleViewAttendance(row._id);
        }}
      >
        <Eye className="h-4 w-4" />
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleEditAttendance(row);
        }}
      >
        <Edit2 className="h-4 w-4" />
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteAttendance(row);
        }}
        disabled={deletingId === row._id}
      >
        <Trash2 className="h-4 w-4" />
        {deletingId === row._id ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  ), [deletingId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Staff Attendance</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Record and manage staff attendance records.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchAttendances}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Entry
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

      {/* Attendance Summary */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Attendance Summary
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
          >
            {showSummary ? 'Hide' : 'Show'} Summary
          </Button>
        </div>
        {showSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            <div>
              <label className="block text-sm font-medium mb-2">Staff</label>
              <select
                value={summaryFilters.staffId}
                onChange={(e) =>
                  setSummaryFilters((prev) => ({
                    ...prev,
                    staffId: e.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Staff</option>
                {staff.map((staffMember) => (
                  <option key={staffMember._id} value={staffMember._id}>
                    {staffMember.name} ({staffMember.employeeId || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <Input
                type="number"
                min="1"
                max="12"
                value={summaryFilters.month}
                onChange={(e) =>
                  setSummaryFilters((prev) => ({
                    ...prev,
                    month: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <Input
                type="number"
                value={summaryFilters.year}
                onChange={(e) =>
                  setSummaryFilters((prev) => ({
                    ...prev,
                    year: parseInt(e.target.value) || new Date().getFullYear(),
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchAttendanceSummary} className="w-full">
                Get Summary
              </Button>
            </div>
          </div>
        )}
        {attendanceSummary && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Total Days</p>
              <p className="text-xl font-bold">{attendanceSummary.totalDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Present</p>
              <p className="text-xl font-bold text-green-600">
                {attendanceSummary.presentDays}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Absent</p>
              <p className="text-xl font-bold text-red-600">
                {attendanceSummary.absentDays}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leave</p>
              <p className="text-xl font-bold text-yellow-600">
                {attendanceSummary.leaveDays}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Half Days</p>
              <p className="text-xl font-bold text-blue-600">
                {attendanceSummary.halfDays}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Attendance %</p>
              <p className="text-xl font-bold">
                {attendanceSummary.attendancePercentage}%
              </p>
            </div>
            <div className="md:col-span-6">
              <p className="text-sm text-muted-foreground">Total Working Hours</p>
              <p className="text-lg font-semibold">
                {attendanceSummary.totalWorkingHours || 0} hours
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Server-side Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={filters.teacherId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, teacherId: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Staff</option>
            {staff.map((staffMember) => (
              <option key={staffMember._id} value={staffMember._id}>
                {staffMember.name} ({staffMember.employeeId || 'N/A'})
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {ATTENDANCE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            placeholder="Start Date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, startDate: e.target.value }))
            }
          />
          <Input
            type="date"
            placeholder="End Date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, endDate: e.target.value }))
            }
          />
          <Input
            type="number"
            min="1"
            max="12"
            placeholder="Month (1-12)"
            value={filters.month}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, month: e.target.value }))
            }
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Year"
              value={filters.year}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, year: e.target.value }))
              }
            />
            <Button onClick={fetchAttendances} className="md:col-span-1">
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Attendance Form */}
      {showForm && (
        <form
          onSubmit={handleSaveAttendance}
          className="bg-card border border-border rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editingAttendance ? 'Edit Attendance' : 'New Attendance Entry'}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetForm}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Staff *
              </label>
              <select
                name="staff"
                value={attendanceForm.staff}
                onChange={handleFormChange}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Staff</option>
                {staff.map((staffMember) => (
                  <option key={staffMember._id} value={staffMember._id}>
                    {staffMember.name} ({staffMember.employeeId || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <Input
                name="date"
                type="date"
                value={attendanceForm.date}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Status *
              </label>
              <select
                name="status"
                value={attendanceForm.status}
                onChange={handleFormChange}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ATTENDANCE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            {attendanceForm.status === 'present' ||
            attendanceForm.status === 'half-day' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Check In
                  </label>
                  <Input
                    name="checkIn"
                    type="time"
                    value={attendanceForm.checkIn}
                    onChange={handleFormChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Check Out
                  </label>
                  <Input
                    name="checkOut"
                    type="time"
                    value={attendanceForm.checkOut}
                    onChange={handleFormChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Working Hours
                  </label>
                  <Input
                    name="workingHours"
                    type="number"
                    step="0.01"
                    value={attendanceForm.workingHours}
                    onChange={handleFormChange}
                    readOnly
                    className="bg-muted"
                    placeholder="Auto-calculated"
                  />
                </div>
              </>
            ) : null}
            {attendanceForm.status === 'leave' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Leave Type
                </label>
                <select
                  name="leaveType"
                  value={attendanceForm.leaveType}
                  onChange={handleFormChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select Leave Type</option>
                  {LEAVE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-2">Remarks</label>
              <textarea
                name="remarks"
                value={attendanceForm.remarks}
                onChange={handleFormChange}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Additional remarks"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? 'Saving...'
                : editingAttendance
                ? 'Update Attendance'
                : 'Create Attendance'}
            </Button>
          </div>
        </form>
      )}

      {/* Attendance List - DataTable */}
      <div className="bg-card border border-border rounded-lg p-4">
        <DataTable
          data={attendances}
          columns={attendanceColumns}
          actions={attendanceActions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="staff-attendance-table"
          defaultPageSize={50}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No attendance records found"
          onRowClick={(row) => handleViewAttendance(row._id)}
        />
      </div>

      {/* View Attendance Modal */}
      {viewingAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Attendance Details</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingAttendance(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <p className="font-medium">
                    {viewingAttendance.staff?.name || 'N/A'} (
                    {viewingAttendance.staff?.employeeId || 'N/A'})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {formatDateForDisplay(viewingAttendance.date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">
                    {viewingAttendance.status}
                  </p>
                </div>
                {viewingAttendance.checkIn && (
                  <div>
                    <p className="text-sm text-muted-foreground">Check In</p>
                    <p className="font-medium">
                      {formatTimeForDisplay(viewingAttendance.checkIn)}
                    </p>
                  </div>
                )}
                {viewingAttendance.checkOut && (
                  <div>
                    <p className="text-sm text-muted-foreground">Check Out</p>
                    <p className="font-medium">
                      {formatTimeForDisplay(viewingAttendance.checkOut)}
                    </p>
                  </div>
                )}
                {viewingAttendance.workingHours && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Working Hours
                    </p>
                    <p className="font-medium">
                      {viewingAttendance.workingHours} hours
                    </p>
                  </div>
                )}
                {viewingAttendance.leaveType && (
                  <div>
                    <p className="text-sm text-muted-foreground">Leave Type</p>
                    <p className="font-medium capitalize">
                      {viewingAttendance.leaveType}
                    </p>
                  </div>
                )}
              </div>
              {viewingAttendance.remarks && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-2">Remarks</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingAttendance.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

