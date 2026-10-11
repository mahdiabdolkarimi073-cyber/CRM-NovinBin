'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Briefcase, Plus, Trash2, Truck, CheckCircle2, Loader2, Search, X } from 'lucide-react';
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
  const [supplierSearch, setSupplierSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

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

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  const filteredSuppliers = suppliers.filter((s) => {
    const q = supplierSearch.trim().toLocaleLowerCase();
    return !q || s.name?.toLocaleLowerCase().includes(q) || s.phone?.includes(q);
  });

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.trim().toLocaleLowerCase();
    return !q || o.number?.toLocaleLowerCase().includes(q) || o.supplier?.name?.toLocaleLowerCase().includes(q);
  });

  const purchaseStats = [
    { label: 'تأمین‌کنندگان', value: suppliers.length, icon: Truck, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'سفارشات خرید', value: orders.length, icon: Briefcase, gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', glow: 'rgba(99,102,241,0.25)' },
    { label: 'پیش‌نویس', value: orders.filter((o) => o.status === 'draft').length, icon: Briefcase, gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', glow: 'rgba(148,163,184,0.25)' },
    { label: 'دریافت شده', value: orders.filter((o) => o.status === 'received').length, icon: CheckCircle2, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
  ];

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>خرید و تأمین</h1>
            </div>
            <p>مدیریت تأمین‌کنندگان و سفارشات خرید</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
            <DialogTrigger asChild>
              <button className="nb-new-btn">
                <Plus className="h-[18px] w-[18px]" />
                تأمین‌کننده جدید
              </button>
            </DialogTrigger>
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
      </header>

      <section className="nb-stats-grid-v2">
        {purchaseStats.map((stat) => (
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

      <Tabs defaultValue="suppliers">
        <TabsList className="mb-4">
          <TabsTrigger value="suppliers"><Truck className="w-4 h-4 ml-1" />تأمین‌کنندگان</TabsTrigger>
          <TabsTrigger value="orders"><Briefcase className="w-4 h-4 ml-1" />سفارشات خرید</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          {suppliers.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><Truck className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>تأمین‌کننده‌ای ثبت نشده</h3>
              <p>اولین تأمین‌کننده خود را اضافه کنید</p>
              <button className="nb-empty-new-btn" onClick={() => setSupplierDialog(true)}><Plus className="h-4 w-4" /> افزودن تأمین‌کننده</button>
            </div>
          ) : (
            <>
              <div className="nb-toolbar">
                <div className="nb-toolbar-left">
                  <h2>همه تأمین‌کنندگان</h2>
                  <span className="nb-count-badge">{filteredSuppliers.length.toLocaleString('fa-IR')} مورد</span>
                </div>
                <div className="nb-toolbar-right">
                  <div className="nb-search-box">
                    <Search className="h-4 w-4" />
                    <input value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="جستجوی تأمین‌کننده..." />
                    {supplierSearch && <button onClick={() => setSupplierSearch('')}><X className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSuppliers.map((s) => (
                  <div key={s.id} className="nb-card" style={{ minHeight: 'auto' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400"><Truck className="h-5 w-5" /></div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{s.name}</div>
                          {s.phone && <div className="text-xs text-slate-400 dark:text-slate-500" dir="ltr">{s.phone}</div>}
                        </div>
                      </div>
                      <button onClick={() => deleteSupplier(s.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {s.email && <div className="mt-2 text-sm text-slate-500 dark:text-slate-400" dir="ltr">{s.email}</div>}
                    {s.address && <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.address}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><Briefcase className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>سفارش خرید ثبت نشده</h3>
              <p>اولین سفارش خرید را ایجاد کنید</p>
              <button className="nb-empty-new-btn" onClick={() => setPoDialog(true)}><Plus className="h-4 w-4" /> سفارش خرید</button>
            </div>
          ) : (
            <>
              <div className="nb-toolbar">
                <div className="nb-toolbar-left">
                  <h2>همه سفارشات</h2>
                  <span className="nb-count-badge">{filteredOrders.length.toLocaleString('fa-IR')} مورد</span>
                </div>
                <div className="nb-toolbar-right">
                  <div className="nb-search-box">
                    <Search className="h-4 w-4" />
                    <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="جستجوی سفارش..." />
                    {orderSearch && <button onClick={() => setOrderSearch('')}><X className="h-3.5 w-3.5" /></button>}
                  </div>
                  <Dialog open={poDialog} onOpenChange={setPoDialog}>
                    <DialogTrigger asChild>
                      <button className="nb-new-btn">
                        <Plus className="h-[18px] w-[18px]" />
                        سفارش خرید
                      </button>
                    </DialogTrigger>
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
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredOrders.map((o) => {
                    const color = poStatusColors[o.status] || '#64748b';
                    return (
                      <div key={o.id} className="flex cursor-default items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: color + '20', color }}>
                            <Briefcase className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{o.number}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">{o.supplier?.name} • {relativeTime(o.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {o.total > 0 && <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatToman(o.total)} ت</span>}
                          <Badge style={{ backgroundColor: color + '20', color }}>{poStatusLabels[o.status]}</Badge>
                          {o.status === 'draft' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updatePOStatus(o.id, 'approved')}>تأیید</Button>}
                          {o.status === 'approved' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updatePOStatus(o.id, 'ordered')}>سفارش</Button>}
                          {o.status === 'ordered' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updatePOStatus(o.id, 'received')}><CheckCircle2 className="w-3 h-3" /> دریافت</Button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
