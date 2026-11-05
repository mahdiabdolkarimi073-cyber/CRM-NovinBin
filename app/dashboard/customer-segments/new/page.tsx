'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Layers, Tag, Target, Palette, Lightbulb, Info, Loader2, Type } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SEGMENT_COLORS = [
  { name: 'سبز زمردی', value: '#10b981' },
  { name: 'آبی',       value: '#3b82f6' },
  { name: 'کهربایی',   value: '#f59e0b' },
  { name: 'قرمز',      value: '#f43f5e' },
  { name: 'آبی روشن',  value: '#0ea5e9' },
  { name: 'سربی',      value: '#64748b' },
];

type Level = 'bronze' | 'silver' | 'gold' | 'vip' | '';

const guideItems = [
  { icon: Type, title: 'نام بخش', desc: 'نامی واضح برای بخش‌بندی مشتریان انتخاب کنید.' },
  { icon: Palette, title: 'رنگ بخش', desc: 'رنگ مناسب به تمایز بصری بخش‌ها کمک می‌کند.' },
  { icon: Target, title: 'معیارهای بخش‌بندی', desc: 'امتیاز، تعداد سفارش یا سطح مشتری را مشخص کنید.' },
];

export default function NewCustomerSegmentPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: SEGMENT_COLORS[0].value,
    minScore: '',
    maxScore: '',
    minOrders: '',
    level: '' as Level,
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'نام بخش الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const criteria: any = {};
    if (form.minScore) criteria.minScore = Number(form.minScore);
    if (form.maxScore) criteria.maxScore = Number(form.maxScore);
    if (form.minOrders) criteria.minOrders = Number(form.minOrders);
    if (form.level) criteria.level = form.level;
    try {
      await createData('customer_segments', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        criteria,
        active: true,
      });
      toast.success('بخش با موفقیت ایجاد شد');
      router.push('/dashboard/customer-segments');
    } catch (error: any) {
      toast.error('ایجاد بخش ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ایجاد بخش جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> بخش‌بندی مشتریان <b>←</b> ایجاد بخش
            </div>
          </div>
          <Link href="/dashboard/customer-segments" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به بخش‌بندی
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <Layers className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات بخش</h2>
                  <p>بخش‌بندی مشتریان را بر اساس معیارها تعریف کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">نام بخش <span className="required-star">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثلاً: مشتریان فعال"
                  className="task-input"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="هدف این بخش..."
                  className="task-textarea"
                />
              </div>

              <div className="field-group">
                <Label className="field-label">رنگ بخش</Label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {SEGMENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.value })}
                      className={cn(
                        'w-9 h-9 rounded-full transition-all flex items-center justify-center',
                        form.color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {form.color === c.value && <span className="w-3 h-3 rounded-full bg-white/90" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Target className="h-4 w-4 text-slate-400" />
                  معیارهای بخش‌بندی
                </div>
                <div className="management-row">
                  <div className="field-group">
                    <Label className="field-label text-xs text-slate-500">حداقل امتیاز</Label>
                    <Input
                      type="number"
                      min={0}
                      dir="ltr"
                      value={form.minScore}
                      onChange={(e) => setForm({ ...form, minScore: e.target.value })}
                      placeholder="۰"
                      className="task-input"
                    />
                  </div>
                  <div className="field-group">
                    <Label className="field-label text-xs text-slate-500">حداکثر امتیاز</Label>
                    <Input
                      type="number"
                      min={0}
                      dir="ltr"
                      value={form.maxScore}
                      onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                      placeholder="۱۰۰"
                      className="task-input"
                    />
                  </div>
                  <div className="field-group">
                    <Label className="field-label text-xs text-slate-500">حداقل سفارش</Label>
                    <Input
                      type="number"
                      min={0}
                      dir="ltr"
                      value={form.minOrders}
                      onChange={(e) => setForm({ ...form, minOrders: e.target.value })}
                      placeholder="۰"
                      className="task-input"
                    />
                  </div>
                </div>
                <div className="field-group">
                  <Label className="field-label text-xs text-slate-500">سطح مشتری</Label>
                  <Select
                    value={form.level || 'none'}
                    onValueChange={(v) => setForm({ ...form, level: v === 'none' ? '' : (v as Level) })}
                  >
                    <SelectTrigger className="task-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">همه سطوح</SelectItem>
                      <SelectItem value="bronze">برنزی</SelectItem>
                      <SelectItem value="silver">نقره‌ای</SelectItem>
                      <SelectItem value="gold">طلایی</SelectItem>
                      <SelectItem value="vip">ویژه</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/customer-segments')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد بخش'}
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
              <p>بخش‌های ایجاد شده در صفحه «بخش‌بندی مشتریان» قابل مدیریت هستند. می‌توانید اعضا را به‌صورت دستی یا خودکار اضافه کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
