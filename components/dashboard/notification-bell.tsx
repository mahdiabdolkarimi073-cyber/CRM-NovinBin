'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function NotificationBell({ variant = 'default' }: { variant?: 'default' | 'super-admin' }) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUnread = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await fetchData<any>('notifications', {
        where: { profileId: profile.id, read: false },
      });
      setUnreadCount(Array.isArray(data) ? data.length : 0);
    } catch {
      // silent fail
    }
  }, [profile?.id]);

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  // Also reload when page becomes visible
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') loadUnread(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [loadUnread]);

  const displayCount = unreadCount > 99 ? '۹۹+' : unreadCount.toLocaleString('fa-IR');

  const isSuperAdmin = variant === 'super-admin';

  return (
    <Link
      href="/dashboard/notifications"
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
        isSuperAdmin
          ? 'text-white/90 hover:bg-white/10'
          : 'border border-border text-muted-foreground hover:bg-muted hover:text-accent'
      )}
    >
      <Bell className="h-[18px] w-[18px]" />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -top-1.5 -left-1.5 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm',
            isSuperAdmin ? 'ring-2 ring-primary' : 'ring-2 ring-card',
            'animate-in fade-in zoom-in duration-300'
          )}
        >
          {displayCount}
        </span>
      )}
    </Link>
  );
}
