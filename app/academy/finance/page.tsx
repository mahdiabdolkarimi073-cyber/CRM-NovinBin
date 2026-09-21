'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  Target,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileText,
  Receipt,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { StudentShell } from '@/components/academy/student-shell';

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
    return <div className="student-shell-loading"><Loader2 className="animate-spin" /></div>;
  }
  if (!user || !summary) {
    return <div className="student-shell-loading"><p>خطا در بارگذاری صفحه</p></div>;
  }

  const stats = [
    { label: 'شهریه کل', value: summary.totalFee, icon: Wallet, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'تخفیف', value: summary.totalDiscount, icon: Target, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'پرداخت‌شده', value: summary.totalPaid, icon: CheckCircle2, color: '#22C55E', bg: '#F0FDF4' },
    { label: 'مانده', value: summary.totalRemaining, icon: AlertTriangle, color: '#EF4444', bg: '#FEF2F2' },
  ];

  return (
    <StudentShell
      user={user}
      activePath="/academy/finance"
      pageTitle="مالی من"
      pageSubtitle="وضعیت پرداخت‌ها و شهریه‌های شما"
      onLogout={logout}
    >
      <section className="student-page-hero">
        <div>
          <h2>مالی</h2>
          <p>مدیریت پرداخت‌ها و شهریه</p>
        </div>
        <div className="student-page-hero-badge">
          <strong>{faNum(summary.totalRemaining)} تومان</strong>
          <span>مانده قابل پرداخت</span>
        </div>
      </section>

      <section className="student-page-stats">
        {stats.map((s, i) => (
          <div key={i} className="student-page-stat-card">
            <span className="student-page-stat-icon" style={{ background: s.bg, color: s.color }}><s.icon /></span>
            <div className="student-page-stat-body">
              <span className="student-page-stat-label">{s.label}</span>
              <strong className="student-page-stat-value" style={{ color: s.color }}>{faNum(s.value)} تومان</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="student-page-panel">
        <div className="student-page-panel-heading"><div><h3>اقساط و پرداخت‌ها</h3></div></div>
        {installments.length === 0 ? (
          <div className="student-page-empty"><Wallet /><p>قسطی ثبت نشده است.</p></div>
        ) : (
          <div className="student-page-table-wrap">
            <table className="student-page-table">
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
                      <td style={{fontWeight:600}}>{faNum(inst.amount)} تومان</td>
                      <td>{jalaliDate(inst.dueDate)}</td>
                      <td>{inst.paidDate ? jalaliDate(inst.paidDate) : '—'}</td>
                      <td>
                        <span className={`student-page-badge ${inst.status}`}>
                          <StatusIcon style={{width:14,height:14}} />
                          {STATUS_LABEL[inst.status] || inst.status}
                        </span>
                      </td>
                      <td style={{fontWeight:600}}>{faNum(remaining)} تومان</td>
                      <td>{faNum(inst.installmentNo)}</td>
                      <td>
                        {inst.status === 'paid' ? (
                          <span style={{fontSize:12,color:'#22C55E',fontWeight:600}}>پرداخت شده</span>
                        ) : (
                          <button
                            type="button"
                            className="student-page-btn primary"
                            disabled={payingId === inst.id}
                            onClick={() => handlePay(inst.id)}
                          >
                            {payingId === inst.id ? <Loader2 className="animate-spin" style={{width:15,height:15}} /> : <CreditCard style={{width:15,height:15}} />}
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
      </section>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <section className="student-page-panel">
          <div className="student-page-panel-heading"><div><h3>فاکتورها</h3><p>لیست فاکتورهای ثبت‌شده</p></div><FileText /></div>
          {invoices.length === 0 ? (
            <div className="student-page-empty"><FileText /><p>فاکتوری ثبت نشده است.</p></div>
          ) : (
            <div className="student-page-table-wrap">
              <table className="student-page-table">
                <thead>
                  <tr><th>مبلغ</th><th>تاریخ</th><th>شناسه فاکتور</th></tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id}>
                      <td style={{fontWeight:600}}>{faNum(inv.amount)} تومان</td>
                      <td>{jalaliDate(inv.issueDate)}</td>
                      <td style={{fontFamily:'monospace',fontSize:12}}>{inv.number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {invoices.length > 0 && <a href="#" style={{fontSize:13,color:'#2563EB',textDecoration:'none',fontWeight:500,display:'block',marginTop:12}}>مشاهده همه فاکتورها</a>}
        </section>

        <section className="student-page-panel">
          <div className="student-page-panel-heading"><div><h3>رسیدها</h3><p>لیست رسیدهای ثبت‌شده</p></div><Receipt /></div>
          {receipts.length === 0 ? (
            <div className="student-page-empty"><Receipt /><p>رسیدی ثبت نشده است.</p></div>
          ) : (
            <div className="student-page-table-wrap">
              <table className="student-page-table">
                <thead>
                  <tr><th>مبلغ</th><th>تاریخ</th><th>کد پیگیری</th></tr>
                </thead>
                <tbody>
                  {receipts.slice(0, 5).map((rc) => (
                    <tr key={rc.id}>
                      <td style={{fontWeight:600}}>{faNum(rc.amount)} تومان</td>
                      <td>{jalaliDate(rc.receivedDate)}</td>
                      <td style={{fontFamily:'monospace',fontSize:12}}>{rc.trackingCode || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {receipts.length > 0 && <a href="#" style={{fontSize:13,color:'#2563EB',textDecoration:'none',fontWeight:500,display:'block',marginTop:12}}>مشاهده همه رسیدها</a>}
        </section>
      </div>
    </StudentShell>
  );
}
