'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
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
  attendanceMethod: 'manual',
};

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'leave', label: 'Leave' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'late', label: 'Late' },
  { value: 'early-leave', label: 'Early Leave' },
  { value: 'on-duty', label: 'On Duty' },
  { value: 'work-from-home', label: 'Work From Home' },
  { value: 'comp-off', label: 'Comp Off' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'training', label: 'Training' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'conference', label: 'Conference' },
  { value: 'sabbatical', label: 'Sabbatical' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'medical-emergency', label: 'Medical Emergency' },
];

const ATTENDANCE_METHODS = [
  { value: 'manual', label: 'Manual' },
  { value: 'biometric', label: 'Biometric' },
  { value: 'mobile-app', label: 'Mobile App' },
  { value: 'web-portal', label: 'Web Portal' },
  { value: 'rfid', label: 'RFID' },
  { value: 'face-recognition', label: 'Face Recognition' },
  { value: 'other', label: 'Other' },
];

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'compensatory', label: 'Compensatory Leave' },
  { value: 'sabbatical', label: 'Sabbatical Leave' },
  { value: 'other', label: 'Other' },
];

const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(date);
    // Use local date methods to avoid timezone issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

// Helper function to map backend teacher field to frontend staff field
const mapTeacherToStaff = (attendance) => {
  if (!attendance) return attendance;
  if (attendance.teacher && !attendance.staff) {
    return { ...attendance, staff: attendance.teacher };
  }
  return attendance;
};

// Helper function to map array of attendances
const mapAttendancesToStaff = (attendances) => {
  if (!Array.isArray(attendances)) return attendances;
  return attendances.map(mapTeacherToStaff);
};

