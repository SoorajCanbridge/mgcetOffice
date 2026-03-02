# DataTable Component

A comprehensive, reusable table component built with React and shadcn/ui components. This component provides all the essential table features including pagination, filtering, sorting, search, column visibility, and more.

## Features

✅ **Pagination** - Navigate through large datasets with customizable page sizes  
✅ **Search** - Global search across searchable columns  
✅ **Filtering** - Multiple filter types: text, select, date-range, number-range  
✅ **Sorting** - Click column headers to sort (ascending/descending)  
✅ **Column Visibility** - Show/hide columns dynamically  
✅ **Table Settings** - Persist user preferences in localStorage  
✅ **Actions Column** - Custom action buttons per row  
✅ **Data Type Support** - Text, number, currency, date, datetime, boolean, percentage, and custom renderers  
✅ **Export** - Export filtered/sorted data  
✅ **Responsive** - Mobile-friendly design  
✅ **Loading States** - Built-in loading indicator  
✅ **Empty States** - Customizable empty state messages  

## Installation

The component uses the following dependencies (already installed):
- `@radix-ui/react-select`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-popover`
- `lucide-react`
- `tailwindcss`

## Basic Usage

```jsx
import { DataTable } from '@/components/data-table';

const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
];

const columns = [
  { id: 'id', accessorKey: 'id', header: 'ID', type: 'number' },
  { id: 'name', accessorKey: 'name', header: 'Name', type: 'text' },
  { id: 'email', accessorKey: 'email', header: 'Email', type: 'text' },
  { id: 'age', accessorKey: 'age', header: 'Age', type: 'number' },
];

export default function MyPage() {
  return <DataTable data={data} columns={columns} storageKey="my-table" />;
}
```

## Column Configuration

### Column Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for the column (required if no accessorKey) |
| `accessorKey` | `string` | Key to access data from row object |
| `accessorFn` | `function` | Function to extract value from row (overrides accessorKey) |
| `header` | `string` | Column header text |
| `type` | `string` | Data type: 'text', 'number', 'currency', 'date', 'datetime', 'boolean', 'percentage' |
| `sortable` | `boolean` | Enable/disable sorting (default: true) |
| `searchable` | `boolean` | Include in global search (default: true) |
| `filterable` | `boolean` | Show filter for this column (default: false) |
| `filterType` | `string` | Filter type: 'text', 'select', 'date-range', 'number-range' |
| `filterOptions` | `array` | Options for select filter: `[{value, label}]` |
| `cell` | `function` | Custom cell renderer: `({row, getValue}) => ReactNode` |
| `formatOptions` | `object` | Formatting options (see below) |
| `headerClassName` | `string` | CSS classes for header |
| `cellClassName` | `string` | CSS classes for cell |

### Data Types

#### Text
```jsx
{ type: 'text' }
```

#### Number
```jsx
{ 
  type: 'number',
  formatOptions: {
    locale: 'en-US',
    numberFormat: { minimumFractionDigits: 2 }
  }
}
```

#### Currency
```jsx
{ 
  type: 'currency',
  formatOptions: {
    currency: 'USD',
    locale: 'en-US'
  }
}
```

#### Date
```jsx
{ 
  type: 'date',
  formatOptions: {
    dateFormat: (date) => date.toLocaleDateString('en-US'),
    locale: 'en-US'
  }
}
```

#### DateTime
```jsx
{ 
  type: 'datetime',
  formatOptions: {
    dateFormat: (date) => date.toLocaleString('en-US')
  }
}
```

#### Boolean
```jsx
{ 
  type: 'boolean',
  formatOptions: {
    trueLabel: 'Yes',
    falseLabel: 'No'
  }
}
```

#### Percentage
```jsx
{ 
  type: 'percentage',
  formatOptions: {
    decimals: 2
  }
}
```

#### Custom Cell Renderer
```jsx
{
  cell: ({ row, getValue }) => (
    <div className="flex items-center gap-2">
      <Avatar>{row.name[0]}</Avatar>
      <span>{getValue()}</span>
    </div>
  )
}
```

## Filter Types

### Text Filter
```jsx
{
  filterable: true,
  filterType: 'text'
}
```

### Select Filter
```jsx
{
  filterable: true,
  filterType: 'select',
  filterOptions: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]
}
```

### Date Range Filter
```jsx
{
  filterable: true,
  filterType: 'date-range'
}
```

### Number Range Filter
```jsx
{
  filterable: true,
  filterType: 'number-range'
}
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `array` | `[]` | Array of data objects |
| `columns` | `array` | `[]` | Column configuration array |
| `pagination` | `object` | `{}` | Pagination configuration (deprecated, use pageSize instead) |
| `searchable` | `boolean` | `true` | Enable global search |
| `filterable` | `boolean` | `true` | Enable filtering |
| `sortable` | `boolean` | `true` | Enable sorting |
| `showColumnVisibility` | `boolean` | `true` | Show column visibility toggle |
| `showSettings` | `boolean` | `true` | Show settings dropdown |
| `actions` | `function\|ReactNode` | `undefined` | Actions column content |
| `onRowClick` | `function` | `undefined` | Callback when row is clicked |
| `loading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `string` | `'No data available'` | Message when no data |
| `className` | `string` | `undefined` | Additional CSS classes |
| `storageKey` | `string` | `undefined` | Key for localStorage persistence |
| `defaultPageSize` | `number` | `10` | Default rows per page |
| `pageSizeOptions` | `array` | `[10, 20, 50, 100]` | Available page sizes |
| `enableExport` | `boolean` | `false` | Show export button |
| `onExport` | `function` | `undefined` | Export callback `(data) => void` |

## Examples

### Basic Table
```jsx
<DataTable
  data={users}
  columns={userColumns}
  storageKey="users-table"
