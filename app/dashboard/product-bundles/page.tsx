'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
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
  Boxes, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  Eye, FileText, Tag,
} from 'lucide-react';
import { formatJalali, formatToman, toEnglishDigits } from '@/lib/format';
import { toast } from 'sonner';
import type { ProductBundle, ProductBundleItem, Profile } from '@/lib/types';

export default function ProductBundlesPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<ProductBundle[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ProductBundle | null>(null);
  const [detailItems, setDetailItems] = useState<ProductBundleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<ProductBundle>('product_bundles', {
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
      setRecords(data || []);
    } catch (error: any) {
      toast.error('بارگذاری بسته‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return records.filter((r) => {
      const matches = !q || r.name?.toLocaleLowerCase().includes(q) || r.code?.toLocaleLowerCase().includes(q);
      return matches;
    });
  }, [records, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: records.length,
    active: records.filter((r) => r.active).length,
    totalValue: records.reduce((sum, r) => sum + Number(r.finalPrice || 0), 0),
  }), [records]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این بسته محصول؟')) return;
    try {
      await deleteData('product_bundles', { id });
      toast.success('بسته حذف شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const loadDetail = (b: ProductBundle) => {
    setDetail(b);
    setDetailItems(b.items || []);
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">بسته محصول فروش</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> بسته محصول</div>
        </div>
        <Link href="/dashboard/product-bundles/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت بسته
          </Button>
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-3">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Boxes className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل بسته‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><Tag className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.active.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">فعال</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#6366f1]/10 text-[#6366f1]"><FileText className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[20px] font-bold leading-none text-[#101828]">{formatToman(stats.totalValue)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">ارزش کل (تومان)</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس نام یا کد..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : records.length === 0 ? (
        <Card><EmptyState icon={<Boxes className="h-8 w-8" />} title="بسته‌ای یافت نشد" description="برای شروع، اولین بسته محصول را ثبت کنید" action={<Link href="/dashboard/product-bundles/new"><Button><Plus className="h-4 w-4" /> افزودن بسته</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((r) => (
              <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => loadDetail(r)}>
                <div className="h-10 w-2 rounded-full bg-[#3155E7]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-bold text-[#1D2939]">{r.name}</div>
                    {r.code && <Badge variant="outline" className="shrink-0 text-[10px] text-[#667085]">{r.code}</Badge>}
                    <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: r.active ? '#10b981' : '#94a3b8', borderColor: r.active ? '#10b98135' : '#94a3b835', backgroundColor: r.active ? '#10b98110' : '#94a3b810' }}>{r.active ? 'فعال' : 'غیرفعال'}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.createdAt)}</span>
                    <span>{(r.items || []).length} قلم</span>
                    <span>هزینه کل: {formatToman(Number(r.totalCost))}</span>
                    <span>قیمت نهایی: {formatToman(Number(r.finalPrice))}</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); loadDetail(r); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
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
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="text-lg">{detail.name}</DialogTitle>
                  {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {detail.code && <Badge variant="outline" className="text-[#667085]">{detail.code}</Badge>}
                  <Badge variant="outline" style={{ color: detail.active ? '#10b981' : '#94a3b8', borderColor: detail.active ? '#10b98135' : '#94a3b835', backgroundColor: detail.active ? '#10b98110' : '#94a3b810' }}>{detail.active ? 'فعال' : 'غیرفعال'}</Badge>
                </div>
                {detail.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.description}</p></div>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">هزینه کل</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatToman(Number(detail.totalCost))}</div></div>
                  <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">قیمت کل</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatToman(Number(detail.totalPrice))}</div></div>
                  <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">درصد تخفیف</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{toEnglishDigits(String(Number(detail.discountPct)))}٪</div></div>
                  <div className="rounded-[10px] bg-blue-50 p-3"><div className="text-xs text-[#667085]">قیمت نهایی</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(Number(detail.finalPrice))}</div></div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-bold text-[#1D2939]">اقلام ({detailItems.length})</h3>
                  {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">قلمی ثبت نشده است</p> : (
                    <div className="space-y-1.5">
                      {detailItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-700">{item.productName || '—'}</div>
                            <div className="mt-0.5 flex gap-3 text-slate-400">
                              <span>{formatToman(Number(item.qty))} {item.unit || ''}</span>
                              <span>قیمت واحد: {formatToman(Number(item.unitPrice))}</span>
                              <span>هزینه: {formatToman(Number(item.totalCost))}</span>
                              <span>قیمت کل: {formatToman(Number(item.totalPrice))}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
