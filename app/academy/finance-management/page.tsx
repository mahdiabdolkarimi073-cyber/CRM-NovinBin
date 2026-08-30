'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Loader2, LogOut, Bell, Menu, LifeBuoy, Settings, ClipboardList, Wallet,
  CalendarDays, BookOpen, Plus, X, Trash2, DollarSign, FileText, Receipt, Percent, CreditCard, TrendingDown, UserCheck, CheckCircle,
} from 'lucide-react';

type TabKey = 'tuition' | 'discount' | 'installment' | 'payment' | 'debt' | 'invoice' | 'receipt' | 'teacherShare' | 'teacherSettlement';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'tuition', label: 'شهریه', icon: Wallet },
  { key: 'discount', label: 'تخفیف', icon: Percent },
  { key: 'installment', label: 'قسط', icon: CalendarDays },
  { key: 'payment', label: 'پرداخت', icon: CreditCard },
  { key: 'debt', label: 'بدهی', icon: TrendingDown },
  { key: 'invoice', label: 'فاکتور', icon: FileText },
  { key: 'receipt', label: 'رسید', icon: Receipt },
  { key: 'teacherShare', label: 'سهم مدرس', icon: UserCheck },
  { key: 'teacherSettlement', label: 'تسویه مدرس', icon: CheckCircle },
];

