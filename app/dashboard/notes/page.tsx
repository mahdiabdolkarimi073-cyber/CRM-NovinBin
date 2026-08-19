'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StickyNote, Plus, Pin, PinOff, Pencil, Trash2, Search, MoreVertical } from 'lucide-react';
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

function getColorClasses(color: string) {
  return colorOptions.find((c) => c.value === color) || colorOptions[0];
}

export default function NotesPage() {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [form, setForm] = useState({ title: '', content: '', color: 'default' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchData<PersonalNote>('personal_notes', {
        orderBy: { createdAt: 'desc' },
      });
      setNotes(data || []);
    } catch (e: any) {
      toast.error(e.message);
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
        await createData('personal_notes', {
          title: form.title,
          content: form.content || null,
          color: form.color,
        });
        toast.success('یادداشت ایجاد شد');
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (note: PersonalNote) => {
    if (!confirm('حذف این یادداشت؟')) return;
    try {
      await deleteData('personal_notes', { id: note.id });
      toast.success('حذف شد');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const togglePin = async (note: PersonalNote) => {
    try {
      await updateData('personal_notes', { id: note.id }, { pinned: !note.pinned, updatedAt: new Date() });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content || '').toLowerCase().includes(search.toLowerCase())
  );

  const pinnedNotes = filtered.filter((n) => n.pinned);
  const unpinnedNotes = filtered.filter((n) => !n.pinned);

  return (
    <div>
      <PageHeader
        title="یادداشت‌ها"
        description="یادداشت‌های شخصی شما — فقط شما می‌توانید آن‌ها را ببینید"
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" /> یادداشت جدید
          </Button>
        }
      />

      <div className="mb-6 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو در یادداشت‌ها..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<StickyNote className="w-8 h-8" />}
            title="هیچ یادداشتی وجود ندارد"
            description="یادداشت‌های شخصی خود را اینجا ذخیره کنید"
            action={<Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> یادداشت جدید</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm font-bold text-muted-foreground">
                <Pin className="w-4 h-4" /> یادداشت‌های پین‌شده
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={handleDelete} onPin={togglePin} />
                ))}
              </div>
            </div>
          )}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 mb-3 text-sm font-bold text-muted-foreground">
                  سایر یادداشت‌ها
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={handleDelete} onPin={togglePin} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'ویرایش یادداشت' : 'یادداشت جدید'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">عنوان</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان یادداشت"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">متن</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="محتوای یادداشت..."
                rows={6}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">رنگ</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`w-10 h-10 rounded-lg border-2 transition-smooth ${c.bg} ${c.border} ${
                      form.color === c.value ? 'ring-2 ring-sky-500 ring-offset-1' : ''
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({
  note, onEdit, onDelete, onPin,
}: {
  note: PersonalNote;
  onEdit: (n: PersonalNote) => void;
  onDelete: (n: PersonalNote) => void;
  onPin: (n: PersonalNote) => void;
}) {
  const colorClass = getColorClasses(note.color);
  return (
    <Card className={`relative border-2 ${colorClass.border} ${colorClass.bg} transition-smooth hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-900 line-clamp-1 flex-1">{note.title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPin(note)}>
                {note.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                {note.pinned ? 'حذف پین' : 'پین کردن'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(note)}>
                <Pencil className="w-4 h-4" /> ویرایش
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(note)} className="text-red-600">
                <Trash2 className="w-4 h-4" /> حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {note.content && (
          <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap leading-6 mb-3">{note.content}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{relativeTime(note.createdAt)}</span>
          {note.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
        </div>
      </CardContent>
    </Card>
  );
}
