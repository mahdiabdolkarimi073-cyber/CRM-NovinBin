'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  ClipboardList,
  CalendarDays,
  CheckCircle,
  GraduationCap,
  Wallet,
  Loader2,
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  CreditCard,
  RefreshCw,
  UserPlus,
  Repeat,
  ListOrdered,
  XCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { StudentShell } from '@/components/academy/student-shell';

type UserInfo = { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
type ClassOption = {
  id: string;
  title: string;
  code: string | null;
  level: string | null;
  teacherName: string | null;
  weekday: string | null;
  startsAt: string | null;
  durationMin: number;
  room: string | null;
  startDate: string | null;
  endDate: string | null;
  capacity: number;
  enrolled: number;
  fee: number;
  availableSeats: number;
  isFull: boolean;
};
type RequestItem = {
  id: string;
  type: string;
  status: string;
  paymentStatus: string;
  amount: number;
  trackingCode: string | null;
  note: string | null;
  createdAt: string;
  classOptionId: string | null;
  targetCourseId: string | null;
};
type CurrentCourse = { id: string; title: string; level: string | null; code: string | null; endDate: string | null };

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleDateString('fa-IR'); }
}
const faNum = (n: number) => n.toLocaleString('fa-IR');

const TYPE_LABEL: Record<string, string> = {
  renewal: 'تمدید', enrollment: 'ثبت‌نام', class_change: 'جابه‌جایی کلاس', waitlist: 'لیست انتظار',
};
const TYPE_ICON: Record<string, any> = { renewal: Repeat, enrollment: UserPlus, class_change: ArrowLeft, waitlist: ListOrdered };
const STATUS_LABEL: Record<string, string> = { pending: 'در انتظار تأیید', approved: 'تأیید شده', rejected: 'رد شده', cancelled: 'لغو شده' };
const STATUS_CLASS: Record<string, string> = { pending: 'pending', approved: 'approved', rejected: 'rejected', cancelled: 'cancelled' };
const STATUS_ICON: Record<string, any> = { pending: Clock, approved: CheckCircle2, rejected: XCircle, cancelled: XCircle };
const PAY_LABEL: Record<string, string> = { unpaid: 'پرداخت نشده', pending: 'در انتظار پرداخت', paid: 'پرداخت شده' };

