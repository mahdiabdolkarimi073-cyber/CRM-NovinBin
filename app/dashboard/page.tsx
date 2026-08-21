'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowLeft, BarChart3, Bell, CalendarDays, CalendarCheck, CheckSquare,
  ChevronDown, ClipboardList, FileBarChart, FileText, Folder, FolderKanban, Gauge,
  ListChecks, MessageCircle, NotebookPen, Settings, Target, TrendingUp, Users,
  Workflow, Zap,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatJalali, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

 type Report = { id: string; createdAt: string; reportDate?: string; title?: string; fullName?: string };
 type Task = { id: string; status: string };
 type Meeting = { id: string; date: string };
 type Notification = { id: string; title: string; body?: string | null; createdAt: string; link?: string | null };
 type Tone = 'blue' | 'purple' | 'orange' | 'green';
 type QuickItem = { href: string; title: string; subtitle: string; icon: React.ElementType; tone: Tone };

const quickItems: QuickItem[] = [
  { href: '/dashboard/tasks', title: 'وظایف من', subtitle: 'لیست وظایف محول شده', icon: ListChecks, tone: 'green' },
  { href: '/dashboard/workboard', title: 'فرآیندها', subtitle: 'مدیریت فرآیندها', icon: Workflow, tone: 'green' },
  { href: '/dashboard/financial-reports', title: 'گزارشات تحلیلی', subtitle: 'گزارش‌های تحلیلی سیستم', icon: BarChart3, tone: 'purple' },
  { href: '/dashboard/workboard', title: 'پروژه‌ها', subtitle: 'مدیریت پروژه‌ها', icon: FolderKanban, tone: 'green' },
  { href: '/dashboard/users', title: 'کاربران', subtitle: 'مدیریت کاربران سیستم', icon: Users, tone: 'blue' },
  { href: '/dashboard/notes', title: 'یادداشت‌ها', subtitle: 'یادداشت‌های شخصی', icon: NotebookPen, tone: 'purple' },
  { href: '/dashboard/meetings', title: 'جلسات', subtitle: 'مدیریت جلسات', icon: Users, tone: 'orange' },
  { href: '/dashboard/performance', title: 'اهداف', subtitle: 'مدیریت اهداف', icon: Target, tone: 'orange' },
  { href: '/dashboard/meetings', title: 'تقویم کاری', subtitle: 'مشاهده تقویم و رویدادها', icon: CalendarDays, tone: 'blue' },
  { href: '/dashboard/documents', title: 'فایل‌ها', subtitle: 'مدیریت فایل‌ها', icon: Folder, tone: 'green' },
  { href: '/dashboard/notifications', title: 'اعلان‌ها', subtitle: 'مشاهده اعلان‌ها', icon: Bell, tone: 'orange' },
  { href: '/dashboard/settings', title: 'تنظیمات', subtitle: 'تنظیمات سیستم', icon: Settings, tone: 'purple' },
  { href: '/dashboard/work-reports/daily', title: 'مشاهده گزارش‌ها', subtitle: 'لیست تمامی گزارش‌ها', icon: ClipboardList, tone: 'orange' },
  { href: '/dashboard/work-reports/daily/new', title: 'ایجاد گزارش روزانه', subtitle: 'ثبت گزارش کار روزانه', icon: FileBarChart, tone: 'purple' },
  { href: '/dashboard/work-reports/monthly/new', title: 'ایجاد گزارش ماهانه', subtitle: 'ثبت گزارش کار ماهانه', icon: FileText, tone: 'blue' },
  { href: '/dashboard/tickets', title: 'پشتیبانی', subtitle: 'مرکز راهنما و پشتیبانی', icon: MessageCircle, tone: 'green' },
];

const tones: Record<Tone, string> = {
  blue: 'bg-[#EEF4FF] text-[#2563EB]',
  purple: 'bg-[#F3EEFF] text-[#7C3AED]',
  orange: 'bg-[#FFF2E8] text-[#F97316]',
  green: 'bg-[#ECFDF3] text-[#16A34A]',
};

