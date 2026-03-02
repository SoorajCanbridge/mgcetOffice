/**
 * Example usage of the DataTable component
 * 
 * This file demonstrates how to use the DataTable component with various features.
 * Copy and adapt these examples to your needs.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Example 1: Basic Table
export function BasicTableExample() {
  const data = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, status: 'Active' },
  ];

  const columns = [
    {
      id: 'id',
      accessorKey: 'id',
      header: 'ID',
      type: 'number',
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      type: 'text',
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: 'Email',
      type: 'text',
    },
    {
      id: 'age',
      accessorKey: 'age',
      header: 'Age',
      type: 'number',
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      type: 'text',
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      storageKey="basic-table"
    />
  );
}

// Example 2: Table with All Features
export function AdvancedTableExample() {
  const data = [
    {
      id: 1,
      name: 'Product A',
      price: 99.99,
      quantity: 150,
      category: 'Electronics',
      inStock: true,
      createdAt: '2024-01-15',
      revenue: 14998.5,
    },
    {
      id: 2,
      name: 'Product B',
      price: 149.99,
      quantity: 75,
      category: 'Clothing',
      inStock: true,
      createdAt: '2024-02-20',
      revenue: 11249.25,
    },
    {
      id: 3,
      name: 'Product C',
      price: 49.99,
      quantity: 0,
      category: 'Electronics',
      inStock: false,
      createdAt: '2024-03-10',
      revenue: 0,
    },
  ];

  const columns = [
    {
      id: 'id',
      accessorKey: 'id',
      header: 'ID',
      type: 'number',
      sortable: true,
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Product Name',
      type: 'text',
      searchable: true,
      filterable: true,
      filterType: 'text',
    },
    {
      id: 'price',
      accessorKey: 'price',
      header: 'Price',
      type: 'currency',
      formatOptions: {
        currency: 'USD',
      },
      filterable: true,
      filterType: 'number-range',
    },
    {
      id: 'quantity',
      accessorKey: 'quantity',
      header: 'Quantity',
      type: 'number',
      filterable: true,
      filterType: 'number-range',
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      type: 'text',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'Electronics', label: 'Electronics' },
        { value: 'Clothing', label: 'Clothing' },
        { value: 'Food', label: 'Food' },
      ],
    },
    {
      id: 'inStock',
      accessorKey: 'inStock',
      header: 'In Stock',
      type: 'boolean',
      formatOptions: {
        trueLabel: 'Yes',
        falseLabel: 'No',
      },
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ],
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Created Date',
      type: 'date',
      formatOptions: {
        dateFormat: (date) => date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
      },
      filterable: true,
      filterType: 'date-range',
    },
    {
      id: 'revenue',
      accessorKey: 'revenue',
      header: 'Revenue',
      type: 'currency',
      formatOptions: {
        currency: 'USD',
      },
    },
  ];

  const actions = (row) => (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          console.log('View', row);
        }}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          console.log('Edit', row);
        }}>
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          console.log('Delete', row);
        }}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const handleRowClick = (row) => {
    console.log('Row clicked:', row);
  };

  const handleExport = (data) => {
    // Implement your export logic here
    console.log('Exporting data:', data);
    // Example: Convert to CSV
    const csv = [
      columns.map((col) => col.header).join(','),
      ...data.map((row) =>
        columns.map((col) => {
          const value = col.accessorFn ? col.accessorFn(row) : row[col.accessorKey];
          return `"${value}"`;
        }).join(',')
      ),
    ].join('\n');
    console.log(csv);
  };

  return (
    <DataTable
      data={data}
      columns={columns}
      actions={actions}
      onRowClick={handleRowClick}
      searchable={true}
      filterable={true}
      sortable={true}
      showColumnVisibility={true}
      showSettings={true}
      enableExport={true}
      onExport={handleExport}
      storageKey="advanced-table"
      defaultPageSize={10}
      pageSizeOptions={[5, 10, 20, 50]}
      emptyMessage="No products found"
    />
  );
}

// Example 3: Table with Custom Cell Renderers
export function CustomCellTableExample() {
  const data = [
    {
      id: 1,
      name: 'John Doe',
      avatar: 'JD',
      score: 85,
      progress: 0.75,
      tags: ['Developer', 'Senior'],
    },
    {
      id: 2,
      name: 'Jane Smith',
      avatar: 'JS',
      score: 92,
      progress: 0.92,
      tags: ['Designer', 'Lead'],
    },
  ];

  const columns = [
    {
      id: 'id',
      accessorKey: 'id',
      header: 'ID',
      type: 'number',
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      type: 'text',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
            {row.avatar}
          </div>
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      id: 'score',
      accessorKey: 'score',
      header: 'Score',
      type: 'number',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${row.score}%` }}
            />
          </div>
          <span>{row.score}%</span>
        </div>
      ),
    },
    {
      id: 'tags',
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      storageKey="custom-cell-table"
    />
  );
}

// Example 4: Table with Nested Data
export function NestedDataTableExample() {
  const data = [
    {
      id: 1,
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      address: {
        city: 'New York',
        country: 'USA',
      },
    },
    {
      id: 2,
      user: {
        name: 'Jane Smith',
        email: 'jane@example.com',
      },
      address: {
        city: 'London',
        country: 'UK',
      },
    },
  ];

  const columns = [
    {
      id: 'id',
      accessorKey: 'id',
      header: 'ID',
      type: 'number',
    },
    {
      id: 'name',
      accessorKey: 'user.name',
      header: 'Name',
      type: 'text',
      accessorFn: (row) => row.user?.name,
    },
    {
      id: 'email',
      accessorKey: 'user.email',
      header: 'Email',
      type: 'text',
      accessorFn: (row) => row.user?.email,
    },
    {
      id: 'city',
      accessorKey: 'address.city',
      header: 'City',
      type: 'text',
      accessorFn: (row) => row.address?.city,
    },
    {
      id: 'country',
      accessorKey: 'address.country',
      header: 'Country',
      type: 'text',
      accessorFn: (row) => row.address?.country,
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      storageKey="nested-data-table"
    />
  );
}

// Example 5: Integration Example - Courses Page with DataTable
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Courses</h1>
        <Button onClick={fetchCourses} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
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

// Default export for Next.js page
export default function TestPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">DataTable Examples</h1>
        <p className="text-muted-foreground">
          This page demonstrates various features of the DataTable component.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Example 1: Basic Table</h2>
          <BasicTableExample />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Example 2: Advanced Table (All Features)</h2>
          <AdvancedTableExample />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Example 3: Custom Cell Renderers</h2>
          <CustomCellTableExample />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Example 4: Nested Data</h2>
          <NestedDataTableExample />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Example 5: Integration Example - Real API Data</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This example shows how to integrate DataTable with real API data, including loading states,
            error handling, and dynamic column configuration. It demonstrates a real-world use case similar
            to your courses page.
          </p>
          <CoursesPageWithDataTable />
        </div>
      </div>
    </div>
  );
}
