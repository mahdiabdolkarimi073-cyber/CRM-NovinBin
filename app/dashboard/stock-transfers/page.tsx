'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowRightLeft, Plus, Truck, CheckCircle2, XCircle, Clock, Package,
  Warehouse, MapPin, Calendar, PackageCheck, AlertCircle,
} from 'lucide-react';
import { formatToman, formatJalali, relativeTime } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Transfer {
  id: string;
  number: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  qty: number;
  status: string;
  shippedBy: string | null;
  receivedBy: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'در انتظار',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <Clock className="w-3 h-3" />,
  },
  in_transit: {
    label: 'در حال انتقال',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Truck className="w-3 h-3" />,
  },
  received: {
    label: 'دریافت شد',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  cancelled: {
    label: 'لغو شده',
    className: 'bg-slate-200 text-slate-600 border-slate-300',
    icon: <XCircle className="w-3 h-3" />,
  },
};

export default function StockTransfersPage() {
  const { profile } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    qty: '1',
    notes: '',
  });

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [whs, prods, trans] = await Promise.all([
        fetchData('warehouses', { where: {} }),
        fetchData('products', { where: { active: true } }),
        fetchData('stock_transfers', { where: {}, orderBy: { createdAt: 'desc' } }),
      ]);
      setWarehouses(whs || []);
      setProducts(prods || []);
      setTransfers((trans || []) as Transfer[]);
    } catch (e: any) {
      toast.error('خطا در بارگذاری داده‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name || '—';
  const prodName = (id: string) => products.find((p) => p.id === id)?.name || 'محصول حذف شده';

  // ---- stats ----
  const stats = {
    total: transfers.length,
    pending: transfers.filter((t) => t.status === 'pending').length,
    inTransit: transfers.filter((t) => t.status === 'in_transit').length,
    received: transfers.filter((t) => t.status === 'received').length,
    cancelled: transfers.filter((t) => t.status === 'cancelled').length,
  };

  // ---- create ----
  const handleCreate = async () => {
    if (!form.productId) { toast.error('محصول را انتخاب کنید'); return; }
    if (!form.fromWarehouseId) { toast.error('انبار مبدأ را انتخاب کنید'); return; }
    if (!form.toWarehouseId) { toast.error('انبار مقصد را انتخاب کنید'); return; }
    if (form.fromWarehouseId === form.toWarehouseId) { toast.error('انبار مبدأ و مقصد نمی‌توانند یکسان باشند'); return; }
    const qty = Number(form.qty);
    if (!qty || qty <= 0) { toast.error('تعداد معتبر وارد کنید'); return; }
    if (!profile) return;
    setSubmitting(true);
    try {
      const number = `TR-${Date.now().toString().slice(-8)}`;
      await createData('stock_transfers', {
        number,
        productId: form.productId,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        qty,
        status: 'pending',
        notes: form.notes || null,
        createdBy: profile.id,
      });
      toast.success('انتقال با موفقیت ایجاد شد');
      setDialogOpen(false);
      setForm({ productId: '', fromWarehouseId: '', toWarehouseId: '', qty: '1', notes: '' });
      load();
    } catch (e: any) {
      toast.error(e.message || 'خطا در ایجاد انتقال');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- advance to in_transit ----
  const handleShip = async (t: Transfer) => {
    if (!profile?.id) return;
    try {
      await updateData('stock_transfers', { id: t.id }, {
        status: 'in_transit',
        shippedBy: profile.id,
        shippedAt: new Date().toISOString(),
      });
      toast.success('وضعیت به «در حال انتقال» تغییر یافت');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  // ---- advance to received ----
  const handleReceive = async (t: Transfer) => {
    if (!profile?.id) return;
    try {
      await updateData('stock_transfers', { id: t.id }, {
        status: 'received',
        receivedBy: profile.id,
        receivedAt: new Date().toISOString(),
      });
      toast.success('انتقال با موفقیت دریافت شد');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  // ---- cancel ----
  const handleCancel = async (t: Transfer) => {
    if (!confirm('این انتقال لغو شود؟')) return;
    try {
      await updateData('stock_transfers', { id: t.id }, { status: 'cancelled' });
      toast.success('انتقال لغو شد');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="انتقال بین انبارها"
        description="مدیریت انتقال کالا بین انبارهای سازمان"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4" /> انتقال جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-500" /> ایجاد انتقال بین انباری
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* product */}
                <div className="space-y-2">
                  <Label>محصول *</Label>
                  <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                    <SelectTrigger><SelectValue placeholder="انتخاب محصول..." /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ''} — موجودی: {p.stock.toLocaleString('fa-IR')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* from / to warehouses */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>انبار مبدأ *</Label>
                    <Select value={form.fromWarehouseId} onValueChange={(v) => setForm({ ...form, fromWarehouseId: v })}>
                      <SelectTrigger><SelectValue placeholder="مبدأ..." /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>انبار مقصد *</Label>
                    <Select value={form.toWarehouseId} onValueChange={(v) => setForm({ ...form, toWarehouseId: v })}>
                      <SelectTrigger><SelectValue placeholder="مقصد..." /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.fromWarehouseId && form.toWarehouseId && form.fromWarehouseId === form.toWarehouseId && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                    <AlertCircle className="w-4 h-4" /> انبار مبدأ و مقصد یکسان هستند
                  </div>
                )}

                {/* qty + notes */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>تعداد *</Label>
                    <Input type="number" dir="ltr" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>یادداشت</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="اختیاری..." />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting ? 'در حال ثبت...' : 'ثبت انتقال'}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'کل انتقال‌ها', value: stats.total, icon: <ArrowRightLeft className="w-4 h-4" />, color: 'text-slate-600', bg: 'bg-slate-100' },
          { label: 'در انتظار', value: stats.pending, icon: <Clock className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'در حال انتقال', value: stats.inTransit, icon: <Truck className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'دریافت شده', value: stats.received, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'لغو شده', value: stats.cancelled, icon: <XCircle className="w-4 h-4" />, color: 'text-slate-500', bg: 'bg-slate-100' },
        ].map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', s.bg, s.color)}>
                  {s.icon}
                </div>
                <span className="text-xs font-medium text-slate-500">{s.label}</span>
              </div>
              <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value.toLocaleString('fa-IR')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* transfers table */}
      <Card>
        <CardContent className="p-0">
          {transfers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <ArrowRightLeft className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">انتقالی ثبت نشده</p>
              <p className="text-sm text-slate-400 mt-1">برای شروع، اولین انتقال بین انباری را ایجاد کنید</p>
              <Button className="mt-4" size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4" /> انتقال جدید
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">شماره</TableHead>
                  <TableHead className="text-xs">محصول</TableHead>
                  <TableHead className="text-xs">مسیر</TableHead>
                  <TableHead className="text-xs text-center">تعداد</TableHead>
                  <TableHead className="text-xs">وضعیت</TableHead>
                  <TableHead className="text-xs">تاریخ</TableHead>
                  <TableHead className="text-xs text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={t.id} className="group hover:bg-slate-50/60 transition-colors">
                      <TableCell>
                        <span className="text-xs font-mono text-slate-500" dir="ltr">{t.number}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{prodName(t.productId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-600 font-medium">{whName(t.fromWarehouseId)}</span>
                          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-slate-600 font-medium">{whName(t.toWarehouseId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold text-slate-800 tabular-nums">{t.qty.toLocaleString('fa-IR')}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('border text-xs gap-1', cfg.className)}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-500">{formatJalali(t.createdAt)}</div>
                        <div className="text-[11px] text-slate-400">{relativeTime(t.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 justify-end">
                          {t.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleShip(t)}
                              >
                                <Truck className="w-3.5 h-3.5" /> ارسال
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-slate-500 hover:bg-slate-100"
                                onClick={() => handleCancel(t)}
                              >
                                <XCircle className="w-3.5 h-3.5" /> لغو
                              </Button>
                            </>
                          )}
                          {t.status === 'in_transit' && (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleReceive(t)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> دریافت
                            </Button>
                          )}
                          {t.status === 'received' && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> تکمیل شد
                            </span>
                          )}
                          {t.status === 'cancelled' && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
