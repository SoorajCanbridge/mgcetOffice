'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Plus, Edit2, Trash2, RefreshCcw, Eye, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, API_URL, deleteUploadedFile } from '@/lib/api';
import { getStudentPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import StudentForm from '@/components/student-form';
import { AnalyticsStrip } from '@/components/analytics/AnalyticsStrip';

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


// Utility functions
const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
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

const DEFAULT_LEVEL_LABELS = {
  A: 'Level A',
  B: 'Level B',
  C: 'Level C',
};

const ENROLLMENT_STATUSES = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'transferred', label: 'Transferred' },
];

const normalizeLevelLabels = (labels) => ({
  ...DEFAULT_LEVEL_LABELS,
  ...(labels || {}),
});

const normalizeLevelValues = (levelValues) => {
  const normalizeLeafArray = (value) => {
    if (Array.isArray(value)) {
      return value.map((v) => `${v}`.trim()).filter(Boolean);
    }
    if (value === undefined || value === null) return [];
    const single = `${value}`.trim();
    return single ? [single] : [];
  };

  const normalizeNested = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        const parent = `${item?.parent || ''}`.trim();
        const values = normalizeLeafArray(item?.values);
        if (!parent) return null;
        return { parent, values };
      })
      .filter(Boolean);
  };

  return {
    A: normalizeLeafArray(levelValues?.A),
    B: normalizeNested(levelValues?.B),
    C: normalizeNested(levelValues?.C),
  };
};

const getStudentId = (student) => student._id || student.id;

