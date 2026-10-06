'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, TrendingUp, Loader2, Check, Lightbulb, Info,
  ClipboardList, Target, DollarSign, StickyNote,
} from 'lucide-react';
import { SALES_STAGES } from '@/lib/constants';
import { toast } from 'sonner';

const guideItems = [
  { icon: ClipboardList, title: 'عنوان واضح انتخاب کنید', desc: 'عنوان فرصت باید کوتاه و گویا باشد تا در قیف فروش قابل تشخیص باشد.' },
  { icon: DollarSign, title: 'مبلغ واقعی وارد کنید', desc: 'مبلغ تخمینی فرصت را به تومان وارد کنید تا ارزش قیف فروش دقیق محاسبه شود.' },
  { icon: Target, title: 'احتمال موفقیت', desc: 'احتمال موفقیت این فرصت را به درصد وارد کنید. این مقدار در نمودار کانبان نمایش داده می‌شود.' },
  { icon: StickyNote, title: 'توضیحات کامل', desc: 'توضیحات مرتبط با این فرصت را ثبت کنید تا در مراحل بعدی پیگیری آسان‌تر باشد.' },
];

export default function NewOpportunityPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '', amount: '', probability: '50', stage: 'new_lead', description: '',
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'عنوان فرصت الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    try {
      await createData('opportunities', {
        title: form.title,
        amount,
        probability: Number(form.probability),
        stage: form.stage,
        description: form.description || null,
        createdBy: profile.id,
      });
      toast.success('فرصت فروش ایجاد شد');
      router.push('/dashboard/pipeline');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/pipeline" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به قیف فروش
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> قیف فروش <b>←</b> ایجاد فرصت</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/pipeline')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="opportunity-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ایجاد...' : 'ایجاد فرصت'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="opportunity-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات فرصت فروش</h2>
                  <p className="text-sm text-slate-400">لطفاً اطلاعات مربوط به فرصت فروش جدید را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">عنوان فرصت <span className="text-red-500">*</span></Label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="عنوان فرصت فروش"
                  className={`nb-input ${errors.title ? 'border-red-300' : ''}`}
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                />
                {errors.title && <span className="nb-editor-error">{errors.title}</span>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مبلغ (تومان)</Label>
                  <input
                    type="text" dir="ltr"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">احتمال موفقیت (%)</Label>
                  <input
                    type="number" dir="ltr"
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: e.target.value })}
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">مرحله</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SALES_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="توضیحات مربوط به این فرصت..."
                  className="nb-input"
                  style={{ minHeight: 120, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={6}
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
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ایجاد فرصت می‌توانید آن را با کشیدن و رها کردن در نمودار کانبان بین مراحل مختلف جابجا کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
