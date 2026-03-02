/**
 * Example usage of the DataTable component
 * 
 * This file demonstrates how to use the DataTable component with various features.
 * Copy and adapt these examples to your needs.
 */

'use client';

import { DataTable } from './data-table';
import { Button } from './ui/button';
import { Edit2, Trash2, Eye } from 'lucide-react';

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