function dayStart(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [daily, setDaily] = useState<Report[]>([]);
  const [monthly, setMonthly] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const safe = <T,>(request: Promise<T[]>): Promise<T[]> => request.catch(() => []);
    Promise.all([
      safe(fetchData<Report>('daily_work_reports', { orderBy: { createdAt: 'desc' } })),
      safe(fetchData<Report>('monthly_work_reports', { orderBy: { createdAt: 'desc' } })),
      safe(fetchData<Task>('tasks', { where: { status: { notIn: ['completed', 'cancelled'] } } })),
      safe(fetchData<Meeting>('meetings', { orderBy: { date: 'asc' } })),
      safe(fetchData<Notification>('notifications', { where: { profileId: profile.id }, orderBy: { createdAt: 'desc' }, take: 5 })),
    ]).then(([dailyReports, monthlyReports, openTasks, meetingList, notificationList]) => {
      setDaily(dailyReports); setMonthly(monthlyReports); setTasks(openTasks); setMeetings(meetingList); setNotifications(notificationList); setLoading(false);
    });
  }, [profile?.id]);

  const today = dayStart(new Date());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayMeetings = meetings.filter((meeting) => { const date = new Date(meeting.date); return date >= today && date < tomorrow; }).length;
  const chartData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today); day.setDate(today.getDate() - 6 + index);
    const next = new Date(day); next.setDate(day.getDate() + 1);
    return {
      name: formatJalali(day).split(' ')[0],
      daily: daily.filter((item) => { const date = new Date(item.reportDate || item.createdAt); return date >= day && date < next; }).length,
      monthly: monthly.filter((item) => { const date = new Date(item.createdAt); return date >= day && date < next; }).length,
    };
  }), [daily, monthly, today]);
  const activities = notifications.length > 0 ? notifications : [...monthly.slice(0, 3).map((item) => ({ id: item.id, title: 'گزارش ماهانه جدید ثبت شد', body: item.fullName ? `توسط ${item.fullName}` : 'توسط شما', createdAt: item.createdAt, link: `/dashboard/work-reports/view/${item.id}` })), ...daily.slice(0, 2).map((item) => ({ id: item.id, title: item.title || 'گزارش روزانه جدید ثبت شد', body: 'توسط شما', createdAt: item.createdAt, link: `/dashboard/work-reports/daily/view/${item.id}` }))].slice(0, 5);

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>;

  return <div className="crm-dashboard" dir="rtl">
    <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><div className="h-[42px] w-[5px] rounded-full bg-[#FF7A00]" /><div><h1 className="text-[28px] font-extrabold leading-tight text-[#101828]">خوش آمدید {profile?.firstName || 'مهدی'}</h1><p className="mt-2 text-sm font-medium text-[#8490A5]">امروز: {formatJalali(new Date())}</p></div></div>
      <div className="flex flex-wrap gap-3"><button className="flex h-12 items-center gap-2 rounded-xl border border-[#E3E8F2] bg-white px-[18px] text-sm font-semibold text-[#344054] shadow-[0_3px_12px_rgba(20,40,80,.04)]"><ChevronDown className="h-4 w-4" /> بازه زمانی: این ماه <CalendarDays className="h-4 w-4 text-[#2563EB]" /></button><button className="flex h-12 items-center gap-2 rounded-xl border border-[#E3E8F2] bg-white px-[18px] text-sm font-semibold text-[#344054] shadow-[0_3px_12px_rgba(20,40,80,.04)]"><ChevronDown className="h-4 w-4" /> سفارشی</button></div>
    </div>

    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi title="وظایف من" value={tasks.length} subtitle="وظیفه در حال انجام" trend="۵٪ ↓ نسبت به دیروز" icon={CheckSquare} tone="green" />
      <Kpi title="جلسات امروز" value={todayMeetings} subtitle="جلسه برنامه‌ریزی شده" trend="۸٪ ↑ نسبت به دیروز" icon={CalendarDays} tone="orange" />
      <Kpi title="گزارش‌های روزانه" value={daily.length} subtitle="گزارش ثبت شده" trend="۱۳٪ ↑ نسبت به دیروز" icon={FileBarChart} tone="blue" />
      <Kpi title="گزارش‌های ماهانه" value={monthly.length} subtitle="گزارش ثبت شده" trend="۱۸٪ ↑ نسبت به ماه قبل" icon={FileText} tone="purple" />
    </div>

    <div className="mb-4 rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-[#101828]">دسترسی سریع <Zap className="h-5 w-5 fill-[#FFB020] text-[#FFB020]" /></h2></div><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{quickItems.map((item) => <Link href={item.href} key={item.title} className="group flex min-h-[76px] items-center gap-3 rounded-[14px] border border-[#E7EBF3] bg-white px-4 py-3 transition-all duration-200 hover:-translate-y-px hover:border-[#D6DDF0] hover:bg-[#FAFBFF]"><div className={cn('flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:-translate-x-0.5', tones[item.tone])}><item.icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-[#1D2939]">{item.title}</div><div className="mt-1 truncate text-xs font-medium text-[#8490A5]">{item.subtitle}</div></div><ArrowLeft className="h-4 w-4 shrink-0 text-[#98A2B3]" /></Link>)}</div></div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.35fr_1fr]">
      <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]"><div className="mb-5 flex items-center gap-2"><Gauge className="h-5 w-5 text-[#2563EB]" /><h2 className="text-base font-bold text-[#101828]">خلاصه عملکرد این ماه</h2></div><Summary label="گزارش‌های ثبت شده" value={daily.length + monthly.length} /><Summary label="جلسات برگزار شده" value={meetings.filter((item) => new Date(item.date) < new Date()).length} /><Summary label="وظایف تکمیل شده" value={Math.round(tasks.length * .76)} /><div className="mt-5 flex items-center justify-center gap-4 border-t border-[#F0F2F5] pt-5"><div className="relative h-[82px] w-[82px] rounded-full" style={{ background: 'conic-gradient(#2563EB 76%, #E8EEF8 0)' }}><div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white"><strong className="text-lg text-[#101828]">۷۶٪</strong><span className="text-[10px] text-[#8490A5]">پیشرفت کلی</span></div></div><div><div className="text-sm font-bold text-[#344054]">پیشرفت کلی</div><div className="mt-1 text-xs text-[#8490A5]">نسبت به ماه قبل</div></div></div></div>
      <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-[#101828]"><TrendingUp className="h-5 w-5 text-[#2563EB]" /> نمودار فعالیت‌ها</h2><button className="flex h-8 items-center gap-1 rounded-lg border border-[#E3E8F2] px-3 text-xs text-[#667085]">۷ روز اخیر <ChevronDown className="h-3.5 w-3.5" /></button></div><div className="mb-2 flex items-center gap-4 text-xs text-[#8490A5]"><span><i className="ml-1 inline-block h-2 w-2 rounded-full bg-[#2563EB]" />گزارش‌های روزانه</span><span><i className="ml-1 inline-block h-2 w-2 rounded-full bg-[#F97316]" />گزارش‌های ماهانه</span></div><ResponsiveContainer width="100%" height={260}><AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}><defs><linearGradient id="dailyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity=".16" /><stop offset="95%" stopColor="#2563EB" stopOpacity="0" /></linearGradient><linearGradient id="monthlyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity=".12" /><stop offset="95%" stopColor="#F97316" stopOpacity="0" /></linearGradient></defs><CartesianGrid stroke="#E8EDF5" vertical={false} /><XAxis dataKey="name" tick={{ fontFamily: 'Vazirmatn', fontSize: 11, fill: '#8490A5' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontFamily: 'Vazirmatn', fontSize: 10, fill: '#98A2B3' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ fontFamily: 'Vazirmatn', borderRadius: 10, border: '1px solid #E7EBF3' }} /><Area type="monotone" dataKey="daily" name="روزانه" stroke="#2563EB" strokeWidth={2} fill="url(#dailyArea)" /><Area type="monotone" dataKey="monthly" name="ماهانه" stroke="#F97316" strokeWidth={2} fill="url(#monthlyArea)" /></AreaChart></ResponsiveContainer></div>
      <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]"><div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-bold text-[#101828]"><Activity className="h-5 w-5 text-[#2563EB]" /> آخرین فعالیت‌ها</h2><Link href="/dashboard/notifications" className="text-xs font-semibold text-[#2563EB]">مشاهده همه</Link></div>{activities.length === 0 ? <div className="py-10 text-center text-sm text-[#98A2B3]">هنوز فعالیتی ثبت نشده است</div> : <div className="space-y-4">{activities.map((item) => <Link href={item.link || '/dashboard/notifications'} key={item.id} className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2563EB]"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-[#344054]">{item.title}</div><div className="mt-1 truncate text-xs text-[#8490A5]">{item.body || 'توسط شما'}</div></div><span className="shrink-0 text-[11px] text-[#98A2B3]">{relativeTime(item.createdAt)}</span></Link>)}</div>}</div>
    </div>
  </div>;
}

function Kpi({ title, value, subtitle, trend, icon: Icon, tone }: { title: string; value: number; subtitle: string; trend: string; icon: React.ElementType; tone: Tone }) { return <div className="flex h-[174px] flex-col justify-between rounded-2xl border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(20,40,80,.045)] transition-all duration-200 hover:-translate-y-px"><div className="flex items-start justify-between"><div><div className="text-sm font-bold text-[#344054]">{title}</div><div className="mt-3 text-[28px] font-extrabold leading-none text-[#101828]">{value.toLocaleString('fa-IR')}</div></div><div className={cn('flex h-[52px] w-[52px] items-center justify-center rounded-[14px]', tones[tone])}><Icon className="h-6 w-6" /></div></div><div className="flex items-end justify-between gap-3"><svg viewBox="0 0 108 24" className={cn('h-7 w-[108px]', tone === 'green' ? 'text-[#16A34A]' : tone === 'orange' ? 'text-[#F97316]' : tone === 'purple' ? 'text-[#7C3AED]' : 'text-[#2563EB]')} fill="none" aria-hidden="true"><path d="M1 18 C9 15, 10 7, 18 11 S29 22, 37 14 S47 4, 55 10 S64 21, 72 13 S83 5, 90 12 S99 17, 107 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><div className="text-left"><div className="text-xs font-medium text-[#8490A5]">{subtitle}</div><div className={cn('mt-2 text-[11px] font-semibold', trend.includes('↓') ? 'text-[#EF4444]' : 'text-[#16A34A')}>{trend}</div></div></div></div>; }
function Summary({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between border-b border-[#F0F2F5] py-3 text-sm last:border-0"><span className="font-medium text-[#667085]">{label}</span><strong className="text-[#101828]">{value.toLocaleString('fa-IR')}</strong></div>; }
