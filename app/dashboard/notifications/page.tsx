'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, CheckCheck, BellOff, Info, AlertCircle, CheckCircle2, AlertTriangle,
  Calendar, FileText, MessageSquare, LogIn, Forward, ShieldCheck, Users,
} from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';

const typeIcons: Record<string, any> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  task: FileText,
  meeting: Calendar,
  chat: MessageSquare,
  login: LogIn,
  referral: Forward,
  report: FileText,
};

const typeColors: Record<string, string> = {
  info: 'bg-sky-50 text-sky-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  error: 'bg-red-50 text-red-600',
  task: 'bg-violet-50 text-violet-600',
  meeting: 'bg-orange-50 text-orange-600',
  chat: 'bg-teal-50 text-teal-600',
  login: 'bg-slate-100 text-slate-600',
  referral: 'bg-indigo-50 text-indigo-600',
  report: 'bg-sky-50 text-sky-600',
};

const typeLabels: Record<string, string> = {
  task: 'وظیفه',
  meeting: 'جلسه',
  chat: 'چت',
  login: 'ورود',
  referral: 'ارجاع',
  report: 'گزارش',
  info: 'اطلاع',
  success: 'موفقیت',
  warning: 'هشدار',
  error: 'خطا',
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'mine' | 'all'>('mine');

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

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayList = view === 'all' ? allNotifications : filtered;
  const displayUnread = view === 'all' ? allNotifications.filter((n) => !n.read).length : unreadCount;

  const getName = (id: string) => {
    const p = profiles[id];
    return p ? fullName(p.firstName, p.lastName) : 'کاربر ناشناس';
  };

  return (
    <div>
      <PageHeader
        title="اعلان‌ها"
        description="مرکز اعلان‌های سیستم"
        action={view === 'mine' && unreadCount > 0 ? <Button size="sm" variant="outline" onClick={markAllRead}><CheckCheck className="w-4 h-4" /> خواندن همه</Button> : undefined}
      />

      {isSuperAdmin && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700">شما سوپرادمین هستید و می‌توانید تمام اعلان‌های سیستم را مشاهده کنید.</span>
        </div>
      )}

      {isSuperAdmin && (
        <div className="mb-4 flex h-[42px] items-center rounded-[10px] border border-[#DCE3EE] bg-white p-1 shadow-sm w-fit">
          <button onClick={() => setView('mine')} className={`flex h-full items-center rounded-[8px] px-4 text-sm font-semibold transition-colors ${view === 'mine' ? 'bg-[#EFF4FF] text-[#2563EB]' : 'text-[#667085] hover:text-[#344054]'}`}>
            <Bell className="ml-1.5 h-4 w-4" /> اعلان‌های من
          </button>
          <button onClick={() => setView('all')} className={`flex h-full items-center rounded-[8px] px-4 text-sm font-semibold transition-colors ${view === 'all' ? 'bg-[#EFF4FF] text-[#2563EB]' : 'text-[#667085] hover:text-[#344054]'}`}>
            <Users className="ml-1.5 h-4 w-4" /> همه اعلان‌ها {isSuperAdmin && <Badge variant="secondary" className="mr-1.5 text-xs">{allNotifications.length.toLocaleString('fa-IR')}</Badge>}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : displayList.length === 0 ? (
        <Card>
          <EmptyState icon={<BellOff className="w-8 h-8" />} title="اعلانی وجود ندارد" description={view === 'all' ? 'اعلانی در سیستم ثبت نشده است' : 'اعلان‌های جدید در اینجا نمایش داده می‌شوند'} />
        </Card>
      ) : view === 'all' ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {displayList.map((n) => {
                const Icon = typeIcons[n.type] || Bell;
                const colorClass = typeColors[n.type] || 'bg-slate-100 text-slate-500';
                const typeLabel = typeLabels[n.type] || 'اعلان';
                const ownerName = getName(n.profileId);
                const isCopy = n.title?.startsWith('[سوپرادمین]');
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-4 hover:bg-slate-50 transition-smooth cursor-pointer ${!n.read ? 'bg-sky-50/40' : ''}`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">{isCopy ? n.title.replace('[سوپرادمین] ', '') : n.title}</span>
                        <Badge variant="outline" className="text-[10px] font-normal text-slate-400">{typeLabel}</Badge>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                        {n.priority === 'urgent' && <Badge variant="destructive" className="text-xs">فوری</Badge>}
                      </div>
                      {n.body && <p className="text-sm text-slate-500 mt-1 leading-6">{n.body}</p>}
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {ownerName}</span>
                        <span>•</span>
                        <span>{relativeTime(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">همه ({notifications.length.toLocaleString('fa-IR')})</TabsTrigger>
            <TabsTrigger value="unread">خوانده‌نشده ({unreadCount.toLocaleString('fa-IR')})</TabsTrigger>
          </TabsList>
          <TabsContent value={filter}>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {filtered.map((n) => {
                    const Icon = typeIcons[n.type] || Bell;
                    const colorClass = typeColors[n.type] || 'bg-slate-100 text-slate-500';
                    const typeLabel = typeLabels[n.type] || 'اعلان';
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 p-4 hover:bg-slate-50 transition-smooth cursor-pointer ${!n.read ? 'bg-sky-50/40' : ''}`}
                        onClick={() => !n.read && markRead(n.id)}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900">{n.title}</span>
                            <Badge variant="outline" className="text-[10px] font-normal text-slate-400">{typeLabel}</Badge>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                            {n.priority === 'urgent' && <Badge variant="destructive" className="text-xs">فوری</Badge>}
                          </div>
                          {n.body && <p className="text-sm text-slate-500 mt-1 leading-6">{n.body}</p>}
                          <div className="text-xs text-slate-400 mt-1">{relativeTime(n.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
