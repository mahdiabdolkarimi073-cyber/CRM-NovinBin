'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Users,
  UserPlus,
  TrendingUp,
  Wallet,
  CalendarDays,
  AlertTriangle,
  Loader2,
  LogOut,
  Bell,
  Menu,
  Search,
  LifeBuoy,
  Settings,
  ClipboardList,
  GraduationCap,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

type User = { id: string; firstName: string; lastName: string; username: string; role: string; email?: string | null; phone?: string | null };
type Stats = {
  activeStudents: number;
  teachers: number;
  newLeads: number;
  newRegistrations: number;
  monthRevenue: number;
  totalDebt: number;
  todayClasses: number;
  freeCapacity: number;
  todayAbsences: number;
  atRiskCount: number;
};
type TodayClass = { id: string; title: string; startsAt: string; weekday: string | null; room: string | null; status: string };
type AtRiskStudent = { id: string; name: string; progress: number };
type RecentLead = { id: string; type: string; status: string; createdAt: string };
type RecentRegistration = { id: string; name: string; createdAt: string };

function formatJalali(date: string | null) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString('fa-IR');
  }
}

function timeOnly(iso: string) {
  try { return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }); }
}

function jalaliDay(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}

const adminNavItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard', active: true },
  { label: 'مدیریت دانش‌آموزان', icon: Users, href: '/academy/students', active: false },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers', active: false },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education', active: false },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management', active: false },
  { label: 'ثبت‌نام‌ها', icon: ClipboardList, href: '/academy/registration', active: false },
  { label: 'کلاس‌ها', icon: CalendarDays, href: '/academy/classes', active: false },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes', active: false },
];

