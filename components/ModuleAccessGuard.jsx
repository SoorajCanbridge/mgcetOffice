'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess, getModuleKeyForPath, RBAC_MODULE_LABELS } from '@/lib/rbac';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Wraps app content and restricts access by module permissions.
 * If the current route maps to a module and the user has no view permission,
 * shows a "No access" message and option to go home. Otherwise renders children.
 */
export default function ModuleAccessGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <>{children}</>;
  }

  const moduleKey = getModuleKeyForPath(pathname);
  if (moduleKey == null) {
    return <>{children}</>;
  }

  const allowed = canAccess(user, moduleKey, 'view');
  if (allowed) {
    return <>{children}</>;
  }

  const moduleLabel = RBAC_MODULE_LABELS[moduleKey] || moduleKey;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <ShieldOff className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-xl font-semibold">No access</h2>
      <p className="text-muted-foreground text-center max-w-sm">
        You don&apos;t have permission to view {moduleLabel}. Contact your administrator to request access.
      </p>
      <Button variant="outline" onClick={() => router.push('/app')}>
        Go to Home
      </Button>
    </div>
  );
}
