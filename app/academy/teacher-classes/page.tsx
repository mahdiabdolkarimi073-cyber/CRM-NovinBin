'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  GraduationCap,
  ClipboardList,
  Wallet,
  UserRound,
  Settings,
  LifeBuoy,
  Menu,
  Search,
  Bell,
  LogOut,
  Loader2,
  Users,
  Clock,
  MapPin,
  Link as LinkIcon,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';

type User = { firstName: string; lastName: string; username: string; role: string; avatarUrl?: string | null };
type Student = {
  id: string;
  fullName: string;
  phone: string | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
};
type ScheduleItem = { weekday: string; startsAt: string; time: string; durationMin: number };
type ClassItem = {
  id: string;
  title: string;
  code: string | null;
  level: string | null;
  description: string | null;
  room: string | null;
  onlineUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  studentCount: number;
  schedule: ScheduleItem[];
  students: Student[];
  attendance: { total: number; present: number; absent: number; late: number; rate: number };
};
type Stats = { totalClasses: number; totalStudents: number; totalSessions: number; avgAttendance: number };

const teacherNavItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/dashboard', active: false },
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/teacher-classes', active: true },
  { label: 'حضور و غیاب', icon: CheckSquare, href: '/academy/attendance', active: false },
  { label: 'سوابق تحصیلی', icon: GraduationCap, href: '/academy/education-record', active: false },
  { label: 'ثبت‌نام', icon: ClipboardList, href: '/academy/registration', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance', active: false },
  { label: 'پروفایل', icon: UserRound, href: '/academy/classes', active: false },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes', active: false },
];

function jalaliDay(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}
const faNum = (n: number) => n.toLocaleString('fa-IR');

