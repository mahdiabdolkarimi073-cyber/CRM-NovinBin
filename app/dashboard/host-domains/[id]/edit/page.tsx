'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { ArrowRight, Server, User, Phone, Hash, Calendar, Lightbulb, Info, Loader2, Check } from 'lucide-react';
import { HOST_TYPES } from '@/lib/constants';
import { toLocalDateString } from '@/lib/format';
import { fetchData, updateData } from '@/lib/data-client';
import { toast } from 'sonner';
import type { HostDomain } from '@/lib/types';

const guideItems = [
  { icon: Hash, title: 'شماره مشتری', desc: 'شماره مشتری را درست وارد کنید.' },
  { icon: User, title: 'نام و نام خانوادگی', desc: 'نام و نام خانوادگی مشتری را وارد کنید.' },
  { icon: Calendar, title: 'تاریخ انقضا', desc: 'تاریخ انقضای هاست/دامنه را مشخص کنید.' },
  { icon: Phone, title: 'شماره موبایل', desc: 'شماره موبایل مشتری برای ارسال پیامک تمدید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditHostDomainPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    customerNumber: '', firstName: '', lastName: '', phoneNumber: '',
    domainName: '', hostType: 'host', startDate: '', expiryDate: '', notes: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchData<HostDomain>('host_domains', { where: { id } });
        const item = data?.[0];
        if (!item) { toast.error('هاست/دامنه یافت نشد'); router.push('/dashboard/host-domains'); return; }
        setForm({
          customerNumber: item.customerNumber || '',
          firstName: item.firstName || '',
          lastName: item.lastName || '',
          phoneNumber: item.phoneNumber || '',
          domainName: item.domainName || '',
          hostType: item.hostType || 'host',
          startDate: item.startDate ? toLocalDateString(new Date(item.startDate)) : '',
          expiryDate: item.expiryDate ? toLocalDateString(new Date(item.expiryDate)) : '',
          notes: item.notes || '',
        });
      } catch (error: any) {
        toast.error('بارگذاری هاست/دامنه ناموفق: ' + error.message);
        router.push('/dashboard/host-domains');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerNumber.trim()) e.customerNumber = 'شماره مشتری الزامی است';
    if (!form.firstName.trim()) e.firstName = 'نام الزامی است';
    if (!form.lastName.trim()) e.lastName = 'نام خانوادگی الزامی است';
    if (!form.phoneNumber.trim()) e.phoneNumber = 'شماره موبایل الزامی است';
    else if (!/^09\d{9}$/.test(form.phoneNumber.replace(/\s+/g, ''))) e.phoneNumber = 'شماره موبایل نامعتبر است (مثال: 09121234567)';
    if (!form.expiryDate) e.expiryDate = 'تاریخ انقضا الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateData('host_domains', { id }, {
        customerNumber: form.customerNumber.trim(), firstName: form.firstName.trim(),
        lastName: form.lastName.trim(), phoneNumber: form.phoneNumber.replace(/\s+/g, ''),
        domainName: form.domainName || null, hostType: form.hostType,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
        expiryDate: new Date(form.expiryDate).toISOString(), notes: form.notes || null,
      });
      toast.success('هاست/دامنه با موفقیت به‌روزرسانی شد');
      router.push('/dashboard/host-domains');
    } catch (error: any) {
      toast.error('به‌روزرسانی ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
        <span className="mr-3 text-sm text-slate-500">در حال بارگذاری هاست/دامنه...</span>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/host-domains" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> هاست و دامنه <b>←</b> ویرایش هاست/دامنه</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/host-domains')} disabled={submitting}>انصراف</button>
          <button type="submit" form="host-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال به‌روزرسانی...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="host-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20">
                  <Server className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات هاست/دامنه</h2>
                  <p className="text-sm text-slate-400">جزئیات هاست یا دامنه مشتری را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره مشتری <span className="text-red-500">*</span></Label>
                  <input value={form.customerNumber} onChange={(e) => setForm({ ...form, customerNumber: e.target.value })} placeholder="مثال: 10234" className="nb-input" style={inputStyle} />
                  {errors.customerNumber && <span className="nb-editor-error">{errors.customerNumber}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع <span className="text-red-500">*</span></Label>
                  <Select value={form.hostType} onValueChange={(v) => setForm({ ...form, hostType: v })}>
                    <SelectTrigger className="h-11"><Server className="ml-1 h-4 w-4 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent>{HOST_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام <span className="text-red-500">*</span></Label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="نام مشتری" className="nb-input" style={inputStyle} />
                  {errors.firstName && <span className="nb-editor-error">{errors.firstName}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام خانوادگی <span className="text-red-500">*</span></Label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="نام خانوادگی مشتری" className="nb-input" style={inputStyle} />
                  {errors.lastName && <span className="nb-editor-error">{errors.lastName}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره موبایل <span className="text-red-500">*</span></Label>
                  <input dir="ltr" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="09121234567" className="nb-input" style={inputStyle} />
                  {errors.phoneNumber && <span className="nb-editor-error">{errors.phoneNumber}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام دامنه</Label>
                  <input dir="ltr" value={form.domainName} onChange={(e) => setForm({ ...form, domainName: e.target.value })} placeholder="example.com" className="nb-input" style={inputStyle} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ شروع</Label>
                  <JalaliDatePicker value={form.startDate ? new Date(form.startDate) : null} onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })} placeholder="انتخاب تاریخ" className="h-11" />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ انقضا <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker value={form.expiryDate ? new Date(form.expiryDate) : null} onChange={(d) => setForm({ ...form, expiryDate: d ? toLocalDateString(d) : '' })} placeholder="انتخاب تاریخ" className="h-11" />
                  {errors.expiryDate && <span className="nb-editor-error">{errors.expiryDate}</span>}
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">یادداشت</Label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 500) })} placeholder="یادداشت‌های اختیاری..." className="nb-input" style={{ minHeight: 80, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }} rows={3} />
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
                    <div><strong className="text-sm text-slate-700 dark:text-slate-300">{item.title}</strong><p className="text-xs text-slate-400">{item.desc}</p></div>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">یک هفته قبل از انقضای هاست/دامنه، به‌صورت خودکار پیامک تمدید برای مشتری ارسال می‌شود. همچنین می‌توانید به‌صورت دستی نیز پیامک ارسال کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
