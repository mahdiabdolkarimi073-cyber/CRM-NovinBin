'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  GraduationCap,
  ClipboardList,
  Wallet,
  UserRound,
  Settings,
  LifeBuoy,
  Menu,
  Search,
  Bell,
  LogOut,
  Loader2,
  Users,
  Save,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  Gauge,
} from 'lucide-react';

type User = { firstName: string; lastName: string; username: string; avatarUrl?: string | null };
type StudentEval = {
  id: string;
  fullName: string;
  strengths: string | null;
  weaknesses: string | null;
  learningStatus: string | null;
  educationalSuggestion: string | null;
  currentLevel: string | null;
  suggestedLevel: string | null;
  evaluationId: string | null;
};
type ClassEvals = {
  id: string;
  title: string;
  level: string | null;
  studentCount: number;
  students: StudentEval[];
  statusCounts: Record<string, number>;
};

const teacherNavItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/dashboard', active: false },
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/teacher-classes', active: false },
  { label: 'حضور و غیاب', icon: CheckSquare, href: '/academy/teacher-attendance', active: false },
  { label: 'نمرات دانش‌آموزان', icon: GraduationCap, href: '/academy/teacher-grades', active: false },
  { label: 'ارزیابی مدرس', icon: ClipboardList, href: '/academy/teacher-evaluation', active: true },
  { label: 'ثبت‌نام', icon: ClipboardList, href: '/academy/registration', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance', active: false },
  { label: 'پروفایل', icon: UserRound, href: '/academy/classes', active: false },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes', active: false },
];

const LEARNING_STATUSES = [
  { value: 'excellent', label: 'عالی', color: '#10B981' },
  { value: 'good', label: 'خوب', color: '#2563EB' },
  { value: 'average', label: 'متوسط', color: '#F59E0B' },
  { value: 'weak', label: 'ضعیف', color: '#EF4444' },
  { value: 'improving', label: 'در حال پیشرفت', color: '#8B5CF6' },
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}
const faNum = (n: number) => n.toLocaleString('fa-IR');

