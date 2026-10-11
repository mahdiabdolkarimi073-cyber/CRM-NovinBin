'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, Pencil, Save, Loader2 } from 'lucide-react';
import { formatToman } from '@/lib/format';
import { toast } from 'sonner';
import { allPageModules } from '@/lib/nav-config';

interface ModuleRecord {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  pageHref: string | null;
  clubActive: boolean;
  createdAt: string;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<ModuleRecord>('modules', { orderBy: { name: 'asc' } });
      setModules(data || []);
    } catch {
      setModules([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Seed modules for all site pages if not already present
    seedModules();
  }, [load]);

  const seedModules = async () => {
    try {
      const existing = await fetchData<ModuleRecord>('modules', {});
      const existingHrefs = new Set((existing || []).filter((m) => m.pageHref).map((m) => m.pageHref));
      const toCreate = allPageModules.filter((p) => !existingHrefs.has(p.href));
      for (const page of toCreate) {
        await createData('modules', {
          name: page.label,
          description: `ماژول ${page.label}`,
          price: 0,
          active: true,
          pageHref: page.href,
          clubActive: false,
        });
      }
      if (toCreate.length > 0) load();
    } catch {
      // silent — might fail if table doesn't exist yet
    }
  };

  const openEdit = (mod: ModuleRecord) => {
    setEditingModule(mod);
    setEditForm({
      name: mod.name,
      description: mod.description || '',
      price: String(mod.price),
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingModule) return;
    if (!editForm.name.trim()) {
      toast.error('نام ماژول را وارد کنید');
      return;
    }
    setSaving(true);
    try {
      await updateData('modules', { id: editingModule.id }, {
        name: editForm.name,
        description: editForm.description || null,
        price: Number(editForm.price.replace(/[^0-9]/g, '')) || 0,
      });
      toast.success('ماژول ویرایش شد');
      setEditDialogOpen(false);
      setEditingModule(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'خطا در ویرایش');
    }
    setSaving(false);
  };

  const toggleClubActive = async (mod: ModuleRecord) => {
    setTogglingId(mod.id);
    try {
      await updateData('modules', { id: mod.id }, { clubActive: !mod.clubActive });
      load();
    } catch (e: any) {
      toast.error(e.message || 'خطا');
    }
    setTogglingId(null);
  };

  const toggleActive = async (mod: ModuleRecord) => {
    setTogglingId(mod.id);
    try {
      await updateData('modules', { id: mod.id }, { active: !mod.active });
      load();
    } catch (e: any) {
      toast.error(e.message || 'خطا');
    }
    setTogglingId(null);
  };

  return (
    <div>
      <PageHeader
        title="ماژول‌ها"
        description="مدیریت ماژول‌های قابل فروش پلتفرم — هر صفحه به‌صورت ماژول مستقل با قیمت اختصاصی"
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : modules.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">ماژولی ثبت نشده</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const pageModule = allPageModules.find((p) => p.href === m.pageHref);
            const Icon = pageModule?.icon || Package;
            return (
              <Card key={m.id} className="hover:shadow-md transition-smooth">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.active ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{m.name}</div>
                        {m.description && <div className="text-xs text-slate-400 mt-0.5 truncate">{m.description}</div>}
                        {m.pageHref && <div className="text-[10px] text-slate-300 mt-0.5 truncate" dir="ltr">{m.pageHref}</div>}
                      </div>
                    </div>
                    <button onClick={() => openEdit(m)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-sky-600 hover:border-sky-300 transition-colors shrink-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-900">{formatToman(Number(m.price))} ت</span>
                    <Badge variant={m.active ? 'default' : 'secondary'} className="text-xs">{m.active ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>

                  {/* Club active toggle */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-600">باشگاه مشتریان</span>
                      <span className={`text-[10px] ${m.clubActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {m.clubActive ? 'فعال برای باشگاه' : 'غیرفعال برای باشگاه'}
                      </span>
                    </div>
                    <Switch
                      checked={m.clubActive}
                      onCheckedChange={() => toggleClubActive(m)}
                      disabled={togglingId === m.id}
                    />
                  </div>

                  {/* General active toggle */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-slate-600">وضعیت کلی</span>
                    <Switch
                      checked={m.active}
                      onCheckedChange={() => toggleActive(m)}
                      disabled={togglingId === m.id}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش ماژول</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نام ماژول *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="نام ماژول"
              />
            </div>
            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="توضیحات ماژول"
              />
            </div>
            <div className="space-y-2">
              <Label>قیمت (تومان)</Label>
              <Input
                dir="ltr"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                placeholder="0"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
              <Button onClick={handleEditSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
