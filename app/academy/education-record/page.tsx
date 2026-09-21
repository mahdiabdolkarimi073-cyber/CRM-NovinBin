'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Star,
  CheckCircle,
  Loader2,
  Phone,
  GraduationCap,
} from 'lucide-react';
import { StudentShell } from '@/components/academy/student-shell';

type User = { firstName: string; lastName: string; avatarUrl?: string | null; role: string };
type GradeRow = { label: string; score: number };
type RecordData = {
  currentLevel: string;
  currentLevelName: string | null;
  levelStartDate: string | null;
  placementResult: string;
  placementDate: string | null;
  targetLevel: string;
  targetLevelName: string | null;
  progressPercent: number;
  teacherRating: number;
  teacherComment: string | null;
  nextCourseTitle: string | null;
  nextCourseReasons: string[];
};
type ActiveCourse = { title: string; teacherName: string | null; level: string | null; progress: number };

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75;
  const rounded = rating - full >= 0.75 ? full + 1 : full;
  for (let i = 0; i < 5; i++) {
    if (i < rounded) {
      stars.push(<Star key={i} style={{width:18,height:18,color:'#F59E0B',fill:'#F59E0B'}} />);
    } else if (i === rounded && hasHalf) {
      stars.push(
        <span key={i} style={{position:'relative',display:'inline-flex'}}>
          <Star style={{width:18,height:18,color:'#E2E8F0'}} />
          <span style={{position:'absolute',top:0,left:0,overflow:'hidden',width:'50%'}}><Star style={{width:18,height:18,color:'#F59E0B',fill:'#F59E0B'}} /></span>
        </span>,
      );
    } else {
      stars.push(<Star key={i} style={{width:18,height:18,color:'#E2E8F0'}} />);
    }
  }
  return stars;
}

