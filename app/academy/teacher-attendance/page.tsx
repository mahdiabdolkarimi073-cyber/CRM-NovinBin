'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Clock,
  CalendarDays,
  CheckCircle2,
  X,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Save,
  Filter,
} from 'lucide-react';

type User = { firstName: string; lastName: string; username: string; avatarUrl?: string | null };
type StudentInfo = {
  id: string;
  fullName: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  unexcusedCount: number;
};
type SessionInfo = {
  id: string;
  studentId: string;
  studentName: string;
  startsAt: string;
  weekday: string;
  time: string;
  durationMin: number;
  status: string;
  lateMinutes: number | null;
  note: string | null;
};
type ClassInfo = {
  id: string;
  title: string;
  level: string | null;
  studentCount: number;
  sessionCount: number;
  students: StudentInfo[];
  sessions: SessionInfo[];
  attendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    unexcused: number;
    rate: number;
  };
};

const teacherNavItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/dashboard', active: false },
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/teacher-classes', active: false },
  { label: 'حضور و غیاب', icon: CheckSquare, href: '/academy/teacher-attendance', active: true },
  { label: 'سوابق تحصیلی', icon: GraduationCap, href: '/academy/education-record', active: false },
  { label: 'ثبت‌نام', icon: ClipboardList, href: '/academy/registration', active: false },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance', active: false },
  { label: 'پروفایل', icon: UserRound, href: '/academy/classes', active: false },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes', active: false },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  present: { label: 'حاضر', color: '#10B981', bg: '#10B9811A', icon: CheckCircle2 },
  absent: { label: 'غایب', color: '#EF4444', bg: '#EF44441A', icon: X },
  late: { label: 'تأخیر', color: '#F59E0B', bg: '#F59E0B1A', icon: AlertTriangle },
  excused: { label: 'موجه', color: '#2563EB', bg: '#2563EB1A', icon: ShieldCheck },
  unexcused: { label: 'غیرموجه', color: '#8B5CF6', bg: '#8B5CF61A', icon: ShieldAlert },
  scheduled: { label: 'برنامه‌ریزی شده', color: '#64748B', bg: '#F1F5F9', icon: Clock },
};

const STATUS_ORDER = ['present', 'late', 'absent', 'excused', 'unexcused'];

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}
const faNum = (n: number) => n.toLocaleString('fa-IR');

