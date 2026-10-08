'use client';

import { useState } from 'react';
import {
  Archive, ArchiveRestore, BellRing, Clock, Edit3, Hash, MoreVertical, Palette, Pin, PinOff,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { relativeTime, toPersianDigits, formatJalaliDateTime } from '@/lib/format';
import type { PersonalNote } from '@/lib/types';

export const NOTE_COLORS = [
  { value: 'default', label: 'پیش‌فرض', light: 'bg-white dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700', accent: '#64748b' },
  { value: 'amber',   label: 'کهربایی',  light: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/50', accent: '#f59e0b' },
  { value: 'rose',    label: 'صورتی',    light: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800/50', accent: '#f43f5e' },
  { value: 'orange',  label: 'نارنجی',   light: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800/50', accent: '#f97316' },
  { value: 'emerald', label: 'سبز',      light: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50', accent: '#10b981' },
  { value: 'teal',    label: 'فیروزه‌ای', light: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800/50', accent: '#14b8a6' },
  { value: 'sky',     label: 'آبی آسمانی', light: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-800/50', accent: '#0ea5e9' },
  { value: 'blue',    label: 'آبی',      light: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800/50', accent: '#3b82f6' },
  { value: 'violet',  label: 'بنفش',    light: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800/50', accent: '#8b5cf6' },
  { value: 'fuchsia', label: 'سرخابی',  light: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', border: 'border-fuchsia-200 dark:border-fuchsia-800/50', accent: '#d946ef' },
  { value: 'slate',   label: 'خاکستری',  light: 'bg-slate-50 dark:bg-slate-800/30', border: 'border-slate-200 dark:border-slate-700/50', accent: '#64748b' },
] as const;

export function getColorMeta(value: string) {
  return NOTE_COLORS.find((c) => c.value === value) || NOTE_COLORS[0];
}

type ViewMode = 'grid' | 'list';

type Props = {
  note: PersonalNote;
  view: ViewMode;
  onView: (n: PersonalNote) => void;
  onEdit: (n: PersonalNote) => void;
  onPin: (n: PersonalNote) => void;
  onArchive: (n: PersonalNote) => void;
  onTrash: (n: PersonalNote) => void;
  onColorChange: (id: string, color: string) => void;
};

export default function NoteCard({ note, view, onView, onEdit, onPin, onArchive, onTrash, onColorChange }: Props) {
  const colorMeta = getColorMeta(note.color);
  const [showColors, setShowColors] = useState(false);
  const excerpt = (note.content || 'بدون محتوا').replace(/<[^>]*>/g, '').replace(/\n/g, ' ').slice(0, 160);

  const isReminderDue = note.reminderEnabled && note.reminderAt && !note.reminderDismissed && new Date(note.reminderAt) <= new Date();
  const isReminderUpcoming = note.reminderEnabled && note.reminderAt && !note.reminderDismissed && new Date(note.reminderAt) > new Date();

  return (
    <article
      className={`nb-card nb-card-${view} ${colorMeta.light} ${colorMeta.border}`}
      style={{ borderRightWidth: '4px', borderRightColor: colorMeta.accent }}
      onClick={() => onView(note)}
    >
      <div className="nb-card-top">
        <div className="nb-card-tags">
          {(note.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="nb-card-tag">
              <Hash className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {(note.tags || []).length > 3 && (
            <span className="nb-card-tag">+{toPersianDigits(note.tags.length - 3)}</span>
          )}
          {isReminderDue && (
            <span className="nb-card-tag nb-card-tag-reminder-due">
              <BellRing className="h-2.5 w-2.5" />
              یادآور
            </span>
          )}
          {isReminderUpcoming && (
            <span className="nb-card-tag nb-card-tag-reminder-soon">
              <Clock className="h-2.5 w-2.5" />
              {formatJalaliDateTime(note.reminderAt!)}
            </span>
          )}
        </div>
        <div className="nb-card-actions" onClick={(e) => e.stopPropagation()}>
          {note.pinned && <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
          <button className="nb-card-edit-btn" onClick={() => onEdit(note)} aria-label="ویرایش" title="ویرایش">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="nb-card-more" aria-label="گزینه‌ها">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPin(note)}>
                {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {note.pinned ? 'حذف سنجاق' : 'سنجاق کردن'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(note)}>
                {note.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {note.isArchived ? 'خروج از آرشیو' : 'آرشیو'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowColors(!showColors)}>
                <Palette className="h-4 w-4" />
                تغییر رنگ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(note)}>
                <Edit3 className="h-4 w-4" />
                ویرایش
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTrash(note)} className="text-rose-600">
                <Trash2 className="h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showColors && (
        <div className="nb-card-color-pop" onClick={(e) => e.stopPropagation()}>
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              className="nb-color-dot"
              style={{ background: c.accent }}
              onClick={() => { onColorChange(note.id, c.value); setShowColors(false); }}
              aria-label={c.label}
            />
          ))}
        </div>
      )}

      <h3 className="nb-card-title">{note.title}</h3>
      <p className="nb-card-excerpt">{excerpt}</p>

      <div className="nb-card-footer">
        <span className="nb-card-date">
          <Clock className="h-3 w-3" />
          {relativeTime(note.updatedAt)}
        </span>
        <div className="nb-card-quick" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onPin(note)} className={note.pinned ? 'is-active' : ''} aria-label="سنجاق">
            <Pin className="h-3.5 w-3.5" fill={note.pinned ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => onArchive(note)} aria-label="آرشیو">
            <Archive className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
