'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, CreditCard, DollarSign, Lightbulb, Info, Loader2, FileText, User, Calendar, Bell } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'نقدی' },
  { key: 'cheque', label: 'چک' },
  { key: 'transfer', label: 'انتقال بانکی' },
  { key: 'card', label: 'کارت' },
  { key: 'online', label: 'آنلاین' },
];

const CASH_METHODS = [
  { key: 'direct', label: 'مستقیم' },
  { key: 'pos', label: 'POS' },
  { key: 'internet', label: 'اینترنت' },
  { key: 'santna', label: 'سنتنا' },
  { key: 'paya', label: 'پایا' },
];

const REMINDERS = [
  { key: 'none', label: 'بدون یادآوری' },
  { key: '1day', label: '۱ روز' },
  { key: '3day', label: '۳ روز' },
  { key: '7day', label: '۷ روز' },
];

const PAYER_TYPES = [
  { key: 'customer', label: 'مشتری' },
  { key: 'supplier', label: 'تأمین‌کننده' },
];

const guideItems = [
  { icon: FileText, title: 'فاکتور مرتبط', desc: 'در صورت وجود، فاکتور مرتبط را انتخاب کنید.' },
  { icon: DollarSign, title: 'مبلغ پرداخت', desc: 'مبلغ پرداخت را به تومان وارد کنید.' },
  { icon: CreditCard, title: 'روش پرداخت', desc: 'نوع پرداخت (نقدی، چک، کارت و...) را انتخاب کنید.' },
  { icon: User, title: 'پرداخت‌کننده', desc: 'نوع و نام پرداخت‌کننده را مشخص کنید.' },
];

const emptyForm = () => ({
  invoiceId: '', amount: '', paymentMethod: 'cash', cashMethod: 'direct',
  bankName: '', chequeNumber: '', branchCode: '', trackingNumber: '',
  receivedDate: toLocalDateString(new Date()), reminder: 'none',
  payerType: 'customer', payerName: '', description: '',
});

export default function NewPaymentPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm());

  const loadData = useCallback(async () => {
    try {
      const inv = await fetchData('invoices', { where: {} });
      setInvoices(inv || []);
    } catch {
      setInvoices([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showBankFields = ['cheque', 'transfer', 'card', 'online'].includes(form.paymentMethod);
  const showCashMethod = form.paymentMethod === 'cash';

  const validate = () => {
    const e: Record<string, string> = {};
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    if (amount <= 0) e.amount = 'مبلغ معتبر وارد کنید';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    const number = 'PAY-' + Date.now().toString().slice(-6);
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    try {
      await createData('payments', {
        number,
        invoiceId: form.invoiceId === 'none' || !form.invoiceId ? null : form.invoiceId,
        amount,
        method: form.paymentMethod,
        reference: form.trackingNumber || form.chequeNumber || null,
        date: new Date().toISOString(),
        status: 'pending',
        description: form.description || null,
        cashMethod: form.cashMethod || null,
        bankName: form.bankName || null,
        chequeNumber: form.chequeNumber || null,
        branchCode: form.branchCode || null,
        trackingNumber: form.trackingNumber || null,
        reminder: form.reminder === 'none' ? null : form.reminder,
        payerType: form.payerType || null,
        payerName: form.payerName || null,
        receivedDate: form.receivedDate || null,
        createdBy: profile.id,
      });
      toast.success('پرداخت با موفقیت ثبت شد');
      router.push('/dashboard/payments');
    } catch (error: any) {
      toast.error('ثبت پرداخت ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ثبت پرداخت جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> پرداخت‌ها <b>←</b> ثبت پرداخت
            </div>
          </div>
          <Link href="/dashboard/payments" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به پرداخت‌ها
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات پرداخت</h2>
                  <p>جزئیات پرداخت را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">فاکتور مرتبط</Label>
                <Select value={form.invoiceId || 'none'} onValueChange={(v) => setForm({ ...form, invoiceId: v })}>
                  <SelectTrigger className="task-select">
                    <span className="select-icon-right"><FileText className="h-4 w-4" /></span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ندارد</SelectItem>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">مبلغ (تومان) <span className="required-star">*</span></Label>
                  <Input
                    dir="ltr"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="task-input"
                  />
                  {errors.amount && <span className="field-error">{errors.amount}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">روش پرداخت <span className="required-star">*</span></Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><CreditCard className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">نوع پرداخت‌کننده</Label>
                  <Select value={form.payerType} onValueChange={(v) => setForm({ ...form, payerType: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><User className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYER_TYPES.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">نام پرداخت‌کننده</Label>
                  <Input
                    value={form.payerName}
                    onChange={(e) => setForm({ ...form, payerName: e.target.value })}
                    placeholder="نام..."
                    className="task-input"
                  />
                </div>
              </div>

              {showCashMethod && (
                <div className="field-group">
                  <Label className="field-label">روش نقدی</Label>
                  <Select value={form.cashMethod} onValueChange={(v) => setForm({ ...form, cashMethod: v })}>
                    <SelectTrigger className="task-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CASH_METHODS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showBankFields && (
                <div className="management-row">
                  <div className="field-group">
                    <Label className="field-label">نام بانک</Label>
                    <Input
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      className="task-input"
                    />
                  </div>
                  {form.paymentMethod === 'cheque' && (
                    <>
                      <div className="field-group">
                        <Label className="field-label">شماره چک</Label>
                        <Input
                          dir="ltr"
                          value={form.chequeNumber}
                          onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })}
                          className="task-input"
                        />
                      </div>
                      <div className="field-group">
                        <Label className="field-label">کد شعبه</Label>
                        <Input
                          dir="ltr"
                          value={form.branchCode}
                          onChange={(e) => setForm({ ...form, branchCode: e.target.value })}
                          className="task-input"
                        />
                      </div>
                    </>
                  )}
                  {['transfer', 'online', 'card'].includes(form.paymentMethod) && (
                    <div className="field-group">
                      <Label className="field-label">شماره پیگیری</Label>
                      <Input
                        dir="ltr"
                        value={form.trackingNumber}
                        onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                        className="task-input"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">تاریخ دریافت</Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker
                      value={form.receivedDate ? new Date(form.receivedDate) : null}
                      onChange={(d) => setForm({ ...form, receivedDate: d ? toLocalDateString(d) : '' })}
                      className="task-date-input"
                    />
                  </div>
                </div>
                <div className="field-group">
                  <Label className="field-label">یادآوری</Label>
                  <Select value={form.reminder} onValueChange={(v) => setForm({ ...form, reminder: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Bell className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDERS.map((r) => (
                        <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="توضیحات اختیاری..."
                  className="task-input"
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/payments')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : 'ثبت پرداخت'}
              </button>
            </div>
          </form>

          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنما و نکات</h2>
              </div>
              <div className="guide-items">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="guide-item">
                      <span className="guide-item-icon"><item.icon className="h-5 w-5" /></span>
                      <div className="guide-item-text">
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                    {i < guideItems.length - 1 && <div className="guide-item-divider" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <span className="info-card-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>پرداخت‌های ثبت شده در بخش «پرداخت‌ها» قابل مدیریت هستند. شماره پرداخت خودکار تولید می‌شود و وضعیت اولیه «در انتظار» خواهد بود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
