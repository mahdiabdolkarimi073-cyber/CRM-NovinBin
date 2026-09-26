'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, GraduationCap, Search, CreditCard, CheckCircle2, Clock, User, Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { StudentShell } from '@/components/academy/student-shell';

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

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}

const faNum = (n: number) => n.toLocaleString('fa-IR');

export default function CourseCatalogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [payingId, setPayingId] = useState<string | null>(null);

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

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  async function handleEnroll(course: Course) {
    if (course.price > 0) {
      setPayingId(course.id);
      try {
        const res = await fetch('/api/academy/payment/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'course', courseId: course.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'خطا در شروع پرداخت');
        if (data.redirectUrl) {
          toast.success('در حال انتقال به درگاه پرداخت بانک ملت...');
          window.location.href = data.redirectUrl;
        } else {
          throw new Error('لینک پرداخت دریافت نشد');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'پرداخت ناموفق بود');
      } finally {
        setPayingId(null);
      }
    } else {
      try {
        const res = await fetch('/api/academy/course-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId: course.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ثبت‌نام ناموفق بود');
        toast.success('ثبت‌نام در دوره با موفقیت انجام شد');
        fetchData();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'ثبت‌نام ناموفق بود');
      }
    }
  }

  const levels = Array.from(new Set(courses.map((c) => c.level).filter(Boolean))) as string[];
  const filtered = courses.filter((c) => {
    if (filterLevel !== 'all' && c.level !== filterLevel) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!c.title.toLowerCase().includes(s) && !(c.teacherName?.toLowerCase().includes(s)) && !(c.description?.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="student-shell-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user) {
    return <div className="student-shell-loading"><p>خطا در بارگذاری</p></div>;
  }

  return (
    <StudentShell
      user={user}
      activePath="/academy/course-catalog"
      pageTitle="دوره‌های آموزشی"
      pageSubtitle="لیست تمام دوره‌های موجود — ثبت‌نام و پرداخت آنلاین"
      onLogout={logout}
    >
      <section className="student-page-hero">
        <div>
          <h2>دوره‌های آموزشی</h2>
          <p>دوره‌هایی که مدیر آموزشگاه اضافه کرده است — می‌توانید مستقیم ثبت‌نام کنید</p>
        </div>
        <div className="student-page-hero-badge">
          <strong>{faNum(courses.length)}</strong>
          <span>دوره فعال</span>
        </div>
      </section>

      <div className="student-page-filters" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="جستجوی دوره..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
          />
        </div>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, minWidth: 140 }}>
          <option value="all">همه سطوح</option>
          {levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="student-page-empty">
          <GraduationCap />
          <p>دوره‌ای یافت نشد.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((c) => (
            <div key={c.id} className="student-course-card" style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', height: 160, background: '#f1f5f9', overflow: 'hidden' }}>
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                    <GraduationCap style={{ width: 48, height: 48 }} />
                  </div>
                )}
                {c.enrolled && (
                  <span style={{ position: 'absolute', top: 10, left: 10, background: '#22C55E', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 style={{ width: 14, height: 14 }} /> ثبت‌نام شده
                  </span>
                )}
                {c.level && (
                  <span style={{ position: 'absolute', top: 10, right: 10, background: '#2563EB', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>
                    {c.level}
                  </span>
                )}
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>{c.title}</h3>
                {c.description && <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</p>}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {c.teacherName && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                      <User style={{ width: 14, height: 14 }} /> {c.teacherName}
                    </span>
                  )}
                  {c.code && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                      <Tag style={{ width: 14, height: 14 }} /> کد: {c.code}
                    </span>
                  )}
                  {c.startDate && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                      <Clock style={{ width: 14, height: 14 }} /> {jalaliDate(c.startDate)}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    {c.price > 0 ? (
                      <strong style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>{faNum(c.price)} <span style={{ fontSize: 12, fontWeight: 500 }}>تومان</span></strong>
                    ) : (
                      <strong style={{ fontSize: 16, fontWeight: 700, color: '#22C55E' }}>رایگان</strong>
                    )}
                  </div>
                  {c.enrolled ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#22C55E', background: '#F0FDF4', padding: '8px 14px', borderRadius: 8 }}>
                      <CheckCircle2 style={{ width: 16, height: 16 }} /> ثبت‌نام شده
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="student-page-btn primary"
                      disabled={payingId === c.id}
                      onClick={() => handleEnroll(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#2563EB', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      {payingId === c.id ? (
                        <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />
                      ) : c.price > 0 ? (
                        <CreditCard style={{ width: 16, height: 16 }} />
                      ) : (
                        <GraduationCap style={{ width: 16, height: 16 }} />
                      )}
                      {c.price > 0 ? 'ثبت‌نام و پرداخت' : 'ثبت‌نام'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentShell>
  );
}
