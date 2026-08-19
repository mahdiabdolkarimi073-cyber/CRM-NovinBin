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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Package, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatToman } from '@/lib/format';
import { toast } from 'sonner';

const MODULE_NAME_MAP: Record<string, string> = {
  crm: 'مدیریت ارتباط با مشتری (CRM)',
  inventory: 'انبار و لجستیک',
  finance: 'مالی و حسابداری',
  hr: 'منابع انسانی',
  loyalty: 'باشگاه مشتریان',
  academy: 'آکادمی',
  approvals: 'تأییدها',
  documents: 'اسناد و دانش',
  knowledge: 'پایگاه دانش',
  performance: 'عملکرد',
};

const MODULE_DESC_MAP: Record<string, string> = {
  crm: 'مدیریت مشتریان، سرنخ‌ها و قیف فروش',
  inventory: 'مدیریت انبارها، موجودی و حرکات کالا',
  finance: 'حسابداری سازمانی، خزانه‌داری و چک‌ها',
  hr: 'مدیریت پرسنل، حضور و غیاب و مرخصی',
  loyalty: 'مدیریت امتیازات و وفاداری مشتریان',
  academy: 'مدیریت هنرجویان و ثبت‌نام دوره‌ها',
  approvals: 'مدیریت درخواست‌های تأیید و سلسله‌مراتب',
  documents: 'مدیریت اسناد و پایگاه دانش',
  knowledge: 'مدیریت مقالات و دانش سازمانی',
  performance: 'مدیریت اهداف و شاخص‌های عملکرد',
};

function translateModuleName(name: string): string {
  return MODULE_NAME_MAP[name] || name;
}

function translateModuleDesc(name: string, desc: string | null): string {
  if (MODULE_DESC_MAP[name]) return MODULE_DESC_MAP[name];
  if (desc && desc.startsWith('ماژول ')) return MODULE_DESC_MAP[name] || desc;
  return desc || '';
}

export default function ModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData('modules', { orderBy: { name: 'asc' } });
      setModules(data);
    } catch {
      setModules([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name) { toast.error('نام ماژول را وارد کنید'); return; }
    try {
      await createData('modules', {
        name: form.name,
        description: form.description || null,
        price: Number(form.price.replace(/[^0-9]/g, '')) || 0,
        active: true,
      });
      toast.success('ماژول ایجاد شد');
      setDialogOpen(false);
      setForm({ name: '', description: '', price: '' });
      load();
    } catch (e: any) { toast.error(e.message || 'خطا'); }
  };

  const toggleActive = async (mod: any) => {
    try {
      await updateData('modules', { id: mod.id }, { active: !mod.active });
      load();
    } catch (e: any) { toast.error(e.message || 'خطا'); }
  };

  return (
    <div>
      <PageHeader
        title="ماژول‌ها"
        description="مدیریت ماژول‌های قابل فروش پلتفرم"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> ماژول جدید</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>ایجاد ماژول</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>نام ماژول *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-2"><Label>قیمت (تومان)</Label><Input dir="ltr" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button onClick={handleCreate}>ایجاد</Button></DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>
      ) : modules.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-slate-400">ماژولی ثبت نشده</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const displayName = translateModuleName(m.name);
            const displayDesc = translateModuleDesc(m.name, m.description);
            return (
              <Card key={m.id} className="hover:shadow-md transition-smooth">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.active ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{displayName}</div>
                        {displayDesc && <div className="text-xs text-slate-400 mt-0.5">{displayDesc}</div>}
                      </div>
                    </div>
                    <button onClick={() => toggleActive(m)}>
                      {m.active ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-900">{formatToman(m.price)} ت</span>
                    <Badge variant={m.active ? 'default' : 'secondary'} className="text-xs">{m.active ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
