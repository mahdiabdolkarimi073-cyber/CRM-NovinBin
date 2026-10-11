'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse, Plus, Trash2, Package, ArrowDown, ArrowUp, AlertTriangle, Building2, Loader2, X, Search } from 'lucide-react';
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
  const [whSearch, setWhSearch] = useState('');
  const [moveSearch, setMoveSearch] = useState('');

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

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری انبار...</p>
        </div>
      </div>
    );
  }

  const moveTypeLabels: Record<string, string> = { in: 'ورود', out: 'خروج', transfer: 'انتقال', adjustment: 'تعدیل' };
  const moveTypeColors: Record<string, string> = { in: '#10b981', out: '#ef4444', transfer: '#3b82f6', adjustment: '#f59e0b' };

  const filteredWh = warehouses.filter((w) => {
    const q = whSearch.trim().toLocaleLowerCase();
    return !q || w.name?.toLocaleLowerCase().includes(q) || w.manager?.toLocaleLowerCase().includes(q);
  });

  const filteredMoves = movements.filter((m) => {
    const q = moveSearch.trim().toLocaleLowerCase();
    if (!q) return true;
    const prod = products.find((p) => p.id === m.productId);
    return prod?.name?.toLocaleLowerCase().includes(q) || m.reason?.toLocaleLowerCase().includes(q);
  });

  const whStats = [
    { label: 'کل انبارها', value: warehouses.length, icon: Building2, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'حرکات انبار', value: movements.length, icon: Package, gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', glow: 'rgba(99,102,241,0.25)' },
    { label: 'محصولات کم موجود', value: lowStock.length, icon: AlertTriangle, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
    { label: 'کل محصولات', value: products.length, icon: Package, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
  ];

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>انبار و لجستیک</h1>
            </div>
            <p>مدیریت انبارها، موجودی و حرکات کالا</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="nb-new-btn">
                <Plus className="h-[18px] w-[18px]" />
                انبار جدید
              </button>
            </DialogTrigger>
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
      </header>

      <section className="nb-stats-grid-v2">
        {whStats.map((stat) => (
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

      {lowStock.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/50 dark:bg-amber-900/10">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-bold text-amber-900 dark:text-amber-400">هشدار موجودی کم ({lowStock.length.toLocaleString('fa-IR')} محصول)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {lowStock.slice(0, 8).map((p) => (
              <div key={p.id} className="rounded-lg border border-amber-200 bg-white p-2 text-sm dark:border-amber-800/50 dark:bg-slate-800">
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-xs text-red-600 dark:text-red-400">موجودی: {p.stock.toLocaleString('fa-IR')} از {p.minStock.toLocaleString('fa-IR')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="warehouses">
        <TabsList className="mb-4">
          <TabsTrigger value="warehouses"><Building2 className="w-4 h-4 ml-1" />انبارها</TabsTrigger>
          <TabsTrigger value="movements"><Package className="w-4 h-4 ml-1" />حرکات انبار</TabsTrigger>
        </TabsList>

        <TabsContent value="warehouses">
          {warehouses.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><Warehouse className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>انباری تعریف نشده</h3>
              <p>اولین انبار خود را ایجاد کنید</p>
              <button className="nb-empty-new-btn" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> افزودن انبار</button>
            </div>
          ) : (
            <>
              <div className="nb-toolbar">
                <div className="nb-toolbar-left">
                  <h2>همه انبارها</h2>
                  <span className="nb-count-badge">{filteredWh.length.toLocaleString('fa-IR')} مورد</span>
                </div>
                <div className="nb-toolbar-right">
                  <div className="nb-search-box">
                    <Search className="h-4 w-4" />
                    <input value={whSearch} onChange={(e) => setWhSearch(e.target.value)} placeholder="جستجوی انبار..." />
                    {whSearch && <button onClick={() => setWhSearch('')}><X className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredWh.map((w) => (
                  <div key={w.id} className="nb-card" style={{ minHeight: 'auto' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400"><Warehouse className="h-5 w-5" /></div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{w.name}</div>
                          {w.manager && <div className="text-xs text-slate-400 dark:text-slate-500">مدیر: {w.manager}</div>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteWh(w.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {w.address && <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{w.address}</div>}
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
                      <Badge variant={w.active ? 'default' : 'secondary'} className="text-xs">{w.active ? 'فعال' : 'غیرفعال'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="movements">
          {movements.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><Package className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>حرکتی ثبت نشده</h3>
              <p>حرکات ورود و خروج کالا را ثبت کنید</p>
              <button className="nb-empty-new-btn" onClick={() => setMoveDialogOpen(true)}><Plus className="h-4 w-4" /> ثبت حرکت</button>
            </div>
          ) : (
            <>
              <div className="nb-toolbar">
                <div className="nb-toolbar-left">
                  <h2>همه حرکات</h2>
                  <span className="nb-count-badge">{filteredMoves.length.toLocaleString('fa-IR')} مورد</span>
                </div>
                <div className="nb-toolbar-right">
                  <div className="nb-search-box">
                    <Search className="h-4 w-4" />
                    <input value={moveSearch} onChange={(e) => setMoveSearch(e.target.value)} placeholder="جستجوی حرکت..." />
                    {moveSearch && <button onClick={() => setMoveSearch('')}><X className="h-3.5 w-3.5" /></button>}
                  </div>
                  <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
                    <DialogTrigger asChild>
                      <button className="nb-new-btn">
                        <Plus className="h-[18px] w-[18px]" />
                        ثبت حرکت
                      </button>
                    </DialogTrigger>
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
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredMoves.map((m) => {
                    const prod = products.find((p) => p.id === m.productId);
                    const color = moveTypeColors[m.type] || '#64748b';
                    return (
                      <div key={m.id} className="flex cursor-default items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: color + '20', color }}>
                            {m.type === 'in' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{prod?.name || 'محصول حذف شده'}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">{m.reason || moveTypeLabels[m.type]} • {relativeTime(m.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold ${m.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {m.type === 'in' ? '+' : '−'}{m.qty.toLocaleString('fa-IR')}
                          </span>
                          <Badge style={{ backgroundColor: color + '20', color }}>{moveTypeLabels[m.type]}</Badge>
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
