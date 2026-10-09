'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';

export function DemoTracker() {
  const { isDemo } = useAuth();
  const pathname = usePathname();
  const startTime = useRef<number>(Date.now());
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (!isDemo) return;
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    startTime.current = Date.now();
  }, [pathname, isDemo]);

  useEffect(() => {
    if (!isDemo) return;
    const trackPageView = () => {
      fetch('/api/demo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagePath: pathname,
          action: 'page_view',
          metadata: { timestamp: new Date().toISOString() },
        }),
      }).catch(() => {});
    };
    trackPageView();
  }, [pathname, isDemo]);

  useEffect(() => {
    if (!isDemo) return;
    const handleBeforeUnload = () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      navigator.sendBeacon(
        '/api/demo/track',
        JSON.stringify({
          pagePath: pathname,
          action: 'page_leave',
          duration,
          metadata: {},
        })
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname, isDemo]);

  return null;
}
