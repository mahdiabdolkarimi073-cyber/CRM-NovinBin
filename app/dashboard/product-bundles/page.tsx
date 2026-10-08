'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Boxes, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  Eye, FileText, Tag, X, Loader2, Pencil,
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
  const [filterActive, setFilterActive] = useState(false);

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
      if (filterActive && !r.active) return false;
      return matches;
    });
  }, [records, search, filterActive]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => [
    {
      label: 'کل بسته‌ها', value: records.length.toLocaleString('fa-IR'), icon: Boxes, filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'فعال', value: records.filter((r) => r.active).length.toLocaleString('fa-IR'), icon: Tag, filter: 'active',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'ارزش کل (تومان)', value: formatToman(records.reduce((sum, r) => sum + Number(r.finalPrice || 0), 0)), icon: FileText, filter: 'all',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      glow: 'rgba(99,102,241,0.25)',
    },
  ], [records]);

  const handleStatClick = (f: string) => {
    if (f === 'all') { setFilterActive(false); return; }
    if (f === 'active') { setFilterActive((v) => !v); }
  };

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

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری بسته‌ها...</p>
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
              <h1>بسته محصول فروش</h1>
            </div>
            <p>مدیریت بسته‌های محصول، قیمت‌گذاری و تخفیفات</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/product-bundles/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت بسته
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${(stat.filter === 'active' && filterActive) || (stat.filter === 'all' && !filterActive) ? 'is-active' : ''}`}
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
          <h2>همه بسته‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام یا کد..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Boxes className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>بسته‌ای یافت نشد</h3>
          <p>برای شروع، اولین بسته محصول را ثبت کنید</p>
          <Link href="/dashboard/product-bundles/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن بسته</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نام بسته</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">اقلام</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">هزینه کل</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">قیمت نهایی</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pageItems.map((r) => (
                  <tr key={r.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => loadDetail(r)}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{r.name}</div>
                        {r.code && <Badge variant="outline" className="shrink-0 text-[10px] text-slate-500">{r.code}</Badge>}
                        <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: r.active ? '#10b981' : '#94a3b8', borderColor: r.active ? '#10b98135' : '#94a3b835', backgroundColor: r.active ? '#10b98110' : '#94a3b810' }}>{r.active ? 'فعال' : 'غیرفعال'}</Badge>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.createdAt)}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{(r.items || []).length} قلم</td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatToman(Number(r.totalCost))}</td>
                    <td className="p-3 text-xs font-medium text-slate-700 dark:text-slate-300">{formatToman(Number(r.finalPrice))}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => loadDetail(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></button>
                        {isSuperAdmin && <Link href={`/dashboard/product-bundles/${r.id}/edit`} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="ویرایش"><Pencil className="h-4 w-4" /></Link>
                        {isSuperAdmin && <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="حذف"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-300 dark:text-slate-600">نتیجه‌ای یافت نشد</td></tr>
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
                  {detail.code && <Badge variant="outline" className="text-slate-500">{detail.code}</Badge>}
                  <Badge variant="outline" style={{ color: detail.active ? '#10b981' : '#94a3b8', borderColor: detail.active ? '#10b98135' : '#94a3b835', backgroundColor: detail.active ? '#10b98110' : '#94a3b810' }}>{detail.active ? 'فعال' : 'غیرفعال'}</Badge>
                </div>
                {detail.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"><p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{detail.description}</p></div>}
                <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">هزینه کل</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{formatToman(Number(detail.totalCost))}</div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">قیمت کل</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{formatToman(Number(detail.totalPrice))}</div></div>
                  <div className="rounded-[10px] bg-blue-50 p-3 dark:bg-blue-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">درصد تخفیف</div><div className="mt-1 text-sm font-bold text-blue-600">{toEnglishDigits(String(Number(detail.discountPct)))}٪</div></div>
                  <div className="rounded-[10px] bg-blue-50 p-3 dark:bg-blue-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">قیمت نهایی</div><div className="mt-1 text-sm font-bold text-blue-700 dark:text-blue-400">{formatToman(Number(detail.finalPrice))}</div></div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">اقلام ({detailItems.length})</h3>
                  {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">قلمی ثبت نشده است</p> : (
                    <div className="space-y-1.5">
                      {detailItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">{item.productName || '—'}</div>
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

      <Link href="/dashboard/product-bundles/new" className="nb-fab" aria-label="ثبت بسته">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
