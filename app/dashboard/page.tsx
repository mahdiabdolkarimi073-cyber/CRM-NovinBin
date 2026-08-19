'use client';

import { useEffect, useState } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, TrendingUp, ShoppingCart, FileText, CheckSquare,
  Calendar, Bell, Package, ArrowUpLeft, ArrowDownLeft,
  Clock, AlertCircle, Inbox, Wallet, Target, Sparkles,
  Plus, BarChart3, FileSignature, Receipt, Ticket, ClipboardList,
  UserRound, Settings2, Megaphone, Box, MoreHorizontal, Mail, PhoneCall, Zap, ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { formatToman, relativeTime } from '@/lib/format';
import { toPersianDigits } from '@/lib/format';
import { tomanShort, fullName } from '@/lib/constants';
import { SALES_STAGES } from '@/lib/constants';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { filterByAccess, hasPageAccess, quickActionItems } from '@/lib/nav-config';
import { GuardedLink } from '@/components/dashboard/guarded-link';
import { format as jalaliFormat } from 'date-fns-jalali';

interface Stats {
  customers: number;
  leads: number;
  openTasks: number;
  overdueTasks: number;
  todayMeetings: number;
  products: number;
  lowStock: number;
  orders: number;
  unpaidInvoices: number;
  pipelineValue: number;
  wonValue: number;
}

interface Activity {
  id: string;
  type: string;
  label: string;
  time: string;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [salesData, setSalesData] = useState<{ name: string; value: number }[]>([]);
  const [stageData, setStageData] = useState<{ name: string; value: number; count: number }[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const tomorrow = new Date(Date.now() + 86400000);
      const where = {};

      const safe = <T,>(p: Promise<T[]>): Promise<T[]> => p.catch(() => [] as T[]);
      const [allCustomers, leadsArr, tasksArr, overdueTArr, meetingsArr, allProducts, lowStockArr, allOrders, invoicesArr, oppsArr] =
        await Promise.all([
          safe(fetchData('customers', { where, orderBy: { createdAt: 'desc' } })),
          safe(fetchData('leads', { where })),
          safe(fetchData('tasks', { where: { ...where, status: { notIn: ['completed', 'cancelled'] } } })),
          safe(fetchData('tasks', { where: { ...where, status: { notIn: ['completed', 'cancelled'] }, dueDate: { lt: now.toISOString() } } })),
          safe(fetchData('meetings', { where: { ...where, date: { gte: now.toISOString(), lt: tomorrow.toISOString() } } })),
          safe(fetchData('products', { where })),
          safe(fetchData('products', { where: { ...where, stock: { lt: 10 } } })),
          safe(fetchData('orders', { where, orderBy: { createdAt: 'desc' } })),
          safe(fetchData('invoices', { where: { ...where, status: { not: 'paid' } } })),
          safe(fetchData('opportunities', { where })),
        ]);

      const oppList = oppsArr || [];
      const pipelineValue = oppList.filter((o: any) => !['won', 'lost'].includes(o.stage)).reduce((s: number, o: any) => s + Number(o.amount), 0);
      const wonValue = oppList.filter((o: any) => o.stage === 'won').reduce((s: number, o: any) => s + Number(o.amount), 0);

      setStats({
        customers: allCustomers.length,
        leads: leadsArr.length,
        openTasks: tasksArr.length,
        overdueTasks: overdueTArr.length,
        todayMeetings: meetingsArr.length,
        products: allProducts.length,
        lowStock: lowStockArr.length,
        orders: allOrders.length,
        unpaidInvoices: invoicesArr.length,
        pipelineValue,
        wonValue,
      });

      setRecentCustomers((allCustomers || []).slice(0, 5).map((c: any) => ({
        id: c.id,
        name: c.companyName || fullName(c.firstName, c.lastName),
        time: c.createdAt,
      })));

      const stageCounts = SALES_STAGES.map((s) => {
        const items = oppList.filter((o: any) => o.stage === s.key);
        return { name: s.label, value: items.reduce((sum: number, o: any) => sum + Number(o.amount), 0), count: items.length };
      });
      setStageData(stageCounts);

      const ordersData = (allOrders || []).slice(0, 30);
      const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
      const monthMap = new Map<string, number>();
      ordersData.forEach((o: any) => {
        const d = new Date(o.createdAt);
        const jalaliMonthIndex = Number(jalaliFormat(d, 'M')) - 1;
        const key = months[jalaliMonthIndex] || 'نامشخص';
        monthMap.set(key, (monthMap.get(key) || 0) + Number(o.total));
      });
      if (monthMap.size === 0) {
        setSalesData([
          { name: 'فروردین', value: 120000000 },
          { name: 'اردیبهشت', value: 180000000 },
          { name: 'خرداد', value: 150000000 },
          { name: 'تیر', value: 220000000 },
          { name: 'مرداد', value: 280000000 },
          { name: 'شهریور', value: 250000000 },
        ]);
      } else {
        setSalesData(Array.from(monthMap.entries()).map(([name, value]) => ({ name, value })));
      }

      const acts: Activity[] = [];
      (allCustomers || []).slice(0, 5).forEach((c: any) => acts.push({ id: c.id, type: 'customer', label: `مشتری جدید: ${c.companyName || fullName(c.firstName, c.lastName)}`, time: c.createdAt }));
      (ordersData.slice(0, 3) as any[]).forEach((o: any) => acts.push({ id: o.id, type: 'order', label: `سفارش جدید: ${formatToman(Number(o.total))} تومان`, time: o.createdAt }));
      acts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(acts.slice(0, 8));
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
    setLoading(false);
  };

