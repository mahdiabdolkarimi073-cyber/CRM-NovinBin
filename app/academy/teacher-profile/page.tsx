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
  Save,
  Mail,
  Phone,
  User,
  CalendarDays,
} from 'lucide-react';

type User = { id: string; firstName: string; lastName: string; username: string; email: string | null; phone: string | null; avatarUrl?: string | null };

const teacherNavItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/dashboard', active: false },
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/teacher-classes', active: false },
  { label: 'حضور و غیاب', icon: CheckSquare, href: '/academy/teacher-attendance', active: false },
  { label: 'نمرات دانش‌آموزان', icon: GraduationCap, href: '/academy/teacher-grades', active: false },
  { label: 'ارزیابی مدرس', icon: ClipboardList, href: '/academy/teacher-evaluation', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/teacher-finance', active: false },
  { label: 'پروفایل', icon: UserRound, href: '/academy/teacher-profile', active: true },
];

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}

export default function TeacherProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/me', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setForm({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
        });
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/academy/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMsg('پروفایل با موفقیت ذخیره شد');
        setUser({ ...user, ...form });
      } else {
        setSaveMsg(data.error || 'خطا در ذخیره‌سازی');
      }
    } catch {
      setSaveMsg('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  if (loading) return <div className="teacher-dashboard-loading"><Loader2 className="animate-spin" /></div>;
  if (!user) return <div className="teacher-dashboard-loading"><p>خطا در بارگذاری صفحه</p></div>;

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
              <h2>پروفایل من</h2>
              <p>مشاهده و ویرایش اطلاعات شخصی</p>
            </div>
          </section>

          <section className="teacher-tg-profile-section">
            <div className="teacher-tg-profile-card">
              <div className="teacher-tg-profile-avatar-lg">
                {user.firstName.slice(0, 1)}
              </div>
              <div className="teacher-tg-profile-info">
                <h3>{user.firstName} {user.lastName}</h3>
                <p>نام کاربری: {user.username}</p>
                <p>نقش: مدرس</p>
              </div>
            </div>

            <div className="teacher-tg-profile-form">
              <div className="teacher-tg-form-row">
                <div className="teacher-tg-field">
                  <label><User /> نام</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="نام"
                    className="teacher-ta-note-input"
                  />
                </div>
                <div className="teacher-tg-field">
                  <label><User /> نام خانوادگی</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="نام خانوادگی"
                    className="teacher-ta-note-input"
                  />
                </div>
              </div>

              <div className="teacher-tg-form-row">
                <div className="teacher-tg-field">
                  <label><Mail /> ایمیل</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ایمیل"
                    className="teacher-ta-note-input"
                  />
                </div>
                <div className="teacher-tg-field">
                  <label><Phone /> تلفن</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="شماره تلفن"
                    className="teacher-ta-note-input"
                  />
                </div>
              </div>

              <div className="teacher-ta-save-bar">
                <div className="teacher-ta-save-info">
                  {saveMsg ? (
                    <span className="teacher-ta-save-success">{saveMsg}</span>
                  ) : (
                    <span className="teacher-ta-save-idle">برای ذخیره روی دکمه کلیک کنید</span>
                  )}
                </div>
                <button
                  type="button"
                  className="teacher-ta-save-btn"
                  disabled={saving}
                  onClick={saveProfile}
                >
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  ذخیره تغییرات
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
