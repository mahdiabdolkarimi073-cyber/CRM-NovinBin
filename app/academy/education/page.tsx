'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  CalendarDays, BookOpen, Plus, X, Edit2, Trash2, GraduationCap, Layers, BookMarked, DoorOpen, CalendarClock, UserCheck, ArrowLeftRight, Upload, Image as ImageIcon,
  Key, FolderTree, Package, ShoppingCart,
} from 'lucide-react';

type TabKey = 'categories' | 'courses' | 'terms' | 'levels' | 'syllabi' | 'rooms' | 'weekly' | 'assign' | 'move';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'categories', label: 'دسته‌بندی', icon: FolderTree },
  { key: 'courses', label: 'دوره', icon: GraduationCap },
  { key: 'terms', label: 'ترم', icon: CalendarDays },
  { key: 'levels', label: 'سطح', icon: Layers },
  { key: 'syllabi', label: 'سرفصل', icon: BookMarked },
  { key: 'rooms', label: 'اتاق', icon: DoorOpen },
  { key: 'weekly', label: 'برنامه هفتگی', icon: CalendarClock },
  { key: 'assign', label: 'تخصیص مدرس', icon: UserCheck },
  { key: 'move', label: 'جابه‌جایی هنرجو', icon: ArrowLeftRight },
];

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'مدیریت هنرجویان', icon: Users, href: '/academy/admin-students' },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers' },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education', active: true },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management' },
  { label: 'ثبت‌نام‌ها', icon: ClipboardList, href: '/academy/admin-registration' },
  { label: 'کلاس‌ها', icon: CalendarDays, href: '/academy/admin-classes' },
  { label: 'API آموزشگاه', icon: Key, href: '/academy/admin-api' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/admin-settings' },
];

const weekDayOptions = [
  { value: 'saturday', label: 'شنبه' },
  { value: 'sunday', label: 'یکشنبه' },
  { value: 'monday', label: 'دوشنبه' },
  { value: 'tuesday', label: 'سه‌شنبه' },
  { value: 'wednesday', label: 'چهارشنبه' },
  { value: 'thursday', label: 'پنجشنبه' },
  { value: 'friday', label: 'جمعه' },
];

type CourseProductRow = { productId: string | null; name: string; price: number; qty: number };

function formatJalali(date: string | null) {
  if (!date) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(date)); }
  catch { return new Date(date).toLocaleDateString('fa-IR'); }
}

function formatMoney(n: number) {
  return (n || 0).toLocaleString('fa-IR');
}

