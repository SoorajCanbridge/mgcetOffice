// Centralized RBAC. Backend action enum: view | edit | none.
// view = read only (GET). edit = full access (view + create + update + delete). none = no access (or omit).

export const PERMISSION_ACTIONS = ['view', 'edit', 'none'];

export const RBAC_ACTIONS = ['view', 'edit'];

export const RBAC_ACTION_LABELS = {
  view: 'View',
  edit: 'Edit',
  none: 'None',
};

export const RBAC_ACTION_DESCRIPTIONS = {
  view: 'Read only (GET). No create/update/delete.',
  edit: 'Full access: view + create + update + delete.',
  none: 'No access.',
};

// Single source of truth: groups drive the matrix and the flat module list.
// Dashboard & Analytics are no longer part of the roles matrix (no restriction).
export const RBAC_MODULE_GROUPS = [
  { label: 'Academics', modules: ['academic'] },
  { label: 'Students', modules: ['students'] },
  { label: 'Staff', modules: ['staff'] },
  { label: 'Attendance', modules: ['attendance'] },
  { label: 'Fees', modules: ['fees'] },
  { label: 'Invoice', modules: ['invoice'] },
  { label: 'Payments', modules: ['payments'] },
  { label: 'Payrolls', modules: ['payroll'] },
  // One permission controls all finance pages (accounts/ledgers/income-expense/categories/reports).
  { label: 'Finance', modules: ['finance'] },
  // One permission controls all settings pages (general/attendance/academic).
  { label: 'Settings', modules: ['settings'] },
  { label: 'Team', modules: ['team'] },
  { label: 'Startup Kit', modules: ['startup'] },
];

export const RBAC_MODULES = RBAC_MODULE_GROUPS.flatMap((g) => g.modules);

export const RBAC_MODULE_LABELS = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  academic: 'Courses',
  students: 'Students',
  staff: 'Staff',
  attendance: 'Staff attendance',
  fees: 'Invoice template',
  invoice: 'Invoice',
  payments: 'Payments',
  payroll: 'Payroll',
  finance: 'Finance',
  accounts: 'Accounts',
  ledgers: 'Ledgers',
  financeCategories: 'Categories',
  financeReports: 'Reports',
  settings: 'Settings',
  settingsGeneral: 'General',
  team: 'Team & users',
  settingsAttendance: 'Attendance',
  settingsAcademic: 'Academic',
  startup: 'Startup Kit',
};

/**
 * Full list of all modules (resource keys) for roles & permission restriction.
 */
export const RBAC_MODULES_LIST = RBAC_MODULE_GROUPS.flatMap((g) =>
  g.modules.map((key) => ({
    key,
    label: RBAC_MODULE_LABELS[key] ?? key,
    group: g.label,
  }))
);

// Fallback role → permissions (view / edit) when backend doesn't send permissions.
const ROLE_DEFINITIONS = {
  admin: RBAC_MODULES.reduce((acc, m) => {
    acc[m] = ['view', 'edit'];
    return acc;
  }, {}),
  editor: {
    startup: ['view', 'edit'],
    academic: ['view', 'edit'],
    students: ['view', 'edit'],
    staff: ['view', 'edit'],
    attendance: ['view', 'edit'],
    invoice: ['view', 'edit'],
    fees: ['view', 'edit'],
    payments: ['view', 'edit'],
    payroll: ['view', 'edit'],
    finance: ['view', 'edit'],
    settings: ['view'],
    team: [],
  },
  viewer: {
    startup: ['view'],
    academic: ['view'],
    students: ['view'],
    staff: ['view'],
    attendance: ['view'],
    invoice: ['view'],
    fees: ['view'],
    payments: ['view'],
    payroll: [],
    finance: ['view'],
    settings: ['view'],
    team: [],
  },
  user: RBAC_MODULES.reduce((acc, m) => {
    acc[m] = [];
    return acc;
  }, {}),
};

const ALL_ACTIONS_SET = new Set(RBAC_ACTIONS);
const LEGACY_EDIT_ACTIONS = new Set(['create', 'edit', 'delete']);

const normalizeActions = (actions) => {
  if (!actions) return [];
  if (actions === '*') return [...RBAC_ACTIONS];
  if (Array.isArray(actions)) {
    return actions
      .map((a) => String(a || '').toLowerCase())
      .filter((a) => ALL_ACTIONS_SET.has(a));
  }
  return [];
};

/**
 * Normalize the raw permissions object into { [module]: string[] }.
 */
export const normalizePermissions = (raw) => {
  if (!raw || typeof raw !== 'object') return {};
  if (Array.isArray(raw)) return normalizePermissions(permissionsArrayToMap(raw));
  const result = {};
  for (const key of Object.keys(raw)) {
    const normKey = String(key || '');
    const actions = normalizeActions(raw[key]);
    if (actions.length) {
      result[normKey] = actions;
    }
  }
  return result;
};

function sanitizeAction(action) {
  if (action == null || action === '') return 'none';
  const a = String(action).trim().toLowerCase();
  if (a === '*' || LEGACY_EDIT_ACTIONS.has(a)) return 'edit';
  if (a === 'view' || a === 'edit') return a;
  return 'none';
}

export const permissionsArrayToMap = (arr) => {
  if (!Array.isArray(arr)) return {};
  const map = {};
  for (const p of arr) {
    const resource = p?.resource != null ? String(p.resource).trim() : '';
    const action = sanitizeAction(p?.action);
    if (!resource || action === 'none') continue;
    map[resource] = action === 'edit' ? ['view', 'edit'] : ['view'];
  }
  return map;
};

