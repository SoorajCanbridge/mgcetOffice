'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bookmark, ArrowLeft, RefreshCcw, Users, Eye, MoreHorizontal, UserMinus, ArrowRightLeft } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getStudentPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';
import { DataTable } from '@/components/data-table';

const CATEGORIES_BASE = '/student-categories';

const getStudentId = (student) => {
  if (student == null) return '';
  return student._id || student.id || '';
};

const normalizeCollegeId = (college) => {
  if (!college) return '';
  if (typeof college === 'object') return college._id || college.id || '';
  return String(college);
};

/** Whether the student's category reference matches this category id (handles populated or raw id). */
function studentInCategory(student, categoryId) {
  if (!student || !categoryId) return false;
  const c = student.category;
  if (c == null) return false;
  const id = typeof c === 'object' ? (c._id || c.id) : c;
  return String(id) === String(categoryId);
}

export default function StudentCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const categoryId = params?.id;

  const [category, setCategory] = useState(null);
  const [students, setStudents] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [transferStudent, setTransferStudent] = useState(null);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [savingStudentId, setSavingStudentId] = useState('');

  const collegeId = normalizeCollegeId(user?.college);

  const showFlash = useCallback((text, type = 'success') => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 4000);
  }, []);

  const transferDestinations = useMemo(
    () =>
      allCategories.filter(
        (c) => c._id && String(c._id) !== String(categoryId) && c.isActive !== false,
      ),
    [allCategories, categoryId],
  );

  const fetchCategory = useCallback(async () => {
    if (!categoryId || !user?.college) return;
    try {
      setError('');
      const res = await api.get(`${CATEGORIES_BASE}/${categoryId}`, {}, true);
      setCategory(res?.data ?? res ?? null);
    } catch (err) {
      setError(err.message || 'Failed to load category');
      setCategory(null);
    }
  }, [categoryId, user?.college]);

  const fetchStudentsInCategory = useCallback(async () => {
    if (!categoryId || !user?.college) return;
    try {
      setLoadingStudents(true);
      const p = new URLSearchParams();
      p.append('limit', '1000');
      p.append('categoryId', categoryId);
      const res = await api.get(`/students?${p.toString()}`, {}, true);
      let list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      // Ensure list matches this category if the API ignores categoryId or returns partial filter
      list = list.filter((s) => studentInCategory(s, categoryId));
      setStudents(list);
    } catch (err) {
      console.error('Failed to load students for category:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [categoryId, user?.college]);

  const fetchAllCategories = useCallback(async () => {
    if (!user?.college) return;
    try {
      const params = new URLSearchParams();
      if (collegeId) params.append('collegeId', collegeId);
      const q = params.toString();
      const res = await api.get(`${CATEGORIES_BASE}${q ? `?${q}` : ''}`, {}, true);
      const list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      setAllCategories(list);
    } catch (err) {
      console.error('Failed to load categories for transfer:', err);
      setAllCategories([]);
    }
  }, [user?.college, collegeId]);

  useEffect(() => {
    if (!user?.college) return;
    fetchAllCategories();
  }, [user?.college, fetchAllCategories]);

  useEffect(() => {
    if (!user?.college || !categoryId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchCategory();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.college, categoryId, fetchCategory]);

  useEffect(() => {
    if (!user?.college || !categoryId) return;
    fetchStudentsInCategory();
  }, [user?.college, categoryId, fetchStudentsInCategory]);

  const handleRemoveFromCategory = useCallback(
    async (student) => {
      const sid = getStudentId(student);
      if (!sid) return;
      const label = student.name || student.studentId || 'this student';
      if (!window.confirm(`Remove ${label} from this category? Their category will be cleared.`)) return;
      try {
        setSavingStudentId(sid);
        await api.put(`/students/${sid}`, { category: null }, {}, true);
        showFlash(`${label} removed from category.`);
        await fetchStudentsInCategory();
      } catch (err) {
        showFlash(err.message || 'Failed to update student', 'error');
      } finally {
        setSavingStudentId('');
      }
    },
    [fetchStudentsInCategory, showFlash],
  );

  const openTransferDialog = useCallback((student) => {
    setTransferStudent(student);
    setTransferTargetId(transferDestinations[0]?._id || '');
  }, [transferDestinations]);

  useEffect(() => {
    if (transferStudent && transferDestinations.length && !transferTargetId) {
      setTransferTargetId(transferDestinations[0]._id);
    }
  }, [transferStudent, transferDestinations, transferTargetId]);

  const handleTransferSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      const student = transferStudent;
      const sid = student ? getStudentId(student) : '';
      if (!sid || !transferTargetId) return;
      const label = student.name || student.studentId || 'Student';
      const dest = transferDestinations.find((c) => String(c._id) === String(transferTargetId));
      try {
        setSavingStudentId(sid);
        await api.put(`/students/${sid}`, { category: transferTargetId }, {}, true);
        showFlash(`${label} moved to “${dest?.name || 'selected category'}”.`);
        setTransferStudent(null);
        setTransferTargetId('');
        await fetchStudentsInCategory();
      } catch (err) {
        showFlash(err.message || 'Failed to transfer student', 'error');
      } finally {
        setSavingStudentId('');
      }
    },
    [transferStudent, transferTargetId, transferDestinations, fetchStudentsInCategory, showFlash],
  );

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
          const url = getStudentPhotoUrl(path, API_URL);
          return (
            <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
              {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <Users className="h-4 w-4 text-muted-foreground" />}
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
          <span className="text-sm font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">{row.studentId || '—'}</span>
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
        cell: ({ row }) => {
          if (!row.course) return '—';
          const course = typeof row.course === 'object' ? row.course : null;
          return course ? `${course.name}${course.batch ? ` (${course.batch})` : ''}` : '—';
        },
      },
      {
        id: 'enrollmentStatus',
        accessorKey: 'enrollmentStatus',
        header: 'Status',
        type: 'text',
        cell: ({ row }) => <span className="capitalize text-sm">{row.enrollmentStatus || '—'}</span>,
      },
    ],
    [],
  );

  const actions = useCallback(
    (row) => {
      const sid = getStudentId(row);
      const busy = savingStudentId === sid;
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/app/students/${sid}`);
            }}
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          <PermissionGate moduleKey="students" action="edit">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={busy} aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveFromCategory(row);
                  }}
                >
                  <UserMinus className="h-4 w-4" />
                  Remove from category
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  disabled={transferDestinations.length === 0}
                  onClick={(e) => {
                    e.preventDefault();
                    openTransferDialog(row);
                  }}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfer to another category…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
        </div>
      );
    },
    [
      router,
      savingStudentId,
      handleRemoveFromCategory,
      openTransferDialog,
      transferDestinations.length,
    ],
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 flex justify-center">
        <div className="text-center text-muted-foreground">Loading category…</div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="max-w-7xl mx-auto space-y-4 py-8">
        <Button variant="outline" asChild className="gap-2">
          <Link href="/app/students/categories">
            <ArrowLeft className="h-4 w-4" />
            Back to categories
          </Link>
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || 'Category not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/app/students/categories" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bookmark className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{category.name || 'Category'}</h1>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  category.isActive !== false ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                }`}
              >
                {category.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            {category.description ? (
              <p className="text-muted-foreground text-sm mt-2 max-w-2xl">{category.description}</p>
            ) : (
              <p className="text-muted-foreground text-sm mt-2">Students assigned to this category appear below.</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2 shrink-0"
          onClick={() => {
            fetchCategory();
            fetchStudentsInCategory();
          }}
          disabled={loadingStudents}
        >
          <RefreshCcw className={`h-4 w-4 ${loadingStudents ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {flash && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            flash.type === 'success'
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {flash.text}
        </div>
      )}

      <PermissionGate moduleKey="students" action="edit">
        <Dialog
          open={!!transferStudent}
          onOpenChange={(open) => {
            if (!open) {
              setTransferStudent(null);
              setTransferTargetId('');
            }
          }}
        >
          <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Transfer to another category</DialogTitle>
              <DialogDescription>
                {transferStudent
                  ? `Move ${transferStudent.name || transferStudent.studentId || 'this student'} out of “${category.name}”.`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            {transferDestinations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No other active categories exist. Create one under Student categories, then try again.
              </p>
            ) : (
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label htmlFor="transfer-category" className="block text-sm font-medium mb-1.5">
                    New category
                  </label>
                  <select
                    id="transfer-category"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    required
                  >
                    {transferDestinations.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTransferStudent(null);
                      setTransferTargetId('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!transferTargetId || savingStudentId === getStudentId(transferStudent)}>
                    {savingStudentId === getStudentId(transferStudent) ? 'Saving…' : 'Transfer'}
                  </Button>
                </DialogFooter>
              </form>
            )}
            {transferDestinations.length === 0 && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTransferStudent(null)}>
                  Close
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </PermissionGate>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Students in category</p>
          <p className="text-2xl font-bold mt-1">{students.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
          <p className="text-sm text-muted-foreground">Category ID</p>
          <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{category._id || categoryId}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students
            </h2>
            <PermissionGate moduleKey="students" action="edit">
              <p className="text-xs text-muted-foreground mt-1">
                Use the menu (⋯) on a row to remove from this category or transfer to another.
              </p>
            </PermissionGate>
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            {loadingStudents ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <DataTable
          data={students}
          columns={columns}
          actions={actions}
          loading={loadingStudents}
          searchable
          filterable
          sortable
          showColumnVisibility
          storageKey={`student-category-${categoryId}-students`}
          defaultPageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No students are assigned to this category yet."
          onRowClick={(row) => router.push(`/app/students/${getStudentId(row)}`)}
        />
      </div>
    </div>
  );
}