export default function TeacherAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { status: string; lateMinutes: number | null; note: string | null }>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/teacher-attendance', { headers: { 'Cache-Control': 'no-store' } })
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

  const filteredSessions = useMemo(() => {
    if (!activeClass) return [];
    let list = activeClass.sessions;
    if (statusFilter !== 'all') {
      list = list.filter((s: SessionInfo) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim();
      list = list.filter((s: SessionInfo) => s.studentName.includes(q));
    }
    return list;
  }, [activeClass, statusFilter, search]);

  function setSessionStatus(sessionId: string, status: string) {
    setPendingUpdates((prev) => {
      const existing = prev[sessionId];
      const original = activeClass?.sessions.find((s: SessionInfo) => s.id === sessionId);
      return {
        ...prev,
        [sessionId]: {
          status,
          lateMinutes: status === 'late' ? (existing?.lateMinutes ?? original?.lateMinutes ?? 5) : null,
          note: existing?.note ?? original?.note ?? null,
        },
      };
    });
  }

  function setLateMinutes(sessionId: string, minutes: number) {
    setPendingUpdates((prev) => {
      const existing = prev[sessionId] || { status: 'late', lateMinutes: 5, note: null };
      return { ...prev, [sessionId]: { ...existing, lateMinutes: minutes } };
    });
  }

  function setNote(sessionId: string, note: string) {
    setPendingUpdates((prev) => {
      const existing = prev[sessionId] || { status: 'late', lateMinutes: 5, note: null };
      return { ...prev, [sessionId]: { ...existing, note } };
    });
  }

  async function saveAll() {
    const entries = Object.entries(pendingUpdates);
    if (entries.length === 0) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const updates = entries.map(([sessionId, val]) => ({
        sessionId,
        status: val.status,
        lateMinutes: val.lateMinutes,
        note: val.note,
      }));
      const res = await fetch('/api/academy/teacher-attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPendingUpdates({});
        setSaveMsg('تغییرات با موفقیت ذخیره شد');
        setClasses((prev) =>
          prev.map((cls) => {
            if (cls.id !== activeClassId) return cls;
            return {
              ...cls,
              sessions: cls.sessions.map((s: SessionInfo) => {
                const upd = entries.find(([id]) => id === s.id);
                if (!upd) return s;
                const [_, val] = upd;
                return { ...s, status: val.status, lateMinutes: val.lateMinutes, note: val.note };
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

  const hasPending = Object.keys(pendingUpdates).length > 0;

  if (loading) {
    return <div className="teacher-dashboard-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user) {
    return <div className="teacher-dashboard-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  const overallStats = classes.reduce(
    (acc, c) => {
      acc.present += c.attendance.present;
      acc.absent += c.attendance.absent;
      acc.late += c.attendance.late;
      acc.excused += c.attendance.excused;
      acc.unexcused += c.attendance.unexcused;
      acc.total += c.attendance.total;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0, unexcused: 0, total: 0 }
  );

  const statCards = [
    { icon: CheckCircle2, value: overallStats.present, label: 'حاضر', color: '#10B981' },
    { icon: X, value: overallStats.absent, label: 'غایب', color: '#EF4444' },
    { icon: AlertTriangle, value: overallStats.late, label: 'تأخیر', color: '#F59E0B' },
    { icon: ShieldCheck, value: overallStats.excused, label: 'موجه', color: '#2563EB' },
    { icon: ShieldAlert, value: overallStats.unexcused, label: 'غیرموجه', color: '#8B5CF6' },
    { icon: CalendarDays, value: overallStats.total, label: 'کل جلسات', color: '#64748B' },
  ];

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
              <h2>حضور و غیاب</h2>
              <p>ثبت و مدیریت وضعیت حضور دانش‌آموزان در جلسات</p>
            </div>
          </section>

          <section className="teacher-stat-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
            {statCards.map((card) => (
              <div key={card.label} className="teacher-stat-card">
                <span className="teacher-stat-icon" style={{ background: `${card.color}1A`, color: card.color }}><card.icon /></span>
                <div>
                  <strong>{faNum(card.value)}</strong>
                  <small>{card.label}</small>
                </div>
              </div>
            ))}
          </section>

          {classes.length === 0 ? (
            <div className="teacher-list-empty" style={{ padding: '48px 16px' }}>
              <CheckSquare />
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
                      onClick={() => { setActiveClassId(c.id); setPendingUpdates({}); setSearch(''); setStatusFilter('all'); }}
                    >
                      {c.title}
                      <span className="teacher-ta-tab-count">{faNum(c.sessionCount)}</span>
                    </button>
                  ))}
                </div>
              </section>

              {activeClass && (
                <>
                  <section className="teacher-ta-class-summary">
                    <div className="teacher-ta-summary-left">
                      <h3>{activeClass.title}</h3>
                      <div className="teacher-ta-summary-meta">
                        <span><Users /> {faNum(activeClass.studentCount)} دانش‌آموز</span>
                        <span><CalendarDays /> {faNum(activeClass.sessionCount)} جلسه</span>
                        <span className="teacher-ta-rate-badge" style={{
                          background: activeClass.attendance.rate >= 80 ? '#10B9811A' : activeClass.attendance.rate >= 60 ? '#F59E0B1A' : '#EF44441A',
                          color: activeClass.attendance.rate >= 80 ? '#10B981' : activeClass.attendance.rate >= 60 ? '#F59E0B' : '#EF4444',
                        }}>
                          {faNum(activeClass.attendance.rate)}٪ حضور
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="teacher-ta-filters">
                    <div className="teacher-ta-search-box">
                      <Search />
                      <input
                        type="text"
                        placeholder="جستجوی نام دانش‌آموز..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="teacher-ta-filter-chips">
                      <button type="button" className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>همه</button>
                      {STATUS_ORDER.map((st) => {
                        const cfg = STATUS_CONFIG[st];
                        return (
                          <button
                            key={st}
                            type="button"
                            className={statusFilter === st ? 'active' : ''}
                            onClick={() => setStatusFilter(st)}
                            style={statusFilter === st ? { background: cfg.color, borderColor: cfg.color } : {}}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="teacher-ta-table-section">
                    {filteredSessions.length === 0 ? (
                      <div className="teacher-list-empty" style={{ padding: '40px 16px' }}>
                        <CalendarDays />
                        <p>{search || statusFilter !== 'all' ? 'جلسه‌ای با این فیلتر یافت نشد.' : 'هنوز جلسه‌ای ثبت نشده است.'}</p>
                      </div>
                    ) : (
                      <div className="teacher-ta-table-wrap">
                        <table className="teacher-ta-table">
                          <thead>
                            <tr>
                              <th>دانش‌آموز</th>
                              <th>تاریخ</th>
                              <th>روز / ساعت</th>
                              <th>وضعیت</th>
                              <th>تأخیر (دقیقه)</th>
                              <th>توضیحات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSessions.map((session: SessionInfo) => {
                              const pending = pendingUpdates[session.id];
                              const currentStatus = pending?.status || session.status;
                              const currentLate = pending?.lateMinutes ?? session.lateMinutes;
                              const currentNote = pending?.note ?? session.note;
                              const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.scheduled;
                              const isModified = !!pending;

                              return (
                                <tr key={session.id} className={isModified ? 'teacher-ta-row-modified' : ''}>
                                  <td className="teacher-ta-student-cell">
                                    <div className="teacher-ta-avatar">{session.studentName.slice(0, 1)}</div>
                                    <span>{session.studentName}</span>
                                  </td>
                                  <td className="teacher-ta-date-cell">{jalaliDate(session.startsAt)}</td>
                                  <td className="teacher-ta-day-cell">
                                    <span>{session.weekday}</span>
                                    <small>{session.time}</small>
                                  </td>
                                  <td>
                                    <div className="teacher-ta-status-buttons">
                                      {STATUS_ORDER.map((st) => {
                                        const sCfg = STATUS_CONFIG[st];
                                        const isActive = currentStatus === st;
                                        return (
                                          <button
                                            key={st}
                                            type="button"
                                            className={`teacher-ta-status-btn ${isActive ? 'active' : ''}`}
                                            onClick={() => setSessionStatus(session.id, st)}
                                            title={sCfg.label}
                                            style={isActive ? { background: sCfg.color, borderColor: sCfg.color, color: '#fff' } : { color: sCfg.color, borderColor: sCfg.color + '40' }}
                                          >
                                            <sCfg.icon />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="teacher-ta-late-cell">
                                    {currentStatus === 'late' ? (
                                      <input
                                        type="number"
                                        min={0}
                                        max={120}
                                        value={currentLate ?? 0}
                                        onChange={(e) => setLateMinutes(session.id, Number(e.target.value))}
                                        className="teacher-ta-late-input"
                                      />
                                    ) : (
                                      <span className="teacher-ta-dash">—</span>
                                    )}
                                  </td>
                                  <td className="teacher-ta-note-cell">
                                    <input
                                      type="text"
                                      value={currentNote ?? ''}
                                      onChange={(e) => setNote(session.id, e.target.value)}
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
                        <span><b>{faNum(Object.keys(pendingUpdates).length)}</b> تغییر ذخیره نشده</span>
                      ) : saveMsg ? (
                        <span className="teacher-ta-save-success">{saveMsg}</span>
                      ) : (
                        <span className="teacher-ta-save-idle">همه تغییرات ذخیره شده</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="teacher-ta-save-btn"
                      disabled={!hasPending || saving}
                      onClick={saveAll}
                    >
                      {saving ? <Loader2 className="animate-spin" /> : <Save />}
                      ذخیره تغییرات
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
