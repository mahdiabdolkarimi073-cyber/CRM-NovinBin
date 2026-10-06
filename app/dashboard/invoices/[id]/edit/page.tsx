'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, FileText, User, DollarSign, Lightbulb, Info, Loader2, Check } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { fullName, INVOICE_STATUSES } from '@/lib/constants';
import { toast } from 'sonner';

const guideItems = [
  { icon: User, title: 'مشتری', desc: 'مشتری فاکتور را تغییر دهید.' },
  { icon: DollarSign, title: 'مبلغ', desc: 'مبلغ فاکتور را اصلاح کنید.' },
  { icon: FileText, title: 'وضعیت', desc: 'وضعیت فاکتور را به‌روزرسانی کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ customerId: '', amount: '', dueDate: '', notes: '', status: 'unpaid' });

  const loadData = useCallback(async () => {
    try {
      const cust = await fetchData('customers', { where: {} });
      setCustomers(cust || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const invoices = await fetchData('invoices', { where: { id } });
      if (invoices && invoices.length > 0) {
        const inv = invoices[0];
        setForm({
          customerId: inv.customerId || '',
          amount: String(Number(inv.amount)),
          dueDate: inv.dueDate ? toLocalDateString(new Date(inv.dueDate)) : '',
          notes: inv.notes || '',
          status: inv.status || 'unpaid',
        });
      } else {
        toast.error('فاکتور یافت نشد');
        router.push('/dashboard/invoices');
      }
    } catch (error: any) {
      toast.error('بارگذاری فاکتور ناموفق: ' + error.message);
    } finally {
      setLoadingInvoice(false);
    }
  }, [id, router]);

  useEffect(() => { loadData(); loadInvoice(); }, [loadData, loadInvoice]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customerId = 'مشتری را انتخاب کنید';
    if (!form.amount) e.amount = 'مبلغ را وارد کنید';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateData('invoices', { id }, {
        customerId: form.customerId,
        amount: Number(form.amount.replace(/[^0-9]/g, '')) || 0,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        status: form.status,
      });
      toast.success('فاکتور با موفقیت ویرایش شد');
      router.push('/dashboard/invoices');
    } catch (error: any) {
      toast.error('ویرایش فاکتور ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInvoice) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری فاکتور...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/invoices" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به فاکتورها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> فاکتورها <b>←</b> ویرایش فاکتور</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/invoices')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="invoice-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="invoice-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>ویرایش فاکتور</h2>
                  <p className="text-sm text-slate-400">اطلاعات فاکتور را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مشتری <span className="text-red-500">*</span></Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger className="h-11">
                    <User className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="انتخاب مشتری..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && <span className="nb-editor-error">{errors.customerId}</span>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مبلغ (تومان) <span className="text-red-500">*</span></Label>
                  <input
                    dir="ltr"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="nb-input"
                    style={inputStyle}
                  />
                  {errors.amount && <span className="nb-editor-error">{errors.amount}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_STATUSES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">تاریخ سررسید</Label>
                <JalaliDatePicker
                  value={form.dueDate ? new Date(form.dueDate) : null}
                  onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })}
                  placeholder="اختیاری"
                  className="h-11"
                />
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="توضیحات اختیاری..."
                  className="nb-input"
                  style={inputStyle}
                />
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
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش، تغییرات در بخش «فاکتورها» قابل مشاهده است.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
