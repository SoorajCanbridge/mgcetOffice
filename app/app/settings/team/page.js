'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Plus, Mail, User as UserIcon, Shield, Trash2, Loader2, MoreVertical, Pencil, Phone, Clock } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features and settings' },
  { value: 'editor', label: 'Editor', description: 'Can create and edit content' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to view data' },
  { value: 'user', label: 'User', description: 'Basic access' },
];

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [filters, setFilters] = useState({ role: 'all', isActive: 'all' });
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    isActive: true,
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});

  const collegeId = useMemo(() => {
    const c = user?.college;
    if (!c) return null;
    return typeof c === 'object' ? (c._id ?? c.id ?? null) : String(c);
  }, [user?.college]);

  const fetchMembers = useCallback(async (page = 1) => {
    if (!collegeId) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filters.role && filters.role !== 'all') params.set('role', filters.role);
      if (filters.isActive && filters.isActive !== 'all') params.set('isActive', filters.isActive);
      params.set('page', String(page));
      params.set('limit', '50');
      const response = await api.get(`/users?${params.toString()}`, {}, true);
      const data = response?.data ?? response;
      const list = Array.isArray(data) ? data : (response?.data && Array.isArray(response.data) ? response.data : []);
      setMembers(list);
      setPagination(response?.pagination ?? null);
    } catch (err) {
      if (err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
        setMembers([]);
        setPagination(null);
      } else {
        setError(err.message || 'Failed to load team members');
      }
    } finally {
      setLoading(false);
    }
  }, [collegeId, filters.role, filters.isActive]);

  useEffect(() => {
    fetchMembers(1);
  }, [fetchMembers]);

  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Name is required';
    if (!formData.email?.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errs.email = 'Invalid email';
    if (!formData.password?.trim()) errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateEditForm = () => {
    const errs = {};
    if (!editFormData.name?.trim()) errs.name = 'Name is required';
    if (!editFormData.email?.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email.trim())) errs.email = 'Invalid email';
    if (editFormData.password && editFormData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setEditFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!collegeId) return;
    if (!validateForm()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/users`, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone?.trim() || undefined,
      }, {}, true);
      setSuccess('Team member added. They can log in with the email and password you set.');
      setTimeout(() => setSuccess(''), 5000);
      setOpenAdd(false);
      setFormData({ name: '', email: '', password: '', role: 'user', phone: '' });
      setFormErrors({});
      fetchMembers(1);
    } catch (err) {
      setError(err.message || 'Failed to add team member');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (member) => {
    setEditingUser(member);
    setEditFormData({
      name: member.name ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      role: member.role ?? 'user',
      isActive: member.isActive !== false,
      password: '',
    });
    setEditFormErrors({});
    setOpenEdit(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!collegeId || !editingUser) return;
    if (!validateEditForm()) return;
    const id = editingUser._id ?? editingUser.id;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim().toLowerCase(),
        phone: editFormData.phone?.trim() || undefined,
        role: editFormData.role,
        isActive: editFormData.isActive,
      };
      if (editFormData.password?.trim()) payload.password = editFormData.password;
      await api.put(`/users/${id}`, payload, {}, true);
      setSuccess('User updated.');
      setTimeout(() => setSuccess(''), 3000);
      setOpenEdit(false);
      setEditingUser(null);
      fetchMembers(pagination?.page || 1);
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (member) => {
    const id = member._id ?? member.id;
    if (!collegeId || !id) return;
    if (typeof window !== 'undefined' && !window.confirm('Remove this user from the team? They will lose access.')) return;
    setDeletingId(id);
    setError('');
    try {
      await api.delete(`/users/${id}`, {}, true);
      setSuccess('User removed from team.');
      setTimeout(() => setSuccess(''), 3000);
      fetchMembers(pagination?.page || 1);
    } catch (err) {
      setError(err.message || 'Failed to remove user');
    } finally {
      setDeletingId('');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    if (editFormErrors[field]) setEditFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const getRoleLabel = (role) => ROLES.find((r) => r.value === role)?.label ?? role;

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Team &amp; Users</h1>
          </div>
          <Button onClick={() => setOpenAdd(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        </div>
        <p className="text-muted-foreground mt-2">
          Add team members who can log in and access the app. Set their role to control what they can do.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9"
        />
        <Select value={filters.role || 'all'} onValueChange={(v) => setFilters((p) => ({ ...p, role: v }))}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.isActive || 'all'} onValueChange={(v) => setFilters((p) => ({ ...p, isActive: v }))}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No team members yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add users so they can log in and access the app.</p>
            <Button onClick={() => setOpenAdd(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add first user
            </Button>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 px-6 text-center text-muted-foreground text-sm">
            No members match your search.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredMembers.map((member) => {
              const id = member._id ?? member.id;
              const isCurrentUser = id === (user?._id ?? user?.id);
              const isDeleting = deletingId === id;
              return (
                <li key={id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{member.name ?? member.email}</p>
                        {isCurrentUser && <span className="text-xs text-muted-foreground">(you)</span>}
                        {member.isActive === false && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3.5 w-3 shrink-0" />
                        {member.email}
                      </p>
                      {(member.phone || member.lastLoginAt) && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {member.phone}
                            </span>
                          )}
                          {member.lastLoginAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Last login {new Date(member.lastLoginAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                      <Shield className="h-3.5 w-3" />
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {isCurrentUser ? (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditDialog(member)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(member)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleRemoveUser(member)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add team user</DialogTitle>
            <DialogDescription>
              Create a new user who can log in with the email and password you set. They will have access based on the role you choose.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium mb-1.5">Name</label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Full name"
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="team-email" className="block text-sm font-medium mb-1.5">Email (login)</label>
              <Input
                id="team-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="user@example.com"
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="team-phone" className="block text-sm font-medium mb-1.5">Phone (optional)</label>
              <Input
                id="team-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label htmlFor="team-password" className="block text-sm font-medium mb-1.5">Password</label>
              <Input
                id="team-password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                placeholder="Min 6 characters"
                className={formErrors.password ? 'border-destructive' : ''}
              />
              {formErrors.password && <p className="text-xs text-destructive mt-1">{formErrors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <Select value={formData.role} onValueChange={(v) => handleFormChange('role', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAdd(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding…</> : 'Add user'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={(open) => !open && (setOpenEdit(false), setEditingUser(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update name, email, role, status, or set a new password (leave blank to keep current).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <Input
                value={editFormData.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder="Full name"
                className={editFormErrors.name ? 'border-destructive' : ''}
              />
              {editFormErrors.name && <p className="text-xs text-destructive mt-1">{editFormErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email (login)</label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) => handleEditFormChange('email', e.target.value)}
                placeholder="user@example.com"
                className={editFormErrors.email ? 'border-destructive' : ''}
              />
              {editFormErrors.email && <p className="text-xs text-destructive mt-1">{editFormErrors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone (optional)</label>
              <Input
                type="tel"
                value={editFormData.phone}
                onChange={(e) => handleEditFormChange('phone', e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <Select value={editFormData.role} onValueChange={(v) => handleEditFormChange('role', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editFormData.isActive}
                onChange={(e) => handleEditFormChange('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="edit-isActive" className="text-sm font-medium">Active (can log in)</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">New password (optional)</label>
              <Input
                type="password"
                value={editFormData.password}
                onChange={(e) => handleEditFormChange('password', e.target.value)}
                placeholder="Leave blank to keep current"
                className={editFormErrors.password ? 'border-destructive' : ''}
              />
              {editFormErrors.password && <p className="text-xs text-destructive mt-1">{editFormErrors.password}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
