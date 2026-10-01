'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Check, Hash, Palette, Save, StickyNote, Tag, X, Lightbulb, FileText,
  Pin, PinOff, Archive, ArchiveRestore, Trash2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits, relativeTime } from '@/lib/format';
import type { PersonalNote } from '@/lib/types';

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
  { icon: Lightbulb, title: 'ویرایش عنوان', desc: 'عنوان را واضح و کوتاه نگه دارید.', color: '#2563EB', bg: '#EFF6FF' },
  { icon: FileText, title: 'به‌روزرسانی محتوا', desc: 'محتوای یادداشت را هر زمان می‌توانید ویرایش کنید.', color: '#16B981', bg: '#F0FDF4' },
  { icon: Tag, title: 'مدیریت برچسب‌ها', desc: 'برچسب‌ها را اضافه یا حذف کنید.', color: '#FF7200', bg: '#FFF7ED' },
  { icon: Palette, title: 'تغییر رنگ', desc: 'رنگ یادداشت را برای دسته‌بندی تغییر دهید.', color: '#8B5CF6', bg: '#F5F3FF' },
];

export default function EditNotePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<PersonalNote | null>(null);
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!profile || !noteId) return;
    setLoading(true);
    try {
      const data = await fetchData<PersonalNote>('personal_notes', { id: noteId });
      if (!data) { toast.error('یادداشت یافت نشد'); router.push('/dashboard/notes'); return; }
      setNote(data);
      setForm({ title: data.title, content: data.content || '', color: data.color });
      setTags(data.tags || []);
      setTimeout(() => titleInputRef.current?.focus(), 100);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'دریافت یادداشت ناموفق بود');
      router.push('/dashboard/notes');
    } finally {
      setLoading(false);
    }
  }, [profile, noteId, router]);

  useEffect(() => { load(); }, [load]);

  // Auto-save with debounce
  const scheduleAutoSave = useCallback(
    (data: { title: string; content: string; color: string; tags: string[] }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await updateData('personal_notes', { id: noteId }, {
            title: data.title,
            content: data.content || null,
            color: data.color,
            tags: data.tags,
            updatedAt: new Date(),
          });
          setNote((prev) => prev ? { ...prev, ...data, updatedAt: new Date().toISOString() } : prev);
        } catch {
          toast.error('ذخیره خودکار ناموفق بود');
        }
      }, 1000);
    },
    [noteId]
  );

  const handleFieldChange = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    if (field === 'title') setError('');
    scheduleAutoSave({ title: newForm.title, content: newForm.content, color: newForm.color, tags });
  };

  const handleColorChange = (color: string) => {
    const newForm = { ...form, color };
    setForm(newForm);
    scheduleAutoSave({ title: newForm.title, content: newForm.content, color, tags });
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput('');
      scheduleAutoSave({ title: form.title, content: form.content, color: form.color, tags: newTags });
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    scheduleAutoSave({ title: form.title, content: form.content, color: form.color, tags: newTags });
  };

  const togglePin = async () => {
    if (!note) return;
    const newPinned = !note.pinned;
    setNote({ ...note, pinned: newPinned });
    try {
      await updateData('personal_notes', { id: noteId }, { pinned: newPinned, updatedAt: new Date() });
      toast.success(newPinned ? 'سنجاق شد' : 'سنجاق حذف شد');
    } catch { toast.error('عملیات ناموفق بود'); setNote({ ...note, pinned: !newPinned }); }
  };

  const toggleArchive = async () => {
    if (!note) return;
    const newArchived = !note.isArchived;
    setNote({ ...note, isArchived: newArchived });
    try {
      await updateData('personal_notes', { id: noteId }, { isArchived: newArchived, updatedAt: new Date() });
      toast.success(newArchived ? 'به آرشیو منتقل شد' : 'از آرشیو بازگردانده شد');
    } catch { toast.error('عملیات ناموفق بود'); setNote({ ...note, isArchived: !newArchived }); }
  };

  const moveToTrash = async () => {
    if (!note) return;
    try {
      await updateData('personal_notes', { id: noteId }, { isTrashed: true, trashedAt: new Date(), updatedAt: new Date() });
      toast.success('یادداشت به سطل زباله منتقل شد');
      router.push('/dashboard/notes');
    } catch { toast.error('عملیات ناموفق بود'); }
  };

  const handleSaveAndExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('عنوان یادداشت الزامی است'); return; }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    try {
      await updateData('personal_notes', { id: noteId }, {
        title: form.title.trim(),
        content: form.content.trim() || null,
        color: form.color,
        tags,
        updatedAt: new Date(),
      });
      toast.success('یادداشت ذخیره شد');
      router.push('/dashboard/notes');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!note) return;
    if (!confirm('این یادداشت برای همیشه حذف شود؟')) return;
    try {
      await deleteData('personal_notes', { id: noteId });
      toast.success('یادداشت حذف شد');
      router.push('/dashboard/notes');
    } catch { toast.error('حذف ناموفق بود'); }
  };

  if (loading) {
    return (
      <div className="new-note-page" dir="rtl">
        <div className="new-note-container">
          <div className="note-form-card" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300, display: 'flex' }}>
            <div className="note-loading-spinner" />
            <p style={{ marginRight: 12 }}>در حال بارگذاری...</p>
          </div>
        </div>
      </div>
    );
  }

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
              <h1>ویرایش یادداشت</h1>
            </div>
            <div className="new-note-breadcrumb">
              داشبورد <b>←</b> یادداشت‌ها <b>←</b> ویرایش
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
          <form className="note-form-card" onSubmit={handleSaveAndExit}>
            <div className="note-form-header">
              <h2>ویرایش محتوا</h2>
              <p>
                {note && (
                  <>
                    آخرین به‌روزرسانی: {relativeTime(note.updatedAt)}
                    {note.pinned && <span className="note-badge-pin"><Pin className="h-3 w-3" /> سنجاق‌شده</span>}
                    {note.isArchived && <span className="note-badge-archive"><Archive className="h-3 w-3" /> آرشیو</span>}
                  </>
                )}
              </p>
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
                  onChange={(e) => handleFieldChange('title', e.target.value)}
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
                  onChange={(e) => handleFieldChange('content', e.target.value)}
                  placeholder="محتوای یادداشت را اینجا بنویسید..."
                  className="note-textarea"
                  rows={10}
                />
                <div className="note-content-meta">
                  <span>{toPersianDigits(wordCount)} کلمه</span>
                  <span>{toPersianDigits(charCount)} کاراکتر</span>
                  <span className="note-autosave-indicator">
                    <Check className="h-3 w-3" />
                    ذخیره خودکار فعال
                  </span>
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
                      onClick={() => handleColorChange(color.value)}
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

            {/* Quick actions row */}
            <div className="note-quick-actions">
              <button type="button" className="note-quick-btn" onClick={togglePin} title={note?.pinned ? 'حذف سنجاق' : 'سنجاق کردن'}>
                {note?.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {note?.pinned ? 'حذف سنجاق' : 'سنجاق'}
              </button>
              <button type="button" className="note-quick-btn" onClick={toggleArchive} title={note?.isArchived ? 'خروج از آرشیو' : 'آرشیو'}>
                {note?.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {note?.isArchived ? 'خروج از آرشیو' : 'آرشیو'}
              </button>
              <button type="button" className="note-quick-btn note-quick-danger" onClick={moveToTrash} title="انتقال به سطل زباله">
                <Trash2 className="h-4 w-4" />
                حذف
              </button>
            </div>

            <div className="note-form-divider" />
            <div className="note-form-footer">
              <div className="note-footer-left">
                <Link href="/dashboard/notes" className="note-cancel-btn">انصراف</Link>
                <button type="button" className="note-delete-btn" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  حذف دائمی
                </button>
              </div>
              <button type="submit" className="note-submit-btn" disabled={saving}>
                {saving ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
                {saving ? 'در حال ذخیره...' : 'ذخیره و بازگشت'}
              </button>
            </div>
          </form>

          {/* Sidebar guide */}
          <aside className="note-sidebar">
            <div className="note-sidebar-card">
              <div className="note-sidebar-header">
                <StickyNote className="h-5 w-5" />
                <span>راهنمای ویرایش</span>
              </div>
              <p className="note-sidebar-desc">تغییرات شما به‌صورت خودکار ذخیره می‌شوند. می‌توانید در هر زمان بازگردید یا با دکمه ذخیره، تغییرات را نهایی کنید.</p>
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