export default function EducationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('categories');
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
    setModalType(type); setEditId(null);
    if (type === 'course') setForm({ products: [] });
    else setForm({});
    setError(''); setShowModal(true);
  }

  function openEdit(type: string, id: string, item: any) {
    setModalType(type); setEditId(id);
    if (type === 'category') setForm({ title: item.title, parentId: item.parentId || '', order: item.order || 0, active: item.active });
    else if (type === 'course') setForm({
      title: item.title, code: item.code || '', description: item.description || '', teacherName: item.teacherName || '',
      level: item.level || '', imageUrl: item.imageUrl || '', categoryId: item.categoryId || '', price: item.price || 0,
      products: item.products || [], startDate: item.startDate?.slice(0, 10) || '', endDate: item.endDate?.slice(0, 10) || '', active: item.active,
    });
    else if (type === 'term') setForm({ title: item.title, courseId: item.courseId || '', startDate: item.startDate?.slice(0, 10) || '', endDate: item.endDate?.slice(0, 10) || '', active: item.active });
    else if (type === 'level') setForm({ title: item.title, code: item.code || '', order: item.order, courseId: item.courseId || '', termId: item.termId || '' });
    else if (type === 'room') setForm({ name: item.name, capacity: item.capacity, active: item.active });
    else if (type === 'weeklySchedule') setForm({ courseId: item.courseId || '', termId: item.termId || '', levelId: item.levelId || '', teacherId: item.teacherId || '', roomId: item.roomId || '', classNumber: item.classNumber || '', weekday: item.weekday || 'saturday', startTime: item.startTime || '', endTime: item.endTime || '', capacity: item.capacity || 0 });
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
    const res = await fetch(`/api/academy/education?type=${type}&id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'حذف انجام نشد');
      return;
    }
    fetchData();
  }

  if (loading) return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="academy-admin-loading"><p>خطا در بارگذاری اطلاعات آموزش</p></div>;

  const safeData = {
    categories: data.categories || [],
    courses: data.courses || [],
    terms: data.terms || [],
    levels: data.levels || [],
    syllabi: data.syllabi || [],
    rooms: data.rooms || [],
    weeklySchedules: data.weeklySchedules || [],
    teachers: data.teachers || [],
    systemProducts: data.systemProducts || [],
  };

  const categoryLabel = (id: string | null) => {
    if (!id) return '—';
    const c = safeData.categories.find((x: any) => x.id === id);
    if (!c) return '—';
    const parent = c.parentId ? safeData.categories.find((x: any) => x.id === c.parentId) : null;
    return parent ? `${parent.title} > ${c.title}` : c.title;
  };

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
            <div><h2>مدیریت آموزش</h2><p>دسته‌بندی‌ها، دوره‌ها، ترم‌ها، سطوح، سرفصل‌ها، کلاس‌ها و برنامه‌ها</p></div>
          </div>

          <div className="academy-admin-tabs">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
                <tab.icon /> {tab.label}
              </button>
            ))}
          </div>

          <div className="academy-admin-tab-content">
            {activeTab === 'categories' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>دسته‌بندی دوره‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('category')}><Plus /> دسته‌بندی جدید</button></div>
                {safeData.categories.length === 0 ? (
                  <div className="academy-admin-list-empty"><FolderTree /><p>دسته‌بندی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>والد</th><th>ترتیب</th><th>تعداد دوره</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {safeData.categories.map((c: any) => (
                          <tr key={c.id}>
                            <td><strong>{c.title}</strong></td>
                            <td>{c.parentId ? (safeData.categories.find((x: any) => x.id === c.parentId)?.title || '—') : 'دوره اصلی'}</td>
                            <td>{(c.order || 0).toLocaleString('fa-IR')}</td>
                            <td>{safeData.courses.filter((x: any) => x.categoryId === c.id).length.toLocaleString('fa-IR')}</td>
                            <td><span className={`academy-admin-badge ${c.active ? 'badge-success' : 'badge-neutral'}`}>{c.active ? 'فعال' : 'غیرفعال'}</span></td>
                            <td>
                              <div className="academy-admin-row-actions">
                                <button type="button" onClick={() => openEdit('category', c.id, c)}><Edit2 /></button>
                                <button type="button" onClick={() => remove('category', c.id)}><Trash2 /></button>
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

            {activeTab === 'courses' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>دوره‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('course')}><Plus /> دوره جدید</button></div>
                {safeData.courses.length === 0 ? (
                  <div className="academy-admin-list-empty"><GraduationCap /><p>دوره‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>دسته‌بندی</th><th>کد</th><th>سطح</th><th>شهریه پایه</th><th>محصولات</th><th>مبلغ نهایی</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {safeData.courses.map((c: any) => (
                          <tr key={c.id}>
                            <td><strong>{c.title}</strong></td>
                            <td>{categoryLabel(c.categoryId)}</td>
                            <td>{c.code || '—'}</td><td>{c.level || '—'}</td>
                            <td>{formatMoney(c.price)}</td>
                            <td>{c.productsTotal > 0 ? `${c.products.length.toLocaleString('fa-IR')} قلم (${formatMoney(c.productsTotal)})` : '—'}</td>
                            <td><strong>{formatMoney(c.finalPrice)}</strong></td>
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
                {safeData.terms.length === 0 ? (
                  <div className="academy-admin-list-empty"><CalendarDays /><p>ترمی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>دوره</th><th>شروع</th><th>پایان</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {safeData.terms.map((t: any) => (
                          <tr key={t.id}>
                            <td><strong>{t.title}</strong></td><td>{t.courseTitle || '—'}</td>
                            <td>{formatJalali(t.startDate)}</td><td>{formatJalali(t.endDate)}</td>
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
                {safeData.levels.length === 0 ? (
                  <div className="academy-admin-list-empty"><Layers /><p>سطحی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>کد</th><th>دوره</th><th>ترم</th><th>ترتیب</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {safeData.levels.map((l: any) => (
                          <tr key={l.id}>
                            <td><strong>{l.title}</strong></td><td>{l.code || '—'}</td>
                            <td>{l.courseTitle || '—'}</td><td>{l.termTitle || '—'}</td>
                            <td>{(l.order || 0).toLocaleString('fa-IR')}</td>
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
                {safeData.syllabi.length === 0 ? (
                  <div className="academy-admin-list-empty"><BookMarked /><p>سرفصلی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>دوره</th><th>ترم</th><th>سطح</th><th>ترتیب</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {safeData.syllabi.map((s: any) => (
                          <tr key={s.id}>
                            <td><strong>{s.title}</strong></td><td>{s.courseTitle}</td><td>{s.termTitle || '—'}</td><td>{s.levelTitle || '—'}</td><td>{(s.order || 0).toLocaleString('fa-IR')}</td>
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
                {safeData.rooms.length === 0 ? (
                  <div className="academy-admin-list-empty"><DoorOpen /><p>اتاقی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>نام</th><th>ظرفیت</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {safeData.rooms.map((r: any) => (
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
                {safeData.weeklySchedules.length === 0 ? (
                  <div className="academy-admin-list-empty"><CalendarClock /><p>برنامه‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>ترم</th><th>سطح</th><th>شماره کلاس</th><th>مدرس</th><th>اتاق</th><th>روز</th><th>شروع</th><th>پایان</th><th>ظرفیت</th><th>ثبت‌نام شده</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {safeData.weeklySchedules.map((w: any) => (
                          <tr key={w.id}>
                            <td><strong>{w.courseTitle}</strong></td><td>{w.termTitle || '—'}</td><td>{w.levelTitle || '—'}</td><td>{w.classNumber || '—'}</td><td>{w.teacherName}</td><td>{w.roomName}</td>
                            <td>{weekDayOptions.find((d) => d.value === w.weekday)?.label || w.weekday}</td><td>{w.startTime}</td><td>{w.endTime}</td>
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
                <AssignTeacherForm courses={safeData.courses} teachers={safeData.teachers} onDone={fetchData} />
              </div>
            )}

            {activeTab === 'move' && (
              <div className="academy-admin-sec">
                <h3>جابه‌جایی هنرجو</h3>
                <MoveStudentForm courses={safeData.courses} onDone={fetchData} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="academy-admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="academy-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="academy-admin-modal-header">
              <h3>{editId ? 'ویرایش' : 'ایجاد'} {{ category: 'دسته‌بندی', course: 'دوره', term: 'ترم', level: 'سطح', room: 'اتاق', syllabus: 'سرفصل', weeklySchedule: 'برنامه' }[modalType] || 'آیتم'}</h3>
              <button type="button" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <div className="academy-admin-modal-body">
              {error && <div className="academy-admin-modal-error">{error}</div>}
              <div className="academy-admin-form-grid">
                {modalType === 'category' && (
                  <>
                    <div className="academy-admin-field"><label>عنوان دسته‌بندی</label><input type="text" placeholder="مثلاً: زبان انگلیسی" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>دسته والد</label>
                      <select value={form.parentId || ''} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                        <option value="">بدون والد (دوره اصلی)</option>
                        {safeData.categories.filter((c: any) => c.id !== editId).map((c: any) => <option key={c.id} value={c.id}>{c.parentId ? `${safeData.categories.find((x: any) => x.id === c.parentId)?.title || ''} > ${c.title}` : c.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>ترتیب</label><input type="number" value={form.order || 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} /></div>
                    <div className="academy-admin-field"><label>فعال</label><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></div>
                  </>
                )}
                {modalType === 'course' && (
                  <>
                    <div className="academy-admin-field"><label>عنوان دوره</label><input type="text" placeholder="مثلاً: دوره طراحی سایت" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>دسته‌بندی</label>
                      <select value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                        <option value="">انتخاب دسته‌بندی...</option>
                        {safeData.categories.map((c: any) => <option key={c.id} value={c.id}>{categoryLabel(c.id)}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>کد دوره</label><input type="text" placeholder="مثلاً: WEB-101" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>سطح</label><input type="text" placeholder="مثلاً: مقدماتی" value={form.level || ''} onChange={(e) => setForm({ ...form, level: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>نام مدرس</label><input type="text" placeholder="نام و نام خانوادگی" value={form.teacherName || ''} onChange={(e) => setForm({ ...form, teacherName: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>شهریه پایه (تومان)</label><input type="number" placeholder="0" value={form.price || 0} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} /></div>
                    <div className="academy-admin-field"><label>تاریخ شروع</label><input type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>تاریخ پایان</label><input type="date" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                    <div className="academy-admin-field" style={{ gridColumn: '1 / -1' }}><label>توضیحات</label><textarea rows={3} placeholder="توضیحات دوره..." value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="academy-admin-field" style={{ gridColumn: '1 / -1' }}>
                      <label>تصویر دوره</label>
                      <div className="academy-admin-image-upload">
                        {form.imageUrl ? (
                          <div className="academy-admin-image-preview">
                            <img src={form.imageUrl} alt="پیش‌نمایش" />
                            <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })}><X /></button>
                          </div>
                        ) : (
                          <label className="academy-admin-image-upload-btn">
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append('file', file);
                              try {
                                const res = await fetch('/api/upload/academy-course-image', { method: 'POST', body: fd });
                                const data = await res.json();
                                if (res.ok) setForm((prev: any) => ({ ...prev, imageUrl: data.url }));
                                else setError(data.error || 'آپلود ناموفق بود');
                              } catch { setError('آپلود ناموفق بود'); }
                            }} />
                            <Upload /><span>آپلود تصویر</span>
                          </label>
                        )}
                      </div>
                    </div>
                    <CourseProductsEditor form={form} setForm={setForm} systemProducts={safeData.systemProducts} />
                    <div className="academy-admin-field"><label>فعال</label><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></div>
                  </>
                )}
                {modalType === 'term' && (
                  <>
                    <div className="academy-admin-field"><label>دوره</label>
                      <select value={form.courseId || ''} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                        <option value="">انتخاب دوره...</option>
                        {safeData.courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>عنوان ترم</label><input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>شروع</label><input type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>پایان</label><input type="date" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>فعال</label><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></div>
                  </>
                )}
                {modalType === 'level' && (
                  <>
                    <div className="academy-admin-field"><label>دوره</label>
                      <select value={form.courseId || ''} onChange={(e) => setForm({ ...form, courseId: e.target.value, termId: '' })}>
                        <option value="">انتخاب دوره...</option>
                        {safeData.courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>ترم (بر اساس دوره)</label>
                      <select value={form.termId || ''} onChange={(e) => setForm({ ...form, termId: e.target.value })} disabled={!form.courseId}>
                        <option value="">{form.courseId ? 'انتخاب ترم...' : 'ابتدا دوره را انتخاب کنید'}</option>
                        {safeData.terms.filter((t: any) => t.courseId === form.courseId).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>عنوان سطح</label><input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>کد</label><input type="text" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>ترتیب</label><input type="number" value={form.order || 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} /></div>
                  </>
                )}
                {modalType === 'room' && (
                  <>
                    <div className="academy-admin-field"><label>نام</label><input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>ظرفیت</label><input type="number" value={form.capacity || 0} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} /></div>
                    <div className="academy-admin-field"><label>فعال</label><input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></div>
                  </>
                )}
                {modalType === 'syllabus' && (
                  <>
                    <div className="academy-admin-field"><label>دوره</label>
                      <select value={form.courseId || ''} onChange={(e) => setForm({ ...form, courseId: e.target.value, termId: '', levelId: '' })}>
                        <option value="">انتخاب دوره...</option>
                        {safeData.courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>ترم</label>
                      <select value={form.termId || ''} onChange={(e) => setForm({ ...form, termId: e.target.value, levelId: '' })} disabled={!form.courseId}>
                        <option value="">{form.courseId ? 'انتخاب ترم...' : 'ابتدا دوره را انتخاب کنید'}</option>
                        {safeData.terms.filter((t: any) => t.courseId === form.courseId).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>سطح</label>
                      <select value={form.levelId || ''} onChange={(e) => setForm({ ...form, levelId: e.target.value })} disabled={!form.termId}>
                        <option value="">{form.termId ? 'انتخاب سطح...' : 'ابتدا ترم را انتخاب کنید'}</option>
                        {safeData.levels.filter((l: any) => l.courseId === form.courseId && l.termId === form.termId).map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>عنوان سرفصل</label><input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>ترتیب</label><input type="number" value={form.order || 0} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} /></div>
                    <div className="academy-admin-field"><label>توضیحات</label><input type="text" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                  </>
                )}
                {modalType === 'weeklySchedule' && (
                  <>
                    <div className="academy-admin-field"><label>دوره</label>
                      <select value={form.courseId || ''} onChange={(e) => setForm({ ...form, courseId: e.target.value, termId: '', levelId: '' })}>
                        <option value="">انتخاب دوره...</option>
                        {safeData.courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>ترم</label>
                      <select value={form.termId || ''} onChange={(e) => setForm({ ...form, termId: e.target.value, levelId: '' })} disabled={!form.courseId}>
                        <option value="">{form.courseId ? 'انتخاب ترم...' : 'ابتدا دوره را انتخاب کنید'}</option>
                        {safeData.terms.filter((t: any) => t.courseId === form.courseId).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>سطح</label>
                      <select value={form.levelId || ''} onChange={(e) => setForm({ ...form, levelId: e.target.value })} disabled={!form.termId}>
                        <option value="">{form.termId ? 'انتخاب سطح...' : 'ابتدا ترم را انتخاب کنید'}</option>
                        {safeData.levels.filter((l: any) => l.courseId === form.courseId && l.termId === form.termId).map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>شماره کلاس</label><input type="text" placeholder="مثلاً: 101" value={form.classNumber || ''} onChange={(e) => setForm({ ...form, classNumber: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>مدرس</label>
                      <select value={form.teacherId || ''} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                        <option value="">انتخاب مدرس...</option>
                        {safeData.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>اتاق</label>
                      <select value={form.roomId || ''} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
                        <option value="">انتخاب اتاق...</option>
                        {safeData.rooms.filter((r: any) => r.active).map((r: any) => <option key={r.id} value={r.id}>{r.name} (ظرفیت {r.capacity.toLocaleString('fa-IR')})</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>روز</label>
                      <select value={form.weekday || 'saturday'} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
                        {weekDayOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div className="academy-admin-field"><label>شروع</label><input type="time" value={form.startTime || ''} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>پایان</label><input type="time" value={form.endTime || ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>ظرفیت</label><input type="number" value={form.capacity || 0} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} /></div>
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

function CourseProductsEditor({ form, setForm, systemProducts }: { form: any; setForm: (f: any) => void; systemProducts: { id: string; name: string; price: number }[] }) {
  const products: CourseProductRow[] = form.products || [];
  const total = products.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.qty) || 1), 0);

  function update(idx: number, patch: Partial<CourseProductRow>) {
    const next = products.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    setForm({ ...form, products: next });
  }
  function addRow() {
    setForm({ ...form, products: [...products, { productId: null, name: '', price: 0, qty: 1 }] });
  }
  function removeRow(idx: number) {
    setForm({ ...form, products: products.filter((_, i) => i !== idx) });
  }

  return (
    <div className="academy-admin-field" style={{ gridColumn: '1 / -1' }}>
      <label><Package style={{ width: 14, height: 14, verticalAlign: 'middle' }} /> محصولات موردنیاز دوره</label>
      {products.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 160px', minWidth: 140 }}>
                <input type="text" placeholder="نام محصول" value={p.name || ''} onChange={(e) => update(idx, { name: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: '1 1 110px', minWidth: 100 }}>
                <input type="number" min={0} placeholder="قیمت واحد" value={p.price ?? 0} onChange={(e) => update(idx, { price: parseInt(e.target.value) || 0 })} style={{ width: '100%' }} />
              </div>
              <div style={{ flex: '0 1 80px', minWidth: 70 }}>
                <input type="number" min={1} placeholder="تعداد" value={p.qty ?? 1} onChange={(e) => update(idx, { qty: parseInt(e.target.value) || 1 })} style={{ width: '100%' }} />
              </div>
              <button type="button" onClick={() => removeRow(idx)} aria-label="حذف محصول" style={{ padding: '8px 10px' }}><X /></button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
            <span><ShoppingCart style={{ width: 14, height: 14, verticalAlign: 'middle' }} /> جمع محصولات: <strong>{formatMoney(total)} تومان</strong></span>
            <span>مبلغ نهایی دوره: <strong>{formatMoney((Number(form.price) || 0) + total)} تومان</strong></span>
          </div>
        </div>
      )}
      {products.length === 0 && <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 8px' }}>محصولی اضافه نشده؛ مبلغ محصولات صفر محاسبه می‌شود.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="academy-admin-btn-ghost" onClick={addRow}><Plus /> افزودن محصول دستی</button>
        {systemProducts.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const sp = systemProducts.find((s) => s.id === e.target.value);
              if (!sp) return;
              setForm({ ...form, products: [...products, { productId: sp.id, name: sp.name, price: sp.price, qty: 1 }] });
            }}
            style={{ maxWidth: 240 }}
          >
            <option value="">افزودن از محصولات سیستم...</option>
            {systemProducts.map((sp) => <option key={sp.id} value={sp.id}>{sp.name} — {formatMoney(sp.price)}</option>)}
          </select>
        )}
      </div>
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
      setEnrollmentId(''); setTargetCourseId(''); setMsg('هنرجو با موفقیت جابه‌جا شد'); onDone();
    } finally { setSaving(false); }
  }

  return (
    <div className="academy-admin-data-card">
      {msg && <div className="academy-admin-modal-error" style={{ marginBottom: 12 }}>{msg}</div>}
      <div className="academy-admin-form-grid">
        <div className="academy-admin-field">
          <label>شناسه ثبت‌نام</label>
          <input type="text" value={enrollmentId} onChange={(e) => setEnrollmentId(e.target.value)} placeholder="شناسه ثبت‌نام هنرجو" />
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
        {saving ? <Loader2 className="animate-spin" /> : <ArrowLeftRight />} جابه‌جایی هنرجو
      </button>
    </div>
  );
}
