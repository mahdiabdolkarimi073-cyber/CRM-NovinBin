'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, LogOut, Bell, Menu, LifeBuoy, BookOpen, GraduationCap, Users, Wallet, ClipboardList,
  CalendarDays, Search,
} from 'lucide-react';

type Course = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  teacherName: string | null;
  level: string | null;
  imageUrl: string | null;
  price: number;
  startDate: string | null;
  endDate: string | null;
  enrolled: boolean;
};

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/dashboard' },
  { label: 'دوره‌ها', icon: GraduationCap, href: '/academy/course-catalog', active: true },
  { label: 'کلاس‌های من', icon: CalendarDays, href: '/academy/classes' },
  { label: 'حضور و غیاب', icon: Users, href: '/academy/attendance' },
  { label: 'نمرات', icon: ClipboardList, href: '/academy/teacher-grades' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance' },
];

export default function CourseCatalogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  const fetchData = useCallback(() => {
    fetch('/api/academy/course-catalog', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) { if (res.status === 401) router.replace('/academy/login'); return; }
        const data = await res.json();
        setCourses(data.courses || []);
        setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function logout() { await fetch('/api/academy/logout', { method: 'POST' }); router.replace('/academy/login'); }

  const levels = Array.from(new Set(courses.map((c) => c.level).filter(Boolean))) as string[];
  const filtered = courses.filter((c) => {
    if (filterLevel !== 'all' && c.level !== filterLevel) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!c.title.toLowerCase().includes(s) && !(c.teacherName?.toLowerCase().includes(s)) && !(c.description?.toLowerCase().includes(s))) return false;
    }
    return true;
  });

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
            <div className="academy-admin-date-box">{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date())}</div>
          </div>
          <div className="academy-admin-header-left">
            <button type="button" aria-label="اعلان‌ها"><Bell /></button>
            <div className="academy-admin-header-profile">
              <div className="academy-admin-header-avatar">{user?.firstName?.[0] || 'د'}</div>
              <div><strong>{user ? `${user.firstName} ${user.lastName}` : 'دانش‌آموز'}</strong><small>دانش‌آموز</small></div>
              <button type="button" onClick={logout} aria-label="خروج"><LogOut /></button>
            </div>
          </div>
        </header>

        <div className="academy-admin-scroll">
          <div className="academy-admin-page-hero">
            <div><h2>دوره‌های آموزشی</h2><p>لیست تمام دوره‌های موجود در آموزشگاه</p></div>
          </div>

          <div className="academy-admin-filters" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#94a3b8' }} />
              <input type="text" placeholder="جستجوی دوره..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }} />
            </div>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, minWidth: 140 }}>
              <option value="all">همه سطوح</option>
              {levels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="academy-admin-list-empty"><GraduationCap /><p>دوره‌ای یافت نشد.</p></div>
          ) : (
            <div className="academy-admin-courses-grid">
              {filtered.map((c) => (
                <div key={c.id} className="academy-admin-course-card">
                  <div className="academy-admin-course-card-image">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt={c.title} />
                    ) : (
                      <div className="academy-admin-course-card-no-image"><GraduationCap /></div>
                    )}
                    {c.enrolled && <span className="academy-admin-badge badge-success" style={{ position: 'absolute', top: 10, left: 10 }}>ثبت‌نام شده</span>}
                    {c.level && <span className="academy-admin-badge badge-neutral" style={{ position: 'absolute', top: 10, right: 10 }}>{c.level}</span>}
                  </div>
                  <div className="academy-admin-course-card-body">
                    <h4>{c.title}</h4>
                    {c.description && <p className="academy-admin-course-card-desc">{c.description}</p>}
                    <div className="academy-admin-course-card-meta">
                      {c.teacherName && <span><strong>مدرس:</strong> {c.teacherName}</span>}
                      {c.code && <span><strong>کد:</strong> {c.code}</span>}
                    </div>
                    {c.price > 0 && (
                      <div className="academy-admin-course-card-price">{c.price.toLocaleString('fa-IR')} تومان</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