export default function StudentsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [levelLabels, setLevelLabels] = useState(DEFAULT_LEVEL_LABELS);
  const [levelValues, setLevelValues] = useState({ A: [], B: [], C: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState(EMPTY_STUDENT);
  const [showForm, setShowForm] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [photoPreviewDataUrl, setPhotoPreviewDataUrl] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    courseId: '',
    enrollmentStatus: '',
    isActive: '',
    levelA: '',
    levelB: '',
    levelC: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchLevelLabels = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get(`/academic/config/${user.college}`);
      const config = response?.data || response || {};
      setLevelLabels(normalizeLevelLabels(config.levelNames));
      setLevelValues(normalizeLevelValues(config.levelValues));
    } catch (err) {
      // Fallback to defaults; no hard failure
      setLevelLabels(DEFAULT_LEVEL_LABELS);
      setLevelValues({ A: [], B: [], C: [] });
    }
  }, [user?.college]);

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

  const fetchStudents = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();

      if (filters.courseId) queryParams.append('courseId', filters.courseId);
      if (filters.enrollmentStatus) queryParams.append('enrollmentStatus', filters.enrollmentStatus);
      if (filters.isActive !== '') queryParams.append('isActive', filters.isActive);
      if (filters.levelA) queryParams.append('levelA', filters.levelA);
      if (filters.levelB) queryParams.append('levelB', filters.levelB);
      if (filters.levelC) queryParams.append('levelC', filters.levelC);

      const response = await api.get(`/students?${queryParams.toString()}`, {}, true);
      const data = response?.data || response || [];

      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [user?.college, filters.courseId, filters.enrollmentStatus, filters.isActive, filters.levelA, filters.levelB, filters.levelC]);

  const fetchStats = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get('/students/stats', {}, true);
      const data = response?.data || response || {};
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchLevelLabels();
    fetchCourses();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchStudents();
  }, [user?.college, fetchStudents]);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_STUDENT);
    setFormErrors({});
    setEditingStudent(null);
    setShowForm(false);
    setPhotoPreviewDataUrl(null);
    setSelectedPhotoFile(null);
    setError('');
    setSuccess('');
  }, []);

  const handleChange = useCallback((e) => {
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
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
    
    setFormErrors((prev) => {
      const newErrors = { ...prev };
      if (name.startsWith('address.')) {
        delete newErrors.address;
      } else if (name.startsWith('guardianInfo.')) {
        delete newErrors.guardianInfo;
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });
    setError('');
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

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setError('Please fix the errors in the form.');
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

      let imagePath = formData.photo || '';
      if (!editingStudent && selectedPhotoFile) {
        const fd = new FormData();
        fd.append('folder', 'students');
        fd.append('file', selectedPhotoFile);
        const uploadRes = await api.uploadFile('/upload/single', fd, true);
        imagePath = uploadRes?.data?.path ?? uploadRes?.path ?? '';
      }
      if (imagePath !== undefined) payload.image = imagePath;

      const studentId = editingStudent ? getStudentId(editingStudent) : null;
      if (studentId) {
        await api.put(`/students/${studentId}`, payload, {}, true);
        setSuccess('Student updated successfully.');
      } else {
        await api.post('/students', payload, {}, true);
        setSuccess('Student created successfully.');
      }

      await fetchStudents();
      await fetchStats();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save student');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  }, [formData, validateForm, editingStudent, selectedPhotoFile, user.college, fetchStudents, fetchStats, resetForm]);

  const handleEdit = useCallback((student) => {
    setEditingStudent(student);
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
    setError('');
    setSuccess('');
    setShowForm(true);
  }, []);

  const handleView = useCallback(async (student) => {
    try {
      const response = await api.get(`/students/${getStudentId(student)}`, {}, true);
      setViewingStudent(response?.data || response);
    } catch (err) {
      setError(err.message || 'Failed to load student details');
    }
  }, []);

  const handleDelete = useCallback(async (student) => {
    const id = getStudentId(student);
    if (!id) return;

    const confirmed = typeof window !== 'undefined' ? window.confirm('Delete this student?') : true;
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError('');
      setSuccess('');
      const imagePath = student.image ?? student.photo;
      if (imagePath) await deleteUploadedFile(imagePath);
      await api.delete(`/students/${id}`, {}, true);
      setSuccess('Student deleted.');
      await fetchStudents();
      await fetchStats();
    } catch (err) {
      setError(err.message || 'Failed to delete student');
    } finally {
      setDeletingId('');
      setTimeout(() => setSuccess(''), 3000);
    }
  }, [fetchStudents, fetchStats]);

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedPhotoFile(null);
      setPhotoPreviewDataUrl(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }
    setSelectedPhotoFile(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreviewDataUrl(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const handlePhotoUpload = useCallback(async () => {
    if (!selectedPhotoFile || !editingStudent) return;
    const studentId = getStudentId(editingStudent);
    if (!studentId) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const oldPath = editingStudent.image ?? editingStudent.photo ?? formData.photo;
      if (oldPath) await deleteUploadedFile(oldPath);
      const fd = new FormData();
      fd.append('folder', 'students');
      fd.append('file', selectedPhotoFile);
      const response = await api.uploadFile('/upload/single', fd, true);
      const path = response?.data?.path ?? response?.path;
      if (path) {
        await api.put(`/students/${studentId}`, { image: path }, {}, true);
        setFormData((prev) => ({ ...prev, photo: path }));
      }
      setPhotoPreviewDataUrl(null);
      setSelectedPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setSuccess('Photo updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [selectedPhotoFile, editingStudent, formData.photo]);

  const handlePhotoClear = useCallback(async () => {
    if (!editingStudent) return;
    const studentId = getStudentId(editingStudent);
    if (!studentId) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const currentPath = formData.photo || (editingStudent.image ?? editingStudent.photo);
      if (currentPath) await deleteUploadedFile(currentPath);
      await api.put(`/students/${studentId}`, { image: '' }, {}, true);
      setFormData((prev) => ({ ...prev, photo: '' }));
      setPhotoPreviewDataUrl(null);
      setSelectedPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      setSuccess('Photo cleared.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to clear photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [editingStudent, formData.photo]);

  const handleFilterChange = useCallback((name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // Compute filtered level B options based on selected level A
  const filteredLevelBOptions = useMemo(() => {
    if (!filters.levelA) return [];
    return levelValues.B
      .filter((item) => item.parent === filters.levelA)
      .flatMap((item) => item.values);
  }, [filters.levelA, levelValues.B]);

  // Compute filtered level C options based on selected level B or level A
  const filteredLevelCOptions = useMemo(() => {
    if (filters.levelB) {
      return levelValues.C
        .filter((item) => item.parent === filters.levelB)
        .flatMap((item) => item.values);
    }
    if (filters.levelA) {
      const levelBValues = levelValues.B
        .filter((bItem) => bItem.parent === filters.levelA)
        .flatMap((bItem) => bItem.values);
      return levelValues.C
        .filter((item) => levelBValues.includes(item.parent))
        .flatMap((item) => item.values);
    }
    return [];
  }, [filters.levelA, filters.levelB, levelValues.B, levelValues.C]);

  // Define columns for DataTable
  const columns = useMemo(() => [
    {
      id: 'photo',
      accessorKey: 'image',
      header: 'Photo',
      type: 'text',
      searchable: false,
      cell: ({ row }) => {
        const path = row.image ?? row.photo;
        const url = getStudentPhotoUrl(path, API_URL);
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
      id: 'studentId',
      accessorKey: 'studentId',
      header: 'Student ID',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <span className="text-sm font-semibold px-2 py-1 rounded bg-primary/10 text-primary">
          {row.studentId || '-'}
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
      id: 'course',
      accessorKey: 'course',
      header: 'Course',
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.course) return '-';
        const course = typeof row.course === 'object' ? row.course : null;
        return course ? `${course.name}${course.batch ? ` (${course.batch})` : ''}` : '-';
      },
    },
    {
      id: 'levelA',
      accessorKey: 'course',
      header: levelLabels.A,
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.course) return '-';
        const course = typeof row.course === 'object' ? row.course : null;
        return course?.levelA || '-';
      },
    },
    {
      id: 'levelB',
      accessorKey: 'course',
      header: levelLabels.B,
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.course) return '-';
        const course = typeof row.course === 'object' ? row.course : null;
        return course?.levelB || '-';
      },
    },
    {
      id: 'levelC',
      accessorKey: 'course',
      header: levelLabels.C,
      type: 'text',
      searchable: true,
      cell: ({ row }) => {
        if (!row.course) return '-';
        const course = typeof row.course === 'object' ? row.course : null;
        return course?.levelC || '-';
      },
    },
    {
      id: 'enrollmentStatus',
      accessorKey: 'enrollmentStatus',
      header: 'Status',
      type: 'text',
      cell: ({ row }) => (
        <span
          className={`text-xs px-2 py-1 rounded capitalize ${
            row.enrollmentStatus === 'enrolled'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : row.enrollmentStatus === 'graduated'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : row.enrollmentStatus === 'dropped'
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : row.enrollmentStatus === 'suspended'
              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
              : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
          }`}
        >
          {row.enrollmentStatus}
        </span>
      ),
    },
    {
      id: 'enrollmentDate',
      accessorKey: 'enrollmentDate',
      header: 'Enrollment Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
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
  ], [levelLabels.A, levelLabels.B, levelLabels.C]);

  // Define actions for DataTable
  const actions = useCallback((row) => {
    const studentId = getStudentId(row);
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/app/students/${studentId}`);
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
        disabled={deletingId === getStudentId(row)}
      >
        <Trash2 className="h-4 w-4" />
        {deletingId === getStudentId(row) ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
    );
  }, [deletingId, router]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Students</h1>
          </div>
          <p className="text-muted-foreground mt-2">Manage student records and enrollment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStudents} className="gap-2" disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2" variant={showForm ? 'outline' : 'default'}>
            <Plus className="h-4 w-4" />
            New Student
          </Button>
        </div>
      </div>

      <AnalyticsStrip collegeId={user?.college} className="mb-2" />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Enrolled</div>
            <div className="text-2xl font-bold text-green-600">{stats.enrolled || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Graduated</div>
            <div className="text-2xl font-bold text-blue-600">{stats.graduated || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Dropped</div>
            <div className="text-2xl font-bold text-red-600">{stats.dropped || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Suspended</div>
            <div className="text-2xl font-bold text-orange-600">{stats.suspended || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Transferred</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.transferred || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.active || 0}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Inactive</div>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive || 0}</div>
          </div>
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
          <select
            value={filters.enrollmentStatus}
            onChange={(e) => handleFilterChange('enrollmentStatus', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            {ENROLLMENT_STATUSES.map((status) => (
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
            value={filters.levelA}
            onChange={(e) => {
              const newLevelA = e.target.value;
              handleFilterChange('levelA', newLevelA);
              // Always reset level B and C when level A changes
              handleFilterChange('levelB', '');
              handleFilterChange('levelC', '');
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All {levelLabels.A}</option>
            {levelValues.A.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.levelB}
            onChange={(e) => {
              const newLevelB = e.target.value;
              handleFilterChange('levelB', newLevelB);
              // Reset level C when level B changes
              if (newLevelB) {
                handleFilterChange('levelC', '');
              }
            }}
            disabled={!filters.levelA}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All {levelLabels.B}</option>
            {filteredLevelBOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.levelC}
            onChange={(e) => handleFilterChange('levelC', e.target.value)}
            disabled={!filters.levelB && !filters.levelA}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All {levelLabels.C}</option>
            {filteredLevelCOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Form Modal */}
      {showForm && (
        <StudentForm
          formData={formData}
          formErrors={formErrors}
          courses={courses}
          editingStudent={editingStudent}
          saving={saving}
          error={error}
          success={success}
          onChange={handleChange}
          onSubmit={handleSubmit}
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

      {/* Student Details Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Student Details</h2>
              <Button variant="ghost" onClick={() => setViewingStudent(null)} className="gap-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                  {getStudentPhotoUrl(viewingStudent.image ?? viewingStudent.photo, API_URL) ? (
                    <img
                      src={getStudentPhotoUrl(viewingStudent.image ?? viewingStudent.photo, API_URL)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-lg">{viewingStudent.name}</div>
                  <div className="text-sm text-muted-foreground">{viewingStudent.studentId || viewingStudent.rollNumber || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{viewingStudent.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Student ID</div>
                  <div className="font-medium">{viewingStudent.studentId || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{viewingStudent.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{viewingStudent.phone}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Course</div>
                  <div className="font-medium">{viewingStudent.course?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Enrollment Status</div>
                  <div className="font-medium capitalize">{viewingStudent.enrollmentStatus || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">College</div>
                  <div className="font-medium">{viewingStudent.college?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Active</div>
                  <div className="font-medium">{viewingStudent.isActive ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student List - DataTable */}
      <div className="bg-card border border-border rounded-lg p-4">
        <DataTable
          data={students}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="students-table"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No students found"
          onRowClick={(row) => router.push(`/app/students/${getStudentId(row)}`)}
        />
      </div>
    </div>
  );
}

