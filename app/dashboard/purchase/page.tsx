'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Briefcase, Plus, Trash2, Truck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, relativeTime } from '@/lib/format';

const poStatusLabels: Record<string, string> = { draft: 'پیش‌نویس', approved: 'تأیید شده', ordered: 'سفارش داده شده', received: 'دریافت شده' };
const poStatusColors: Record<string, string> = { draft: '#64748b', approved: '#3b82f6', ordered: '#f59e0b', received: '#10b981' };

export default function PurchasePage() {
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [poDialog, setPoDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [poForm, setPoForm] = useState({ supplierId: '', notes: '' });

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [sups, pos, prods] = await Promise.all([
        fetchData('suppliers', { where: {}, orderBy: { name: 'asc' } }),
        fetchData('purchase_orders', { where: {}, orderBy: { createdAt: 'desc' }, include: { supplier: true } }),
        fetchData('products', { where: {}, orderBy: { name: 'asc' }, take: 100 }),
      ]);
      setSuppliers(sups);
      setOrders(pos);
      setProducts(prods);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createSupplier = async () => {
    if (!profile || !supplierForm.name) { toast.error('نام تأمین‌کننده را وارد کنید'); return; }
    try {
      await createData('suppliers', { ...supplierForm });
      toast.success('تأمین‌کننده ایجاد شد'); setSupplierDialog(false);
      setSupplierForm({ name: '', phone: '', email: '', address: '' }); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const createPO = async () => {
    if (!profile || !poForm.supplierId) { toast.error('تأمین‌کننده را انتخاب کنید'); return; }
    const poNum = 'PO-' + Date.now().toString().slice(-6);
    try {
      await createData('purchase_orders', {
        number: poNum,
        supplierId: poForm.supplierId,
        status: 'draft',
        notes: poForm.notes || null,
        createdBy: profile.id,
      });
      toast.success('سفارش خرید ایجاد شد'); setPoDialog(false);
      setPoForm({ supplierId: '', notes: '' }); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const updatePOStatus = async (id: string, status: string) => {
    await updateData('purchase_orders', { id }, { status });
    load();
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('حذف این تأمین‌کننده؟')) return;
    await deleteData('suppliers', { id });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <PageHeader title="خرید و تأمین" description="مدیریت تأمین‌کنندگان و سفارشات خرید" />

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers"><Truck className="w-4 h-4 ml-1" />تأمین‌کنندگان</TabsTrigger>
          <TabsTrigger value="orders"><Briefcase className="w-4 h-4 ml-1" />سفارشات خرید</TabsTrigger>
        </TabsList>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <div className="flex justify-end mb-3">
            <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> تأمین‌کننده جدید</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>افزودن تأمین‌کننده</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>نام *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>تلفن</Label><Input dir="ltr" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>ایمیل</Label><Input dir="ltr" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>آدرس</Label><Input value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setSupplierDialog(false)}>انصراف</Button><Button onClick={createSupplier}>افزودن</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {suppliers.length === 0 ? (
            <Card><EmptyState icon={<Truck className="w-8 h-8" />} title="تأمین‌کننده‌ای ثبت نشده" /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suppliers.map((s) => (
                <Card key={s.id} className="hover:shadow-md transition-smooth">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><Truck className="w-5 h-5" /></div>
                        <div><div className="font-semibold">{s.name}</div>{s.phone && <div className="text-xs text-slate-400" dir="ltr">{s.phone}</div>}</div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => deleteSupplier(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                    {s.email && <div className="text-sm text-slate-500" dir="ltr">{s.email}</div>}
                    {s.address && <div className="text-sm text-slate-500 mt-1">{s.address}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Purchase Orders */}
        <TabsContent value="orders">
          <div className="flex justify-end mb-3">
            <Dialog open={poDialog} onOpenChange={setPoDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> سفارش خرید</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>ایجاد سفارش خرید</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>تأمین‌کننده *</Label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={poForm.supplierId} onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}>
                      <option value="">انتخاب...</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>توضیحات</Label><Input value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} /></div>
                  <DialogFooter><Button type="button" variant="outline" onClick={() => setPoDialog(false)}>انصراف</Button><Button onClick={createPO}>ایجاد</Button></DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {orders.length === 0 ? (
            <Card><EmptyState icon={<Briefcase className="w-8 h-8" />} title="سفارش خرید ثبت نشده" /></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const color = poStatusColors[o.status] || '#64748b';
                    return (
                      <div key={o.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-smooth">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{o.number}</div>
                            <div className="text-xs text-slate-400">{o.supplier?.name} - {relativeTime(o.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {o.total > 0 && <span className="text-sm font-bold">{formatToman(o.total)} ت</span>}
                          <Badge style={{ backgroundColor: color + '20', color }}>{poStatusLabels[o.status]}</Badge>
                          {o.status === 'draft' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updatePOStatus(o.id, 'approved')}>تأیید</Button>}
                          {o.status === 'approved' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updatePOStatus(o.id, 'ordered')}>سفارش</Button>}
                          {o.status === 'ordered' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updatePOStatus(o.id, 'received')}><CheckCircle2 className="w-3 h-3" /> دریافت</Button>}
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
