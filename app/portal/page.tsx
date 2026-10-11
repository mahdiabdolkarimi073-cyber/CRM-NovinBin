'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { formatJalali } from '@/lib/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Activity, ArrowLeft, BarChart3, Bell, CalendarDays, CalendarCheck, CheckSquare,
  ChevronDown, ClipboardList, FileBarChart, FileText, Folder, FolderKanban, Gauge,
  ListChecks, MessageCircle, MessagesSquare, NotebookPen, Settings, Target, TrendingUp, Users,
  Wallet, Zap, Award, ShoppingCart,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Tone = 'blue' | 'purple' | 'orange' | 'green';
type QuickItem = { href: string; title: string; subtitle: string; icon: React.ElementType; tone: Tone };

const quickItems: QuickItem[] = [
  { href: '/portal/orders', title: 'سفارشات من', subtitle: 'پیگیری سفارش‌ها', icon: ShoppingCart, tone: 'green' },
  { href: '/portal/invoices', title: 'فاکتورهای من', subtitle: 'مشاهده فاکتورها', icon: FileText, tone: 'blue' },
  { href: '/portal/tickets', title: 'تیکت‌های من', subtitle: 'پشتیبانی و راهنما', icon: MessageCircle, tone: 'orange' },
  { href: '/portal/loyalty', title: 'باشگاه مشتریان', subtitle: 'امتیازها و جوایز', icon: Award, tone: 'purple' },
  { href: '/portal/work-reports', title: 'گزارش کار من', subtitle: 'گزارش‌های پروژه', icon: ClipboardList, tone: 'orange' },
  { href: '/portal/social', title: 'شبکه اجتماعی', subtitle: 'چت و پیام‌رسانی', icon: MessagesSquare, tone: 'blue' },
];

const tones: Record<Tone, string> = {
  blue: 'bg-[#EEF4FF] text-[#2563EB]',
  purple: 'bg-[#F3EEFF] text-[#7C3AED]',
  orange: 'bg-[#FFF2E8] text-[#F97316]',
  green: 'bg-[#ECFDF3] text-[#16A34A]',
};

const chartData = Array.from({ length: 7 }, (_, i) => {
  const day = new Date(); day.setDate(day.getDate() - 6 + i);
  return { name: formatJalali(day).split(' ')[0], orders: 0, invoices: 0 };
});

const recentOrders: { id: string; number: string; status: string; date: string }[] = [];
const recentInvoices: { id: string; number: string; status: string; date: string }[] = [];
const recentTickets: { id: string; subject: string; status: string; date: string }[] = [];

