'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  ClipboardList,
  CalendarDays,
  CheckCircle,
  GraduationCap,
  MessageSquare,
  Folder,
  Wallet,
  User,
  Settings,
  LifeBuoy,
  Menu,
  Search,
  Bell,
  Loader2,
  LogOut,
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

const navItems = [
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/classes' },
  { label: 'تکالیف', icon: ClipboardList, href: '/academy/classes' },
  { label: 'برنامه هفتگی', icon: CalendarDays, href: '/academy/classes' },
  { label: 'حضور و غیاب', icon: CheckCircle, href: '/academy/attendance' },
  { label: 'نمرات و پیشرفت', icon: GraduationCap, href: '/academy/education-record' },
  { label: 'پیام‌ها', icon: MessageSquare, href: '/academy/classes' },
  { label: 'فایل‌ها', icon: Folder, href: '/academy/classes' },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance' },
  { label: 'ثبت‌نام / تمدید', icon: UserPlus, href: '/academy/registration', active: true },
  { label: 'پروفایل من', icon: User, href: '/academy/classes' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes' },
];

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
const STATUS_ICON: Record<string, any> = { pending: ClockIcon, approved: CheckCircle2, rejected: XCircle, cancelled: XCircle };
const PAY_LABEL: Record<string, string> = { unpaid: 'پرداخت نشده', pending: 'در انتظار پرداخت', paid: 'پرداخت شده' };

export default function RegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentCourse, setCurrentCourse] = useState<CurrentCourse | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      const res = await fetch('/api/academy/registration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, action: 'pay' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'پرداخت ناموفق بود');
      toast.success(`پرداخت با موفقیت انجام شد. کد پیگیری: ${data.trackingCode}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'پرداخت ناموفق بود');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="reg-loading"><Loader2 className="animate-spin" /></div>;
  if (!user) return <div className="reg-loading"><p>خطا در بارگذاری صفحه</p></div>;

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

  return (
    <div className="reg-layout" dir="rtl">
      {sidebarOpen && <div className="reg-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`reg-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="reg-sidebar-inner">
          <div className="reg-brand">
            <div className="reg-avatar">{user.firstName.slice(0, 1)}</div>
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              <small>دانش‌آموز</small>
            </div>
          </div>
          <nav className="reg-nav">
            {navItems.map((item) => (
              <button key={item.label} type="button" className={item.active ? 'active' : ''} onClick={() => { router.push(item.href); setSidebarOpen(false); }}>
                <item.icon /><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="reg-support">
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> پشتیبانی</button>
          </div>
          <button type="button" className="reg-logout" onClick={logout}><LogOut /> <span>خروج</span></button>
        </div>
      </aside>

      <div className="reg-main">
        <header className="reg-header">
          <div className="reg-header-right">
            <button type="button" className="reg-burger" onClick={() => setSidebarOpen(true)} aria-label="منو"><Menu /></button>
            <div>
              <h1>ثبت‌نام و تمدید</h1>
              <p>درخواست ثبت‌نام، تمدید، جابه‌جایی کلاس و لیست انتظار</p>
            </div>
          </div>
          <div className="reg-header-left">
            <button type="button" aria-label="جستجو"><Search /></button>
            <button type="button" aria-label="اعلان‌ها" className="reg-bell"><Bell /><span /></button>
            <div className="reg-header-avatar">{user.firstName.slice(0, 1)}</div>
          </div>
        </header>

        <div className="reg-scroll">
          <section className="reg-hero">
            <div className="reg-hero-right">
              <h2>ثبت‌نام و تمدید دوره</h2>
              <p>درخواست‌های شما پس از ثبت، توسط مدیر بررسی و تأیید می‌شوند</p>
            </div>
            <div className="reg-hero-left">
              <span className="reg-hero-label">دوره فعلی</span>
              <strong className="reg-hero-value">{currentCourse?.title || '—'}</strong>
              <span className="reg-hero-sub">{currentCourse?.level || ''}</span>
            </div>
          </section>

          {currentCourse && (
            <section className="reg-current-banner">
              <div className="reg-current-info">
                <GraduationCap />
                <div>
                  <strong>{currentCourse.title}</strong>
                  <span>کد: {currentCourse.code || '—'} | پایان: {jalaliDate(currentCourse.endDate)}</span>
                </div>
              </div>
              <button type="button" className="reg-renew-btn" onClick={() => { setActionType('renewal'); setActiveTab('available'); }}>
                <RefreshCw /> درخواست تمدید
              </button>
            </section>
          )}

          <div className="reg-tabs">
            <button type="button" className={activeTab === 'available' ? 'active' : ''} onClick={() => setActiveTab('available')}>
              <BookOpen /> کلاس‌های دارای ظرفیت
            </button>
            <button type="button" className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>
              <ClipboardList /> درخواست‌های من
              {pendingRequests.length > 0 && <span className="reg-tab-badge">{faNum(pendingRequests.length)}</span>}
            </button>
          </div>

          {activeTab === 'available' && (
            <>
              <section className="reg-action-bar">
                <div className="reg-action-label">نوع درخواست:</div>
                <div className="reg-action-options">
                  {actionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`reg-action-chip ${actionType === opt.value ? 'active' : ''}`}
                      onClick={() => setActionType(opt.value)}
                    >
                      <opt.icon /> {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {renewalClasses.length > 0 && (
                <section className="reg-classes-section">
                  <h3 className="reg-section-title">کلاس‌های دارای ظرفیت</h3>
                  <div className="reg-classes-grid">
                    {renewalClasses.map((cls) => (
                      <article
                        key={cls.id}
                        className={`reg-class-card ${selectedClass?.id === cls.id ? 'selected' : ''}`}
                        onClick={() => setSelectedClass(cls)}
                      >
                        <div className="reg-class-top">
                          <h4>{cls.title}</h4>
                          {cls.code && <span className="reg-class-code">{cls.code}</span>}
                        </div>
                        {cls.level && <span className="reg-class-level">{cls.level}</span>}
                        <div className="reg-class-meta">
                          {cls.teacherName && <div className="reg-meta-row"><User /> <span>{cls.teacherName}</span></div>}
                          {cls.weekday && <div className="reg-meta-row"><Clock /> <span>{cls.weekday} {cls.startsAt ? `| ${cls.startsAt}` : ''}</span></div>}
                          {cls.room && <div className="reg-meta-row"><MapPin /> <span>{cls.room}</span></div>}
                        </div>
                        <div className="reg-class-footer">
                          <div className="reg-seats">
                            <Users /> <span>{faNum(cls.availableSeats)} صندلی آزاد</span>
                          </div>
                          <strong className="reg-fee">{faNum(cls.fee)} تومان</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {fullClasses.length > 0 && (
                <section className="reg-classes-section">
                  <h3 className="reg-section-title">کلاس‌های تکمیل‌ظرفیت <span className="reg-section-hint">(قابل ثبت در لیست انتظار)</span></h3>
                  <div className="reg-classes-grid">
                    {fullClasses.map((cls) => (
                      <article
                        key={cls.id}
                        className={`reg-class-card full ${selectedClass?.id === cls.id ? 'selected' : ''}`}
                        onClick={() => { setSelectedClass(cls); setActionType('waitlist'); }}
                      >
                        <div className="reg-class-top">
                          <h4>{cls.title}</h4>
                          {cls.code && <span className="reg-class-code">{cls.code}</span>}
                        </div>
                        {cls.level && <span className="reg-class-level">{cls.level}</span>}
                        <div className="reg-class-meta">
                          {cls.teacherName && <div className="reg-meta-row"><User /> <span>{cls.teacherName}</span></div>}
                          {cls.weekday && <div className="reg-meta-row"><Clock /> <span>{cls.weekday} {cls.startsAt ? `| ${cls.startsAt}` : ''}</span></div>}
                          {cls.room && <div className="reg-meta-row"><MapPin /> <span>{cls.room}</span></div>}
                        </div>
                        <div className="reg-class-footer">
                          <div className="reg-seats full"><Users /> <span>ظرفیت تکمیل</span></div>
                          <strong className="reg-fee">{faNum(cls.fee)} تومان</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {classes.length === 0 && (
                <div className="reg-empty"><BookOpen /><p>در حال حاضر کلاسی برای ثبت‌نام موجود نیست.</p></div>
              )}

              {selectedClass && (
                <div className="reg-submit-bar">
                  <div className="reg-submit-info">
                    <strong>{TYPE_LABEL[actionType]} - {selectedClass.title}</strong>
                    <span>مبلغ: {faNum(selectedClass.fee)} تومان</span>
                  </div>
                  <input
                    className="reg-note-input"
                    placeholder="توضیحات (اختیاری)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="reg-submit-actions">
                    <button type="button" className="reg-cancel-btn" onClick={() => setSelectedClass(null)}>انصراف</button>
                    <button type="button" className="reg-submit-btn" disabled={submitting} onClick={submitRequest}>
                      {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                      ثبت درخواست
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'requests' && (
            <>
              {pendingRequests.length > 0 && (
                <section className="reg-requests-section">
                  <h3 className="reg-section-title">درخواست‌های در انتظار</h3>
                  <div className="reg-requests-list">
                    {pendingRequests.map((req) => {
                      const TypeIcon = TYPE_ICON[req.type] || ClipboardList;
                      const StatusIcon = STATUS_ICON[req.status] || ClockIcon;
                      return (
                        <article key={req.id} className="reg-request-card">
                          <div className="reg-request-top">
                            <div className="reg-request-type">
                              <TypeIcon /> <strong>{TYPE_LABEL[req.type] || req.type}</strong>
                            </div>
                            <span className={`reg-status-badge ${STATUS_CLASS[req.status] || ''}`}>
                              <StatusIcon /> {STATUS_LABEL[req.status] || req.status}
                            </span>
                          </div>
                          <div className="reg-request-meta">
                            <span>تاریخ: {jalaliDate(req.createdAt)}</span>
                            <span>مبلغ: {faNum(req.amount)} تومان</span>
                            <span>پرداخت: {PAY_LABEL[req.paymentStatus] || req.paymentStatus}</span>
                            {req.trackingCode && <span>کد پیگیری: {req.trackingCode}</span>}
                          </div>
                          {req.note && <p className="reg-request-note">{req.note}</p>}
                          <div className="reg-request-actions">
                            {req.amount > 0 && req.paymentStatus !== 'paid' && req.status === 'pending' && (
                              <button type="button" className="reg-pay-btn" disabled={actionLoading === `pay-${req.id}`} onClick={() => payRequest(req.id)}>
                                {actionLoading === `pay-${req.id}` ? <Loader2 className="animate-spin" /> : <CreditCard />} پرداخت آنلاین
                              </button>
                            )}
                            <button type="button" className="reg-cancel-req-btn" disabled={actionLoading === `cancel-${req.id}`} onClick={() => cancelRequest(req.id)}>
                              <XCircle /> لغو درخواست
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {historyRequests.length > 0 && (
                <section className="reg-requests-section">
                  <h3 className="reg-section-title">سابقه درخواست‌ها</h3>
                  <div className="reg-table-wrap">
                    <table className="reg-history-table">
                      <thead>
                        <tr>
                          <th>نوع</th>
                          <th>تاریخ</th>
                          <th>مبلغ</th>
                          <th>پرداخت</th>
                          <th>وضعیت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRequests.map((req) => {
                          const StatusIcon = STATUS_ICON[req.status] || ClockIcon;
                          return (
                            <tr key={req.id}>
                              <td>{TYPE_LABEL[req.type] || req.type}</td>
                              <td>{jalaliDate(req.createdAt)}</td>
                              <td>{faNum(req.amount)} تومان</td>
                              <td>{PAY_LABEL[req.paymentStatus] || req.paymentStatus}</td>
                              <td>
                                <span className={`reg-status-badge ${STATUS_CLASS[req.status] || ''}`}>
                                  <StatusIcon /> {STATUS_LABEL[req.status] || req.status}
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
                <div className="reg-empty"><ClipboardList /><p>هنوز درخواستی ثبت نکرده‌اید.</p></div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