const navItems = [
  { label: 'داشبورد', icon: BookOpen, href: '/academy/admin-dashboard' },
  { label: 'دانش‌آموزان', icon: Users, href: '/academy/students' },
  { label: 'مدرس‌ها', icon: Users, href: '/academy/teachers' },
  { label: 'آموزش', icon: ClipboardList, href: '/academy/education' },
  { label: 'مالی', icon: Wallet, href: '/academy/finance-management', active: true },
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

export default function FinanceManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('tuition');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(() => {
    fetch('/api/academy/finance-management', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => { if (res.ok) setData(await res.json()); else if (res.status === 403) router.replace('/academy/login'); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function logout() { await fetch('/api/academy/logout', { method: 'POST' }); router.replace('/academy/login'); }

  function openCreate(type: string) {
    setModalType(type); setForm({}); setError(''); setShowModal(true);
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/academy/finance-management', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: modalType, data: form }) });
      const resData = await res.json();
      if (!res.ok) { setError(resData.error || 'خطا'); return; }
      setShowModal(false); fetchData();
    } finally { setSaving(false); }
  }

  async function settle(type: string, id: string) {
    await fetch('/api/academy/finance-management', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, data: { id } }) });
    fetchData();
  }

  async function remove(type: string, id: string) {
    await fetch(`/api/academy/finance-management?type=${type}&id=${id}`, { method: 'DELETE' });
    fetchData();
  }

  if (loading) return <div className="academy-admin-loading"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="academy-admin-loading"><p>خطا در بارگذاری</p></div>;

  const { summary } = data;

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
            <div><h2>مدیریت مالی</h2><p>شهریه، تخفیف، اقساط، پرداخت‌ها، فاکتورها، رسیدها و تسویه مدرس‌ها</p></div>
          </div>

          <div className="academy-admin-summary-grid">
            <div className="academy-admin-summary-card"><Wallet /><strong>{formatMoney(summary.totalFee)}</strong><small>کل شهریه</small></div>
            <div className="academy-admin-summary-card"><CreditCard /><strong>{formatMoney(summary.totalPaid)}</strong><small>کل پرداختی</small></div>
            <div className="academy-admin-summary-card"><TrendingDown /><strong>{formatMoney(summary.totalDebt)}</strong><small>بدهی</small></div>
            <div className="academy-admin-summary-card"><Percent /><strong>{formatMoney(summary.totalDiscount)}</strong><small>تخفیف</small></div>
          </div>

          <div className="academy-admin-tabs">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
                <tab.icon /> {tab.label}
              </button>
            ))}
          </div>

          <div className="academy-admin-tab-content">
            {activeTab === 'tuition' && (
              <div className="academy-admin-sec">
                <h3>شهریه دوره‌ها</h3>
                {data.enrollments.length === 0 ? (
                  <div className="academy-admin-list-empty"><Wallet /><p>شهریه‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>شهریه</th><th>پرداختی</th><th>باقی‌مانده</th><th>وضعیت</th></tr></thead>
                      <tbody>
                        {data.enrollments.map((e: any) => (
                          <tr key={e.id}>
                            <td><strong>{e.courseTitle}</strong></td><td>{formatMoney(e.fee)}</td><td>{formatMoney(e.paid)}</td>
                            <td>{formatMoney(e.fee - e.paid)}</td>
                            <td><span className={`academy-admin-badge ${e.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{e.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'discount' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>تخفیف‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('discount')}><Plus /> تخفیف جدید</button></div>
                {data.discounts.length === 0 ? (
                  <div className="academy-admin-list-empty"><Percent /><p>تخفیفی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>عنوان</th><th>دوره</th><th>درصد</th><th>مبلغ</th><th>تاریخ</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.discounts.map((d: any) => (
                          <tr key={d.id}>
                            <td><strong>{d.title}</strong></td><td>{d.courseTitle}</td><td>{d.percent.toLocaleString('fa-IR')}٪</td>
                            <td>{formatMoney(d.amount)}</td><td>{formatJalali(d.createdAt)}</td>
                            <td><div className="academy-admin-row-actions"><button type="button" onClick={() => remove('discount', d.id)}><Trash2 /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'installment' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>اقساط</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('installment')}><Plus /> قسط جدید</button></div>
                {data.installments.length === 0 ? (
                  <div className="academy-admin-list-empty"><CalendarDays /><p>قسطی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>قسط</th><th>مبلغ</th><th>سررسید</th><th>پرداخت</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.installments.map((i: any) => (
                          <tr key={i.id}>
                            <td>{i.courseTitle}</td><td>{i.installmentNo.toLocaleString('fa-IR')}</td><td>{formatMoney(i.amount)}</td>
                            <td>{formatJalali(i.dueDate)}</td><td>{formatJalali(i.paidDate)}</td>
                            <td><span className={`academy-admin-badge ${i.status === 'paid' ? 'badge-success' : i.status === 'overdue' ? 'badge-error' : 'badge-warning'}`}>{i.status === 'paid' ? 'پرداخت شده' : i.status === 'overdue' ? 'سررسید گذشته' : 'در انتظار'}</span></td>
                            <td><div className="academy-admin-row-actions">
                              {i.status !== 'paid' && <button type="button" title="ثبت پرداخت" onClick={() => settle('payInstallment', i.id)}><CheckCircle /></button>}
                              <button type="button" onClick={() => remove('installment', i.id)}><Trash2 /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>پرداخت‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('payment')}><Plus /> پرداخت جدید</button></div>
                {data.payments.length === 0 ? (
                  <div className="academy-admin-list-empty"><CreditCard /><p>پرداختی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>مبلغ</th><th>روش</th><th>کد پیگیری</th><th>تاریخ</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.payments.map((p: any) => (
                          <tr key={p.id}>
                            <td><strong>{formatMoney(p.amount)}</strong></td><td>{p.method}</td><td>{p.trackingCode || '—'}</td>
                            <td>{formatJalali(p.paidAt)}</td>
                            <td><div className="academy-admin-row-actions"><button type="button" onClick={() => remove('payment', p.id)}><Trash2 /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'debt' && (
              <div className="academy-admin-sec">
                <h3>بدهی‌ها</h3>
                <div className="academy-admin-summary-grid">
                  <div className="academy-admin-summary-card"><Wallet /><strong>{formatMoney(summary.totalFee)}</strong><small>کل شهریه</small></div>
                  <div className="academy-admin-summary-card"><CreditCard /><strong>{formatMoney(summary.totalPaid)}</strong><small>پرداختی</small></div>
                  <div className="academy-admin-summary-card"><Percent /><strong>{formatMoney(summary.totalDiscount)}</strong><small>تخفیف</small></div>
                  <div className="academy-admin-summary-card"><TrendingDown /><strong>{formatMoney(summary.totalDebt)}</strong><small>بدهی خالص</small></div>
                </div>
                {data.enrollments.filter((e: any) => e.fee - e.paid > 0).length === 0 ? (
                  <div className="academy-admin-list-empty"><TrendingDown /><p>بدهی وجود ندارد.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>دوره</th><th>شهریه</th><th>پرداختی</th><th>بدهی</th></tr></thead>
                      <tbody>
                        {data.enrollments.filter((e: any) => e.fee - e.paid > 0).map((e: any) => (
                          <tr key={e.id}>
                            <td><strong>{e.courseTitle}</strong></td><td>{formatMoney(e.fee)}</td><td>{formatMoney(e.paid)}</td>
                            <td><strong style={{ color: '#EF4444' }}>{formatMoney(e.fee - e.paid)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'invoice' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>فاکتورها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('invoice')}><Plus /> فاکتور جدید</button></div>
                {data.invoices.length === 0 ? (
                  <div className="academy-admin-list-empty"><FileText /><p>فاکتوری ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>شماره</th><th>مبلغ</th><th>تاریخ صدور</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.invoices.map((inv: any) => (
                          <tr key={inv.id}>
                            <td><strong>{inv.number}</strong></td><td>{formatMoney(inv.amount)}</td>
                            <td>{formatJalali(inv.issueDate)}</td>
                            <td><div className="academy-admin-row-actions"><button type="button" onClick={() => remove('invoice', inv.id)}><Trash2 /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'receipt' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>رسیدها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('receipt')}><Plus /> رسید جدید</button></div>
                {data.receipts.length === 0 ? (
                  <div className="academy-admin-list-empty"><Receipt /><p>رسیدی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>مبلغ</th><th>کد پیگیری</th><th>تاریخ</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.receipts.map((r: any) => (
                          <tr key={r.id}>
                            <td><strong>{formatMoney(r.amount)}</strong></td><td>{r.trackingCode || '—'}</td>
                            <td>{formatJalali(r.receivedDate)}</td>
                            <td><div className="academy-admin-row-actions"><button type="button" onClick={() => remove('receipt', r.id)}><Trash2 /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teacherShare' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>سهم مدرس‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('teacherShare')}><Plus /> سهم جدید</button></div>
                <div className="academy-admin-summary-grid">
                  <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalShare)}</strong><small>کل سهم</small></div>
                  <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalSharePaid)}</strong><small>پرداخت شده</small></div>
                  <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalSharePending)}</strong><small>در انتظار</small></div>
                </div>
                {data.teacherShares.length === 0 ? (
                  <div className="academy-admin-list-empty"><UserCheck /><p>سهمی ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>مدرس</th><th>دوره</th><th>درصد</th><th>مبلغ</th><th>وضعیت</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.teacherShares.map((t: any) => (
                          <tr key={t.id}>
                            <td><strong>{t.teacherName}</strong></td><td>{t.courseTitle}</td><td>{t.percent.toLocaleString('fa-IR')}٪</td>
                            <td>{formatMoney(t.amount)}</td>
                            <td><span className={`academy-admin-badge ${t.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{t.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}</span></td>
                            <td><div className="academy-admin-row-actions">
                              {t.status !== 'paid' && <button type="button" title="تسویه" onClick={() => settle('settleShare', t.id)}><CheckCircle /></button>}
                              <button type="button" onClick={() => remove('teacherShare', t.id)}><Trash2 /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teacherSettlement' && (
              <div className="academy-admin-sec">
                <div className="academy-admin-sec-header"><h3>تسویه مدرس‌ها</h3><button type="button" className="academy-admin-btn-primary" onClick={() => openCreate('teacherSettlement')}><Plus /> تسویه جدید</button></div>
                <div className="academy-admin-summary-grid">
                  <div className="academy-admin-summary-card"><CheckCircle /><strong>{formatMoney(summary.totalSettled)}</strong><small>تسویه شده</small></div>
                  <div className="academy-admin-summary-card"><DollarSign /><strong>{formatMoney(summary.totalPendingSettlement)}</strong><small>در انتظار</small></div>
                </div>
                {data.teacherSettlements.length === 0 ? (
                  <div className="academy-admin-list-empty"><CheckCircle /><p>تسویه‌ای ثبت نشده است.</p></div>
                ) : (
                  <div className="academy-admin-table-wrap">
                    <table className="academy-admin-table">
                      <thead><tr><th>مدرس</th><th>مبلغ</th><th>دوره</th><th>وضعیت</th><th>تاریخ تسویه</th><th>عملیات</th></tr></thead>
                      <tbody>
                        {data.teacherSettlements.map((t: any) => (
                          <tr key={t.id}>
                            <td><strong>{t.teacherName}</strong></td><td>{formatMoney(t.amount)}</td><td>{t.period}</td>
                            <td><span className={`academy-admin-badge ${t.status === 'settled' ? 'badge-success' : 'badge-warning'}`}>{t.status === 'settled' ? 'تسویه شده' : 'در انتظار'}</span></td>
                            <td>{formatJalali(t.settledAt)}</td>
                            <td><div className="academy-admin-row-actions">
                              {t.status !== 'settled' && <button type="button" title="تسویه" onClick={() => settle('settleSettlement', t.id)}><CheckCircle /></button>}
                              <button type="button" onClick={() => remove('teacherSettlement', t.id)}><Trash2 /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="academy-admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="academy-admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="academy-admin-modal-header">
              <h3>{modalType === 'discount' ? 'تخفیف جدید' : modalType === 'installment' ? 'قسط جدید' : modalType === 'payment' ? 'پرداخت جدید' : modalType === 'invoice' ? 'فاکتور جدید' : modalType === 'receipt' ? 'رسید جدید' : modalType === 'teacherShare' ? 'سهم مدرس' : 'تسویه مدرس'}</h3>
              <button type="button" onClick={() => setShowModal(false)}><X /></button>
            </div>
            <div className="academy-admin-modal-body">
              {error && <div className="academy-admin-modal-error">{error}</div>}
              <div className="academy-admin-form-grid">
                {(modalType === 'discount' || modalType === 'installment' || modalType === 'payment' || modalType === 'invoice' || modalType === 'receipt' || modalType === 'teacherShare' || modalType === 'teacherSettlement') && (
                  <div className="academy-admin-field"><label>شناسه دانش‌آموز</label><input type="text" value={form.studentId || ''} onChange={(e) => setForm({ ...form, studentId: e.target.value })} /></div>
                )}
                {modalType === 'discount' && (
                  <>
                    <div className="academy-admin-field"><label>عنوان</label><input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>درصد</label><input type="number" value={form.percent || 0} onChange={(e) => setForm({ ...form, percent: parseFloat(e.target.value) })} /></div>
                    <div className="academy-admin-field"><label>مبلغ</label><input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) })} /></div>
                  </>
                )}
                {modalType === 'installment' && (
                  <>
                    <div className="academy-admin-field"><label>مبلغ</label><input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) })} /></div>
                    <div className="academy-admin-field"><label>سررسید</label><input type="date" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>شماره قسط</label><input type="number" value={form.installmentNo || 1} onChange={(e) => setForm({ ...form, installmentNo: parseInt(e.target.value) })} /></div>
                  </>
                )}
                {modalType === 'payment' && (
                  <>
                    <div className="academy-admin-field"><label>مبلغ</label><input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) })} /></div>
                    <div className="academy-admin-field"><label>روش</label><select value={form.method || 'cash'} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="cash">نقدی</option><option value="card">کارت</option><option value="transfer">انتقال</option></select></div>
                    <div className="academy-admin-field"><label>کد پیگیری</label><input type="text" value={form.trackingCode || ''} onChange={(e) => setForm({ ...form, trackingCode: e.target.value })} /></div>
                  </>
                )}
                {modalType === 'invoice' && (
                  <>
                    <div className="academy-admin-field"><label>شماره</label><input type="text" value={form.number || ''} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>مبلغ</label><input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) })} /></div>
                  </>
                )}
                {modalType === 'receipt' && (
                  <>
                    <div className="academy-admin-field"><label>مبلغ</label><input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) })} /></div>
                    <div className="academy-admin-field"><label>کد پیگیری</label><input type="text" value={form.trackingCode || ''} onChange={(e) => setForm({ ...form, trackingCode: e.target.value })} /></div>
                  </>
                )}
                {modalType === 'teacherShare' && (
                  <>
                    <div className="academy-admin-field"><label>شناسه مدرس</label><input type="text" value={form.teacherId || ''} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>درصد</label><input type="number" value={form.percent || 0} onChange={(e) => setForm({ ...form, percent: parseFloat(e.target.value) })} /></div>
                    <div className="academy-admin-field"><label>مبلغ</label><input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) })} /></div>
                  </>
                )}
                {modalType === 'teacherSettlement' && (
                  <>
                    <div className="academy-admin-field"><label>شناسه مدرس</label><input type="text" value={form.teacherId || ''} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} /></div>
                    <div className="academy-admin-field"><label>مبلغ</label><input type="number" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) })} /></div>
                    <div className="academy-admin-field"><label>دوره</label><input type="text" value={form.period || ''} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
                  </>
                )}
              </div>
            </div>
            <div className="academy-admin-modal-footer">
              <button type="button" className="academy-admin-btn-ghost" onClick={() => setShowModal(false)}>انصراف</button>
              <button type="button" className="academy-admin-btn-primary" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null} ثبت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
