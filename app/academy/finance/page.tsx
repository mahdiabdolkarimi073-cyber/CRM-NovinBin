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
  UserPlus,
  Settings,
  LifeBuoy,
  Menu,
  Search,
  Bell,
  Loader2,
  CreditCard,
  Target,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Receipt,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

type UserInfo = { id: string; firstName: string; lastName: string; avatarUrl?: string | null; role: string };
type Summary = { totalFee: number; totalDiscount: number; totalPaid: number; totalRemaining: number };
type Installment = {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  installmentNo: number;
};
type Invoice = { id: string; number: string; amount: number; issueDate: string };
type ReceiptItem = { id: string; amount: number; trackingCode: string | null; receivedDate: string };

const navItems = [
  { label: 'کلاس‌های من', icon: BookOpen, href: '/academy/classes' },
  { label: 'تکالیف', icon: ClipboardList, href: '/academy/classes' },
  { label: 'برنامه هفتگی', icon: CalendarDays, href: '/academy/classes' },
  { label: 'حضور و غیاب', icon: CheckCircle, href: '/academy/attendance' },
  { label: 'نمرات و پیشرفت', icon: GraduationCap, href: '/academy/education-record' },
  { label: 'پیام‌ها', icon: MessageSquare, href: '/academy/classes' },
  { label: 'فایل‌ها', icon: Folder, href: '/academy/classes' },
  { label: 'پرداخت‌ها', icon: Wallet, href: '/academy/finance', active: true },
  { label: 'ثبت‌نام / تمدید', icon: UserPlus, href: '/academy/registration' },
  { label: 'پروفایل من', icon: User, href: '/academy/classes' },
  { label: 'تنظیمات', icon: Settings, href: '/academy/classes' },
];

function jalaliDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('fa-IR');
  }
}

const faNum = (n: number) => n.toLocaleString('fa-IR');

