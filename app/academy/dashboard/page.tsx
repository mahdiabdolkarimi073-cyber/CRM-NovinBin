'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/dashboard', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
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

  const roleName = user.role === 'admin' ? 'مدیر آموزشگاه' : user.role === 'teacher' ? 'مدرس' : 'دانش‌آموز';

  return (
    <main className="academy-dashboard" dir="rtl">
      <header className="academy-dashboard-header">
        <Link href="/academy/dashboard" className="academy-dashboard-brand"><span>دنیای</span> الگوریتم</Link>
        <div className="academy-dashboard-user">
          <div className="academy-avatar">{user.firstName.slice(0, 1)}</div>
          <div>
            <strong>{user.firstName} {user.lastName}</strong>
            <small>{roleName}</small>
          </div>
          <button type="button" onClick={logout} aria-label="خروج"><LogOut /></button>
        </div>
      </header>

      <section className="academy-dashboard-hero">
        <Image
          src="/images/ChatGPT_Image_Aug_30,_2026,_02_50_26_PM.png"
          alt="داشبورد آموزشگاه"
          fill
          priority
          sizes="100vw"
          className="academy-hero-bg"
        />
        <div className="academy-hero-overlay" />
        <div className="academy-hero-content">
          <span className="academy-eyebrow">پنل آموزشگاه</span>
          <h1>سلام {user.firstName}، به داشبورد خوش آمدید</h1>
          <p>امروز وضعیت آموزش و فعالیت‌های خود را در یک نگاه دنبال کنید.</p>
        </div>
      </section>

      <section className="academy-dashboard-content">
        <div className="academy-stat-grid">
          <div className="academy-stat-card">
            <span><BookOpen /></span>
            <div><strong>{stats.activeCourses}</strong><small>دوره فعال</small></div>
          </div>
          <div className="academy-stat-card">
            <span><CalendarDays /></span>
            <div><strong>{stats.upcomingClasses}</strong><small>کلاس پیش‌رو</small></div>
          </div>
          <div className="academy-stat-card">
            <span><ClipboardList /></span>
            <div><strong>{stats.pendingAssignments}</strong><small>تکلیف باقی‌مانده</small></div>
          </div>
          <div className="academy-stat-card">
            <span><GraduationCap /></span>
            <div><strong>{stats.avgProgress}٪</strong><small>میانگین پیشرفت</small></div>
          </div>
        </div>

        {stats.unpaidBalance > 0 && (
          <div className="academy-balance-alert">
            <Wallet />
            <span>مبلغ باقی‌مانده شهریه شما: <b>{Number(stats.unpaidBalance).toLocaleString('fa-IR')} تومان</b></span>
          </div>
        )}

        <div className="academy-dashboard-grid">
          {/* My Courses */}
          <div className="academy-dashboard-card">
            <div className="academy-card-heading">
              <div>
                <h2>دوره‌های من</h2>
                <p>دوره‌های ثبت‌نام شده شما</p>
              </div>
              <BookOpen />
            </div>
            {courses.length === 0 ? (
              <div className="academy-empty">
                <BookOpen />
                <p>هنوز در دوره‌ای ثبت‌نام نکرده‌اید.</p>
              </div>
            ) : (
              <div className="academy-course-list">
                {courses.map((course) => (
                  <div key={course.id} className="academy-course-item">
                    <div className="academy-course-info">
                      <strong>{course.title}</strong>
                      <small>{course.teacherName ? `مدرس: ${course.teacherName}` : 'بدون مدرس'}{course.level ? ` · ${course.level}` : ''}</small>
                    </div>
                    <div className="academy-progress-wrap">
                      <div className="academy-progress-bar"><div style={{ width: `${course.progress}%` }} /></div>
                      <span>{course.progress}٪</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Classes */}
          <div className="academy-dashboard-card">
            <div className="academy-card-heading">
              <div>
                <h2>کلاس‌های پیش‌رو</h2>
                <p>برنامه کلاس‌های آینده</p>
              </div>
              <CalendarDays />
            </div>
            {upcoming.length === 0 ? (
              <div className="academy-empty">
                <CalendarDays />
                <p>کلاسی برای نمایش وجود ندارد.</p>
              </div>
            ) : (
              <div className="academy-class-list">
                {upcoming.map((cls) => (
                  <div key={cls.id} className="academy-class-item">
                    <div className="academy-class-icon"><Clock /></div>
                    <div className="academy-class-info">
                      <strong>{cls.title}</strong>
                      <small>{cls.teacherName ? `مدرس: ${cls.teacherName} · ` : ''}{formatJalali(cls.startsAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="academy-dashboard-card">
            <div className="academy-card-heading">
              <div>
                <h2>تکالیف</h2>
                <p>تکالیف در انتظار انجام</p>
              </div>
              <ClipboardList />
            </div>
            {assignments.length === 0 ? (
              <div className="academy-empty">
                <CheckCircle2 />
                <p>تکلیفی باقی نمانده است.</p>
              </div>
            ) : (
              <div className="academy-assignment-list">
                {assignments.map((a) => (
                  <div key={a.id} className="academy-assignment-item">
                    <div className={`academy-assignment-dot ${a.status === 'overdue' ? 'overdue' : ''}`} />
                    <div>
                      <strong>{a.title}</strong>
                      <small>مهلت: {formatJalali(a.dueDate)}</small>
                    </div>
                    {a.status === 'overdue' && <AlertTriangle className="academy-overdue-icon" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notices */}
          <div className="academy-dashboard-card">
            <div className="academy-card-heading">
              <div>
                <h2>اعلان‌ها</h2>
                <p>آخرین اخبار و اطلاعیه‌ها</p>
              </div>
              <Bell />
            </div>
            {notices.length === 0 ? (
              <div className="academy-empty">
                <Bell />
                <p>اعلانی وجود ندارد.</p>
              </div>
            ) : (
              <div className="academy-notice-list">
                {notices.map((n) => (
                  <div key={n.id} className={`academy-notice-item ${!n.read ? 'unread' : ''}`}>
                    <div className={`academy-notice-dot ${n.type}`} />
                    <div>
                      <strong>{n.title}</strong>
                      {n.body && <p>{n.body}</p>}
                      <small>{formatJalali(n.createdAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