export default function StaffAttendancePage() {
  const { user } = useAuth();

  const [attendances, setAttendances] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [viewingAttendance, setViewingAttendance] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    teacherId: '',
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

  // Calendar view state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedCell, setSelectedCell] = useState(null); // { staffId, date }
  const [cellAttendance, setCellAttendance] = useState(null); // attendance for selected cell
  const tableContainerRef = useRef(null);
  const todayColumnRef = useRef(null);

  const fetchStaff = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/teachers?limit=1000', {}, true);
      const data = response?.data || response || [];
      // Filter to only non-teaching staff
      // const nonTeachingStaff = Array.isArray(data) ? data.filter(s => s.staffType === 'non-teaching') : [];
      setStaff(data);
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

      // Map frontend teacherId to backend teacherId query param
      if (filters.teacherId) params.append('teacherId', filters.teacherId);
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

      // Map teacher field from backend to staff field for frontend display
      const mappedList = mapAttendancesToStaff(list);
      setAttendances(mappedList);
    } catch (err) { 
      setError(err.message || 'Failed to load attendances');
    } finally {
      setLoading(false);
    }
  }, [
    user?.college,
    filters.teacherId,
    filters.status,
    filters.startDate,
    filters.endDate,
    filters.month,
    filters.year,
  ]);

  useEffect(() => {
    if (!user?.college) return;
    fetchStaff();
  }, [user?.college, fetchStaff]);

  useEffect(() => {
    if (!user?.college) return;
    fetchAttendances();
  }, [user?.college, fetchAttendances]);

  // Helper functions for calendar view
  const getMonthDates = useCallback((month, year) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      dates.push(new Date(year, month, d));
    }
    return dates;
  }, []);

  const getDateKey = useCallback((date) => {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Create attendance map for quick lookup
  const attendanceMap = useMemo(() => {
    const map = new Map();
    attendances.forEach((attendance) => {
      const staffId = attendance.staff?._id || attendance.teacher?._id || attendance.staff || attendance.teacher;
      const date = attendance.date;
      if (staffId && date) {
        const key = `${staffId}_${getDateKey(date)}`;
        map.set(key, attendance);
      }
    });
    return map;
  }, [attendances, getDateKey]);

  // Get attendance for a specific staff and date
  const getAttendanceForCell = useCallback((staffId, date) => {
    const key = `${staffId}_${getDateKey(date)}`;
    return attendanceMap.get(key) || null;
  }, [attendanceMap, getDateKey]);

  // Navigate months
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  }, []);

  // Fetch attendances for current month
  useEffect(() => {
    if (!user?.college) return;
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    setFilters((prev) => ({
      ...prev,
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate),
      month: currentMonth + 1,
      year: currentYear.toString(),
    }));
  }, [currentMonth, currentYear, user?.college]);

  // Auto-scroll to today's date column
  useEffect(() => {
    if (loading || !tableContainerRef.current || !todayColumnRef.current) return;
    
    const now = new Date();
    const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();
    
    if (isCurrentMonth) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (todayColumnRef.current && tableContainerRef.current) {
          const container = tableContainerRef.current;
          const column = todayColumnRef.current;
          
          // Calculate scroll position to center today's column
          const containerRect = container.getBoundingClientRect();
          const columnRect = column.getBoundingClientRect();
          const scrollLeft = columnRect.left - containerRect.left + container.scrollLeft - (containerRect.width / 2) + (columnRect.width / 2);
          
          container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  }, [loading, currentMonth, currentYear, attendances]);

  // Handle cell click
  const handleCellClick = useCallback(async (staffId, date) => {
    setSelectedCell({ staffId, date });
    const attendance = getAttendanceForCell(staffId, date);
    setCellAttendance(attendance);
    
    if (attendance) {
      // Show details modal
      setViewingAttendance(mapTeacherToStaff(attendance));
    } else {
      // Show form to add new attendance
      const staffMember = staff.find((s) => s._id === staffId);
      setAttendanceForm({
        ...EMPTY_ATTENDANCE,
        staff: staffId,
        date: formatDateForInput(date),
      });
      setEditingAttendance(null);
      setShowForm(true);
    }
  }, [getAttendanceForCell, staff]);

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

      // Map frontend staff field to backend teacher field
      const payload = {
        date: attendanceForm.date || undefined,
        status: attendanceForm.status,
        teacher: attendanceForm.staff || undefined, // Map staff to teacher for backend
        checkIn: checkInISO,
        checkOut: checkOutISO,
        workingHours:
          attendanceForm.workingHours !== ''
            ? Number(attendanceForm.workingHours)
            : undefined,
        leaveType: attendanceForm.leaveType || undefined,
        remarks: attendanceForm.remarks.trim() || undefined,
        attendanceMethod: attendanceForm.attendanceMethod || 'manual',
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
      setSelectedCell(null);
      setCellAttendance(null);
    } catch (err) {
      setError(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAttendance = (attendance) => {
    // Map teacher to staff for form display
    const mappedAttendance = mapTeacherToStaff(attendance);
    setEditingAttendance(mappedAttendance);
    setAttendanceForm({
      date: formatDateForInput(mappedAttendance.date),
      status: mappedAttendance.status || 'present',
      staff: mappedAttendance.staff?._id || mappedAttendance.teacher?._id || mappedAttendance.staff || mappedAttendance.teacher || '',
      checkIn: formatTimeForInput(mappedAttendance.checkIn),
      checkOut: formatTimeForInput(mappedAttendance.checkOut),
      workingHours:
        mappedAttendance.workingHours !== undefined
          ? String(mappedAttendance.workingHours)
          : '',
      leaveType: mappedAttendance.leaveType || '',
      remarks: mappedAttendance.remarks || '',
      attendanceMethod: mappedAttendance.attendanceMethod || 'manual',
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
      // Map teacher field from backend to staff field for frontend display
      const mappedData = mapTeacherToStaff(data);
      setViewingAttendance(mappedData);
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
      case 'holiday':
        return 'bg-purple-500/10 text-purple-600';
      case 'late':
        return 'bg-orange-500/10 text-orange-600';
      case 'early-leave':
        return 'bg-orange-500/10 text-orange-600';
      case 'on-duty':
        return 'bg-indigo-500/10 text-indigo-600';
      case 'work-from-home':
        return 'bg-cyan-500/10 text-cyan-600';
      case 'comp-off':
        return 'bg-teal-500/10 text-teal-600';
      case 'weekend':
        return 'bg-gray-500/10 text-gray-600';
      case 'training':
        return 'bg-violet-500/10 text-violet-600';
      case 'meeting':
        return 'bg-pink-500/10 text-pink-600';
      case 'conference':
        return 'bg-rose-500/10 text-rose-600';
      case 'sabbatical':
        return 'bg-amber-500/10 text-amber-600';
      case 'suspension':
        return 'bg-red-600/20 text-red-700';
      case 'medical-emergency':
        return 'bg-red-500/20 text-red-700';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

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
            variant="outline"
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

      {/* Server-side Filters */}
      {/* <div className="bg-card border border-border rounded-lg p-4">
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
      </div> */}

      {/* Attendance Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <form onSubmit={handleSaveAttendance} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
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
                {['present', 'half-day', 'work-from-home', 'on-duty', 'training', 'meeting', 'conference', 'late', 'early-leave'].includes(attendanceForm.status) ? (
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
          </div>
        </div>
      )}

      {/* Calendar Table View */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[200px] text-center">
                {new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                disabled={loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToCurrentMonth}
                disabled={loading}
              >
                Today
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAttendances}
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Click a cell to view/edit attendance.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading attendance data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto" ref={tableContainerRef}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card border border-border p-2 text-left text-xs min-w-[200px]">
                    Staff Name / ID
                  </th>
                  {getMonthDates(currentMonth, currentYear).map((date) => {
                    const isToday =
                      date.toDateString() === new Date().toDateString();
                    const dayName = date.toLocaleDateString('en-US', {
                      weekday: 'short',
                    });
                    return (
                      <th
                        key={date.getTime()}
                        ref={isToday ? todayColumnRef : null}
                        className={`border border-border p-2 text-center text-xs min-w-[80px] ${
                          isToday ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            {dayName}
                          </span>
                          <span className="text-sm font-semibold">
                            {date.getDate()}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td
                      colSpan={getMonthDates(currentMonth, currentYear).length + 1}
                      className="border border-border p-8 text-center text-muted-foreground"
                    >
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  staff.map((staffMember) => {
                    const staffId = staffMember._id;
                    return (
                      <tr key={staffId} className="hover:bg-muted/50">
                        <td className="sticky left-0 z-10 bg-card border border-border p-2 min-w-[200px]">
                          <div>
                            <div className="font-medium">{staffMember.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {staffMember.employeeId || 'N/A'}
                            </div>
                          </div>
                        </td>
                        {getMonthDates(currentMonth, currentYear).map(
                          (date) => {
                            const attendance = getAttendanceForCell(
                              staffId,
                              date,
                            );
                            const status = attendance?.status || '';
                            const isToday =
                              date.toDateString() ===
                              new Date().toDateString();
                            const dateKey = getDateKey(date);

                            return (
                              <td
                                key={dateKey}
                                className={`border border-border p-1 text-center cursor-pointer hover:bg-muted transition-colors ${
                                  isToday ? 'bg-yellow-100 dark:bg-yellow-900/20' : ''
                                }`}
                                onClick={() => handleCellClick(staffId, date)}
                                title={`Click to ${attendance ? 'view/edit' : 'add'} attendance`}
                              >
                                {attendance ? (
                                  <div
                                    className={`text-xs px-1 py-0.5 rounded ${getStatusColor(
                                      status,
                                    )}`}
                                  >
                                    {status
                                      .split('-')
                                      .map(
                                        (word) =>
                                          word.charAt(0).toUpperCase() +
                                          word.slice(1),
                                      )
                                      .join(' ')}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    -
                                  </div>
                                )}
                              </td>
                            );
                          },
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Attendance Modal */}
      {viewingAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Attendance Details</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleEditAttendance(viewingAttendance);
                    setViewingAttendance(null);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingAttendance(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <p className="font-medium">
                    {(viewingAttendance.staff || viewingAttendance.teacher)?.name || 'N/A'} (
                    {(viewingAttendance.staff || viewingAttendance.teacher)?.employeeId || 'N/A'})
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
