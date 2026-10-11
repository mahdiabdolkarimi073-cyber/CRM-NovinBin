'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Banknote, DollarSign, Lightbulb, Info, Loader2, FileText, User, Building, Bell, Check } from 'lucide-react';
import { formatToman, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const DEPOSIT_TO = [
  { key: 'main_account', label: 'حساب اصلی' }, { key: 'tehran_branch', label: 'شعبه تهران' },
  { key: 'isfahan_branch', label: 'شعبه اصفهان' }, { key: 'shiraz_branch', label: 'شعبه شیراز' },
];
const RECEIPT_TYPES = [
  { key: 'cash', label: 'نقدی' }, { key: 'cheque', label: 'چک' },
  { key: 'bank_transfer', label: 'انتقال بانکی' }, { key: 'card_to_card', label: 'کارت به کارت' }, { key: 'pos', label: 'POS' },
];
const CASH_METHODS = [
  { key: 'direct', label: 'مستقیم' }, { key: 'atm', label: 'ATM' },
  { key: 'internet', label: 'اینترنت' }, { key: 'cash_register', label: 'صندوق فروش' },
];
const REMINDERS = [
  { key: 'none', label: 'بدون یادآوری' }, { key: '1day', label: '۱ روز' },
  { key: '3day', label: '۳ روز' }, { key: '7day', label: '۷ روز' },
];
const PAYER_TYPES = [{ key: 'customer', label: 'مشتری' }, { key: 'supplier', label: 'تأمین‌کننده' }];

const guideItems = [
  { icon: FileText, title: 'فاکتور مرتبط', desc: 'فاکتور مرتبط را تغییر دهید.' },
  { icon: DollarSign, title: 'مبلغ رسید', desc: 'مبلغ رسید را اصلاح کنید.' },
  { icon: Banknote, title: 'نوع رسید', desc: 'نوع رسید را تغییر دهید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingReceipt, setLoadingReceipt] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    invoice_id: '', amount: '', deposit_to: 'main_account', receipt_type: 'cash',
    cash_method: 'direct', bank_name: '', cheque_number: '', branch_code: '',
    tracking_number: '', received_date: '', reminder: 'none',
    payer_type: 'customer', payer_name: '', notes: '', manual_number: '',
  });

  const loadData = useCallback(async () => {
    try {
      const inv = await fetchData('invoices', { where: {} });
      setInvoices(inv || []);
    } catch { setInvoices([]); }
  }, []);

  const loadReceipt = useCallback(async () => {
    if (!id) return;
    try {
      const receipts = await fetchData('receipts', { where: { id } });
      if (receipts && receipts.length > 0) {
        const r = receipts[0];
        setForm({
          invoice_id: r.relatedInvoiceId || '', amount: String(Number(r.amount)),
          deposit_to: r.depositTo || 'main_account', receipt_type: r.receiptType || 'cash',
          cash_method: r.cashMethod || 'direct', bank_name: r.bankName || '',
          cheque_number: r.chequeNumber || '', branch_code: r.branchCode || '',
          tracking_number: r.trackingNumber || '', received_date: r.receivedDate || '',
          reminder: r.reminder || 'none', payer_type: r.payerType || 'customer',
          payer_name: r.payerName || '', notes: r.notes || '', manual_number: r.manualNumber || '',
        });
      } else {
        toast.error('رسید یافت نشد');
        router.push('/dashboard/receipts');
      }
    } catch (error: any) {
      toast.error('بارگذاری رسید ناموفق: ' + error.message);
    } finally {
      setLoadingReceipt(false);
    }
  }, [id, router]);

  useEffect(() => { loadData(); loadReceipt(); }, [loadData, loadReceipt]);

  const showBankFields = ['cheque', 'bank_transfer', 'card_to_card'].includes(form.receipt_type);
  const showCashMethod = ['cash', 'pos'].includes(form.receipt_type);

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
      await updateData('receipts', { id }, {
        relatedInvoiceId: form.invoice_id === 'none' || !form.invoice_id ? null : form.invoice_id,
        amount, depositTo: form.deposit_to || null, receiptType: form.receipt_type,
        cashMethod: form.cash_method || null, bankName: form.bank_name || null,
        chequeNumber: form.cheque_number || null, branchCode: form.branch_code || null,
        trackingNumber: form.tracking_number || null, receivedDate: form.received_date,
        reminder: form.reminder === 'none' ? null : form.reminder,
        payerType: form.payer_type || null, payerName: form.payer_name || null,
        notes: form.notes || null, manualNumber: form.manual_number || null,
      });
      toast.success('رسید با موفقیت ویرایش شد');
      router.push('/dashboard/receipts');
    } catch (error: any) {
      toast.error('ویرایش رسید ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingReceipt) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری رسید...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/receipts" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به رسیدها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> رسیدها <b>←</b> ویرایش رسید</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/receipts')} disabled={submitting}>انصراف</button>
          <button type="submit" form="receipt-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="receipt-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/20">
                  <Banknote className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>ویرایش رسید</h2>
                  <p className="text-sm text-slate-400">اطلاعات رسید را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">فاکتور مرتبط</Label>
                <Select value={form.invoice_id || 'none'} onValueChange={(v) => setForm({ ...form, invoice_id: v })}>
                  <SelectTrigger className="h-11"><FileText className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ندارد</SelectItem>
                    {invoices.map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.number} — {formatToman(Number(inv.amount))} ت</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مبلغ (تومان) <span className="text-red-500">*</span></Label>
                  <input dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="nb-input" style={inputStyle} />
                  {errors.amount && <span className="nb-editor-error">{errors.amount}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">واریز به</Label>
                  <Select value={form.deposit_to} onValueChange={(v) => setForm({ ...form, deposit_to: v })}>
                    <SelectTrigger className="h-11"><Building className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent>{DEPOSIT_TO.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع رسید</Label>
                  <Select value={form.receipt_type} onValueChange={(v) => setForm({ ...form, receipt_type: v })}>
                    <SelectTrigger className="h-11"><Banknote className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent>{RECEIPT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع پرداخت‌کننده</Label>
                  <Select value={form.payer_type} onValueChange={(v) => setForm({ ...form, payer_type: v })}>
                    <SelectTrigger className="h-11"><User className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYER_TYPES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام پرداخت‌کننده</Label>
                  <input value={form.payer_name} onChange={(e) => setForm({ ...form, payer_name: e.target.value })} className="nb-input" style={inputStyle} />
                </div>
              </div>

              {showCashMethod && (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">روش نقدی</Label>
                  <Select value={form.cash_method} onValueChange={(v) => setForm({ ...form, cash_method: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{CASH_METHODS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {showBankFields && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">نام بانک</Label>
                    <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="nb-input" style={inputStyle} />
                  </div>
                  {form.receipt_type === 'cheque' && (
                    <>
                      <div className="nb-editor-field-group">
                        <Label className="nb-editor-label">شماره چک</Label>
                        <input dir="ltr" value={form.cheque_number} onChange={(e) => setForm({ ...form, cheque_number: e.target.value })} className="nb-input" style={inputStyle} />
                      </div>
                      <div className="nb-editor-field-group">
                        <Label className="nb-editor-label">کد شعبه</Label>
                        <input dir="ltr" value={form.branch_code} onChange={(e) => setForm({ ...form, branch_code: e.target.value })} className="nb-input" style={inputStyle} />
                      </div>
                    </>
                  )}
                  {(form.receipt_type === 'bank_transfer' || form.receipt_type === 'card_to_card') && (
                    <div className="nb-editor-field-group">
                      <Label className="nb-editor-label">شماره پیگیری</Label>
                      <input dir="ltr" value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} className="nb-input" style={inputStyle} />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ دریافت</Label>
                  <JalaliDatePicker value={form.received_date ? new Date(form.received_date) : null} onChange={(d) => setForm({ ...form, received_date: d ? toLocalDateString(d) : '' })} className="h-11" />
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
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="nb-input" style={inputStyle} />
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
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش، تغییرات در بخش «رسیدها» قابل مشاهده است.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
