'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  MessageSquare,
  Folder,
  Wallet,
  User,
  Settings,
  LifeBuoy,
  Menu,
  Search,
  Bell,
  Plus,
  Clock,
  MapPin,
  Link as LinkIcon,
  X,
  Loader2,
  ChevronLeft,
} from 'lucide-react';

type ClassItem = {
  id: string;
  courseId: string;
  course: string;
  code: string | null;
  description: string | null;
  teacher: string | null;
  room: string | null;
  onlineUrl: string | null;
  heldSessions: number;
  totalSessions: number;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  schedule: { weekday: string; startsAt: string; durationMin: number; room: string | null; onlineUrl: string | null }[];
};
type WeeklyItem = { id: string; weekday: string; title: string; startsAt: string; durationMin: number; teacherName: string | null; room: string | null; onlineUrl: string | null };
type Stats = { activeClasses: number; todaySessions: number; incompleteAssignments: number; averageScore: number };
type User = { firstName: string; lastName: string; avatarUrl?: string | null };

const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function timeOnly(iso: string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  }
}
function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}
function todayName() {
  const jsDay = new Date().getDay();
  return weekDays[(jsDay + 1) % 7];
}

const navItems = [
  { label: 'کلاس‌های من', icon: BookOpen, active: true },
  { label: 'تکالیف', icon: ClipboardList },
  { label: 'برنامه هفتگی', icon: CalendarDays },
  { label: 'حضور و غیاب', icon: CheckCircle },
  { label: 'نمرات و پیشرفت', icon: GraduationCap },
  { label: 'پیام‌ها', icon: MessageSquare },
  { label: 'فایل‌ها', icon: Folder },
  { label: 'پرداخت‌ها', icon: Wallet },
  { label: 'پروفایل من', icon: User },
  { label: 'تنظیمات', icon: Settings },
];

function CheckCircle(props: any) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

