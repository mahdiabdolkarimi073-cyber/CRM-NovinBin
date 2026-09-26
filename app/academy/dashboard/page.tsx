'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Loader2,
  LogOut,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Menu,
  Users,
  UserRound,
  CheckSquare,
  Settings,
  LifeBuoy,
  Search,
  Home,
  ClipboardCheck,
  BarChart3,
  Folder,
  Headphones,
  Code2,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { StudentShell } from '@/components/academy/student-shell';

type Stats = {
  activeCourses: number;
  upcomingClasses: number;
  pendingAssignments: number;
  avgProgress: number;
  unpaidBalance: number;
};
type Course = { id: string; title: string; teacherName: string | null; level: string | null; imageUrl: string | null; price: number; progress: number; status: string };
type UpcomingClass = { id: string; title: string; teacherName: string | null; startsAt: string; durationMin: number };
type Assignment = { id: string; title: string; description: string | null; dueDate: string | null; status: string };
type Notice = { id: string; title: string; body: string | null; type: string; read: boolean; createdAt: string };
type User = { firstName: string; lastName: string; username: string; role: string; email?: string | null; phone?: string | null; avatarUrl?: string | null };
type TeacherSession = { id: string; title: string; courseId: string | null; startsAt: string; durationMin: number; weekday: string | null; room: string | null; status: string; attendanceNote: string | null };
type TeacherData = { todayClasses: number; studentCount: number; recentAbsences: number; pendingTasks: number; };
type TeacherClass = { id: string; title: string; level: string | null; teacherName: string | null; studentCount: number };

function formatJalali(date: string | null) {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString('fa-IR');
  }
}

export default function AcademyDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dashboardType, setDashboardType] = useState<'student' | 'teacher'>('student');
  const [teacherStats, setTeacherStats] = useState<TeacherData | null>(null);
  const [todayClasses, setTodayClasses] = useState<TeacherSession[]>([]);
  const [nextClass, setNextClass] = useState<TeacherSession | null>(null);
  const [recentAbsences, setRecentAbsences] = useState<TeacherSession[]>([]);
  const [pendingTasks, setPendingTasks] = useState<{ id: string; title: string; dueDate: string | null; status: string }[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<TeacherSession[]>([]);
  const [myClasses, setMyClasses] = useState<TeacherClass[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/dashboard', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        if (data.dashboardType === 'admin') {
          router.replace('/academy/admin-dashboard');
          return;
        }
        setDashboardType(data.dashboardType === 'teacher' ? 'teacher' : 'student');
        if (data.dashboardType === 'teacher') {
          setTeacherStats(data.stats);
          setTodayClasses(data.todayClasses || []);
          setNextClass(data.nextClass || null);
          setRecentAbsences(data.recentAbsences || []);
          setPendingTasks(data.pendingTasks || []);
          setWeeklySchedule(data.weeklySchedule || []);
          setMyClasses(data.myClasses || []);
        }
        setStats(data.stats);
        setCourses(data.courses || []);
        setUpcoming(data.upcomingClasses || []);
        setAssignments(data.assignments || []);
        setNotices(data.notices || []);
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
    return <div className="student-shell-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (error || !user || !stats) {
    return <div className="student-shell-loading"><p>خطا در بارگذاری داشبورد</p></div>;
  }

  if (dashboardType === 'teacher' && teacherStats) {
    return <TeacherDashboard user={user} stats={teacherStats} todayClasses={todayClasses} nextClass={nextClass} recentAbsences={recentAbsences} pendingTasks={pendingTasks} weeklySchedule={weeklySchedule} myClasses={myClasses} logout={logout} />;
  }

  return <StudentDashboard user={user} stats={stats} courses={courses} upcoming={upcoming} assignments={assignments} notices={notices} logout={logout} />;
}

