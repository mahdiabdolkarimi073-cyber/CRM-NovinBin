'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ShoppingCart, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  Eye, User, TrendingUp, Clock, Package, CheckCircle, Pencil, X, Loader2,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { ORDER_STATUSES, fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { Order, OrderItem, Customer, Profile } from '@/lib/types';

const ORDER_STATUS_MAP: Record<string, string> = Object.fromEntries(
  ORDER_STATUSES.map((s) => [s.key, s.label])
);
const ORDER_STATUS_COLOR: Record<string, string> = Object.fromEntries(
  ORDER_STATUSES.map((s) => [s.key, s.color])
);

export default function OrdersPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderData, custData, staffData] = await Promise.all([
        fetchData<Order>('orders', {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        }),
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRecords(orderData || []);
      setCustomers(custData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری سفارشات ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const customerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find((c) => c.id === id);
    return c ? (c.companyName || fullName(c.firstName, c.lastName)) : '—';
  };

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return records.filter((r) => {
      const matches = !q || r.number?.toLocaleLowerCase().includes(q) || customerName(r.customerId)?.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus, customers]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: records.length,
    pending: records.filter((r) => r.status === 'registered' || r.status === 'paid').length,
    delivered: records.filter((r) => r.status === 'delivered').length,
    totalValue: records.filter((r) => r.status !== 'cancelled').reduce((sum, r) => sum + Number(r.total || 0), 0),
  }), [records]);

  const statsList = useMemo(() => [
    { label: 'کل سفارشات', value: stats.total.toLocaleString('fa-IR'), icon: ShoppingCart, filter: 'all', gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'در انتظار', value: stats.pending.toLocaleString('fa-IR'), icon: Clock, filter: 'registered', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
    { label: 'تحویل شده', value: stats.delivered.toLocaleString('fa-IR'), icon: CheckCircle, filter: 'delivered', gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
    { label: 'ارزش کل (تومان)', value: formatToman(stats.totalValue), icon: TrendingUp, filter: 'all', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', glow: 'rgba(99,102,241,0.25)' },
  ], [stats]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این سفارش؟')) return;
    try {
      await deleteData('orders', { id });
      toast.success('سفارش حذف شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateData('orders', { id }, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      toast.success('وضعیت تغییر کرد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadDetail = (o: Order) => {
    setDetail(o);
    setDetailItems(o.items || []);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری سفارشات...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>سفارشات</h1>
            </div>
            <p>مدیریت سفارشات مشتریان و پیگیری وضعیت آن‌ها</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/orders/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت سفارش
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {statsList.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" strokeWidth={2.5} />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه سفارشات</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس شماره یا مشتری..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {ORDER_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><ShoppingCart className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>سفارشی یافت نشد</h3>
          <p>برای شروع، اولین سفارش را ثبت کنید</p>
          <Link href="/dashboard/orders/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن سفارش</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شماره</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مشتری</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مبلغ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">اقلام</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pageItems.map((r) => {
                  const stColor = ORDER_STATUS_COLOR[r.status] || '#64748b';
                  return (
                    <tr key={r.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => loadDetail(r)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stColor }} />
                          <div className="font-medium text-slate-800 dark:text-slate-100">{r.number || r.id.slice(0, 8)}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge style={{ backgroundColor: `${stColor}15`, color: stColor }} className="rounded-full text-xs">{ORDER_STATUS_MAP[r.status] || r.status}</Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{customerName(r.customerId)}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.createdAt)}</span>
                      </td>
                      <td className="p-3 text-xs font-medium text-slate-700 dark:text-slate-300">{formatToman(Number(r.total))}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" />{(r.items || []).length} قلم</span>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => loadDetail(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></button>
                          {isSuperAdmin && <Link href={`/dashboard/orders/${r.id}/edit`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="ویرایش"><Pencil className="h-4 w-4" /></Link>}
                          {isSuperAdmin && <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="حذف"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-300 dark:text-slate-600">نتیجه‌ای یافت نشد</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">صفحه {currentPage.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={currentPage === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (() => {
            const stColor = ORDER_STATUS_COLOR[detail.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">سفارش {detail.number || detail.id.slice(0, 8)}</DialogTitle>
                    <div className="flex items-center gap-1">
                      {isSuperAdmin && <Link href={`/dashboard/orders/${detail.id}/edit`}><Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50"><Pencil className="h-4 w-4" /> ویرایش</Button></Link>}
                      {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{ORDER_STATUS_MAP[detail.status] || detail.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-sky-50 p-3"><div className="text-xs text-slate-500">شماره</div><div className="mt-1 text-sm font-bold text-sky-700">{detail.number || detail.id.slice(0, 8)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">مشتری</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{customerName(detail.customerId)}</div></div>
                    <div className="rounded-[10px] bg-green-50 p-3"><div className="text-xs text-slate-500">تاریخ</div><div className="mt-1 text-sm font-bold text-green-700">{formatJalali(detail.createdAt)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">ایجادکننده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{staffName(detail.createdBy)}</div></div>
                    <div className="rounded-[10px] bg-blue-50 p-3"><div className="text-xs text-slate-500">جمع کل</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(Number(detail.subtotal))}</div></div>
                    <div className="rounded-[10px] bg-amber-50 p-3"><div className="text-xs text-slate-500">مالیات</div><div className="mt-1 text-sm font-bold text-amber-700">{formatToman(Number(detail.tax))}</div></div>
                    <div className="rounded-[10px] bg-green-50 p-3"><div className="text-xs text-slate-500">مبلغ نهایی</div><div className="mt-1 text-sm font-bold text-green-700">{formatToman(Number(detail.total))}</div></div>
                  </div>
                  {detail.notes && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"><p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detail.notes}</p></div>}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">اقلام ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">قلمی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700 dark:text-slate-200">{item.name || '—'}</div>
                              <div className="mt-0.5 flex flex-wrap gap-3 text-slate-400">
                                <span>{formatToman(Number(item.qty))} عدد</span>
                                <span>قیمت واحد: {formatToman(Number(item.price))}</span>
                                {item.discount > 0 && <span>تخفیف: {formatToman(Number(item.discount))}</span>}
                                <span>مبلغ: {formatToman(Number(item.total))}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {isSuperAdmin && detail.status !== 'delivered' && detail.status !== 'cancelled' && (
                      <select
                        value={detail.status}
                        onChange={(e) => handleStatusChange(detail.id, e.target.value)}
                        className="h-[38px] rounded-[10px] border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {ORDER_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Link href="/dashboard/orders/new" className="nb-fab" aria-label="ثبت سفارش">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
