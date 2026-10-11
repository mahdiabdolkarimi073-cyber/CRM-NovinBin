'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, FlaskConical, User, Mail, Phone, Building, Lightbulb, Info, Loader2, Check, Calendar } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { PLAN_LABELS } from '@/lib/constants';
import { toast } from 'sonner';

const guideItems = [
  { icon: User, title: 'نام مشتری', desc: 'نام شخص یا شرکتی که دمو برای او ساخته شده.' },
  { icon: Calendar, title: 'تاریخ انقضا', desc: 'تاریخ پایان اعتبار دمو را تنظیم کنید.' },
  { icon: Building, title: 'اطلاعات شرکت', desc: 'نام شرکت و پلن مورد نظر را ویرایش کنید.' },
  { icon: Info, title: 'وضعیت دمو', desc: 'وضعیت دمو را بین فعال، منقضی یا تبدیل شده تغییر دهید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const STATUS_OPTIONS = [
  { key: 'active', label: 'فعال' },
  { key: 'expired', label: 'منقضی' },
  { key: 'converted', label: 'تبدیل شده' },
];

export default function EditDemoPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', companyName: '', plan: 'starter', startDate: '', expiryDate: '', status: 'active',
  });

  const loadDemo = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchData<any>('demos', { where: { id } });
      if (data && data.length > 0) {
        const d = data[0];
        setForm({
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          companyName: d.companyName || '',
          plan: d.plan || 'starter',
          startDate: d.startDate ? toLocalDateString(new Date(d.startDate)) : '',
          expiryDate: d.expiryDate ? toLocalDateString(new Date(d.expiryDate)) : '',
          status: d.status || 'active',
        });
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else {
        toast.error('دمو یافت نشد');
        router.push('/dashboard/demos');
      }
    } catch (error: any) {
      toast.error('بارگذاری دمو ناموفق: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadDemo();
  }, [loadDemo]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'نام الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateData('demos', { id }, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        companyName: form.companyName.trim() || null,
        plan: form.plan,
        status: form.status,
        startDate: form.startDate ? new Date(form.startDate) : undefined,
        expiryDate: form.expiryDate ? new Date(form.expiryDate) : undefined,
      });
      toast.success('دمو با موفقیت ویرایش شد');
      router.push('/dashboard/demos');
    } catch (error: any) {
      toast.error('ویرایش دمو ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری دمو...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/demos" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به دموها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> دموها <b>←</b> ویرایش دمو</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/demos')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="demo-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="demo-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <FlaskConical className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات دمو</h2>
                  <p className="text-sm text-slate-400">لطفاً اطلاعات دمو را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام <span className="text-red-500">*</span></Label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="نام شخص یا شرکت"
                  className="nb-input"
                  style={{ ...inputStyle, borderColor: errors.name ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.name && <span className="nb-editor-error">{errors.name}</span>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">ایمیل</Label>
                  <input
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تلفن</Label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="09123456789"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام شرکت</Label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="نام شرکت (اختیاری)"
                  className="nb-input"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">پلن</Label>
                  <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLAN_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ شروع</Label>
                  <JalaliDatePicker
                    value={form.startDate ? new Date(form.startDate) : null}
                    onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                    className="h-11"
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ انقضا</Label>
                  <JalaliDatePicker
                    value={form.expiryDate ? new Date(form.expiryDate) : null}
                    onChange={(d) => setForm({ ...form, expiryDate: d ? toLocalDateString(d) : '' })}
                    placeholder="انتخاب تاریخ"
                    className="h-11"
                  />
                </div>
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
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ویرایش دمو، تغییرات در بخش «دموها» قابل مشاهده است. لینک اختصاصی مشتری تغییر نمی‌کند.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