export default function PortalDashboardPage() {
  const { profile } = useAuth();

  const stats = [
    { title: 'سفارشات اخیر', value: 0, subtitle: 'سفارش فعال', trend: '۰٪ نسبت به دیروز', icon: ShoppingCart, tone: 'green' as Tone, trendDown: false },
    { title: 'فاکتورهای پرداخت‌نشده', value: 0, subtitle: 'فاکتور معوق', trend: '۰٪ نسبت به دیروز', icon: FileText, tone: 'orange' as Tone, trendDown: false },
    { title: 'تیکت‌های باز', value: 0, subtitle: 'تیکت در حال بررسی', trend: '۰٪ نسبت به دیروز', icon: MessageCircle, tone: 'blue' as Tone, trendDown: false },
    { title: 'امتیاز باشگاه', value: 0, subtitle: 'امتیاز تجمعی', trend: '۰٪ نسبت به ماه قبل', icon: Award, tone: 'purple' as Tone, trendDown: false },
  ];

  return (
    <div className="crm-dashboard" dir="rtl">
      {/* Welcome banner */}
      <div className="mb-5 flex flex-col gap-4 mobile:flex-row mobile:items-center mobile:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-[42px] w-[5px] rounded-full bg-emerald-500" />
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight text-[#101828]">
              سلام {profile?.firstName || 'مشتری'} 👋
            </h1>
            <p className="mt-2 text-sm font-medium text-[#8490A5]">امروز: {formatJalali(new Date())}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mobile:gap-3">
          <button className="flex h-10 items-center gap-2 rounded-xl border border-[#E3E8F2] bg-white px-3 text-xs font-semibold text-[#344054] shadow-[0_3px_12px_rgba(20,40,80,.04)] mobile:h-12 mobile:px-[18px] mobile:text-sm">
            <ChevronDown className="h-4 w-4" /> بازه زمانی: این ماه <CalendarDays className="h-4 w-4 text-emerald-600" />
          </button>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-[#E3E8F2] bg-white px-3 text-xs font-semibold text-[#344054] shadow-[0_3px_12px_rgba(20,40,80,.04)] mobile:h-12 mobile:px-[18px] mobile:text-sm">
            <ChevronDown className="h-4 w-4" /> سفارشی
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 mobile:gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
        {stats.map((s, i) => (
          <Kpi key={i} title={s.title} value={s.value} subtitle={s.subtitle} trend={s.trend} icon={s.icon} tone={s.tone} trendDown={s.trendDown} />
        ))}
      </div>

      {/* Quick access */}
      <div className="mb-4 rounded-[18px] border border-[#E7EBF3] bg-white p-4 shadow-[0_5px_18px_rgba(15,23,42,.045)] tablet:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#101828]">
            دسترسی سریع <Zap className="h-5 w-5 fill-[#FFB020] text-[#FFB020]" />
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 mobile:gap-3 tablet:grid-cols-3 laptop:grid-cols-6">
          {quickItems.map((item) => (
            <Link href={item.href} key={item.title} className="group flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-[14px] border border-[#E7EBF3] bg-white px-3 py-3 text-center transition-all duration-200 hover:-translate-y-px hover:border-[#D6DDF0] hover:bg-[#FAFBFF]">
              <div className={cn('flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:scale-110', tones[item.tone])}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-[#1D2939]">{item.title}</div>
                <div className="mt-1 truncate text-xs font-medium text-[#8490A5]">{item.subtitle}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Three-column section */}
      <div className="grid grid-cols-1 gap-4 laptop:grid-cols-[1fr_1.35fr_1fr]">
        {/* Performance summary */}
        <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]">
          <div className="mb-5 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-[#101828]">خلاصه حساب من</h2>
          </div>
          <Summary label="سفارشات کل" value={0} />
          <Summary label="فاکتورهای پرداخت‌شده" value={0} />
          <Summary label="تیکت‌های حل‌شده" value={0} />
          <div className="mt-5 flex items-center justify-center gap-4 border-t border-[#F0F2F5] pt-5">
            <div className="relative h-[82px] w-[82px] rounded-full" style={{ background: 'conic-gradient(#10B981 0%, #E8EEF8 0%)' }}>
              <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white">
                <strong className="text-lg text-[#101828]">۰٪</strong>
                <span className="text-[10px] text-[#8490A5]">پیشرفت</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-[#344054]">پیشرفت کلی</div>
              <div className="mt-1 text-xs text-[#8490A5]">نسبت به ماه قبل</div>
            </div>
          </div>
        </div>

        {/* Activity chart */}
        <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#101828]">
              <TrendingUp className="h-5 w-5 text-emerald-600" /> نمودار فعالیت‌ها
            </h2>
            <button className="flex h-8 items-center gap-1 rounded-lg border border-[#E3E8F2] px-3 text-xs text-[#667085]">
              ۷ روز اخیر <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mb-2 flex items-center gap-4 text-xs text-[#8490A5]">
            <span><i className="ml-1 inline-block h-2 w-2 rounded-full bg-[#10B981]" />سفارشات</span>
            <span><i className="ml-1 inline-block h-2 w-2 rounded-full bg-[#F97316]" />فاکتورها</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ordersArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity=".16" />
                  <stop offset="95%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="invoicesArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity=".12" />
                  <stop offset="95%" stopColor="#F97316" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8EDF5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontFamily: 'Vazirmatn', fontSize: 11, fill: '#8490A5' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontFamily: 'Vazirmatn', fontSize: 10, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontFamily: 'Vazirmatn', borderRadius: 10, border: '1px solid #E7EBF3' }} />
              <Area type="monotone" dataKey="orders" name="سفارشات" stroke="#10B981" strokeWidth={2} fill="url(#ordersArea)" />
              <Area type="monotone" dataKey="invoices" name="فاکتورها" stroke="#F97316" strokeWidth={2} fill="url(#invoicesArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#101828]">
              <Activity className="h-5 w-5 text-emerald-600" /> آخرین فعالیت‌ها
            </h2>
            <Link href="/portal/tickets" className="text-xs font-semibold text-emerald-600">مشاهده همه</Link>
          </div>
          <div className="py-10 text-center text-sm text-[#98A2B3]">هنوز فعالیتی ثبت نشده است</div>
        </div>
      </div>

      {/* Recent orders & invoices & tickets */}
      <div className="mt-4 grid grid-cols-1 gap-4 laptop:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#101828]">
              <ShoppingCart className="h-5 w-5 text-emerald-600" /> سفارشات اخیر
            </h2>
            <Link href="/portal/orders" className="text-xs font-semibold text-emerald-600">مشاهده همه</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#98A2B3]">سفارشی ثبت نشده</div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><ShoppingCart className="w-4 h-4" /></div>
                    <div>
                      <div className="text-sm font-medium">{o.number}</div>
                      <div className="text-xs text-slate-400">{o.date}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent invoices */}
        <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#101828]">
              <FileText className="h-5 w-5 text-emerald-600" /> فاکتورهای اخیر
            </h2>
            <Link href="/portal/invoices" className="text-xs font-semibold text-emerald-600">مشاهده همه</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#98A2B3]">فاکتوری ثبت نشده</div>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                  <div>
                    <div className="text-sm font-medium">{inv.number}</div>
                    <div className="text-xs text-slate-400">{inv.date}</div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{inv.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent tickets */}
        <div className="rounded-[18px] border border-[#E7EBF3] bg-white p-5 shadow-[0_5px_18px_rgba(15,23,42,.045)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#101828]">
              <MessageCircle className="h-5 w-5 text-emerald-600" /> تیکت‌های اخیر
            </h2>
            <Link href="/portal/tickets" className="text-xs font-semibold text-emerald-600">مشاهده همه</Link>
          </div>
          {recentTickets.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#98A2B3]">تیکتی ثبت نشده</div>
          ) : (
            <div className="space-y-2">
              {recentTickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                  <div>
                    <div className="text-sm font-medium">{t.subject}</div>
                    <div className="text-xs text-slate-400">{t.date}</div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, subtitle, trend, icon: Icon, tone, trendDown }: { title: string; value: number; subtitle: string; trend: string; icon: React.ElementType; tone: Tone; trendDown: boolean }) {
  return (
    <div className="flex h-[140px] flex-col justify-between rounded-2xl border border-[#E7EBF3] bg-white p-4 shadow-[0_5px_18px_rgba(20,40,80,.045)] transition-all duration-200 hover:-translate-y-px mobile:h-[160px] tablet:h-[174px] tablet:p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-[#344054]">{title}</div>
          <div className="mt-2 text-[22px] font-extrabold leading-none text-[#101828] mobile:text-[26px] tablet:text-[28px]">{value.toLocaleString('fa-IR')}</div>
        </div>
        <div className={cn('flex h-[44px] w-[44px] items-center justify-center rounded-[14px] mobile:h-[48px] tablet:h-[52px] tablet:w-[52px]', tones[tone])}>
          <Icon className="h-5 w-5 mobile:h-6 mobile:w-6" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <svg viewBox="0 0 108 24" className={cn('h-7 w-[108px]', tone === 'green' ? 'text-[#16A34A]' : tone === 'orange' ? 'text-[#F97316]' : tone === 'purple' ? 'text-[#7C3AED]' : 'text-[#2563EB]')} fill="none" aria-hidden="true">
          <path d="M1 18 C9 15, 10 7, 18 11 S29 22, 37 14 S47 4, 55 10 S64 21, 72 13 S83 5, 90 12 S99 17, 107 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="text-left">
          <div className="text-xs font-medium text-[#8490A5]">{subtitle}</div>
          <div className={cn('mt-2 text-[11px] font-semibold', trendDown ? 'text-[#EF4444]' : 'text-[#16A34A')}>{trend}</div>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-[#F0F2F5] py-3 text-sm last:border-0">
      <span className="font-medium text-[#667085]">{label}</span>
      <strong className="text-[#101828]">{value.toLocaleString('fa-IR')}</strong>
    </div>
  );
}
