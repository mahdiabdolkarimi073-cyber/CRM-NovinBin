'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ShoppingCart, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  Eye, User, TrendingUp, Clock, Package, CheckCircle,
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

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">سفارشات</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> سفارشات</div>
        </div>
        <Link href="/dashboard/orders/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت سفارش
          </Button>
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><ShoppingCart className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل سفارشات</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">در انتظار</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.delivered.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">تحویل شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#6366f1]/10 text-[#6366f1]"><TrendingUp className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[20px] font-bold leading-none text-[#101828]">{formatToman(stats.totalValue)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">ارزش کل (تومان)</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره یا مشتری..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه وضعیت‌ها</option>
          {ORDER_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : records.length === 0 ? (
        <Card><EmptyState icon={<ShoppingCart className="h-8 w-8" />} title="سفارشی یافت نشد" description="برای شروع، اولین سفارش را ثبت کنید" action={<Link href="/dashboard/orders/new"><Button><Plus className="h-4 w-4" /> افزودن سفارش</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((r) => {
              const stColor = ORDER_STATUS_COLOR[r.status] || '#64748b';
              return (
                <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => loadDetail(r)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{r.number || r.id.slice(0, 8)}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{ORDER_STATUS_MAP[r.status] || r.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{customerName(r.customerId)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.createdAt)}</span>
                      <span>{formatToman(Number(r.total))} تومان</span>
                      {(r.items || []).length > 0 && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{(r.items || []).length} قلم</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); loadDetail(r); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && <Link href={`/dashboard/orders/${r.id}/edit`} onClick={(e) => e.stopPropagation()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Package className="h-4 w-4" /></Link>}
                  {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              );
            })}
            {pageItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
              <span className="text-xs text-[#667085]">صفحه {currentPage.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={currentPage === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </CardContent></Card>
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
                      {isSuperAdmin && <Link href={`/dashboard/orders/${detail.id}/edit`}><Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50"><Package className="h-4 w-4" /> ویرایش</Button></Link>}
                      {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{ORDER_STATUS_MAP[detail.status] || detail.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">شماره</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{detail.number || detail.id.slice(0, 8)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">مشتری</div><div className="mt-1 text-sm font-bold text-[#344054]">{customerName(detail.customerId)}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatJalali(detail.createdAt)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">ایجادکننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detail.createdBy)}</div></div>
                    <div className="rounded-[10px] bg-blue-50 p-3"><div className="text-xs text-[#667085]">جمع کل</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(Number(detail.subtotal))}</div></div>
                    <div className="rounded-[10px] bg-amber-50 p-3"><div className="text-xs text-[#667085]">مالیات</div><div className="mt-1 text-sm font-bold text-amber-700">{formatToman(Number(detail.tax))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">مبلغ نهایی</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatToman(Number(detail.total))}</div></div>
                  </div>
                  {detail.notes && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.notes}</p></div>}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[#1D2939]">اقلام ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">قلمی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700">{item.name || '—'}</div>
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

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {isSuperAdmin && detail.status !== 'delivered' && detail.status !== 'cancelled' && (
                      <select
                        value={detail.status}
                        onChange={(e) => handleStatusChange(detail.id, e.target.value)}
                        className="h-[38px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]"
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
    </div>
  );
}