/**
 * Convert UI permissions map to backend array. One entry per resource with action 'view' or 'edit'.
 */
export const permissionsMapToArray = (map) => {
  if (!map || typeof map !== 'object') return [];
  const arr = [];
  for (const resource of Object.keys(map)) {
    const r = String(resource || '').trim();
    if (!r) continue;
    const actions = normalizeActions(map[resource]);
    if (actions.includes('edit')) arr.push({ resource: r, action: 'edit' });
    else if (actions.includes('view')) arr.push({ resource: r, action: 'view' });
  }
  return arr;
};

/**
 * Resolve the effective permissions for a user.
 * Priority: 1) user.permissions from API  2) role-based defaults  3) viewer fallback if logged in.
 */
export const resolveUserPermissions = (user) => {
  if (!user) return {};

  if (user.permissions && typeof user.permissions === 'object') {
    return normalizePermissions(user.permissions);
  }

  const roles = [];
  if (Array.isArray(user.roles)) {
    roles.push(...user.roles.map((r) => (typeof r === 'string' ? r : r?.name || r?.id)).filter(Boolean));
  }
  if (user.role) {
    const r = user.role;
    roles.push(typeof r === 'string' ? r : (r?.name ?? r?.id ?? r));
  }

  const merged = {};
  if (roles.length) {
    for (const role of roles) {
      const key = String(role).toLowerCase().trim();
      const def = ROLE_DEFINITIONS[key];
      if (!def) continue;
      for (const moduleKey of Object.keys(def)) {
        const actions = normalizeActions(def[moduleKey]);
        if (!actions.length) continue;
        if (!merged[moduleKey]) merged[moduleKey] = new Set();
        actions.forEach((a) => merged[moduleKey].add(a));
      }
    }
  }

  const result = {};
  for (const [moduleKey, actionSet] of Object.entries(merged)) {
    result[moduleKey] = Array.from(actionSet);
  }

  if (Object.keys(result).length === 0 && user) {
    const viewerDef = ROLE_DEFINITIONS.viewer;
    if (viewerDef) {
      for (const moduleKey of Object.keys(viewerDef)) {
        result[moduleKey] = normalizeActions(viewerDef[moduleKey]);
        if (!result[moduleKey].length) delete result[moduleKey];
      }
    }
  }
  return result;
};

/**
 * Check whether the user is allowed to perform `action` on `moduleKey`.
 */
export const canAccess = (user, moduleKey, action = 'view') => {
  if (moduleKey === 'dashboard' || moduleKey === 'analytics') return true;
  const perms = resolveUserPermissions(user);
  const actions = perms[moduleKey];
  if (!actions || !actions.length) return false;
  if (action === '*') return true;
  const a = String(action).toLowerCase();
  if (a === 'view') return actions.includes('view') || actions.includes('edit');
  if (LEGACY_EDIT_ACTIONS.has(a) || a === 'edit') return actions.includes('edit');
  return actions.includes(a);
};

export const hasRole = (user, roles) => {
  if (!user || !roles || !roles.length) return false;
  const target = new Set(roles.map((r) => String(r).toLowerCase()));
  const values = [];
  if (Array.isArray(user.roles)) {
    values.push(...user.roles.map((r) => (typeof r === 'string' ? r : r?.name || r?.id)));
  }
  if (user.role) values.push(user.role);
  return values.some((r) => target.has(String(r).toLowerCase()));
};

export const ROUTE_MODULE_MAP = [
  { path: '/app/analytics', moduleKey: 'analytics' },
  { path: '/app/courses', moduleKey: 'academic' },
  { path: '/app/students/categories', moduleKey: 'students' },
  { path: '/app/students/tags', moduleKey: 'students' },
  { path: '/app/students', moduleKey: 'students' },
  { path: '/app/staff', moduleKey: 'staff' },
  { path: '/app/staff-attendance', moduleKey: 'attendance' },
  { path: '/app/invoices/saved-contents', moduleKey: 'fees' },
  { path: '/app/invoices/payments', moduleKey: 'payments' },
  { path: '/app/invoices', moduleKey: 'invoice' },
  { path: '/app/payroll', moduleKey: 'payroll' },
  // Finance umbrella
  { path: '/app/finance/tracking/income', moduleKey: 'finance' },
  { path: '/app/finance/tracking/expenses', moduleKey: 'finance' },
  { path: '/app/finance/tracking/reports', moduleKey: 'finance' },
  { path: '/app/finance/tracking', moduleKey: 'finance' },
  { path: '/app/finance/categories', moduleKey: 'finance' },
  { path: '/app/accounts', moduleKey: 'finance' },
  { path: '/app/ledgers/balance-sheet', moduleKey: 'finance' },
  { path: '/app/ledgers', moduleKey: 'finance' },
  { path: '/app/settings/roles', moduleKey: 'team' },
  { path: '/app/settings/team', moduleKey: 'team' },
  // Settings umbrella
  { path: '/app/settings/attendance', moduleKey: 'settings' },
  { path: '/app/settings/acadamic', moduleKey: 'settings' },
  { path: '/app/settings/general', moduleKey: 'settings' },
  { path: '/app/startup/clients', moduleKey: 'startup' },
  { path: '/app/startup/plans', moduleKey: 'startup' },
  { path: '/app', moduleKey: 'dashboard' },
];

export function getModuleKeyForPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  const path = pathname.replace(/\/$/, '') || '/app';
  for (const { path: p, moduleKey } of ROUTE_MODULE_MAP) {
    if (path === p || path.startsWith(p + '/')) return moduleKey;
  }
  return null;
}
