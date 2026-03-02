'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineGuard({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Initialise from browser state
    if (typeof window !== 'undefined' && 'onLine' in navigator) {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      // When connection is restored, always send user to homepage
      if (pathname !== '/') {
        router.replace('/');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router, pathname]);

  if (!isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full px-6 text-center space-y-6">
          <div className="flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">You are offline</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              It looks like your device has lost its internet connection. Please check your
              network and try again.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="default"
              className="gap-2"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            This offline page will close automatically and return you to the homepage when
            you are back online.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

