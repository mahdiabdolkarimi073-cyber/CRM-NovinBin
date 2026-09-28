'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function TaskBell() {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCountRef = useRef(0);

  const loadUnread = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const data = await fetchData<any>('notifications', {
        where: { profileId: profile.id, read: false, type: 'task' },
      });
      const count = Array.isArray(data) ? data.length : 0;
      if (count > lastCountRef.current) {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const newCount = count - lastCountRef.current;
          new Notification('تسک جدید', { body: `${newCount.toLocaleString('fa-IR')} اعلان تسک جدید`, icon: '/images/1.png' });
        }
      }
      lastCountRef.current = count;
      setUnreadCount(count);
    } catch {
      // silent fail
    }
  }, [profile?.id]);

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 15000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') loadUnread(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [loadUnread]);

  const handleClick = async () => {
    if (!profile?.id || unreadCount === 0) return;
    try {
      const data = await fetchData<any>('notifications', {
        where: { profileId: profile.id, read: false, type: 'task' },
      });
      if (Array.isArray(data) && data.length > 0) {
        await Promise.all(
          data.map((n) => updateData('notifications', { id: n.id }, { read: true, readAt: new Date() }))
        );
        setUnreadCount(0);
        lastCountRef.current = 0;
      }
    } catch {
      // silent fail
    }
  };

  const displayCount = unreadCount > 99 ? '۹۹+' : unreadCount.toLocaleString('fa-IR');

  return (
    <Link
      href="/dashboard/tasks"
      onClick={handleClick}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white/90 transition-colors hover:bg-white/10"
    >
      <CheckSquare className="h-[18px] w-[18px]" />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -top-1.5 -left-1.5 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0A2A2A] animate-in fade-in zoom-in duration-300'
          )}
        >
          {displayCount}
        </span>
      )}
    </Link>
  );
}
