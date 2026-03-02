'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Settings2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Utility functions for data formatting
const formatValue = (value, type, formatOptions = {}) => {
  if (value === null || value === undefined || value === '') {
    return formatOptions.emptyValue || '-';
  }

  switch (type) {
    case 'number':
      return typeof value === 'number'
        ? new Intl.NumberFormat(formatOptions.locale || 'en-US', {
            ...formatOptions.numberFormat,
          }).format(value)
        : value;
    case 'currency':
      return typeof value === 'number'
        ? new Intl.NumberFormat(formatOptions.locale || 'en-US', {
            style: 'currency',
            currency: formatOptions.currency || 'USD',
            ...formatOptions.numberFormat,
          }).format(value)
        : value;
    case 'date':
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return formatOptions.dateFormat
          ? formatOptions.dateFormat(date)
          : date.toLocaleDateString(formatOptions.locale || 'en-US');
      } catch {
        return value;
      }
    case 'datetime':
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return formatOptions.dateFormat
          ? formatOptions.dateFormat(date)
          : date.toLocaleString(formatOptions.locale || 'en-US');
      } catch {
        return value;
      }
    case 'boolean':
      return value ? (formatOptions.trueLabel || 'Yes') : formatOptions.falseLabel || 'No';
    case 'percentage':
      return typeof value === 'number'
        ? `${value.toFixed(formatOptions.decimals || 2)}%`
        : value;
    default:
      return value;
  }
};

// Filter functions
const applyFilters = (data, filters, columns) => {
  if (!filters || Object.keys(filters).length === 0) return data;

  return data.filter((row) => {
    return Object.entries(filters).every(([key, filterValue]) => {
      if (!filterValue || filterValue === '') return true;

      const column = columns.find((col) => col.accessorKey === key || col.id === key);
      if (!column) return true;

      const cellValue = column.accessorFn
        ? column.accessorFn(row)
        : row[column.accessorKey || key];

      // Handle different filter types
      if (column.filterType === 'select' || column.filterType === 'multi-select') {
        if (Array.isArray(filterValue)) {
          return filterValue.includes(String(cellValue));
        }
        return String(cellValue) === String(filterValue);
      }

      if (column.filterType === 'date-range') {
        const [start, end] = filterValue;
        const cellDate = new Date(cellValue);
        if (isNaN(cellDate.getTime())) return false;
        if (start && cellDate < new Date(start)) return false;
        if (end && cellDate > new Date(end)) return false;
        return true;
      }

      if (column.filterType === 'number-range') {
        const [min, max] = filterValue;
        const numValue = Number(cellValue);
        if (isNaN(numValue)) return false;
        if (min !== undefined && min !== '' && numValue < Number(min)) return false;
        if (max !== undefined && max !== '' && numValue > Number(max)) return false;
        return true;
      }

      // Default: text search
      const searchValue = String(filterValue).toLowerCase();
      const cellStr = String(cellValue || '').toLowerCase();
      return cellStr.includes(searchValue);
    });
  });
};

