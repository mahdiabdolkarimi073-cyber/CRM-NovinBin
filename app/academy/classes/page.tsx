'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Plus,
  Clock,
  MapPin,
  Link as LinkIcon,
  Loader2,
  User,
} from 'lucide-react';
import { StudentShell } from '@/components/academy/student-shell';

type ClassItem = {
  id: string;
  courseId: string;
  course: string;
  code: string | null;
  description: string | null;
  teacher: string | null;
  room: string | null;
  onlineUrl: string | null;
  heldSessions: number;
  totalSessions: number;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  schedule: { weekday: string; startsAt: string; durationMin: number; room: string | null; onlineUrl: string | null }[];
};
type WeeklyItem = { id: string; weekday: string; title: string; startsAt: string; durationMin: number; teacherName: string | null; room: string | null; onlineUrl: string | null };
type Stats = { activeClasses: number; todaySessions: number; incompleteAssignments: number; averageScore: number };
type User = { firstName: string; lastName: string; avatarUrl?: string | null };

const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function timeOnly(iso: string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  }
}
function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}
function todayName() {
  const jsDay = new Date().getDay();
  return weekDays[(jsDay + 1) % 7];
}

function CheckCircle(props: any) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

export default function MyClassesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [weekly, setWeekly] = useState<WeeklyItem[]>([]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/classes', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setStats(data.stats);
        setClasses(data.classes || []);
        setWeekly(data.weeklySchedule || []);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  const today = useMemo(() => todayName(), []);
  const weeklyByDay = useMemo(() => {
    const map = new Map<string, WeeklyItem[]>();
    for (const item of weekly) {
      const arr = map.get(item.weekday) || [];
      arr.push(item);
      map.set(item.weekday, arr);
    }
    return map;
  }, [weekly]);

  if (loading) {
    return <div className="student-shell-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (error || !user || !stats) {
    return <div className="student-shell-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  return (
    <StudentShell
      user={user}
      activePath="/academy/classes"
      pageTitle="کلاس‌های من"
      pageSubtitle="جزئیات دوره‌ها و کلاس‌های ثبت‌نام‌شده شما"
      onLogout={logout}
    >
          <section className="student-page-hero">
            <div>
              <h2>کلاس‌های من</h2>
              <p>مدیریت کلاس‌ها و دوره‌های آموزشی</p>
            </div>
            <div className="student-page-hero-right">
              <span className="student-page-hero-badge"><strong>{stats.activeClasses}</strong><span>کلاس فعال</span></span>
              <button type="button" className="student-page-btn primary"><Plus /> کلاس جدید</button>
            </div>
          </section>

          <section className="student-page-stats">
            <div className="student-page-stat-card"><span className="student-page-stat-icon" style={{background:'#EFF6FF',color:'#2563EB'}}><BookOpen /></span><div className="student-page-stat-body"><span className="student-page-stat-label">کلاس‌های فعال</span><strong className="student-page-stat-value">{stats.activeClasses.toLocaleString('fa-IR')}</strong></div></div>
            <div className="student-page-stat-card"><span className="student-page-stat-icon" style={{background:'#ECFDF5',color:'#10B981'}}><CalendarDays /></span><div className="student-page-stat-body"><span className="student-page-stat-label">جلسات امروز</span><strong className="student-page-stat-value">{stats.todaySessions.toLocaleString('fa-IR')}</strong></div></div>
            <div className="student-page-stat-card"><span className="student-page-stat-icon" style={{background:'#FEF3C7',color:'#F59E0B'}}><ClipboardList /></span><div className="student-page-stat-body"><span className="student-page-stat-label">تکالیف ناقص</span><strong className="student-page-stat-value">{stats.incompleteAssignments.toLocaleString('fa-IR')}</strong></div></div>
            <div className="student-page-stat-card"><span className="student-page-stat-icon" style={{background:'#F5F3FF',color:'#8B5CF6'}}><GraduationCap /></span><div className="student-page-stat-body"><span className="student-page-stat-label">معدل کل</span><strong className="student-page-stat-value">{stats.averageScore.toLocaleString('fa-IR')}</strong></div></div>
          </section>

          <section className="student-page-panel">
            <div className="student-page-panel-heading"><div><h3>کلاس‌های من</h3><p>دوره‌های ثبت‌نام‌شده و جزئیات آن‌ها</p></div></div>
            {classes.length === 0 ? (
              <div className="student-page-empty"><BookOpen /><p>هنوز در کلاسی ثبت‌نام نکرده‌اید.</p></div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
              {classes.map((cls) => (
                <article key={cls.id} style={{background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:12,padding:18,display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div>
                      <h3 style={{fontSize:16,fontWeight:700,color:'#1E293B',margin:0}}>{cls.course}</h3>
                      {cls.code && <span style={{fontSize:12,color:'#94A3B8'}}>{cls.code}</span>}
                    </div>
                  </div>
                  {cls.description && <p style={{fontSize:13,color:'#64748B',lineHeight:1.6,margin:0}}>{cls.description}</p>}
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {cls.teacher && <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#64748B'}}><User style={{width:15,height:15}} /> <span>مدرس: {cls.teacher}</span></div>}
                    {cls.schedule.length > 0 && (
                      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#64748B'}}><Clock style={{width:15,height:15}} /> <span>{cls.schedule.map((s) => s.weekday).join('، ')} | {cls.schedule.map((s) => timeOnly(s.startsAt)).join(' - ')}</span></div>
                    )}
                    {cls.room && <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#64748B'}}><MapPin style={{width:15,height:15}} /> <span>اتاق: {cls.room}</span></div>}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#94A3B8'}}>
                    <span>شروع: {jalaliDate(cls.startDate)}</span>
                    <span>پایان: {jalaliDate(cls.endDate)}</span>
                  </div>
                  <div>
                    <div style={{height:6,borderRadius:3,background:'#F1F5F9',overflow:'hidden'}}><div style={{width:`${cls.progress}%`,height:'100%',borderRadius:3,background:'linear-gradient(90deg,#2563EB,#1D4ED8)'}} /></div>
                    <span style={{fontSize:12,color:'#64748B',marginTop:4,display:'block'}}>جلسه: {cls.heldSessions.toLocaleString('fa-IR')} / {cls.totalSessions.toLocaleString('fa-IR')}</span>
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:4}}>
                    {cls.onlineUrl && (
                      <a href={cls.onlineUrl} target="_blank" rel="noopener noreferrer" className="student-page-btn primary"><LinkIcon style={{width:15,height:15}} /> ورود به کلاس آنلاین</a>
                    )}
                    <button type="button" className="student-page-btn secondary">جزئیات</button>
                  </div>
                </article>
              ))}
              </div>
            )}
          </section>

          <section className="student-page-panel">
            <div className="student-page-panel-heading"><div><h3>برنامه هفتگی من</h3><p>برنامه کلاس‌های شما در طول هفته</p></div></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
              {weekDays.slice(0, 6).map((day) => {
                const items = weeklyByDay.get(day) || [];
                const isToday = day === today;
                return (
                  <div key={day} style={{borderRadius:10,overflow:'hidden',border:`1px solid ${isToday ? '#2563EB' : '#E2E8F0'}`}}>
                    <div style={{padding:'10px 12px',background:isToday ? '#2563EB' : '#F8FAFC',color:isToday ? '#fff' : '#475569',fontSize:13,fontWeight:600,textAlign:'center'}}>{day}</div>
                    <div style={{padding:8,display:'flex',flexDirection:'column',gap:6,minHeight:80}}>
                      {items.length === 0 ? (
                        <span style={{color:'#CBD5E1',textAlign:'center',fontSize:13,padding:'12px 0'}}>—</span>
                      ) : (
                        items.map((item) => (
                          <div key={item.id} style={{background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:6,padding:'6px 8px'}}>
                            <strong style={{display:'block',fontSize:12,fontWeight:600,color:'#1E293B'}}>{item.title}</strong>
                            <small style={{fontSize:11,color:'#64748B'}}>{timeOnly(item.startsAt)}</small>
                            {item.room && <small style={{display:'block',fontSize:11,color:'#94A3B8'}}>{item.room}</small>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
    </StudentShell>
  );
}
