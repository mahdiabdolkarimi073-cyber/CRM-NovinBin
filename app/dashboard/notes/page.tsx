'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Archive, BellRing, ChevronDown, Hash, LayoutGrid, List,
  Pin, Plus, Search, Settings2, StickyNote, Trash2, X, Loader2,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/format';
import type { PersonalNote } from '@/lib/types';
import { useNotes } from '@/hooks/use-notes';
import NoteCard from '@/components/notes/NoteCard';

type ViewMode = 'grid' | 'list';
type SortMode = 'newest' | 'oldest' | 'title';
type Section = 'all' | 'pinned' | 'reminders' | 'archived' | 'trash';

const SIDEBAR_ITEMS: { id: Section; label: string; icon: typeof StickyNote }[] = [
  { id: 'all', label: 'همه یادداشت‌ها', icon: StickyNote },
  { id: 'pinned', label: 'سنجاق‌شده', icon: Pin },
  { id: 'reminders', label: 'یادآورها', icon: BellRing },
  { id: 'archived', label: 'آرشیو', icon: Archive },
  { id: 'trash', label: 'سطل زباله', icon: Trash2 },
];

export default function NotesPage() {
  const router = useRouter();
  const { notes, loading, updateNote, deleteNote } = useNotes();
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<Section>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('newest');
  const [view, setView] = useState<ViewMode>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const openView = useCallback((note: PersonalNote) => router.push(`/dashboard/notes/${note.id}`), [router]);
  const openEdit = useCallback((note: PersonalNote) => router.push(`/dashboard/notes/${note.id}/edit`), [router]);

  const handlePin = useCallback((note: PersonalNote) => {
    updateNote(note.id, { pinned: !note.pinned });
  }, [updateNote]);

  const handleArchive = useCallback((note: PersonalNote) => {
    updateNote(note.id, { isArchived: !note.isArchived });
  }, [updateNote]);

  const handleTrash = useCallback((note: PersonalNote) => {
    updateNote(note.id, { isTrashed: true, trashedAt: new Date().toISOString() });
  }, [updateNote]);

  const handleColorChange = useCallback((id: string, color: string) => {
    updateNote(id, { color });
  }, [updateNote]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      if (!n.isTrashed) (n.tags || []).forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (section === 'all' && n.isTrashed) return false;
        if (section === 'all' && n.isArchived) return false;
        if (section === 'pinned' && (!n.pinned || n.isTrashed || n.isArchived)) return false;
        if (section === 'reminders' && (!n.reminderEnabled || n.isTrashed || n.isArchived)) return false;
        if (section === 'archived' && (!n.isArchived || n.isTrashed)) return false;
        if (section === 'trash' && !n.isTrashed) return false;
        if (activeTag && !(n.tags || []).includes(activeTag)) return false;
        if (q && !n.title.toLowerCase().includes(q) && !(n.content || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sort === 'title') return a.title.localeCompare(b.title, 'fa');
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [notes, section, activeTag, search, sort]);

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.pinned && section === 'all'),
    [filteredNotes, section]
  );
  const regularNotes = useMemo(
    () => (section === 'all' ? filteredNotes.filter((n) => !n.pinned) : filteredNotes),
    [filteredNotes, section]
  );

  const activeReminderCount = notes.filter(
    (n) => n.reminderEnabled && n.reminderAt && !n.reminderDismissed && !n.isTrashed && !n.isArchived
  ).length;
  const dueReminderCount = notes.filter(
    (n) => n.reminderEnabled && n.reminderAt && !n.reminderDismissed && !n.isTrashed && !n.isArchived && new Date(n.reminderAt!) <= new Date()
  ).length;

  const stats = useMemo(
    () => [
      {
        label: 'کل یادداشت‌ها', value: notes.filter((n) => !n.isTrashed && !n.isArchived).length,
        icon: StickyNote, section: 'all' as Section,
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        glow: 'rgba(59,130,246,0.25)',
      },
      {
        label: 'سنجاق‌شده', value: notes.filter((n) => n.pinned && !n.isTrashed && !n.isArchived).length,
        icon: Pin, section: 'pinned' as Section,
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        glow: 'rgba(245,158,11,0.25)',
      },
      {
        label: 'یادآورها', value: activeReminderCount,
        icon: BellRing, section: 'reminders' as Section,
        gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
        glow: 'rgba(236,72,153,0.25)',
        badge: dueReminderCount > 0 ? toPersianDigits(dueReminderCount) : undefined,
      },
      {
        label: 'آرشیو', value: notes.filter((n) => n.isArchived && !n.isTrashed).length,
        icon: Archive, section: 'archived' as Section,
        gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
        glow: 'rgba(100,116,139,0.2)',
      },
    ],
    [notes, activeReminderCount, dueReminderCount]
  );

  const sectionLabel = SIDEBAR_ITEMS.find((s) => s.id === section)?.label || 'یادداشت‌ها';

  const SidebarContent = () => (
    <>
      <div className="nb-sidebar-section-header">
        <span>بخش‌ها</span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="جمع کردن" className="nb-sidebar-collapse-btn">
          <ChevronDown className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>
      <nav className="nb-sidebar-nav">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const count =
            item.id === 'all' ? notes.filter((n) => !n.isTrashed && !n.isArchived).length :
            item.id === 'pinned' ? notes.filter((n) => n.pinned && !n.isTrashed && !n.isArchived).length :
            item.id === 'reminders' ? activeReminderCount :
            item.id === 'archived' ? notes.filter((n) => n.isArchived && !n.isTrashed).length :
            notes.filter((n) => n.isTrashed).length;
          return (
            <button
              key={item.id}
              className={`nb-sidebar-item ${section === item.id ? 'is-active' : ''}`}
              onClick={() => { setSection(item.id); setActiveTag(null); setMobileSidebarOpen(false); }}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
              <b>{toPersianDigits(count)}</b>
            </button>
          );
        })}
      </nav>

      {allTags.length > 0 && (
        <>
          <div className="nb-sidebar-section-header" style={{ marginTop: '16px' }}>
            <span>برچسب‌ها</span>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </div>
          <nav className="nb-sidebar-nav">
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`nb-sidebar-item ${activeTag === tag ? 'is-active' : ''}`}
                onClick={() => { setActiveTag(activeTag === tag ? null : tag); setMobileSidebarOpen(false); }}
              >
                <Hash className="h-[16px] w-[16px]" />
                <span>{tag}</span>
                <b>{toPersianDigits(notes.filter((n) => (n.tags || []).includes(tag) && !n.isTrashed && !n.isArchived).length)}</b>
              </button>
            ))}
          </nav>
        </>
      )}
    </>
  );

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <button className="nb-mobile-menu" onClick={() => setMobileSidebarOpen(true)} aria-label="منو">
            <Settings2 className="h-5 w-5" />
          </button>
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" />
              <h1>یادداشت‌ها</h1>
            </div>
            <p>یادداشت‌های شخصی خود را مدیریت و سازماندهی کنید</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/notes/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            یادداشت جدید
          </Link>
        </div>
      </header>

      {/* Redesigned Stats */}
      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${section === stat.section ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => { setSection(stat.section); setActiveTag(null); }}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
              {stat.badge && (
                <span className="nb-stat-v2-badge">{stat.badge}</span>
              )}
            </div>
            <div className="nb-stat-v2-body">
              <strong>{toPersianDigits(stat.value)}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-body">
        <aside className={`nb-sidebar ${!sidebarOpen ? 'is-collapsed' : ''}`}>
          <SidebarContent />
        </aside>

        {mobileSidebarOpen && (
          <div className="nb-mobile-overlay" onClick={() => setMobileSidebarOpen(false)}>
            <div className="nb-mobile-sidebar" onClick={(e) => e.stopPropagation()}>
              <div className="nb-mobile-sidebar-header">
                <span>فیلترها</span>
                <button onClick={() => setMobileSidebarOpen(false)}><X className="h-4 w-4" /></button>
              </div>
              <div className="px-4 pb-6">
                <SidebarContent />
              </div>
            </div>
          </div>
        )}

        <div className="nb-main">
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>{sectionLabel}</h2>
              <span className="nb-count-badge">{toPersianDigits(filteredNotes.length)} مورد</span>
              {activeTag && (
                <span className="nb-tag-chip-active">
                  <Hash className="h-3 w-3" />
                  {activeTag}
                  <button onClick={() => setActiveTag(null)}><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>
            <div className="nb-toolbar-right">
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو در یادداشت‌ها..."
                />
                {search && (
                  <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <div className="nb-sort-wrap">
                <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} aria-label="مرتب‌سازی">
                  <option value="newest">جدیدترین</option>
                  <option value="oldest">قدیمی‌ترین</option>
                  <option value="title">عنوان</option>
                </select>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
              <div className="nb-view-toggle">
                <button className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')} aria-label="شبکه‌ای">
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label="لیستی">
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="nb-empty">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
              <p>در حال بارگذاری یادداشت‌ها...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="nb-empty">
              <StickyNote className="h-12 w-12 text-muted-foreground/30" />
              <h3>یادداشتی یافت نشد</h3>
              <p>
                {section === 'trash' ? 'سطل زباله خالی است' :
                 section === 'archived' ? 'هیچ یادداشتی آرشیو نشده' :
                 section === 'pinned' ? 'هیچ یادداشتی سنجاق نشده' :
                 section === 'reminders' ? 'هیچ یادآوری تنظیم نشده' :
                 'هنوز یادداشتی نساخته‌اید'}
              </p>
              {section === 'all' && (
                <Link href="/dashboard/notes/new" className="nb-empty-new-btn">
                  <Plus className="h-4 w-4" />
                  یادداشت جدید
                </Link>
              )}
            </div>
          ) : (
            <>
              {pinnedNotes.length > 0 && (
                <div className="nb-pinned-section">
                  <div className="nb-pinned-header">
                    <Pin className="h-4 w-4" />
                    <span>سنجاق‌شده</span>
                  </div>
                  <div className={`nb-grid nb-grid-${view}`}>
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        view={view}
                        onView={openView}
                        onEdit={openEdit}
                        onPin={handlePin}
                        onArchive={handleArchive}
                        onTrash={handleTrash}
                        onColorChange={handleColorChange}
                      />
                    ))}
                  </div>
                </div>
              )}

              {regularNotes.length > 0 && (
                <>
                  {pinnedNotes.length > 0 && section === 'all' && (
                    <div className="nb-section-divider"><span>سایر یادداشت‌ها</span></div>
                  )}
                  <div className={`nb-grid nb-grid-${view}`}>
                    {regularNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        view={view}
                        onView={openView}
                        onEdit={openEdit}
                        onPin={handlePin}
                        onArchive={handleArchive}
                        onTrash={handleTrash}
                        onColorChange={handleColorChange}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Link href="/dashboard/notes/new" className="nb-fab" aria-label="یادداشت جدید">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
