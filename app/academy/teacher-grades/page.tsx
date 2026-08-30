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
  Award,
  FileText,
  Mic,
  Headphones,
  BookCheck,
  PenLine,
} from 'lucide-react';

type User = { firstName: string; lastName: string; username: string; avatarUrl?: string | null };
type StudentGrade = {
  id: string;
  fullName: string;
  examScore: number | null;
  assignmentScore: number | null;
  participationScore: number | null;
  speakingScore: number | null;
  listeningScore: number | null;
  readingScore: number | null;
  writingScore: number | null;
  note: string | null;
  gradeId: string | null;
};
type ClassGrades = {
  id: string;
  title: string;
  level: string | null;
  studentCount: number;
  students: StudentGrade[];
  averages: Record<string, number>;
  counts: Record<string, number>;
};

const teacherNavItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/dashboard', active: false },
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/teacher-classes', active: false },
  { label: 'حضور و غیاب', icon: CheckSquare, href: '/academy/teacher-attendance', active: false },
  { label: 'نمرات دانش‌آموزان', icon: GraduationCap, href: '/academy/teacher-grades', active: true },
  { label: 'ارزیابی مدرس', icon: ClipboardList, href: '/academy/teacher-evaluation', active: false },
  { label: 'ثبت‌نام', icon: ClipboardList, href: '/academy/registration', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance', active: false },
  { label: 'پروفایل', icon: UserRound, href: '/academy/classes', active: false },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes', active: false },
];

const SCORE_FIELDS = [
  { key: 'examScore', label: 'نمره آزمون', icon: Award, color: '#2563EB' },
  { key: 'assignmentScore', label: 'تکلیف', icon: FileText, color: '#10B981' },
  { key: 'participationScore', label: 'مشارکت', icon: Users, color: '#F59E0B' },
  { key: 'speakingScore', label: 'Speaking', icon: Mic, color: '#8B5CF6' },
  { key: 'listeningScore', label: 'Listening', icon: Headphones, color: '#EC4899' },
  { key: 'readingScore', label: 'Reading', icon: BookCheck, color: '#06B6D4' },
  { key: 'writingScore', label: 'Writing', icon: PenLine, color: '#EF4444' },
] as const;

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}
const faNum = (n: number) => n.toLocaleString('fa-IR');

