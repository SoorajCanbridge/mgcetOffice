'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BookOpen,
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  GraduationCap,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  RefreshCcw,
  Edit2,
  X,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  TrendingUp as PromoteIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import CourseForm from '@/components/course-form';

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

const DEFAULT_LEVEL_LABELS = {
  A: 'Level A',
  B: 'Level B',
  C: 'Level C',
};

const EMPTY_COURSE = {
  batch: '',
  name: '',
  description: '',
  levelA: '',
  levelB: '',
  levelC: '',
  academicDuration: {
    value: '',
    unit: 'month',
  },
  startDate: '',
  seatLimit: '',
  tutor: '',
  completedDate: '',
  isActive: true,
};

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

const formatDateForInput = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const getCourseId = (course) => course._id || course.id;

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const courseId = params?.id;

  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState(null);
  const [stats, setStats] = useState(null);
  const [levelLabels, setLevelLabels] = useState({
    A: 'Level A',
    B: 'Level B',
    C: 'Level C',
  });
  const [levelValues, setLevelValues] = useState({ A: [], B: [], C: [] });
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_COURSE);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [promoteStep, setPromoteStep] = useState(1); // 1: students selection, 2: level C promotion
  const [studentStatuses, setStudentStatuses] = useState({}); // { studentId: isActive }
  const [availableLevelCValues, setAvailableLevelCValues] = useState([]); // Available Level C values for this course
  const [promoteForm, setPromoteForm] = useState({
    levelC: '',
  });
  const [promoting, setPromoting] = useState(false);
  const [savingStudentStatuses, setSavingStudentStatuses] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState('');

  const fetchCourseDetails = useCallback(async () => {
    if (!courseId || !user?.college) return;
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/academic/courses/${courseId}`, {}, true);
      const data = response?.data || response;
      setCourse(data);

      // Fetch level labels and values
      try {
        const configResponse = await api.get(`/academic/config/${user.college}`);
        const config = configResponse?.data || configResponse || {};
        setLevelLabels(normalizeLevelLabels(config.levelNames));
        setLevelValues(normalizeLevelValues(config.levelValues));
      } catch {
        // Use defaults
        setLevelLabels(DEFAULT_LEVEL_LABELS);
        setLevelValues({ A: [], B: [], C: [] });
      }
    } catch (err) {
      setError(err.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  }, [courseId, user?.college]);

  const fetchStudents = useCallback(async () => {
    if (!courseId || !user?.college) return;
    try {
      const response = await api.get(`/students?courseId=${courseId}`, {}, true);
      const data = response?.data || response || [];
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, [courseId, user?.college]);

  const fetchStaffList = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get(`/teachers?college=${user.college}&staffType=teaching`, {}, true);
      const data = response?.data || response || [];
      // Filter to only teaching staff
      const teachingStaff = Array.isArray(data) ? data.filter(s => s.staffType === 'teaching') : [];
      setStaffList(teachingStaff);
    } catch (err) {
      console.error('Failed to load staff:', err);
      setStaffList([]);
    }
  }, [user?.college]);

  const fetchStaff = useCallback(async () => {
    if (!course?.tutor || !user?.college) return;
    try {
      const tutorId = typeof course.tutor === 'object' ? course.tutor._id : course.tutor;
      if (!tutorId) return;

      const response = await api.get(`/teachers/${tutorId}`, {}, true);
      const data = response?.data || response;
      setStaff(data);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  }, [course?.tutor, user?.college]);

  const fetchStats = useCallback(async () => {
    if (!courseId || !user?.college) return;
    try {
      // Calculate stats from students data
      const totalStudents = students.length;
      const enrolledStudents = students.filter((s) => s.enrollmentStatus === 'enrolled').length;
      const completedStudents = students.filter((s) => s.enrollmentStatus === 'completed').length;
      const droppedStudents = students.filter((s) => s.enrollmentStatus === 'dropped').length;
      const activeStudents = students.filter((s) => s.isActive).length;
      const inactiveStudents = students.filter((s) => !s.isActive).length;

      // Calculate attendance stats if available
      const studentsWithAttendance = students.filter((s) => s.attendancePercentage !== undefined);
      const avgAttendance = studentsWithAttendance.length > 0
        ? studentsWithAttendance.reduce((sum, s) => sum + (s.attendancePercentage || 0), 0) / studentsWithAttendance.length
        : 0;

      setStats({
        totalStudents,
        enrolledStudents,
        completedStudents,
        droppedStudents,
        activeStudents,
        inactiveStudents,
        avgAttendance: Math.round(avgAttendance * 100) / 100,
        seatUtilization: course?.seatLimit
          ? Math.round((totalStudents / course.seatLimit) * 100 * 100) / 100
          : null,
      });
    } catch (err) {
      console.error('Failed to calculate stats:', err);
    }
  }, [courseId, students, course?.seatLimit]);

  useEffect(() => {
    if (!user?.college) return;
    fetchCourseDetails();
    fetchStaffList();
  }, [user?.college, courseId, fetchCourseDetails, fetchStaffList]);

  useEffect(() => {
    if (course) {
      fetchStudents();
      fetchStaff();
    }
  }, [course, fetchStudents, fetchStaff]);

  useEffect(() => {
    if (students.length > 0 || course) {
      fetchStats();
    }
  }, [students, course, fetchStats]);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_COURSE);
    setFormErrors({});
    setFormError('');
    setFormSuccess('');
    setShowEditForm(false);
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested academicDuration fields
    if (name === 'academicDurationValue' || name === 'academicDurationUnit') {
      const field = name === 'academicDurationValue' ? 'value' : 'unit';
      const processedValue = field === 'value' ? (value === '' ? '' : Number(value)) : value;
      
      setFormData((prev) => ({
        ...prev,
        academicDuration: {
          value: prev.academicDuration?.value || '',
          unit: prev.academicDuration?.unit || 'month',
          [field]: processedValue,
        },
      }));
      
      setFormErrors((prev) => {
        if (prev.academicDuration) {
          const { academicDuration, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    } else if (name === 'levelA') {
      // When Level A changes, reset Level B and Level C
      setFormData((prev) => ({
        ...prev,
        levelA: value,
        levelB: '',
        levelC: '',
      }));
      
      setFormErrors((prev) => {
        const { levelA, ...rest } = prev;
        return rest;
      });
    } else if (name === 'levelB') {
      // When Level B changes, reset Level C
      setFormData((prev) => ({
        ...prev,
        levelB: value,
        levelC: '',
      }));
      
      setFormErrors((prev) => {
        if (prev.levelB) {
          const { levelB, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
      
      setFormErrors((prev) => {
        if (prev[name]) {
          const { [name]: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    }
    setFormError('');
  }, []);

  const validateForm = useCallback(() => {
    const nextErrors = {};
    const batch = formData.batch.trim();
    const name = formData.name.trim();
    
    if (!batch) nextErrors.batch = 'Batch is required';
    if (!name) {
      nextErrors.name = 'Name is required';
    } else if (name.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.levelA.trim()) nextErrors.levelA = `${levelLabels.A} is required`;
    
    const duration = formData.academicDuration;
    if (!duration?.value || duration.value < 1) {
      nextErrors.academicDuration = 'Academic duration value must be at least 1';
    } else if (!duration.unit) {
      nextErrors.academicDuration = 'Academic duration unit is required';
    }
    
    if (!formData.startDate) nextErrors.startDate = 'Start date is required';
    
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData, levelLabels]);

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
        batch: formData.batch.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        levelA: formData.levelA.trim(),
        levelB: formData.levelB.trim() || undefined,
        levelC: formData.levelC.trim() || undefined,
        academicDuration: {
          value: Number(formData.academicDuration.value),
          unit: formData.academicDuration.unit,
        },
        startDate: formData.startDate,
        seatLimit: formData.seatLimit ? Number(formData.seatLimit) : undefined,
        tutor: formData.tutor.trim() || undefined,
        completedDate: formData.completedDate || undefined,
        isActive: !!formData.isActive,
        college: user.college,
      };

      await api.put(`/academic/courses/${courseId}`, payload, {}, true);
      setFormSuccess('Course updated successfully.');
      
      await fetchCourseDetails();
      resetForm();
    } catch (err) {
      setFormError(err.message || 'Failed to save course');
    } finally {
      setSaving(false);
      setTimeout(() => setFormSuccess(''), 3000);
    }
  }, [formData, validateForm, courseId, user.college, fetchCourseDetails, resetForm]);

  const handleEditClick = useCallback(() => {
    if (!course) return;
    setFormData({
      batch: course.batch || '',
      name: course.name || '',
      description: course.description || '',
      levelA: course.levelA || '',
      levelB: course.levelB || '',
      levelC: course.levelC || '',
      academicDuration: {
        value: course.academicDuration?.value || '',
        unit: course.academicDuration?.unit || 'month',
      },
      startDate: formatDateForInput(course.startDate),
      seatLimit: course.seatLimit !== undefined && course.seatLimit !== null ? String(course.seatLimit) : '',
      tutor: course.tutor?._id || course.tutor?.id || course.tutor || '',
      completedDate: formatDateForInput(course.completedDate),
      isActive: course.isActive ?? true,
    });
    setFormErrors({});
    setFormError('');
    setFormSuccess('');
    setShowEditForm(true);
  }, [course]);

  // Initialize student statuses when students are loaded
  useEffect(() => {
    if (students.length > 0) {
      const initialStatuses = {};
      students.forEach((student) => {
        initialStatuses[student._id || student.id] = student.isActive ?? true;
      });
      setStudentStatuses(initialStatuses);
    }
  }, [students]);

  const handleStudentStatusToggle = useCallback((studentId, isActive) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: isActive,
    }));
  }, []);

  // Save student status changes using bulk update API
  const saveStudentStatuses = useCallback(async () => {
    // Find students that have changed status
    const studentsToUpdate = students
      .map((student) => {
        const studentId = student._id || student.id;
        const currentStatus = student.isActive ?? true;
        const newStatus = studentStatuses[studentId] ?? currentStatus;
        
        // Only include if status changed
        if (currentStatus !== newStatus) {
          return {
            studentId: studentId,
            isActive: newStatus,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (studentsToUpdate.length === 0) {
      return { success: true, message: 'No changes to save' };
    }

    try {
      setSavingStudentStatuses(true);
      const response = await api.put(
        '/students/bulk/active-status',
        {
          students: studentsToUpdate,
        },
        {},
        true
      );

      const responseData = response?.data || response;
      
      if (responseData.success === false) {
        return {
          success: false,
          message: responseData.message || 'Failed to update student statuses',
        };
      }

      // Refresh students list
      await fetchStudents();

      return {
        success: true,
        message: responseData.message || 'Student statuses updated successfully',
        data: responseData.data,
      };
    } catch (err) {
      const errorMessage = err.message || 
        (err.response?.data?.message) || 
        (err.response?.data?.error) ||
        'Failed to update student statuses';
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setSavingStudentStatuses(false);
    }
  }, [students, studentStatuses, fetchStudents]);

  // Fetch available Level C values based on course's Level A and Level B
  const fetchAvailableLevelCValues = useCallback(async () => {
    if (!course?.levelA || !user?.college) {
      setAvailableLevelCValues([]);
      return;
    }

    try {
      const configResponse = await api.get(`/academic/config/${user.college}`);
      const config = configResponse?.data || configResponse || {};
      
      if (!config.levelValues || !config.levelValues.C) {
        setAvailableLevelCValues([]);
        return;
      }

      let levelCValues = [];

      if (course.levelB) {
        // If course has levelB, get Level C entries where parent === course.levelB
        const levelCEntries = config.levelValues.C.filter(
          (entry) => entry.parent === course.levelB
        );
        levelCEntries.forEach((entry) => {
          entry.values.forEach((value) => {
            if (!levelCValues.includes(value)) {
              levelCValues.push(value);
            }
          });
        });
      } else {
        // If course doesn't have levelB, get all Level C values from Level B entries
        // that have course.levelA as parent
        if (config.levelValues.B) {
          const levelBEntries = config.levelValues.B.filter(
            (entry) => entry.parent === course.levelA
          );
          
          levelBEntries.forEach((levelBEntry) => {
            levelBEntry.values.forEach((levelBValue) => {
              const levelCEntries = config.levelValues.C.filter(
                (entry) => entry.parent === levelBValue
              );
              levelCEntries.forEach((levelCEntry) => {
                levelCEntry.values.forEach((levelCValue) => {
                  if (!levelCValues.includes(levelCValue)) {
                    levelCValues.push(levelCValue);
                  }
                });
              });
            });
          });
        }
      }

      setAvailableLevelCValues(levelCValues.sort());
    } catch (err) {
      console.error('Failed to fetch Level C values:', err);
      setAvailableLevelCValues([]);
    }
  }, [course?.levelA, course?.levelB, user?.college]);

  useEffect(() => {
    if (course && showPromoteModal) {
      fetchAvailableLevelCValues();
    }
  }, [course, showPromoteModal, fetchAvailableLevelCValues]);

  const handlePromoteLevelC = useCallback(async () => {
    if (!promoteForm.levelC) {
      setPromoteError('Please select a Level C value');
      return;
    }

    if (!courseId) {
      setPromoteError('Course ID is missing');
      return;
    }

    setPromoting(true);
    setPromoteError('');
    setPromoteSuccess('');

    try {
      const response = await api.post(
        `/academic/config/${courseId}/promote-level-c`,
        {
          levelC: promoteForm.levelC,
        },
        {},
        true
      );

      // Handle API response structure
      const responseData = response?.data || response;
      
      if (responseData.success === false) {
        setPromoteError(responseData.message || 'Failed to update Level C');
        return;
      }

      setPromoteSuccess('Level C updated successfully');
      
      // Refresh course details
      await fetchCourseDetails();

      // Reset form
      setPromoteForm({
        levelC: '',
      });

      setTimeout(() => {
        setPromoteSuccess('');
      }, 3000);
    } catch (err) {
      // Handle error response structure
      const errorMessage = err.message || 
        (err.response?.data?.message) || 
        (err.response?.data?.error) ||
        'Failed to update Level C';
      setPromoteError(errorMessage);
    } finally {
      setPromoting(false);
    }
  }, [promoteForm, courseId, fetchCourseDetails]);

  const openPromoteModal = useCallback(() => {
    // Initialize student statuses from current student data
    const initialStatuses = {};
    students.forEach((student) => {
      const studentId = student._id || student.id;
      initialStatuses[studentId] = student.isActive ?? true;
    });
    setStudentStatuses(initialStatuses);
    
    setShowPromoteModal(true);
    setPromoteStep(1);
    setPromoteError('');
    setPromoteSuccess('');
    setPromoteForm({
      levelC: course?.levelC || '',
    });
  }, [course?.levelC, students]);

  const closePromoteModal = useCallback(() => {
    setShowPromoteModal(false);
    setPromoteStep(1);
    setPromoteError('');
    setPromoteSuccess('');
  }, []);

  // Define columns for Students DataTable
  const studentColumns = useMemo(() => [
    {
      id: 'studentId',
      accessorKey: 'studentId',
      header: 'Student ID',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <span className="font-medium">{row.studentId || row.rollNumber || '-'}</span>
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
      id: 'enrollmentStatus',
      accessorKey: 'enrollmentStatus',
      header: 'Status',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'enrolled', label: 'Enrolled' },
        { value: 'completed', label: 'Completed' },
        { value: 'dropped', label: 'Dropped' },
        { value: 'pending', label: 'Pending' },
      ],
      cell: ({ row }) => {
        const status = row.enrollmentStatus || 'pending';
        const statusColors = {
          enrolled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
          completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
          dropped: 'bg-red-500/10 text-red-600 dark:text-red-400',
          pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        };
        return (
          <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[status] || 'bg-gray-500/10 text-gray-600'}`}>
            {status}
          </span>
        );
      },
    },
    {
      id: 'enrollmentDate',
      accessorKey: 'enrollmentDate',
      header: 'Enrollment Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
      cell: ({ row }) => row.enrollmentDate ? formatDateForDisplay(row.enrollmentDate) : '-',
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Active',
      type: 'boolean',
      cell: ({ row }) => (
        <span
          className={`text-xs px-2 py-1 rounded ${
            row.isActive
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
          }`}
        >
          {row.isActive ? 'Yes' : 'No'}
        </span>
      ),
    },
  ], []);

  // Define actions for Students DataTable
  const studentActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/app/students/${row._id}`);
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
            <p className="text-muted-foreground">Loading course details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || 'Course not found'}</p>
            <Button onClick={() => router.push('/app/courses')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
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
            onClick={() => router.push('/app/courses')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">{course.name}</h1>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  course.isActive
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                }`}
              >
                {course.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-muted-foreground mt-2">
              Batch: <span className="font-semibold">{course.batch}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchCourseDetails();
              fetchStudents();
              fetchStaff();
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
            Edit Course
          </Button>
          <Button
            onClick={openPromoteModal}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <PromoteIcon className="h-4 w-4" />
            Promote
          </Button>
        </div>
      </div>

            {/* Statistics Cards */}
            {stats && (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold mt-1">{stats.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enrolled</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.enrolledStudents}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.completedStudents}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeStudents}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>
          {stats.seatUtilization !== null && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Seat Utilization</p>
                  <p className="text-2xl font-bold mt-1">{stats.seatUtilization}%</p>
                </div>
                <Clock className="h-8 w-8 text-primary opacity-50" />
              </div>
            </div>
          )}
          {stats.avgAttendance > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Attendance</p>
                  <p className="text-2xl font-bold mt-1">{stats.avgAttendance}%</p>
                </div>
                <Calendar className="h-8 w-8 text-primary opacity-50" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Course Information */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Course Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div>
            <p className="text-sm text-muted-foreground">{levelLabels.A}</p>
            <p className="font-medium mt-1">{course.levelA || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{levelLabels.B}</p>
            <p className="font-medium mt-1">{course.levelB || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{levelLabels.C}</p>
            <p className="font-medium mt-1">{course.levelC || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Academic Duration</p>
            <p className="font-medium mt-1">
              {course.academicDuration
                ? `${course.academicDuration.value} ${course.academicDuration.unit}`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium mt-1">
              {course.startDate ? formatDateForDisplay(course.startDate) : '-'}
            </p>
          </div>
          {course.completedDate && (
            <div>
              <p className="text-sm text-muted-foreground">Completed Date</p>
              <p className="font-medium mt-1">{formatDateForDisplay(course.completedDate)}</p>
            </div>
          )}
          {course.seatLimit && (
            <div>
              <p className="text-sm text-muted-foreground">Seat Limit</p>
              <p className="font-medium mt-1">{course.seatLimit}</p>
            </div>
          )}
          {staff && (
            <div>
              <p className="text-sm text-muted-foreground">Tutor</p>
              <button
                onClick={() => setShowStaffModal(true)}
                className="font-medium mt-1 text-primary hover:underline cursor-pointer"
              >
                {staff.name || '-'}
              </button>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium mt-1">{course.description || 'No description'}</p>
          </div>
        </div>
      </div>

      {/* Staff Details Modal */}
      {showStaffModal && staff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Staff Details</h2>
              <Button variant="ghost" onClick={() => setShowStaffModal(false)} className="gap-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium mt-1">{staff.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee ID</p>
                  <p className="font-medium mt-1">{staff.employeeId || '-'}</p>
                </div>
                {staff.designation && (
                  <div>
                    <p className="text-sm text-muted-foreground">Designation</p>
                    <p className="font-medium mt-1">{staff.designation}</p>
                  </div>
                )}
                {staff.department && (
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium mt-1">{staff.department}</p>
                  </div>
                )}
                {staff.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{staff.phone}</p>
                    </div>
                  </div>
                )}
                {staff.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{staff.email}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowStaffModal(false);
                    router.push(`/app/staff/${staff._id || staff.id}`);
                  }}
                  className="gap-2"
                >
                  View Full Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students List */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Enrolled Students</h2>
          <span className="text-sm text-muted-foreground">
            {students.length} student{students.length !== 1 ? 's' : ''}
          </span>
        </div>
        <DataTable
          data={students}
          columns={studentColumns}
          actions={studentActions}
          loading={false}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey={`course-${courseId}-students-table`}
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No students enrolled in this course"
        />
      </div>

      {/* Promote Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {promoteStep === 1 ? 'Select Students' : 'Promote Level C'}
              </h2>
              <Button variant="ghost" onClick={closePromoteModal} className="gap-2">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {promoteError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
                <p className="text-sm text-destructive">{promoteError}</p>
              </div>
            )}

            {promoteSuccess && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md mb-4">
                <p className="text-sm text-green-600 dark:text-green-400">{promoteSuccess}</p>
              </div>
            )}

            {/* Step 1: Students Selection */}
            {promoteStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Select students and toggle their active/inactive status
                </p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">Student ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                          <th className="px-4 py-3 text-center text-sm font-medium">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">
                              No students found
                            </td>
                          </tr>
                        ) : (
                          students.map((student) => {
                            const studentId = student._id || student.id;
                            // Get status from studentStatuses state, fallback to student's current isActive
                            const isActive = studentStatuses[studentId] !== undefined 
                              ? studentStatuses[studentId] 
                              : (student.isActive ?? true);
                            return (
                              <tr key={studentId} className="border-t border-border hover:bg-muted/30">
                                <td className="px-4 py-3 text-sm">{student.studentId || student.rollNumber || '-'}</td>
                                <td className="px-4 py-3 text-sm font-medium">{student.name || '-'}</td>
                                <td className="px-4 py-3 text-sm">{student.email || '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  <Checkbox
                                  className="data-[state=checked]:bg-green-600 data-[state=checked]:text-white"
                                    checked={isActive}
                                    onCheckedChange={(checked) =>
                                      handleStudentStatusToggle(studentId, checked === true)
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={closePromoteModal}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      const result = await saveStudentStatuses();
                      if (result.success) {
                        if (result.message && result.message !== 'No changes to save') {
                          setPromoteSuccess(result.message);
                          setTimeout(() => setPromoteSuccess(''), 3000);
                        }
                      } else {
                        setPromoteError(result.message);
                      }
                    }}
                    disabled={savingStudentStatuses}
                    variant="outline"
                    className="gap-2"
                  >
                    {savingStudentStatuses ? 'Saving...' : 'Save Statuses'}
                  </Button>
                  <Button
                    onClick={async () => {
                      // Save student status changes before moving to next step
                      const result = await saveStudentStatuses();
                      if (result.success) {
                        if (result.message && result.message !== 'No changes to save') {
                          setPromoteSuccess(result.message);
                          setTimeout(() => setPromoteSuccess(''), 3000);
                        }
                        setPromoteStep(2);
                      } else {
                        setPromoteError(result.message);
                      }
                    }}
                    disabled={savingStudentStatuses}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {savingStudentStatuses ? 'Saving...' : 'Next'}
                    {!savingStudentStatuses && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Level C Promotion */}
            {promoteStep === 2 && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <p className="text-sm font-medium mb-2">Course Information:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{levelLabels.A}:</span>{' '}
                      <span className="font-medium">{course?.levelA || '-'}</span>
                    </div>
                    {course?.levelB && (
                      <div>
                        <span className="text-muted-foreground">{levelLabels.B}:</span>{' '}
                        <span className="font-medium">{course.levelB}</span>
                      </div>
                    )}
                    {course?.levelC && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Current {levelLabels.C}:</span>{' '}
                        <span className="font-medium">{course.levelC}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Select a {levelLabels.C} value for this course based on the course's {levelLabels.A} and {levelLabels.B}
                </p>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {levelLabels.C} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={promoteForm.levelC}
                    onChange={(e) =>
                      setPromoteForm((prev) => ({
                        ...prev,
                        levelC: e.target.value,
                      }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select {levelLabels.C}</option>
                    {availableLevelCValues.length === 0 ? (
                      <option value="" disabled>
                        No {levelLabels.C} values available for this course
                      </option>
                    ) : (
                      availableLevelCValues.map((value, idx) => (
                        <option key={idx} value={value}>
                          {value}
                        </option>
                      ))
                    )}
                  </select>
                  {availableLevelCValues.length === 0 && course?.levelA && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No {levelLabels.C} values found for {levelLabels.A}: "{course.levelA}"
                      {course.levelB && ` and ${levelLabels.B}: "${course.levelB}"`}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setPromoteStep(1)} className="gap-2">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back
                  </Button>
                  <Button variant="outline" onClick={closePromoteModal}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePromoteLevelC}
                    disabled={promoting || !promoteForm.levelC}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {promoting ? 'Updating...' : 'Update Level C'}
                    <PromoteIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Course Form Modal */}
      {showEditForm && (
        <CourseForm
          formData={formData}
          formErrors={formErrors}
          levelLabels={levelLabels}
          levelValues={levelValues}
          staff={staffList}
          editingCourse={course}
          saving={saving}
          error={formError}
          success={formSuccess}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          onCancel={resetForm}
        />
      )}
    </div>
  );
}