function StudentDashboard({
  user, stats, courses, upcoming, assignments, notices, logout,
}: {
  user: User;
  stats: Stats;
  courses: Course[];
  upcoming: UpcomingClass[];
  assignments: Assignment[];
  notices: Notice[];
  logout: () => void;
}) {
  const progress = Math.max(0, Math.min(100, stats.avgProgress));
  const firstCourse = courses[0];
  const firstAssignment = assignments[0];

  const statCards = [
    { label: 'وضعیت حساب', value: stats.unpaidBalance > 0 ? stats.unpaidBalance.toLocaleString('fa-IR') : 'تسویه', sub: stats.unpaidBalance > 0 ? 'تومان' : 'حساب شما', icon: Wallet, color: '#2563EB', bg: '#EFF6FF', link: '/academy/finance', linkLabel: 'مشاهده جزئیات مالی' },
    { label: 'تکالیف انجام‌نشده', value: stats.pendingAssignments.toLocaleString('fa-IR'), sub: 'تکلیف', icon: ClipboardList, color: '#F59E0B', bg: '#FEF3C7', link: '/academy/classes', linkLabel: 'مشاهده تکالیف' },
    { label: 'کلاس بعدی', value: upcoming[0] ? upcoming[0].title : 'کلاسی ندارید', sub: upcoming[0] ? formatJalali(upcoming[0].startsAt) : '—', icon: CalendarDays, color: '#10B981', bg: '#ECFDF5', link: '/academy/classes', linkLabel: 'مشاهده برنامه' },
    { label: 'میانگین پیشرفت', value: `${progress.toLocaleString('fa-IR')}٪`, sub: 'نسبت به ماه قبل', icon: TrendingUp, color: '#8B5CF6', bg: '#F5F3FF', link: '/academy/education-record', linkLabel: 'گزارش پیشرفت' },
  ];

  return (
    <StudentShell
      user={user}
      activePath="/academy/dashboard"
      pageTitle="داشبورد"
      pageSubtitle="خلاصه وضعیت آموزشی و مالی شما"
      noticeCount={notices.length}
      onLogout={logout}
    >
      <section className="student-page-hero">
        <div>
          <h2>سلام {user.firstName} {user.lastName}</h2>
          <p>به پنل آموزشگاه خوش آمدید</p>
        </div>
        <div className="student-page-hero-badge">
          <strong>{stats.activeCourses.toLocaleString('fa-IR')}</strong>
          <span>دوره فعال</span>
        </div>
      </section>

      <section className="student-page-stats">
        {statCards.map((s, i) => (
          <div key={i} className="student-page-stat-card">
            <span className="student-page-stat-icon" style={{ background: s.bg, color: s.color }}><s.icon /></span>
            <div className="student-page-stat-body">
              <span className="student-page-stat-label">{s.label}</span>
              <strong className="student-page-stat-value" style={{ fontSize: s.value.length > 10 ? 16 : 22 }}>{s.value}</strong>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>{s.sub}</span>
              <Link href={s.link} style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none', fontWeight: 500, marginTop: 4 }}>{s.linkLabel}</Link>
            </div>
          </div>
        ))}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <section className="student-page-panel" style={{ marginBottom: 0 }}>
          <div className="student-page-panel-heading">
            <div><h3>جلسات آتی</h3><p>کلاس‌ها و برنامه پیش‌روی شما</p></div>
            <Link href="/academy/classes" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>مشاهده همه</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="student-page-empty"><CalendarDays /><p>جلسه‌ای برای نمایش وجود ندارد.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.slice(0, 4).map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, background: '#EFF6FF', color: '#2563EB', flexShrink: 0 }}>
                    <Code2 style={{ width: 18, height: 18 }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', display: 'block' }}>{item.title}</strong>
                    <small style={{ fontSize: 12, color: '#64748B' }}>{item.teacherName || 'مدرس مشخص نشده'} · {formatJalali(item.startsAt)}</small>
                  </div>
                  <time style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', whiteSpace: 'nowrap' }}>
                    {new Date(item.startsAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="student-page-panel" style={{ marginBottom: 0 }}>
          <div className="student-page-panel-heading">
            <div><h3>دوره‌های من</h3><p>پیشرفت دوره‌های ثبت‌نام‌شده</p></div>
            <Link href="/academy/classes" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>مشاهده همه</Link>
          </div>
          {courses.length === 0 ? (
            <div className="student-page-empty"><BookOpen /><p>هنوز دوره‌ای ندارید.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {courses.slice(0, 3).map((course, index) => (
                <div key={course.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, background: ['#EFF6FF', '#ECFDF5', '#F5F3FF'][index % 3], color: ['#2563EB', '#10B981', '#8B5CF6'][index % 3], flexShrink: 0 }}>
                    <Code2 style={{ width: 18, height: 18 }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', display: 'block' }}>{course.title}</strong>
                    <small style={{ fontSize: 12, color: '#64748B' }}>{course.teacherName || 'مدرس مشخص نشده'}</small>
                    <div style={{ width: '100%', height: 5, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ width: `${course.progress}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#2563EB,#1D4ED8)' }} />
                    </div>
                  </div>
                  <b style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>{course.progress.toLocaleString('fa-IR')}٪</b>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section className="student-page-panel" style={{ marginBottom: 0 }}>
          <div className="student-page-panel-heading">
            <div><h3>فعالیت‌های اخیر</h3><p>آخرین فعالیت‌های ثبت‌شده شما</p></div>
            <Link href="/academy/education-record" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>مشاهده همه</Link>
          </div>
          <div className="student-page-table-wrap">
            <table className="student-page-table">
              <thead>
                <tr><th>موضوع</th><th>دوره</th><th>تاریخ</th><th>وضعیت</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>آخرین تکلیف ثبت‌شده</strong></td>
                  <td>{firstAssignment?.title || 'فعالیت آموزشی'}</td>
                  <td>{formatJalali(firstAssignment?.dueDate || null)}</td>
                  <td><span className="student-page-badge pending">در انتظار انجام</span></td>
                </tr>
                <tr>
                  <td><strong>پیشرفت دوره</strong></td>
                  <td>{firstCourse?.title || 'دوره آموزشی'}</td>
                  <td>امروز</td>
                  <td><span className="student-page-badge present">در حال پیشرفت</span></td>
                </tr>
                <tr>
                  <td><strong>حضور در کلاس</strong></td>
                  <td>{firstCourse?.title || 'کلاس آموزشی'}</td>
                  <td>اخیراً</td>
                  <td><span className="student-page-badge present">حاضر</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="student-page-panel" style={{ marginBottom: 0 }}>
          <div className="student-page-panel-heading">
            <div><h3>یادداشت‌ها و اطلاعیه‌ها</h3><p>آخرین اطلاعیه‌های آموزشگاه</p></div>
            <Bell style={{ width: 20, height: 20, color: '#94A3B8' }} />
          </div>
          {notices.length === 0 ? (
            <div className="student-page-empty"><Bell /><p>اطلاعیه‌ای وجود ندارد.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notices.slice(0, 3).map((notice, index) => (
                <div key={notice.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: ['#EFF6FF', '#ECFDF5', '#FEF3C7'][index % 3], color: ['#2563EB', '#10B981', '#F59E0B'][index % 3], flexShrink: 0 }}>
                    {index === 0 ? <Bell style={{ width: 16, height: 16 }} /> : index === 1 ? <ClipboardCheck style={{ width: 16, height: 16 }} /> : <CalendarDays style={{ width: 16, height: 16 }} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', display: 'block' }}>{notice.title}</strong>
                    <small style={{ fontSize: 12, color: '#64748B', display: 'block', marginTop: 2 }}>{notice.body || formatJalali(notice.createdAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentShell>
  );
}

const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function timeOnly(iso: string) {
  try { return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }); }
}
function todayName() {
  const jsDay = new Date().getDay();
  return weekDays[(jsDay + 1) % 7];
}
function jalaliDay(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}

const teacherNavItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/dashboard', active: true },
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/teacher-classes', active: false },
  { label: 'حضور و غیاب', icon: CheckSquare, href: '/academy/teacher-attendance', active: false },
  { label: 'نمرات هنرجوان', icon: GraduationCap, href: '/academy/teacher-grades', active: false },
  { label: 'ارزیابی مدرس', icon: ClipboardList, href: '/academy/teacher-evaluation', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/teacher-finance', active: false },
  { label: 'پروفایل', icon: UserRound, href: '/academy/teacher-profile', active: false },
];

function TeacherDashboard({
  user, stats, todayClasses, nextClass, recentAbsences, pendingTasks, weeklySchedule, myClasses, logout,
}: {
  user: User;
  stats: TeacherData;
  todayClasses: TeacherSession[];
  nextClass: TeacherSession | null;
  recentAbsences: TeacherSession[];
  pendingTasks: { id: string; title: string; dueDate: string | null; status: string }[];
  weeklySchedule: TeacherSession[];
  myClasses: TeacherClass[];
  logout: () => void;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const today = useMemo(() => todayName(), []);
  const weeklyByDay = useMemo(() => {
    const map = new Map<string, TeacherSession[]>();
    for (const item of weeklySchedule) {
      const day = item.weekday || '';
      const arr = map.get(day) || [];
      arr.push(item);
      map.set(day, arr);
    }
    return map;
  }, [weeklySchedule]);

  const statCards = [
    { icon: BookOpen, value: stats.todayClasses, label: 'کلاس‌های امروز', color: '#10B981' },
    { icon: Users, value: stats.studentCount, label: 'تعداد هنرجوان', color: '#2563EB' },
    { icon: AlertTriangle, value: stats.recentAbsences, label: 'غیبت‌های اخیر', color: '#EF4444' },
    { icon: ClipboardList, value: stats.pendingTasks, label: 'کارهای انجام‌نشده', color: '#F59E0B' },
  ];

  return (
    <div className="teacher-dashboard-layout" dir="rtl">
      {sidebarOpen && <div className="teacher-dashboard-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`teacher-dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="teacher-sidebar-inner">
          <div className="teacher-sidebar-brand">
            <span className="teacher-sidebar-logo">دنیای</span>
            <span className="teacher-sidebar-logo-alt"> الگوریتم</span>
          </div>
          <nav className="teacher-sidebar-nav">
            {teacherNavItems.map((item) => (
              <button key={item.label} type="button" className={item.active ? 'active' : ''} onClick={() => { router.push(item.href); setSidebarOpen(false); }}>
                <item.icon /> <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="teacher-sidebar-support">
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> تماس با پشتیبانی</button>
          </div>
        </div>
      </aside>

      <div className="teacher-dashboard-main">
        <header className="teacher-dashboard-header">
          <div className="teacher-header-right">
            <button type="button" className="teacher-burger" onClick={() => setSidebarOpen(true)} aria-label="منو"><Menu /></button>
            <div className="teacher-date-box">{jalaliDay(new Date().toISOString())}</div>
          </div>
          <div className="teacher-header-left">
            <button type="button" aria-label="جستجو"><Search /></button>
            <button type="button" aria-label="اعلان‌ها"><Bell /></button>
            <div className="teacher-header-profile">
              <div className="teacher-header-avatar">{user.firstName.slice(0, 1)}</div>
              <div>
                <strong>{user.firstName} {user.lastName}</strong>
                <small>مدرس</small>
              </div>
              <button type="button" onClick={logout} aria-label="خروج"><LogOut /></button>
            </div>
          </div>
        </header>

        <div className="teacher-dashboard-scroll">
          <section className="teacher-stat-grid">
            {statCards.map((card) => (
              <div key={card.label} className="teacher-stat-card">
                <span className="teacher-stat-icon" style={{ background: `${card.color}1A`, color: card.color }}><card.icon /></span>
                <div>
                  <strong>{card.value.toLocaleString('fa-IR')}</strong>
                  <small>{card.label}</small>
                </div>
                <Link href="/academy/classes" className="teacher-stat-link">مشاهده برنامه</Link>
              </div>
            ))}
          </section>

          <section className="teacher-list-grid">
            <div className="teacher-list-card">
              <div className="teacher-list-heading">
                <h2>کلاس‌های امروز</h2>
                <Link href="/academy/classes">مشاهده همه</Link>
              </div>
              {todayClasses.length === 0 ? (
                <div className="teacher-list-empty"><BookOpen /><p>امروز کلاسی ندارید.</p></div>
              ) : (
                <div className="teacher-list-items">
                  {todayClasses.map((cls) => (
                    <div key={cls.id} className="teacher-list-item">
                      <span className="teacher-list-time">{timeOnly(cls.startsAt)}</span>
                      <div className="teacher-list-info">
                        <strong>{cls.title}</strong>
                        <small>{cls.room ? `کلاس: ${cls.room}` : 'بدون محل'}{cls.weekday ? ` · ${cls.weekday}` : ''}</small>
                      </div>
                      <span className="teacher-status-dot" style={{ background: cls.status === 'scheduled' ? '#10B981' : '#94A3B8' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="teacher-list-card">
              <div className="teacher-list-heading">
                <h2>کلاس بعدی</h2>
              </div>
              {!nextClass ? (
                <div className="teacher-list-empty"><CalendarDays /><p>کلاس بعدی برنامه‌ریزی نشده است.</p></div>
              ) : (
                <div className="teacher-next-class">
                  <span className="teacher-next-time">{timeOnly(nextClass.startsAt)}</span>
                  <strong>{nextClass.title}</strong>
                  <small>{jalaliDay(nextClass.startsAt)}{nextClass.room ? ` · اتاق ${nextClass.room}` : ''}</small>
                </div>
              )}
              <div className="teacher-list-divider" />
              <div className="teacher-list-heading" style={{ marginBottom: 8 }}>
                <h2 style={{ fontSize: 14 }}>غیبت‌های اخیر</h2>
              </div>
              {recentAbsences.length === 0 ? (
                <div className="teacher-list-empty"><CheckCircle2 /><p>غیبتی ثبت نشده است.</p></div>
              ) : (
                <div className="teacher-list-items">
                  {recentAbsences.map((cls) => (
                    <div key={cls.id} className="teacher-list-item">
                      <span className="teacher-absence-count">{timeOnly(cls.startsAt)}</span>
                      <div className="teacher-list-info">
                        <strong>{cls.title}</strong>
                        <small>{jalaliDay(cls.startsAt)}</small>
                      </div>
                      <span className="teacher-status-dot" style={{ background: '#EF4444' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="teacher-list-card">
              <div className="teacher-list-heading">
                <h2>کارهای انجام‌نشده</h2>
              </div>
              {pendingTasks.length === 0 ? (
                <div className="teacher-list-empty"><CheckCircle2 /><p>همه کارها انجام شده است.</p></div>
              ) : (
                <div className="teacher-list-items">
                  {pendingTasks.map((task, i) => (
                    <div key={task.id} className="teacher-task-item">
                      <span className="teacher-task-count" style={{ background: task.status === 'overdue' ? '#EF44441A' : '#F59E0B1A', color: task.status === 'overdue' ? '#EF4444' : '#F59E0B' }}>{(i + 1).toLocaleString('fa-IR')}</span>
                      <div className="teacher-list-info">
                        <strong>{task.title}</strong>
                        <small>مهلت: {jalaliDay(task.dueDate)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="teacher-weekly">
            <div className="teacher-weekly-heading">
              <h2>برنامه هفتگی</h2>
            </div>
            <div className="teacher-weekly-grid">
              {weekDays.map((day) => {
                const items = weeklyByDay.get(day) || [];
                const isToday = day === today;
                return (
                  <div key={day} className={`teacher-weekly-col ${isToday ? 'today' : ''}`}>
                    <div className="teacher-weekly-day">{day}</div>
                    <div className="teacher-weekly-cell">
                      {items.length === 0 ? (
                        <span className="teacher-weekly-empty">—</span>
                      ) : (
                        items.slice(0, 4).map((item) => (
                          <div key={item.id} className="teacher-weekly-item">
                            <span className="teacher-weekly-item-time">{timeOnly(item.startsAt)}</span>
                            <strong>{item.title}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="teacher-my-classes">
            <div className="teacher-weekly-heading">
              <h2>کلاس‌های من</h2>
            </div>
            <div className="teacher-classes-grid">
              {myClasses.length === 0 ? (
                <div className="teacher-list-empty"><BookOpen /><p>هنوز کلاسی به شما اختصاص نیافته است.</p></div>
              ) : (
                myClasses.map((cls) => (
                  <div key={cls.id} className="teacher-class-card">
                    <span className="teacher-class-dot" />
                    <h3>{cls.title}</h3>
                    <p>{cls.level ? `سطح: ${cls.level}` : 'بدون سطح'} · {cls.studentCount.toLocaleString('fa-IR')} هنرجو</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