export default function TeacherClassesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/teacher-classes', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setStats(data.stats);
        setClasses(data.classes || []);
        if (data.classes?.length === 1) setExpandedId(data.classes[0].id);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  const filteredClasses = useMemo(() => {
    if (!search.trim()) return classes;
    const q = search.trim();
    return classes.filter((c) =>
      c.title.includes(q) ||
      (c.code && c.code.includes(q)) ||
      (c.level && c.level.includes(q))
    );
  }, [classes, search]);

  if (loading) {
    return <div className="teacher-dashboard-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user || !stats) {
    return <div className="teacher-dashboard-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  const statCards = [
    { icon: BookOpen, value: stats.totalClasses, label: 'تعداد کلاس‌ها', color: '#10B981' },
    { icon: Users, value: stats.totalStudents, label: 'کل دانش‌آموزان', color: '#2563EB' },
    { icon: CalendarDays, value: stats.totalSessions, label: 'کل جلسات', color: '#F59E0B' },
    { icon: CheckCircle2, value: stats.avgAttendance, label: 'میانگین حضور', color: '#8B5CF6', suffix: '٪' },
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
          <section className="teacher-tc-hero">
            <div>
              <h2>کلاس‌های من</h2>
              <p>مدیریت کلاس‌ها، دانش‌آموزان و حضور و غیاب</p>
            </div>
            <div className="teacher-tc-search">
              <Search />
              <input
                type="text"
                placeholder="جستجوی کلاس..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </section>

          <section className="teacher-stat-grid">
            {statCards.map((card) => (
              <div key={card.label} className="teacher-stat-card">
                <span className="teacher-stat-icon" style={{ background: `${card.color}1A`, color: card.color }}><card.icon /></span>
                <div>
                  <strong>{faNum(card.value)}{card.suffix || ''}</strong>
                  <small>{card.label}</small>
                </div>
              </div>
            ))}
          </section>

          <section className="teacher-tc-classes">
            {filteredClasses.length === 0 ? (
              <div className="teacher-list-empty" style={{ padding: '48px 16px' }}>
                <BookOpen />
                <p>{search.trim() ? 'کلاسی با این مشخصات یافت نشد.' : 'هنوز کلاسی به شما تخصیص داده نشده است.'}</p>
              </div>
            ) : (
              <div className="teacher-tc-class-list">
                {filteredClasses.map((cls) => {
                  const isOpen = expandedId === cls.id;
                  return (
                    <article key={cls.id} className={`teacher-tc-class-card ${isOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="teacher-tc-class-header"
                        onClick={() => setExpandedId(isOpen ? null : cls.id)}
                      >
                        <div className="teacher-tc-class-title">
                          <span className="teacher-class-dot" />
                          <div>
                            <h3>{cls.title}</h3>
                            <div className="teacher-tc-class-meta">
                              {cls.level && <span><GraduationCap /> {cls.level}</span>}
                              {cls.schedule.length > 0 && (
                                <span><Clock /> {cls.schedule.map((s) => `${s.weekday} ${s.time}`).join('، ')}</span>
                              )}
                              {cls.room && <span><MapPin /> {cls.room}</span>}
                              <span><Users /> {faNum(cls.studentCount)} دانش‌آموز</span>
                            </div>
                          </div>
                        </div>
                        <div className="teacher-tc-class-right">
                          <div className="teacher-tc-attendance-badge" style={{
                            background: cls.attendance.rate >= 80 ? '#10B9811A' : cls.attendance.rate >= 60 ? '#F59E0B1A' : '#EF44441A',
                            color: cls.attendance.rate >= 80 ? '#10B981' : cls.attendance.rate >= 60 ? '#F59E0B' : '#EF4444',
                          }}>
                            {faNum(cls.attendance.rate)}٪ حضور
                          </div>
                          <ChevronDown className={`teacher-tc-chevron ${isOpen ? 'rotated' : ''}`} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="teacher-tc-class-body">
                          <div className="teacher-tc-class-info">
                            {cls.code && <div className="teacher-tc-info-chip"><span>کد کلاس</span><b>{cls.code}</b></div>}
                            {cls.startDate && <div className="teacher-tc-info-chip"><span>شروع</span><b>{jalaliDay(cls.startDate)}</b></div>}
                            {cls.endDate && <div className="teacher-tc-info-chip"><span>پایان</span><b>{jalaliDay(cls.endDate)}</b></div>}
                            {cls.onlineUrl && (
                              <a href={cls.onlineUrl} target="_blank" rel="noopener noreferrer" className="teacher-tc-online-link">
                                <LinkIcon /> ورود به کلاس آنلاین
                              </a>
                            )}
                          </div>

                          {cls.description && <p className="teacher-tc-desc">{cls.description}</p>}

                          <div className="teacher-tc-attendance-summary">
                            <div className="teacher-tc-att-item present"><CheckCircle2 /><strong>{faNum(cls.attendance.present)}</strong><span>حاضر</span></div>
                            <div className="teacher-tc-att-item absent"><X /><strong>{faNum(cls.attendance.absent)}</strong><span>غایب</span></div>
                            <div className="teacher-tc-att-item late"><AlertTriangle /><strong>{faNum(cls.attendance.late)}</strong><span>تأخیر</span></div>
                            <div className="teacher-tc-att-item total"><CalendarDays /><strong>{faNum(cls.attendance.total)}</strong><span>کل جلسات</span></div>
                          </div>

                          <div className="teacher-tc-students-section">
                            <div className="teacher-tc-students-heading">
                              <h4>دانش‌آموزان</h4>
                              <span>{faNum(cls.students.length)} نفر</span>
                            </div>
                            {cls.students.length === 0 ? (
                              <div className="teacher-list-empty"><Users /><p>دانش‌آموزی در این کلاس ثبت‌نام نکرده است.</p></div>
                            ) : (
                              <div className="teacher-tc-table-wrap">
                                <table className="teacher-tc-table">
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>نام دانش‌آموز</th>
                                      <th>تلفن</th>
                                      <th>حاضر</th>
                                      <th>غایب</th>
                                      <th>تأخیر</th>
                                      <th>درصد حضور</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cls.students.map((student, i) => (
                                      <tr key={student.id}>
                                        <td className="teacher-tc-row-num">{faNum(i + 1)}</td>
                                        <td className="teacher-tc-student-name">{student.fullName}</td>
                                        <td className="teacher-tc-student-phone">{student.phone || '—'}</td>
                                        <td><span className="teacher-tc-badge present">{faNum(student.presentCount)}</span></td>
                                        <td><span className="teacher-tc-badge absent">{faNum(student.absentCount)}</span></td>
                                        <td><span className="teacher-tc-badge late">{faNum(student.lateCount)}</span></td>
                                        <td>
                                          <div className="teacher-tc-rate-cell">
                                            <div className="teacher-tc-rate-bar">
                                              <div style={{ width: `${student.attendanceRate}%`, background: student.attendanceRate >= 80 ? '#10B981' : student.attendanceRate >= 60 ? '#F59E0B' : '#EF4444' }} />
                                            </div>
                                            <span>{faNum(student.attendanceRate)}٪</span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