export default function EducationRecordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [activeCourse, setActiveCourse] = useState<ActiveCourse | null>(null);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [averageGrade, setAverageGrade] = useState(0);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/academy/education-record', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('نشست نامعتبر');
        const data = await res.json();
        if (cancelled) return;
        setUser(data.user);
        setRecord(data.record);
        setActiveCourse(data.activeCourse);
        setGrades(data.grades || []);
        setAverageGrade(data.averageGrade || 0);
      })
      .catch(() => { if (!cancelled) router.replace('/academy/login'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return <div className="student-shell-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user) {
    return <div className="student-shell-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  const currentLevel = record?.currentLevel || '—';
  const currentLevelName = record?.currentLevelName || '';
  const targetLevel = record?.targetLevel || '—';
  const targetLevelName = record?.targetLevelName || '';
  const progress = record?.progressPercent ?? 0;
  const teacherRating = record?.teacherRating ?? 0;
  const teacherComment = record?.teacherComment || '';
  const nextCourseTitle = record?.nextCourseTitle || '';
  const nextReasons = record?.nextCourseReasons || [];

  const gradesRows = grades;
  const avg = averageGrade;

  const levelCards = [
    { label: 'سطح فعلی', value: currentLevel, sub: currentLevelName, badge: 'فعال', date: `از تاریخ ${jalaliDate(record?.levelStartDate ?? null)}` },
    { label: 'نتیجه تعیین سطح', value: record?.placementResult || currentLevel, sub: '', badge: '', date: `تاریخ آزمون: ${jalaliDate(record?.placementDate ?? null)}` },
    { label: 'سطح هدف', value: targetLevel, sub: targetLevelName, badge: 'در حال هدف', date: '' },
  ];

  return (
    <StudentShell
      user={user}
      activePath="/academy/education-record"
      pageTitle="پرونده آموزشی من"
      pageSubtitle="گزارش کامل از وضعیت یادگیری و پیشرفت شما"
      onLogout={logout}
    >
      <section className="student-page-hero">
        <div>
          <h2>پرونده آموزشی</h2>
          <p>مسیر پیشرفت از سطح {currentLevel} به {targetLevel}</p>
        </div>
        <div className="student-page-hero-badge">
          <strong>{currentLevel}</strong>
          <span>{currentLevelName}</span>
        </div>
      </section>

      <section className="student-page-stats" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {levelCards.map((card, i) => (
          <div key={i} className="student-page-stat-card" style={{flexDirection:'column',alignItems:'flex-start',gap:4}}>
            <span className="student-page-stat-label">{card.label}</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <strong className="student-page-stat-value">{card.value}</strong>
              {card.badge && <span className={`student-page-badge ${card.badge === 'فعال' ? 'present' : 'pending'}`}>{card.badge}</span>}
            </div>
            {card.sub && <span style={{fontSize:12,color:'#94A3B8'}}>{card.sub}</span>}
            {card.date && <span style={{fontSize:11,color:'#94A3B8'}}>{card.date}</span>}
          </div>
        ))}
        <div className="student-page-stat-card" style={{flexDirection:'column',alignItems:'flex-start',gap:4}}>
          <span className="student-page-stat-label">میزان پیشرفت</span>
          <strong className="student-page-stat-value" style={{color:'#2563EB'}}>{progress}%</strong>
          <span style={{fontSize:12,color:'#94A3B8'}}>در مسیر رسیدن به سطح هدف</span>
          <div style={{width:'100%',height:6,borderRadius:3,background:'#F1F5F9',overflow:'hidden',marginTop:4}}>
            <div style={{width:`${progress}%`,height:'100%',borderRadius:3,background:'linear-gradient(90deg,#2563EB,#1D4ED8)'}} />
          </div>
        </div>
      </section>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        <section className="student-page-panel" style={{marginBottom:0}}>
          <div className="student-page-panel-heading"><div><h3>نمرات من</h3></div></div>
          {gradesRows.length > 0 ? (
            <div className="student-page-table-wrap">
              <table className="student-page-table">
                <thead>
                  <tr><th>نمره</th><th>نتایج</th></tr>
                </thead>
                <tbody>
                  {gradesRows.map((g, i) => (
                    <tr key={i}>
                      <td>{g.label}</td>
                      <td style={{fontWeight:700,color:'#1E293B'}}>{g.score}</td>
                    </tr>
                  ))}
                  <tr style={{background:'#F8FAFC'}}>
                    <td style={{fontWeight:700}}>میانگین کل</td>
                    <td style={{fontWeight:700,color:'#2563EB'}}>{avg}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="student-page-empty" style={{padding:'32px 16px'}}>
              <GraduationCap />
              <p>هنوز نمره‌ای توسط معلم ثبت نشده است.</p>
            </div>
          )}
        </section>

        <section className="student-page-panel" style={{marginBottom:0}}>
          <div className="student-page-panel-heading"><div><h3>ارزیابی مدرس</h3></div></div>
          {teacherRating > 0 ? (
            <>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <strong style={{fontSize:28,fontWeight:700,color:'#1E293B'}}>{teacherRating.toFixed(1)}</strong>
                <div style={{display:'flex',gap:2}}>{renderStars(teacherRating)}</div>
              </div>
              <p style={{fontSize:13,color:'#64748B',lineHeight:1.6,margin:0}}>{teacherComment || 'نظری ثبت نشده است.'}</p>
            </>
          ) : (
            <div className="student-page-empty" style={{padding:'32px 16px'}}>
              <Star />
              <p>هنوز ارزیابی‌ای ثبت نشده است.</p>
            </div>
          )}
        </section>
      </div>

      {nextCourseTitle && (
        <section className="student-page-panel">
          <div className="student-page-panel-heading"><div><h3>پیشنهاد دوره بعد</h3><p>{nextCourseTitle}</p></div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'center'}}>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:8}}>
              {nextReasons.map((reason, i) => (
                <li key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#475569'}}>
                  <CheckCircle style={{width:18,height:18,color:'#22C55E',flexShrink:0}} />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'flex-start'}}>
              <button type="button" className="student-page-btn primary">مشاهده جزئیات و ثبت‌نام</button>
              <div style={{fontSize:12,color:'#94A3B8'}}>
                <span>نیاز به کمک دارید؟ </span>
                <a href="#" style={{color:'#2563EB',textDecoration:'none'}}>با پشتیبانی در ارتباط باشید</a>
              </div>
              <button type="button" className="student-page-btn secondary"><Phone style={{width:15,height:15}} /> تماس با پشتیبانی</button>
            </div>
          </div>
        </section>
      )}
    </StudentShell>
  );
}
