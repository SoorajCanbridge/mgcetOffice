/**
 * Example: How to integrate DataTable into your existing pages
 * 
 * This shows how to convert the courses page to use DataTable
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Example: Converting courses page to use DataTable
export function CoursesPageWithDataTable() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      const response = await api.get(`/academic/courses?college=${user.college}`, {}, true);
      const data = response?.data || response || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.college]);

  useEffect(() => {
    if (!user?.college) return;
    fetchCourses();
  }, [user?.college, fetchCourses]);

  // Define columns
  const columns = [
    {
      id: 'batch',
      accessorKey: 'batch',
      header: 'Batch',
      type: 'text',
      searchable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Course Name',
      type: 'text',
      searchable: true,
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      type: 'text',
      searchable: true,
    },
    {
      id: 'levelA',
      accessorKey: 'levelA',
      header: 'Level A',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'Level A', label: 'Level A' },
        { value: 'Level B', label: 'Level B' },
      ],
    },
    {
      id: 'academicDuration',
      accessorKey: 'academicDuration',
      header: 'Duration',
      type: 'text',
      cell: ({ row }) => {
        const duration = row.academicDuration;
        if (!duration) return '-';
        return `${duration.value} ${duration.unit}`;
      },
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: 'Start Date',
      type: 'date',
      formatOptions: {
        dateFormat: (date) => date.toLocaleDateString('en-US'),
      },
      filterable: true,
      filterType: 'date-range',
    },
    {
      id: 'seatLimit',
      accessorKey: 'seatLimit',
      header: 'Seat Limit',
      type: 'number',
      filterable: true,
      filterType: 'number-range',
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Status',
      type: 'boolean',
      formatOptions: {
        trueLabel: 'Active',
        falseLabel: 'Inactive',
      },
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ],
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            row.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          }`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  // Define actions
  const actions = (row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          // Handle edit
          console.log('Edit course:', row);
        }}>
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          // Handle delete
          console.log('Delete course:', row);
        }}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Courses</h1>
        <Button onClick={fetchCourses}>Refresh</Button>
      </div>

      <DataTable
        data={courses}
        columns={columns}
        actions={actions}
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
        onRowClick={(row) => {
          // Handle row click - e.g., navigate to detail page
          console.log('Row clicked:', row);
        }}
      />
    </div>
  );
}

