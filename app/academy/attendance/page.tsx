'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  CalendarDays,
  CheckCircle,
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
  X,
  Clock,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type UserInfo = { firstName: string; lastName: string; avatarUrl?: string | null };
type ClassInfo = { title: string; level: string | null; status: string; schedule: string | null };
type Stats = { total: number; present: number; absent: number; late: number; attendanceRate: number };
type SessionRow = {
  id: string;
  date: string;
  day: string;
  status: 'present' | 'absent' | 'late';
  lateMinutes: number | null;
  note: string | null;
};

const navItems = [
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/classes', active: false },
  { label: 'تکالیف', icon: ClipboardList, href: '/academy/classes', active: false },
  { label: 'برنامه هفتگی', icon: CalendarDays, href: '/academy/classes', active: false },
  { label: 'حضور و غیاب', icon: CheckCircle, href: '/academy/attendance', active: true },
  { label: 'نمرات و پیشرفت', icon: GraduationCap, href: '/academy/education-record', active: false },
  { label: 'پیام‌ها', icon: MessageSquare, href: '/academy/classes', active: false },
  { label: 'فایل‌ها', icon: Folder, href: '/academy/classes', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/classes', active: false },
  { label: 'پروفایل من', icon: User, href: '/academy/classes', active: false },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes', active: false },
];

function jalaliDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}

const faNum = (n: number) => n.toLocaleString('fa-IR');

const STATUS_LABEL: Record<string, string> = { present: 'حاضر', absent: 'غایب', late: 'تأخیر' };

export default function AttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/attendance', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setClassInfo(data.classInfo);
        setStats(data.stats);
        setSessions(data.sessions || []);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return <div className="att-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user || !stats) {
    return <div className="att-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statCards = [
    { key: 'present', label: 'حاضر', value: stats.present, color: '#22C55E', icon: CheckCircle },
    { key: 'absent', label: 'غایب', value: stats.absent, color: '#EF4444', icon: X },
    { key: 'late', label: 'تأخیر', value: stats.late, color: '#F59E0B', icon: Clock },
    { key: 'total', label: 'کل جلسات', value: stats.total, color: '#2563EB', icon: BookOpen },
  ];

  return (
    <div className="att-layout" dir="rtl">
      {sidebarOpen && <div className="att-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`att-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="att-sidebar-inner">
          <div className="att-brand">
            <div className="att-avatar">{user.firstName.slice(0, 1)}</div>
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              <small>دانش‌آموز</small>
            </div>
          </div>

          <nav className="att-nav">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={item.active ? 'active' : ''}
                onClick={() => { router.push(item.href); setSidebarOpen(false); }}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="att-support">
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> پشتیبانی</button>
          </div>
        </div>
      </aside>

      <div className="att-main">
        <header className="att-header">
          <div className="att-header-right">
            <button type="button" className="att-burger" onClick={() => setSidebarOpen(true)} aria-label="منو">
              <Menu />
            </button>
            <div>
              <h1>حضور و غیاب من</h1>
              <p>وضعیت حضور شما در کلاس‌ها و جزئیات جلسات</p>
            </div>
          </div>
          <div className="att-header-left">
            <button type="button" aria-label="جستجو"><Search /></button>
            <button type="button" aria-label="اعلان‌ها" className="att-bell"><Bell /><span /></button>
            <div className="att-header-avatar">{user.firstName.slice(0, 1)}</div>
          </div>
        </header>

        <div className="att-scroll">
          <section className="att-hero">
            <div>
              <h2>حضور و غیاب</h2>
              <p>مدیریت حضور در کلاس‌ها</p>
            </div>
            <div className="att-hero-rate">
              <strong>{faNum(stats.attendanceRate)}%</strong>
              <span>درصد حضور</span>
            </div>
          </section>

          <section className="att-stat-cards">
            {statCards.map((card) => (
              <article key={card.key} className="att-stat-card">
                <span className="att-stat-bar" style={{ background: card.color }} />
                <div className="att-stat-body">
                  <span className="att-stat-label">{card.label}</span>
                  <strong className="att-stat-value" style={{ color: card.color }}>{faNum(card.value)} جلسه</strong>
                </div>
                <card.icon className="att-stat-icon" style={{ color: card.color }} />
              </article>
            ))}
          </section>

          <section className="att-table-section">
            <div className="att-table-header">
              <div>
                <h3>{classInfo?.title || 'کلاس فعال'}</h3>
                {classInfo?.schedule && <span className="att-class-schedule">{classInfo.schedule}</span>}
              </div>
              {classInfo && (
                <span className={`att-class-status ${classInfo.status === 'active' ? 'active' : 'inactive'}`}>
                  {classInfo.status === 'active' ? 'کلاس فعال' : 'غیرفعال'}
                </span>
              )}
            </div>

            <div className="att-table-divider" />

            {sessions.length === 0 ? (
              <div className="att-empty">
                <Calendar />
                <p>هنوز جلسه‌ای ثبت نشده است.</p>
              </div>
            ) : (
              <div className="att-table-wrap">
                <table className="att-table">
                  <thead>
                    <tr>
                      <th>تاریخ</th>
                      <th>روز</th>
                      <th>وضعیت</th>
                      <th>تأخیر (دقیقه)</th>
                      <th>توضیحات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr key={row.id}>
                        <td>{jalaliDate(row.date)}</td>
                        <td>{row.day}</td>
                        <td>
                          <span className={`att-badge ${row.status}`}>
                            {STATUS_LABEL[row.status]}
                          </span>
                        </td>
                        <td className={row.lateMinutes ? 'att-late' : 'att-dash'}>
                          {row.lateMinutes ? `${faNum(row.lateMinutes)} دقیقه` : '—'}
                        </td>
                        <td className={row.note ? 'att-note' : 'att-dash'}>
                          {row.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sessions.length > 0 && (
              <div className="att-table-footer">
                <a className="att-all-link" href="#">مشاهده همه جلسات</a>
                <div className="att-pager">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    aria-label="قبلی"
                  >
                    <ChevronRight />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={p === currentPage ? 'active' : ''}
                      onClick={() => setPage(p)}
                    >
                      {faNum(p)}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    aria-label="بعدی"
                  >
                    <ChevronLeft />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
