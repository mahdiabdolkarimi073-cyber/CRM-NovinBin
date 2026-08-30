'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  CalendarDays, BookOpen, Plus, X, Edit2, Trash2, GraduationCap, Layers, BookMarked, DoorOpen, CalendarClock, UserCheck, ArrowLeftRight,
} from 'lucide-react';

type TabKey = 'courses' | 'terms' | 'levels' | 'syllabi' | 'rooms' | 'weekly' | 'assign' | 'move';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'courses', label: 'دوره', icon: GraduationCap },
  { key: 'terms', label: 'ترم', icon: CalendarDays },
  { key: 'levels', label: 'سطح', icon: Layers },
  { key: 'syllabi', label: 'سرفصل', icon: BookMarked },
  { key: 'rooms', label: 'اتاق', icon: DoorOpen },
  { key: 'weekly', label: 'برنامه هفتگی', icon: CalendarClock },
  { key: 'assign', label: 'تخصیص مدرس', icon: UserCheck },
  { key: 'move', label: 'جابه‌جایی دانش‌آموز', icon: ArrowLeftRight },
];

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'دانش‌آموزان', icon: Users, href: '/academy/students' },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers' },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education', active: true },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes' },
];

function formatJalali(date: string | null) {
  if (!date) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(date)); }
  catch { return new Date(date).toLocaleDateString('fa-IR'); }
}

