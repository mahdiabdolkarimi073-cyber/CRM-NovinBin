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

type Stats = {
  activeCourses: number;
  upcomingClasses: number;
  pendingAssignments: number;
  avgProgress: number;
  unpaidBalance: number;
};
type Course = { id: string; title: string; teacherName: string | null; level: string | null; imageUrl: string | null; progress: number; status: string };
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
    return <div className="academy-dashboard-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (error || !user || !stats) {
    return <div className="academy-dashboard-loading"><p>خطا در بارگذاری داشبورد</p></div>;
  }

  if (dashboardType === 'teacher' && teacherStats) {
    return <TeacherDashboard user={user} stats={teacherStats} todayClasses={todayClasses} nextClass={nextClass} recentAbsences={recentAbsences} pendingTasks={pendingTasks} weeklySchedule={weeklySchedule} myClasses={myClasses} logout={logout} />;
  }

  return <StudentDashboard user={user} stats={stats} courses={courses} upcoming={upcoming} assignments={assignments} notices={notices} logout={logout} />;
}

const studentNavItems = [
  { label: 'داشبورد', icon: Home, href: '/academy/dashboard', active: true },
  { label: 'دوره‌های من', icon: BookOpen, href: '/academy/classes', active: false },
  { label: 'کلاس‌های من', icon: ClipboardCheck, href: '/academy/classes', active: false },
  { label: 'حضور و غیاب', icon: CheckCircle2, href: '/academy/attendance', active: false },
  { label: 'تمرین و پیشرفت', icon: BarChart3, href: '/academy/education-record', active: false },
  { label: 'مالی', icon: Wallet, href: '/academy/finance', active: false },
  { label: 'پیام‌ها', icon: Bell, href: '/academy/classes', active: false },
  { label: 'تکالیف', icon: ClipboardList, href: '/academy/classes', active: false },
  { label: 'فایل‌ها و منابع', icon: Folder, href: '/academy/classes', active: false },
  { label: 'پروفایل من', icon: UserRound, href: '/academy/classes', active: false },
  { label: 'پشتیبانی', icon: Headphones, href: '/academy/classes', active: false },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes', active: false },
];

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
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const progress = Math.max(0, Math.min(100, stats.avgProgress));
  const firstCourse = courses[0];
  const firstAssignment = assignments[0];

  return (
    <div className="student-dashboard" dir="rtl">
      {sidebarOpen && <div className="student-dashboard-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`student-dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="student-sidebar-inner">
          <div className="student-brand">
            <div className="student-brand-mark"><GraduationCap /></div>
            <div><strong>دنیای الگوریتم</strong><small>آموزش برای ساختن آینده</small></div>
          </div>
          <nav className="student-sidebar-nav">
            {studentNavItems.map((item) => (
              <button key={item.label} type="button" className={item.active ? 'active' : ''} onClick={() => { router.push(item.href); setSidebarOpen(false); }}>
                <item.icon /><span>{item.label}</span>
                {item.label === 'پیام‌ها' && notices.length > 0 && <b>{notices.length.toLocaleString('fa-IR')}</b>}
              </button>
            ))}
          </nav>
          <div className="student-support-card">
            <Headphones />
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button">تماس با پشتیبانی</button>
          </div>
        </div>
      </aside>

      <main className="student-dashboard-main">
        <header className="student-dashboard-header">
          <button type="button" className="student-menu-button" onClick={() => setSidebarOpen(true)} aria-label="منو"><Menu /></button>
          <div className="student-header-actions">
            <button type="button" aria-label="اعلان‌ها"><Bell /><span>{notices.length > 0 ? notices.length : ''}</span></button>
            <button type="button" aria-label="پیام‌ها"><MessageSquare /></button>
            <div className="student-profile">
              <div className="student-profile-avatar">{user.firstName.slice(0, 1)}</div>
              <div><strong>سلام {user.firstName} {user.lastName}</strong><small>به پنل آموزشگاه خوش آمدید</small></div>
            </div>
            <button type="button" className="student-logout" onClick={logout} aria-label="خروج"><LogOut /></button>
          </div>
        </header>

        <div className="student-dashboard-scroll">
          <section className="student-hero">
            <Image src="/images/ChatGPT_Image_Aug_30,_2026,_02_54_20_PM.png" alt="مسیر یادگیری" fill priority sizes="(max-width: 900px) 100vw, calc(100vw - 280px)" />
          </section>

          <section className="student-stat-grid">
            <article className="student-stat-card"><div className="student-stat-label">وضعیت حساب</div><div className="student-stat-value"><strong>{stats.unpaidBalance > 0 ? stats.unpaidBalance.toLocaleString('fa-IR') : 'تسویه'}</strong><small>{stats.unpaidBalance > 0 ? 'تومان' : 'حساب شما'}</small></div><Wallet /><Link href="/academy/finance">مشاهده جزئیات مالی</Link></article>
            <article className="student-stat-card"><div className="student-stat-label">تکالیف انجام‌نشده</div><div className="student-stat-value"><strong>{stats.pendingAssignments.toLocaleString('fa-IR')}</strong><small>تکلیف</small></div><ClipboardList /><Link href="/academy/classes">مشاهده تکالیف</Link></article>
            <article className="student-stat-card"><div className="student-stat-label">کلاس رو</div><div className="student-stat-value"><strong>{upcoming[0] ? upcoming[0].title : 'کلاسی ندارید'}</strong><small>{upcoming[0] ? formatJalali(upcoming[0].startsAt) : '—'}</small></div><CalendarDays /><Link href="/academy/classes">مشاهده برنامه کلاس‌ها</Link></article>
            <article className="student-stat-card student-progress-card"><div className="student-stat-label">میانگین پیشرفت</div><div className="student-progress-value"><strong>{progress.toLocaleString('fa-IR')}٪</strong><div className="student-mini-chart"><i /><i /><i /><i /><i /><i /><i /></div></div><span className="student-progress-note">نسبت به ماه قبل</span></article>
          </section>

          <section className="student-content-grid">
            <article className="student-panel student-schedule-panel"><div className="student-panel-heading"><div><h2>جلسات آتی</h2><p>کلاس‌ها و برنامه پیش‌روی شما</p></div><Link href="/academy/classes">مشاهده همه</Link></div>{upcoming.length === 0 ? <div className="student-empty"><CalendarDays /><p>جلسه‌ای برای نمایش وجود ندارد.</p></div> : upcoming.slice(0, 4).map((item) => <div className="student-schedule-row" key={item.id}><span className="student-schedule-icon"><Code2 /></span><div><strong>{item.title}</strong><small>{item.teacherName || 'مدرس مشخص نشده'} · {formatJalali(item.startsAt)}</small></div><time>{new Date(item.startsAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</time></div>)}</article>
            <article className="student-panel student-courses-panel"><div className="student-panel-heading"><div><h2>دوره‌های من</h2><p>پیشرفت دوره‌های ثبت‌نام‌شده</p></div><Link href="/academy/classes">مشاهده همه</Link></div>{courses.length === 0 ? <div className="student-empty"><BookOpen /><p>هنوز دوره‌ای ندارید.</p></div> : courses.slice(0, 3).map((course, index) => <div className="student-course-row" key={course.id}><span className={`student-course-icon course-${index}`}><Code2 /></span><div><strong>{course.title}</strong><small>{course.teacherName || 'مدرس مشخص نشده'}</small><div className="student-course-progress"><span style={{ width: `${course.progress}%` }} /></div></div><b>{course.progress.toLocaleString('fa-IR')}٪</b></div>)}</article>
            <article className="student-panel student-notices-panel"><div className="student-panel-heading"><div><h2>یادداشت‌ها و اطلاعیه‌ها</h2><p>آخرین اطلاعیه‌های آموزشگاه</p></div><Bell /></div>{notices.length === 0 ? <div className="student-empty"><Bell /><p>اطلاعیه‌ای وجود ندارد.</p></div> : notices.slice(0, 3).map((notice, index) => <div className={`student-notice-row notice-${index}`} key={notice.id}><span>{index === 0 ? <Bell /> : index === 1 ? <ClipboardCheck /> : <CalendarDays />}</span><div><strong>{notice.title}</strong><small>{notice.body || formatJalali(notice.createdAt)}</small></div></div>)}</article>
          </section>

          <section className="student-bottom-grid">
            <article className="student-panel student-activities-panel"><div className="student-panel-heading"><div><h2>فعالیت‌های اخیر</h2><p>آخرین فعالیت‌های ثبت‌شده شما</p></div><Link href="/academy/education-record">مشاهده همه فعالیت‌ها</Link></div><div className="student-activity-table"><div><span>موضوع</span><span>دوره</span><span>تاریخ</span><span>وضعیت</span></div><div><strong>آخرین تکلیف ثبت‌شده</strong><span>{firstAssignment?.title || 'فعالیت آموزشی'}</span><span>{formatJalali(firstAssignment?.dueDate || null)}</span><b>در انتظار انجام</b></div><div><strong>پیشرفت دوره</strong><span>{firstCourse?.title || 'دوره آموزشی'}</span><span>امروز</span><b className="success">در حال پیشرفت</b></div><div><strong>حضور در کلاس</strong><span>{firstCourse?.title || 'کلاس آموزشی'}</span><span>اخیراً</span><b className="success">حاضر</b></div></div></article>
            <article className="student-panel student-overall-panel"><div className="student-panel-heading"><div><h2>پیشرفت کلی</h2><p>نمایش وضعیت یادگیری شما</p></div><TrendingUp /></div><div className="student-donut" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress.toLocaleString('fa-IR')}٪</strong><small>پیشرفت کلی</small></div></div><Link href="/academy/education-record">گزارش کامل پیشرفت</Link></article>
          </section>
        </div>
      </main>
    </div>
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
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/classes', active: false },
  { label: 'حضور و غیاب', icon: CheckSquare, href: '/academy/attendance', active: false },
  { label: 'سوابق تحصیلی', icon: GraduationCap, href: '/academy/education-record', active: false },
  { label: 'ثبت‌نام', icon: ClipboardList, href: '/academy/registration', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance', active: false },
  { label: 'پروفایل', icon: UserRound, href: '/academy/classes', active: false },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes', active: false },
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
    { icon: Users, value: stats.studentCount, label: 'تعداد دانش‌آموزان', color: '#2563EB' },
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
                    <p>{cls.level ? `سطح: ${cls.level}` : 'بدون سطح'} · {cls.studentCount.toLocaleString('fa-IR')} دانش‌آموز</p>
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
