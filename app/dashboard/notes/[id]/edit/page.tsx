'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, BellRing, Check, Hash, Palette, Save, Tag, X,
  Pin, PinOff, Archive, ArchiveRestore, Trash2, Sparkles, Clock, Calendar,
} from 'lucide-react';
import { relativeTime } from '@/lib/format';
import RichTextEditor from '@/components/notes/RichTextEditor';
import { getMockNoteById } from '@/lib/notes-mock-data';
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

function toLocalDateTimeInput(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function toLocalDateTimeInputFromDate(date: Date): string {
  return toLocalDateTimeInput(date.toISOString());
}

export default function EditNotePage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;
  const titleRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState<PersonalNote | null>(null);
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingState, setSavingState] = useState<'saved' | 'editing'>('saved');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderAt, setReminderAt] = useState('');

  useEffect(() => {
    const found = getMockNoteById(noteId);
    if (found) {
      setNote(found);
      setForm({ title: found.title, content: found.content || '', color: found.color });
      setTags(found.tags || []);
      setReminderEnabled(found.reminderEnabled || false);
      setReminderAt(found.reminderAt ? toLocalDateTimeInput(found.reminderAt) : '');
      setTimeout(() => titleRef.current?.focus(), 100);
    } else {
      const fallback = getMockNoteById('note-001');
      if (fallback) {
        setNote(fallback);
        setForm({ title: fallback.title, content: fallback.content || '', color: fallback.color });
        setTags(fallback.tags || []);
        setReminderEnabled(fallback.reminderEnabled || false);
        setReminderAt(fallback.reminderAt ? toLocalDateTimeInput(fallback.reminderAt) : '');
      }
    }
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

  const moveToTrash = () => {
    router.push('/dashboard/notes');
  };

  const handleDelete = () => {
    if (!confirm('این یادداشت برای همیشه حذف شود؟')) return;
    router.push('/dashboard/notes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('عنوان یادداشت الزامی است'); return; }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavingState('saved');
      router.push('/dashboard/notes');
    }, 500);
  };

  if (!note) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="nb-editor-loading">
          <span />
          <p>در حال بارگذاری...</p>
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
                    if (next && !reminderAt) {
                      const def = new Date(Date.now() + 3600000);
                      setReminderAt(toLocalDateTimeInputFromDate(def));
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
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    value={reminderAt}
                    onChange={(e) => { setReminderAt(e.target.value); markEditing(); }}
                    className="nb-reminder-input"
                  />
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
