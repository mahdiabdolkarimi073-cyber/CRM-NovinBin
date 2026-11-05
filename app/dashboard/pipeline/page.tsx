'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Plus, GripVertical } from 'lucide-react';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { formatToman } from '@/lib/format';
import { tomanShort, SALES_STAGES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Opportunity } from '@/lib/types';

export default function PipelinePage() {
  const { profile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', amount: '', probability: '50', stage: 'new_lead', description: '',
  });
  const [viewOpp, setViewOpp] = useState<Opportunity | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', amount: '', probability: '50', stage: 'new_lead', description: '' });
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadOpportunities = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchData('opportunities', {
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      setOpportunities((data as Opportunity[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری فرصت‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadOpportunities(); }, [loadOpportunities]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.title) { toast.error('عنوان فرصت را وارد کنید'); return; }
    setCreating(true);
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    try {
      await createData('opportunities', {
        title: form.title,
        amount,
        probability: Number(form.probability),
        stage: form.stage,
        description: form.description || null,
        createdBy: profile.id,
      });
      toast.success('فرصت فروش ایجاد شد');
      setDialogOpen(false);
      setForm({ title: '', amount: '', probability: '50', stage: 'new_lead', description: '' });
      loadOpportunities();
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const handleDrop = async (stage: string) => {
    if (!dragId) return;
    setDragOver(null);
    setDragId(null);
    const opp = opportunities.find((o) => o.id === dragId);
    if (!opp || opp.stage === stage) return;
    const probMap: Record<string, number> = { new_lead: 10, first_call: 25, meeting: 40, proposal: 60, negotiation: 75, won: 100, lost: 0 };
    try {
      await updateData('opportunities', { id: dragId }, { stage, probability: probMap[stage] ?? opp.probability });
      loadOpportunities();
    } catch (error: any) {
      toast.error('تغییر مرحله ناموفق: ' + error.message);
    }
  };

  const oppsByStage = (stage: string) => opportunities.filter((o) => o.stage === stage);

  const openView = (opp: Opportunity) => {
    setViewOpp(opp);
    setViewDialogOpen(true);
  };

  const openEdit = (opp: Opportunity) => {
    setEditOpp(opp);
    setEditForm({
      title: opp.title,
      amount: String(opp.amount),
      probability: String(opp.probability),
      stage: opp.stage,
      description: opp.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editOpp || !editForm.title) { toast.error('عنوان فرصت را وارد کنید'); return; }
    setSaving(true);
    const amount = Number(editForm.amount.replace(/[^0-9]/g, '')) || 0;
    try {
      await updateData('opportunities', { id: editOpp.id }, {
        title: editForm.title,
        amount,
        probability: Number(editForm.probability),
        stage: editForm.stage,
        description: editForm.description || null,
      });
      toast.success('ویرایش شد');
      setEditDialogOpen(false);
      loadOpportunities();
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (opp: Opportunity) => {
    if (!confirm('حذف این فرصت؟')) return;
    try {
      await deleteData('opportunities', { id: opp.id });
      toast.success('حذف شد');
      loadOpportunities();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };
  const stageValue = (stage: string) => oppsByStage(stage).reduce((s, o) => s + Number(o.amount), 0);
  const totalPipeline = opportunities.filter((o) => !['won', 'lost'].includes(o.stage)).reduce((s, o) => s + Number(o.amount), 0);
  const wonTotal = opportunities.filter((o) => o.stage === 'won').reduce((s, o) => s + Number(o.amount), 0);

  return (
    <div>
      <PageHeader
        title="قیف فروش"
        description="مدیریت فرصت‌های فروش با نمودار کانبان"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> فرصت جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>ایجاد فرصت فروش</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان فرصت *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>مبلغ (تومان)</Label>
                    <Input dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>احتمال موفقیت (%)</Label>
                    <Input dir="ltr" type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>مرحله</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SALES_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>توضیحات</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال ایجاد...' : 'ایجاد'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">ارزش کل قیف</div><div className="text-xl font-bold text-slate-900">{tomanShort(totalPipeline)}</div></div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">فروش موفق</div><div className="text-xl font-bold text-emerald-600">{tomanShort(wonTotal)}</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">تعداد فرصت‌ها</div><div className="text-xl font-bold text-slate-900">{opportunities.length.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : opportunities.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TrendingUp className="w-8 h-8" />}
            title="فرصتی در قیف فروش نیست"
            description="برای شروع، اولین فرصت فروش را ایجاد کنید"
            action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> افزودن فرصت</Button>}
          />
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {SALES_STAGES.map((stage) => {
              const items = oppsByStage(stage.key);
              return (
                <div
                  key={stage.key}
                  className={`w-72 shrink-0 rounded-xl transition-smooth ${dragOver === stage.key ? 'bg-sky-50 ring-2 ring-sky-300' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage.key); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(stage.key)}
                >
                  <div className="p-3 rounded-t-xl bg-white border-b-2" style={{ borderColor: stage.color }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="font-semibold text-sm text-slate-700">{stage.label}</span>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length.toLocaleString('fa-IR')}</span>
                    </div>
                    <div className="text-xs text-slate-400">{tomanShort(stageValue(stage.key))}</div>
                  </div>
                  <div className="p-2 space-y-2 bg-slate-50/50 min-h-[200px] rounded-b-xl">
                    {items.map((opp) => (
                      <div
                        key={opp.id}
                        draggable
                        onDragStart={() => setDragId(opp.id)}
                        onDragEnd={() => { setDragId(null); setDragOver(null); }}
                        className={`p-3 rounded-lg bg-white border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-sky-200 transition-smooth ${dragId === opp.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                          <div className="text-sm font-medium text-slate-800 flex-1">{opp.title}</div>
                        </div>
                        <div className="text-sm font-bold text-slate-900 mb-2">{formatToman(Number(opp.amount))} ت</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${opp.probability}%`, backgroundColor: stage.color }} />
                            </div>
                            <span className="text-xs text-slate-500">{opp.probability.toLocaleString('fa-IR')}%</span>
                          </div>
                          {isSuperAdmin && (
                            <SuperAdminActions onView={() => openView(opp)} onEdit={() => openEdit(opp)} onDelete={() => handleDelete(opp)} />
                          )}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-center py-8 text-slate-300 text-xs">کارت اینجا رها کنید</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>مشاهده فرصت</DialogTitle></DialogHeader>
          {viewOpp && (
            <div className="space-y-3">
              <div className="font-bold text-slate-900">{viewOpp.title}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">مبلغ:</span> <span className="font-bold">{formatToman(Number(viewOpp.amount))} ت</span></div>
                <div><span className="text-slate-400">احتمال:</span> <span className="font-medium">{viewOpp.probability.toLocaleString('fa-IR')}%</span></div>
                <div><span className="text-slate-400">مرحله:</span> <span className="font-medium">{SALES_STAGES.find((s) => s.key === viewOpp.stage)?.label || viewOpp.stage}</span></div>
              </div>
              {viewOpp.description && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="text-slate-400 block mb-1">توضیحات:</span>{viewOpp.description}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ویرایش فرصت</DialogTitle></DialogHeader>
          {editOpp && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>عنوان *</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>مبلغ (تومان)</Label><Input dir="ltr" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} /></div>
                <div className="space-y-2"><Label>احتمال (%)</Label><Input dir="ltr" type="number" value={editForm.probability} onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>مرحله</Label>
                <Select value={editForm.stage} onValueChange={(v) => setEditForm({ ...editForm, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SALES_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>توضیحات</Label><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
              <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button><Button onClick={handleEditSave} disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
