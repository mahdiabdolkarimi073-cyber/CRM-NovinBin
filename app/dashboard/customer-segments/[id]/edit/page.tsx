'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { updateData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Users, Sparkles, Target, Layers,
  Lightbulb, Info, Loader2, Check,
} from 'lucide-react';
import { toast } from 'sonner';

type Level = 'bronze' | 'silver' | 'gold' | 'vip';

const SEGMENT_COLORS = [
  { name: 'سبز زمردی', value: '#10b981' },
  { name: 'آبی',       value: '#3b82f6' },
  { name: 'کهربایی',   value: '#f59e0b' },
  { name: 'قرمز',      value: '#f43f5e' },
  { name: 'آبی روشن',  value: '#0ea5e9' },
  { name: 'سربی',      value: '#64748b' },
];

const LEVEL_LABELS: Record<Level, string> = {
  bronze: 'برنزی',
  silver: 'نقره‌ای',
  gold:   'طلایی',
  vip:    'ویژه (VIP)',
};

const guideItems = [
  { icon: Layers, title: 'نام بخش مشتریان', desc: 'عنوان مناسب و گویایی برای این گروه از مشتریان تعیین کنید.' },
  { icon: Target, title: 'معیارهای دسته‌بندی', desc: 'حداقل امتیاز، تعداد سفارش یا سطح وفاداری مشتری را تنظیم کنید.' },
  { icon: Sparkles, title: 'رنگ‌بندی مشخص', desc: 'انتخاب رنگ متمایز باعث شناسایی سریع‌تر بخش در گزارش‌ها می‌شود.' },
  { icon: Users, title: 'عضویت خودکار', desc: 'مشتریانی که شرایط این بخش را داشته باشند می‌توانند به طور خودکار جذب شوند.' },
];

export default function EditCustomerSegmentPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    minScore: '',
    maxScore: '',
    minOrders: '',
    level: 'any' as Level | 'any',
    active: true,
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const segs = await fetchData<any>('customer_segments', { where: { id } });
      if (segs && segs.length > 0) {
        const s = segs[0];
        const crit = s.criteria || {};
        setForm({
          name: s.name || '',
          description: s.description || '',
          color: s.color || '#3b82f6',
          minScore: crit.minScore != null ? String(crit.minScore) : '',
          maxScore: crit.maxScore != null ? String(crit.maxScore) : '',
          minOrders: crit.minOrders != null ? String(crit.minOrders) : '',
          level: (crit.level as Level) || 'any',
          active: s.active !== false,
        });
      } else {
        toast.error('بخش مشتریان یافت نشد');
        router.push('/dashboard/customer-segments');
      }
    } catch (e: any) {
      toast.error('خطا در بارگذاری بخش: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'نام بخش الزامی است';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const criteria: Record<string, any> = {};
      if (form.minScore) criteria.minScore = Number(form.minScore);
      if (form.maxScore) criteria.maxScore = Number(form.maxScore);
      if (form.minOrders) criteria.minOrders = Number(form.minOrders);
      if (form.level !== 'any') criteria.level = form.level;

      await updateData('customer_segments', { id }, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        criteria,
        active: form.active,
      });

      toast.success('بخش‌بندی با موفقیت به‌روزرسانی شد');
      router.push('/dashboard/customer-segments');
    } catch (error: any) {
      toast.error('ویرایش بخش ناموفق: ' + error.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p>در حال بارگذاری اطلاعات بخش...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/customer-segments" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به بخش‌بندی مشتریان
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> بخش‌بندی مشتریان <b>←</b> ویرایش ({form.name})
          </span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/customer-segments')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="edit-segment-form"
            className="nb-editor-save-btn"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="edit-segment-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold"
                  style={{ background: form.color }}
                >
                  <Layers className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ویرایش بخش مشتریان
                  </h2>
                  <p className="text-sm text-slate-400">
                    معیارهای فیلتر و ظاهر بصری این بخش را تنظیم کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">نام بخش <span className="text-red-500">*</span></Label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`nb-input ${errors.name ? 'border-red-300' : ''}`}
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                />
                {errors.name && <span className="nb-editor-error">{errors.name}</span>}
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات و هدف بخش</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="توضیح کوتاه درباره ماهیت این بخش..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Color selector */}
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">رنگ شناسه بخش</Label>
                <div className="flex flex-wrap gap-3 pt-1">
                  {SEGMENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.value })}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        form.color === c.value
                          ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700'
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full shadow-sm" style={{ background: c.value }} />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Criteria block */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Target className="h-4 w-4 text-sky-500" />
                  معیارهای عضویت خودکار
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">حداقل امتیاز وفاداری</Label>
                    <input
                      type="number"
                      value={form.minScore}
                      onChange={(e) => setForm({ ...form, minScore: e.target.value })}
                      placeholder="مثال: ۱۰۰"
                      className="nb-input"
                      style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    />
                  </div>

                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">حداکثر امتیاز وفاداری</Label>
                    <input
                      type="number"
                      value={form.maxScore}
                      onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                      placeholder="اختیاری"
                      className="nb-input"
                      style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">حداقل تعداد سفارشات</Label>
                    <input
                      type="number"
                      value={form.minOrders}
                      onChange={(e) => setForm({ ...form, minOrders: e.target.value })}
                      placeholder="مثال: ۳"
                      className="nb-input"
                      style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    />
                  </div>

                  <div className="nb-editor-field-group">
                    <Label className="nb-editor-label">سطح باشگاه مشتریان</Label>
                    <Select
                      value={form.level}
                      onValueChange={(v) => setForm({ ...form, level: v as any })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="همه سطوح" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">همه سطوح</SelectItem>
                        {(['bronze', 'silver', 'gold', 'vip'] as Level[]).map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {LEVEL_LABELS[lvl]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Sidebar Guide */}
          <div className="space-y-6">
            <div className="nb-editor-card">
              <div className="nb-editor-card-header">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3>راهنمای بخش‌بندی</h3>
              </div>
              <div className="space-y-4">
                {guideItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/30 dark:bg-sky-950/20">
              <div className="flex gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <p className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
                  معیارهای تعیین‌شده در بخش‌بندی، برای ارسال کمپین‌های پیامکی، ارائه تخفیف‌های هدفمند و ارزیابی رفتار خرید مشتریان کاربرد دارند.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
