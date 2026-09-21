'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  GraduationCap,
  ClipboardList,
  Wallet,
  UserRound,
  LifeBuoy,
  Menu,
  Search,
  Bell,
  LogOut,
  Loader2,
  CheckCircle2,
  Clock,
  TrendingDown,
  CalendarDays,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';

type User = { id: string; firstName: string; lastName: string; username: string; avatarUrl?: string | null };
type Summary = { totalShare: number; paidShare: number; pendingShare: number; totalSettled: number; pendingSettlement: number };
type ShareItem = { id: string; courseTitle: string; percent: number; amount: number; status: string; createdAt: string };
type SettlementItem = { id: string; amount: number; period: string; status: string; settledAt: string | null; createdAt: string };

const teacherNavItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/dashboard', active: false },
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/teacher-classes', active: false },
  { label: 'حضور و غیاب', icon: CheckSquare, href: '/academy/teacher-attendance', active: false },
  { label: 'نمرات دانش‌آموزان', icon: GraduationCap, href: '/academy/teacher-grades', active: false },
  { label: 'ارزیابی مدرس', icon: ClipboardList, href: '/academy/teacher-evaluation', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/teacher-finance', active: true },
  { label: 'پروفایل', icon: UserRound, href: '/academy/teacher-profile', active: false },
];

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}
const faNum = (n: number) => n.toLocaleString('fa-IR');
const faMoney = (n: number) => n.toLocaleString('fa-IR') + ' تومان';

const STATUS_LABEL: Record<string, string> = { paid: 'پرداخت شده', pending: 'در انتظار', settled: 'تسویه شده' };
const STATUS_ICON: Record<string, any> = { paid: CheckCircle2, pending: Clock, settled: CheckCircle2 };

export default function TeacherFinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/teacher-finance', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setSummary(data.summary);
        setShares(data.shares || []);
        setSettlements(data.settlements || []);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  if (loading) return <div className="teacher-dashboard-loading"><Loader2 className="animate-spin" /></div>;
  if (!user || !summary) return <div className="teacher-dashboard-loading"><p>خطا در بارگذاری صفحه</p></div>;

  const stats = [
    { label: 'کل سهم', value: summary.totalShare, icon: Wallet, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'پرداخت شده', value: summary.paidShare, icon: CheckCircle2, color: '#22C55E', bg: '#F0FDF4' },
    { label: 'در انتظار', value: summary.pendingShare, icon: AlertTriangle, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'تسویه شده', value: summary.totalSettled, icon: CreditCard, color: '#8B5CF6', bg: '#F5F3FF' },
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
            <div className="teacher-date-box">{jalaliDate(new Date().toISOString())}</div>
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
          <section className="teacher-ta-hero">
            <div>
              <h2>پرداخت‌های من</h2>
              <p>سهم مدرسی و تسویه حساب‌های شما</p>
            </div>
          </section>

          <section className="teacher-stat-grid">
            {stats.map((s) => (
              <div key={s.label} className="teacher-stat-card">
                <span className="teacher-stat-icon" style={{ background: s.bg, color: s.color }}><s.icon /></span>
                <div>
                  <strong>{faNum(s.value)}</strong>
                  <small>{s.label}</small>
                </div>
              </div>
            ))}
          </section>

          <section className="teacher-ta-table-section">
            <div className="teacher-ta-class-summary">
              <div className="teacher-ta-summary-left">
                <h3>سهم مدرسی</h3>
                <div className="teacher-ta-summary-meta">
                  <span><Wallet /> {faNum(shares.length)} رکورد</span>
                </div>
              </div>
            </div>

            {shares.length === 0 ? (
              <div className="teacher-list-empty" style={{ padding: '40px 16px' }}>
                <Wallet />
                <p>هنوز سهمی برای شما ثبت نشده است.</p>
              </div>
            ) : (
              <div className="teacher-ta-table-wrap">
                <table className="teacher-ta-table">
                  <thead>
                    <tr>
                      <th>دوره</th>
                      <th>درصد</th>
                      <th>مبلغ</th>
                      <th>وضعیت</th>
                      <th>تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shares.map((s) => {
                      const StatusIcon = STATUS_ICON[s.status] || Clock;
                      return (
                        <tr key={s.id}>
                          <td><strong>{s.courseTitle}</strong></td>
                          <td>{faNum(s.percent)}٪</td>
                          <td className="teacher-ta-date-cell">{faMoney(s.amount)}</td>
                          <td>
                            <span className={`teacher-tc-badge ${s.status === 'paid' ? 'present' : 'late'}`}>
                              <StatusIcon /> {STATUS_LABEL[s.status] || s.status}
                            </span>
                          </td>
                          <td className="teacher-ta-date-cell">{jalaliDate(s.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="teacher-ta-table-section" style={{ marginTop: '24px' }}>
            <div className="teacher-ta-class-summary">
              <div className="teacher-ta-summary-left">
                <h3>تسویه حساب</h3>
                <div className="teacher-ta-summary-meta">
                  <span><CalendarDays /> {faNum(settlements.length)} رکورد</span>
                </div>
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="teacher-list-empty" style={{ padding: '40px 16px' }}>
                <TrendingDown />
                <p>هنوز تسویه‌ای ثبت نشده است.</p>
              </div>
            ) : (
              <div className="teacher-ta-table-wrap">
                <table className="teacher-ta-table">
                  <thead>
                    <tr>
                      <th>دوره</th>
                      <th>مبلغ</th>
                      <th>وضعیت</th>
                      <th>تاریخ تسویه</th>
                      <th>تاریخ ثبت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => {
                      const StatusIcon = STATUS_ICON[s.status] || Clock;
                      return (
                        <tr key={s.id}>
                          <td><strong>{s.period}</strong></td>
                          <td className="teacher-ta-date-cell">{faMoney(s.amount)}</td>
                          <td>
                            <span className={`teacher-tc-badge ${s.status === 'settled' ? 'present' : 'late'}`}>
                              <StatusIcon /> {STATUS_LABEL[s.status] || s.status}
                            </span>
                          </td>
                          <td className="teacher-ta-date-cell">{jalaliDate(s.settledAt)}</td>
                          <td className="teacher-ta-date-cell">{jalaliDate(s.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
