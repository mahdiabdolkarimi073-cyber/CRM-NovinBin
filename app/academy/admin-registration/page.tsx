'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  CalendarDays, BookOpen, CheckCircle, XCircle, Clock, UserPlus, Repeat, ArrowLeft, ListOrdered,
} from 'lucide-react';

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'مدیریت هنرجوان', icon: Users, href: '/academy/admin-students' },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers' },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management' },
  { label: 'ثبت‌نام‌ها', icon: ClipboardList, href: '/academy/admin-registration', active: true },
  { label: 'کلاس‌ها', icon: CalendarDays, href: '/academy/admin-classes' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/admin-settings' },
];

const TYPE_LABEL: Record<string, string> = {
  renewal: 'تمدید', enrollment: 'ثبت‌نام', class_change: 'جابه‌جایی کلاس', waitlist: 'لیست انتظار',
};
const TYPE_ICON: Record<string, any> = { renewal: Repeat, enrollment: UserPlus, class_change: ArrowLeft, waitlist: ListOrdered };
const STATUS_LABEL: Record<string, string> = { pending: 'در انتظار', approved: 'تأیید شده', rejected: 'رد شده', cancelled: 'لغو شده' };
const PAY_LABEL: Record<string, string> = { unpaid: 'پرداخت نشده', pending: 'در انتظار پرداخت', paid: 'پرداخت شده' };

function formatJalali(date: string | null) {
  if (!date) return '—';
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(date)); }
  catch { return new Date(date).toLocaleDateString('fa-IR'); }
}

export default function AdminRegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/academy/admin-registration', { headers: { 'Cache-Control': 'no-store' } });
      if (res.status === 403) { router.replace('/academy/login'); return; }
      if (res.ok) { const data = await res.json(); setRequests(data.requests || []); }
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function logout() { await fetch('/api/academy/logout', { method: 'POST' }); router.replace('/academy/login'); }

  async function act(requestId: string, action: string) {
    setActionLoading(`${action}-${requestId}`);
    try {
      const res = await fetch('/api/academy/admin-registration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) fetchRequests();
    } finally { setActionLoading(null); }
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  if (loading) return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;

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
          <div className="academy-admin-page-hero">
            <div><h2>مدیریت ثبت‌نام‌ها</h2><p>بررسی و تأیید درخواست‌های ثبت‌نام، تمدید، جابه‌جایی و لیست انتظار</p></div>
            {pendingCount > 0 && <span className="academy-admin-badge badge-warning">{pendingCount.toLocaleString('fa-IR')} در انتظار</span>}
          </div>

          <div className="academy-admin-tabs">
            {[
              { key: 'all', label: 'همه' },
              { key: 'pending', label: 'در انتظار' },
              { key: 'approved', label: 'تأیید شده' },
              { key: 'rejected', label: 'رد شده' },
              { key: 'cancelled', label: 'لغو شده' },
            ].map((tab) => (
              <button key={tab.key} type="button" className={filter === tab.key ? 'active' : ''} onClick={() => setFilter(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="academy-admin-list-empty"><ClipboardList /><p>درخواستی یافت نشد.</p></div>
          ) : (
            <div className="academy-admin-table-wrap">
              <table className="academy-admin-table">
                <thead>
                  <tr>
                    <th>هنرجو</th><th>نوع</th><th>دوره فعلی</th><th>دوره هدف</th>
                    <th>مبلغ</th><th>پرداخت</th><th>وضعیت</th><th>تاریخ</th><th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const TypeIcon = TYPE_ICON[r.type] || ClipboardList;
                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.studentName}</strong>
                          <small style={{ display: 'block', color: '#94A3B8' }}>{r.studentUsername}</small>
                        </td>
                        <td><TypeIcon /> {TYPE_LABEL[r.type] || r.type}</td>
                        <td>{r.currentCourseTitle || '—'}</td>
                        <td>{r.targetCourseTitle || '—'}</td>
                        <td>{r.amount.toLocaleString('fa-IR')} تومان</td>
                        <td><span className={`academy-admin-badge ${r.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>{PAY_LABEL[r.paymentStatus] || r.paymentStatus}</span></td>
                        <td><span className={`academy-admin-badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-error' : r.status === 'cancelled' ? 'badge-neutral' : 'badge-warning'}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                        <td>{formatJalali(r.createdAt)}</td>
                        <td>
                          {r.status === 'pending' && (
                            <div className="academy-admin-row-actions">
                              <button type="button" title="تأیید" disabled={actionLoading === `approve-${r.id}`} onClick={() => act(r.id, 'approve')}>
                                {actionLoading === `approve-${r.id}` ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                              </button>
                              <button type="button" title="رد" disabled={actionLoading === `reject-${r.id}`} onClick={() => act(r.id, 'reject')}>
                                {actionLoading === `reject-${r.id}` ? <Loader2 className="animate-spin" /> : <XCircle />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
