'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowRightLeft, Plus, Truck, CheckCircle2, XCircle, Clock, Package,
  Loader2, Search, X,
} from 'lucide-react';
import Link from 'next/link';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'در انتظار', color: '#f59e0b', icon: <Clock className="w-3 h-3" /> },
  in_transit: { label: 'در حال انتقال', color: '#2563EB', icon: <Truck className="w-3 h-3" /> },
  received: { label: 'دریافت شد', color: '#22C55E', icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled: { label: 'لغو شده', color: '#94a3b8', icon: <XCircle className="w-3 h-3" /> },
};

export default function StockTransfersPage() {
  const { profile } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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

  const stats = {
    total: transfers.length,
    pending: transfers.filter((t) => t.status === 'pending').length,
    inTransit: transfers.filter((t) => t.status === 'in_transit').length,
    received: transfers.filter((t) => t.status === 'received').length,
    cancelled: transfers.filter((t) => t.status === 'cancelled').length,
  };

  const filtered = transfers.filter((t) => {
    const q = search.trim().toLocaleLowerCase();
    const matchesQuery = !q || t.number?.toLocaleLowerCase().includes(q) || prodName(t.productId).toLocaleLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesQuery && matchesStatus;
  });

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
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری انتقال‌ها...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'کل انتقال‌ها', value: stats.total, icon: ArrowRightLeft, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'در انتظار', value: stats.pending, icon: Clock, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
    { label: 'در حال انتقال', value: stats.inTransit, icon: Truck, gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', glow: 'rgba(99,102,241,0.25)' },
    { label: 'دریافت شده', value: stats.received, icon: CheckCircle2, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
    { label: 'لغو شده', value: stats.cancelled, icon: XCircle, gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', glow: 'rgba(148,163,184,0.25)' },
  ];

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)', boxShadow: '0 0 12px rgba(37,99,235,.25)' }} />
              <h1>انتقال بین انبارها</h1>
            </div>
            <p>مدیریت انتقال کالا بین انبارهای سازمان</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/stock-transfers/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            انتقال جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {statCards.map((stat) => (
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

      {transfers.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><ArrowRightLeft className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>انتقالی ثبت نشده</h3>
          <p>برای شروع، اولین انتقال بین انباری را ایجاد کنید</p>
          <Link href="/dashboard/stock-transfers/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> انتقال جدید</Link>
        </div>
      ) : (
        <>
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>همه انتقال‌ها</h2>
              <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
            </div>
            <div className="nb-toolbar-right">
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی انتقال..." />
                {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
              </div>
              <select className="nb-select-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">همه وضعیت‌ها</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                  <tr>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شماره</th>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">محصول</th>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مسیر</th>
                    <th className="p-3 text-center font-medium text-slate-500 dark:text-slate-400">تعداد</th>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                    <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                    <th className="p-3 text-left font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map((t) => {
                    const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={t.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-3">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400" dir="ltr">{t.number}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                              <Package className="h-4 w-4" />
                            </div>
                            <span className="max-w-[160px] truncate text-sm font-medium text-slate-700 dark:text-slate-200">{prodName(t.productId)}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium text-slate-600 dark:text-slate-300">{whName(t.fromWarehouseId)}</span>
                            <ArrowRightLeft className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                            <span className="font-medium text-slate-600 dark:text-slate-300">{whName(t.toWarehouseId)}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{t.qty.toLocaleString('fa-IR')}</span>
                        </td>
                        <td className="p-3">
                          <Badge className="border text-xs" style={{ backgroundColor: cfg.color + '15', color: cfg.color, borderColor: cfg.color + '35' }}>
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-xs text-slate-500 dark:text-slate-400">{formatJalali(t.createdAt)}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">{relativeTime(t.createdAt)}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20" onClick={() => handleShip(t)}>
                                  <Truck className="w-3.5 h-3.5" /> ارسال
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => handleCancel(t)}>
                                  <XCircle className="w-3.5 h-3.5" /> لغو
                                </Button>
                              </>
                            )}
                            {t.status === 'in_transit' && (
                              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReceive(t)}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> دریافت
                              </Button>
                            )}
                            {t.status === 'received' && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> تکمیل شد
                              </span>
                            )}
                            {t.status === 'cancelled' && (
                              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                            )}
                          </div>
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

      <Link href="/dashboard/stock-transfers/new" className="nb-fab" aria-label="انتقال جدید">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
