'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, BellRing, Check, Hash, Palette, Save, Tag, X,
  Pin, PinOff, Archive, ArchiveRestore, Trash2, Sparkles, Clock, Calendar, Loader2,
} from 'lucide-react';
import { relativeTime } from '@/lib/format';
import RichTextEditor from '@/components/notes/RichTextEditor';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { toLocalDateString, toPersianDigits } from '@/lib/format';
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



export default function EditNotePage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;
  const titleRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState<PersonalNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingState, setSavingState] = useState<'saved' | 'editing'>('saved');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderTime, setReminderTime] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchData<PersonalNote>('personal_notes', { where: { id: noteId } });
        if (data && data.length > 0) {
          const found = data[0];
          setNote(found);
          setForm({ title: found.title, content: found.content || '', color: found.color });
          setTags(found.tags || []);
          setReminderEnabled(found.reminderEnabled || false);
          if (found.reminderAt) {
            const d = new Date(found.reminderAt);
            setReminderDate(d);
            setReminderTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
          }
          setTimeout(() => titleRef.current?.focus(), 100);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [noteId]);

  const markEditing = useCallback(() => setSavingState('editing'), []);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      markEditing();
    }
  }, [tagInput, tags, markEditing]);

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    markEditing();
  };

  const togglePin = () => {
    if (!note) return;
    setNote({ ...note, pinned: !note.pinned });
    markEditing();
  };

  const toggleArchive = () => {
    if (!note) return;
    setNote({ ...note, isArchived: !note.isArchived });
    markEditing();
  };

  const moveToTrash = async () => {
    if (!note) return;
    await updateData('personal_notes', { id: note.id }, { isTrashed: true, trashedAt: new Date().toISOString() });
    router.push('/dashboard/notes');
  };

  const handleDelete = async () => {
    if (!note) return;
    if (!confirm('این یادداشت برای همیشه حذف شود؟')) return;
    await deleteData('personal_notes', { id: note.id });
    router.push('/dashboard/notes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('عنوان یادداشت الزامی است'); return; }
    if (!note) return;
    setSaving(true);
    try {
      const data: Record<string, any> = {
        title: form.title.trim(),
        content: form.content || null,
        color: form.color,
        tags,
        pinned: note.pinned,
        isArchived: note.isArchived,
        reminderEnabled,
        reminderAt: reminderEnabled && reminderDate && reminderTime ? new Date(`${toLocalDateString(reminderDate)}T${reminderTime}`).toISOString() : null,
        updatedAt: new Date().toISOString(),
      };
      await updateData('personal_notes', { id: note.id }, data);
      setSavingState('saved');
      router.push('/dashboard/notes');
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره یادداشت');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="nb-editor-loading">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="nb-editor-loading">
          <p>یادداشت یافت نشد</p>
          <Link href="/dashboard/notes" className="nb-editor-back" style={{ marginTop: '16px' }}>
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت به یادداشت‌ها</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <header className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/notes" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت</span>
          </Link>
          <div className="nb-editor-breadcrumb">
            یادداشت‌ها <b>←</b> ویرایش
          </div>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-quick-btn" onClick={togglePin} title={note.pinned ? 'حذف سنجاق' : 'سنجاق'}>
            {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {note.pinned ? 'حذف سنجاق' : 'سنجاق'}
          </button>
          <button type="button" className="nb-editor-quick-btn" onClick={toggleArchive} title={note.isArchived ? 'خروج از آرشیو' : 'آرشیو'}>
            {note.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {note.isArchived ? 'خروج از آرشیو' : 'آرشیو'}
          </button>
          <button type="button" className="nb-editor-quick-btn nb-editor-danger" onClick={moveToTrash} title="حذف">
            <Trash2 className="h-4 w-4" />
            حذف
          </button>
          <span className={`nb-editor-save-status ${savingState === 'saved' ? 'is-saved' : ''}`}>
            <Check className="h-3.5 w-3.5" />
            {savingState === 'saved' ? 'ذخیره شد' : 'در حال ویرایش...'}
          </span>
          <button type="submit" form="note-edit-form" className="nb-editor-save-btn" disabled={saving}>
            {saving ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </header>

      <form id="note-edit-form" onSubmit={handleSubmit} className="nb-editor-main">
        <div className="nb-editor-canvas">
          <input
            ref={titleRef}
            type="text"
            value={form.title}
            onChange={(e) => { setForm({ ...form, title: e.target.value }); setError(''); markEditing(); }}
            placeholder="عنوان یادداشت..."
            className={`nb-editor-title-input ${error ? 'has-error' : ''}`}
          />
          {error && <span className="nb-editor-error">{error}</span>}

          <div className="nb-editor-meta-row">
            <span className="nb-editor-date">
              <Clock className="h-3.5 w-3.5" />
              آخرین به‌روزرسانی: {relativeTime(note.updatedAt)}
            </span>
            {note.pinned && (
              <span className="nb-editor-badge-pin"><Pin className="h-3 w-3" /> سنجاق‌شده</span>
            )}
            {note.isArchived && (
              <span className="nb-editor-badge-archive"><Archive className="h-3 w-3" /> آرشیو</span>
            )}
          </div>

          <RichTextEditor
            initialContent={form.content}
            onChange={(content) => { setForm({ ...form, content }); markEditing(); }}
            placeholder="محتوای یادداشت را اینجا بنویسید..."
          />

          <div className="nb-editor-bottom">
            {/* Reminder Section */}
            <div className="nb-editor-field-group nb-reminder-group">
              <label className="nb-editor-label">
                <BellRing className="h-4 w-4" />
                یادآور
              </label>
              <div className="nb-reminder-toggle-row">
                <button
                  type="button"
                  className={`nb-reminder-toggle ${reminderEnabled ? 'is-active' : ''}`}
                  onClick={() => {
                    const next = !reminderEnabled;
                    setReminderEnabled(next);
                    markEditing();
                    if (next && !reminderDate) {
                      const def = new Date(Date.now() + 3600000);
                      setReminderDate(def);
                      setReminderTime(`${String(def.getHours()).padStart(2, '0')}:${String(def.getMinutes()).padStart(2, '0')}`);
                    }
                  }}
                >
                  <BellRing className="h-4 w-4" />
                  <span>{reminderEnabled ? 'یادآور فعال است' : 'فعال‌سازی یادآور'}</span>
                  <span className={`nb-reminder-switch ${reminderEnabled ? 'is-on' : ''}`}>
                    <span className="nb-reminder-switch-knob" />
                  </span>
                </button>
              </div>
              {reminderEnabled && (
                <div className="nb-reminder-datetime">
                  <div className="nb-reminder-datetime-field">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <JalaliDatePicker
                      value={reminderDate}
                      onChange={(d) => { setReminderDate(d || null); markEditing(); }}
                      placeholder="انتخاب تاریخ"
                      className="nb-reminder-input"
                    />
                  </div>
                  <div className="nb-reminder-datetime-field">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="time"
                      dir="ltr"
                      value={reminderTime}
                      onChange={(e) => { setReminderTime(e.target.value); markEditing(); }}
                      className="nb-reminder-input nb-reminder-time-input"
                    />
                    {reminderTime && (
                      <span className="nb-reminder-time-display">{toPersianDigits(reminderTime)}</span>
                    )}
                  </div>
                  <span className="nb-reminder-hint">
                    در این تاریخ و زمان، هشدار یادآوری دریافت خواهید کرد
                  </span>
                </div>
              )}
            </div>

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
                    onClick={() => { setForm({ ...form, color: color.value }); markEditing(); }}
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

            {/* Delete permanent */}
            <div className="nb-editor-field-group">
              <label className="nb-editor-label">عملیات خطرناک</label>
              <button type="button" className="nb-editor-delete-perm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                حذف دائمی یادداشت
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
