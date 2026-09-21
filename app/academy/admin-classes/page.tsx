'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  BookOpen, Users, Plus, X, Edit2, Trash2, CalendarClock, UserCheck, DoorOpen, GraduationCap, MapPin, Clock, User,
} from 'lucide-react';

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'مدیریت دانش‌آموزان', icon: Users, href: '/academy/admin-students' },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers' },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management' },
  { label: 'ثبت‌نام‌ها', icon: ClipboardList, href: '/academy/admin-registration' },
  { label: 'کلاس‌ها', icon: CalendarDays, href: '/academy/admin-classes', active: true },
  { label: 'تنظیمات', icon: Settings, href: '/academy/admin-settings' },
];

type ClassRow = {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCode: string | null;
  courseLevel: string | null;
  teacherName: string;
  roomName: string;
  roomCapacity: number;
  weekday: string;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  capacity: number;
  enrolled: number;
  activeEnrolled: number;
};

export default function AdminClassesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ classes: ClassRow[]; courses: any[]; teachers: any[]; rooms: any[] } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterDay, setFilterDay] = useState<string>('all');

  const fetchData = useCallback(() => {
    fetch('/api/academy/admin-classes', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (res.ok) setData(await res.json());
        else if (res.status === 403) router.replace('/academy/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  function openCreate() {
    setEditId(null);
    setForm({ courseId: '', teacherId: '', roomId: '', weekday: 'saturday', startTime: '', endTime: '', capacity: 0 });
    setError('');
    setShowModal(true);
  }

  function openEdit(cls: ClassRow) {
    setEditId(cls.id);
    setForm({
      courseId: cls.courseId || '',
      teacherId: '',
      roomId: '',
      weekday: cls.weekday,
      startTime: cls.startTime || '',
      endTime: cls.endTime || '',
      capacity: cls.capacity || 0,
    });
    setError('');
    setShowModal(true);
  }

  async function save() {
    if (!form.courseId || !form.startTime || !form.endTime) {
      setError('دوره، ساعت شروع و پایان الزامی است');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const method = editId ? 'PUT' : 'POST';
      const body: any = { type: 'weeklySchedule', data: form };
      if (editId) body.id = editId;
      const res = await fetch('/api/academy/education', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resData = await res.json();
      if (!res.ok) { setError(resData.error || 'خطا'); return; }
      setShowModal(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/academy/education?type=weeklySchedule&id=${id}`, { method: 'DELETE' });
    fetchData();
  }

  if (loading) return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="academy-admin-loading"><p>خطا در بارگذاری کلاس‌ها</p></div>;

  const weekdays = [
    { value: 'all', label: 'همه روزها' },
    { value: 'saturday', label: 'شنبه' },
    { value: 'sunday', label: 'یکشنبه' },
    { value: 'monday', label: 'دوشنبه' },
    { value: 'tuesday', label: 'سه‌شنبه' },
    { value: 'wednesday', label: 'چهارشنبه' },
    { value: 'thursday', label: 'پنجشنبه' },
    { value: 'friday', label: 'جمعه' },
  ];

  const filtered = filterDay === 'all' ? data.classes : data.classes.filter((c) => c.weekday === filterDay);
  const totalActive = data.classes.length;
  const totalEnrolled = data.classes.reduce((sum, c) => sum + c.activeEnrolled, 0);
  const totalCapacity = data.classes.reduce((sum, c) => sum + c.capacity, 0);

  return (
    <div className="academy-admin-layout" dir="rtl">
      <div className="academy-admin-overlay" onClick={() => document.querySelector('.academy-admin-sidebar')?.classList.remove('open')} />
      <aside className="academy-admin-sidebar">
        <div className="academy-admin-sidebar-inner">
          <div className="academy-admin-sidebar-brand">
            <span className="academy-admin-sidebar-logo">دنیای</span>
            <span className="academy-admin-sidebar-logo-alt"> الگوریتم</span>
          </div>
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
            <div className="academy-admin-date-box">مدیریت کلاس‌ها</div>
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
              <h2>مدیریت کلاس‌ها</h2>
              <p>برنامه هفتگی کلاس‌ها، ظرفیت و ثبت‌نام‌ها</p>
            </div>
            <button type="button" className="academy-admin-btn-primary" onClick={openCreate}><Plus /> کلاس جدید</button>
          </div>

          <section className="academy-admin-stat-grid">
            <div className="academy-admin-stat-card">
              <span className="academy-admin-stat-icon" style={{ background: '#2563EB1A', color: '#2563EB' }}><CalendarDays /></span>
              <div><strong>{totalActive.toLocaleString('fa-IR')}</strong><small>کلاس‌های فعال</small></div>
            </div>
            <div className="academy-admin-stat-card">
              <span className="academy-admin-stat-icon" style={{ background: '#10B9811A', color: '#10B981' }}><Users /></span>
              <div><strong>{totalEnrolled.toLocaleString('fa-IR')}</strong><small>دانش‌آموزان ثبت‌نام‌شده</small></div>
            </div>
            <div className="academy-admin-stat-card">
              <span className="academy-admin-stat-icon" style={{ background: '#F59E0B1A', color: '#F59E0B' }}><DoorOpen /></span>
              <div><strong>{totalCapacity.toLocaleString('fa-IR')}</strong><small>ظرفیت کل</small></div>
            </div>
          </section>

          <div className="academy-admin-sec" style={{ marginTop: 24 }}>
            <div className="academy-admin-sec-header">
              <h3>برنامه کلاس‌ها</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {weekdays.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setFilterDay(d.value)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: 13,
                      background: filterDay === d.value ? '#2563EB' : '#F8FAFC', color: filterDay === d.value ? '#fff' : '#475569',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="academy-admin-list-empty"><CalendarClock /><p>کلاسی برای این روز ثبت نشده است.</p></div>
            ) : (
              <div className="academy-admin-table-wrap">
                <table className="academy-admin-table">
                  <thead>
                    <tr>
                      <th>دوره</th><th>مدرس</th><th>اتاق</th><th>روز</th><th>ساعت</th><th>ظرفیت</th><th>ثبت‌نام شده</th><th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((cls) => (
                      <tr key={cls.id}>
                        <td>
                          <strong>{cls.courseTitle}</strong>
                          {cls.courseCode && <small style={{ display: 'block', color: '#94A3B8', fontSize: 12 }}>{cls.courseCode}</small>}
                        </td>
                        <td>{cls.teacherName}</td>
                        <td>{cls.roomName}</td>
                        <td>{cls.weekdayLabel}</td>
                        <td>{cls.startTime} - {cls.endTime}</td>
                        <td>{cls.capacity.toLocaleString('fa-IR')}</td>
                        <td>
                          <span className={`academy-admin-badge ${cls.activeEnrolled >= cls.capacity ? 'badge-warning' : 'badge-success'}`}>
                            {cls.activeEnrolled.toLocaleString('fa-IR')}
                          </span>
                        </td>
                        <td>
                          <div className="academy-admin-row-actions">
                            <button type="button" onClick={() => openEdit(cls)}><Edit2 /></button>
                            <button type="button" onClick={() => remove(cls.id)}><Trash2 /></button>
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
      </div>

      {showModal && (
        <div className="academy-admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="academy-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="academy-admin-modal-header">
              <h3>{editId ? 'ویرایش کلاس' : 'کلاس جدید'}</h3>
              <button type="button" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <div className="academy-admin-modal-body">
              {error && <div className="academy-admin-modal-error">{error}</div>}
              <div className="academy-admin-form-grid">
                <div className="academy-admin-field">
                  <label>دوره</label>
                  <select value={form.courseId || ''} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                    <option value="">انتخاب...</option>
                    {data.courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="academy-admin-field">
                  <label>مدرس</label>
                  <select value={form.teacherId || ''} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                    <option value="">انتخاب...</option>
                    {data.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="academy-admin-field">
                  <label>اتاق</label>
                  <select value={form.roomId || ''} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                    <option value="">انتخاب...</option>
                    {data.rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name} (ظرفیت: {r.capacity})</option>)}
                  </select>
                </div>
                <div className="academy-admin-field">
                  <label>روز</label>
                  <select value={form.weekday || 'saturday'} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
                    <option value="saturday">شنبه</option>
                    <option value="sunday">یکشنبه</option>
                    <option value="monday">دوشنبه</option>
                    <option value="tuesday">سه‌شنبه</option>
                    <option value="wednesday">چهارشنبه</option>
                    <option value="thursday">پنجشنبه</option>
                    <option value="friday">جمعه</option>
                  </select>
                </div>
                <div className="academy-admin-field">
                  <label>ساعت شروع</label>
                  <input type="time" value={form.startTime || ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div className="academy-admin-field">
                  <label>ساعت پایان</label>
                  <input type="time" value={form.endTime || ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
                <div className="academy-admin-field">
                  <label>ظرفیت</label>
                  <input type="number" value={form.capacity || 0} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className="academy-admin-modal-footer">
              <button type="button" className="academy-admin-btn-ghost" onClick={() => setShowModal(false)}>انصراف</button>
              <button type="button" className="academy-admin-btn-primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null} {editId ? 'ذخیره' : 'ایجاد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
