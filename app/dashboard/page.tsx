'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowUpRight, BarChart3, Bell,
  CalendarCheck, CalendarDays, CheckCircle2, CheckSquare, ChevronDown,
  ClipboardList, Clock, DollarSign, FileBarChart, FileText, Filter,
  Folder, FolderKanban, Gauge, ListChecks, MessageCircle, MessagesSquare,
  NotebookPen, Phone, Plus, Settings, Sparkles, Target, TrendingUp,
  UserPlus, Users, Workflow, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatJalali, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { cartableItems } from '@/lib/nav-config';

type Report = { id: string; createdAt: string; reportDate?: string; title?: string; fullName?: string };
type Task = { id: string; status: string };
type Meeting = { id: string; date: string };
type Notification = { id: string; title: string; body?: string | null; createdAt: string; link?: string | null };

type Tone = 'blue' | 'purple' | 'orange' | 'green' | 'rose' | 'amber';

type KpiData = {
  title: string;
  value: number;
  subtitle: string;
  trend: number;
  trendLabel: string;
  icon: React.ElementType;
  tone: Tone;
  spark: number[];
};

const toneColors: Record<Tone, { text: string; bg: string; stroke: string; gradient: string }> = {
  blue:   { text: 'text-blue-600',   bg: 'bg-blue-50',   stroke: '#2563EB', gradient: 'from-blue-500 to-blue-600' },
  purple: { text: 'text-violet-600', bg: 'bg-violet-50', stroke: '#7C3AED', gradient: 'from-violet-500 to-purple-600' },
  orange: { text: 'text-orange-600', bg: 'bg-orange-50', stroke: '#F97316', gradient: 'from-orange-500 to-amber-600' },
  green:  { text: 'text-emerald-600',bg: 'bg-emerald-50',stroke: '#16A34A', gradient: 'from-emerald-500 to-teal-600' },
  rose:   { text: 'text-rose-600',   bg: 'bg-rose-50',   stroke: '#E11D48', gradient: 'from-rose-500 to-pink-600' },
  amber:  { text: 'text-amber-600',  bg: 'bg-amber-50',  stroke: '#D97706', gradient: 'from-amber-500 to-yellow-600' },
};

const quickItems: { href: string; title: string; subtitle: string; icon: React.ElementType; tone: Tone }[] = [
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
  { href: '/dashboard/social', title: 'شبکه اجتماعی', subtitle: 'چت گروهی و پیام‌رسانی', icon: MessagesSquare, tone: 'blue' },
];

const pipelineStages = [
  { stage: 'سرنخ جدید', count: 24, value: 480, color: '#2563EB' },
  { stage: 'ارتباط اولیه', count: 18, value: 360, color: '#7C3AED' },
  { stage: 'مذاکره', count: 12, value: 240, color: '#F97316' },
  { stage: 'پیش‌فاکتور', count: 8, value: 160, color: '#D97706' },
  { stage: 'قرارداد', count: 5, value: 100, color: '#16A34A' },
];

const segmentData = [
  { name: 'مشتریان VIP', value: 32, color: '#2563EB' },
  { name: 'مشتریان فعال', value: 45, color: '#16A34A' },
  { name: 'مشتریان جدید', value: 18, color: '#F97316' },
  { name: 'مشتریان غیرفعال', value: 12, color: '#94A3B8' },
];

const teamPerformance = [
  { name: 'علی محمدی', deals: 28, revenue: 560, target: 70, avatar: 'AM' },
  { name: 'فاطمه احمدی', deals: 22, revenue: 440, target: 55, avatar: 'FA' },
  { name: 'حسین رضایی', deals: 18, revenue: 360, target: 60, avatar: 'HR' },
  { name: 'زهرا کریمی', deals: 15, revenue: 300, target: 50, avatar: 'ZK' },
];

const recentRecords = [
  { type: 'مشتری', name: 'شرکت آریا صنعت', time: '۵ دقیقه پیش', icon: Users, href: '/dashboard/customers' },
  { type: 'سرنخ', name: 'آقای سعید نوری', time: '۲۰ دقیقه پیش', icon: TrendingUp, href: '/dashboard/leads' },
  { type: 'جلسه', name: 'جلسه با شرکت پارس', time: '۱ ساعت پیش', icon: CalendarDays, href: '/dashboard/meetings' },
  { type: 'فاکتور', name: 'فاکتور شماره ۱۰۲۴', time: '۲ ساعت پیش', icon: FileText, href: '/dashboard/invoices' },
];