export default function MyClassesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [weekly, setWeekly] = useState<WeeklyItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/classes', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setStats(data.stats);
        setClasses(data.classes || []);
        setWeekly(data.weeklySchedule || []);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  const today = useMemo(() => todayName(), []);
  const weeklyByDay = useMemo(() => {
    const map = new Map<string, WeeklyItem[]>();
    for (const item of weekly) {
      const arr = map.get(item.weekday) || [];
      arr.push(item);
      map.set(item.weekday, arr);
    }
    return map;
  }, [weekly]);

  if (loading) {
    return <div className="academy-classes-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (error || !user || !stats) {
    return <div className="academy-classes-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  return (
    <div className="academy-classes-layout" dir="rtl">
      {/* Sidebar overlay (tablet/mobile) */}
      {sidebarOpen && <div className="academy-classes-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`academy-classes-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="academy-classes-sidebar-inner">
          <div className="academy-classes-brand">
            <div className="academy-classes-avatar">{user.firstName.slice(0, 1)}</div>
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              <small>دانش‌آموز</small>
            </div>
          </div>

          <nav className="academy-classes-nav">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={item.active ? 'active' : ''}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="academy-classes-support">
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> پشتیبانی</button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="academy-classes-main">
        {/* Header */}
        <header className="academy-classes-header">
          <div className="academy-classes-header-right">
            <button type="button" className="academy-classes-burger" onClick={() => setSidebarOpen(true)} aria-label="منو">
              <Menu />
            </button>
            <div>
              <h1>کلاس‌های من</h1>
              <p>جزئیات دوره‌ها و کلاس‌های ثبت‌نام‌شده شما</p>
            </div>
          </div>
          <div className="academy-classes-header-left">
            <button type="button" aria-label="جستجو"><Search /></button>
            <button type="button" aria-label="اعلان‌ها" className="academy-classes-bell"><Bell /><span /></button>
            <div className="academy-classes-header-avatar">{user.firstName.slice(0, 1)}</div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="academy-classes-scroll">
          {/* Hero */}
          <section className="academy-classes-hero">
            <div>
              <h2>کلاس‌های من</h2>
              <p>مدیریت کلاس‌ها و دوره‌های آموزشی</p>
            </div>
            <div className="academy-classes-hero-right">
              <span>{stats.activeClasses} کلاس فعال</span>
              <button type="button"><Plus /> کلاس جدید</button>
            </div>
          </section>

          {/* Stats widgets */}
          <section className="academy-classes-widgets">
            <div className="academy-classes-widget"><BookOpen /><div><strong>{stats.activeClasses}</strong><small>کلاس‌های فعال</small></div></div>
            <div className="academy-classes-widget"><CalendarDays /><div><strong>{stats.todaySessions}</strong><small>جلسات امروز</small></div></div>
            <div className="academy-classes-widget"><ClipboardList /><div><strong>{stats.incompleteAssignments}</strong><small>تکالیف ناقص</small></div></div>
            <div className="academy-classes-widget"><GraduationCap /><div><strong>{stats.averageScore.toLocaleString('fa-IR')}</strong><small>معدل کل</small></div></div>
          </section>

          {/* Class cards */}
          <section className="academy-classes-cards">
            {classes.length === 0 ? (
              <div className="academy-classes-empty">
                <BookOpen />
                <p>هنوز در کلاسی ثبت‌نام نکرده‌اید.</p>
              </div>
            ) : (
              classes.map((cls) => (
                <article key={cls.id} className="academy-class-card">
                  <div className="academy-class-card-top">
                    <div>
                      <h3>{cls.course}</h3>
                      {cls.code && <span className="academy-class-code">{cls.code}</span>}
                    </div>
                  </div>
                  {cls.description && <p className="academy-class-desc">{cls.description}</p>}
                  <div className="academy-class-details">
                    {cls.teacher && <div className="academy-class-detail"><User /> <span>مدرس: {cls.teacher}</span></div>}
                    {cls.schedule.length > 0 && (
                      <div className="academy-class-detail">
                        <Clock />
                        <span>{cls.schedule.map((s) => s.weekday).join('، ')} | {cls.schedule.map((s) => timeOnly(s.startsAt)).join(' - ')}</span>
                      </div>
                    )}
                    {cls.room && <div className="academy-class-detail"><MapPin /> <span>اتاق: {cls.room}</span></div>}
                  </div>
                  <div className="academy-class-dates">
                    <span>شروع: {jalaliDate(cls.startDate)}</span>
                    <span>پایان: {jalaliDate(cls.endDate)}</span>
                  </div>
                  <div className="academy-class-progress">
                    <div className="academy-class-progress-bar"><div style={{ width: `${cls.progress}%` }} /></div>
                    <span>جلسه: {cls.heldSessions.toLocaleString('fa-IR')} / {cls.totalSessions.toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="academy-class-actions">
                    {cls.onlineUrl && (
                      <a href={cls.onlineUrl} target="_blank" rel="noopener noreferrer" className="academy-class-online">
                        <LinkIcon /> ورود به کلاس آنلاین
                      </a>
                    )}
                    <button type="button" className="academy-class-detail-btn">جزئیات</button>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* Weekly schedule */}
          <section className="academy-classes-weekly">
            <div className="academy-classes-weekly-heading">
              <h2>برنامه هفتگی من</h2>
              <p>برنامه کلاس‌های شما در طول هفته</p>
            </div>
            <div className="academy-classes-weekly-grid">
              {weekDays.slice(0, 6).map((day) => {
                const items = weeklyByDay.get(day) || [];
                const isToday = day === today;
                return (
                  <div key={day} className={`academy-classes-weekly-col ${isToday ? 'today' : ''}`}>
                    <div className="academy-classes-weekly-day">{day}</div>
                    <div className="academy-classes-weekly-cell">
                      {items.length === 0 ? (
                        <span className="academy-classes-weekly-empty">—</span>
                      ) : (
                        items.map((item) => (
                          <div key={item.id} className="academy-classes-weekly-item">
                            <strong>{item.title}</strong>
                            <small>{timeOnly(item.startsAt)}</small>
                            {item.room && <small>{item.room}</small>}
                            <span className="academy-classes-weekly-dot" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
