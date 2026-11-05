'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { updateData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ArrowRight, Gift, Package, Percent, Truck, Wrench, Coins,
  Lightbulb, Info, Loader2, Check,
} from 'lucide-react';
import { toast } from 'sonner';

type RewardType = 'product' | 'discount' | 'free_shipping' | 'service';

const REWARD_TYPES: Record<RewardType, { label: string; icon: typeof Package }> = {
  product: { label: 'کالای فیزیکی / محصول', icon: Package },
  discount: { label: 'کد تخفیف نقدی', icon: Percent },
  free_shipping: { label: 'ارسال رایگان سفارش', icon: Truck },
  service: { label: 'خدمات ویژه باشگاه', icon: Wrench },
};

const guideItems = [
  { icon: Gift, title: 'ویرایش مشخصات جایزه', desc: 'عنوان و نوع جایزه را در صورت نیاز تغییر دهید.' },
  { icon: Coins, title: 'به‌روزرسانی هزینه امتیاز', desc: 'امتیاز لازم برای بازخرج این جایزه را اصلاح کنید.' },
  { icon: Package, title: 'موجودی انبار', desc: 'تعداد جوایز باقی‌مانده در انبار را به‌روزرسانی کنید.' },
];

export default function EditLoyaltyRewardPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'product' as RewardType,
    pointsCost: '',
    monetaryValue: '',
    stock: '-1',
    imageUrl: '',
    active: true,
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchData<any>('loyalty_rewards', { where: { id } });
      if (data && data.length > 0) {
        const r = data[0];
        setForm({
          name: r.name || '',
          description: r.description || '',
          type: (r.type as RewardType) || 'product',
          pointsCost: String(r.pointsCost || 0),
          monetaryValue: r.monetaryValue != null ? String(r.monetaryValue) : '',
          stock: String(r.stock != null ? r.stock : -1),
          imageUrl: r.imageUrl || '',
          active: r.active !== false,
        });
      } else {
        toast.error('جایزه یافت نشد');
        router.push('/dashboard/loyalty-rewards');
      }
    } catch (e: any) {
      toast.error('خطا در بارگذاری جایزه: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'عنوان جایزه الزامی است';
    const pts = Number(form.pointsCost);
    if (!pts || pts <= 0) errs.pointsCost = 'هزینه امتیاز باید عددی بزرگتر از صفر باشد';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !id || !validate()) return;

    setSubmitting(true);
    try {
      await updateData('loyalty_rewards', { id }, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type,
        pointsCost: Number(form.pointsCost),
        monetaryValue: form.monetaryValue ? Number(form.monetaryValue) : 0,
        stock: form.stock !== '' ? Number(form.stock) : -1,
        imageUrl: form.imageUrl.trim() || null,
        active: form.active,
      });

      toast.success('اطلاعات جایزه با موفقیت به‌روزرسانی شد');
      router.push('/dashboard/loyalty-rewards');
    } catch (err: any) {
      toast.error('ویرایش جایزه ناموفق: ' + err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-loading" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p>در حال بارگذاری اطلاعات جایزه...</p>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/loyalty-rewards" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به جوایز باشگاه
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> جوایز باشگاه <b>←</b> ویرایش ({form.name})
          </span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/loyalty-rewards')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="edit-reward-form"
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
          <form id="edit-reward-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <Gift className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ویرایش جایزه باشگاه
                  </h2>
                  <p className="text-sm text-slate-400">
                    تغییرات مورد نظر را در امتیاز، عنوان و شرایط جایزه اعمال کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">عنوان جایزه <span className="text-red-500">*</span></Label>
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
                <Label className="nb-editor-label">نوع جایزه</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(['product', 'discount', 'free_shipping', 'service'] as RewardType[]).map((t) => {
                    const meta = REWARD_TYPES[t];
                    const active = form.type === t;
                    const Icon = meta.icon;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, type: t })}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">هزینه امتیاز <span className="text-red-500">*</span></Label>
                  <input
                    type="number"
                    value={form.pointsCost}
                    onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                    className={`nb-input ${errors.pointsCost ? 'border-red-300' : ''}`}
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                  {errors.pointsCost && <span className="nb-editor-error">{errors.pointsCost}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">ارزش تقریبی (تومان)</Label>
                  <input
                    type="number"
                    value={form.monetaryValue}
                    onChange={(e) => setForm({ ...form, monetaryValue: e.target.value })}
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">موجودی انبار (-۱: نامحدود)</Label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">لینک تصویر جایزه (اختیاری)</Label>
                <input
                  type="text"
                  dir="ltr"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="nb-input text-left"
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                />
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات و شرایط استفاده</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div>
                  <Label className="font-semibold text-sm">وضعیت فعال بودن</Label>
                  <p className="text-xs text-slate-400">جایزه برای کاربران در دسترس باشد</p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                />
              </div>
            </div>
          </form>

          {/* Sidebar Guide */}
          <div className="space-y-6">
            <div className="nb-editor-card">
              <div className="nb-editor-card-header">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3>راهنمای ویرایش</h3>
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

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <div className="flex gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  تغییرات اعمال‌شده فوراً در پورتال مشتریان نمایش داده می‌شود و سوابق بازخرج‌های قبلی دست‌نخورده باقی می‌ماند.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
