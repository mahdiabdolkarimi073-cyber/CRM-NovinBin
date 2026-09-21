'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Users, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  CalendarDays, BookOpen, Save, Building, GraduationCap,
} from 'lucide-react';

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'مدیریت دانش‌آموزان', icon: Users, href: '/academy/admin-students' },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers' },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management' },
  { label: 'ثبت‌نام‌ها', icon: ClipboardList, href: '/academy/admin-registration' },
  { label: 'کلاس‌ها', icon: CalendarDays, href: '/academy/admin-classes' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/admin-settings', active: true },
];

function formatJalali(date: string | null) {
  if (!date) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(date)); }
  catch { return new Date(date).toLocaleDateString('fa-IR'); }
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<any>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/academy/admin-dashboard', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (res.status === 403) { router.replace('/academy/login'); return; }
        if (res.ok) {
          const data = await res.json();
          setAdmin(data.user);
          setForm({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            username: data.user.username || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() { await fetch('/api/academy/logout', { method: 'POST' }); router.replace('/academy/login'); }

  async function save() {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/academy/education', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'adminProfile', id: admin.id, data: form }),
      });
      if (res.ok) setMsg('تنظیمات ذخیره شد');
      else { const d = await res.json(); setMsg(d.error || 'خطا در ذخیره'); }
    } finally { setSaving(false); }
  }

  if (loading) return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="academy-admin-layout" dir="rtl">
      <div className="academy-admin-overlay" onClick={() => document.querySelector('.academy-admin-sidebar')?.classList.remove('open')} />
      <aside className="academy-admin-sidebar">
        <div className="academy-admin-sidebar-inner">
          <div className="academy-admin-sidebar-brand"><span className="academy-admin-sidebar-logo">دنیای</span><span className="academy-admin-sidebar-logo-alt"> الگوریتم</span></div>
          <nav className="academy-admin-sidebar-nav">
            {navItems.map((item) => (
              <button key={item.label} type="button" className={item.active ? 'active' : ''} onClick={() => router.push(item.href)}>
                <item.icon /> <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="academy-admin-sidebar-support">
            <strong>نیاز به کمک دارید؟</strong><p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> تماس با پشتیبانی</button>
          </div>
        </div>
      </aside>

      <div className="academy-admin-main">
        <header className="academy-admin-header">
          <div className="academy-admin-header-right">
            <button type="button" className="academy-admin-burger" onClick={() => document.querySelector('.academy-admin-sidebar')?.classList.add('open')} aria-label="منو"><Menu /></button>
            <div className="academy-admin-date-box">{formatJalali(new Date().toISOString())}</div>
          </div>
          <div className="academy-admin-header-left">
            <button type="button" aria-label="اعلان‌ها"><Bell /></button>
            <div className="academy-admin-header-profile">
              <div className="academy-admin-header-avatar">{form.firstName?.slice(0, 1) || 'م'}</div>
              <div><strong>{form.firstName} {form.lastName}</strong><small>مدیر آموزشگاه</small></div>
              <button type="button" onClick={logout} aria-label="خروج"><LogOut /></button>
            </div>
          </div>
        </header>

        <div className="academy-admin-scroll">
          <div className="academy-admin-page-hero">
            <div><h2>تنظیمات</h2><p>مدیریت پروفایل و تنظیمات آموزشگاه</p></div>
          </div>

          <div className="academy-admin-sec">
            <div className="academy-admin-sec-header">
              <h3><Building /> اطلاعات مدیر</h3>
            </div>
            {msg && <div className="academy-admin-modal-error" style={{ marginBottom: 12 }}>{msg}</div>}
            <div className="academy-admin-form-grid">
              <div className="academy-admin-field">
                <label>نام</label>
                <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="academy-admin-field">
                <label>نام خانوادگی</label>
                <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="academy-admin-field">
                <label>نام کاربری</label>
                <input type="text" value={form.username} disabled />
              </div>
              <div className="academy-admin-field">
                <label>ایمیل</label>
                <input type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="academy-admin-field">
                <label>تلفن</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <button type="button" className="academy-admin-btn-primary" onClick={save} disabled={saving} style={{ marginTop: 16 }}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} ذخیره تغییرات
            </button>
          </div>

          <div className="academy-admin-sec">
            <div className="academy-admin-sec-header">
              <h3><GraduationCap /> اطلاعات آموزشگاه</h3>
            </div>
            <div className="academy-admin-list-empty">
              <Building />
              <p>تنظیمات عمومی آموزشگاه در این بخش قابل مدیریت خواهد بود.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
