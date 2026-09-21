'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CheckCircle,
  X,
  Clock,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StudentShell } from '@/components/academy/student-shell';

type UserInfo = { firstName: string; lastName: string; avatarUrl?: string | null };
type ClassInfo = { title: string; level: string | null; status: string; schedule: string | null };
type Stats = { total: number; present: number; absent: number; late: number; attendanceRate: number };
type SessionRow = {
  id: string;
  date: string;
  day: string;
  status: 'present' | 'absent' | 'late';
  lateMinutes: number | null;
  note: string | null;
};

function jalaliDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}

const faNum = (n: number) => n.toLocaleString('fa-IR');

const STATUS_LABEL: Record<string, string> = { present: 'حاضر', absent: 'غایب', late: 'تأخیر' };

export default function AttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/attendance', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setClassInfo(data.classInfo);
        setStats(data.stats);
        setSessions(data.sessions || []);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return <div className="student-shell-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user || !stats) {
    return <div className="student-shell-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statCards = [
    { key: 'present', label: 'حاضر', value: stats.present, color: '#22C55E', bg: '#F0FDF4', icon: CheckCircle },
    { key: 'absent', label: 'غایب', value: stats.absent, color: '#EF4444', bg: '#FEF2F2', icon: X },
    { key: 'late', label: 'تأخیر', value: stats.late, color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
    { key: 'total', label: 'کل جلسات', value: stats.total, color: '#2563EB', bg: '#EFF6FF', icon: Calendar },
  ];

  return (
    <StudentShell
      user={user}
      activePath="/academy/attendance"
      pageTitle="حضور و غیاب من"
      pageSubtitle="وضعیت حضور شما در کلاس‌ها و جزئیات جلسات"
      onLogout={logout}
    >
      <section className="student-page-hero">
        <div>
          <h2>حضور و غیاب</h2>
          <p>مدیریت حضور در کلاس‌ها</p>
        </div>
        <div className="student-page-hero-badge">
          <strong>{faNum(stats.attendanceRate)}%</strong>
          <span>درصد حضور</span>
        </div>
      </section>

      <section className="student-page-stats">
        {statCards.map((card) => (
          <div key={card.key} className="student-page-stat-card">
            <span className="student-page-stat-icon" style={{ background: card.bg, color: card.color }}><card.icon /></span>
            <div className="student-page-stat-body">
              <span className="student-page-stat-label">{card.label}</span>
              <strong className="student-page-stat-value" style={{ color: card.color }}>{faNum(card.value)} جلسه</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="student-page-panel">
        <div className="student-page-panel-heading">
          <div>
            <h3>{classInfo?.title || 'کلاس فعال'}</h3>
            {classInfo?.schedule && <p>{classInfo.schedule}</p>}
          </div>
          {classInfo && (
            <span className={`student-page-badge ${classInfo.status === 'active' ? 'present' : 'pending'}`}>
              {classInfo.status === 'active' ? 'کلاس فعال' : 'غیرفعال'}
            </span>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="student-page-empty"><Calendar /><p>هنوز جلسه‌ای ثبت نشده است.</p></div>
        ) : (
          <div className="student-page-table-wrap">
            <table className="student-page-table">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>روز</th>
                  <th>وضعیت</th>
                  <th>تأخیر (دقیقه)</th>
                  <th>توضیحات</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td>{jalaliDate(row.date)}</td>
                    <td>{row.day}</td>
                    <td>
                      <span className={`student-page-badge ${row.status}`}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td style={{ color: row.lateMinutes ? '#F59E0B' : '#CBD5E1' }}>
                      {row.lateMinutes ? `${faNum(row.lateMinutes)} دقیقه` : '—'}
                    </td>
                    <td style={{ color: row.note ? '#475569' : '#CBD5E1' }}>
                      {row.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sessions.length > 0 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
            <a href="#" style={{fontSize:13,color:'#2563EB',textDecoration:'none',fontWeight:500}}>مشاهده همه جلسات</a>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <button type="button" className="student-page-btn secondary" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="قبلی"><ChevronRight style={{width:16,height:16}} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className="student-page-btn secondary"
                  style={p === currentPage ? { background: '#2563EB', color: '#fff', borderColor: '#2563EB' } : {}}
                  onClick={() => setPage(p)}
                >
                  {faNum(p)}
                </button>
              ))}
              <button type="button" className="student-page-btn secondary" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} aria-label="بعدی"><ChevronLeft style={{width:16,height:16}} /></button>
            </div>
          </div>
        )}
      </section>
    </StudentShell>
  );
}
