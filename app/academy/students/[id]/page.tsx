'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  CalendarDays, BookOpen, ArrowRight, Plus, Trash2, GraduationCap, FileText,
  ClipboardCheck, Award, FileSignature, StickyNote, Send,
} from 'lucide-react';

type TabKey = 'education' | 'finance' | 'attendance' | 'grades' | 'contracts' | 'notes';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'education', label: 'سوابق آموزشی', icon: GraduationCap },
  { key: 'finance', label: 'سوابق مالی', icon: Wallet },
  { key: 'attendance', label: 'حضور و غیاب', icon: ClipboardCheck },
  { key: 'grades', label: 'نمرات', icon: Award },
  { key: 'contracts', label: 'قراردادها', icon: FileSignature },
  { key: 'notes', label: 'یادداشت‌ها', icon: StickyNote },
];

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'مدیریت دانش‌آموزان', icon: Users, href: '/academy/students', active: true },
  { label: 'ثبت‌نام‌ها', icon: ClipboardList, href: '/academy/registration' },
  { label: 'کلاس‌ها', icon: CalendarDays, href: '/academy/classes' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance' },
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

export default function StudentRecordPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('education');
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const fetchData = useCallback(() => {
    fetch(`/api/academy/student-record?studentId=${encodeURIComponent(studentId)}`, { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        if (res.status === 403) { router.replace('/academy/login'); return; }
        if (res.ok) setData(await res.json());
      })
      .finally(() => setLoading(false));
  }, [studentId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch('/api/academy/student-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'add_note', body: noteText.trim() }),
      });
      if (res.ok) {
        setNoteText('');
        fetchData();
      }
    } finally { setNoteSaving(false); }
  }

  async function deleteNote(noteId: string) {
    await fetch(`/api/academy/student-record?noteId=${noteId}`, { method: 'DELETE' });
    fetchData();
  }

  if (loading) return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="academy-admin-loading"><p>دانش‌آموز یافت نشد</p></div>;

  const { student, summary } = data;

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
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
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
          <button type="button" className="academy-admin-back-btn" onClick={() => router.push('/academy/students')}>
            <ArrowRight /> بازگشت به لیست
          </button>

          <div className="academy-admin-profile-card">
            <div className="academy-admin-profile-avatar-lg">{student.firstName?.slice(0, 1)}</div>
            <div className="academy-admin-profile-info">
              <h2>{student.firstName} {student.lastName}</h2>
              <div className="academy-admin-profile-meta">
                <span><Users /> {student.username}</span>
                {student.phone && <span>تلفن: {student.phone}</span>}
                {student.email && <span>ایمیل: {student.email}</span>}
                {student.nationalId && <span>کد ملی: {student.nationalId}</span>}
                <span>تاریخ ثبت: {formatJalali(student.createdAt)}</span>
                <span className={`academy-admin-badge ${student.active ? 'badge-success' : 'badge-error'}`}>{student.active ? 'فعال' : 'غیرفعال'}</span>
              </div>
            </div>
          </div>

          <div className="academy-admin-summary-grid">
            <div className="academy-admin-summary-card"><BookOpen /><strong>{summary.activeCourses.toLocaleString('fa-IR')}</strong><small>دوره‌های فعال</small></div>
            <div className="academy-admin-summary-card"><Wallet /><strong>{formatMoney(summary.totalDebt)}</strong><small>بدهی</small></div>
            <div className="academy-admin-summary-card"><ClipboardCheck /><strong>{summary.absentCount.toLocaleString('fa-IR')}</strong><small>غیبت</small></div>
            <div className="academy-admin-summary-card"><Award /><strong>{summary.avgGrade ? summary.avgGrade.toFixed(1).toLocaleString('fa-IR') : '—'}</strong><small>میانگین نمره</small></div>
          </div>

          <div className="academy-admin-tabs">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
                <tab.icon /> {tab.label}
              </button>
            ))}
          </div>

          <div className="academy-admin-tab-content">
            {activeTab === 'education' && (
              <div className="academy-admin-sec">
                <h3>سوابق آموزشی</h3>
                {data.educationRecords.length === 0 ? (
                  <div className="academy-admin-list-empty"><GraduationCap /><p>سابقه آموزشی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-cards-grid">
                    {data.educationRecords.map((er: any) => (
                      <div key={er.id} className="academy-admin-data-card">
                        <div className="academy-admin-data-row"><span>سطح فعلی</span><strong>{er.currentLevel} {er.currentLevelName || ''}</strong></div>
                        <div className="academy-admin-data-row"><span>سطح هدف</span><strong>{er.targetLevel} {er.targetLevelName || ''}</strong></div>
                        <div className="academy-admin-data-row"><span>پیشرفت</span><strong>{er.progressPercent.toLocaleString('fa-IR')}٪</strong></div>
                        <div className="academy-admin-data-row"><span>میانگین نمره</span><strong>{er.averageGrade ? er.averageGrade.toFixed(1).toLocaleString('fa-IR') : '—'}</strong></div>
                        <div className="academy-admin-data-row"><span>تاریخ آزمون تعیین سطح</span><strong>{formatJalali(er.placementDate)}</strong></div>
                        {er.placementResult && <div className="academy-admin-data-row"><span>نتیجه تعیین سطح</span><strong>{er.placementResult}</strong></div>}
                        {er.teacherComment && <div className="academy-admin-data-comment">{er.teacherComment}</div>}
                        <small>به‌روزرسانی: {formatJalali(er.updatedAt)}</small>
                      </div>
                    ))}
                  </div>
                )}
                {data.evaluations.length > 0 && (
                  <>
                    <h3 className="academy-admin-sub-h">ارزیابی‌های مدرس</h3>
                    <div className="academy-admin-cards-grid">
                      {data.evaluations.map((ev: any) => (
                        <div key={ev.id} className="academy-admin-data-card">
                          <div className="academy-admin-data-row"><span>دوره</span><strong>{ev.courseTitle}</strong></div>
                          {ev.strengths && <div className="academy-admin-data-row"><span>نقاط قوت</span><strong>{ev.strengths}</strong></div>}
                          {ev.weaknesses && <div className="academy-admin-data-row"><span>نقاط ضعف</span><strong>{ev.weaknesses}</strong></div>}
                          {ev.learningStatus && <div className="academy-admin-data-row"><span>وضعیت یادگیری</span><strong>{ev.learningStatus}</strong></div>}
                          {ev.educationalSuggestion && <div className="academy-admin-data-row"><span>پیشنهاد آموزشی</span><strong>{ev.educationalSuggestion}</strong></div>}
                          {ev.currentLevel && <div className="academy-admin-data-row"><span>سطح فعلی</span><strong>{ev.currentLevel}</strong></div>}
                          {ev.suggestedLevel && <div className="academy-admin-data-row"><span>سطح پیشنهادی</span><strong>{ev.suggestedLevel}</strong></div>}
                          <small>{formatJalali(ev.createdAt)}</small>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <h3 className="academy-admin-sub-h">دوره‌های ثبت‌نام شده</h3>
                {data.enrollments.length === 0 ? (
                  <div className="academy-admin-list-empty"><BookOpen /><p>ثبت‌نامی وجود ندارد.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>سطح</th><th>پیشرفت</th><th>جلسات</th><th>شهریه</th><th>پرداختی</th><th>وضعیت</th></tr></thead>
                      <tbody>
                        {data.enrollments.map((e: any) => (
                          <tr key={e.id}>
                            <td><strong>{e.courseTitle}</strong></td>
                            <td>{e.courseLevel}</td>
                            <td>{e.progress.toLocaleString('fa-IR')}٪</td>
                            <td>{e.heldSessions.toLocaleString('fa-IR')} / {e.totalSessions.toLocaleString('fa-IR')}</td>
                            <td>{formatMoney(e.fee)}</td>
                            <td>{formatMoney(e.paid)}</td>
                            <td><span className={`academy-admin-badge ${e.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{e.status === 'active' ? 'فعال' : e.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'finance' && (
              <div className="academy-admin-sec">
                <h3>خلاصه مالی</h3>
                <div className="academy-admin-summary-grid">
                  <div className="academy-admin-summary-card"><Wallet /><strong>{formatMoney(summary.totalFee)}</strong><small>کل شهریه</small></div>
                  <div className="academy-admin-summary-card"><Wallet /><strong>{formatMoney(summary.totalPaid)}</strong><small>کل پرداختی</small></div>
                  <div className="academy-admin-summary-card"><Wallet /><strong>{formatMoney(summary.totalDebt)}</strong><small>بدهی باقی‌مانده</small></div>
                </div>

                <h3 className="academy-admin-sub-h">اقساط</h3>
                {data.installments.length === 0 ? (
                  <div className="academy-admin-list-empty"><Wallet /><p>قسطی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>قسط</th><th>مبلغ</th><th>سررسید</th><th>تاریخ پرداخت</th><th>وضعیت</th></tr></thead>
                      <tbody>
                        {data.installments.map((i: any) => (
                          <tr key={i.id}>
                            <td>{i.courseTitle}</td>
                            <td>{i.installmentNo.toLocaleString('fa-IR')}</td>
                            <td>{formatMoney(i.amount)}</td>
                            <td>{formatJalali(i.dueDate)}</td>
                            <td>{formatJalali(i.paidDate)}</td>
                            <td><span className={`academy-admin-badge ${i.status === 'paid' ? 'badge-success' : i.status === 'overdue' ? 'badge-error' : 'badge-warning'}`}>{i.status === 'paid' ? 'پرداخت شده' : i.status === 'overdue' ? 'سررسید گذشته' : 'در انتظار'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="academy-admin-sub-h">فاکتورها</h3>
                {data.invoices.length === 0 ? (
                  <div className="academy-admin-list-empty"><FileText /><p>فاکتوری ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>شماره</th><th>مبلغ</th><th>تاریخ صدور</th></tr></thead>
                      <tbody>
                        {data.invoices.map((inv: any) => (
                          <tr key={inv.id}><td>{inv.number}</td><td>{formatMoney(inv.amount)}</td><td>{formatJalali(inv.issueDate)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="academy-admin-sub-h">رسیدهای پرداخت</h3>
                {data.receipts.length === 0 ? (
                  <div className="academy-admin-list-empty"><FileText /><p>رسیدی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>مبلغ</th><th>کد پیگیری</th><th>تاریخ دریافت</th></tr></thead>
                      <tbody>
                        {data.receipts.map((r: any) => (
                          <tr key={r.id}><td>{formatMoney(r.amount)}</td><td>{r.trackingCode || '—'}</td><td>{formatJalali(r.receivedDate)}</td></tr>
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
                  <div className="academy-admin-summary-card"><ClipboardCheck /><strong>{summary.lateCount.toLocaleString('fa-IR')}</strong><small>تأخیر</small></div>
                </div>
                {data.sessions.length === 0 ? (
                  <div className="academy-admin-list-empty"><ClipboardCheck /><p>جلسه‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>تاریخ</th><th>کلاس</th><th>وضعیت</th><th>تأخیر (دقیقه)</th><th>یادداشت</th></tr></thead>
                      <tbody>
                        {data.sessions.map((s: any) => (
                          <tr key={s.id}>
                            <td>{s.title}</td>
                            <td>{formatJalali(s.startsAt)}</td>
                            <td>{s.room || '—'}</td>
                            <td><span className={`academy-admin-badge ${s.status === 'present' ? 'badge-success' : s.status === 'absent' ? 'badge-error' : 'badge-warning'}`}>{s.status === 'present' ? 'حاضر' : s.status === 'absent' ? 'غایب' : s.status === 'late' ? 'تأخیر' : s.status}</span></td>
                            <td>{s.lateMinutes ? s.lateMinutes.toLocaleString('fa-IR') : '—'}</td>
                            <td>{s.attendanceNote || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'grades' && (
              <div className="academy-admin-sec">
                <h3>نمرات</h3>
                {data.grades.length === 0 ? (
                  <div className="academy-admin-list-empty"><Award /><p>نمره‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>آزمون</th><th>تکلیف</th><th>مشارکت</th><th>مکالمه</th><th>شنیداری</th><th>خوانداری</th><th>نوشتاری</th><th>یادداشت</th><th>تاریخ</th></tr></thead>
                      <tbody>
                        {data.grades.map((g: any) => (
                          <tr key={g.id}>
                            <td><strong>{g.courseTitle}</strong></td>
                            <td>{g.examScore != null ? g.examScore.toFixed(1).toLocaleString('fa-IR') : '—'}</td>
                            <td>{g.assignmentScore != null ? g.assignmentScore.toFixed(1).toLocaleString('fa-IR') : '—'}</td>
                            <td>{g.participationScore != null ? g.participationScore.toFixed(1).toLocaleString('fa-IR') : '—'}</td>
                            <td>{g.speakingScore != null ? g.speakingScore.toFixed(1).toLocaleString('fa-IR') : '—'}</td>
                            <td>{g.listeningScore != null ? g.listeningScore.toFixed(1).toLocaleString('fa-IR') : '—'}</td>
                            <td>{g.readingScore != null ? g.readingScore.toFixed(1).toLocaleString('fa-IR') : '—'}</td>
                            <td>{g.writingScore != null ? g.writingScore.toFixed(1).toLocaleString('fa-IR') : '—'}</td>
                            <td>{g.note || '—'}</td>
                            <td>{formatJalali(g.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contracts' && (
              <div className="academy-admin-sec">
                <h3>قراردادها</h3>
                {data.contracts.length === 0 ? (
                  <div className="academy-admin-list-empty"><FileSignature /><p>قراردادی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-cards-grid">
                    {data.contracts.map((c: any) => (
                      <div key={c.id} className="academy-admin-data-card">
                        <div className="academy-admin-data-row"><span>عنوان</span><strong>{c.title}</strong></div>
                        <div className="academy-admin-data-row"><span>مبلغ</span><strong>{formatMoney(c.amount)}</strong></div>
                        <div className="academy-admin-data-row"><span>شروع</span><strong>{formatJalali(c.startDate)}</strong></div>
                        <div className="academy-admin-data-row"><span>پایان</span><strong>{formatJalali(c.endDate)}</strong></div>
                        <div className="academy-admin-data-row"><span>وضعیت</span><strong>{c.status === 'active' ? 'فعال' : c.status}</strong></div>
                        <small>{formatJalali(c.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="academy-admin-sec">
                <h3>یادداشت‌ها</h3>
                <div className="academy-admin-note-input">
                  <textarea placeholder="یادداشت جدید..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} />
                  <button type="button" className="academy-admin-btn-primary" onClick={addNote} disabled={noteSaving || !noteText.trim()}>
                    {noteSaving ? <Loader2 className="animate-spin" /> : <Send />} ثبت یادداشت
                  </button>
                </div>
                {data.notes.length === 0 ? (
                  <div className="academy-admin-list-empty"><StickyNote /><p>یادداشتی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-notes-list">
                    {data.notes.map((n: any) => (
                      <div key={n.id} className="academy-admin-note-item">
                        <div className="academy-admin-note-body">{n.body}</div>
                        <div className="academy-admin-note-meta">
                          <span>{n.authorName} · {formatJalali(n.createdAt)}</span>
                          <button type="button" onClick={() => deleteNote(n.id)} title="حذف"><Trash2 /></button>
                        </div>
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