export default function TeacherEvaluationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassEvals[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Record<string, Record<string, string | null>>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/teacher-evaluation', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setClasses(data.classes || []);
        if (data.classes?.length > 0) setActiveClassId(data.classes[0].id);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  const activeClass = useMemo(() => classes.find((c) => c.id === activeClassId) || null, [classes, activeClassId]);

  const filteredStudents = useMemo(() => {
    if (!activeClass) return [];
    if (!search.trim()) return activeClass.students;
    const q = search.trim();
    return activeClass.students.filter((s: StudentEval) => s.fullName.includes(q));
  }, [activeClass, search]);

  function setField(studentId: string, field: string, value: string) {
    setPending((prev) => {
      const existing = prev[studentId] || {};
      return { ...prev, [studentId]: { ...existing, [field]: value } };
    });
  }

  async function saveAll() {
    if (!activeClassId || Object.keys(pending).length === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const updates = Object.entries(pending).map(([studentId, vals]) => ({
        studentId,
        courseId: activeClassId,
        ...vals,
      }));
      const res = await fetch('/api/academy/teacher-evaluation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPending({});
        setSaveMsg('ارزیابی‌ها با موفقیت ذخیره شد');
        setClasses((prev) =>
          prev.map((cls) => {
            if (cls.id !== activeClassId) return cls;
            return {
              ...cls,
              students: cls.students.map((s: StudentEval) => {
                const upd = pending[s.id];
                if (!upd) return s;
                return {
                  ...s,
                  strengths: (upd.strengths as string) ?? s.strengths,
                  weaknesses: (upd.weaknesses as string) ?? s.weaknesses,
                  learningStatus: (upd.learningStatus as string) ?? s.learningStatus,
                  educationalSuggestion: (upd.educationalSuggestion as string) ?? s.educationalSuggestion,
                  currentLevel: (upd.currentLevel as string) ?? s.currentLevel,
                  suggestedLevel: (upd.suggestedLevel as string) ?? s.suggestedLevel,
                };
              }),
            };
          })
        );
      } else {
        setSaveMsg('خطا در ذخیره‌سازی');
      }
    } catch {
      setSaveMsg('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }

  const hasPending = Object.keys(pending).length > 0;

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
              <h2>ارزیابی مدرس</h2>
              <p>ثبت نقاط قوت، ضعف، وضعیت یادگیری و پیشنهاد سطح برای هر دانش‌آموز</p>
            </div>
          </section>

          {classes.length === 0 ? (
            <div className="teacher-list-empty" style={{ padding: '48px 16px' }}>
              <ClipboardList />
              <p>هنوز کلاسی به شما تخصیص داده نشده است.</p>
            </div>
          ) : (
            <>
              <section className="teacher-ta-class-selector">
                <div className="teacher-ta-selector-label">انتخاب کلاس:</div>
                <div className="teacher-ta-class-tabs">
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`teacher-ta-class-tab ${c.id === activeClassId ? 'active' : ''}`}
                      onClick={() => { setActiveClassId(c.id); setPending({}); setSearch(''); }}
                    >
                      {c.title}
                      <span className="teacher-ta-tab-count">{faNum(c.studentCount)}</span>
                    </button>
                  ))}
                </div>
              </section>

              {activeClass && (
                <>
                  <section className="teacher-ta-filters">
                    <div className="teacher-ta-search-box">
                      <Search />
                      <input type="text" placeholder="جستجوی نام دانش‌آموز..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                  </section>

                  <section className="teacher-te-cards">
                    {filteredStudents.length === 0 ? (
                      <div className="teacher-list-empty" style={{ padding: '40px 16px' }}>
                        <Users />
                        <p>{search ? 'دانش‌آموزی با این نام یافت نشد.' : 'هنوز دانش‌آموزی در این کلاس ثبت نشده است.'}</p>
                      </div>
                    ) : (
                      filteredStudents.map((student: StudentEval) => {
                        const studentPending = pending[student.id];
                        const isModified = !!studentPending;
                        const currentStatus = (studentPending?.learningStatus as string) ?? student.learningStatus;
                        const currentLevel = (studentPending?.currentLevel as string) ?? student.currentLevel;
                        const suggestedLevel = (studentPending?.suggestedLevel as string) ?? student.suggestedLevel;

                        return (
                          <article key={student.id} className={`teacher-te-card ${isModified ? 'teacher-te-card-modified' : ''}`}>
                            <div className="teacher-te-card-header">
                              <div className="teacher-ta-avatar">{student.fullName.slice(0, 1)}</div>
                              <div>
                                <strong>{student.fullName}</strong>
                                {isModified && <span className="teacher-te-badge">ویرایش نشده</span>}
                              </div>
                            </div>

                            <div className="teacher-te-fields">
                              <div className="teacher-te-field">
                                <label><TrendingUp /> نقاط قوت</label>
                                <textarea
                                  value={(studentPending?.strengths as string) ?? student.strengths ?? ''}
                                  onChange={(e) => setField(student.id, 'strengths', e.target.value)}
                                  placeholder="نقاط قوت دانش‌آموز..."
                                  rows={2}
                                  className="teacher-te-textarea"
                                />
                              </div>

                              <div className="teacher-te-field">
                                <label><TrendingDown /> نقاط ضعف</label>
                                <textarea
                                  value={(studentPending?.weaknesses as string) ?? student.weaknesses ?? ''}
                                  onChange={(e) => setField(student.id, 'weaknesses', e.target.value)}
                                  placeholder="نقاط ضعف دانش‌آموز..."
                                  rows={2}
                                  className="teacher-te-textarea"
                                />
                              </div>

                              <div className="teacher-te-field">
                                <label><Gauge /> وضعیت یادگیری</label>
                                <div className="teacher-te-status-chips">
                                  {LEARNING_STATUSES.map((st) => (
                                    <button
                                      key={st.value}
                                      type="button"
                                      className={`teacher-te-status-chip ${currentStatus === st.value ? 'active' : ''}`}
                                      onClick={() => setField(student.id, 'learningStatus', st.value)}
                                      style={currentStatus === st.value ? { background: st.color, borderColor: st.color, color: '#fff' } : { color: st.color, borderColor: st.color + '40' }}
                                    >
                                      {st.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="teacher-te-field">
                                <label><Lightbulb /> پیشنهاد آموزشی</label>
                                <textarea
                                  value={(studentPending?.educationalSuggestion as string) ?? student.educationalSuggestion ?? ''}
                                  onChange={(e) => setField(student.id, 'educationalSuggestion', e.target.value)}
                                  placeholder="پیشنهاد آموزشی..."
                                  rows={2}
                                  className="teacher-te-textarea"
                                />
                              </div>

                              <div className="teacher-te-level-row">
                                <div className="teacher-te-field">
                                  <label><Target /> سطح فعلی</label>
                                  <select
                                    value={currentLevel ?? ''}
                                    onChange={(e) => setField(student.id, 'currentLevel', e.target.value)}
                                    className="teacher-te-select"
                                  >
                                    <option value="">انتخاب...</option>
                                    {LEVELS.map((lv) => (
                                      <option key={lv} value={lv}>{lv}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="teacher-te-field">
                                  <label><Target /> پیشنهاد سطح بعد</label>
                                  <select
                                    value={suggestedLevel ?? ''}
                                    onChange={(e) => setField(student.id, 'suggestedLevel', e.target.value)}
                                    className="teacher-te-select"
                                  >
                                    <option value="">انتخاب...</option>
                                    {LEVELS.map((lv) => (
                                      <option key={lv} value={lv}>{lv}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </section>

                  <div className="teacher-ta-save-bar">
                    <div className="teacher-ta-save-info">
                      {hasPending ? (
                        <span><b>{faNum(Object.keys(pending).length)}</b> تغییر ذخیره نشده</span>
                      ) : saveMsg ? (
                        <span className="teacher-ta-save-success">{saveMsg}</span>
                      ) : (
                        <span className="teacher-ta-save-idle">همه ارزیابی‌ها ذخیره شده</span>
                      )}
                    </div>
                    <button type="button" className="teacher-ta-save-btn" disabled={!hasPending || saving} onClick={saveAll}>
                      {saving ? <Loader2 className="animate-spin" /> : <Save />}
                      ذخیره ارزیابی‌ها
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