export default function RegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentCourse, setCurrentCourse] = useState<CurrentCourse | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'requests'>('available');
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [actionType, setActionType] = useState<string>('enrollment');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/academy/registration', { headers: { 'Cache-Control': 'no-store' } });
      if (!res.ok) throw new Error('نشست نامعتبر');
      const data = await res.json();
      setUser(data.user);
      setCurrentCourse(data.currentCourse);
      setClasses(data.availableClasses || []);
      setRequests(data.requests || []);
    } catch {
      router.replace('/academy/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  async function submitRequest() {
    if (!selectedClass) { toast.error('یک کلاس را انتخاب کنید'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/academy/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          classOptionId: selectedClass.id,
          targetCourseId: selectedClass.id,
          currentCourseId: currentCourse?.id || null,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ثبت درخواست ناموفق بود');
      toast.success('درخواست شما ثبت شد و در انتظار تأیید مدیر است');
      setSelectedClass(null);
      setNote('');
      setActiveTab('requests');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(id: string) {
    setActionLoading(`cancel-${id}`);
    try {
      const res = await fetch('/api/academy/registration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'لغو ناموفق بود');
      toast.success('درخواست لغو شد');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'لغو ناموفق بود');
    } finally {
      setActionLoading(null);
    }
  }

  async function payRequest(id: string) {
    setActionLoading(`pay-${id}`);
    try {
      const res = await fetch('/api/academy/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'registration', requestId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'پرداخت ناموفق بود');
      if (data.redirectUrl) {
        toast.success('در حال انتقال به درگاه پرداخت بانک ملت...');
        window.location.href = data.redirectUrl;
      } else {
        throw new Error('لینک پرداخت دریافت نشد');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'پرداخت ناموفق بود');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="student-shell-loading"><Loader2 className="animate-spin" /></div>;
  if (!user) return <div className="student-shell-loading"><p>خطا در بارگذاری صفحه</p></div>;

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const historyRequests = requests.filter((r) => r.status !== 'pending');
  const renewalClasses = classes.filter((c) => !c.isFull);
  const fullClasses = classes.filter((c) => c.isFull);

  const actionOptions = [
    { value: 'enrollment', label: 'ثبت‌نام در دوره', icon: UserPlus },
    { value: 'renewal', label: 'تمدید دوره', icon: Repeat },
    { value: 'class_change', label: 'جابه‌جایی کلاس', icon: ArrowLeft },
    { value: 'waitlist', label: 'لیست انتظار', icon: ListOrdered },
  ];

  const statCards = [
    { label: 'دوره فعلی', value: currentCourse?.title || '—', icon: GraduationCap, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'کلاس‌های disponible', value: faNum(renewalClasses.length), icon: BookOpen, color: '#10B981', bg: '#ECFDF5' },
    { label: 'درخواست‌های در انتظار', value: faNum(pendingRequests.length), icon: ClipboardList, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'کل درخواست‌ها', value: faNum(requests.length), icon: Wallet, color: '#8B5CF6', bg: '#F5F3FF' },
  ];

  return (
    <StudentShell
      user={user}
      activePath="/academy/registration"
      pageTitle="ثبت‌نام و تمدید"
      pageSubtitle="درخواست ثبت‌نام، تمدید، جابه‌جایی کلاس و لیست انتظار"
      onLogout={logout}
    >
      <section className="student-page-hero">
        <div>
          <h2>ثبت‌نام و تمدید دوره</h2>
          <p>درخواست‌های شما پس از ثبت، توسط مدیر بررسی و تأیید می‌شوند</p>
        </div>
        <div className="student-page-hero-badge">
          <strong>{currentCourse?.title || '—'}</strong>
          <span>دوره فعلی</span>
        </div>
      </section>

      <section className="student-page-stats">
        {statCards.map((s, i) => (
          <div key={i} className="student-page-stat-card">
            <span className="student-page-stat-icon" style={{ background: s.bg, color: s.color }}><s.icon /></span>
            <div className="student-page-stat-body">
              <span className="student-page-stat-label">{s.label}</span>
              <strong className="student-page-stat-value" style={{ fontSize: s.value.length > 10 ? 14 : 22 }}>{s.value}</strong>
            </div>
          </div>
        ))}
      </section>

      {currentCourse && (
        <section className="student-page-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', flexShrink: 0 }}>
              <GraduationCap style={{ width: 20, height: 20 }} />
            </span>
            <div>
              <strong style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', display: 'block' }}>{currentCourse.title}</strong>
              <span style={{ fontSize: 12, color: '#64748B' }}>کد: {currentCourse.code || '—'} | پایان: {jalaliDate(currentCourse.endDate)}</span>
            </div>
          </div>
          <button type="button" className="student-page-btn primary" onClick={() => { setActionType('renewal'); setActiveTab('available'); }}>
            <RefreshCw style={{ width: 15, height: 15 }} /> درخواست تمدید
          </button>
        </section>
      )}

      <section className="student-page-panel">
        <div className="student-page-panel-heading">
          <div><h3>نوع درخواست</h3><p>نوع درخواست خود را انتخاب کنید</p></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {actionOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`student-page-btn ${actionType === opt.value ? 'primary' : 'secondary'}`}
              onClick={() => setActionType(opt.value)}
            >
              <opt.icon style={{ width: 15, height: 15 }} /> {opt.label}
            </button>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #F1F5F9' }}>
        <button
          type="button"
          className="student-page-btn primary"
          style={{ borderRadius: '8px 8px 0 0', borderBottom: '2px solid #2563EB', background: activeTab === 'available' ? '#2563EB' : '#fff', color: activeTab === 'available' ? '#fff' : '#475569', borderColor: activeTab === 'available' ? '#2563EB' : '#E2E8F0' }}
          onClick={() => setActiveTab('available')}
        >
          <BookOpen style={{ width: 15, height: 15 }} /> کلاس‌های دارای ظرفیت
        </button>
        <button
          type="button"
          className="student-page-btn secondary"
          style={{ borderRadius: '8px 8px 0 0', borderBottom: '2px solid #2563EB', background: activeTab === 'requests' ? '#2563EB' : '#fff', color: activeTab === 'requests' ? '#fff' : '#475569', borderColor: activeTab === 'requests' ? '#2563EB' : '#E2E8F0' }}
          onClick={() => setActiveTab('requests')}
        >
          <ClipboardList style={{ width: 15, height: 15 }} /> درخواست‌های من
          {pendingRequests.length > 0 && <span style={{ background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '2px 6px', marginRight: 4 }}>{faNum(pendingRequests.length)}</span>}
        </button>
      </div>

      {activeTab === 'available' && (
        <>
          {renewalClasses.length > 0 && (
            <section className="student-page-panel">
              <div className="student-page-panel-heading">
                <div><h3>کلاس‌های دارای ظرفیت</h3></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
                {renewalClasses.map((cls) => (
                  <article
                    key={cls.id}
                    onClick={() => setSelectedClass(cls)}
                    style={{
                      background: selectedClass?.id === cls.id ? '#EFF6FF' : '#F8FAFC',
                      border: `2px solid ${selectedClass?.id === cls.id ? '#2563EB' : '#E2E8F0'}`,
                      borderRadius: 12, padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, transition: 'all .2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>{cls.title}</h3>
                        {cls.code && <span style={{ fontSize: 12, color: '#94A3B8' }}>{cls.code}</span>}
                      </div>
                      {cls.level && <span className="student-page-badge present">{cls.level}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {cls.teacherName && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}><Users style={{ width: 15, height: 15 }} /> <span>{cls.teacherName}</span></div>}
                      {cls.weekday && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}><Clock style={{ width: 15, height: 15 }} /> <span>{cls.weekday} {cls.startsAt ? `| ${cls.startsAt}` : ''}</span></div>}
                      {cls.room && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}><MapPin style={{ width: 15, height: 15 }} /> <span>{cls.room}</span></div>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#10B981' }}>
                        <Users style={{ width: 14, height: 14 }} /> <span>{faNum(cls.availableSeats)} صندلی آزاد</span>
                      </div>
                      <strong style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{faNum(cls.fee)} تومان</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {fullClasses.length > 0 && (
            <section className="student-page-panel">
              <div className="student-page-panel-heading">
                <div><h3>کلاس‌های تکمیل‌ظرفیت</h3><p>قابل ثبت در لیست انتظار</p></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
                {fullClasses.map((cls) => (
                  <article
                    key={cls.id}
                    onClick={() => { setSelectedClass(cls); setActionType('waitlist'); }}
                    style={{
                      background: selectedClass?.id === cls.id ? '#FEF2F2' : '#F8FAFC',
                      border: `2px solid ${selectedClass?.id === cls.id ? '#EF4444' : '#E2E8F0'}`,
                      borderRadius: 12, padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.85, transition: 'all .2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>{cls.title}</h3>
                        {cls.code && <span style={{ fontSize: 12, color: '#94A3B8' }}>{cls.code}</span>}
                      </div>
                      {cls.level && <span className="student-page-badge absent">{cls.level}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {cls.teacherName && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}><Users style={{ width: 15, height: 15 }} /> <span>{cls.teacherName}</span></div>}
                      {cls.weekday && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}><Clock style={{ width: 15, height: 15 }} /> <span>{cls.weekday} {cls.startsAt ? `| ${cls.startsAt}` : ''}</span></div>}
                      {cls.room && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}><MapPin style={{ width: 15, height: 15 }} /> <span>{cls.room}</span></div>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#EF4444' }}>
                        <Users style={{ width: 14, height: 14 }} /> <span>ظرفیت تکمیل</span>
                      </div>
                      <strong style={{ fontSize: 15, fontWeight: 700, color: '#1E293B' }}>{faNum(cls.fee)} تومان</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {classes.length === 0 && (
            <div className="student-page-empty"><BookOpen /><p>در حال حاضر کلاسی برای ثبت‌نام موجود نیست.</p></div>
          )}

          {selectedClass && (
            <section className="student-page-panel" style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{TYPE_LABEL[actionType]} - {selectedClass.title}</strong>
                  <span style={{ fontSize: 13, color: '#64748B', display: 'block', marginTop: 2 }}>مبلغ: {faNum(selectedClass.fee)} تومان</span>
                </div>
                <input
                  className="student-page-btn secondary"
                  style={{ flex: 1, minWidth: 200, height: 36, padding: '0 12px' }}
                  placeholder="توضیحات (اختیاری)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="student-page-btn secondary" onClick={() => setSelectedClass(null)}>انصراف</button>
                  <button type="button" className="student-page-btn primary" disabled={submitting} onClick={submitRequest}>
                    {submitting ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : <CheckCircle style={{ width: 15, height: 15 }} />}
                    ثبت درخواست
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <>
          {pendingRequests.length > 0 && (
            <section className="student-page-panel">
              <div className="student-page-panel-heading">
                <div><h3>درخواست‌های در انتظار</h3></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingRequests.map((req) => {
                  const TypeIcon = TYPE_ICON[req.type] || ClipboardList;
                  const StatusIcon = STATUS_ICON[req.status] || Clock;
                  return (
                    <div key={req.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TypeIcon style={{ width: 18, height: 18, color: '#2563EB' }} />
                          <strong style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{TYPE_LABEL[req.type] || req.type}</strong>
                        </div>
                        <span className={`student-page-badge ${STATUS_CLASS[req.status] || ''}`}>
                          <StatusIcon style={{ width: 14, height: 14 }} /> {STATUS_LABEL[req.status] || req.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B', marginBottom: 8, flexWrap: 'wrap' }}>
                        <span>تاریخ: {jalaliDate(req.createdAt)}</span>
                        <span>مبلغ: {faNum(req.amount)} تومان</span>
                        <span>پرداخت: {PAY_LABEL[req.paymentStatus] || req.paymentStatus}</span>
                        {req.trackingCode && <span>کد پیگیری: {req.trackingCode}</span>}
                      </div>
                      {req.note && <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 8px' }}>{req.note}</p>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {req.amount > 0 && req.paymentStatus !== 'paid' && req.status === 'pending' && (
                          <button type="button" className="student-page-btn primary" disabled={actionLoading === `pay-${req.id}`} onClick={() => payRequest(req.id)}>
                            {actionLoading === `pay-${req.id}` ? <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> : <CreditCard style={{ width: 15, height: 15 }} />} پرداخت آنلاین
                          </button>
                        )}
                        <button type="button" className="student-page-btn danger" disabled={actionLoading === `cancel-${req.id}`} onClick={() => cancelRequest(req.id)}>
                          <XCircle style={{ width: 15, height: 15 }} /> لغو درخواست
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {historyRequests.length > 0 && (
            <section className="student-page-panel">
              <div className="student-page-panel-heading">
                <div><h3>سابقه درخواست‌ها</h3></div>
              </div>
              <div className="student-page-table-wrap">
                <table className="student-page-table">
                  <thead>
                    <tr><th>نوع</th><th>تاریخ</th><th>مبلغ</th><th>پرداخت</th><th>وضعیت</th></tr>
                  </thead>
                  <tbody>
                    {historyRequests.map((req) => {
                      const StatusIcon = STATUS_ICON[req.status] || Clock;
                      return (
                        <tr key={req.id}>
                          <td>{TYPE_LABEL[req.type] || req.type}</td>
                          <td>{jalaliDate(req.createdAt)}</td>
                          <td style={{ fontWeight: 600 }}>{faNum(req.amount)} تومان</td>
                          <td>{PAY_LABEL[req.paymentStatus] || req.paymentStatus}</td>
                          <td>
                            <span className={`student-page-badge ${STATUS_CLASS[req.status] || ''}`}>
                              <StatusIcon style={{ width: 14, height: 14 }} /> {STATUS_LABEL[req.status] || req.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {requests.length === 0 && (
            <div className="student-page-empty"><ClipboardList /><p>هنوز درخواستی ثبت نکرده‌اید.</p></div>
          )}
        </>
      )}
    </StudentShell>
  );
}
