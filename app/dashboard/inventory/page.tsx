'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, Plus, Trash2, Package, ArrowDown, ArrowUp, AlertTriangle, Building2 } from 'lucide-react';
import { formatToman, formatJalali, relativeTime } from '@/lib/format';
import { toast } from 'sonner';

export default function InventoryPage() {
  const { profile } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', manager: '' });
  const [moveForm, setMoveForm] = useState({ productId: '', warehouseId: '', type: 'in', qty: '1', reason: '' });

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [whs, moves, prods] = await Promise.all([
      fetchData('warehouses', { where: {}, orderBy: { createdAt: 'desc' } }),
      fetchData('stock_movements', { where: {}, orderBy: { createdAt: 'desc' } }),
      fetchData('products', { where: {}, orderBy: { name: 'asc' } }),
    ]);
    setWarehouses(whs || []);
    setMovements(moves || []);
    setProducts(prods || []);
    setLowStock((prods || []).filter((p: any) => p.minStock > 0 && p.stock <= p.minStock));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateWh = async () => {
    if (!form.name) { toast.error('نام انبار را وارد کنید'); return; }
    if (!profile) return;
    try {
      await createData('warehouses', {
        name: form.name,
        address: form.address || null,
        manager: form.manager || null,
      });
      toast.success('انبار ایجاد شد');
      setDialogOpen(false);
      setForm({ name: '', address: '', manager: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteWh = async (id: string) => {
    if (!confirm('حذف این انبار؟')) return;
    try { await deleteData('warehouses', { id }); toast.success('حذف شد'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleRecordMove = async () => {
    if (!moveForm.productId || !moveForm.qty) { toast.error('محصول و تعداد را وارد کنید'); return; }
    if (!profile) return;
    try {
      await createData('stock_movements', {
        productId: moveForm.productId,
        warehouseId: moveForm.warehouseId || null,
        type: moveForm.type,
        qty: Number(moveForm.qty),
        reason: moveForm.reason || null,
        createdBy: profile.id,
      });
      toast.success('حركت انبار ثبت شد');
      setMoveDialogOpen(false);
      setMoveForm({ productId: '', warehouseId: '', type: 'in', qty: '1', reason: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  const moveTypeLabels: Record<string, string> = { in: 'ورود', out: 'خروج', transfer: 'انتقال', adjustment: 'تعدیل' };
  const moveTypeColors: Record<string, string> = { in: '#10b981', out: '#ef4444', transfer: '#3b82f6', adjustment: '#f59e0b' };

  return (
    <div>
      <PageHeader title="انبار و لجستیک" description="مدیریت انبارها، موجودی و حرکات کالا" />

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-amber-900">هشدار موجودی کم ({lowStock.length.toLocaleString('fa-IR')} محصول)</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {lowStock.slice(0, 8).map((p) => (
                <div key={p.id} className="p-2 rounded-lg bg-white border border-amber-200 text-sm">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-red-600">موجودی: {p.stock.toLocaleString('fa-IR')} از {p.minStock.toLocaleString('fa-IR')}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="warehouses">
        <TabsList>
          <TabsTrigger value="warehouses"><Building2 className="w-4 h-4 ml-1" />انبارها</TabsTrigger>
          <TabsTrigger value="movements"><Package className="w-4 h-4 ml-1" />حرکات انبار</TabsTrigger>
        </TabsList>

        <TabsContent value="warehouses">
          <div className="flex justify-end mb-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> انبار جدید</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>ایجاد انبار</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>نام انبار *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>آدرس</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  <div className="space-y-2"><Label>مدیر انبار</Label><Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button onClick={handleCreateWh}>ایجاد</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {warehouses.length === 0 ? (
            <Card><EmptyState icon={<Warehouse className="w-8 h-8" />} title="انباری تعریف نشده" description="اولین انبار خود را ایجاد کنید" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((w) => (
                <Card key={w.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><Warehouse className="w-5 h-5" /></div>
                        <div>
                          <div className="font-semibold text-slate-900">{w.name}</div>
                          {w.manager && <div className="text-xs text-slate-400">مدیر: {w.manager}</div>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDeleteWh(w.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                    {w.address && <div className="text-sm text-slate-500">{w.address}</div>}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Badge variant={w.active ? 'default' : 'secondary'} className="text-xs">{w.active ? 'فعال' : 'غیرفعال'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="movements">
          <div className="flex justify-end mb-3">
            <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> ثبت حرکت</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>ثبت حرکت انبار</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>محصول *</Label>
                    <Select value={moveForm.productId} onValueChange={(v) => setMoveForm({ ...moveForm, productId: v })}>
                      <SelectTrigger><SelectValue placeholder="انتخاب محصول..." /></SelectTrigger>
                      <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (موجودی: {p.stock.toLocaleString('fa-IR')})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>نوع حرکت</Label>
                      <Select value={moveForm.type} onValueChange={(v) => setMoveForm({ ...moveForm, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">ورود کالا</SelectItem>
                          <SelectItem value="out">خروج کالا</SelectItem>
                          <SelectItem value="adjustment">تعدیل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>تعداد</Label><Input type="number" dir="ltr" value={moveForm.qty} onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>دلیل</Label><Input value={moveForm.reason} onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setMoveDialogOpen(false)}>انصراف</Button><Button onClick={handleRecordMove}>ثبت</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {movements.length === 0 ? (
            <Card><EmptyState icon={<Package className="w-8 h-8" />} title="حرکتی ثبت نشده" description="حرکات ورود و خروج کالا را ثبت کنید" /></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {movements.map((m) => {
                    const prod = products.find((p) => p.id === m.productId);
                    const color = moveTypeColors[m.type] || '#64748b';
                    return (
                      <div key={m.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-smooth">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ backgroundColor: color + '20', color }}>
                            {m.type === 'in' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{prod?.name || 'محصول حذف شده'}</div>
                            <div className="text-xs text-slate-400">{m.reason || moveTypeLabels[m.type]} - {relativeTime(m.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold ${m.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {m.type === 'in' ? '+' : '−'}{m.qty.toLocaleString('fa-IR')}
                          </span>
                          <Badge style={{ backgroundColor: color + '20', color }}>{moveTypeLabels[m.type]}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