export default function TeacherGradesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassGrades[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Record<string, Record<string, number | string | null>>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/teacher-grades', { headers: { 'Cache-Control': 'no-store' } })
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
    return activeClass.students.filter((s: StudentGrade) => s.fullName.includes(q));
  }, [activeClass, search]);

  function setScore(studentId: string, field: string, value: string) {
    const numVal = value === '' ? null : Math.max(0, Math.min(20, Number(value)));
    setPending((prev) => {
      const existing = prev[studentId] || {};
      return { ...prev, [studentId]: { ...existing, [field]: numVal } };
    });
  }

  function setNote(studentId: string, value: string) {
    setPending((prev) => {
      const existing = prev[studentId] || {};
      return { ...prev, [studentId]: { ...existing, note: value } };
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
      const res = await fetch('/api/academy/teacher-grades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPending({});
        setSaveMsg('نمرات با موفقیت ذخیره شد');
        setClasses((prev) =>
          prev.map((cls) => {
            if (cls.id !== activeClassId) return cls;
            return {
              ...cls,
              students: cls.students.map((s: StudentGrade) => {
                const upd = pending[s.id];
                if (!upd) return s;
                return {
                  ...s,
                  examScore: (upd.examScore as number) ?? s.examScore,
                  assignmentScore: (upd.assignmentScore as number) ?? s.assignmentScore,
                  participationScore: (upd.participationScore as number) ?? s.participationScore,
                  speakingScore: (upd.speakingScore as number) ?? s.speakingScore,
                  listeningScore: (upd.listeningScore as number) ?? s.listeningScore,
                  readingScore: (upd.readingScore as number) ?? s.readingScore,
                  writingScore: (upd.writingScore as number) ?? s.writingScore,
                  note: (upd.note as string) ?? s.note,
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
              <h2>نمرات دانش‌آموزان</h2>
              <p>ثبت و مدیریت نمرات آزمون، تکلیف، مشارکت و مهارت‌های زبان</p>
            </div>
          </section>

          {classes.length === 0 ? (
            <div className="teacher-list-empty" style={{ padding: '48px 16px' }}>
              <GraduationCap />
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
                  <section className="teacher-tg-avg-grid">
                    {SCORE_FIELDS.map((field) => (
                      <div key={field.key} className="teacher-tg-avg-card">
                        <span className="teacher-tg-avg-icon" style={{ background: `${field.color}1A`, color: field.color }}><field.icon /></span>
                        <div>
                          <strong>{faNum(activeClass.averages[field.key] || 0)}</strong>
                          <small>{field.label}</small>
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="teacher-ta-filters">
                    <div className="teacher-ta-search-box">
                      <Search />
                      <input type="text" placeholder="جستجوی نام دانش‌آموز..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                  </section>

                  <section className="teacher-ta-table-section">
                    {filteredStudents.length === 0 ? (
                      <div className="teacher-list-empty" style={{ padding: '40px 16px' }}>
                        <Users />
                        <p>{search ? 'دانش‌آموزی با این نام یافت نشد.' : 'هنوز دانش‌آموزی در این کلاس ثبت نشده است.'}</p>
                      </div>
                    ) : (
                      <div className="teacher-tg-table-wrap">
                        <table className="teacher-tg-table">
                          <thead>
                            <tr>
                              <th>دانش‌آموز</th>
                              {SCORE_FIELDS.map((f) => (
                                <th key={f.key} className="teacher-tg-score-th">
                                  <f.icon style={{ width: 14, height: 14, color: f.color }} />
                                  {f.label}
                                </th>
                              ))}
                              <th>یادداشت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudents.map((student: StudentGrade) => {
                              const studentPending = pending[student.id];
                              const isModified = !!studentPending;
                              return (
                                <tr key={student.id} className={isModified ? 'teacher-ta-row-modified' : ''}>
                                  <td className="teacher-ta-student-cell">
                                    <div className="teacher-ta-avatar">{student.fullName.slice(0, 1)}</div>
                                    <span>{student.fullName}</span>
                                  </td>
                                  {SCORE_FIELDS.map((f) => {
                                    const origVal = (student as any)[f.key];
                                    const val = studentPending?.[f.key] ?? origVal;
                                    return (
                                      <td key={f.key}>
                                        <input
                                          type="number"
                                          min={0}
                                          max={20}
                                          step={0.5}
                                          value={val ?? ''}
                                          onChange={(e) => setScore(student.id, f.key, e.target.value)}
                                          className="teacher-tg-score-input"
                                          placeholder="—"
                                        />
                                      </td>
                                    );
                                  })}
                                  <td>
                                    <input
                                      type="text"
                                      value={(studentPending?.note as string) ?? student.note ?? ''}
                                      onChange={(e) => setNote(student.id, e.target.value)}
                                      placeholder="یادداشت..."
                                      className="teacher-ta-note-input"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <div className="teacher-ta-save-bar">
                    <div className="teacher-ta-save-info">
                      {hasPending ? (
                        <span><b>{faNum(Object.keys(pending).length)}</b> تغییر ذخیره نشده</span>
                      ) : saveMsg ? (
                        <span className="teacher-ta-save-success">{saveMsg}</span>
                      ) : (
                        <span className="teacher-ta-save-idle">همه نمرات ذخیره شده</span>
                      )}
                    </div>
                    <button type="button" className="teacher-ta-save-btn" disabled={!hasPending || saving} onClick={saveAll}>
                      {saving ? <Loader2 className="animate-spin" /> : <Save />}
                      ذخیره نمرات
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
