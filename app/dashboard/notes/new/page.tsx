'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Check, Hash, Palette, Save, StickyNote, Tag, X, Lightbulb, FileText, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits } from '@/lib/format';

const NOTE_COLORS = [
  { value: 'default', label: 'پیش‌فرض', accent: '#64748b' },
  { value: 'amber', label: 'کهربایی', accent: '#f59e0b' },
  { value: 'rose', label: 'صورتی', accent: '#f43f5e' },
  { value: 'orange', label: 'نارنجی', accent: '#f97316' },
  { value: 'emerald', label: 'سبز', accent: '#10b981' },
  { value: 'teal', label: 'فیروزه‌ای', accent: '#14b8a6' },
  { value: 'sky', label: 'آبی آسمانی', accent: '#0ea5e9' },
  { value: 'blue', label: 'آبی', accent: '#3b82f6' },
  { value: 'violet', label: 'بنفش', accent: '#8b5cf6' },
  { value: 'fuchsia', label: 'سرخابی', accent: '#d946ef' },
  { value: 'slate', label: 'خاکستری', accent: '#64748b' },
] as const;

const guideCards = [
  { icon: Lightbulb, title: 'عنوان واضح', desc: 'عنوانی کوتاه و گویا انتخاب کنید تا یادداشت سریع پیدا شود.', color: '#2563EB', bg: '#EFF6FF' },
  { icon: FileText, title: 'محتوای کامل', desc: 'هر چیزی که می‌خواهید به یاد بسپارید را با جزئیات بنویسید.', color: '#16B981', bg: '#F0FDF4' },
  { icon: Tag, title: 'برچسب‌گذاری', desc: 'با برچسب، یادداشت‌ها را دسته‌بندی و فیلتر کنید.', color: '#FF7200', bg: '#FFF7ED' },
  { icon: Palette, title: 'رنگ‌بندی', desc: 'با رنگ، یادداشت‌های مهم را از هم متمایز کنید.', color: '#8B5CF6', bg: '#F5F3FF' },
];

export default function NewNotePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setTimeout(() => titleInputRef.current?.focus(), 100);
  }, []);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('عنوان یادداشت الزامی است'); return; }
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    setSubmitting(true);
    try {
      await createData('personal_notes', {
        title: form.title.trim(),
        content: form.content.trim() || null,
        color: form.color,
        tags,
      });
      toast.success('یادداشت با موفقیت ایجاد شد');
      router.push('/dashboard/notes');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ایجاد یادداشت ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;
  const charCount = form.content.length;

  return (
    <div className="new-note-page" dir="rtl">
      <div className="new-note-container">
        {/* Header */}
        <header className="new-note-header">
          <div>
            <div className="new-note-title-row">
              <span className="new-note-title-accent" />
              <h1>ایجاد یادداشت جدید</h1>
            </div>
            <div className="new-note-breadcrumb">
              داشبورد <b>←</b> یادداشت‌ها <b>←</b> ایجاد یادداشت جدید
            </div>
          </div>
          <Link href="/dashboard/notes" className="new-note-back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به یادداشت‌ها
          </Link>
        </header>

        {/* Main grid */}
        <div className="new-note-grid">
          {/* Form card */}
          <form className="note-form-card" onSubmit={handleSubmit}>
            <div className="note-form-header">
              <h2>محتوای یادداشت</h2>
              <p>یادداشت شخصی خود را بنویسید و سازماندهی کنید.</p>
            </div>
            <div className="note-form-divider" />

            <div className="note-form-fields">
              {/* Title */}
              <div className="note-field-group">
                <Label className="note-field-label">عنوان <span className="note-required-star">*</span></Label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => { setForm({ ...form, title: e.target.value }); setError(''); }}
                  placeholder="عنوان یادداشت"
                  className={`note-input ${error ? 'note-input-error' : ''}`}
                />
                {error && <span className="note-field-error">{error}</span>}
              </div>

              {/* Content */}
              <div className="note-field-group">
                <Label className="note-field-label">محتوا</Label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="محتوای یادداشت را اینجا بنویسید..."
                  className="note-textarea"
                  rows={10}
                />
                <div className="note-content-meta">
                  <span>{toPersianDigits(wordCount)} کلمه</span>
                  <span>{toPersianDigits(charCount)} کاراکتر</span>
                </div>
              </div>

              {/* Tags */}
              <div className="note-field-group">
                <Label className="note-field-label">
                  <Tag className="h-4 w-4" />
                  برچسب‌ها
                </Label>
                <div className="note-tags-input-wrap">
                  {tags.map((tag) => (
                    <span key={tag} className="note-tag-chip">
                      <Hash className="h-3 w-3" />
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="افزودن برچسب..."
                    className="note-tag-input"
                  />
                </div>
              </div>

              {/* Color */}
              <div className="note-field-group">
                <Label className="note-field-label">
                  <Palette className="h-4 w-4" />
                  رنگ یادداشت
                </Label>
                <div className="note-color-palette">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: color.value })}
                      className={`note-color-swatch ${form.color === color.value ? 'is-selected' : ''}`}
                      style={{ background: color.accent }}
                      title={color.label}
                      aria-label={color.label}
                    >
                      {form.color === color.value && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="note-form-divider" />
            <div className="note-form-footer">
              <Link href="/dashboard/notes" className="note-cancel-btn">انصراف</Link>
              <button type="submit" className="note-submit-btn" disabled={submitting}>
                {submitting ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
                {submitting ? 'در حال ذخیره...' : 'ایجاد یادداشت'}
              </button>
            </div>
          </form>

          {/* Sidebar guide */}
          <aside className="note-sidebar">
            <div className="note-sidebar-card">
              <div className="note-sidebar-header">
                <StickyNote className="h-5 w-5" />
                <span>راهنمای یادداشت</span>
              </div>
              <p className="note-sidebar-desc">یادداشت‌های شخصی فقط برای شما قابل مشاهده هستند و به شما کمک می‌کنند اطلاعات مهم را سریع ذخیره و بازیابی کنید.</p>
              <div className="note-guide-list">
                {guideCards.map((card) => (
                  <div className="note-guide-item" key={card.title}>
                    <div className="note-guide-icon" style={{ background: card.bg, color: card.color }}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <strong>{card.title}</strong>
                      <p>{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