export default function EducationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('courses');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(() => {
    fetch('/api/academy/education', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => { if (res.ok) setData(await res.json()); else if (res.status === 403) router.replace('/academy/login'); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function logout() { await fetch('/api/academy/logout', { method: 'POST' }); router.replace('/academy/login'); }

  function openCreate(type: string) {
    setModalType(type); setEditId(null); setForm({}); setError(''); setShowModal(true);
  }

  function openEdit(type: string, id: string, item: any) {
    setModalType(type); setEditId(id);
    if (type === 'course') setForm({ title: item.title, code: item.code || '', description: item.description || '', teacherName: item.teacherName || '', level: item.level || '', active: item.active });
    else if (type === 'term') setForm({ title: item.title, startDate: item.startDate?.slice(0, 10) || '', endDate: item.endDate?.slice(0, 10) || '', active: item.active });
    else if (type === 'level') setForm({ title: item.title, code: item.code || '', order: item.order });
    else if (type === 'room') setForm({ name: item.name, capacity: item.capacity, active: item.active });
    else if (type === 'weeklySchedule') setForm({ courseId: '', teacherId: '', roomId: '', weekday: 'saturday', startTime: '', endTime: '', capacity: 0 });
    setError(''); setShowModal(true);
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const method = editId ? 'PUT' : 'POST';
      const body: any = { type: modalType, data: form };
      if (editId) body.id = editId;
      const res = await fetch('/api/academy/education', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const resData = await res.json();
      if (!res.ok) { setError(resData.error || 'خطا'); return; }
      setShowModal(false); fetchData();
    } finally { setSaving(false); }
  }

  async function remove(type: string, id: string) {
    await fetch(`/api/academy/education?type=${type}&id=${id}`, { method: 'DELETE' });
    fetchData();
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
              <div className="academy-admin-header-avatar">م</div>
              <div><strong>مدیر سیستم</strong><small>مدیر آموزشگاه</small></div>
              <button type="button" onClick={logout} aria-label="خروج"><LogOut /></button>
            </div>
          </div>
        </header>

        <div className="academy-admin-scroll">
          <div className="academy-admin-page-hero">
            <div><h2>مدیریت آموزش</h2><p>دوره‌ها، ترم‌ها، سطوح، سرفصل‌ها، کلاس‌ها و برنامه‌ها</p></div>
          </div>

          <div className="academy-admin-tabs">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
                <tab.icon /> {tab.label}
              </button>
            ))}
          </div>

          <div className="academy-admin-tab-content">
            {activeTab === 'courses' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>دوره‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('course')}><Plus /> دوره جدید</button></div>
                {data.courses.length === 0 ? (
                  <div className="academy-admin-list-empty"><GraduationCap /><p>دوره‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>کد</th><th>سطح</th><th>مدرس</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.courses.map((c: any) => (
                          <tr key={c.id}>
                            <td><strong>{c.title}</strong></td><td>{c.code || '—'}</td><td>{c.level || '—'}</td><td>{c.teacherName || '—'}</td>
                            <td><span className={`academy-admin-badge ${c.active ? 'badge-success' : 'badge-neutral'}`}>{c.active ? 'فعال' : 'غیرفعال'}</span></td>
                            <td>
                              <div className="academy-admin-row-actions">
                                <button type="button" onClick={() => openEdit('course', c.id, c)}><Edit2 /></button>
                                <button type="button" onClick={() => remove('course', c.id)}><Trash2 /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>ترم‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('term')}><Plus /> ترم جدید</button></div>
                {data.terms.length === 0 ? (
                  <div className="academy-admin-list-empty"><CalendarDays /><p>ترمی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>شروع</th><th>پایان</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.terms.map((t: any) => (
                          <tr key={t.id}>
                            <td><strong>{t.title}</strong></td><td>{formatJalali(t.startDate)}</td><td>{formatJalali(t.endDate)}</td>
                            <td><span className={`academy-admin-badge ${t.active ? 'badge-success' : 'badge-neutral'}`}>{t.active ? 'فعال' : 'غیرفعال'}</span></td>
                            <td><div className="academy-admin-row-actions">
                              <button type="button" onClick={() => openEdit('term', t.id, t)}><Edit2 /></button>
                              <button type="button" onClick={() => remove('term', t.id)}><Trash2 /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'levels' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>سطوح</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('level')}><Plus /> سطح جدید</button></div>
                {data.levels.length === 0 ? (
                  <div className="academy-admin-list-empty"><Layers /><p>سطحی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>کد</th><th>ترتیب</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.levels.map((l: any) => (
                          <tr key={l.id}>
                            <td><strong>{l.title}</strong></td><td>{l.code || '—'}</td><td>{l.order.toLocaleString('fa-IR')}</td>
                            <td><div className="academy-admin-row-actions">
                              <button type="button" onClick={() => openEdit('level', l.id, l)}><Edit2 /></button>
                              <button type="button" onClick={() => remove('level', l.id)}><Trash2 /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'syllabi' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>سرفصل‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('syllabus')}><Plus /> سرفصل جدید</button></div>
                {data.syllabi.length === 0 ? (
                  <div className="academy-admin-list-empty"><BookMarked /><p>سرفصلی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>دوره</th><th>ترتیب</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.syllabi.map((s: any) => (
                          <tr key={s.id}>
                            <td><strong>{s.title}</strong></td><td>{s.courseTitle}</td><td>{s.order.toLocaleString('fa-IR')}</td>
                            <td><div className="academy-admin-row-actions">
                              <button type="button" onClick={() => remove('syllabus', s.id)}><Trash2 /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rooms' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>اتاق‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('room')}><Plus /> اتاق جدید</button></div>
                {data.rooms.length === 0 ? (
                  <div className="academy-admin-list-empty"><DoorOpen /><p>اتاقی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>نام</th><th>ظرفیت</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.rooms.map((r: any) => (
                          <tr key={r.id}>
                            <td><strong>{r.name}</strong></td><td>{r.capacity.toLocaleString('fa-IR')}</td>
                            <td><span className={`academy-admin-badge ${r.active ? 'badge-success' : 'badge-neutral'}`}>{r.active ? 'فعال' : 'غیرفعال'}</span></td>
                            <td><div className="academy-admin-row-actions">
                              <button type="button" onClick={() => openEdit('room', r.id, r)}><Edit2 /></button>
                              <button type="button" onClick={() => remove('room', r.id)}><Trash2 /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'weekly' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>برنامه هفتگی</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('weeklySchedule')}><Plus /> برنامه جدید</button></div>
                {data.weeklySchedules.length === 0 ? (
                  <div className="academy-admin-list-empty"><CalendarClock /><p>برنامه‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>مدرس</th><th>اتاق</th><th>روز</th><th>شروع</th><th>پایان</th><th>ظرفیت</th><th>ثبت‌نام شده</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.weeklySchedules.map((w: any) => (
                          <tr key={w.id}>
                            <td><strong>{w.courseTitle}</strong></td><td>{w.teacherName}</td><td>{w.roomName}</td>
                            <td>{w.weekday}</td><td>{w.startTime}</td><td>{w.endTime}</td>
                            <td>{w.capacity.toLocaleString('fa-IR')}</td><td>{w.enrolled.toLocaleString('fa-IR')}</td>
                            <td><div className="academy-admin-row-actions">
                              <button type="button" onClick={() => openEdit('weeklySchedule', w.id, w)}><Edit2 /></button>
                              <button type="button" onClick={() => remove('weeklySchedule', w.id)}><Trash2 /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'assign' && (
              <div className="academy-admin-sec">
                <h3>تخصیص مدرس به دوره</h3>
                <AssignTeacherForm courses={data.courses} teachers={data.teachers} onDone={fetchData} />
              </div>
            )}

            {activeTab === 'move' && (
              <div className="academy-admin-sec">
                <h3>جابه‌جایی دانش‌آموز</h3>
                <MoveStudentForm courses={data.courses} onDone={fetchData} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="academy-admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="academy-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="academy-admin-modal-header">
              <h3>{editId ? 'ویرایش' : 'ایجاد'} {modalType === 'course' ? 'دوره' : modalType === 'term' ? 'ترم' : modalType === 'level' ? 'سطح' : modalType === 'room' ? 'اتاق' : modalType === 'syllabus' ? 'سرفصل' : 'برنامه'}</h3>
              <button type="button" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <div className="academy-admin-modal-body">
              {error && <div className="academy-admin-modal-error">{error}</div>}
              <div className="academy-admin-form-grid">
                {modalType === 'course' && (
                  <>
                    <div className="academy-admin-field"><label>عنوان</label><input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>کد</label><input type="text" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>سطح</label><input type="text" value={form.level || ''} onChange={(e) => setForm({ ...form, level: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>مدرس</label><input type="text" value={form.teacherName || ''} onChange={(e) => setForm({ ...form, teacherName: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>توضیحات</label><input type="text" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>فعال</label><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></div>
                  </>
                )}
                {modalType === 'term' && (
                  <>
                    <div className="academy-admin-field"><label>عنوان</label><input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>شروع</label><input type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>پایان</label><input type="date" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>فعال</label><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></div>
                  </>
                )}
                {modalType === 'level' && (
                  <>
                    <div className="academy-admin-field"><label>عنوان</label><input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>کد</label><input type="text" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>ترتیب</label><input type="number" value={form.order || 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) })} /></div>
                  </>
                )}
                {modalType === 'room' && (
                  <>
                    <div className="academy-admin-field"><label>نام</label><input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>ظرفیت</label><input type="number" value={form.capacity || 0} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })} /></div>
                    <div className="academy-admin-field"><label>فعال</label><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></div>
                  </>
                )}
                {modalType === 'syllabus' && (
                  <>
                    <div className="academy-admin-field"><label>عنوان</label><input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>ترتیب</label><input type="number" value={form.order || 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) })} /></div>
                    <div className="academy-admin-field"><label>توضیحات</label><input type="text" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  </>
                )}
                {modalType === 'weeklySchedule' && (
                  <>
                    <div className="academy-admin-field"><label>دوره</label>
                      <select value={form.courseId || ''} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                        <option value="">انتخاب...</option>
                        {data.courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>مدرس</label>
                      <select value={form.teacherId || ''} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                        <option value="">انتخاب...</option>
                        {data.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>روز</label>
                      <select value={form.weekday || 'saturday'} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
                        <option value="saturday">شنبه</option><option value="sunday">یکشنبه</option>
                        <option value="monday">دوشنبه</option><option value="tuesday">سه‌شنبه</option>
                        <option value="wednesday">چهارشنبه</option><option value="thursday">پنجشنبه</option>
                        <option value="friday">جمعه</option>
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>شروع</label><input type="time" value={form.startTime || ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>پایان</label><input type="time" value={form.endTime || ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>ظرفیت</label><input type="number" value={form.capacity || 0} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })} /></div>
                  </>
                )}
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

function AssignTeacherForm({ courses, teachers, onDone }: { courses: any[]; teachers: any[]; onDone: () => void }) {
  const [courseId, setCourseId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    if (!courseId || !teacherName) { setMsg('دوره و مدرس را انتخاب کنید'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/academy/education', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'assignTeacher', data: { courseId, teacherName } }) });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'خطا'); return; }
      setCourseId(''); setTeacherName(''); setMsg('مدرس با موفقیت تخصیص داده شد'); onDone();
    } finally { setSaving(false); }
  }

  return (
    <div className="academy-admin-data-card">
      {msg && <div className="academy-admin-modal-error" style={{ marginBottom: 12 }}>{msg}</div>}
      <div className="academy-admin-form-grid">
        <div className="academy-admin-field">
          <label>دوره</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">انتخاب دوره...</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="academy-admin-field">
          <label>مدرس</label>
          <select value={teacherName} onChange={(e) => setTeacherName(e.target.value)}>
            <option value="">انتخاب مدرس...</option>
            {teachers.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <button type="button" className="academy-admin-btn-primary" onClick={submit} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? <Loader2 className="animate-spin" /> : <UserCheck />} تخصیص مدرس
      </button>
    </div>
  );
}

function MoveStudentForm({ courses, onDone }: { courses: any[]; onDone: () => void }) {
  const [enrollmentId, setEnrollmentId] = useState('');
  const [targetCourseId, setTargetCourseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    if (!enrollmentId || !targetCourseId) { setMsg('شناسه ثبت‌نام و دوره هدف را وارد کنید'); return; }
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/academy/education', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'moveStudent', data: { enrollmentId, targetCourseId } }) });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'خطا'); return; }
      setEnrollmentId(''); setTargetCourseId(''); setMsg('دانش‌آموز با موفقیت جابه‌جا شد'); onDone();
    } finally { setSaving(false); }
  }

  return (
    <div className="academy-admin-data-card">
      {msg && <div className="academy-admin-modal-error" style={{ marginBottom: 12 }}>{msg}</div>}
      <div className="academy-admin-form-grid">
        <div className="academy-admin-field">
          <label>شناسه ثبت‌نام</label>
          <input type="text" value={enrollmentId} onChange={(e) => setEnrollmentId(e.target.value)} placeholder="شناسه ثبت‌نام دانش‌آموز" />
        </div>
        <div className="academy-admin-field">
          <label>دوره هدف</label>
          <select value={targetCourseId} onChange={(e) => setTargetCourseId(e.target.value)}>
            <option value="">انتخاب دوره...</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      </div>
      <button type="button" className="academy-admin-btn-primary" onClick={submit} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? <Loader2 className="animate-spin" /> : <ArrowLeftRight />} جابه‌جایی دانش‌آموز
      </button>
    </div>
  );
}
