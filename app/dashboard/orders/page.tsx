'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { ShoppingCart, Plus, Search, X, Minus, Trash2 } from 'lucide-react';
import { formatToman } from '@/lib/format';
import { ORDER_STATUSES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Order, Customer, Product } from '@/lib/types';

const statusInfo = (key: string) => ORDER_STATUSES.find((s) => s.key === key) || ORDER_STATUSES[0];

export default function OrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = {};
      if (search) where.number = { contains: search, mode: 'insensitive' };
      const [orderData, custData, prodData] = await Promise.all([
        fetchData('orders', { where, orderBy: { createdAt: 'desc' } }),
        fetchData('customers', { where: {}, orderBy: { createdAt: 'desc' } }),
        fetchData('products', { where: { active: true }, orderBy: { name: 'asc' } }),
      ]);
      setOrders((orderData as Order[]) || []);
      setCustomers((custData as Customer[]) || []);
      setProducts((prodData as Product[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری سفارشات ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === p.id);
      if (existing) return prev.map((c) => c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.product.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.product.id !== id));

  const subtotal = cart.reduce((s, c) => s + Number(c.product.price) * c.qty, 0);
  const tax = cart.reduce((s, c) => s + Math.round(Number(c.product.price) * c.qty * c.product.taxRate / 100), 0);
  const total = subtotal + tax;

  const handleCreate = async () => {
    if (!profile) return;
    if (!selectedCustomer) { toast.error('مشتری را انتخاب کنید'); return; }
    if (cart.length === 0) { toast.error('حداقل یک محصول اضافه کنید'); return; }
    setCreating(true);
    const orderNum = 'ORD-' + Date.now().toString().slice(-6);
    try {
      const order = await createData('orders', {
        number: orderNum,
        customerId: selectedCustomer,
        status: 'registered',
        subtotal, tax, total,
        createdBy: profile.id,
      });
      for (const c of cart) {
        await createData('order_items', {
          orderId: order.id,
          productId: c.product.id,
          name: c.product.name,
          qty: c.qty,
          price: Number(c.product.price),
          discount: 0,
          total: Number(c.product.price) * c.qty,
        });
      }
      toast.success('سفارش ثبت شد');
      setDialogOpen(false);
      setSelectedCustomer('');
      setCart([]);
      loadData();
    } catch (error: any) {
      toast.error('ایجاد سفارش ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await updateData('orders', { id }, { status });
      loadData();
    } catch (error: any) {
      toast.error('تغییر وضعیت ناموفق: ' + error.message);
    }
  };

  const openView = (o: Order) => {
    setViewOrder(o);
    setViewDialogOpen(true);
  };

  const openEdit = (o: Order) => {
    setEditOrder(o);
    setEditStatus(o.status);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editOrder) return;
    try {
      await updateData('orders', { id: editOrder.id }, { status: editStatus });
      toast.success('سفارش ویرایش شد');
      setEditDialogOpen(false);
      setEditOrder(null);
      loadData();
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    }
  };

  const handleDelete = async (o: Order) => {
    if (!confirm(`حذف سفارش «${o.number}»؟`)) return;
    try {
      await deleteData('orders', { id: o.id });
      toast.success('سفارش حذف شد');
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const getCustomerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find((c) => c.id === id);
    return c ? (c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)) : '—';
  };

  return (
    <div>
      <PageHeader
        title="سفارشات"
        description="مدیریت سفارشات مشتریان"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> سفارش جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>ثبت سفارش جدید</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>مشتری</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger><SelectValue placeholder="انتخاب مشتری..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>محصولات</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="text-right p-2 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-smooth"
                      >
                        <div className="text-xs font-medium text-slate-700 truncate">{p.name}</div>
                        <div className="text-xs text-sky-600 mt-1">{formatToman(Number(p.price))} ت</div>
                      </button>
                    ))}
                  </div>
                </div>
                {cart.length > 0 && (
                  <div className="space-y-2">
                    <Label>سبد سفارش</Label>
                    <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
                      {cart.map((c) => (
                        <div key={c.product.id} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{c.product.name}</div>
                            <div className="text-xs text-slate-400">{formatToman(Number(c.product.price))} × {c.qty.toLocaleString('fa-IR')}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(c.product.id, -1)}><Minus className="w-3 h-3" /></Button>
                            <span className="w-8 text-center text-sm">{c.qty.toLocaleString('fa-IR')}</span>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(c.product.id, 1)}><Plus className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-50" onClick={() => removeFromCart(c.product.id)}><X className="w-3 h-3 text-red-500" /></Button>
                          </div>
                          <div className="text-sm font-bold w-24 text-left">{formatToman(Number(c.product.price) * c.qty)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm pt-2">
                      <span className="text-slate-500">جمع کل:</span>
                      <span className="font-bold text-slate-900">{formatToman(total)} ت</span>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button onClick={handleCreate} disabled={creating}>{creating ? 'در حال ثبت...' : 'ثبت سفارش'}</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="جستجوی سفارش..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 max-w-md" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart className="w-8 h-8" />}
            title="سفارشی یافت نشد"
            description="اولین سفارش را ثبت کنید"
            action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> ثبت سفارش</Button>}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                    <th className="text-right p-3 font-medium">شماره</th>
                    <th className="text-right p-3 font-medium">مشتری</th>
                    <th className="text-right p-3 font-medium">مبلغ</th>
                    <th className="text-right p-3 font-medium">وضعیت</th>
                    <th className="text-center p-3 font-medium">تغییر وضعیت</th>
                    {isSuperAdmin && <th className="text-center p-3 font-medium">عملیات سوپرادمین</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const st = statusInfo(o.status);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-smooth">
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{o.number || o.id.slice(0, 8)}</div>
                        </td>
                        <td className="p-3 text-slate-600">{getCustomerName(o.customerId)}</td>
                        <td className="p-3 font-bold">{formatToman(Number(o.total))} ت</td>
                        <td className="p-3"><Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge></td>
                        <td className="p-3">
                          <div className="flex justify-center">
                            <Select value={o.status} onValueChange={(v) => updateOrderStatus(o.id, v)}>
                              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        {isSuperAdmin && (
                          <td className="p-3">
                            <SuperAdminActions
                              variant="table"
                              onView={() => openView(o)}
                              onEdit={() => openEdit(o)}
                              onDelete={() => handleDelete(o)}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده سفارش</DialogTitle></DialogHeader>
          {viewOrder && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900">{viewOrder.number || viewOrder.id.slice(0, 8)}</div>
                <Badge style={{ backgroundColor: statusInfo(viewOrder.status).color + '20', color: statusInfo(viewOrder.status).color }}>{statusInfo(viewOrder.status).label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">مشتری:</span> <span className="font-medium">{getCustomerName(viewOrder.customerId)}</span></div>
                <div><span className="text-slate-400">زیرمجموع:</span> <span className="font-medium">{formatToman(Number(viewOrder.subtotal))} ت</span></div>
                <div><span className="text-slate-400">مالیات:</span> <span className="font-medium">{formatToman(Number(viewOrder.tax))} ت</span></div>
                <div><span className="text-slate-400">مجموع:</span> <span className="font-bold">{formatToman(Number(viewOrder.total))} ت</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ویرایش سفارش</DialogTitle></DialogHeader>
          {editOrder && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">سفارش: <span className="font-bold text-slate-900">{editOrder.number || editOrder.id.slice(0, 8)}</span></div>
              <div className="space-y-2">
                <Label>وضعیت سفارش</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleEditSave}>ذخیره</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
