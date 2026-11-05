'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchData } from '@/lib/data-client';
import type { PersonalNote } from '@/lib/types';
import { formatJalaliDateTime } from '@/lib/format';

export function NoteReminderBell({ variant = 'default' }: { variant?: 'default' | 'super-admin' }) {
  const [dueReminders, setDueReminders] = useState<PersonalNote[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<PersonalNote[]>([]);
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const checkReminders = useCallback(async () => {
    try {
      const notes = await fetchData<PersonalNote>('personal_notes', {
        orderBy: { createdAt: 'desc' },
      });
      const now = new Date();
      const due: PersonalNote[] = [];
      const upcoming: PersonalNote[] = [];
      notes.forEach((n) => {
        if (!n.reminderEnabled || !n.reminderAt || n.reminderDismissed || n.isTrashed || n.isArchived) return;
        const remTime = new Date(n.reminderAt);
        if (remTime <= now) {
          due.push(n);
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('یادآور یادداشت', { body: n.title, icon: '/images/1.png' });
          }
        } else if (remTime.getTime() - now.getTime() < 3600000) {
          upcoming.push(n);
        }
      });
      setDueReminders(due);
      setUpcomingReminders(upcoming);
    } catch {
      // ignore — user may not be logged in
    }
  }, []);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const totalCount = dueReminders.length + upcomingReminders.length;
  const displayCount = totalCount > 99 ? '۹۹+' : totalCount.toLocaleString('fa-IR');
  const isSuperAdmin = variant === 'super-admin';

  return (
    <div className="relative" ref={popupRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
          isSuperAdmin
            ? 'nb-btn-icon'
            : 'border border-border text-muted-foreground hover:bg-muted hover:text-accent'
        )}
        aria-label="یادآور یادداشت‌ها"
      >
        <BellRing className={cn('h-[18px] w-[18px]', dueReminders.length > 0 && 'animate-bell-ring')} />
        {totalCount > 0 && (
          <span
            className={cn(
              'absolute -top-1.5 -left-1.5 flex min-w-[20px] h-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm ring-2 animate-in fade-in zoom-in duration-300',
              dueReminders.length > 0 ? 'bg-pink-500 ring-card' : 'bg-sky-500 ring-card',
              isSuperAdmin && 'ring-primary'
            )}
          >
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="nb-reminder-popup" dir="rtl">
          <div className="nb-reminder-popup-header">
            <BellRing className="h-4 w-4" />
            <span>یادآور یادداشت‌ها</span>
          </div>

          {totalCount === 0 ? (
            <div className="nb-reminder-popup-empty">
              <BellRing className="h-8 w-8 text-muted-foreground/30" />
              <p>یادآوری فعالی وجود ندارد</p>
            </div>
          ) : (
            <div className="nb-reminder-popup-list">
              {dueReminders.length > 0 && (
                <>
                  <div className="nb-reminder-popup-section-label nb-reminder-due-label">
                    <span className="nb-reminder-dot nb-reminder-dot-due" />
                    همین الان
                  </div>
                  {dueReminders.slice(0, 5).map((n) => (
                    <Link
                      key={n.id}
                      href={`/dashboard/notes/${n.id}`}
                      className="nb-reminder-popup-item nb-reminder-due-item"
                      onClick={() => setOpen(false)}
                    >
                      <BellRing className="h-4 w-4 shrink-0 text-pink-500" />
                      <div className="nb-reminder-popup-item-body">
                        <strong>{n.title}</strong>
                        <span>{formatJalaliDateTime(n.reminderAt!)}</span>
                      </div>
                    </Link>
                  ))}
                </>
              )}
              {upcomingReminders.length > 0 && (
                <>
                  <div className="nb-reminder-popup-section-label">
                    <span className="nb-reminder-dot nb-reminder-dot-soon" />
                    یک ساعت آینده
                  </div>
                  {upcomingReminders.slice(0, 5).map((n) => (
                    <Link
                      key={n.id}
                      href={`/dashboard/notes/${n.id}`}
                      className="nb-reminder-popup-item"
                      onClick={() => setOpen(false)}
                    >
                      <BellRing className="h-4 w-4 shrink-0 text-sky-500" />
                      <div className="nb-reminder-popup-item-body">
                        <strong>{n.title}</strong>
                        <span>{formatJalaliDateTime(n.reminderAt!)}</span>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}

          <Link
            href="/dashboard/note-reminders"
            className="nb-reminder-popup-footer"
            onClick={() => setOpen(false)}
          >
            مشاهده همه یادآورها
          </Link>
        </div>
      )}
    </div>
  );
}
