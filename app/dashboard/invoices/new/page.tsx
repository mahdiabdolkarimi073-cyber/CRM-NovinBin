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
import { ArrowRight, FileText, User, DollarSign, Calendar, Lightbulb, Info, Loader2, ShoppingCart, Check } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';

const guideItems = [
  { icon: User, title: 'انتخاب مشتری', desc: 'مشتری موردنظر را برای صدور فاکتور انتخاب کنید.' },
  { icon: ShoppingCart, title: 'سفارش مرتبط', desc: 'در صورت وجود، سفارش مرتبط را انتخاب کنید.' },
  { icon: DollarSign, title: 'مبلغ فاکتور', desc: 'مبلغ کل فاکتور را به تومان وارد کنید.' },
  { icon: Calendar, title: 'تاریخ سررسید', desc: 'تاریخ سررسید پرداخت را مشخص کنید (اختیاری).' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function NewInvoicePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ customerId: '', orderId: '', amount: '', dueDate: '', notes: '' });

  const loadData = useCallback(async () => {
    try {
      const [cust, ords] = await Promise.all([
        fetchData('customers', { where: {} }),
        fetchData('orders', { where: {} }),
      ]);
      setCustomers(cust || []);
      setOrders(ords || []);
    } catch {
      setCustomers([]);
      setOrders([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customerId = 'مشتری را انتخاب کنید';
    if (!form.amount) e.amount = 'مبلغ را وارد کنید';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    const invNum = 'INV-' + Date.now().toString().slice(-6);
    try {
      await createData('invoices', {
        number: invNum,
        customerId: form.customerId,
        orderId: form.orderId || null,
        amount: Number(form.amount.replace(/[^0-9]/g, '')) || 0,
        paid: 0,
        status: 'unpaid',
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        createdBy: profile.id,
      });
      toast.success('فاکتور با موفقیت صادر شد');
      router.push('/dashboard/invoices');
    } catch (error: any) {
      toast.error('صدور فاکتور ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری...</p>
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
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> فاکتورها <b>←</b> صدور فاکتور</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/invoices')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="invoice-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال صدور...' : 'صدور فاکتور'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="invoice-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات فاکتور</h2>
                  <p className="text-sm text-slate-400">جزئیات فاکتور را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
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

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">سفارش مرتبط</Label>
                <Select value={form.orderId || 'none'} onValueChange={(v) => setForm({ ...form, orderId: v === 'none' ? '' : v })}>
                  <SelectTrigger className="h-11">
                    <ShoppingCart className="ml-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="بدون سفارش" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون سفارش</SelectItem>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.number || o.id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Label className="nb-editor-label">تاریخ سررسید</Label>
                  <JalaliDatePicker
                    value={form.dueDate ? new Date(form.dueDate) : null}
                    onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })}
                    placeholder="اختیاری"
                    className="h-11"
                  />
                </div>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">فاکتورهای صادر شده در بخش «فاکتورها» قابل مدیریت هستند. شماره فاکتور به‌صورت خودکار تولید می‌شود و وضعیت اولیه «پرداخت‌نشده» خواهد بود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
