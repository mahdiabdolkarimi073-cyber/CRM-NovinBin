'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { ArrowRight, Fingerprint, Loader2, Check, Lightbulb, Info, User, Globe, KeyRound, Lock } from 'lucide-react';
import { toast } from 'sonner';

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const guideItems = [
  { icon: User, title: 'نام مشتری', desc: 'نام و نام خانوادگی مشتری را کامل وارد کنید.' },
  { icon: Globe, title: 'نام سایت', desc: 'نام دامنه‌ای که شناسه برای آن ثبت می‌شود را وارد کنید.' },
  { icon: KeyRound, title: 'شناسه ایرنیک', desc: 'شناسه یکتای ایرنیک مشتری را به‌دقت وارد کنید.' },
  { icon: Lock, title: 'رمز عبور', desc: 'رمز عبور شناسه را امن و دقیق ثبت کنید.' },
];

export default function EditIrnicPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ customerName: '', siteName: '', irnicId: '', password: '' });

  useEffect(() => {
    fetch(`/api/irnic/${params.id}`).then(async (response) => {
      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error || 'بارگذاری ناموفق بود');
        router.push('/dashboard/irnic');
        return;
      }
      const d = json.data;
      setForm({
        customerName: d.customerName || '',
        siteName: d.siteName || '',
        irnicId: d.irnicId || '',
        password: d.password || '',
      });
    }).catch(() => {
      toast.error('بارگذاری ناموفق بود');
      router.push('/dashboard/irnic');
    }).finally(() => setLoading(false));
  }, [params.id, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = 'نام مشتری الزامی است';
    if (!form.siteName.trim()) e.siteName = 'نام سایت الزامی است';
    if (!form.irnicId.trim()) e.irnicId = 'شناسه ایرنیک الزامی است';
    if (!form.password.trim()) e.password = 'رمز عبور الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/irnic/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          siteName: form.siteName.trim(),
          irnicId: form.irnicId.trim(),
          password: form.password,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'ذخیره ناموفق بود');
      toast.success('شناسه ویرایش شد');
      router.push('/dashboard/irnic');
    } catch (error: any) {
      toast.error(error.message || 'ذخیره ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <span />
        <p>در حال بارگذاری شناسه...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/irnic" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به شناسه‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> شناسه ایرنیک <b>←</b> ویرایش شناسه</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/irnic')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="irnic-edit-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="irnic-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20">
                  <Fingerprint className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات شناسه</h2>
                  <p className="text-sm text-slate-400">تمام فیلدها الزامی هستند.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام و نام خانوادگی مشتری <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="مثال: علی رضایی"
                  className="nb-input"
                  style={{ ...inputStyle, borderColor: errors.customerName ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.customerName && <span className="nb-editor-error">{errors.customerName}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام سایت <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.siteName}
                  onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                  placeholder="مثال: novinbin.ir"
                  className="nb-input"
                  style={{ ...inputStyle, borderColor: errors.siteName ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.siteName && <span className="nb-editor-error">{errors.siteName}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">شناسه ایرنیک <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.irnicId}
                  onChange={(e) => setForm({ ...form, irnicId: e.target.value })}
                  placeholder="مثال: ir12345-irnic"
                  className="nb-input"
                  style={{ ...inputStyle, borderColor: errors.irnicId ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.irnicId && <span className="nb-editor-error">{errors.irnicId}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">رمز عبور <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="رمز عبور شناسه ایرنیک"
                  className="nb-input"
                  style={{ ...inputStyle, borderColor: errors.password ? '#FCA5A5' : '#E2E8F0' }}
                />
                {errors.password && <span className="nb-editor-error">{errors.password}</span>}
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
                <h2 className="font-bold text-slate-900 dark:text-slate-100">نکته امنیتی</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">اطلاعات ورود مشتریان فقط برای کاربران مجاز نمایش داده می‌شود و رمز عبور به‌صورت پیش‌فرض مخفی است.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
