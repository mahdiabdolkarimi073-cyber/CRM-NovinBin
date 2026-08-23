'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Lightbulb, Info, Save, ClipboardList, Building2,
  TrendingUp, StickyNote, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { LEAD_SOURCES } from '@/lib/constants';

const guideCards = [
  {
    icon: ClipboardList,
    title: 'اطلاعات دقیق وارد کنید',
    desc: 'هرچه اطلاعات کامل‌تر باشد، شانس تبدیل این سرنخ بیشتر خواهد بود.',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    icon: Building2,
    title: 'انتخاب حوزه فعالیت',
    desc: 'حوزه فعالیت مناسب را انتخاب کنید تا بتوانید بهتر پیگیری و دسته‌بندی کنید.',
    color: '#16B981',
    bg: '#F0FDF4',
  },
  {
    icon: TrendingUp,
    title: 'منبع جذب را مشخص کنید',
    desc: 'مشخص کردن منبع جذب به تحلیل عملکرد کانال‌های بازاریابی کمک می‌کند.',
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    icon: StickyNote,
    title: 'یادداشت‌های مهم',
    desc: 'هر اطلاعات مهمی که ممکن است در آینده نیاز باشد را یادداشت کنید.',
    color: '#FF7200',
    bg: '#FFF7ED',
  },
];

export default function NewLeadPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    city: '',
    industry: '',
    source: '',
    notes: '',
  });

  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, []);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'نام سرنخ الزامی است';
    if (!form.phone.trim()) e.phone = 'شماره تلفن الزامی است';
    else if (!/^0?9\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'شماره تلفن معتبر نیست (مثال: 09123456789)';
    if (!form.city.trim()) e.city = 'شهر الزامی است';
    if (!form.industry.trim()) e.industry = 'حوزه فعالیت الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);

    const combinedNotes = [
      form.notes || '',
      form.industry ? `حوزه فعالیت: ${form.industry.trim()}` : '',
      form.city ? `شهر: ${form.city.trim()}` : '',
    ].filter(Boolean).join('\n').trim();

    try {
      await createData('leads', {
        name: form.name.trim(),
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        email: null,
        source: form.source || null,
        notes: combinedNotes || null,
        status: 'new',
        createdBy: profile.id,
      });
      toast.success('سرنخ با موفقیت ثبت شد');
      router.push('/dashboard/leads');
    } catch (error: any) {
      toast.error('ایجاد سرنخ ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-lead-page" dir="rtl">
      <div className="new-lead-container">
        {/* Header */}
        <header className="new-lead-header">
          <div>
            <div className="new-lead-title-row">
              <span className="new-lead-title-accent" />
              <h1>ایجاد سرنخ جدید</h1>
            </div>
            <div className="new-lead-breadcrumb">
              داشبورد <b>←</b> سرنخ‌های فروش <b>←</b> ایجاد سرنخ جدید
            </div>
          </div>
          <Link href="/dashboard/leads" className="new-lead-back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به سرنخ‌ها
          </Link>
        </header>

        {/* Main grid */}
        <div className="new-lead-grid">
          {/* Form card */}
          <form className="lead-form-card" onSubmit={handleSubmit}>
            <div className="lead-form-header">
              <h2>اطلاعات سرنخ</h2>
              <p>لطفاً اطلاعات مربوط به سرنخ جدید را وارد کنید.</p>
            </div>
            <div className="lead-form-divider" />

            <div className="lead-form-fields">
              {/* Name */}
              <div className="lead-field-group">
                <Label className="lead-field-label">نام <span className="lead-required-star">*</span></Label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="نام شخص یا شرکت"
                  className={`lead-input ${errors.name ? 'lead-input-error' : ''}`}
                />
                {errors.name && <span className="lead-field-error">{errors.name}</span>}
              </div>

              {/* Company */}
              <div className="lead-field-group">
                <Label className="lead-field-label">شرکت</Label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="نام شرکت (اختیاری)"
                  className="lead-input"
                />
              </div>

              {/* Phone */}
              <div className="lead-field-group">
                <Label className="lead-field-label">تلفن <span className="lead-required-star">*</span></Label>
                <input
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="مثال: 09123456789"
                  className={`lead-input ${errors.phone ? 'lead-input-error' : ''}`}
                />
                {errors.phone && <span className="lead-field-error">{errors.phone}</span>}
              </div>

              {/* City */}
              <div className="lead-field-group">
                <Label className="lead-field-label">شهر <span className="lead-required-star">*</span></Label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="شهر را وارد کنید"
                  className={`lead-input ${errors.city ? 'lead-input-error' : ''}`}
                />
                {errors.city && <span className="lead-field-error">{errors.city}</span>}
              </div>

              {/* Industry - full width */}
              <div className="lead-field-group lead-field-full">
                <Label className="lead-field-label">حوزه فعالیت <span className="lead-required-star">*</span></Label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="حوزه فعالیت را وارد کنید"
                  className={`lead-input ${errors.industry ? 'lead-input-error' : ''}`}
                />
                {errors.industry && <span className="lead-field-error">{errors.industry}</span>}
              </div>

              {/* Source - full width */}
              <div className="lead-field-group lead-field-full">
                <Label className="lead-field-label">منبع جذب</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger className="lead-select">
                    <SelectValue placeholder="منبع جذب را انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((src) => <SelectItem key={src} value={src}>{src}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes - full width */}
              <div className="lead-field-group lead-field-full">
                <Label className="lead-field-label">یادداشت</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 500) })}
                  placeholder="یادداشت یا توضیحات مربوط به این سرنخ را وارد کنید..."
                  className="lead-textarea"
                  rows={6}
                />
                <div className="lead-textarea-counter">
                  {form.notes.length.toLocaleString('fa-IR')} / ۵۰۰
                </div>
              </div>
            </div>

            <div className="lead-form-divider" />

            {/* Actions */}
            <div className="lead-form-actions">
              <button
                type="button"
                className="lead-cancel-btn"
                onClick={() => router.push('/dashboard/leads')}
              >
                انصراف
              </button>
              <button
                type="submit"
                className="lead-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {submitting ? 'در حال ثبت...' : 'ثبت سرنخ'}
              </button>
            </div>
          </form>

          {/* Sidebar */}
          <aside className="lead-sidebar">
            <div className="lead-sidebar-card">
              <div className="lead-sidebar-title">
                <span className="lead-sidebar-icon">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h3>راهنما و نکات</h3>
              </div>

              <div className="lead-guide-list">
                {guideCards.map((card, i) => (
                  <div key={i} className="lead-guide-item">
                    <span className="lead-guide-icon" style={{ backgroundColor: card.bg, color: card.color }}>
                      <card.icon className="h-5 w-5" />
                    </span>
                    <div className="lead-guide-text">
                      <strong>{card.title}</strong>
                      <p>{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lead-info-card">
              <div className="lead-info-title">
                <span className="lead-info-icon">
                  <Info className="h-5 w-5" />
                </span>
                <h3>اطلاعات مفید</h3>
              </div>
              <p>
                پس از ثبت سرنخ می‌توانید جزئیات آن را ویرایش و مراحل فروش را پیگیری کنید.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