export default function AcademyAdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistration[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/admin-dashboard', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setStats(data.stats);
        setTodayClasses(data.todayClasses || []);
        setAtRiskStudents(data.atRiskStudents || []);
        setRecentLeads(data.recentLeads || []);
        setRecentRegistrations(data.recentRegistrations || []);
      })
      .catch(() => {
        if (!cancelled) router.replace('/academy/login');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  if (loading) {
    return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user || !stats) {
    return <div className="academy-admin-loading"><p>خطا در بارگذاری داشبورد</p></div>;
  }

  const statCards = [
    { icon: Users, value: stats.activeStudents, label: 'دانش‌آموزان فعال', color: '#2563EB' },
    { icon: GraduationCap, value: stats.teachers, label: 'مدرس‌ها', color: '#10B981' },
    { icon: TrendingUp, value: stats.newLeads, label: 'سرنخ‌های جدید', color: '#F59E0B' },
    { icon: UserPlus, value: stats.newRegistrations, label: 'ثبت‌نام‌های جدید', color: '#8B5CF6' },
    { icon: Wallet, value: stats.monthRevenue, label: 'درآمد ماه', color: '#059669', suffix: 'تومان' },
    { icon: AlertTriangle, value: stats.totalDebt, label: 'بدهی‌ها', color: '#EF4444', suffix: 'تومان' },
    { icon: CalendarDays, value: stats.todayClasses, label: 'کلاس‌های امروز', color: '#2563EB' },
    { icon: CheckCircle2, value: stats.freeCapacity, label: 'ظرفیت خالی', color: '#0EA5E9' },
    { icon: AlertTriangle, value: stats.todayAbsences, label: 'غیبت‌های امروز', color: '#EF4444' },
    { icon: AlertTriangle, value: stats.atRiskCount, label: 'در معرض ریزش', color: '#F59E0B' },
  ];

  return (
    <div className="academy-admin-layout" dir="rtl">
      <div className="academy-admin-overlay" onClick={() => document.querySelector('.academy-admin-sidebar')?.classList.remove('open')} />
      <aside className="academy-admin-sidebar">
        <div className="academy-admin-sidebar-inner">
          <div className="academy-admin-sidebar-brand">
            <span className="academy-admin-sidebar-logo">دنیای</span>
            <span className="academy-admin-sidebar-logo-alt"> الگوریتم</span>
          </div>
          <nav className="academy-admin-sidebar-nav">
            {adminNavItems.map((item) => (
              <button key={item.label} type="button" className={item.active ? 'active' : ''} onClick={() => router.push(item.href)}>
                <item.icon /> <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="academy-admin-sidebar-support">
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> تماس با پشتیبانی</button>
          </div>
        </div>
      </aside>

      <div className="academy-admin-main">
        <header className="academy-admin-header">
          <div className="academy-admin-header-right">
            <button type="button" className="academy-admin-burger" onClick={() => document.querySelector('.academy-admin-sidebar')?.classList.add('open')} aria-label="منو"><Menu /></button>
            <div className="academy-admin-date-box">{jalaliDay(new Date().toISOString())}</div>
          </div>
          <div className="academy-admin-header-left">
            <button type="button" aria-label="جستجو"><Search /></button>
            <button type="button" aria-label="اعلان‌ها"><Bell /></button>
            <div className="academy-admin-header-profile">
              <div className="academy-admin-header-avatar">{user.firstName.slice(0, 1)}</div>
              <div>
                <strong>{user.firstName} {user.lastName}</strong>
                <small>مدیر آموزشگاه</small>
              </div>
              <button type="button" onClick={logout} aria-label="خروج"><LogOut /></button>
            </div>
          </div>
        </header>

        <div className="academy-admin-scroll">
          <section className="academy-admin-stat-grid">
            {statCards.map((card) => (
              <div key={card.label} className="academy-admin-stat-card">
                <span className="academy-admin-stat-icon" style={{ background: `${card.color}1A`, color: card.color }}><card.icon /></span>
                <div>
                  <strong>{card.value.toLocaleString('fa-IR')}</strong>
                  <small>{card.label}</small>
                </div>
              </div>
            ))}
          </section>

          <section className="academy-admin-list-grid">
            <div className="academy-admin-list-card">
              <div className="academy-admin-list-heading">
                <h2>کلاس‌های امروز</h2>
              </div>
              {todayClasses.length === 0 ? (
                <div className="academy-admin-list-empty"><CalendarDays /><p>امروز کلاسی برگزار نمی‌شود.</p></div>
              ) : (
                <div className="academy-admin-list-items">
                  {todayClasses.map((cls) => (
                    <div key={cls.id} className="academy-admin-list-item">
                      <span className="academy-admin-list-time">{timeOnly(cls.startsAt)}</span>
                      <div className="academy-admin-list-info">
                        <strong>{cls.title}</strong>
                        <small>{cls.room ? `کلاس: ${cls.room}` : 'بدون محل'}{cls.weekday ? ` · ${cls.weekday}` : ''}</small>
                      </div>
                      <span className="academy-admin-status-dot" style={{ background: cls.status === 'scheduled' ? '#10B981' : '#94A3B8' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="academy-admin-list-card">
              <div className="academy-admin-list-heading">
                <h2>دانش‌آموزان در معرض ریزش</h2>
              </div>
              {atRiskStudents.length === 0 ? (
                <div className="academy-admin-list-empty"><CheckCircle2 /><p>دانش‌آموز در معرض ریزش وجود ندارد.</p></div>
              ) : (
                <div className="academy-admin-list-items">
                  {atRiskStudents.map((s, i) => (
                    <div key={s.id} className="academy-admin-task-item">
                      <span className="academy-admin-task-count" style={{ background: '#EF44441A', color: '#EF4444' }}>{(i + 1).toLocaleString('fa-IR')}</span>
                      <div className="academy-admin-list-info">
                        <strong>{s.name}</strong>
                        <small>پیشرفت: {s.progress.toLocaleString('fa-IR')}٪</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="academy-admin-list-card">
              <div className="academy-admin-list-heading">
                <h2>سرنخ‌های اخیر</h2>
              </div>
              {recentLeads.length === 0 ? (
                <div className="academy-admin-list-empty"><TrendingUp /><p>سرنخ جدیدی وجود ندارد.</p></div>
              ) : (
                <div className="academy-admin-list-items">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="academy-admin-list-item">
                      <span className="academy-admin-list-time">{formatJalali(lead.createdAt)}</span>
                      <div className="academy-admin-list-info">
                        <strong>{lead.type === 'renewal' ? 'تمدید' : lead.type === 'enrollment' ? 'ثبت‌نام' : lead.type === 'class_change' ? 'تغییر کلاس' : 'لیست انتظار'}</strong>
                        <small>وضعیت: {lead.status === 'pending' ? 'در انتظار' : lead.status === 'approved' ? 'تأیید شده' : 'رد شده'}</small>
                      </div>
                      <span className="academy-admin-status-dot" style={{ background: lead.status === 'pending' ? '#F59E0B' : '#10B981' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="academy-admin-registrations">
            <div className="academy-admin-list-heading">
              <h2>ثبت‌نام‌های اخیر این ماه</h2>
            </div>
            {recentRegistrations.length === 0 ? (
              <div className="academy-admin-list-empty"><UserPlus /><p>ثبت‌نام جدیدی در این ماه وجود ندارد.</p></div>
            ) : (
              <div className="academy-admin-reg-grid">
                {recentRegistrations.map((reg) => (
                  <div key={reg.id} className="academy-admin-reg-card">
                    <span className="academy-admin-reg-dot" />
                    <strong>{reg.name}</strong>
                    <small>{formatJalali(reg.createdAt)}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