const upcomingEvents = [
  { title: 'جلسه با مشتری آریا', time: '۱۰:۰۰ صبح', date: 'امروز', icon: CalendarCheck },
  { title: 'تماس با سرنخ جدید', time: '۱۴:۳۰', date: 'امروز', icon: Phone },
  { title: 'ارسال پیش‌فاکتور', time: '۱۶:۰۰', date: 'امروز', icon: FileText },
  { title: 'جلسه تیم فروش', time: '۰۹:۰۰', date: 'فردا', icon: Users },
];

const quickActions: { label: string; icon: React.ElementType; href: string; tone: Tone }[] = [
  { label: 'مشتری جدید', icon: UserPlus, href: '/dashboard/customers/new', tone: 'blue' },
  { label: 'سرنخ جدید', icon: TrendingUp, href: '/dashboard/leads/new', tone: 'green' },
  { label: 'جلسه جدید', icon: CalendarDays, href: '/dashboard/meetings/new', tone: 'orange' },
  { label: 'تسک جدید', icon: CheckSquare, href: '/dashboard/tasks/new', tone: 'purple' },
  { label: 'فاکتور جدید', icon: FileText, href: '/dashboard/invoices/new', tone: 'amber' },
  { label: 'تیکت جدید', icon: MessageCircle, href: '/dashboard/tickets/new', tone: 'rose' },
];

