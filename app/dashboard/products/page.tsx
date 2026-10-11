'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Search, AlertTriangle, Eye, Loader2, X } from 'lucide-react';
import Link from 'next/link';
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

  const productStats = [
    { label: 'کل محصولات', value: products.length, icon: Package, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'کالاها', value: products.filter((p) => p.type === 'product').length, icon: Package, gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', glow: 'rgba(99,102,241,0.25)' },
    { label: 'خدمات', value: products.filter((p) => p.type === 'service').length, icon: Package, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
    { label: 'موجودی کم', value: products.filter((p) => p.stock <= p.minStock).length, icon: AlertTriangle, gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', glow: 'rgba(239,68,68,0.25)' },
  ];

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری محصولات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>محصولات و خدمات</h1>
            </div>
            <p>مدیریت کالاها و خدمات</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/products/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            محصول جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {productStats.map((stat) => (
          <div className="nb-stat-card-v2" key={stat.label} style={{ '--stat-glow': stat.glow } as React.CSSProperties}>
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" strokeWidth={2.5} />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </div>
        ))}
      </section>

      {products.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Package className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>محصولی یافت نشد</h3>
          <p>اولین محصول خود را اضافه کنید</p>
          <Link href="/dashboard/products/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن محصول</Link>
        </div>
      ) : (
        <>
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>همه محصولات</h2>
              <span className="nb-count-badge">{products.length.toLocaleString('fa-IR')} مورد</span>
            </div>
            <div className="nb-toolbar-right">
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی محصول..." />
                {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                  <tr>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام محصول</th>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نوع</th>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">کد</th>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">قیمت</th>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">موجودی</th>
                    <th className="p-3 text-center font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {products.map((p) => {
                    const lowStock = p.stock <= p.minStock;
                    return (
                      <tr key={p.id} className="cursor-default transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
                              <Package className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-800 dark:text-slate-100">{p.name}</div>
                              {p.brand && <div className="text-xs text-slate-400 dark:text-slate-500">{p.brand}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3"><Badge variant="secondary" className="text-xs">{p.type === 'product' ? 'کالا' : 'خدمت'}</Badge></td>
                        <td className="p-3 text-slate-500 dark:text-slate-400" dir="ltr">{p.sku || '—'}</td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{formatToman(Number(p.price))} ت</td>
                        <td className="p-3">
                          <span className={`font-medium ${lowStock ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {p.stock.toLocaleString('fa-IR')} {p.unit}
                          </span>
                          {lowStock && <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-red-500" />}
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
                                <Eye className="h-4 w-4 text-sky-600" />
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
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'ویرایش محصول' : 'محصول جدید'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2"><Label>نام *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>نوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">کالا</SelectItem>
                    <SelectItem value="service">خدمت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>کد محصول</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>بارکد</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
              <div className="space-y-2"><Label>برند</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>قیمت (تومان)</Label><Input type="number" dir="ltr" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div className="space-y-2"><Label>واحد</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>موجودی</Label><Input type="number" dir="ltr" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>حداقل موجودی</Label><Input type="number" dir="ltr" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>توضیحات</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button type="submit" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده محصول</DialogTitle></DialogHeader>
          {viewProduct && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{viewProduct.name}</div>
                  <Badge variant="secondary" className="mt-1 text-xs">{viewProduct.type === 'product' ? 'کالا' : 'خدمت'}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewProduct.sku && <div><span className="text-slate-400 dark:text-slate-500">کد:</span> <span className="font-medium" dir="ltr">{viewProduct.sku}</span></div>}
                {viewProduct.brand && <div><span className="text-slate-400 dark:text-slate-500">برند:</span> <span className="font-medium">{viewProduct.brand}</span></div>}
                <div><span className="text-slate-400 dark:text-slate-500">قیمت:</span> <span className="font-bold">{formatToman(Number(viewProduct.price))} ت</span></div>
                <div><span className="text-slate-400 dark:text-slate-500">موجودی:</span> <span className="font-medium">{viewProduct.stock.toLocaleString('fa-IR')} {viewProduct.unit}</span></div>
                <div><span className="text-slate-400 dark:text-slate-500">حداقل موجودی:</span> <span className="font-medium">{viewProduct.minStock.toLocaleString('fa-IR')}</span></div>
                <div><span className="text-slate-400 dark:text-slate-500">واحد:</span> <span className="font-medium">{viewProduct.unit}</span></div>
              </div>
              {viewProduct.description && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                  <span className="mb-1 block text-slate-400 dark:text-slate-500">توضیحات:</span>
                  {viewProduct.description}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Link href="/dashboard/products/new" className="nb-fab" aria-label="محصول جدید">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