// Sort function
const applySorting = (data, sortBy, sortOrder) => {
  if (!sortBy) return data;

  return [...data].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle nested accessors
    if (sortBy.includes('.')) {
      const keys = sortBy.split('.');
      aValue = keys.reduce((obj, key) => obj?.[key], a);
      bValue = keys.reduce((obj, key) => obj?.[key], b);
    }

    // Handle null/undefined
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // Compare values
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

// Search function
const applySearch = (data, searchQuery, searchableColumns) => {
  if (!searchQuery || !searchableColumns || searchableColumns.length === 0) return data;

  const query = searchQuery.toLowerCase();
  return data.filter((row) => {
    return searchableColumns.some((column) => {
      const value = column.accessorFn ? column.accessorFn(row) : row[column.accessorKey];
      return String(value || '').toLowerCase().includes(query);
    });
  });
};

export function DataTable({
  data = [],
  columns = [],
  pagination: paginationProp = {},
  searchable = true,
  filterable = true,
  sortable = true,
  showColumnVisibility = true,
  showSettings = true,
  actions,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  className,
  storageKey,
  defaultPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  enableExport = false,
  onExport,
  ...props
}) {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    if (typeof window === 'undefined') return columns.map((col) => col.id || col.accessorKey);
    const stored = storageKey ? localStorage.getItem(`${storageKey}_visibleColumns`) : null;
    return stored ? JSON.parse(stored) : columns.map((col) => col.id || col.accessorKey);
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const storedPageSize = localStorage.getItem(`${storageKey}_pageSize`);
    const storedSortBy = localStorage.getItem(`${storageKey}_sortBy`);
    const storedSortOrder = localStorage.getItem(`${storageKey}_sortOrder`);

    if (storedPageSize) setPageSize(Number(storedPageSize));
    if (storedSortBy) setSortBy(storedSortBy);
    if (storedSortOrder) setSortOrder(storedSortOrder);
  }, [storageKey]);

  // Save settings to localStorage
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    localStorage.setItem(`${storageKey}_pageSize`, String(pageSize));
    localStorage.setItem(`${storageKey}_visibleColumns`, JSON.stringify(visibleColumns));
    if (sortBy) {
      localStorage.setItem(`${storageKey}_sortBy`, sortBy);
      localStorage.setItem(`${storageKey}_sortOrder`, sortOrder);
    }
  }, [pageSize, visibleColumns, sortBy, sortOrder, storageKey]);

  // Get searchable columns
  const searchableColumns = useMemo(() => {
    return columns.filter((col) => col.searchable !== false);
  }, [columns]);

  // Get filterable columns
  const filterableColumns = useMemo(() => {
    return columns.filter((col) => col.filterable !== false && col.filterType);
  }, [columns]);

  // Process data: search -> filter -> sort
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchable && searchQuery) {
      result = applySearch(result, searchQuery, searchableColumns);
    }

    // Apply filters
    if (filterable && Object.keys(filters).length > 0) {
      result = applyFilters(result, filters, columns);
    }

    // Apply sorting
    if (sortable && sortBy) {
      result = applySorting(result, sortBy, sortOrder);
    }

    return result;
  }, [data, searchQuery, filters, sortBy, sortOrder, searchable, filterable, sortable, searchableColumns, columns]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return processedData.slice(start, end);
  }, [processedData, page, pageSize]);

  // Handle sorting
  const handleSort = useCallback((columnId) => {
    if (sortBy === columnId) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // Handle filter change
  const handleFilterChange = useCallback((columnId, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
        delete newFilters[columnId];
      } else {
        newFilters[columnId] = value;
      }
      setPage(1); // Reset to first page on filter change
      return newFilters;
    });
  }, []);

  // Handle column visibility toggle
  const toggleColumnVisibility = useCallback((columnId) => {
    setVisibleColumns((prev) => {
      if (prev.includes(columnId)) {
        return prev.filter((id) => id !== columnId);
      }
      return [...prev, columnId];
    });
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setPage(1);
  }, []);

  // Get visible columns
  const visibleColumnsData = useMemo(() => {
    return columns.filter((col) => {
      const colId = col.id || col.accessorKey;
      return visibleColumns.includes(colId);
    });
  }, [columns, visibleColumns]);

  // Render filter input based on filter type
  const renderFilterInput = (column) => {
    const columnId = column.id || column.accessorKey;
    const filterValue = filters[columnId] || '';

    switch (column.filterType) {
      case 'select':
        const selectValue = filterValue === '' || !filterValue ? 'all' : String(filterValue);
        return (
          <Select
            value={selectValue}
            onValueChange={(value) => handleFilterChange(columnId, value === 'all' ? '' : value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Filter ${column.header}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {column.filterOptions?.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date-range':
        return (
          <div className="space-y-2">
            <Input
              type="date"
              placeholder="Start date"
              value={Array.isArray(filterValue) ? filterValue[0] || '' : ''}
              onChange={(e) => {
                const end = Array.isArray(filterValue) ? filterValue[1] : '';
                handleFilterChange(columnId, [e.target.value, end]);
              }}
            />
            <Input
              type="date"
              placeholder="End date"
              value={Array.isArray(filterValue) ? filterValue[1] || '' : ''}
              onChange={(e) => {
                const start = Array.isArray(filterValue) ? filterValue[0] : '';
                handleFilterChange(columnId, [start, e.target.value]);
              }}
            />
          </div>
        );

      case 'number-range':
        return (
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Min"
              value={Array.isArray(filterValue) ? filterValue[0] || '' : ''}
              onChange={(e) => {
                const max = Array.isArray(filterValue) ? filterValue[1] : '';
                handleFilterChange(columnId, [e.target.value, max]);
              }}
            />
            <Input
              type="number"
              placeholder="Max"
              value={Array.isArray(filterValue) ? filterValue[1] || '' : ''}
              onChange={(e) => {
                const min = Array.isArray(filterValue) ? filterValue[0] : '';
                handleFilterChange(columnId, [min, e.target.value]);
              }}
            />
          </div>
        );

      default:
        return (
          <Input
            placeholder={`Filter ${column.header}`}
            value={filterValue}
            onChange={(e) => handleFilterChange(columnId, e.target.value)}
          />
        );
    }
  };

  return (
    <div className={cn('space-y-4', className)} {...props}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
          )}

          {filterable && filterableColumns.length > 0 && (
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {Object.keys(filters).length > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {Object.keys(filters).length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {Object.keys(filters).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="h-8 text-xs">
                        Reset
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {filterableColumns.map((column) => {
                      const columnId = column.id || column.accessorKey;
                      return (
                        <div key={columnId} className="space-y-2">
                          <label className="text-sm font-medium">{column.header}</label>
                          {renderFilterInput(column)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {showSettings && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Settings
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Column Visibility</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => {
                  const columnId = column.id || column.accessorKey;
                  const isVisible = visibleColumns.includes(columnId);
                  return (
                    <DropdownMenuCheckboxItem
                      key={columnId}
                      checked={isVisible}
                      onCheckedChange={() => toggleColumnVisibility(columnId)}>
                      {column.header}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {enableExport && onExport && (
            <Button variant="outline" size="sm" onClick={() => onExport(processedData)} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {paginatedData.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(page * pageSize, processedData.length)} of {processedData.length} entries
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumnsData.map((column) => {
                const columnId = column.id || column.accessorKey;
                const isSorted = sortBy === columnId;
                return (
                  <TableHead
                    key={columnId}
                    className={cn(column.headerClassName, sortable && column.sortable !== false && 'cursor-pointer select-none')}
                    onClick={() => sortable && column.sortable !== false && handleSort(columnId)}>
                    <div className="flex items-center gap-2">
                      {column.header}
                      {sortable && column.sortable !== false && (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      {isSorted && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
              {actions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnsData.length + (actions ? 1 : 0)} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnsData.length + (actions ? 1 : 0)} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}>
                  {visibleColumnsData.map((column) => {
                    const columnId = column.id || column.accessorKey;
                    const cellValue = column.accessorFn
                      ? column.accessorFn(row)
                      : row[column.accessorKey];

                    return (
                      <TableCell key={columnId} className={column.cellClassName}>
                        {column.cell
                          ? column.cell({ row, getValue: () => cellValue })
                          : formatValue(cellValue, column.type || 'text', column.formatOptions)}
                      </TableCell>
                    );
                  })}
                  {actions && (
                    <TableCell>
                      {typeof actions === 'function' ? actions(row) : actions}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Rows per page</p>
            <Select value={String(pageSize)} onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

