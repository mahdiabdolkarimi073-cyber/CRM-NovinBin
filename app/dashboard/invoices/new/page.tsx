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
import { ArrowRight, FileText, User, DollarSign, Calendar, Lightbulb, Info, Loader2, ShoppingCart } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';

const guideItems = [
  { icon: User, title: 'انتخاب مشتری', desc: 'مشتری موردنظر را برای صدور فاکتور انتخاب کنید.' },
  { icon: ShoppingCart, title: 'سفارش مرتبط', desc: 'در صورت وجود، سفارش مرتبط را انتخاب کنید.' },
  { icon: DollarSign, title: 'مبلغ فاکتور', desc: 'مبلغ کل فاکتور را به تومان وارد کنید.' },
  { icon: Calendar, title: 'تاریخ سررسید', desc: 'تاریخ سررسید پرداخت را مشخص کنید (اختیاری).' },
];

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
              <h1>صدور فاکتور جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> فاکتورها <b>←</b> صدور فاکتور
            </div>
          </div>
          <Link href="/dashboard/invoices" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به فاکتورها
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات فاکتور</h2>
                  <p>جزئیات فاکتور را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">مشتری <span className="required-star">*</span></Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger className="task-select">
                    <span className="select-icon-right"><User className="h-4 w-4" /></span>
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
                {errors.customerId && <span className="field-error">{errors.customerId}</span>}
              </div>

              <div className="field-group">
                <Label className="field-label">سفارش مرتبط</Label>
                <Select value={form.orderId || 'none'} onValueChange={(v) => setForm({ ...form, orderId: v === 'none' ? '' : v })}>
                  <SelectTrigger className="task-select">
                    <span className="select-icon-right"><ShoppingCart className="h-4 w-4" /></span>
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
                  <Label className="field-label">تاریخ سررسید</Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker
                      value={form.dueDate ? new Date(form.dueDate) : null}
                      onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })}
                      placeholder="اختیاری"
                      className="task-date-input"
                    />
                  </div>
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="توضیحات اختیاری..."
                  className="task-input"
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/invoices')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال صدور...</>) : 'صدور فاکتور'}
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
              <p>فاکتورهای صادر شده در بخش «فاکتورها» قابل مدیریت هستند. شماره فاکتور به‌صورت خودکار تولید می‌شود و وضعیت اولیه «پرداخت‌نشده» خواهد بود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
