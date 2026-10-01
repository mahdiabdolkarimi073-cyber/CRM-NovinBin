'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Clock,
  FileText,
  Hash,
  LayoutGrid,
  List,
  MoreVertical,
  Palette,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings2,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { relativeTime, toPersianDigits } from '@/lib/format';
import { toast } from 'sonner';
import type { PersonalNote } from '@/lib/types';

type ViewMode = 'grid' | 'list' | 'masonry';
type SortMode = 'newest' | 'oldest' | 'title' | 'color';
type Section = 'all' | 'pinned' | 'archived' | 'trash';

const NOTE_COLORS = [
  { value: 'default', label: 'پیش‌فرض', light: 'bg-white dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700', accent: '#64748b', dot: 'bg-slate-400' },
  { value: 'amber',   label: 'کهربایی',  light: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/50', accent: '#f59e0b', dot: 'bg-amber-400' },
  { value: 'rose',    label: 'صورتی',    light: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800/50', accent: '#f43f5e', dot: 'bg-rose-400' },
  { value: 'orange',  label: 'نارنجی',   light: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800/50', accent: '#f97316', dot: 'bg-orange-400' },
  { value: 'emerald', label: 'سبز',      light: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50', accent: '#10b981', dot: 'bg-emerald-400' },
  { value: 'teal',    label: 'فیروزه‌ای', light: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800/50', accent: '#14b8a6', dot: 'bg-teal-400' },
  { value: 'sky',     label: 'آبی آسمانی', light: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-800/50', accent: '#0ea5e9', dot: 'bg-sky-400' },
  { value: 'blue',    label: 'آبی',      light: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800/50', accent: '#3b82f6', dot: 'bg-blue-400' },
  { value: 'violet',  label: 'بنفش',    light: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800/50', accent: '#8b5cf6', dot: 'bg-violet-400' },
  { value: 'fuchsia', label: 'سرخابی',  light: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', border: 'border-fuchsia-200 dark:border-fuchsia-800/50', accent: '#d946ef', dot: 'bg-fuchsia-400' },
  { value: 'slate',   label: 'خاکستری',  light: 'bg-slate-50 dark:bg-slate-800/30', border: 'border-slate-200 dark:border-slate-700/50', accent: '#64748b', dot: 'bg-slate-400' },
] as const;

function getColorMeta(value: string) {
  return NOTE_COLORS.find((c) => c.value === value) || NOTE_COLORS[0];
}

const SIDEBAR_ITEMS: { id: Section; label: string; icon: typeof StickyNote }[] = [
  { id: 'all', label: 'همه یادداشت‌ها', icon: StickyNote },
  { id: 'pinned', label: 'سنجاق‌شده', icon: Pin },
  { id: 'archived', label: 'آرشیو', icon: Archive },
  { id: 'trash', label: 'سطل زباله', icon: Trash2 },
];

export default function NotesPage() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<Section>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('newest');
  const [view, setView] = useState<ViewMode>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  // Command palette
  const [cmdOpen, setCmdOpen] = useState(false);

  // Mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchData<PersonalNote>('personal_notes', { orderBy: { createdAt: 'desc' } });
      setNotes(data || []);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'دریافت یادداشت‌ها ناموفق بود');
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === 'n' && !cmdOpen) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          router.push('/dashboard/notes/new');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmdOpen, router]);

  // Optimistic update helper
  const optimisticUpdate = useCallback((id: string, patch: Partial<PersonalNote>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const openNew = useCallback(() => {
    router.push('/dashboard/notes/new');
  }, [router]);

  const openEdit = useCallback((note: PersonalNote) => {
    router.push(`/dashboard/notes/${note.id}/edit`);
  }, [router]);

  const togglePin = useCallback(
    async (note: PersonalNote) => {
      optimisticUpdate(note.id, { pinned: !note.pinned });
      try {
        await updateData('personal_notes', { id: note.id }, { pinned: !note.pinned, updatedAt: new Date() });
        toast.success(note.pinned ? 'سنجاق حذف شد' : 'سنجاق شد');
      } catch {
        optimisticUpdate(note.id, { pinned: note.pinned });
        toast.error('تغییر وضعیت سنجاق ناموفق بود');
      }
    },
    [optimisticUpdate]
  );

  const toggleArchive = useCallback(
    async (note: PersonalNote) => {
      const newArchived = !note.isArchived;
      optimisticUpdate(note.id, { isArchived: newArchived });
      try {
        await updateData('personal_notes', { id: note.id }, { isArchived: newArchived, updatedAt: new Date() });
        toast.success(newArchived ? 'به آرشیو منتقل شد' : 'از آرشیو بازگردانده شد');
      } catch {
        optimisticUpdate(note.id, { isArchived: note.isArchived });
        toast.error('عملیات ناموفق بود');
      }
    },
    [optimisticUpdate]
  );

  const moveToTrash = useCallback(
    async (note: PersonalNote) => {
      optimisticUpdate(note.id, { isTrashed: true, trashedAt: new Date().toISOString() });
      try {
        await updateData('personal_notes', { id: note.id }, { isTrashed: true, trashedAt: new Date(), updatedAt: new Date() });
        toast.success('یادداشت به سطل زباله منتقل شد');
      } catch {
        optimisticUpdate(note.id, { isTrashed: false, trashedAt: null });
        toast.error('انتقال به سطل زباله ناموفق بود');
      }
    },
    [optimisticUpdate]
  );

  const restoreFromTrash = useCallback(
    async (note: PersonalNote) => {
      optimisticUpdate(note.id, { isTrashed: false, trashedAt: null });
      try {
        await updateData('personal_notes', { id: note.id }, { isTrashed: false, trashedAt: null, updatedAt: new Date() });
        toast.success('یادداشت بازگردانده شد');
      } catch {
        optimisticUpdate(note.id, { isTrashed: true });
        toast.error('بازگردانی ناموفق بود');
      }
    },
    [optimisticUpdate]
  );

  const permanentDelete = useCallback(
    async (note: PersonalNote) => {
      try {
        await deleteData('personal_notes', { id: note.id });
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
        toast.success('یادداشت برای همیشه حذف شد');
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'حذف ناموفق بود');
      }
    },
    []
  );

  const emptyTrash = useCallback(async () => {
    const trashed = notes.filter((n) => n.isTrashed);
    if (trashed.length === 0) return;
    try {
      await Promise.all(trashed.map((n) => deleteData('personal_notes', { id: n.id })));
      setNotes((prev) => prev.filter((n) => !n.isTrashed));
      toast.success('سطل زباله خالی شد');
    } catch {
      toast.error('خالی کردن سطل زباله ناموفق بود');
    }
  }, [notes]);

  // Filtering
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
        if (section === 'archived' && (!n.isArchived || n.isTrashed)) return false;
        if (section === 'trash' && !n.isTrashed) return false;
        if (activeTag && !(n.tags || []).includes(activeTag)) return false;
        if (q && !n.title.toLowerCase().includes(q) && !(n.content || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sort === 'title') return a.title.localeCompare(b.title, 'fa');
        if (sort === 'color') return getColorMeta(a.color).value.localeCompare(getColorMeta(b.color).value);
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

  const stats = useMemo(
    () => [
      { label: 'کل یادداشت‌ها', value: notes.filter((n) => !n.isTrashed && !n.isArchived).length, icon: StickyNote, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
      { label: 'سنجاق‌شده', value: notes.filter((n) => n.pinned && !n.isTrashed && !n.isArchived).length, icon: Pin, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' },
      { label: 'آرشیو', value: notes.filter((n) => n.isArchived && !n.isTrashed).length, icon: Archive, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/40 dark:text-slate-400' },
      { label: 'سطل زباله', value: notes.filter((n) => n.isTrashed).length, icon: Trash2, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400' },
    ],
    [notes]
  );

  const sectionLabel = SIDEBAR_ITEMS.find((s) => s.id === section)?.label || 'یادداشت‌ها';

  return (
    <div className="notes2-page" dir="rtl">
      {/* Header */}
      <header className="notes2-header">
        <div className="notes2-header-left">
          <button
            className="notes2-mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="منوی یادداشت‌ها"
          >
            <Settings2 className="h-5 w-5" />
          </button>
          <div>
            <div className="notes2-title-row">
              <span className="notes2-title-marker" />
              <h1>یادداشت‌ها</h1>
            </div>
            <p>یادداشت‌های شخصی خود را مدیریت و سازماندهی کنید</p>
          </div>
        </div>
        <div className="notes2-header-right">
          <button className="notes2-cmd-btn" onClick={() => setCmdOpen(true)}>
            <Search className="h-4 w-4" />
            <span>جستجوی سریع</span>
            <kbd>Ctrl K</kbd>
          </button>
          <Button className="notes2-new-btn" onClick={openNew}>
            <Plus className="h-[18px] w-[18px]" />
            یادداشت جدید
          </Button>
        </div>
      </header>

      {/* Stats */}
      <section className="notes2-stats-grid">
        {stats.map((stat) => (
          <div className="notes2-stat-card" key={stat.label} onClick={() => setSection(stat.label === 'کل یادداشت‌ها' ? 'all' : stat.label === 'سنجاق‌شده' ? 'pinned' : stat.label === 'آرشیو' ? 'archived' : 'trash')}>
            <div className={`notes2-stat-icon ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <strong>{toPersianDigits(stat.value)}</strong>
              <span>{stat.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Main layout */}
      <div className="notes2-body">
        {/* Desktop sidebar */}
        <aside className={`notes2-sidebar ${!sidebarOpen ? 'is-collapsed' : ''}`}>
          <div className="notes2-sidebar-header">
            <span>بخش‌ها</span>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="جمع کردن سایدبار">
              <ChevronDown className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
            </button>
          </div>
          <nav className="notes2-sidebar-nav">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const count =
                item.id === 'all' ? notes.filter((n) => !n.isTrashed && !n.isArchived).length :
                item.id === 'pinned' ? notes.filter((n) => n.pinned && !n.isTrashed && !n.isArchived).length :
                item.id === 'archived' ? notes.filter((n) => n.isArchived && !n.isTrashed).length :
                notes.filter((n) => n.isTrashed).length;
              return (
                <button
                  key={item.id}
                  className={`notes2-sidebar-item ${section === item.id ? 'is-active' : ''}`}
                  onClick={() => { setSection(item.id); setActiveTag(null); }}
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
              <div className="notes2-sidebar-header" style={{ marginTop: '12px' }}>
                <span>برچسب‌ها</span>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </div>
              <nav className="notes2-sidebar-nav">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`notes2-sidebar-item ${activeTag === tag ? 'is-active' : ''}`}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  >
                    <Hash className="h-[16px] w-[16px]" />
                    <span>{tag}</span>
                    <b>{toPersianDigits(notes.filter((n) => (n.tags || []).includes(tag) && !n.isTrashed && !n.isArchived).length)}</b>
                  </button>
                ))}
              </nav>
            </>
          )}

          {section === 'trash' && notes.filter((n) => n.isTrashed).length > 0 && (
            <button className="notes2-empty-trash-btn" onClick={emptyTrash}>
              <Trash2 className="h-4 w-4" />
              خالی کردن سطل زباله
            </button>
          )}
        </aside>

        {/* Main content */}
        <div className="notes2-main">
          {/* Toolbar */}
          <div className="notes2-toolbar">
            <div className="notes2-toolbar-left">
              <h2>{sectionLabel}</h2>
              <span className="notes2-count-badge">{toPersianDigits(filteredNotes.length)} مورد</span>
              {activeTag && (
                <span className="notes2-active-tag-chip">
                  <Hash className="h-3 w-3" />
                  {activeTag}
                  <button onClick={() => setActiveTag(null)}><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>
            <div className="notes2-toolbar-right">
              <div className="notes2-search-box">
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
              <div className="notes2-sort-wrap">
                <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} aria-label="مرتب‌سازی">
                  <option value="newest">جدیدترین</option>
                  <option value="oldest">قدیمی‌ترین</option>
                  <option value="title">عنوان</option>
                  <option value="color">رنگ</option>
                </select>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
              <div className="notes2-view-toggle">
                <button className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')} aria-label="نمایش شبکه‌ای">
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label="نمایش لیستی">
                  <List className="h-4 w-4" />
                </button>
                <button className={view === 'masonry' ? 'is-active' : ''} onClick={() => setView('masonry')} aria-label="نمایش آجری">
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="notes2-loading">
              <span />
              <p>در حال بارگذاری...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="notes2-empty-state">
              <EmptyState
                icon={
                  section === 'trash' ? <Trash2 className="h-8 w-8" /> :
                  section === 'archived' ? <Archive className="h-8 w-8" /> :
                  section === 'pinned' ? <Pin className="h-8 w-8" /> :
                  <StickyNote className="h-8 w-8" />
                }
                title={
                  section === 'trash' ? 'سطل زباله خالی است' :
                  section === 'archived' ? 'هیچ یادداشتی آرشیو نشده' :
                  section === 'pinned' ? 'هیچ یادداشتی سنجاق نشده' :
                  'هنوز یادداشتی نساخته‌اید'
                }
                description={
                  section === 'trash' ? 'یادداشت‌های حذف‌شده اینجا نمایش داده می‌شوند' :
                  section === 'archived' ? 'یادداشت‌های آرشیو‌شده اینجا نمایش داده می‌شوند' :
                  section === 'pinned' ? 'یادداشت‌های سنجاق‌شده در بالا نمایش داده می‌شوند' :
                  'یادداشت‌های شخصی خود را اینجا ذخیره و مدیریت کنید'
                }
                action={
                  section === 'all' || section === 'pinned' ? (
                    <Button size="sm" onClick={openNew}>
                      <Plus className="h-4 w-4" />
                      یادداشت جدید
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Pinned section */}
              {pinnedNotes.length > 0 && (
                <div className="notes2-pinned-section">
                  <div className="notes2-pinned-header">
                    <Pin className="h-4 w-4" />
                    <span>سنجاق‌شده</span>
                  </div>
                  <div className={`notes2-grid notes2-grid-${view}`}>
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        view={view}
                        section={section}
                        onEdit={openEdit}
                        onPin={togglePin}
                        onArchive={toggleArchive}
                        onTrash={moveToTrash}
                        onRestore={restoreFromTrash}
                        onDelete={permanentDelete}
                        onColorChange={async (id, color) => {
                          optimisticUpdate(id, { color });
                          try { await updateData('personal_notes', { id }, { color, updatedAt: new Date() }); } catch {}
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular notes */}
              {regularNotes.length > 0 && (
                <div className={`notes2-grid notes2-grid-${view}`}>
                  {regularNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      view={view}
                      section={section}
                      onEdit={openEdit}
                      onPin={togglePin}
                      onArchive={toggleArchive}
                      onTrash={moveToTrash}
                      onRestore={restoreFromTrash}
                      onDelete={permanentDelete}
                      onColorChange={async (id, color) => {
                        optimisticUpdate(id, { color });
                        try { await updateData('personal_notes', { id }, { color, updatedAt: new Date() }); } catch {}
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <button className="notes2-fab" onClick={openNew} aria-label="یادداشت جدید">
        <Plus className="h-6 w-6" />
      </button>

      {/* Mobile sidebar drawer */}
      <Drawer open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <DrawerContent className="notes2-mobile-drawer">
          <DrawerHeader>
            <DrawerTitle>بخش‌ها</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`notes2-sidebar-item ${section === item.id ? 'is-active' : ''}`}
                  onClick={() => { setSection(item.id); setActiveTag(null); setMobileSidebarOpen(false); }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {allTags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-semibold mb-2">برچسب‌ها</p>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`notes2-sidebar-item ${activeTag === tag ? 'is-active' : ''}`}
                    onClick={() => { setActiveTag(activeTag === tag ? null : tag); setMobileSidebarOpen(false); }}
                  >
                    <Hash className="h-4 w-4" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Command Palette */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="جستجو یا دستور..." />
        <CommandList>
          <CommandEmpty>نتیجه‌ای یافت نشد</CommandEmpty>
          <CommandGroup heading="دستورات">
            <CommandItem onSelect={() => { setCmdOpen(false); openNew(); }}>
              <Plus className="h-4 w-4" />
              یادداشت جدید
            </CommandItem>
            <CommandItem onSelect={() => { setCmdOpen(false); setSection('all'); setActiveTag(null); }}>
              <StickyNote className="h-4 w-4" />
              نمایش همه یادداشت‌ها
            </CommandItem>
            <CommandItem onSelect={() => { setCmdOpen(false); setSection('pinned'); }}>
              <Pin className="h-4 w-4" />
              نمایش سنجاق‌شده‌ها
            </CommandItem>
            <CommandItem onSelect={() => { setCmdOpen(false); setSection('archived'); }}>
              <Archive className="h-4 w-4" />
              نمایش آرشیو
            </CommandItem>
            <CommandItem onSelect={() => { setCmdOpen(false); setSection('trash'); }}>
              <Trash2 className="h-4 w-4" />
              نمایش سطل زباله
            </CommandItem>
          </CommandGroup>
          {notes.filter((n) => !n.isTrashed && !n.isArchived).length > 0 && (
            <CommandGroup heading="یادداشت‌ها">
              {notes
                .filter((n) => !n.isTrashed && !n.isArchived)
                .slice(0, 8)
                .map((note) => (
                  <CommandItem
                    key={note.id}
                    onSelect={() => { setCmdOpen(false); openEdit(note); }}
                  >
                    <FileText className="h-4 w-4" />
                    {note.title}
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
          {allTags.length > 0 && (
            <CommandGroup heading="برچسب‌ها">
              {allTags.map((tag) => (
                <CommandItem
                  key={tag}
                  onSelect={() => { setCmdOpen(false); setSection('all'); setActiveTag(tag); }}
                >
                  <Hash className="h-4 w-4" />
                  {tag}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

// ===== Note Card =====
function NoteCard({
  note, view, section, onEdit, onPin, onArchive, onTrash, onRestore, onDelete, onColorChange,
}: {
  note: PersonalNote;
  view: ViewMode;
  section: Section;
  onEdit: (n: PersonalNote) => void;
  onPin: (n: PersonalNote) => void;
  onArchive: (n: PersonalNote) => void;
  onTrash: (n: PersonalNote) => void;
  onRestore: (n: PersonalNote) => void;
  onDelete: (n: PersonalNote) => void;
  onColorChange: (id: string, color: string) => void;
}) {
  const colorMeta = getColorMeta(note.color);
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <article
      className={`notes2-card notes2-card-${view} ${colorMeta.light} ${colorMeta.border}`}
      style={{ borderLeftWidth: '4px', borderLeftColor: colorMeta.accent }}
      onClick={() => onEdit(note)}
    >
      {/* Top row */}
      <div className="notes2-card-top">
        <div className="notes2-card-tags">
          {(note.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="notes2-card-tag">
              <Hash className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {(note.tags || []).length > 3 && (
            <span className="notes2-card-tag">+{toPersianDigits(note.tags.length - 3)}</span>
          )}
        </div>
        <div className="notes2-card-actions" onClick={(e) => e.stopPropagation()}>
          {note.pinned && <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="notes2-card-more" aria-label="گزینه‌ها">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {section !== 'trash' && (
                <>
                  <DropdownMenuItem onClick={() => onPin(note)}>
                    {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    {note.pinned ? 'حذف سنجاق' : 'سنجاق کردن'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(note)}>
                    {note.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {note.isArchived ? 'خروج از آرشیو' : 'آرشیو'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowColorPicker(!showColorPicker)}>
                    <Palette className="h-4 w-4" />
                    تغییر رنگ
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onTrash(note)} className="text-rose-600">
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </DropdownMenuItem>
                </>
              )}
              {section === 'trash' && (
                <>
                  <DropdownMenuItem onClick={() => onRestore(note)}>
                    <ArchiveRestore className="h-4 w-4" />
                    بازگردانی
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(note)} className="text-rose-600">
                    <Trash2 className="h-4 w-4" />
                    حذف دائمی
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Color picker popover */}
      {showColorPicker && (
        <div className="notes2-card-color-popover" onClick={(e) => e.stopPropagation()}>
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              className="notes2-color-swatch-sm"
              style={{ background: c.accent }}
              onClick={() => { onColorChange(note.id, c.value); setShowColorPicker(false); }}
              aria-label={c.label}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <h3 className="notes2-card-title">{note.title}</h3>
      <p className="notes2-card-content">{note.content || 'بدون محتوا'}</p>

      {/* Footer */}
      <div className="notes2-card-footer">
        <span className="notes2-card-date">
          <Clock className="h-3 w-3" />
          {relativeTime(note.updatedAt)}
        </span>
        {section !== 'trash' && (
          <div className="notes2-card-quick-actions" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onPin(note)} aria-label="سنجاق" className={note.pinned ? 'is-active' : ''}>
              <Pin className="h-3.5 w-3.5" fill={note.pinned ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => onArchive(note)} aria-label="آرشیو">
              <Archive className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
