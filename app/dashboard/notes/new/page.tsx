'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, StickyNote, Type, AlignRight, Palette, Lightbulb, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const colorOptions = [
  { value: 'default', label: 'پیش‌فرض', bg: 'bg-white', border: 'border-slate-200' },
  { value: 'yellow', label: 'زرد', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'green', label: 'سبز', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'blue', label: 'آبی', bg: 'bg-sky-50', border: 'border-sky-200' },
  { value: 'pink', label: 'صورتی', bg: 'bg-pink-50', border: 'border-pink-200' },
  { value: 'purple', label: 'بنفش', bg: 'bg-violet-50', border: 'border-violet-200' },
];

const guideItems = [
  { icon: Type, title: 'عنوان واضح', desc: 'عنوانی کوتاه و گویا برای یادداشت بنویسید.' },
  { icon: AlignRight, title: 'محتوای کامل', desc: 'محتوای یادداشت را با جزئیات وارد کنید.' },
  { icon: Palette, title: 'انتخاب رنگ', desc: 'رنگ مناسب به دسته‌بندی بصری کمک می‌کند.' },
];

export default function NewNotePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'عنوان یادداشت الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createData('personal_notes', {
        title: form.title,
        content: form.content || null,
        color: form.color,
      });
      toast.success('یادداشت با موفقیت ایجاد شد');
      router.push('/dashboard/notes');
    } catch (error: any) {
      toast.error('ایجاد یادداشت ناموفق: ' + (error?.message || 'خطا'));
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
              <h1>ایجاد یادداشت جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> یادداشت‌ها <b>←</b> ایجاد یادداشت
            </div>
          </div>
          <Link href="/dashboard/notes" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به یادداشت‌ها
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <StickyNote className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات یادداشت</h2>
                  <p>یادداشت شخصی خود را ایجاد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">عنوان <span className="required-star">*</span></Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="عنوان یادداشت"
                  className="task-input"
                />
                {errors.title && <span className="field-error">{errors.title}</span>}
              </div>

              <div className="field-group">
                <Label className="field-label">متن</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="محتوای یادداشت..."
                  className="task-textarea"
                />
              </div>

              <div className="field-group">
                <Label className="field-label">رنگ</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: color.value })}
                      className={`h-10 w-10 rounded-lg border-2 ${color.bg} ${color.border} ${form.color === color.value ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/notes')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد یادداشت'}
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
              <p>یادداشت‌های ایجاد شده در بخش «یادداشت‌ها» قابل مشاهده، ویرایش و حذف هستند. می‌توانید آن‌ها را پین کنید یا دسته‌بندی کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
