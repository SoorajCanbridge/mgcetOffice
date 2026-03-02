'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Edit2, Trash2, RefreshCcw, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/data-table';
import CourseForm from '@/components/course-form';
import { AnalyticsStrip } from '@/components/analytics/AnalyticsStrip';

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

const getCourseId = (course) => course._id || course.id;

export default function CoursesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [levelLabels, setLevelLabels] = useState(DEFAULT_LEVEL_LABELS);
  const [levelValues, setLevelValues] = useState({ A: [], B: [], C: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState(EMPTY_COURSE);
  const [showForm, setShowForm] = useState(false);

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

  const fetchStaff = useCallback(async () => {
    if (!user?.college) return;
    try {
      const response = await api.get(`/teachers?college=${user.college}&staffType=teaching`, {}, true);
      const data = response?.data || response || [];
      // Filter to only teaching staff
      const teachingStaff = Array.isArray(data) ? data.filter(s => s.staffType === 'teaching') : [];
      setStaff(teachingStaff);
    } catch (err) {
      console.error('Failed to load staff:', err);
      setStaff([]);
    }
  }, [user?.college]);

  const fetchCourses = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/academic/courses?collegeId=${user.college}`, {}, true);
      const data = response?.data || response || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchLevelLabels();
    fetchStaff();
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.college]);

  const resetForm = useCallback(() => {
    setFormData(EMPTY_COURSE);
    setFormErrors({});
    setEditingCourse(null);
    setError('');
    setSuccess('');
    setShowForm(false);
  }, []);

  const handleChange = useCallback((e) => {
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
    setError('');
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

      const courseId = editingCourse ? getCourseId(editingCourse) : null;
      if (courseId) {
        await api.put(`/academic/courses/${courseId}`, payload, {}, true);
        setSuccess('Course updated successfully.');
      } else {
        await api.post('/academic/courses', payload, {}, true);
        setSuccess('Course created successfully.');
      }

      await fetchCourses();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Failed to save course');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  }, [formData, validateForm, editingCourse, user.college, fetchCourses, resetForm]);

  const handleEdit = useCallback((course) => {
    setEditingCourse(course);
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
    setError('');
    setSuccess('');
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (course) => {
    const id = getCourseId(course);
    if (!id) return;

    const confirmed = typeof window !== 'undefined' ? window.confirm('Delete this course?') : true;
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError('');
      setSuccess('');
      await api.delete(`/academic/courses/${id}`, {}, true);
      setSuccess('Course deleted.');
      await fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to delete course');
    } finally {
      setDeletingId('');
      setTimeout(() => setSuccess(''), 3000);
    }
  }, [fetchCourses]);

  const headingSubtitle = useMemo(
    () => `Manage courses for your institution${levelLabels.A ? ` with ${levelLabels.A}/${levelLabels.B}/${levelLabels.C}` : ''}.`,
    [levelLabels.A, levelLabels.B, levelLabels.C]
  );


  // Define columns for Courses DataTable
  const courseColumns = useMemo(() => [
    {
      id: 'batch',
      accessorKey: 'batch',
      header: 'Batch',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <span className="text-sm font-semibold px-2 py-1 rounded bg-primary/10 text-primary">
          {row.batch}
        </span>
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Course Name',
      type: 'text',
      searchable: true,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {!row.isActive && (
            <span className="text-xs text-muted-foreground">Inactive</span>
          )}
        </div>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      type: 'text',
      searchable: true,
      cell: ({ row }) => row.description || '-',
    },
    {
      id: 'levelA',
      accessorKey: 'levelA',
      header: levelLabels.A,
      type: 'text',
      searchable: true,
      cell: ({ row }) => row.levelA || '-',
    },
    {
      id: 'levelB',
      accessorKey: 'levelB',
      header: levelLabels.B,
      type: 'text',
      searchable: true,
      cell: ({ row }) => row.levelB || '-',
    },
    {
      id: 'levelC',
      accessorKey: 'levelC',
      header: levelLabels.C,
      type: 'text',
      searchable: true,
      cell: ({ row }) => row.levelC || '-',
    },
    {
      id: 'academicDuration',
      accessorKey: 'academicDuration',
      header: 'Duration',
      type: 'text',
      cell: ({ row }) => {
        if (!row.academicDuration) return '-';
        return `${row.academicDuration.value} ${row.academicDuration.unit}`;
      },
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: 'Start Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
      cell: ({ row }) => row.startDate ? formatDateForDisplay(row.startDate) : '-',
    },
    {
      id: 'completedDate',
      accessorKey: 'completedDate',
      header: 'Completed Date',
      type: 'date',
      formatOptions: {
        locale: 'en-US',
      },
      cell: ({ row }) => row.completedDate ? formatDateForDisplay(row.completedDate) : '-',
    },
    {
      id: 'seatLimit',
      accessorKey: 'seatLimit',
      header: 'Seat Limit',
      type: 'number',
      cell: ({ row }) => row.seatLimit || '-',
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Status',
      type: 'boolean',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ],
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

  // Define actions for Courses DataTable
  const courseActions = useCallback((row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/app/courses/${getCourseId(row)}`);
        }}
      >
        <Eye className="h-4 w-4" />
        
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
       
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-2"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(row);
        }}
        disabled={deletingId === getCourseId(row)}
      >
        <Trash2 className="h-4 w-4" />
        {/* {deletingId === getCourseId(row) ? 'Deleting...' : 'Delete'} */}
      </Button>
    </div>
  ), [deletingId, router]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Courses</h1>
          </div>
          <p className="text-muted-foreground mt-2">{headingSubtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCourses} className="gap-2" disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
           
          </Button>
          <Button 
            onClick={() => {
              resetForm();
              setShowForm(true);
            }} 
            className="gap-2" 
            variant={showForm ? 'outline' : 'default'}
          >
            <Plus className="h-4 w-4" />
            New Course
          </Button>
        </div>
      </div>

      <AnalyticsStrip collegeId={user?.college} className="mb-2" />

      {!showForm && error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!showForm && success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Course Form Modal */}
      {showForm && (
        <CourseForm
          formData={formData}
          formErrors={formErrors}
          levelLabels={levelLabels}
          levelValues={levelValues}
          staff={staff}
          editingCourse={editingCourse}
          saving={saving}
          error={error}
          success={success}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}

      {/* Course List - DataTable */}
      <div className="bg-card border border-border rounded-lg p-4">
        <DataTable
          data={courses}
          columns={courseColumns}
          actions={courseActions}
          loading={loading}
          searchable={true}
          filterable={true}
          sortable={true}
          showColumnVisibility={true}
          showSettings={true}
          storageKey="courses-table"
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No courses found"
          onRowClick={(row) => handleEdit(row)}
        />
      </div>
    </div>
  );
}