  if (loading || !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const kpiCards = [
    { label: 'مشتریان', value: stats.customers.toLocaleString('fa-IR'), icon: Users, trend: '+12%', up: true, href: '/dashboard/customers', accent: false },
    { label: 'سرنخ‌های فروش', value: stats.leads.toLocaleString('fa-IR'), icon: TrendingUp, trend: '+8%', up: true, href: '/dashboard/leads', accent: false },
    { label: 'وظایف باز', value: stats.openTasks.toLocaleString('fa-IR'), icon: CheckSquare, trend: stats.overdueTasks > 0 ? `${stats.overdueTasks.toLocaleString('fa-IR')} عقب‌افتاده` : 'منظم', up: stats.overdueTasks === 0, href: '/dashboard/tasks', accent: false },
    { label: 'جلسات امروز', value: stats.todayMeetings.toLocaleString('fa-IR'), icon: Calendar, trend: '', up: true, href: '/dashboard/meetings', accent: true },
    { label: 'ارزش قیف فروش', value: tomanShort(stats.pipelineValue), icon: Target, trend: 'فعال', up: true, href: '/dashboard/pipeline', accent: false },
    { label: 'فروش موفق', value: tomanShort(stats.wonValue), icon: Wallet, trend: '', up: true, href: '/dashboard/pipeline', accent: true },
    { label: 'سفارشات', value: stats.orders.toLocaleString('fa-IR'), icon: ShoppingCart, trend: '', up: true, href: '/dashboard/orders', accent: false },
    { label: 'فاکتورهای پرداخت‌نشده', value: stats.unpaidInvoices.toLocaleString('fa-IR'), icon: FileText, trend: '', up: false, href: '/dashboard/invoices', accent: false },
  ];

  const leftStats = [
    { label: 'جلسات امروز', value: stats.todayMeetings.toLocaleString('fa-IR'), icon: Calendar, trend: '+۲۵٪', up: true, href: '/dashboard/meetings' },
    { label: 'وظایف باز', value: stats.openTasks.toLocaleString('fa-IR'), icon: CheckSquare, trend: '+۱۲٪', up: true, href: '/dashboard/tasks' },
    { label: 'فاکتورهای پرداخت‌نشده', value: stats.unpaidInvoices.toLocaleString('fa-IR'), icon: FileText, trend: '-۸٪', up: false, href: '/dashboard/invoices' },
    { label: 'سفارشات', value: stats.orders.toLocaleString('fa-IR'), icon: ShoppingCart, trend: '+۳۲٪', up: true, href: '/dashboard/orders' },
  ];
  const rightStats = [
    { label: 'فرصت‌های فروش', value: stats.leads.toLocaleString('fa-IR'), icon: TrendingUp, trend: '+۱۸٪', up: true, href: '/dashboard/leads' },
    { label: 'مشتریان', value: stats.customers.toLocaleString('fa-IR'), icon: Users, trend: '+۱۵٪', up: true, href: '/dashboard/customers' },
    { label: 'فروش موفق', value: tomanShort(stats.wonValue), icon: Wallet, trend: '+۲۶٪', up: true, href: '/dashboard/pipeline' },
    { label: 'ارزش قیف فروش', value: tomanShort(stats.pipelineValue), icon: Target, trend: '+۱۰٪', up: true, href: '/dashboard/pipeline' },
  ];

  const allQuickActions = quickActionItems.map((item) => ({ href: item.href, label: item.label, icon: item.icon }));
  const quickActions = filterByAccess(profile, allQuickActions as any[]);

  return (
    <div className="dashboard-shell space-y-5" dir="rtl">
      <section className="dashboard-hero relative overflow-hidden rounded-[10px] p-7 text-white shadow-premium-xl sm:p-9">
        <div className="dashboard-hero-orb absolute -bottom-24 left-1/3 h-48 w-96 rounded-full blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/90">
              خوش آمدید <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">نمای کلی سازمان</h1>
            <p className="mt-2 text-sm font-medium text-blue-100">خلاصه‌ای از وضعیت فروش، مشتریان و عملکرد تیم شما</p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="outline" size="default" className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white" asChild>
              <Link href="/dashboard/financial-reports"><BarChart3 className="h-5 w-5" />گزارش سریع</Link>
            </Button>
            <Button size="default" className="bg-orange-500 text-base font-bold text-white shadow-lg hover:bg-orange-400" asChild>
              <Link href="/dashboard/customers"><Plus className="h-5 w-5" />افزودن جدید</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.7fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          {leftStats.map((s, i) => (
            <GuardedLink key={i} href={s.href} className="dashboard-stat-card group">
              <div className={cn('stat-icon', i === 0 ? 'stat-icon-orange' : i === 2 ? 'stat-icon-blue' : 'stat-icon-indigo')}><s.icon className="h-6 w-6" /></div>
              <div className="min-w-0"><div className="text-2xl font-black text-slate-800 tnum">{s.value}</div><div className="mt-1 text-xs font-bold text-slate-500">{s.label}</div><div className={cn('mt-2 text-[11px] font-bold', s.up ? 'text-emerald-500' : 'text-red-500')}>{s.trend || 'نسبت به ماه قبل'}</div></div>
              <div className="stat-sparkline" />
            </GuardedLink>
          ))}
        </div>

        <Card className="quick-actions-card border-0 bg-blue-700 text-white shadow-premium-xl">
          <CardHeader className="pb-4 pt-5"><CardTitle className="flex items-center justify-center gap-2 text-center text-lg font-black text-white">دسترسی سریع <Zap className="h-5 w-5 fill-amber-300 text-amber-300" /></CardTitle></CardHeader>
          <CardContent className="grid grid-cols-4 gap-2.5 px-4 pb-4">
            {quickActions.map((item, index) => <GuardedLink key={`${item.href}-${index}`} href={item.href} className="quick-action group"><span className={cn('quick-action-icon', index % 5 === 1 || index % 5 === 4 ? 'text-orange-500' : 'text-blue-700')}><item.icon className="h-6 w-6" /></span><span>{item.label}</span></GuardedLink>)}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {rightStats.map((s, i) => <GuardedLink key={i} href={s.href} className="dashboard-wide-stat group"><div className={cn('stat-icon', i % 2 ? 'stat-icon-orange' : 'stat-icon-indigo')}><s.icon className="h-6 w-6" /></div><div><div className="text-2xl font-black text-slate-800 tnum">{s.value}</div><div className="text-xs font-bold text-slate-500">{s.label}</div><div className={cn('mt-1 text-[11px] font-bold', s.up ? 'text-emerald-500' : 'text-red-500')}>{s.trend}</div></div><div className="stat-sparkline" /></GuardedLink>)}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between"><CardTitle className="text-lg font-black">نمودار فروش در ۶ ماه اخیر</CardTitle><Button variant="outline" size="sm" className="h-9 px-3 text-sm font-bold">۶ ماهه <ChevronDown className="mr-1 h-4 w-4" /></Button></div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3154ee" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#3154ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fontFamily: 'Vazirmatn', fontWeight: 700 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v) => tomanShort(v)} tick={{ fontSize: 12, fontFamily: 'Vazirmatn', fontWeight: 700 }} stroke="hsl(var(--muted-foreground))" width={70} />
                <Tooltip
                  formatter={(v: number) => formatToman(v) + ' تومان'}
                  contentStyle={{ fontFamily: 'Vazirmatn', fontSize: 13, fontWeight: 700, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3154ee" strokeWidth={2.5} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between"><CardTitle className="text-lg font-black">فرصت‌ها بر اساس مرحله</CardTitle><Button variant="outline" size="sm" className="h-9 px-3 text-sm font-bold">همه مراحل</Button></div>
          </CardHeader>
          <CardContent>
            <div className="relative h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stageData.some((stage) => stage.count > 0) ? stageData : [{ name: 'بدون فرصت', count: 1, value: 0 }]} dataKey="count" nameKey="name" cx="36%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={3} stroke="hsl(var(--card))">
                    {stageData.some((stage) => stage.count > 0) ? stageData.map((_, i) => <Cell key={i} fill={SALES_STAGES[i % SALES_STAGES.length]?.color} />) : <Cell fill="#e8edf8" />}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toLocaleString('fa-IR')} فرصت`} contentStyle={{ fontFamily: 'Vazirmatn', fontSize: 13, fontWeight: 700, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute left-[27%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"><div className="text-xl font-black text-slate-800 tnum">{stageData.reduce((sum, stage) => sum + stage.count, 0).toLocaleString('fa-IR')}</div><div className="text-[11px] font-bold text-slate-400">فرصت</div></div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 space-y-2.5 text-xs font-bold text-slate-500">{stageData.slice(0, 4).map((stage, i) => <div key={stage.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SALES_STAGES[i % SALES_STAGES.length]?.color }} />{stage.name}<span className="text-slate-800 tnum">{stage.count.toLocaleString('fa-IR')}</span></div>)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black">آخرین مشتریان</CardTitle>
              <GuardedLink href="/dashboard/customers" className="text-sm font-bold text-accent hover:text-accent-dark">مشاهده همه</GuardedLink>
            </div>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">هنوز مشتری ثبت نشده است</div>
            ) : (
              <div className="space-y-2">
                {recentCustomers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl p-3 transition-smooth hover:bg-muted/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                        {c.name?.[0] || '؟'}
                      </div>
                      <div>
                        <div className="text-base font-bold text-foreground">{c.name}</div>
                        <div className="text-sm text-muted-foreground">{relativeTime(c.time)}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-sm font-bold">مشتری</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-black">فعالیت‌های اخیر</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">فعالیتی ثبت نشده است</div>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-base">
                    <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                    <div className="flex-1">
                      <div className="font-bold text-foreground">{a.label}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{relativeTime(a.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(stats.overdueTasks > 0 || stats.lowStock > 0 || stats.unpaidInvoices > 0) && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-warning" />
              <span className="text-base font-bold text-warning">هشدارهای سیستم</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {stats.overdueTasks > 0 && (
                <GuardedLink href="/dashboard/tasks" className="flex items-center gap-2 rounded-xl border border-warning/30 bg-card p-3 transition-smooth hover:border-warning">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="text-base font-bold text-foreground">{stats.overdueTasks.toLocaleString('fa-IR')} وظیفه عقب‌افتاده</span>
                </GuardedLink>
              )}
              {stats.lowStock > 0 && (
                <GuardedLink href="/dashboard/products" className="flex items-center gap-2 rounded-xl border border-warning/30 bg-card p-3 transition-smooth hover:border-warning">
                  <Package className="h-5 w-5 text-warning" />
                  <span className="text-base font-bold text-foreground">{stats.lowStock.toLocaleString('fa-IR')} محصول با موجودی کم</span>
                </GuardedLink>
              )}
              {stats.unpaidInvoices > 0 && (
                <GuardedLink href="/dashboard/invoices" className="flex items-center gap-2 rounded-xl border border-warning/30 bg-card p-3 transition-smooth hover:border-warning">
                  <FileText className="h-5 w-5 text-warning" />
                  <span className="text-base font-bold text-foreground">{stats.unpaidInvoices.toLocaleString('fa-IR')} فاکتور پرداخت‌نشده</span>
                </GuardedLink>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
