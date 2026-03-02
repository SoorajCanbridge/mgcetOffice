'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  // Handle theme being undefined initially
  const currentTheme = theme || 'light';

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className={`flex flex-col justify-center items-center h-screen ${
        currentTheme === 'dark' 
          ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
      } text-foreground`}>
        <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground text-base">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