function dayStart(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

const faNum = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

function Sparkline({ data, color, width = 100, height = 30 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const gradId = `spark-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{faNum(display.toLocaleString('en-US'))}</>;
}

function KpiCard({ data, index }: { data: KpiData; index: number }) {
  const tc = toneColors[data.tone];
  const isUp = data.trend >= 0;
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 mobile:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-l opacity-80', tc.gradient)} />
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs mobile:text-sm font-medium text-muted-foreground">{data.title}</p>
          <div className="mt-2 text-2xl mobile:text-3xl font-bold tracking-tight text-foreground">
            <CountUp value={data.value} />
          </div>
          <p className="mt-1 text-[11px] mobile:text-xs text-muted-foreground">{data.subtitle}</p>
        </div>
        <div className={cn('flex h-10 w-10 mobile:h-12 mobile:w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110', tc.bg, tc.text)}>
          <data.icon className="h-5 w-5 mobile:h-6 mobile:w-6" />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn('flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold', isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
            {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {faNum(Math.abs(data.trend))}٪
          </span>
          <span className="text-[10px] mobile:text-[11px] text-muted-foreground">{data.trendLabel}</span>
        </div>
        <Sparkline data={data.spark} color={tc.stroke} width={80} height={24} />
      </div>
    </div>
  );
}

function ProgressRing({ value, size = 120, color = '#2563EB', label }: { value: number; size?: number; color?: string; label: string }) {
  const data = [{ name: label, value, fill: color }];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(var(--muted))' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{faNum(value)}٪</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, action, children, className }: {
  title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-border/60 bg-card p-4 mobile:p-5 shadow-sm transition-shadow duration-300 hover:shadow-md animate-fade-in', className)}>
      <div className="mb-3 mobile:mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm mobile:text-base font-bold text-foreground">
          <Icon className="h-4 w-4 mobile:h-5 mobile:w-5 text-primary" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const chartTooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  fontFamily: 'Vazirmatn',
  fontSize: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,.08)',
} as const;

export default function DashboardPage() {
  const { profile } = useAuth();
  const [daily, setDaily] = useState<Report[]>([]);
  const [monthly, setMonthly] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (!profile?.id) return;
    const safe = <T,>(section: string, request: Promise<T[]>): Promise<T[]> => request.catch((error: unknown) => {
      console.error('[dashboard-data]', { section, error });
      return [];
    });
    Promise.all([
      safe('daily_work_reports', fetchData<Report>('daily_work_reports', { orderBy: { createdAt: 'desc' } })),
      safe('monthly_work_reports', fetchData<Report>('monthly_work_reports', { orderBy: { createdAt: 'desc' } })),
      safe('tasks', fetchData<Task>('tasks', { where: { status: { notIn: ['completed', 'cancelled'] } } })),
      safe('meetings', fetchData<Meeting>('meetings', { orderBy: { date: 'asc' } })),
      safe('notifications', fetchData<Notification>('notifications', { where: { profileId: profile.id }, orderBy: { createdAt: 'desc' }, take: 5 })),
    ]).then(([dailyReports, monthlyReports, openTasks, meetingList, notificationList]) => {
      setDaily(dailyReports); setMonthly(monthlyReports); setTasks(openTasks); setMeetings(meetingList); setNotifications(notificationList); setLoading(false);
    });
  }, [profile?.id]);

  const today = dayStart(new Date());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayMeetings = meetings.filter((m) => { const d = new Date(m.date); return d >= today && d < tomorrow; }).length;
  const completedTasks = Math.round(tasks.length * 0.76);
  const pastMeetings = meetings.filter((m) => new Date(m.date) < new Date()).length;

  const chartData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today); day.setDate(today.getDate() - 6 + index);
    const next = new Date(day); next.setDate(day.getDate() + 1);
    return {
      name: formatJalali(day).split(' ')[0],
      روزانه: daily.filter((item) => { const d = new Date(item.reportDate || item.createdAt); return d >= day && d < next; }).length,
      ماهانه: monthly.filter((item) => { const d = new Date(item.createdAt); return d >= day && d < next; }).length,
    };
  }), [daily, monthly, today]);

  const activities = notifications.length > 0 ? notifications : [
    ...monthly.slice(0, 3).map((item) => ({ id: item.id, title: 'گزارش ماهانه جدید ثبت شد', body: item.fullName ? `توسط ${item.fullName}` : 'توسط شما', createdAt: item.createdAt, link: `/dashboard/work-reports/view/${item.id}` })),
    ...daily.slice(0, 2).map((item) => ({ id: item.id, title: item.title || 'گزارش روزانه جدید ثبت شد', body: 'توسط شما', createdAt: item.createdAt, link: `/dashboard/work-reports/daily/view/${item.id}` })),
  ].slice(0, 5);

  const kpiCards: KpiData[] = [
    { title: 'وظایف فعال', value: tasks.length, subtitle: 'وظیفه در حال انجام', trend: -5, trendLabel: 'نسبت به دیروز', icon: CheckSquare, tone: 'green', spark: [8, 6, 9, 7, 10, 8, tasks.length || 6] },
    { title: 'جلسات امروز', value: todayMeetings, subtitle: 'جلسه برنامه‌ریزی شده', trend: 8, trendLabel: 'نسبت به دیروز', icon: CalendarDays, tone: 'orange', spark: [2, 3, 1, 4, 3, 5, todayMeetings || 3] },
    { title: 'گزارش‌های روزانه', value: daily.length, subtitle: 'گزارش ثبت شده', trend: 13, trendLabel: 'نسبت به دیروز', icon: FileBarChart, tone: 'blue', spark: [5, 8, 6, 10, 9, 12, daily.length || 10] },
    { title: 'گزارش‌های ماهانه', value: monthly.length, subtitle: 'گزارش ثبت شده', trend: 18, trendLabel: 'نسبت به ماه قبل', icon: FileText, tone: 'purple', spark: [2, 3, 4, 3, 5, 6, monthly.length || 5] },
    { title: 'جلسات برگزار شده', value: pastMeetings, subtitle: 'تاکنون', trend: 22, trendLabel: 'نسبت به ماه قبل', icon: CalendarCheck, tone: 'amber', spark: [4, 6, 8, 7, 10, 12, pastMeetings || 8] },
    { title: 'تسک‌های تکمیل شده', value: completedTasks, subtitle: 'این ماه', trend: 15, trendLabel: 'نسبت به ماه قبل', icon: CheckCircle2, tone: 'rose', spark: [3, 5, 7, 6, 9, 11, completedTasks || 8] },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">در حال بارگذاری داشبورد...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* === HERO HEADER === */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary via-primary to-primary-light p-5 mobile:p-6 shadow-lg animate-fade-in">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-5 bottom-0 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="flex items-center gap-3 mobile:gap-4">
            <div className="h-10 w-1.5 mobile:h-12 mobile:w-1.5 rounded-full bg-accent shadow-lg" />
            <div>
              <h1 className="text-xl mobile:text-2xl tablet:text-3xl font-bold text-primary-foreground">
                خوش آمدید، {profile?.firstName || 'مهدی'}
              </h1>
              <p className="mt-1 text-xs mobile:mt-1.5 mobile:text-sm text-primary-foreground/70">
                امروز: {formatJalali(new Date())} — خلاصه عملکرد شما آماده است
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="flex h-9 mobile:h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 mobile:px-4 text-xs mobile:text-sm font-medium text-primary-foreground backdrop-blur-sm transition hover:bg-white/20">
              <ChevronDown className="h-4 w-4" />
              بازه زمانی: این ماه
              <CalendarDays className="h-4 w-4" />
            </button>
            <button className="flex h-9 mobile:h-10 items-center gap-2 rounded-xl bg-accent px-3 mobile:px-4 text-xs mobile:text-sm font-semibold text-accent-foreground shadow-lg transition hover:scale-105 hover:bg-accent-light">
              <Filter className="h-4 w-4" />
              سفارشی
            </button>
          </div>
        </div>
      </div>

      {/* === KPI STRIP === */}
      <div className="grid grid-cols-1 gap-4 mobile:grid-cols-2 tablet:grid-cols-3 laptop:grid-cols-4 desktop:grid-cols-6">
        {kpiCards.map((kpi, i) => (
          <KpiCard key={kpi.title} data={kpi} index={i} />
        ))}
      </div>

      {/* === MAIN ANALYTICS === */}
      <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2 laptop:grid-cols-2 desktop:grid-cols-3">
        {/* Primary chart — takes 2 cols on desktop */}
        <SectionCard
          title="نمودار فعالیت‌ها"
          icon={TrendingUp}
          className="tablet:col-span-2 laptop:col-span-2 desktop:col-span-2"
          action={
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition',
                    chartPeriod === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p === 'daily' ? 'روزانه' : p === 'weekly' ? 'هفتگی' : 'ماهانه'}
                </button>
              ))}
            </div>
          }
        >
          <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />گزارش‌های روزانه</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />گزارش‌های ماهانه</span>
          </div>
          <ResponsiveContainer width="100%" height={220} mobile:height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="gDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontFamily: 'Vazirmatn', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontFamily: 'Vazirmatn', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="روزانه" stroke="#2563EB" strokeWidth={2.5} fill="url(#gDaily)" dot={{ r: 3, fill: '#2563EB' }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="ماهانه" stroke="#F97316" strokeWidth={2.5} fill="url(#gMonthly)" dot={{ r: 3, fill: '#F97316' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Donut chart */}
        <SectionCard title="بخش‌بندی مشتریان" icon={Users}>
          <div className="relative">
            <ResponsiveContainer width="100%" height={180} mobile:height={200}>
              <PieChart>
                <Pie data={segmentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {segmentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-foreground">{faNum(segmentData.reduce((s, d) => s + d.value, 0))}</span>
              <span className="text-xs text-muted-foreground">کل مشتریان</span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {segmentData.map((seg) => (
              <div key={seg.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
                  {seg.name}
                </span>
                <span className="font-semibold text-foreground">{faNum(seg.value)}٪</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* === PIPELINE + ACTIVITY + QUICK ACTIONS === */}
      <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2 laptop:grid-cols-2 desktop:grid-cols-3">
        {/* Pipeline funnel */}
        <SectionCard title="قیف فروش" icon={BarChart3}>
          <div className="space-y-3">
            {pipelineStages.map((stage, i) => {
              const maxVal = pipelineStages[0].count;
              const pct = (stage.count / maxVal) * 100;
              return (
                <div key={stage.stage} className="group">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{stage.stage}</span>
                    <span className="text-muted-foreground">{faNum(stage.count)} فرصت · {faNum(stage.value)} میلیون</span>
                  </div>
                  <div className="h-7 overflow-hidden rounded-lg bg-muted">
                    <div
                      className="flex h-full items-center rounded-lg transition-all duration-700 ease-out"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${stage.color}, ${stage.color}dd)`, animationDelay: `${i * 100}ms` }}
                    >
                      <span className="pr-2 text-[10px] font-bold text-white">{faNum(stage.count)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-muted-foreground">کل ارزش قیف</span>
            <span className="font-bold text-foreground">{faNum(pipelineStages.reduce((s, d) => s + d.value, 0))} میلیون تومان</span>
          </div>
        </SectionCard>

        {/* Activity feed */}
        <SectionCard
          title="آخرین فعالیت‌ها"
          icon={Activity}
          action={<Link href="/dashboard/notifications" className="text-xs font-medium text-primary hover:underline">مشاهده همه</Link>}
        >
          {activities.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">هنوز فعالیتی ثبت نشده است</div>
          ) : (
            <div className="space-y-3">
              {activities.map((item) => (
                <Link href={item.link || '/dashboard/notifications'} key={item.id} className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-muted/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.body || 'توسط شما'}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(item.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Quick actions */}
        <SectionCard title="اقدامات سریع" icon={Zap}>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const tc = toneColors[action.tone];
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    'group flex flex-col items-center gap-2 rounded-xl border border-border/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                    'bg-card hover:bg-muted/30',
                  )}
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110', tc.bg, tc.text)}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* === کارتابل (PRESERVED ORDER) === */}
      <SectionCard
        title="کارتابل"
        icon={ClipboardList}
        action={<span className="text-xs text-muted-foreground">{faNum(cartableItems.length)} آیتم</span>}
      >
        <div className="grid grid-cols-1 gap-2.5 mobile:grid-cols-2 tablet:grid-cols-3 laptop:grid-cols-4 desktop:grid-cols-5">
          {cartableItems.map((item, i) => {
            const tones: Tone[] = ['blue', 'green', 'orange', 'purple', 'amber', 'rose'];
            const tone = tones[i % tones.length];
            const tc = toneColors[tone];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110', tc.bg, tc.text)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </SectionCard>

      {/* === PERFORMANCE & GOALS === */}
      <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2 laptop:grid-cols-2 desktop:grid-cols-3">
        {/* Performance rings */}
        <SectionCard title="پیشرفت اهداف" icon={Gauge}>
          <div className="flex flex-col items-center gap-4 mobile:flex-row mobile:items-center mobile:justify-around">
            <div className="flex flex-col items-center gap-2">
              <ProgressRing value={76} label="پیشرفت کلی" color="#2563EB" size={110} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <ProgressRing value={62} label="هدف فروش" color="#16A34A" size={110} />
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            {[
              { label: 'گزارش‌های ثبت شده', value: daily.length + monthly.length, max: 30 },
              { label: 'جلسات برگزار شده', value: pastMeetings, max: 20 },
              { label: 'تسک‌های تکمیل شده', value: completedTasks, max: tasks.length || 1 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <strong className="text-foreground">{faNum(row.value)} / {faNum(row.max)}</strong>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Team leaderboard */}
        <SectionCard title="عملکرد تیم" icon={Target}>
          <div className="space-y-3">
            {teamPerformance.map((member, i) => {
              const pct = Math.round((member.deals / member.target) * 100);
              return (
                <div key={member.name} className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-700' : 'bg-blue-500',
                  )}>
                    {member.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-foreground">{member.name}</span>
                      <span className="text-xs text-muted-foreground">{faNum(member.deals)} معامله</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 80 ? '#16A34A' : pct >= 50 ? '#F97316' : '#EF4444' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Revenue bar chart */}
        <SectionCard title="قیف مراحل فروش" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={180} mobile:height={220}>
            <BarChart data={pipelineStages} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontFamily: 'Vazirmatn', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontFamily: 'Vazirmatn', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="count" name="تعداد" radius={[6, 6, 0, 0]}>
                {pipelineStages.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* === QUICK ACCESS & SHORTCUTS === */}
      <div className="grid grid-cols-1 gap-5 tablet:grid-cols-2 laptop:grid-cols-2 desktop:grid-cols-3">
        {/* Recent records */}
        <SectionCard title="رکوردهای اخیر" icon={Clock}>
          <div className="space-y-2">
            {recentRecords.map((rec, i) => (
              <Link
                key={i}
                href={rec.href}
                className="group flex items-center gap-3 rounded-lg p-2.5 transition hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <rec.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{rec.name}</p>
                  <p className="text-xs text-muted-foreground">{rec.type} · {rec.time}</p>
                </div>
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </SectionCard>

        {/* Upcoming events */}
        <SectionCard title="رویدادهای پیش‌رو" icon={CalendarDays}>
          <div className="space-y-2">
            {upcomingEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 p-2.5 transition hover:border-primary/30 hover:bg-muted/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <event.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.date} · {event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Quick access grid */}
        <SectionCard title="دسترسی سریع" icon={Sparkles}>
          <div className="grid grid-cols-2 gap-2.5">
            {quickItems.map((item) => {
              const tc = toneColors[item.tone];
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex min-h-[72px] items-center gap-2.5 rounded-xl border border-border/50 bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110', tc.bg, tc.text)}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{item.subtitle}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>

    </div>
  );
}
