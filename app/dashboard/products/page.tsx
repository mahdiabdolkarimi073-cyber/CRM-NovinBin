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
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Search, AlertTriangle, Eye } from 'lucide-react';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { formatToman } from '@/lib/format';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'product', sku: '', barcode: '', brand: '',
    price: '', stock: '', min_stock: '10', unit: 'عدد', description: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadProducts = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = isSuperAdmin ? {} : {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ];
      }
      const data = await fetchData('products', { where, orderBy: { createdAt: 'desc' } });
      setProducts((data as Product[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری محصولات ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, isSuperAdmin, search]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: 'product', sku: '', barcode: '', brand: '', price: '', stock: '', min_stock: '10', unit: 'عدد', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, type: p.type, sku: p.sku || '', barcode: p.barcode || '', brand: p.brand || '',
      price: String(Number(p.price)), stock: String(p.stock), min_stock: String(p.minStock), unit: p.unit || 'عدد', description: p.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.name) { toast.error('نام محصول را وارد کنید'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      type: form.type as 'product' | 'service',
      sku: form.sku || null,
      barcode: form.barcode || null,
      brand: form.brand || null,
      price: Number(form.price.replace(/[^0-9]/g, '')) || 0,
      stock: Number(form.stock) || 0,
      minStock: Number(form.min_stock) || 0,
      unit: form.unit,
      description: form.description || null,
    };
    try {
      if (editing) {
        await updateData('products', { id: editing.id }, payload);
        toast.success('محصول ویرایش شد');
      } else {
        await createData('products', payload);
        toast.success('محصول ایجاد شد');
      }
      setDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      toast.error('ذخیره ناموفق: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`حذف محصول «${p.name}»؟`)) return;
    try {
      await deleteData('products', { id: p.id });
      toast.success('محصول حذف شد');
      loadProducts();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="محصولات"
        description="مدیریت کالاها و خدمات"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> محصول جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? 'ویرایش محصول' : 'افزودن محصول جدید'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>نام *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">کالا</SelectItem>
                        <SelectItem value="service">خدمت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>کد (SKU)</Label>
                    <Input dir="ltr" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>برند</Label>
                    <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>واحد</Label>
                    <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>قیمت (ت)</Label>
                    <Input dir="ltr" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>موجودی</Label>
                    <Input dir="ltr" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>حداقل موجودی</Label>
                    <Input dir="ltr" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>توضیحات</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="جستجوی محصول..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 max-w-md" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="محصولی یافت نشد"
            description="اولین محصول خود را اضافه کنید"
            action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> افزودن محصول</Button>}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                    <th className="text-right p-3 font-medium">نام محصول</th>
                    <th className="text-right p-3 font-medium">نوع</th>
                    <th className="text-right p-3 font-medium">کد</th>
                    <th className="text-right p-3 font-medium">قیمت</th>
                    <th className="text-right p-3 font-medium">موجودی</th>
                    <th className="text-center p-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const lowStock = p.stock <= p.minStock;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-smooth">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                              <Package className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{p.name}</div>
                              {p.brand && <div className="text-xs text-slate-400">{p.brand}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3"><Badge variant="secondary" className="text-xs">{p.type === 'product' ? 'کالا' : 'خدمت'}</Badge></td>
                        <td className="p-3 text-slate-500" dir="ltr">{p.sku || '—'}</td>
                        <td className="p-3 font-medium">{formatToman(Number(p.price))} ت</td>
                        <td className="p-3">
                          <span className={`font-medium ${lowStock ? 'text-red-600' : 'text-slate-700'}`}>
                            {p.stock.toLocaleString('fa-IR')} {p.unit}
                          </span>
                          {lowStock && <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline mr-1" />}
                        </td>
                        <td className="p-3">
                          {isSuperAdmin ? (
                            <SuperAdminActions
                              variant="table"
                              onView={() => { setViewProduct(p); setViewDialogOpen(true); }}
                              onEdit={() => openEdit(p)}
                              onDelete={() => handleDelete(p)}
                            />
                          ) : (
                            <div className="flex items-center justify-center">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setViewProduct(p); setViewDialogOpen(true); }}>
                                <Eye className="w-4 h-4 text-sky-600" />
                              </Button>
                            </div>
                          )}
                        </td>
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
          <DialogHeader><DialogTitle>مشاهده محصول</DialogTitle></DialogHeader>
          {viewProduct && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{viewProduct.name}</div>
                  <Badge variant="secondary" className="text-xs mt-1">{viewProduct.type === 'product' ? 'کالا' : 'خدمت'}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewProduct.sku && <div><span className="text-slate-400">کد:</span> <span className="font-medium" dir="ltr">{viewProduct.sku}</span></div>}
                {viewProduct.brand && <div><span className="text-slate-400">برند:</span> <span className="font-medium">{viewProduct.brand}</span></div>}
                <div><span className="text-slate-400">قیمت:</span> <span className="font-bold">{formatToman(Number(viewProduct.price))} ت</span></div>
                <div><span className="text-slate-400">موجودی:</span> <span className="font-medium">{viewProduct.stock.toLocaleString('fa-IR')} {viewProduct.unit}</span></div>
                <div><span className="text-slate-400">حداقل موجودی:</span> <span className="font-medium">{viewProduct.minStock.toLocaleString('fa-IR')}</span></div>
                <div><span className="text-slate-400">واحد:</span> <span className="font-medium">{viewProduct.unit}</span></div>
              </div>
              {viewProduct.description && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">توضیحات:</span>
                  {viewProduct.description}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