/>
```

### Table with Actions
```jsx
const actions = (row) => (
  <div className="flex gap-2">
    <Button onClick={() => handleEdit(row)}>Edit</Button>
    <Button onClick={() => handleDelete(row)}>Delete</Button>
  </div>
);

<DataTable
  data={users}
  columns={userColumns}
  actions={actions}
/>
```

### Table with Row Click
```jsx
<DataTable
  data={users}
  columns={userColumns}
  onRowClick={(row) => navigate(`/users/${row.id}`)}
/>
```

### Table with Export
```jsx
const handleExport = (data) => {
  const csv = convertToCSV(data, columns);
  downloadCSV(csv, 'users.csv');
};

<DataTable
  data={users}
  columns={userColumns}
  enableExport={true}
  onExport={handleExport}
/>
```

### Full Featured Table
```jsx
<DataTable
  data={products}
  columns={productColumns}
  searchable={true}
  filterable={true}
  sortable={true}
  showColumnVisibility={true}
  showSettings={true}
  actions={productActions}
  onRowClick={handleProductClick}
  loading={isLoading}
  emptyMessage="No products found"
  storageKey="products-table"
  defaultPageSize={20}
  pageSizeOptions={[10, 20, 50, 100]}
  enableExport={true}
  onExport={handleExport}
/>
```

## Advanced Usage

### Nested Data Access
```jsx
const columns = [
  {
    id: 'userName',
    header: 'User Name',
    accessorFn: (row) => row.user?.name,
  },
  {
    id: 'address',
    header: 'City',
    accessorFn: (row) => row.address?.city,
  },
];
```

### Custom Cell with Row Data
```jsx
const columns = [
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.isActive ? 'success' : 'danger'}>
        {row.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
];
```

### Conditional Formatting
```jsx
const columns = [
  {
    id: 'amount',
    header: 'Amount',
    type: 'currency',
    cell: ({ row }) => {
      const amount = row.amount;
      return (
        <span className={amount < 0 ? 'text-red-500' : 'text-green-500'}>
          {formatCurrency(amount)}
        </span>
      );
    },
  },
];
```

## Storage Persistence

When `storageKey` is provided, the component persists:
- Column visibility preferences
- Page size preference
- Sort column and order

Data is stored in `localStorage` with keys:
- `${storageKey}_visibleColumns`
- `${storageKey}_pageSize`
- `${storageKey}_sortBy`
- `${storageKey}_sortOrder`

## Styling

The component uses Tailwind CSS and follows shadcn/ui design patterns. You can customize styles by:
1. Overriding Tailwind classes in your global CSS
2. Using `className` prop on the component
3. Using `headerClassName` and `cellClassName` on columns

## Performance Considerations

- The component processes data client-side
- For large datasets (>10,000 rows), consider server-side pagination/filtering
- Use `accessorFn` efficiently - avoid heavy computations
- Memoize column definitions if they're created dynamically

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Requires CSS Grid and Flexbox support

## License

This component is part of your project and follows the same license.

