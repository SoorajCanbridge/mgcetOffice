'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  RBAC_MODULE_GROUPS,
  RBAC_MODULE_LABELS,
  RBAC_MODULES,
  permissionsArrayToMap,
  permissionsMapToArray,
} from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Fragment } from 'react';
import { Shield, Plus, Loader2, Trash2, Pencil } from 'lucide-react';

const PERMISSION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'view', label: 'View (read only)' },
  { value: 'edit', label: 'Edit (full access)' },
];

const sanitizePermissionsForUi = (raw) => {
  const next = {};
  if (!raw || typeof raw !== 'object') return next;
  for (const key of RBAC_MODULES) {
    const actions = raw[key];
    if (!Array.isArray(actions)) continue;
    if (actions.includes('edit')) next[key] = ['view', 'edit'];
    else if (actions.includes('view')) next[key] = ['view'];
  }
  return next;
};

const pickAllowedPermissions = (raw) => {
  const next = {};
  if (!raw || typeof raw !== 'object') return next;
  for (const key of RBAC_MODULES) {
    const actions = raw[key];
    if (!Array.isArray(actions)) continue;
    if (actions.includes('edit')) next[key] = ['view', 'edit'];
    else if (actions.includes('view')) next[key] = ['view'];
  }
  return next;
};
export default function RolesSettingsPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {},
  });

  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: {},
    });
    setFormErrors({});
  };

  const openCreate = () => {
    resetForm();
    setOpenDialog(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      description: role.description || '',
      permissions: sanitizePermissionsForUi(role.permissions || {}),
    });
    setFormErrors({});
    setOpenDialog(true);
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/roles', {}, true);
      const data = response?.data || response || [];
      const list = Array.isArray(data) ? data : [];
      setRoles(
        list.map((role) => ({
          ...role,
          permissions: Array.isArray(role.permissions)
            ? permissionsArrayToMap(role.permissions)
            : role.permissions || {},
        }))
      );
    } catch (err) {
      if (err.message?.includes('404')) {
        // Backend might not have roles endpoints yet – show a soft error.
        setError('Role API endpoints (GET /roles) are not available yet on the backend.');
      } else {
        setError(err.message || 'Failed to load roles');
      }
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Role name is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const getPermissionValue = (moduleKey) => {
    const actions = formData.permissions?.[moduleKey] || [];
    if (actions.includes('edit')) return 'edit';
    if (actions.includes('view')) return 'view';
    return 'none';
  };

  const handlePermissionChange = (moduleKey, value) => {
    setFormData((prev) => {
      const nextPermissions = { ...(prev.permissions || {}) };
      if (value === 'edit') nextPermissions[moduleKey] = ['view', 'edit'];
      else if (value === 'view') nextPermissions[moduleKey] = ['view'];
      else delete nextPermissions[moduleKey];
      return { ...prev, permissions: nextPermissions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const permissions = pickAllowedPermissions(formData.permissions || {});
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        permissions: permissionsMapToArray(permissions),
      };
      if (editingRole) {
        const id = editingRole._id || editingRole.id;
        await api.put(`/roles/${id}`, payload, {}, true);
        setSuccess('Role updated.');
      } else {
        await api.post('/roles', payload, {}, true);
        setSuccess('Role created.');
      }
      setOpenDialog(false);
      resetForm();
      fetchRoles();
    } catch (err) {
      setError(err.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
      if (success) {
        setTimeout(() => setSuccess(''), 3000);
      }
    }
  };

  const handleDeleteRole = async (role) => {
    const id = role._id || role.id;
    if (!id) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this role? Users assigned to it may lose access.')) {
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      await api.delete(`/roles/${id}`, {}, true);
      setSuccess('Role deleted.');
      fetchRoles();
    } catch (err) {
      setError(err.message || 'Failed to delete role');
    } finally {
      setSubmitting(false);
      if (success) {
        setTimeout(() => setSuccess(''), 3000);
      }
    }
  };

  const getModuleLabel = (key) => RBAC_MODULE_LABELS[key] || key;

  return (
    <div className="max-w-5xl mx-auto">
            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Roles &amp; permissions</h1>
              <p className="text-sm text-muted-foreground mt-0.5">View = read only. Edit = create, edit and delete.</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New role
          </Button>
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

        <div className="rounded-lg border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <p className="text-muted-foreground mb-4">No roles yet. Create one to set permissions by module.</p>
              <Button onClick={openCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create role
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {roles.map((role) => (
                <div key={role._id || role.id} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between gap-x-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base capitalize">{role.name}</span>
                      {role.description && (
                        <span className="text-sm text-muted-foreground">— {role.description}</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.keys(role.permissions || {}).length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No permissions</span>
                      ) : (
                        Object.entries(role.permissions)
                        .filter(([moduleKey]) => RBAC_MODULES.includes(moduleKey))
                        .map(([moduleKey, actions]) => {
                          const label = RBAC_MODULE_LABELS[moduleKey] ?? moduleKey;
                          const actionLabel = Array.isArray(actions)
                            ? actions.includes('edit') ? 'Edit' : 'View'
                            : String(actions);
                          return (
                            <span
                              key={moduleKey}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/80 text-xs border border-border"
                            >
                              <span className="font-medium text-foreground">{label}</span>
                              <span className="text-muted-foreground">{actionLabel}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(role)} disabled={submitting}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRole(role)} disabled={submitting}>
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={openDialog} onOpenChange={(open) => { if (!open) { setOpenDialog(false); resetForm(); } }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit role' : 'Create role'}</DialogTitle>
              <DialogDescription>View = read only (GET). Edit = full access (view + create + update + delete). None = no access.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Role name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. finance-manager"
                    className={formErrors.name ? 'border-destructive' : ''}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-destructive mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Short description for admins"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Permissions</p>
                <p className="text-xs text-muted-foreground mb-3">View = read only. Edit = full access. None = no access.</p>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setFormData((p) => ({ ...p, permissions: {} }))}
                  >
                    Set all: None
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        permissions: RBAC_MODULES.reduce((acc, key) => {
                          acc[key] = ['view'];
                          return acc;
                        }, {}),
                      }))
                    }
                  >
                    Set all: View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        permissions: RBAC_MODULES.reduce((acc, key) => {
                          acc[key] = ['view', 'edit'];
                          return acc;
                        }, {}),
                      }))
                    }
                  >
                    Set all: Edit
                  </Button>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 min-w-[120px] font-medium">Section</th>
                        <th className="text-left px-4 py-3 min-w-[200px] font-medium">Module</th>
                        <th className="text-left px-4 py-3 w-36 font-medium">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RBAC_MODULE_GROUPS.map((group) => (
                        <Fragment key={group.label}>
                          {group.modules.map((moduleKey, idx) => (
                            <tr key={moduleKey} className="border-b last:border-b-0 hover:bg-muted/10">
                              {idx === 0 ? (
                                <td className="px-4 py-2.5 align-top font-medium text-muted-foreground" rowSpan={group.modules.length}>
                                  {group.label}
                                </td>
                              ) : null}
                              <td className="px-4 py-2.5 font-medium">{getModuleLabel(moduleKey)}</td>
                              <td className="px-4 py-2">
                                <Select
                                  value={getPermissionValue(moduleKey)}
                                  onValueChange={(value) => handlePermissionChange(moduleKey, value)}
                                >
                                  <SelectTrigger className="w-32 h-9">
                                    <SelectValue placeholder="None" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PERMISSION_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenDialog(false);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    'Save role'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}

