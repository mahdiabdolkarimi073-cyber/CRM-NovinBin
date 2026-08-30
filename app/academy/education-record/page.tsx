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
  UserPlus,
  Settings,
  LifeBuoy,
  Menu,
  Search,
  Bell,
  Star,
  TrendingUp,
  Target,
  Award,
  FileText,
  Loader2,
  Phone,
  ArrowLeft,
} from 'lucide-react';

type User = { firstName: string; lastName: string; avatarUrl?: string | null; role: string };
type GradeRow = { label: string; score: number };
type RecordData = {
  currentLevel: string;
  currentLevelName: string | null;
  levelStartDate: string | null;
  placementResult: string;
  placementDate: string | null;
  targetLevel: string;
  targetLevelName: string | null;
  progressPercent: number;
  teacherRating: number;
  teacherComment: string | null;
  nextCourseTitle: string | null;
  nextCourseReasons: string[];
};
type ActiveCourse = { title: string; teacherName: string | null; level: string | null; progress: number };

const navItems = [
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/classes' },
  { label: 'تکالیف', icon: ClipboardList, href: '/academy/classes' },
  { label: 'برنامه هفتگی', icon: CalendarDays, href: '/academy/classes' },
  { label: 'حضور و غیاب', icon: CheckCircle, href: '/academy/attendance' },
  { label: 'نمرات و پیشرفت', icon: GraduationCap, href: '/academy/education-record', active: true },
  { label: 'پیام‌ها', icon: MessageSquare, href: '/academy/classes' },
  { label: 'فایل‌ها', icon: Folder, href: '/academy/classes' },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance' },
  { label: 'ثبت‌نام / تمدید', icon: UserPlus, href: '/academy/registration' },
  { label: 'پروفایل من', icon: User, href: '/academy/classes' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes' },
];

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75;
  const rounded = rating - full >= 0.75 ? full + 1 : full;
  for (let i = 0; i < 5; i++) {
    if (i < rounded) {
      stars.push(<Star key={i} className="edu-star full" />);
    } else if (i === rounded && hasHalf) {
      stars.push(
        <span key={i} className="edu-star-half-wrap">
          <Star className="edu-star empty" />
          <span className="edu-star-half">
            <Star />
          </span>
        </span>,
      );
    } else {
      stars.push(<Star key={i} className="edu-star empty" />);
    }
  }
  return stars;
}

