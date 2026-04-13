'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
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
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Save,
  RefreshCcw,
  Search,
  Eye,
  UserMinus,
  Tag,
  UserPlus,
  MoreHorizontal,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { getStudentPhotoUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGate from '@/components/PermissionGate';
import { DataTable } from '@/components/data-table';

const API_BASE = '/student-tags';
const DEFAULT_TAG_COLOR = '#6366f1';

const EMPTY = {
  name: '',
  description: '',
  color: DEFAULT_TAG_COLOR,
  isActive: true,
};

const normalizeCollegeId = (college) => {
  if (!college) return '';
  if (typeof college === 'object') return college._id || college.id || '';
  return String(college);
};

const getStudentId = (student) => {
  if (student == null) return '';
  return student._id || student.id || '';
};

const getStudentTagIds = (student) => {
  const raw = student?.tags;
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => (typeof t === 'object' ? (t._id || t.id) : t)).filter(Boolean).map(String);
};

function studentHasTag(student, tagId) {
  if (!tagId) return false;
  return getStudentTagIds(student).includes(String(tagId));
}

function normalizeHexColor(value) {
  const v = (value || '').trim();
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v)) return v;
  return '';
}

function tagDisplayColor(tag) {
  return normalizeHexColor(tag?.color) || DEFAULT_TAG_COLOR;
}

