'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, BellRing, Clock, Edit3, Hash, Pin, Archive, Trash2, Calendar,
} from 'lucide-react';
import { formatJalaliDateTime, relativeTime, toPersianDigits } from '@/lib/format';
import { getMockNoteById } from '@/lib/notes-mock-data';
import { getColorMeta } from '@/components/notes/NoteCard';
import type { PersonalNote } from '@/lib/types';

export default function NoteViewPage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params.id as string;
  const [note, setNote] = useState<PersonalNote | null>(null);

  useEffect(() => {
    const found = getMockNoteById(noteId);
    if (found) {
      setNote(found);
    } else {
      const fallback = getMockNoteById('note-001');
      if (fallback) setNote(fallback);
    }
  }, [noteId]);

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

  const colorMeta = getColorMeta(note.color);
  const isReminderDue = note.reminderEnabled && note.reminderAt && !note.reminderDismissed && new Date(note.reminderAt) <= new Date();
  const isReminderUpcoming = note.reminderEnabled && note.reminderAt && !note.reminderDismissed && new Date(note.reminderAt) > new Date();

  return (
    <div className="nb-editor-page" dir="rtl">
      <header className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/notes" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت</span>
          </Link>
          <div className="nb-editor-breadcrumb">
            یادداشت‌ها <b>←</b> مشاهده
          </div>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            className="nb-editor-save-btn"
            onClick={() => router.push(`/dashboard/notes/${note.id}/edit`)}
          >
            <Edit3 className="h-4 w-4" />
            ویرایش
          </button>
        </div>
      </header>

      <div className="nb-editor-main">
        <div className="nb-view-canvas" style={{ borderRightWidth: '4px', borderRightColor: colorMeta.accent }}>
          <div className="nb-view-title-row">
            <h1 className="nb-view-title">{note.title}</h1>
            <div className="nb-view-badges">
              {note.pinned && (
                <span className="nb-view-badge nb-view-badge-pin">
                  <Pin className="h-3 w-3" /> سنجاق‌شده
                </span>
              )}
              {note.isArchived && (
                <span className="nb-view-badge nb-view-badge-archive">
                  <Archive className="h-3 w-3" /> آرشیو
                </span>
              )}
              {isReminderDue && (
                <span className="nb-view-badge nb-view-badge-reminder-due">
                  <BellRing className="h-3 w-3 animate-bell-ring" /> یادآور فعال
                </span>
              )}
              {isReminderUpcoming && (
                <span className="nb-view-badge nb-view-badge-reminder-soon">
                  <Clock className="h-3 w-3" /> یادآور: {formatJalaliDateTime(note.reminderAt!)}
                </span>
              )}
            </div>
          </div>

          <div className="nb-view-meta">
            <span className="nb-editor-date">
              <Calendar className="h-3.5 w-3.5" />
              ایجاد: {formatJalaliDateTime(note.createdAt)}
            </span>
            <span className="nb-editor-date">
              <Clock className="h-3.5 w-3.5" />
              آخرین به‌روزرسانی: {relativeTime(note.updatedAt)}
            </span>
          </div>

          {note.tags.length > 0 && (
            <div className="nb-view-tags">
              {note.tags.map((tag) => (
                <span key={tag} className="nb-card-tag">
                  <Hash className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {note.reminderEnabled && note.reminderAt && (
            <div className={`nb-view-reminder-box ${isReminderDue ? 'is-due' : ''}`}>
              <BellRing className={`h-5 w-5 ${isReminderDue ? 'animate-bell-ring' : ''}`} />
              <div>
                <strong>یادآور یادداشت</strong>
                <span>{formatJalaliDateTime(note.reminderAt)}</span>
              </div>
            </div>
          )}

          <div className="nb-view-content">
            {note.content ? (
              note.content.split('\n').map((line, i) => (
                <p key={i}>{line || '\u00A0'}</p>
              ))
            ) : (
              <p className="text-muted-foreground">بدون محتوا</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