export default function EducationRecordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [activeCourse, setActiveCourse] = useState<ActiveCourse | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [averageGrade, setAverageGrade] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/education-record', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setRecord(data.record);
        setActiveCourse(data.activeCourse);
        setGrades(data.grades || []);
        setAverageGrade(data.averageGrade || 0);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return <div className="edu-record-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user) {
    return <div className="edu-record-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  const currentLevel = record?.currentLevel || 'B2';
  const currentLevelName = record?.currentLevelName || 'Upper Intermediate';
  const targetLevel = record?.targetLevel || 'C1';
  const targetLevelName = record?.targetLevelName || 'Advanced';
  const progress = record?.progressPercent ?? 0;
  const teacherRating = record?.teacherRating || 0;
  const teacherComment = record?.teacherComment || '';
  const nextCourseTitle = record?.nextCourseTitle || 'English C1 Advanced';
  const nextReasons = record?.nextCourseReasons?.length
    ? record.nextCourseReasons
    : [
        'سطح علمی شما برای این دوره مناسب است',
        'با هدف شما (C1) همخوانی دارد',
        'بر اساس عملکرد و پیشرفت شما',
        'بیشترین نرخ موفقیت در بین دانش‌آموزان',
      ];

  const gradesRows = grades.length
    ? grades
    : [
        { label: 'Quiz 1', score: 100 },
        { label: 'Quiz 2', score: 90 },
        { label: 'Final Project', score: 88 },
      ];
  const avg = averageGrade || (gradesRows.length
    ? Math.round((gradesRows.reduce((s, g) => s + g.score, 0) / gradesRows.length) * 10) / 10
    : 0);

  return (
    <div className="edu-record-layout" dir="rtl">
      {sidebarOpen && <div className="edu-record-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`edu-record-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="edu-record-sidebar-inner">
          <div className="edu-record-brand">
            <div className="edu-record-avatar">{user.firstName.slice(0, 1)}</div>
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              <small>دانش‌آموز</small>
            </div>
          </div>

          <nav className="edu-record-nav">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={item.active ? 'active' : ''}
                onClick={() => router.push(item.href)}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="edu-record-support">
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> پشتیبانی</button>
          </div>
        </div>
      </aside>

      <div className="edu-record-main">
        <header className="edu-record-header">
          <div className="edu-record-header-right">
            <button type="button" className="edu-record-burger" onClick={() => setSidebarOpen(true)} aria-label="منو">
              <Menu />
            </button>
            <div>
              <h1>پرونده آموزشی من</h1>
              <p>گزارش کامل از وضعیت یادگیری و پیشرفت شما</p>
            </div>
          </div>
          <div className="edu-record-header-left">
            <button type="button" aria-label="جستجو"><Search /></button>
            <button type="button" aria-label="اعلان‌ها" className="edu-record-bell"><Bell /><span /></button>
            <div className="edu-record-header-avatar">{user.firstName.slice(0, 1)}</div>
          </div>
        </header>

        <div className="edu-record-scroll">
          <section className="edu-record-hero">
            <div>
              <h2>پرونده آموزشی</h2>
              <p>مسیر پیشرفت از سطح {currentLevel} به {targetLevel}</p>
            </div>
            <div className="edu-record-hero-level">
              <strong>{currentLevel}</strong>
              <span>{currentLevelName}</span>
            </div>
          </section>

          <section className="edu-record-cards">
            <article className="edu-level-card">
              <span className="edu-card-label">سطح فعلی</span>
              <div className="edu-card-value-row">
                <strong className="edu-card-value">{currentLevel}</strong>
                <span className="edu-status-badge active">فعال</span>
              </div>
              <span className="edu-card-sub">{currentLevelName}</span>
              <span className="edu-card-date">از تاریخ {jalaliDate(record?.levelStartDate ?? null)}</span>
            </article>

            <article className="edu-level-card">
              <span className="edu-card-label">نتیجه تعیین سطح</span>
              <strong className="edu-card-value">{record?.placementResult || currentLevel}</strong>
              <span className="edu-card-date">تاریخ آزمون: {jalaliDate(record?.placementDate ?? null)}</span>
              <a className="edu-card-link" href="#">مشاهده جزئیات آزمون</a>
            </article>

            <article className="edu-level-card">
              <span className="edu-card-label">سطح هدف</span>
              <div className="edu-card-value-row">
                <strong className="edu-card-value">{targetLevel}</strong>
                <span className="edu-status-badge target">در حال هدف</span>
              </div>
              <span className="edu-card-sub">{targetLevelName}</span>
            </article>

            <article className="edu-level-card">
              <span className="edu-card-label">میزان پیشرفت</span>
              <strong className="edu-card-value progress">{progress}%</strong>
              <span className="edu-card-sub">در مسیر رسیدن به سطح هدف</span>
              <div className="edu-progress-bar">
                <div style={{ width: `${progress}%` }} />
              </div>
              <a className="edu-card-link" href="#">مشاهده گزارش کامل</a>
            </article>
          </section>

          <section className="edu-record-row2">
            <div className="edu-panel">
              <h3>نمرات من</h3>
              <div className="edu-grades-table">
                <div className="edu-grades-head">
                  <span>نمره</span>
                  <span>نتایج</span>
                </div>
                {gradesRows.map((g, i) => (
                  <div key={i} className="edu-grades-row">
                    <span>{g.label}</span>
                    <strong>{g.score}</strong>
                  </div>
                ))}
                <div className="edu-grades-row avg">
                  <span>میانگین کل</span>
                  <strong>{avg}</strong>
                </div>
              </div>
            </div>

            <div className="edu-panel">
              <h3>ارزیابی مدرس</h3>
              <div className="edu-rating-row">
                <strong className="edu-rating-score">{teacherRating.toFixed(1)}</strong>
                <div className="edu-stars">{renderStars(teacherRating)}</div>
              </div>
              <p className="edu-teacher-comment">{teacherComment || 'نظری ثبت نشده است.'}</p>
              <a className="edu-card-link" href="#">مشاهده همه ارزیابی‌ها</a>
            </div>
          </section>

          <section className="edu-next-course">
            <div className="edu-next-left">
              <h3>پیشنهاد دوره بعد</h3>
              <p className="edu-next-subtitle">{nextCourseTitle}</p>
              <ul className="edu-next-reasons">
                {nextReasons.map((reason, i) => (
                  <li key={i}><CheckCircle /> <span>{reason}</span></li>
                ))}
              </ul>
            </div>
            <div className="edu-next-right">
              <button type="button" className="edu-next-primary">مشاهده جزئیات و ثبت‌نام</button>
              <div className="edu-next-support">
                <span>نیاز به کمک دارید؟</span>
                <a href="#">با پشتیبانی در ارتباط باشید</a>
              </div>
              <button type="button" className="edu-next-secondary"><Phone /> تماس با پشتیبانی</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
