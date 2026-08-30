'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Search, Plus, Edit2, UserX, UserCheck, Loader2, LogOut, Bell, Menu,
  LifeBuoy, Settings, ClipboardList, Wallet, CalendarDays, BookOpen, Eye, X,
} from 'lucide-react';

type Student = {
  id: string; firstName: string; lastName: string; username: string;
  phone?: string | null; email?: string | null; nationalId?: string | null;
  active: boolean; createdAt: string; activeCourses: number; absences: number;
};

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'مدیریت دانش‌آموزان', icon: Users, href: '/academy/students', active: true },
  { label: 'ثبت‌نام‌ها', icon: ClipboardList, href: '/academy/registration' },
  { label: 'کلاس‌ها', icon: CalendarDays, href: '/academy/classes' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes' },
];

function formatJalali(date: string | null) {
  if (!date) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(date)); }
  catch { return new Date(date).toLocaleDateString('fa-IR'); }
}

export default function StudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', phone: '', email: '', nationalId: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStudents = useCallback((q: string) => {
    fetch(`/api/academy/students?q=${encodeURIComponent(q)}`, { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => { if (res.ok) { const data = await res.json(); setStudents(data.students || []); } else if (res.status === 403) router.replace('/academy/login'); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { fetchStudents(''); }, [fetchStudents]);

  useEffect(() => {
    const t = setTimeout(() => fetchStudents(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchStudents]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  function openCreate() {
    setEditStudent(null);
    setForm({ firstName: '', lastName: '', username: '', phone: '', email: '', nationalId: '', password: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(s: Student) {
    setEditStudent(s);
    setForm({ firstName: s.firstName, lastName: s.lastName, username: s.username, phone: s.phone || '', email: s.email || '', nationalId: s.nationalId || '', password: '' });
    setError('');
    setShowModal(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const payload: any = { ...form };
      if (editStudent) {
        payload.id = editStudent.id;
        if (!payload.password) delete payload.password;
      }
      const res = await fetch('/api/academy/students', {
        method: editStudent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'خطا در ذخیره'); return; }
      setShowModal(false);
      fetchStudents(search);
    } finally { setSaving(false); }
  }

  async function toggleActive(s: Student) {
    await fetch('/api/academy/students', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    });
    fetchStudents(search);
  }

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
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
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
              <div className="academy-admin-header-avatar">م</div>
              <div><strong>مدیر سیستم</strong><small>مدیر آموزشگاه</small></div>
              <button type="button" onClick={logout} aria-label="خروج"><LogOut /></button>
            </div>
          </div>
        </header>

        <div className="academy-admin-scroll">
          <div className="academy-admin-page-hero">
            <div>
              <h2>مدیریت دانش‌آموزان</h2>
              <p>ایجاد، ویرایش و غیرفعال کردن دانش‌آموزان آموزشگاه</p>
            </div>
            <div className="academy-admin-tc-search">
              <Search />
              <input type="text" placeholder="جستجوی نام، نام کاربری، تلفن..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button type="button" className="academy-admin-btn-primary" onClick={openCreate}><Plus /> دانش‌آموز جدید</button>
          </div>

          {loading ? (
            <div className="academy-admin-loading-inline"><Loader2 className="animate-spin" /></div>
          ) : students.length === 0 ? (
            <div className="academy-admin-list-empty"><Users /><p>دانش‌آموزی یافت نشد.</p></div>
          ) : (
            <div className="academy-admin-table-wrap">
              <table className="academy-admin-table">
                <thead>
                  <tr>
                    <th>نام و نام خانوادگی</th>
                    <th>نام کاربری</th>
                    <th>تلفن</th>
                    <th>کد ملی</th>
                    <th>دوره‌های فعال</th>
                    <th>غیبت‌ها</th>
                    <th>تاریخ ثبت</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.firstName} {s.lastName}</strong></td>
                      <td>{s.username}</td>
                      <td>{s.phone || '—'}</td>
                      <td>{s.nationalId || '—'}</td>
                      <td>{s.activeCourses.toLocaleString('fa-IR')}</td>
                      <td>{s.absences.toLocaleString('fa-IR')}</td>
                      <td>{formatJalali(s.createdAt)}</td>
                      <td>
                        <span className={`academy-admin-badge ${s.active ? 'badge-success' : 'badge-error'}`}>
                          {s.active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td>
                        <div className="academy-admin-row-actions">
                          <button type="button" title="مشاهده پرونده" onClick={() => router.push(`/academy/students/${s.id}`)}><Eye /></button>
                          <button type="button" title="ویرایش" onClick={() => openEdit(s)}><Edit2 /></button>
                          <button type="button" title={s.active ? 'غیرفعال کردن' : 'فعال کردن'} onClick={() => toggleActive(s)}>
                            {s.active ? <UserX /> : <UserCheck />}
                          </button>
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

      {showModal && (
        <div className="academy-admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="academy-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="academy-admin-modal-header">
              <h3>{editStudent ? 'ویرایش دانش‌آموز' : 'ایجاد دانش‌آموز جدید'}</h3>
              <button type="button" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <div className="academy-admin-modal-body">
              {error && <div className="academy-admin-modal-error">{error}</div>}
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
                  <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editStudent} />
                </div>
                <div className="academy-admin-field">
                  <label>رمز عبور {editStudent && '(اختیاری)'}</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editStudent ? 'بدون تغییر خالی بگذارید' : ''} />
                </div>
                <div className="academy-admin-field">
                  <label>تلفن</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="academy-admin-field">
                  <label>ایمیل</label>
                  <input type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="academy-admin-field">
                  <label>کد ملی</label>
                  <input type="text" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="academy-admin-modal-footer">
              <button type="button" className="academy-admin-btn-ghost" onClick={() => setShowModal(false)}>انصراف</button>
              <button type="button" className="academy-admin-btn-primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null} {editStudent ? 'ذخیره تغییرات' : 'ایجاد دانش‌آموز'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
