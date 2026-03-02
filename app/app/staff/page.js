'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Edit2, Trash2, RefreshCcw, Eye, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, API_URL, deleteUploadedFile } from '@/lib/api';
import { getStaffPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import StaffForm from '@/components/staff-form';
import NonTeachingStaffForm from '@/components/non-teaching-staff-form';

const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on-leave', label: 'On Leave' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'retired', label: 'Retired' },
  { value: 'terminated', label: 'Terminated' },
];

const STAFF_TYPES = [
  { value: 'teaching', label: 'Teaching' },
  { value: 'non-teaching', label: 'Non-Teaching' },
];

const TEACHING_DESIGNATIONS = [
  { value: 'professor', label: 'Professor' },
  { value: 'associate-professor', label: 'Associate Professor' },
  { value: 'assistant-professor', label: 'Assistant Professor' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'visiting-faculty', label: 'Visiting Faculty' },
  { value: 'guest-faculty', label: 'Guest Faculty' },
];

const NON_TEACHING_DESIGNATIONS = [
  { value: 'principal', label: 'Principal' },
  { value: 'vice-principal', label: 'Vice Principal' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'admin-officer', label: 'Admin Officer' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'clerk', label: 'Clerk' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'lab-technician', label: 'Lab Technician' },
  { value: 'lab-assistant', label: 'Lab Assistant' },
  { value: 'peon', label: 'Peon' },
  { value: 'security-guard', label: 'Security Guard' },
  { value: 'maintenance-staff', label: 'Maintenance Staff' },
  { value: 'canteen-staff', label: 'Canteen Staff' },
  { value: 'driver', label: 'Driver' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'it-support', label: 'IT Support' },
  { value: 'hr-officer', label: 'HR Officer' },
  { value: 'store-keeper', label: 'Store Keeper' },
  { value: 'other', label: 'Other' },
];

const getStaffId = (staff) => staff._id || staff.id;

const formatDateForDisplay = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '';
  }
};

const getDesignationLabel = (designation, staffType) => {
  const allDesignations = [...TEACHING_DESIGNATIONS, ...NON_TEACHING_DESIGNATIONS];
  const found = allDesignations.find((d) => d.value === designation);
  return found ? found.label : designation;
};

