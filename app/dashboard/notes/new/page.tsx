'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, Check, Hash, Palette, Save, Tag, X,
  Sparkles, Clock,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/format';
import RichTextEditor from '@/components/notes/RichTextEditor';

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

export default function NewNotePage() {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100);
  }, []);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('عنوان یادداشت الزامی است'); return; }
    setSaving(true);
    // Static mock — API will be connected later
    setTimeout(() => {
      setSaving(false);
      router.push('/dashboard/notes');
    }, 500);
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top bar */}
      <header className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/notes" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت</span>
          </Link>
          <div className="nb-editor-breadcrumb">
            یادداشت‌ها <b>←</b> یادداشت جدید
          </div>
        </div>
        <div className="nb-editor-topbar-right">
          <span className="nb-editor-status">
            <Clock className="h-3.5 w-3.5" />
            ایجاد یادداشت جدید
          </span>
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/notes')}>
            انصراف
          </button>
          <button type="submit" form="note-form" className="nb-editor-save-btn" disabled={saving}>
            {saving ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </header>

      {/* Main editor area */}
      <form id="note-form" onSubmit={handleSubmit} className="nb-editor-main">
        <div className="nb-editor-canvas">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={form.title}
            onChange={(e) => { setForm({ ...form, title: e.target.value }); setError(''); }}
            placeholder="عنوان یادداشت..."
            className={`nb-editor-title-input ${error ? 'has-error' : ''}`}
          />
          {error && <span className="nb-editor-error">{error}</span>}

          <div className="nb-editor-meta-row">
            <span className="nb-editor-date">
              <Clock className="h-3.5 w-3.5" />
              همین الان
            </span>
          </div>

          {/* Rich text editor */}
          <RichTextEditor
            initialContent={form.content}
            onChange={(content) => setForm({ ...form, content })}
            placeholder="محتوای یادداشت را اینجا بنویسید..."
          />

          {/* Bottom section: tags + color */}
          <div className="nb-editor-bottom">
            {/* Tags */}
            <div className="nb-editor-field-group">
              <label className="nb-editor-label">
                <Tag className="h-4 w-4" />
                برچسب‌ها
              </label>
              <div className="nb-tags-input">
                {tags.map((tag) => (
                  <span key={tag} className="nb-tag-chip">
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
                  className="nb-tag-field"
                />
              </div>
            </div>

            {/* Color */}
            <div className="nb-editor-field-group">
              <label className="nb-editor-label">
                <Palette className="h-4 w-4" />
                رنگ یادداشت
              </label>
              <div className="nb-color-row">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: color.value })}
                    className={`nb-color-swatch ${form.color === color.value ? 'is-selected' : ''}`}
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
        </div>
      </form>
    </div>
  );
}
