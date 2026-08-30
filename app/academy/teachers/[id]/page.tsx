'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  CalendarDays, BookOpen, ArrowRight, FileText, Award, ClipboardCheck, FileSignature, Briefcase, GraduationCap, DollarSign,
} from 'lucide-react';

type TabKey = 'personal' | 'documents' | 'specialties' | 'schedule' | 'courses' | 'attendance' | 'salary' | 'settlement' | 'evaluation';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'personal', label: 'اطلاعات شخصی', icon: Users },
  { key: 'documents', label: 'مدارک', icon: FileText },
  { key: 'specialties', label: 'تخصص‌ها', icon: Award },
  { key: 'schedule', label: 'برنامه کاری', icon: CalendarDays },
  { key: 'courses', label: 'کلاس‌های فعال', icon: BookOpen },
  { key: 'attendance', label: 'حضور و غیاب', icon: ClipboardCheck },
  { key: 'salary', label: 'حق‌التدریس', icon: DollarSign },
  { key: 'settlement', label: 'تسویه حساب', icon: FileSignature },
  { key: 'evaluation', label: 'ارزیابی عملکرد', icon: Briefcase },
];

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'دانش‌آموزان', icon: Users, href: '/academy/students' },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers', active: true },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes' },
];

function formatJalali(date: string | null) {
  if (!date) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(date)); }
  catch { return new Date(date).toLocaleDateString('fa-IR'); }
}

function formatMoney(n: number) {
  return n.toLocaleString('fa-IR') + ' تومان';
}

const weekdayNames: Record<string, string> = {
  saturday: 'شنبه', sunday: 'یکشنبه', monday: 'دوشنبه', tuesday: 'سه‌شنبه',
  wednesday: 'چهارشنبه', thursday: 'پنجشنبه', friday: 'جمعه',
};

