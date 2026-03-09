'use client';

import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/rbac';

/**
 * Usage:
 *   <PermissionGate moduleKey="students" action="edit">
 *     <Button>Edit student</Button>
 *   </PermissionGate>
 *
 * If the user lacks permission the children are not rendered,
 * or `fallback` is rendered when provided.
 */
export default function PermissionGate({ moduleKey, action = 'view', fallback = null, children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return null;

  const allowed = canAccess(user, moduleKey, action);
  if (!allowed) return fallback;

  return <>{children}</>;
}

