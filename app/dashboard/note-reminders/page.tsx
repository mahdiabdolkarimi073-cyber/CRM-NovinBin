'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, BellRing, Clock, Edit3, Hash, Search, StickyNote, X, Loader2,
} from 'lucide-react';
import { toPersianDigits, formatJalaliDateTime, relativeTime } from '@/lib/format';
import { getColorMeta } from '@/components/notes/NoteCard';
import { fetchData } from '@/lib/data-client';
import type { PersonalNote } from '@/lib/types';

type ReminderTab = 'due' | 'upcoming' | 'all';

export default function NoteRemindersPage() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<ReminderTab>('due');
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchData<PersonalNote>('personal_notes', {
          orderBy: { createdAt: 'desc' },
        });
        setNotes(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reminderNotes = useMemo(
    () => notes.filter(
      (n) => n.reminderEnabled && n.reminderAt && !n.reminderDismissed && !n.isTrashed && !n.isArchived
    ),
    [notes]
  );

  const dueReminders = useMemo(
    () => reminderNotes.filter((n) => new Date(n.reminderAt!) <= new Date()),
    [reminderNotes]
  );

  const upcomingReminders = useMemo(
    () => reminderNotes
      .filter((n) => new Date(n.reminderAt!) > new Date())
      .sort((a, b) => new Date(a.reminderAt!).getTime() - new Date(b.reminderAt!).getTime()),
    [reminderNotes]
  );

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = tab === 'due' ? dueReminders : tab === 'upcoming' ? upcomingReminders : reminderNotes;
    if (!q) return source;
    return source.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
    );
  }, [tab, dueReminders, upcomingReminders, reminderNotes, search]);

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }} />
              <h1>یادآور یادداشت‌ها</h1>
            </div>
            <p>همه یادآورهای یادداشت‌های خود را در یکجا مدیریت کنید</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/notes" className="nb-new-btn">
            <ArrowRight className="h-[18px] w-[18px]" />
            بازگشت به یادداشت‌ها
          </Link>
        </div>
      </header>

      {/* Summary stats */}
      <section className="nb-stats-grid-v2">
        <button
          type="button"
          className={`nb-stat-card-v2 ${tab === 'due' ? 'is-active' : ''}`}
          onClick={() => setTab('due')}
          style={{ '--stat-glow': 'rgba(236,72,153,0.25)' } as React.CSSProperties}
        >
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }}>
            <BellRing className="h-[22px] w-[22px] text-white" />
          </div>
          <div className="nb-stat-v2-body">
            <strong>{toPersianDigits(dueReminders.length)}</strong>
            <span>سررسیده</span>
          </div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' }} />
        </button>
        <button
          type="button"
          className={`nb-stat-card-v2 ${tab === 'upcoming' ? 'is-active' : ''}`}
          onClick={() => setTab('upcoming')}
          style={{ '--stat-glow': 'rgba(14,165,233,0.25)' } as React.CSSProperties}
        >
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
            <Clock className="h-[22px] w-[22px] text-white" />
          </div>
          <div className="nb-stat-v2-body">
            <strong>{toPersianDigits(upcomingReminders.length)}</strong>
            <span>در انتظار</span>
          </div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }} />
        </button>
        <button
          type="button"
          className={`nb-stat-card-v2 ${tab === 'all' ? 'is-active' : ''}`}
          onClick={() => setTab('all')}
          style={{ '--stat-glow': 'rgba(100,116,139,0.2)' } as React.CSSProperties}
        >
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #64748b 0%, #334155 100%)' }}>
            <StickyNote className="h-[22px] w-[22px] text-white" />
          </div>
          <div className="nb-stat-v2-body">
            <strong>{toPersianDigits(reminderNotes.length)}</strong>
            <span>کل یادآورها</span>
          </div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #64748b 0%, #334155 100%)' }} />
        </button>
      </section>

      <div className="nb-main nb-reminders-main">
        <div className="nb-toolbar">
          <div className="nb-toolbar-left">
            <h2>
              {tab === 'due' ? 'یادآورهای سررسیده' : tab === 'upcoming' ? 'یادآورهای در انتظار' : 'همه یادآورها'}
            </h2>
            <span className="nb-count-badge">{toPersianDigits(filteredNotes.length)} مورد</span>
          </div>
          <div className="nb-toolbar-right">
            <div className="nb-search-box">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در یادآورها..."
              />
              {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="nb-empty">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
            <p>در حال بارگذاری...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="nb-empty">
            <BellRing className="h-12 w-12 text-muted-foreground/30" />
            <h3>یادآوری یافت نشد</h3>
            <p>
              {tab === 'due' ? 'هیچ یادآور سررسیده‌ای وجود ندارد' :
               tab === 'upcoming' ? 'هیچ یادآور در انتظاری وجود ندارد' :
               'هنوز یادآوری روی یادداشتی تنظیم نشده'}
            </p>
          </div>
        ) : (
          <div className="nb-reminders-list">
            {filteredNotes.map((note) => {
              const colorMeta = getColorMeta(note.color);
              const isDue = new Date(note.reminderAt!) <= new Date();
              return (
                <Link
                  key={note.id}
                  href={`/dashboard/notes/${note.id}`}
                  className={`nb-reminder-card ${isDue ? 'is-due' : ''}`}
                  style={{ borderRightColor: colorMeta.accent }}
                >
                  <div className="nb-reminder-card-icon" style={{ background: colorMeta.accent }}>
                    <BellRing className={`h-5 w-5 text-white ${isDue ? 'animate-bell-ring' : ''}`} />
                  </div>
                  <div className="nb-reminder-card-body">
                    <div className="nb-reminder-card-title-row">
                      <h3>{note.title}</h3>
                      {isDue && <span className="nb-reminder-due-badge">سررسیده</span>}
                    </div>
                    <p className="nb-reminder-card-excerpt">
                      {(note.content || '').replace(/\n/g, ' ').slice(0, 120)}
                    </p>
                    <div className="nb-reminder-card-meta">
                      <span className={`nb-reminder-time ${isDue ? 'is-due' : ''}`}>
                        <Clock className="h-3.5 w-3.5" />
                        {formatJalaliDateTime(note.reminderAt!)}
                      </span>
                      <span className="nb-reminder-relative">
                        {isDue ? 'همین الان' : relativeTime(note.reminderAt!)}
                      </span>
                      {note.tags.length > 0 && (
                        <div className="nb-reminder-card-tags">
                          {note.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="nb-card-tag">
                              <Hash className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/notes/${note.id}/edit`}
                    className="nb-reminder-card-edit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Link>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