export default function StaffPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [staff, setStaff] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showTeachingForm, setShowTeachingForm] = useState(false);
  const [showNonTeachingForm, setShowNonTeachingForm] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    department: '',
    designation: '',
    staffType: '',
    employmentStatus: '',
    isActive: '',
    courseId: '',
  });

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

  const fetchStats = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/teachers/stats', {}, true);
      const data = response?.data || response || {};
      setStats(data);
    } catch (err) {
      console.error('Failed to load staff stats:', err);
    }
  }, [user?.college]);

  const fetchStaff = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams();

      if (filters.department) queryParams.append('department', filters.department);
      if (filters.designation) queryParams.append('designation', filters.designation);
      if (filters.staffType) queryParams.append('staffType', filters.staffType);
      if (filters.employmentStatus) queryParams.append('employmentStatus', filters.employmentStatus);
      if (filters.isActive !== '') queryParams.append('isActive', filters.isActive);
      if (filters.courseId) queryParams.append('courseId', filters.courseId);

      const response = await api.get(`/teachers?${queryParams.toString()}`, {}, true);
      const data = response?.data || response || [];

      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [user?.college, filters.department, filters.designation, filters.staffType, filters.employmentStatus, filters.isActive, filters.courseId]);

  useEffect(() => {
    if (!user?.college) return;
    fetchCourses();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.college, filters.department, filters.designation, filters.staffType, filters.employmentStatus, filters.isActive, filters.courseId]);

  const handleEdit = useCallback((staff) => {
    setEditingStaff(staff);
    setShowForm(true);
  }, []);

  const handleView = useCallback(async (staff) => {
    try {
      const response = await api.get(`/teachers/${getStaffId(staff)}`, {}, true);
      const staffData = response?.data || response;
      router.push(`/app/staff/${getStaffId(staff)}`);
    } catch (err) {
      setError(err.message || 'Failed to load staff details');
    }
  }, [router]);

  const handleDelete = useCallback(
    async (staff) => {
      const id = getStaffId(staff);
      if (!id) return;

      const confirmed = typeof window !== 'undefined' ? window.confirm('Delete this staff member?') : true;
      if (!confirmed) return;

      try {
        setDeletingId(id);
        setError('');
        setSuccess('');
        const imagePath = staff.image ?? staff.photo;
        if (imagePath) await deleteUploadedFile(imagePath);
        await api.delete(`/teachers/${id}`, {}, true);
        setSuccess('Staff deleted successfully.');
        await fetchStaff();
        await fetchStats();
      } catch (err) {
        setError(err.message || 'Failed to delete staff');
      } finally {
        setDeletingId('');
        setTimeout(() => setSuccess(''), 3000);
      }
    },
    [fetchStaff, fetchStats],
  );

  const handleFormSuccess = useCallback(() => {
    fetchStaff();
    fetchStats();
    setShowForm(false);
    setEditingStaff(null);
  }, [fetchStaff, fetchStats]);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingStaff(null);
  }, []);

  const handleFilterChange = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Define columns for DataTable
  const columns = useMemo(
    () => [
      {
        id: 'photo',
        accessorKey: 'image',
        header: 'Photo',
        type: 'text',
        searchable: false,
        cell: ({ row }) => {
          const path = row.image ?? row.photo;
          const url = getStaffPhotoUrl(path, API_URL);
          return (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border border-border">
              {url ? (
                <img src={url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          );
        },
      },
      {
        id: 'employeeId',
        accessorKey: 'employeeId',
        header: 'Employee ID',
        type: 'text',
        searchable: true,
        cell: ({ row }) => (
          <span className="text-sm font-semibold px-2 py-1 rounded bg-primary/10 text-primary">
            {row.employeeId || '-'}
          </span>
        ),
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        type: 'text',
        searchable: true,
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        type: 'text',
        searchable: true,
      },
      {
        id: 'phone',
        accessorKey: 'phone',
        header: 'Phone',
        type: 'text',
        searchable: true,
      },
      {
        id: 'staffType',
        accessorKey: 'staffType',
        header: 'Staff Type',
        type: 'text',
        filterable: true,
        filterType: 'select',
        filterOptions: STAFF_TYPES,
        cell: ({ row }) => (
          <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">
            {row.staffType || '-'}
          </span>
        ),
      },
      {
        id: 'department',
        accessorKey: 'department',
        header: 'Department',
        type: 'text',
        searchable: true,
        filterable: true,
        filterType: 'text',
      },
      {
        id: 'designation',
        accessorKey: 'designation',
        header: 'Designation',
        type: 'text',
        searchable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [...TEACHING_DESIGNATIONS, ...NON_TEACHING_DESIGNATIONS],
        cell: ({ row }) => (
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
            {getDesignationLabel(row.designation, row.staffType)}
          </span>
        ),
      },
      {
        id: 'employmentStatus',
        accessorKey: 'employmentStatus',
        header: 'Status',
        type: 'text',
        filterable: true,
        filterType: 'select',
        filterOptions: EMPLOYMENT_STATUSES,
        cell: ({ row }) => (
          <span
            className={`text-xs px-2 py-1 rounded capitalize ${
              row.employmentStatus === 'active'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : row.employmentStatus === 'on-leave'
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : row.employmentStatus === 'resigned'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : row.employmentStatus === 'retired'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
            }`}
          >
            {row.employmentStatus || 'unknown'}
          </span>
        ),
      },
      {
        id: 'joiningDate',
        accessorKey: 'joiningDate',
        header: 'Joining Date',
        type: 'date',
        formatOptions: {
          locale: 'en-US',
        },
      },
      {
        id: 'courses',
        accessorKey: 'courses',
        header: 'Courses',
        type: 'text',
        searchable: false,
        cell: ({ row }) => {
          if (!Array.isArray(row.courses) || row.courses.length === 0 || row.staffType === 'non-teaching') return '-';
          return (
            <div className="flex flex-wrap gap-1">
              {row.courses.slice(0, 2).map((course, idx) => (
                <span key={idx} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                  {typeof course === 'object' ? `${course.name}${course.batch ? ` (${course.batch})` : ''}` : course}
                </span>
              ))}
              {row.courses.length > 2 && (
                <span className="text-xs text-muted-foreground">+{row.courses.length - 2} more</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'isActive',
        accessorKey: 'isActive',
        header: 'Active',
        type: 'boolean',
        formatOptions: {
          trueLabel: 'Yes',
          falseLabel: 'No',
        },
        cell: ({ row }) => (
          <span
            className={`text-xs px-2 py-1 rounded ${
              row.isActive
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
            }`}
          >
            {row.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
    ],
    [],
  );

  // Define actions for DataTable
  const actions = useCallback(
    (row) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            handleView(row);
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
            handleEdit(row);
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
            handleDelete(row);
          }}
          disabled={deletingId === getStaffId(row)}
        >
          <Trash2 className="h-4 w-4" />
          {deletingId === getStaffId(row) ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    ),
    [deletingId, handleView, handleEdit, handleDelete],
  );

  const statsCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total', value: stats.total || 0 },
      { label: 'Teaching', value: stats.teaching || 0, className: 'text-blue-600' },
      { label: 'Non-Teaching', value: stats.nonTeaching || 0, className: 'text-purple-600' },
      { label: 'Active', value: stats.active || 0, className: 'text-green-600' },
      { label: 'On Leave', value: stats.onLeave || 0, className: 'text-yellow-600' },
      { label: 'Resigned', value: stats.resigned || 0, className: 'text-red-600' },
      { label: 'Retired', value: stats.retired || 0, className: 'text-blue-600' },
      { label: 'Terminated', value: stats.terminated || 0, className: 'text-orange-600' },
    ];
  }, [stats]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Staff</h1>
          </div>
          <p className="text-muted-foreground mt-2">Manage staff records, assignments, and status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStaff} className="gap-2" disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              setEditingStaff(null);
              setShowForm(true);
            }}
            className="gap-2"
            variant={showForm ? 'outline' : 'default'}
          >
            <Plus className="h-4 w-4" />
            New Staff
          </Button>
        </div>
      </div>

      {/* Stats */}
      {statsCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {statsCards.map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className={`text-2xl font-bold ${card.className || ''}`}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Server-side Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Input
            placeholder="Department"
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
          />
          <select
            value={filters.staffType}
            onChange={(e) => handleFilterChange('staffType', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Staff Types</option>
            {STAFF_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={filters.employmentStatus}
            onChange={(e) => handleFilterChange('employmentStatus', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {EMPLOYMENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => handleFilterChange('isActive', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            value={filters.courseId}
            onChange={(e) => handleFilterChange('courseId', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course._id || course.id} value={course._id || course.id}>
                {course.name} ({course.batch})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Form Modal */}
      {showForm && (
        <StaffForm
          open={showForm}
          onClose={handleFormClose}
          editingStaff={editingStaff}
          courses={courses}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Staff List - DataTable */}
      <div className="bg-card border border-border rounded-lg p-4">
        <DataTable
          data={staff}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="staff-table"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No staff found"
          onRowClick={(row) => handleView(row)}
        />
      </div>
    </div>
  );
}

