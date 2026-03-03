'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RootLoading from '@/app/loading';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <RootLoading />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