export default function StudentTagsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [selectedTagId, setSelectedTagId] = useState(null);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState('');

  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [allStudentsForAdd, setAllStudentsForAdd] = useState([]);
  const [addStudentSelection, setAddStudentSelection] = useState(() => new Set());
  const [loadingAddList, setLoadingAddList] = useState(false);
  const [addStudentsSearch, setAddStudentsSearch] = useState('');
  const [savingAddBatch, setSavingAddBatch] = useState(false);

  const [manageTagsStudent, setManageTagsStudent] = useState(null);
  const [manageExtraTagIds, setManageExtraTagIds] = useState(() => new Set());
  const [savingManageTags, setSavingManageTags] = useState(false);

  const collegeId = normalizeCollegeId(user?.college);

  const selectedTag = useMemo(
    () => rows.find((t) => String(t._id) === String(selectedTagId)) || null,
    [rows, selectedTagId],
  );

  const fetchRows = useCallback(async () => {
    if (!user?.college) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (collegeId) params.append('collegeId', collegeId);
      const q = params.toString();
      const res = await api.get(`${API_BASE}${q ? `?${q}` : ''}`, {}, true);
      const list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      setRows(list);
    } catch (err) {
      setError(err.message || 'Failed to load student tags');
    } finally {
      setLoading(false);
    }
  }, [user?.college, collegeId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const fetchStudentsWithTag = useCallback(async () => {
    if (!selectedTagId || !user?.college) {
      setStudents([]);
      return;
    }
    try {
      setLoadingStudents(true);
      const p = new URLSearchParams();
      p.append('limit', '1000');
      p.append('tagId', selectedTagId);
      const res = await api.get(`/students?${p.toString()}`, {}, true);
      let list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      list = list.filter((s) => studentHasTag(s, selectedTagId));
      setStudents(list);
    } catch (err) {
      console.error(err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedTagId, user?.college]);

  useEffect(() => {
    fetchStudentsWithTag();
  }, [fetchStudentsWithTag]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const closeDialog = () => {
    setForm(EMPTY);
    setEditingId(null);
    setDialogOpen(false);
  };

  const openNewDialog = () => {
    setForm({ ...EMPTY, color: DEFAULT_TAG_COLOR });
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const hex = normalizeHexColor(form.color) || DEFAULT_TAG_COLOR;
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: hex,
        isActive: !!form.isActive,
        college: collegeId || undefined,
      };
      if (editingId) {
        await api.put(`${API_BASE}/${editingId}`, payload, {}, true);
        showSuccess('Tag updated.');
      } else {
        await api.post(API_BASE, payload, {}, true);
        showSuccess('Tag created.');
      }
      closeDialog();
      fetchRows();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = useCallback((row) => {
    setEditingId(row._id);
    setForm({
      name: row.name || '',
      description: row.description || '',
      color: tagDisplayColor(row),
      isActive: row.isActive ?? true,
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (row) => {
      if (!row?._id || !window.confirm('Delete this tag? It will be removed from all students and lists.')) return;
      try {
        setDeletingId(row._id);
        await api.delete(`${API_BASE}/${row._id}`, {}, true);
        showSuccess('Tag deleted.');
        if (String(selectedTagId) === String(row._id)) setSelectedTagId(null);
        fetchRows();
      } catch (err) {
        setError(err.message || 'Failed to delete');
      } finally {
        setDeletingId('');
      }
    },
    [fetchRows, selectedTagId],
  );

  const handleRemoveTagFromStudent = useCallback(
    async (student) => {
      const sid = getStudentId(student);
      if (!sid || !selectedTagId) return;
      const label = student.name || student.studentId || 'Student';
      if (!window.confirm(`Remove tag “${selectedTag?.name || 'this tag'}” from ${label}?`)) return;
      try {
        setSavingStudentId(sid);
        const next = getStudentTagIds(student).filter((id) => id !== String(selectedTagId));
        await api.put(`/students/${sid}`, { tags: next }, {}, true);
        showSuccess(`Tag removed from ${label}.`);
        await fetchStudentsWithTag();
      } catch (err) {
        setError(err.message || 'Failed to update student');
      } finally {
        setSavingStudentId('');
      }
    },
    [selectedTagId, selectedTag?.name, fetchStudentsWithTag],
  );

  const openAddStudentsDialog = useCallback(async () => {
    if (!selectedTagId || !user?.college) return;
    setAddStudentsOpen(true);
    setAddStudentSelection(new Set());
    setAddStudentsSearch('');
    try {
      setLoadingAddList(true);
      const res = await api.get('/students?limit=1000', {}, true);
      let list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      list = list.filter((s) => !studentHasTag(s, selectedTagId));
      setAllStudentsForAdd(list);
    } catch (err) {
      console.error(err);
      setAllStudentsForAdd([]);
    } finally {
      setLoadingAddList(false);
    }
  }, [selectedTagId, user?.college]);

  const toggleAddStudent = (sid) => {
    setAddStudentSelection((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const submitAddStudentsToTag = async () => {
    if (!selectedTagId || addStudentSelection.size === 0) return;
    setSavingAddBatch(true);
    setError('');
    try {
      const ids = [...addStudentSelection];
      for (const sid of ids) {
        const stu = allStudentsForAdd.find((s) => getStudentId(s) === sid) || students.find((s) => getStudentId(s) === sid);
        const existing = stu ? getStudentTagIds(stu) : [];
        const merged = [...new Set([...existing.map(String), String(selectedTagId)])];
        await api.put(`/students/${sid}`, { tags: merged }, {}, true);
      }
      showSuccess(`Tag added to ${ids.length} student(s).`);
      setAddStudentsOpen(false);
      setAddStudentSelection(new Set());
      await fetchStudentsWithTag();
    } catch (err) {
      setError(err.message || 'Failed to assign tag');
    } finally {
      setSavingAddBatch(false);
    }
  };

  const openManageOtherTags = useCallback(
    (student) => {
      setManageTagsStudent(student);
      setManageExtraTagIds(new Set());
    },
    [],
  );

  const toggleManageExtraTag = (tagId) => {
    const id = String(tagId);
    setManageExtraTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitManageOtherTags = async () => {
    if (!manageTagsStudent || !selectedTagId) return;
    const sid = getStudentId(manageTagsStudent);
    if (!sid) return;
    setSavingManageTags(true);
    setError('');
    try {
      let base = getStudentTagIds(manageTagsStudent);
      if (!base.includes(String(selectedTagId))) base = [...base, String(selectedTagId)];
      const extra = [...manageExtraTagIds].map(String);
      const merged = [...new Set([...base, ...extra])];
      await api.put(`/students/${sid}`, { tags: merged }, {}, true);
      showSuccess('Student tags updated.');
      setManageTagsStudent(null);
      setManageExtraTagIds(new Set());
      await fetchStudentsWithTag();
    } catch (err) {
      setError(err.message || 'Failed to update tags');
    } finally {
      setSavingManageTags(false);
    }
  };

  const otherTagsForManage = useMemo(() => {
    if (!manageTagsStudent || !selectedTagId) return [];
    const current = new Set(getStudentTagIds(manageTagsStudent).map(String));
    return rows.filter(
      (t) =>
        t._id &&
        String(t._id) !== String(selectedTagId) &&
        t.isActive !== false &&
        !current.has(String(t._id)),
    );
  }, [manageTagsStudent, rows, selectedTagId]);

  const filteredSidebarTags = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }, [rows, sidebarQuery]);

  const addDialogFiltered = useMemo(() => {
    const q = addStudentsSearch.trim().toLowerCase();
    if (!q) return allStudentsForAdd;
    return allStudentsForAdd.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.studentId || '').toLowerCase().includes(q),
    );
  }, [allStudentsForAdd, addStudentsSearch]);

  const studentColumns = useMemo(
    () => [
      {
        id: 'photo',
        accessorKey: 'image',
        header: 'Photo',
        searchable: false,
        cell: ({ row }) => {
          const path = row.image ?? row.photo;
          const url = getStudentPhotoUrl(path, API_URL);
          return (
            <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
              {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <Tags className="h-4 w-4 text-muted-foreground" />}
            </div>
          );
        },
      },
      {
        id: 'studentId',
        accessorKey: 'studentId',
        header: 'Student ID',
        cell: ({ row }) => (
          <span className="text-sm font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">{row.studentId || '—'}</span>
        ),
      },
      { id: 'name', accessorKey: 'name', header: 'Name' },
      { id: 'email', accessorKey: 'email', header: 'Email' },
      { id: 'phone', accessorKey: 'phone', header: 'Phone' },
      {
        id: 'course',
        accessorKey: 'course',
        header: 'Course',
        cell: ({ row }) => {
          if (!row.course) return '—';
          const c = typeof row.course === 'object' ? row.course : null;
          return c ? `${c.name}${c.batch ? ` (${c.batch})` : ''}` : '—';
        },
      },
    ],
    [],
  );

  const studentActions = useCallback(
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
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={busy} aria-label="More">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveTagFromStudent(row);
                  }}
                >
                  <UserMinus className="h-4 w-4" />
                  Remove this tag
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    openManageOtherTags(row);
                  }}
                >
                  <Tag className="h-4 w-4" />
                  Add other tags…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
        </div>
      );
    },
    [router, savingStudentId, handleRemoveTagFromStudent, openManageOtherTags],
  );

  useEffect(() => {
    if (rows.length && selectedTagId && !rows.some((t) => String(t._id) === String(selectedTagId))) {
      setSelectedTagId(null);
    }
  }, [rows, selectedTagId]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Tags className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Student tags</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Select a tag to see students. Assign colors for quick recognition.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh tags
          </Button>
          <PermissionGate moduleKey="students" action="create">
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add tag
            </Button>
          </PermissionGate>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <aside className="w-full lg:w-80 shrink-0 flex flex-col rounded-xl border border-border bg-card overflow-hidden max-h-[70vh] lg:max-h-[calc(100vh-12rem)]">
          <div className="p-3 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold mb-2">All tags</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tags…"
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <p className="text-sm text-muted-foreground p-3">Loading tags…</p>
            ) : filteredSidebarTags.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">
                {rows.length === 0
                  ? 'No tags yet. Use Add tag to create one.'
                  : 'No tags match your search.'}
              </p>
            ) : (
              filteredSidebarTags.map((t) => {
                const active = String(selectedTagId) === String(t._id);
                const c = tagDisplayColor(t);
                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => setSelectedTagId(t._id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors border ${
                      active
                        ? 'bg-primary/10 border-primary/30 text-foreground'
                        : 'border-transparent hover:bg-muted/80 text-foreground'
                    } ${t.isActive === false ? 'opacity-60' : ''}`}
                  >
                    <span
                      className="h-8 w-8 rounded-md shrink-0 border border-border/80 shadow-inner"
                      style={{ backgroundColor: c }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium truncate block">{t.name || '—'}</span>
                      {t.description ? <span className="text-xs text-muted-foreground line-clamp-1">{t.description}</span> : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex-1 min-w-0 space-y-4">
          {!selectedTag ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
              <Tags className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium">Choose a tag from the list on the left</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                You will see every student that has that tag, and you can remove the tag or add more tags to a student.
              </p>
            </div>
          ) : (
            <>
              <div
                className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
                style={{ borderLeftWidth: 4, borderLeftColor: tagDisplayColor(selectedTag) }}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="mt-1 h-10 w-10 rounded-lg shrink-0 border border-border shadow-sm"
                      style={{ backgroundColor: tagDisplayColor(selectedTag) }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold truncate">{selectedTag.name}</h2>
                      {selectedTag.description ? (
                        <p className="text-sm text-muted-foreground mt-1">{selectedTag.description}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-2 font-mono break-all">ID: {selectedTag._id}</p>
                      <span
                        className={`inline-flex mt-2 text-xs px-2 py-1 rounded-full ${
                          selectedTag.isActive !== false ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {selectedTag.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <PermissionGate moduleKey="students" action="edit">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleEdit(selectedTag)}>
                        <Edit2 className="h-4 w-4" />
                        Edit tag
                      </Button>
                      <Button variant="default" size="sm" className="gap-2" onClick={openAddStudentsDialog}>
                        <UserPlus className="h-4 w-4" />
                        Add students to tag
                      </Button>
                    </PermissionGate>
                    <PermissionGate moduleKey="students" action="delete">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                        disabled={deletingId === selectedTag._id}
                        onClick={() => handleDelete(selectedTag)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete tag
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="font-semibold">Students with this tag</h3>
                  <span className="text-sm text-muted-foreground">
                    {loadingStudents ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <PermissionGate moduleKey="students" action="edit">
                  <p className="text-xs text-muted-foreground px-4 py-2 border-b border-border bg-muted/10">
                    Use ⋯ on a row to remove only this tag, or to add other tags to that student.
                  </p>
                </PermissionGate>
                <DataTable
                  data={students}
                  columns={studentColumns}
                  actions={studentActions}
                  loading={loadingStudents}
                  searchable
                  filterable
                  sortable
                  showColumnVisibility
                  storageKey={`student-tag-${selectedTagId}-students`}
                  defaultPageSize={10}
                  pageSizeOptions={[10, 20, 50, 100]}
                  emptyMessage="No students have this tag yet. Use “Add students to tag” to assign it."
                  onRowClick={(row) => router.push(`/app/students/${getStudentId(row)}`)}
                />
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
          else setDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit tag' : 'New tag'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update name, color, or visibility.' : 'Create a tag. Color appears in lists and on the student form.'}
            </DialogDescription>
          </DialogHeader>
          <form id="student-tag-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name *</label>
              <Input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Hostel" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Color</label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                  value={normalizeHexColor(form.color) || DEFAULT_TAG_COLOR}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  aria-label="Pick tag color"
                />
                <Input
                  name="color"
                  value={form.color}
                  onChange={handleFormChange}
                  placeholder="#6366f1"
                  className="flex-1 min-w-[8rem] font-mono text-sm"
                  pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Hex color used for chips and the tag sidebar.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <Input name="description" value={form.description} onChange={handleFormChange} placeholder="Optional" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tag-active-modal"
                name="isActive"
                checked={!!form.isActive}
                onChange={handleFormChange}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="tag-active-modal" className="text-sm font-medium">
                Active
              </label>
            </div>
          </form>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" form="student-tag-form" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PermissionGate moduleKey="students" action="edit">
        <Dialog open={addStudentsOpen} onOpenChange={(o) => !o && setAddStudentsOpen(false)}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Add students to “{selectedTag?.name}”</DialogTitle>
              <DialogDescription>Select students who do not have this tag yet. Their existing tags are kept.</DialogDescription>
            </DialogHeader>
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or email…"
                value={addStudentsSearch}
                onChange={(e) => setAddStudentsSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex-1 min-h-[200px] max-h-[45vh] overflow-y-auto rounded-md border border-border p-2 space-y-1">
              {loadingAddList ? (
                <p className="text-sm text-muted-foreground p-2">Loading students…</p>
              ) : addDialogFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No students left to add (everyone may already have this tag).</p>
              ) : (
                addDialogFiltered.map((s) => {
                  const sid = getStudentId(s);
                  return (
                    <label
                      key={sid}
                      className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={addStudentSelection.has(sid)}
                        onChange={() => toggleAddStudent(sid)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{s.name || '—'}</span>
                        <span className="text-muted-foreground text-xs block truncate">
                          {s.studentId ? `${s.studentId} · ` : ''}
                          {s.email || ''}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0 shrink-0">
              <Button type="button" variant="outline" onClick={() => setAddStudentsOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={addStudentSelection.size === 0 || savingAddBatch} onClick={submitAddStudentsToTag}>
                {savingAddBatch ? 'Saving…' : `Add to ${addStudentSelection.size || 0} student(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!manageTagsStudent}
          onOpenChange={(open) => {
            if (!open) {
              setManageTagsStudent(null);
              setManageExtraTagIds(new Set());
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add other tags</DialogTitle>
              <DialogDescription>
                {manageTagsStudent
                  ? `Keep “${selectedTag?.name}” and choose additional tags for ${manageTagsStudent.name || manageTagsStudent.studentId || 'this student'}.`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            {otherTagsForManage.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No other active tags available to add.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 rounded-md border border-border p-3">
                {otherTagsForManage.map((t) => {
                  const tid = String(t._id);
                  const c = tagDisplayColor(t);
                  return (
                    <label key={tid} className="flex items-center gap-3 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={manageExtraTagIds.has(tid)}
                        onChange={() => toggleManageExtraTag(tid)}
                      />
                      <span className="h-5 w-5 rounded border border-border shrink-0" style={{ backgroundColor: c }} />
                      <span>{t.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManageTagsStudent(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  savingManageTags || otherTagsForManage.length === 0 || manageExtraTagIds.size === 0
                }
                onClick={submitManageOtherTags}
              >
                {savingManageTags ? 'Saving…' : 'Save tags'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGate>
    </div>
  );
}
