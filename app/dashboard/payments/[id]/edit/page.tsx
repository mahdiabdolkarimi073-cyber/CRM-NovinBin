'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, CreditCard, DollarSign, Lightbulb, Info, Loader2, FileText, User, Bell, Check } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'نقدی' }, { key: 'cheque', label: 'چک' },
  { key: 'transfer', label: 'انتقال بانکی' }, { key: 'card', label: 'کارت' }, { key: 'online', label: 'آنلاین' },
];
const CASH_METHODS = [
  { key: 'direct', label: 'مستقیم' }, { key: 'pos', label: 'POS' },
  { key: 'internet', label: 'اینترنت' }, { key: 'santna', label: 'سنتنا' }, { key: 'paya', label: 'پایا' },
];
const REMINDERS = [
  { key: 'none', label: 'بدون یادآوری' }, { key: '1day', label: '۱ روز' },
  { key: '3day', label: '۳ روز' }, { key: '7day', label: '۷ روز' },
];
const PAYER_TYPES = [{ key: 'customer', label: 'مشتری' }, { key: 'supplier', label: 'تأمین‌کننده' }];
const PAYMENT_STATUSES = [
  { key: 'pending', label: 'در انتظار' }, { key: 'confirmed', label: 'تأیید شده' },
  { key: 'rejected', label: 'رد شده' }, { key: 'cancelled', label: 'لغو شده' },
];

const guideItems = [
  { icon: FileText, title: 'فاکتور مرتبط', desc: 'فاکتور مرتبط را تغییر دهید.' },
  { icon: DollarSign, title: 'مبلغ پرداخت', desc: 'مبلغ پرداخت را اصلاح کنید.' },
  { icon: CreditCard, title: 'روش پرداخت', desc: 'روش پرداخت را تغییر دهید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    invoiceId: '', amount: '', paymentMethod: 'cash', cashMethod: 'direct',
    bankName: '', chequeNumber: '', branchCode: '', trackingNumber: '',
    receivedDate: '', reminder: 'none', payerType: 'customer', payerName: '',
    description: '', status: 'pending',
  });

  const loadData = useCallback(async () => {
    try {
      const inv = await fetchData('invoices', { where: {} });
      setInvoices(inv || []);
    } catch { setInvoices([]); } finally { setLoadingData(false); }
  }, []);

  const loadPayment = useCallback(async () => {
    if (!id) return;
    try {
      const payments = await fetchData('payments', { where: { id } });
      if (payments && payments.length > 0) {
        const p = payments[0];
        setForm({
          invoiceId: p.invoiceId || '', amount: String(Number(p.amount)),
          paymentMethod: p.method || 'cash', cashMethod: p.cashMethod || 'direct',
          bankName: p.bankName || '', chequeNumber: p.chequeNumber || '',
          branchCode: p.branchCode || '', trackingNumber: p.trackingNumber || '',
          receivedDate: p.receivedDate || '', reminder: p.reminder || 'none',
          payerType: p.payerType || 'customer', payerName: p.payerName || '',
          description: p.description || '', status: p.status || 'pending',
        });
      } else {
        toast.error('پرداخت یافت نشد');
        router.push('/dashboard/payments');
      }
    } catch (error: any) {
      toast.error('بارگذاری پرداخت ناموفق: ' + error.message);
    } finally {
      setLoadingPayment(false);
    }
  }, [id, router]);

  useEffect(() => { loadData(); loadPayment(); }, [loadData, loadPayment]);

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
    if (!validate()) return;
    setSubmitting(true);
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    try {
      await updateData('payments', { id }, {
        invoiceId: form.invoiceId === 'none' || !form.invoiceId ? null : form.invoiceId,
        amount, method: form.paymentMethod,
        reference: form.trackingNumber || form.chequeNumber || null,
        description: form.description || null, cashMethod: form.cashMethod || null,
        bankName: form.bankName || null, chequeNumber: form.chequeNumber || null,
        branchCode: form.branchCode || null, trackingNumber: form.trackingNumber || null,
        reminder: form.reminder === 'none' ? null : form.reminder,
        payerType: form.payerType || null, payerName: form.payerName || null,
        receivedDate: form.receivedDate || null, status: form.status,
      });
      toast.success('پرداخت با موفقیت ویرایش شد');
      router.push('/dashboard/payments');
    } catch (error: any) {
      toast.error('ویرایش پرداخت ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPayment) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری پرداخت...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/payments" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به پرداخت‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> پرداخت‌ها <b>←</b> ویرایش پرداخت</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/payments')} disabled={submitting}>انصراف</button>
          <button type="submit" form="payment-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="payment-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>ویرایش پرداخت</h2>
                  <p className="text-sm text-slate-400">اطلاعات پرداخت را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">فاکتور مرتبط</Label>
                <Select value={form.invoiceId || 'none'} onValueChange={(v) => setForm({ ...form, invoiceId: v })}>
                  <SelectTrigger className="h-11"><FileText className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ندارد</SelectItem>
                    {invoices.map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مبلغ (تومان) <span className="text-red-500">*</span></Label>
                  <input dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="nb-input" style={inputStyle} />
                  {errors.amount && <span className="nb-editor-error">{errors.amount}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">روش پرداخت</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                    <SelectTrigger className="h-11"><CreditCard className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع پرداخت‌کننده</Label>
                  <Select value={form.payerType} onValueChange={(v) => setForm({ ...form, payerType: v })}>
                    <SelectTrigger className="h-11"><User className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYER_TYPES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام پرداخت‌کننده</Label>
                  <input value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} placeholder="نام..." className="nb-input" style={inputStyle} />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">وضعیت</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {showCashMethod && (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">روش نقدی</Label>
                  <Select value={form.cashMethod} onValueChange={(v) => setForm({ ...form, cashMethod: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{CASH_METHODS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {showBankFields && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">نام بانک</Label>
                    <input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="nb-input" style={inputStyle} />
                  </div>
                  {form.paymentMethod === 'cheque' && (
                    <>
                      <div className="nb-editor-field-group">
                        <Label className="nb-editor-label">شماره چک</Label>
                        <input dir="ltr" value={form.chequeNumber} onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })} className="nb-input" style={inputStyle} />
                      </div>
                      <div className="nb-editor-field-group">
                        <Label className="nb-editor-label">کد شعبه</Label>
                        <input dir="ltr" value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value })} className="nb-input" style={inputStyle} />
                      </div>
                    </>
                  )}
                  {['transfer', 'online', 'card'].includes(form.paymentMethod) && (
                    <div className="nb-editor-field-group">
                      <Label className="nb-editor-label">شماره پیگیری</Label>
                      <input dir="ltr" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} className="nb-input" style={inputStyle} />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ دریافت</Label>
                  <JalaliDatePicker value={form.receivedDate ? new Date(form.receivedDate) : null} onChange={(d) => setForm({ ...form, receivedDate: d ? toLocalDateString(d) : '' })} className="h-11" />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">یادآوری</Label>
                  <Select value={form.reminder} onValueChange={(v) => setForm({ ...form, reminder: v })}>
                    <SelectTrigger className="h-11"><Bell className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent>{REMINDERS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="توضیحات اختیاری..." className="nb-input" style={inputStyle} />
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنما و نکات</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-slate-300"><item.icon className="h-4 w-4" /></span>
                    <div>
                      <strong className="text-sm text-slate-700 dark:text-slate-300">{item.title}</strong>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش، تغییرات در بخش «پرداخت‌ها» قابل مشاهده است.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
