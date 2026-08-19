'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CostCenter } from '@/lib/types';

interface CostCentersTabProps {
  costCenters: CostCenter[];
  loading: boolean;
  onCreate: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CostCentersTab({ costCenters, loading, onCreate, onDelete }: CostCentersTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', parentId: '' });

  const handleCreate = async () => {
    if (!form.code || !form.name) { toast.error('کد و نام مرکز هزینه الزامی است'); return; }
    await onCreate({
      code: form.code,
      name: form.name,
      parentId: form.parentId || null,
    });
    setDialogOpen(false);
    setForm({ code: '', name: '', parentId: '' });
  };

  const rootCenters = costCenters.filter((c) => !c.parentId);
  const getChildren = (parentId: string) => costCenters.filter((c) => c.parentId === parentId);

  const renderCenter = (cc: CostCenter, level: number = 0): { cc: CostCenter; level: number }[] => {
    const children = getChildren(cc.id);
    return [{ cc, level }, ...children.flatMap((child) => renderCenter(child, level + 1))];
  };

  const flatList = rootCenters.flatMap((root) => renderCenter(root));

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> مرکز هزینه جدید</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>ایجاد مرکز هزینه</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>کد *</Label><Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div className="space-y-2"><Label>نام *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>مرکز هزینه والد</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="بدون والد" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون والد (اصلی)</SelectItem>
                    {costCenters.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button onClick={handleCreate}>ایجاد</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>
      ) : costCenters.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-400"><Building2 className="w-8 h-8 mx-auto mb-2" /><div>مرکز هزینه‌ای تعریف نشده</div></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50 text-slate-500 text-xs">
                <th className="text-right p-3 font-medium">کد</th>
                <th className="text-right p-3 font-medium">نام</th>
                <th className="text-center p-3 font-medium">عملیات</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {flatList.map(({ cc, level }) => (
                  <tr key={cc.id} className="hover:bg-slate-50 transition-smooth">
                    <td className="p-3 font-mono text-slate-500" dir="ltr" style={{ paddingRight: `${level * 20 + 12}px` }}>{cc.code}</td>
                    <td className="p-3 font-medium">
                      <span className={level > 0 ? 'text-slate-600' : ''}>{cc.name}</span>
                      {!cc.active && <Badge variant="secondary" className="text-xs mr-2">غیرفعال</Badge>}
                    </td>
                    <td className="p-3 text-center">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => onDelete(cc.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
