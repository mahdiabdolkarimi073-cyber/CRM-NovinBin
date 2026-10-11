'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell, CheckCheck, BellOff, Info, AlertCircle, CheckCircle2, AlertTriangle,
  Calendar, FileText, MessageSquare, LogIn, Forward, ShieldCheck, Users,
  Search, X, Loader2, LayoutGrid, List,
} from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import Link from 'next/link';

const typeIcons: Record<string, any> = {
  info: Info, success: CheckCircle2, warning: AlertTriangle, error: AlertCircle,
  task: FileText, meeting: Calendar, chat: MessageSquare, login: LogIn,
  referral: Forward, report: FileText,
};

const typeColors: Record<string, string> = {
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  error: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  task: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
  meeting: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  chat: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
  login: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  referral: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  report: 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
};

const typeLabels: Record<string, string> = {
  task: 'وظیفه', meeting: 'جلسه', chat: 'چت', login: 'ورود',
  referral: 'ارجاع', report: 'گزارش', info: 'اطلاع', success: 'موفقیت',
  warning: 'هشدار', error: 'خطا',
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [view, setView] = useState<'mine' | 'all'>('mine');
  const [search, setSearch] = useState('');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchData('notifications', {
        where: { profileId: profile.id },
        orderBy: { createdAt: 'desc' },
      });
      setNotifications(data || []);
      if (isSuperAdmin) {
        const [allData, staffData] = await Promise.all([
          fetchData('notifications', { orderBy: { createdAt: 'desc' }, take: 500 }),
          fetchData('profiles', {}),
        ]);
        setAllNotifications(allData || []);
        const pMap: Record<string, any> = {};
        (staffData || []).forEach((p: any) => { pMap[p.id] = p; });
        setProfiles(pMap);
      }
    } catch {
      setNotifications([]);
    }
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    await updateData('notifications', { id }, { read: true, readAt: new Date() });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setAllNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!profile) return;
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(
      unread.map((n) => updateData('notifications', { id: n.id }, { read: true, readAt: new Date() }))
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('همه اعلان‌ها خوانده شدند');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const baseList = view === 'all' ? allNotifications : notifications;
  const filtered = filter === 'unread' ? baseList.filter((n) => !n.read) : baseList;
  const searched = search.trim()
    ? filtered.filter((n) => (n.title || '').includes(search) || (n.body || '').includes(search))
    : filtered;
  const displayUnread = view === 'all' ? allNotifications.filter((n) => !n.read).length : unreadCount;

  const getName = (id: string) => {
    const p = profiles[id];
    return p ? fullName(p.firstName, p.lastName) : 'کاربر ناشناس';
  };

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>اعلان‌ها</h1>
            </div>
            <p>مرکز اعلان‌های سیستم</p>
          </div>
        </div>
        <div className="nb-hero-right">
          {view === 'mine' && unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead} className="h-11">
              <CheckCheck className="h-4 w-4" />
              خواندن همه
            </Button>
          )}
        </div>
      </header>

      {/* Stats */}
      <section className="nb-stats-grid-v2 nb-stats-grid-v2--3">
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(37,99,235,.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg,#2563EB,#3B82F6)' }}>
            <Bell className="h-[22px] w-[22px] text-white" />
          </div>
          <div className="nb-stat-v2-body">
            <strong>{(view === 'all' ? allNotifications.length : notifications.length).toLocaleString('fa-IR')}</strong>
            <span>کل اعلان‌ها</span>
          </div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg,#2563EB,#3B82F6)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(239,68,68,.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
            <AlertCircle className="h-[22px] w-[22px] text-white" />
          </div>
          <div className="nb-stat-v2-body">
            <strong>{displayUnread.toLocaleString('fa-IR')}</strong>
            <span>خوانده‌نشده</span>
          </div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(34,197,94,.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}>
            <CheckCircle2 className="h-[22px] w-[22px] text-white" />
          </div>
          <div className="nb-stat-v2-body">
            <strong>{((view === 'all' ? allNotifications.length : notifications.length) - displayUnread).toLocaleString('fa-IR')}</strong>
            <span>خوانده‌شده</span>
          </div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }} />
        </div>
      </section>

      {/* Super-admin notice */}
      {isSuperAdmin && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-800 dark:bg-indigo-900/10">
          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">شما سوپرادمین هستید و می‌توانید تمام اعلان‌های سیستم را مشاهده کنید.</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          {isSuperAdmin && (
            <div className="flex h-9 items-center rounded-[10px] border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              <button onClick={() => setView('mine')} className={`flex h-full items-center rounded-[8px] px-3 text-xs font-semibold transition ${view === 'mine' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20' : 'text-slate-500 hover:text-slate-700'}`}>
                <Bell className="ml-1.5 h-3.5 w-3.5" /> اعلان‌های من
              </button>
              <button onClick={() => setView('all')} className={`flex h-full items-center rounded-[8px] px-3 text-xs font-semibold transition ${view === 'all' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20' : 'text-slate-500 hover:text-slate-700'}`}>
                <Users className="ml-1.5 h-3.5 w-3.5" /> همه اعلان‌ها
                <Badge variant="secondary" className="mr-1.5 text-xs">{allNotifications.length.toLocaleString('fa-IR')}</Badge>
              </button>
            </div>
          )}
          {!isSuperAdmin && (
            <div className="flex h-9 items-center rounded-[10px] border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              <button onClick={() => setFilter('all')} className={`flex h-full items-center rounded-[8px] px-3 text-xs font-semibold transition ${filter === 'all' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20' : 'text-slate-500 hover:text-slate-700'}`}>
                همه ({notifications.length.toLocaleString('fa-IR')})
              </button>
              <button onClick={() => setFilter('unread')} className={`flex h-full items-center rounded-[8px] px-3 text-xs font-semibold transition ${filter === 'unread' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20' : 'text-slate-500 hover:text-slate-700'}`}>
                خوانده‌نشده ({unreadCount.toLocaleString('fa-IR')})
              </button>
            </div>
          )}
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو در اعلان‌ها..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری اعلان‌ها...</p>
        </div>
      ) : searched.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon">
            <BellOff className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <h3>اعلانی وجود ندارد</h3>
          <p>{view === 'all' ? 'اعلانی در سیستم ثبت نشده است' : 'اعلان‌های جدید در اینجا نمایش داده می‌شوند'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {searched.map((n) => {
              const Icon = typeIcons[n.type] || Bell;
              const colorClass = typeColors[n.type] || 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300';
              const typeLabel = typeLabels[n.type] || 'اعلان';
              const ownerName = view === 'all' ? getName(n.profileId) : '';
              const isCopy = n.title?.startsWith('[سوپرادمین]');
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-4 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 ${!n.read ? 'bg-sky-50/40 dark:bg-sky-900/10' : ''}`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {isCopy ? n.title.replace('[سوپرادمین] ', '') : n.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-normal text-slate-400">{typeLabel}</Badge>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                      {n.priority === 'urgent' && <Badge variant="destructive" className="text-xs">فوری</Badge>}
                    </div>
                    {n.body && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-6">{n.body}</p>}
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      {view === 'all' && (
                        <>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {ownerName}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{relativeTime(n.createdAt)}</span>
                      {n.link && (
                        <>
                          <span>•</span>
                          <Link href={n.link} onClick={(e) => e.stopPropagation()} className="text-sky-600 hover:underline">مشاهده</Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
