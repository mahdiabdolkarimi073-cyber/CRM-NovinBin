'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Filter,
  FolderKanban,
  Heart,
  Lightbulb,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import type { PersonalNote } from '@/lib/types';

const colorOptions = [
  { value: 'default', label: 'پیش‌فرض', bg: 'bg-white', border: 'border-slate-200' },
  { value: 'yellow', label: 'زرد', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'green', label: 'سبز', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'blue', label: 'آبی', bg: 'bg-sky-50', border: 'border-sky-200' },
  { value: 'pink', label: 'صورتی', bg: 'bg-pink-50', border: 'border-pink-200' },
  { value: 'purple', label: 'بنفش', bg: 'bg-violet-50', border: 'border-violet-200' },
];

const categories = [
  { id: 'all', label: 'همه یادداشت‌ها', icon: StickyNote, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'customers', label: 'مشتریان', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
  { id: 'ideas', label: 'ایده‌ها', icon: Lightbulb, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'projects', label: 'کار و پروژه‌ها', icon: BriefcaseBusiness, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'general', label: 'عمومی', icon: FileText, color: 'text-sky-600', bg: 'bg-sky-50' },
  { id: 'finance', label: 'مالی', icon: CircleDollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
] as const;

type CategoryId = (typeof categories)[number]['id'];

type NoteCategory = {
  id: Exclude<CategoryId, 'all'>;
  label: string;
  text: string;
  background: string;
};

function getColorClasses(color: string) {
  return colorOptions.find((option) => option.value === color) || colorOptions[0];
}

function getNoteCategory(note: PersonalNote): NoteCategory {
  const categoryByColor: Record<string, NoteCategory> = {
    purple: { id: 'customers', label: 'مشتریان', text: 'text-violet-700', background: 'bg-violet-100' },
    pink: { id: 'ideas', label: 'ایده‌ها', text: 'text-orange-700', background: 'bg-orange-100' },
    green: { id: 'projects', label: 'کار و پروژه‌ها', text: 'text-emerald-700', background: 'bg-emerald-100' },
    blue: { id: 'general', label: 'عمومی', text: 'text-sky-700', background: 'bg-sky-100' },
    yellow: { id: 'finance', label: 'مالی', text: 'text-amber-700', background: 'bg-amber-100' },
    default: { id: 'general', label: 'عمومی', text: 'text-sky-700', background: 'bg-sky-100' },
  };
  return categoryByColor[note.color] || categoryByColor.default;
}

export default function NotesPage() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');
  const [sort, setSort] = useState('newest');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

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

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditingNote(null);
    setForm({ title: '', content: '', color: 'default' });
    setDialogOpen(true);
  };

  const openEdit = (note: PersonalNote) => {
    setEditingNote(note);
    setForm({ title: note.title, content: note.content || '', color: note.color });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('عنوان یادداشت را وارد کنید'); return; }
    setSaving(true);
    try {
      if (editingNote) {
        await updateData('personal_notes', { id: editingNote.id }, {
          title: form.title,
          content: form.content || null,
          color: form.color,
          updatedAt: new Date(),
        });
        toast.success('یادداشت ویرایش شد');
      } else {
        await createData('personal_notes', { title: form.title, content: form.content || null, color: form.color });
        toast.success('یادداشت ایجاد شد');
      }
      setDialogOpen(false);
      load();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'ذخیره یادداشت ناموفق بود');
    }
    setSaving(false);
  };

  const handleDelete = async (note: PersonalNote) => {
    if (!confirm('حذف این یادداشت؟')) return;
    try {
      await deleteData('personal_notes', { id: note.id });
      toast.success('یادداشت حذف شد');
      load();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'حذف یادداشت ناموفق بود');
    }
  };

  const togglePin = async (note: PersonalNote) => {
    try {
      await updateData('personal_notes', { id: note.id }, { pinned: !note.pinned, updatedAt: new Date() });
      load();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'تغییر وضعیت سنجاق ناموفق بود');
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const filteredNotes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return notes
      .filter((note) => {
        const noteCategory = getNoteCategory(note).id;
        const matchesCategory = category === 'all' || noteCategory === category;
        const matchesSearch = !normalizedSearch || note.title.toLowerCase().includes(normalizedSearch) || (note.content || '').toLowerCase().includes(normalizedSearch);
        return matchesCategory && matchesSearch;
      })
      .sort((first, second) => {
        if (sort === 'oldest') return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
        if (sort === 'title') return first.title.localeCompare(second.title, 'fa');
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
      });
  }, [category, notes, search, sort]);

  const stats = [
    { label: 'کل یادداشت‌ها', value: notes.length, icon: StickyNote, iconClass: 'bg-blue-50 text-blue-600' },
    { label: 'یادداشت‌های پین‌شده', value: notes.filter((note) => note.pinned).length, icon: Pin, iconClass: 'bg-amber-50 text-amber-600' },
    { label: 'یادداشت‌های این ماه', value: notes.filter((note) => new Date(note.createdAt).getMonth() === new Date().getMonth()).length, icon: FolderKanban, iconClass: 'bg-emerald-50 text-emerald-600' },
    { label: 'مورد علاقه‌ها', value: favorites.length, icon: Heart, iconClass: 'bg-orange-50 text-orange-600' },
  ];

  const categoryCounts = categories.reduce<Record<string, number>>((counts, item) => {
    counts[item.id] = item.id === 'all' ? notes.length : notes.filter((note) => getNoteCategory(note).id === item.id).length;
    return counts;
  }, {});

  return (
    <div className="notes-page" dir="rtl">
      <header className="notes-header">
        <div>
          <div className="notes-title-row"><span className="notes-title-marker" /><h1>یادداشت‌ها</h1></div>
          <p>یادداشت‌های شخصی خود را مدیریت و سازماندهی کنید</p>
        </div>
        <Button onClick={openNew} className="notes-new-button"><Plus className="h-[18px] w-[18px]" /> یادداشت جدید</Button>
      </header>

      <div className="notes-search-wrap">
        <Search className="h-[18px] w-[18px]" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجو در یادداشت‌ها..." />
      </div>

      <section className="notes-stats-grid">
        {stats.map((stat) => (
          <div className="notes-stat-card" key={stat.label}>
            <div className={`notes-stat-icon ${stat.iconClass}`}><stat.icon className="h-6 w-6" /></div>
            <div><strong>{stat.value.toLocaleString('fa-IR')}</strong><span>{stat.label}</span></div>
          </div>
        ))}
      </section>

      <section className="notes-main-card">
        <aside className="notes-categories">
          <h2>دسته‌بندی‌ها</h2>
          <div className="notes-category-list">
            {categories.map((item) => {
              const Icon = item.icon;
              const active = category === item.id;
              return <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={`notes-category-item ${active ? 'is-active' : ''}`}>
                <span className={`notes-category-icon ${item.bg} ${item.color}`}><Icon className="h-[17px] w-[17px]" /></span><span>{item.label}</span><b>{categoryCounts[item.id]}</b>
              </button>;
            })}
          </div>
          <button type="button" className="notes-manage-categories"><Settings className="h-4 w-4" /> مدیریت دسته‌بندی‌ها</button>
        </aside>

        <div className="notes-list-section">
          <div className="notes-toolbar">
            <h2>یادداشت‌ها <span>{filteredNotes.length.toLocaleString('fa-IR')} مورد</span></h2>
            <div className="notes-toolbar-controls">
              <select value={category} onChange={(event) => setCategory(event.target.value as CategoryId)} aria-label="فیلتر دسته‌بندی"><option value="all">همه دسته‌ها</option>{categories.slice(1).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="مرتب‌سازی"><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="title">بر اساس عنوان</option></select>
              <button type="button" className="notes-filter-button"><Filter className="h-4 w-4" /> فیلتر</button>
            </div>
          </div>

          {loading ? <div className="notes-loading"><span /></div> : notes.length === 0 ? <div className="notes-empty"><EmptyState icon={<StickyNote className="h-8 w-8" />} title="هیچ یادداشتی وجود ندارد" description="یادداشت‌های شخصی خود را اینجا ذخیره کنید" action={<Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> یادداشت جدید</Button>} /></div> : filteredNotes.length === 0 ? <div className="notes-empty"><StickyNote className="h-10 w-10 text-slate-300" /><p>یادداشتی با این جستجو پیدا نشد.</p></div> : <>
            <div className="notes-grid">
              {filteredNotes.map((note) => <NoteCard key={note.id} note={note} favorite={favorites.includes(note.id)} onFavorite={toggleFavorite} onEdit={openEdit} onDelete={handleDelete} onPin={togglePin} />)}
            </div>
            <div className="notes-pagination"><button type="button" aria-label="صفحه قبل"><ChevronRight className="h-4 w-4" /></button><button type="button" className="is-current">۱</button><button type="button">۲</button><button type="button">۳</button><span>...</span><button type="button">۵</button><button type="button" aria-label="صفحه بعد"><ChevronLeft className="h-4 w-4" /></button></div>
          </>}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingNote ? 'ویرایش یادداشت' : 'یادداشت جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium">عنوان</label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="عنوان یادداشت" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">متن</label><Textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="محتوای یادداشت..." rows={6} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">رنگ</label><div className="flex flex-wrap gap-2">{colorOptions.map((color) => <button key={color.value} type="button" onClick={() => setForm({ ...form, color: color.value })} className={`h-10 w-10 rounded-lg border-2 ${color.bg} ${color.border} ${form.color === color.value ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`} title={color.label} />)}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({ note, favorite, onFavorite, onEdit, onDelete, onPin }: { note: PersonalNote; favorite: boolean; onFavorite: (id: string) => void; onEdit: (note: PersonalNote) => void; onDelete: (note: PersonalNote) => void; onPin: (note: PersonalNote) => void }) {
  const category = getNoteCategory(note);
  const colorClass = getColorClasses(note.color);
  return <article className={`notes-note-card ${colorClass.bg}`}>
    <div className="notes-note-top"><span className={`notes-note-tag ${category.background} ${category.text}`}>{category.label}</span><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="notes-more-button" aria-label="گزینه‌های یادداشت"><MoreVertical className="h-[18px] w-[18px]" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onPin(note)}>{note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}{note.pinned ? 'حذف پین' : 'پین کردن'}</DropdownMenuItem><DropdownMenuItem onClick={() => onEdit(note)}><Pencil className="h-4 w-4" /> ویرایش</DropdownMenuItem><DropdownMenuItem onClick={() => onDelete(note)} className="text-red-600"><Trash2 className="h-4 w-4" /> حذف</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    <h3>{note.title}</h3><p className="notes-note-content">{note.content || 'متنی برای این یادداشت ثبت نشده است.'}</p>
    <div className="notes-note-footer"><span>{relativeTime(note.createdAt)}</span><div><button type="button" onClick={() => onFavorite(note.id)} className={favorite ? 'is-favorite' : ''} aria-label="مورد علاقه"><Heart className="h-[17px] w-[17px]" fill={favorite ? 'currentColor' : 'none'} /></button><button type="button" onClick={() => onPin(note)} className={note.pinned ? 'is-pinned' : ''} aria-label="پین"><Pin className="h-[17px] w-[17px]" /></button></div></div>
  </article>;
}