export default function TeacherRecordPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');

  const fetchData = useCallback(() => {
    fetch(`/api/academy/teacher-record?teacherId=${encodeURIComponent(teacherId)}`, { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (res.status === 403) { router.replace('/academy/login'); return; }
        if (res.ok) setData(await res.json());
      })
      .finally(() => setLoading(false));
  }, [teacherId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function logout() { await fetch('/api/academy/logout', { method: 'POST' }); router.replace('/academy/login'); }

  if (loading) return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="academy-admin-loading"><p>مدرس یافت نشد</p></div>;

  const { teacher, summary } = data;

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
          <button type="button" className="academy-admin-back-btn" onClick={() => router.push('/academy/teachers')}>
            <ArrowRight /> بازگشت به لیست
          </button>

          <div className="academy-admin-profile-card">
            <div className="academy-admin-profile-avatar-lg">{teacher.firstName?.slice(0, 1)}</div>
            <div className="academy-admin-profile-info">
              <h2>{teacher.firstName} {teacher.lastName}</h2>
              <div className="academy-admin-profile-meta">
                <span><Users /> {teacher.username}</span>
                {teacher.phone && <span>تلفن: {teacher.phone}</span>}
                {teacher.email && <span>ایمیل: {teacher.email}</span>}
                {teacher.nationalId && <span>کد ملی: {teacher.nationalId}</span>}
                <span>تاریخ ثبت: {formatJalali(teacher.createdAt)}</span>
                <span className={`academy-admin-badge ${teacher.active ? 'badge-success' : 'badge-error'}`}>{teacher.active ? 'فعال' : 'غیرفعال'}</span>
              </div>
            </div>
          </div>

          <div className="academy-admin-summary-grid">
            <div className="academy-admin-summary-card"><BookOpen /><strong>{summary.activeCourses.toLocaleString('fa-IR')}</strong><small>کلاس‌های فعال</small></div>
            <div className="academy-admin-summary-card"><Award /><strong>{summary.specialtyCount.toLocaleString('fa-IR')}</strong><small>تخصص‌ها</small></div>
            <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalSettled)}</strong><small>تسویه شده</small></div>
            <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalPending)}</strong><small>در انتظار تسویه</small></div>
          </div>

          <div className="academy-admin-tabs">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
                <tab.icon /> {tab.label}
              </button>
            ))}
          </div>

          <div className="academy-admin-tab-content">
            {activeTab === 'personal' && (
              <div className="academy-admin-sec">
                <h3>اطلاعات شخصی</h3>
                <div className="academy-admin-data-card">
                  <div className="academy-admin-data-row"><span>نام</span><strong>{teacher.firstName}</strong></div>
                  <div className="academy-admin-data-row"><span>نام خانوادگی</span><strong>{teacher.lastName}</strong></div>
                  <div className="academy-admin-data-row"><span>نام کاربری</span><strong>{teacher.username}</strong></div>
                  <div className="academy-admin-data-row"><span>تلفن</span><strong>{teacher.phone || '—'}</strong></div>
                  <div className="academy-admin-data-row"><span>ایمیل</span><strong>{teacher.email || '—'}</strong></div>
                  <div className="academy-admin-data-row"><span>کد ملی</span><strong>{teacher.nationalId || '—'}</strong></div>
                  <div className="academy-admin-data-row"><span>تاریخ ثبت</span><strong>{formatJalali(teacher.createdAt)}</strong></div>
                  <div className="academy-admin-data-row"><span>وضعیت</span><strong>{teacher.active ? 'فعال' : 'غیرفعال'}</strong></div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="academy-admin-sec">
                <h3>مدارک</h3>
                {data.documents.length === 0 ? (
                  <div className="academy-admin-list-empty"><FileText /><p>مدرکی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>نام فایل</th><th>تاریخ</th></tr></thead>
                      <tbody>
                        {data.documents.map((d: any) => (
                          <tr key={d.id}><td><strong>{d.title}</strong></td><td>{d.fileName || '—'}</td><td>{formatJalali(d.createdAt)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specialties' && (
              <div className="academy-admin-sec">
                <h3>تخصص‌ها</h3>
                {data.specialties.length === 0 ? (
                  <div className="academy-admin-list-empty"><Award /><p>تخصصی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-cards-grid">
                    {data.specialties.map((s: any) => (
                      <div key={s.id} className="academy-admin-data-card">
                        <div className="academy-admin-data-row"><span>عنوان</span><strong>{s.title}</strong></div>
                        {s.level && <div className="academy-admin-data-row"><span>سطح</span><strong>{s.level}</strong></div>}
                        <small>{formatJalali(s.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="academy-admin-sec">
                <h3>برنامه کاری</h3>
                {data.schedules.length === 0 ? (
                  <div className="academy-admin-list-empty"><CalendarDays /><p>برنامه‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>روز</th><th>شروع</th><th>پایان</th><th>کلاس</th></tr></thead>
                      <tbody>
                        {data.schedules.map((s: any) => (
                          <tr key={s.id}>
                            <td><strong>{weekdayNames[s.weekday] || s.weekday}</strong></td>
                            <td>{s.startTime}</td><td>{s.endTime}</td><td>{s.room || '—'}</td>
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
                <h3>کلاس‌های فعال</h3>
                {data.courses.length === 0 ? (
                  <div className="academy-admin-list-empty"><BookOpen /><p>کلاسی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان دوره</th><th>سطح</th><th>وضعیت</th><th>تاریخ</th></tr></thead>
                      <tbody>
                        {data.courses.map((c: any) => (
                          <tr key={c.id}>
                            <td><strong>{c.title}</strong></td><td>{c.level || '—'}</td>
                            <td><span className={`academy-admin-badge ${c.active ? 'badge-success' : 'badge-neutral'}`}>{c.active ? 'فعال' : 'غیرفعال'}</span></td>
                            <td>{formatJalali(c.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="academy-admin-sec">
                <h3>حضور و غیاب</h3>
                <div className="academy-admin-summary-grid">
                  <div className="academy-admin-summary-card"><ClipboardCheck /><strong>{summary.presentCount.toLocaleString('fa-IR')}</strong><small>حاضر</small></div>
                  <div className="academy-admin-summary-card"><ClipboardCheck /><strong>{summary.absentCount.toLocaleString('fa-IR')}</strong><small>غایب</small></div>
                </div>
                {data.sessions.length === 0 ? (
                  <div className="academy-admin-list-empty"><ClipboardCheck /><p>جلسه‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>تاریخ</th><th>وضعیت</th><th>تأخیر</th><th>یادداشت</th></tr></thead>
                      <tbody>
                        {data.sessions.map((s: any) => (
                          <tr key={s.id}>
                            <td>{s.title}</td><td>{formatJalali(s.startsAt)}</td>
                            <td><span className={`academy-admin-badge ${s.status === 'present' ? 'badge-success' : s.status === 'absent' ? 'badge-error' : 'badge-warning'}`}>{s.status === 'present' ? 'حاضر' : s.status === 'absent' ? 'غایب' : s.status}</span></td>
                            <td>{s.lateMinutes ? s.lateMinutes.toLocaleString('fa-IR') : '—'}</td><td>{s.attendanceNote || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'salary' && (
              <div className="academy-admin-sec">
                <h3>حق‌التدریس (سهم مدرس)</h3>
                <div className="academy-admin-summary-grid">
                  <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalShare)}</strong><small>کل سهم</small></div>
                  <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalSharePaid)}</strong><small>پرداخت شده</small></div>
                  <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalSharePending)}</strong><small>در انتظار</small></div>
                </div>
                {data.shares.length === 0 ? (
                  <div className="academy-admin-list-empty"><DollarSign /><p>سهمی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>درصد</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th></tr></thead>
                      <tbody>
                        {data.shares.map((s: any) => (
                          <tr key={s.id}>
                            <td>{s.courseId || '—'}</td><td>{s.percent.toLocaleString('fa-IR')}٪</td>
                            <td>{formatMoney(s.amount)}</td>
                            <td><span className={`academy-admin-badge ${s.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{s.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}</span></td>
                            <td>{formatJalali(s.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settlement' && (
              <div className="academy-admin-sec">
                <h3>تسویه حساب</h3>
                {data.settlements.length === 0 ? (
                  <div className="academy-admin-list-empty"><FileSignature /><p>تسویه‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>مبلغ</th><th>دوره</th><th>وضعیت</th><th>تاریخ تسویه</th><th>تاریخ ثبت</th></tr></thead>
                      <tbody>
                        {data.settlements.map((s: any) => (
                          <tr key={s.id}>
                            <td>{formatMoney(s.amount)}</td><td>{s.period}</td>
                            <td><span className={`academy-admin-badge ${s.status === 'settled' ? 'badge-success' : 'badge-warning'}`}>{s.status === 'settled' ? 'تسویه شده' : 'در انتظار'}</span></td>
                            <td>{formatJalali(s.settledAt)}</td><td>{formatJalali(s.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'evaluation' && (
              <div className="academy-admin-sec">
                <h3>ارزیابی عملکرد</h3>
                {data.evaluations.length === 0 ? (
                  <div className="academy-admin-list-empty"><Briefcase /><p>ارزیابی‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-cards-grid">
                    {data.evaluations.map((e: any) => (
                      <div key={e.id} className="academy-admin-data-card">
                        <div className="academy-admin-data-row"><span>دوره</span><strong>{e.courseTitle}</strong></div>
                        {e.strengths && <div className="academy-admin-data-row"><span>نقاط قوت</span><strong>{e.strengths}</strong></div>}
                        {e.weaknesses && <div className="academy-admin-data-row"><span>نقاط ضعف</span><strong>{e.weaknesses}</strong></div>}
                        {e.learningStatus && <div className="academy-admin-data-row"><span>وضعیت یادگیری</span><strong>{e.learningStatus}</strong></div>}
                        {e.educationalSuggestion && <div className="academy-admin-data-row"><span>پیشنهاد آموزشی</span><strong>{e.educationalSuggestion}</strong></div>}
                        <small>{formatJalali(e.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