const STATUS_LABEL: Record<string, string> = { paid: 'پرداخت شده', pending: 'در انتظار', overdue: 'معوق' };
const STATUS_ICON: Record<string, any> = { paid: CheckCircle2, pending: AlertTriangle, overdue: AlertTriangle };

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/academy/finance', { headers: { 'Cache-Control': 'no-store' } });
      if (!res.ok) throw new Error('نشست نامعتبر');
      const data = await res.json();
      setUser(data.user);
      setSummary(data.summary);
      setInstallments(data.installments || []);
      setInvoices(data.invoices || []);
      setReceipts(data.receipts || []);
    } catch {
      router.replace('/academy/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handlePay(installmentId: string) {
    setPayingId(installmentId);
    try {
      const res = await fetch('/api/academy/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId, action: 'pay_installment' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'پرداخت ناموفق بود');
      toast.success(`پرداخت با موفقیت ثبت شد. کد پیگیری: ${data.trackingCode}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'پرداخت ناموفق بود');
    } finally {
      setPayingId(null);
    }
  }

  async function logout() {
    await fetch('/api/academy/logout', { method: 'POST' });
    router.replace('/academy/login');
  }

  if (loading) {
    return <div className="fin-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user || !summary) {
    return <div className="fin-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  const stats = [
    { label: 'شهریه کل', value: summary.totalFee, icon: Wallet, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'تخفیف', value: summary.totalDiscount, icon: Target, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'پرداخت‌شده', value: summary.totalPaid, icon: CheckCircle2, color: '#22C55E', bg: '#F0FDF4' },
    { label: 'مانده', value: summary.totalRemaining, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
  ];

  return (
    <div className="fin-layout" dir="rtl">
      {sidebarOpen && <div className="fin-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="fin-sidebar-inner">
          <div className="fin-brand">
            <div className="fin-avatar">{user.firstName.slice(0, 1)}</div>
            <div>
              <strong>{user.firstName} {user.lastName}</strong>
              <small>دانش‌آموز</small>
            </div>
          </div>

          <nav className="fin-nav">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={item.active ? 'active' : ''}
                onClick={() => { router.push(item.href); setSidebarOpen(false); }}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="fin-support">
            <strong>نیاز به کمک دارید؟</strong>
            <p>با پشتیبانی در ارتباط باشید</p>
            <button type="button"><LifeBuoy /> پشتیبانی</button>
          </div>

          <button type="button" className="fin-logout" onClick={logout}>
            <LogOut /> <span>خروج</span>
          </button>
        </div>
      </aside>

      <div className="fin-main">
        <header className="fin-header">
          <div className="fin-header-right">
            <button type="button" className="fin-burger" onClick={() => setSidebarOpen(true)} aria-label="منو">
              <Menu />
            </button>
            <div>
              <h1>مالی من</h1>
              <p>وضعیت پرداخت‌ها و شهریه‌های شما</p>
            </div>
          </div>
          <div className="fin-header-left">
            <button type="button" aria-label="جستجو"><Search /></button>
            <button type="button" aria-label="اعلان‌ها" className="fin-bell"><Bell /><span /></button>
            <div className="fin-header-avatar">{user.firstName.slice(0, 1)}</div>
          </div>
        </header>

        <div className="fin-scroll">
          <section className="fin-hero">
            <div className="fin-hero-right">
              <h2>مالی</h2>
              <p>مدیریت پرداخت‌ها و شهریه</p>
            </div>
            <div className="fin-hero-left">
              <span className="fin-hero-label">وضعیت حساب</span>
              <strong className="fin-hero-amount">{faNum(summary.totalRemaining)} تومان</strong>
              <span className="fin-hero-sub">مانده قابل پرداخت</span>
            </div>
          </section>

          <section className="fin-stat-cards">
            {stats.map((s, i) => (
              <article key={i} className="fin-stat-card">
                <div className="fin-stat-icon" style={{ background: s.bg, color: s.color }}>
                  <s.icon />
                </div>
                <div className="fin-stat-body">
                  <span className="fin-stat-label">{s.label}</span>
                  <strong className="fin-stat-value" style={{ color: s.color }}>{faNum(s.value)} تومان</strong>
                </div>
              </article>
            ))}
          </section>

          <section className="fin-table-section">
            <div className="fin-table-heading">
              <h3>اقساط و پرداخت‌ها</h3>
            </div>
            <div className="fin-table-divider" />

            {installments.length === 0 ? (
              <div className="fin-empty"><Wallet /><p>قسطی ثبت نشده است.</p></div>
            ) : (
              <div className="fin-table-wrap">
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>مبلغ قسط</th>
                      <th>تاریخ سررسید</th>
                      <th>تاریخ پرداخت</th>
                      <th>وضعیت</th>
                      <th>مانده قابل پرداخت</th>
                      <th>شماره قسط</th>
                      <th>پرداخت آنلاین</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst) => {
                      const StatusIcon = STATUS_ICON[inst.status] || AlertTriangle;
                      const remaining = inst.status === 'paid' ? 0 : inst.amount;
                      return (
                        <tr key={inst.id}>
                          <td className="fin-amount">{faNum(inst.amount)} تومان</td>
                          <td>{jalaliDate(inst.dueDate)}</td>
                          <td>{inst.paidDate ? jalaliDate(inst.paidDate) : '—'}</td>
                          <td>
                            <span className={`fin-badge ${inst.status}`}>
                              <StatusIcon className="fin-badge-icon" />
                              {STATUS_LABEL[inst.status] || inst.status}
                            </span>
                          </td>
                          <td className="fin-amount">{faNum(remaining)} تومان</td>
                          <td>{faNum(inst.installmentNo)}</td>
                          <td>
                            {inst.status === 'paid' ? (
                              <span className="fin-paid-text">پرداخت شده</span>
                            ) : (
                              <button
                                type="button"
                                className="fin-pay-btn"
                                disabled={payingId === inst.id}
                                onClick={() => handlePay(inst.id)}
                              >
                                {payingId === inst.id ? <Loader2 className="animate-spin" /> : <CreditCard />}
                                پرداخت
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {installments.length > 0 && (
              <div className="fin-table-footer">
                <a className="fin-all-link" href="#">مشاهده همه اقساط</a>
              </div>
            )}
          </section>

          <section className="fin-two-col">
            <div className="fin-card">
              <div className="fin-card-heading">
                <div>
                  <h3>فاکتورها</h3>
                  <p>لیست فاکتورهای ثبت‌شده</p>
                </div>
                <FileText />
              </div>
              <div className="fin-card-divider" />
              {invoices.length === 0 ? (
                <div className="fin-empty-sm"><FileText /><p>فاکتوری ثبت نشده است.</p></div>
              ) : (
                <div className="fin-table-wrap-sm">
                  <table className="fin-table-sm">
                    <thead>
                      <tr>
                        <th>مبلغ</th>
                        <th>تاریخ</th>
                        <th>شناسه فاکتور</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.slice(0, 5).map((inv) => (
                        <tr key={inv.id}>
                          <td className="fin-amount">{faNum(inv.amount)} تومان</td>
                          <td>{jalaliDate(inv.issueDate)}</td>
                          <td className="fin-mono">{inv.number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {invoices.length > 0 && (
                <a className="fin-all-link-sm" href="#">مشاهده همه فاکتورها</a>
              )}
            </div>

            <div className="fin-card">
              <div className="fin-card-heading">
                <div>
                  <h3>رسیدها</h3>
                  <p>لیست رسیدهای ثبت‌شده</p>
                </div>
                <Receipt />
              </div>
              <div className="fin-card-divider" />
              {receipts.length === 0 ? (
                <div className="fin-empty-sm"><Receipt /><p>رسیدی ثبت نشده است.</p></div>
              ) : (
                <div className="fin-table-wrap-sm">
                  <table className="fin-table-sm">
                    <thead>
                      <tr>
                        <th>مبلغ</th>
                        <th>تاریخ</th>
                        <th>کد پیگیری</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.slice(0, 5).map((rc) => (
                        <tr key={rc.id}>
                          <td className="fin-amount">{faNum(rc.amount)} تومان</td>
                          <td>{jalaliDate(rc.receivedDate)}</td>
                          <td className="fin-mono">{rc.trackingCode || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {receipts.length > 0 && (
                <a className="fin-all-link-sm" href="#">مشاهده همه رسیدها</a>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
