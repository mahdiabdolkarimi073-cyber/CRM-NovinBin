'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ClipboardCheck, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, Clock, Eye, AlertTriangle, Ban, FileText,
  Building2, Send, Lock, Unlock, Loader2, X,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  StockTaking, StockTakingItem, StockTakingHistory,
  Warehouse, Product, Profile,
} from '@/lib/types';

const STK_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  in_progress: 'در حال انجام',
  counted: 'شمارش تکمیل شد',
  approved: 'تأیید شده',
  closed: 'بسته شده',
  cancelled: 'لغو شده',
};

const STK_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  in_progress: '#f59e0b',
  counted: '#3b82f6',
  approved: '#10b981',
  closed: '#6366f1',
  cancelled: '#ef4444',
};

const STK_TYPE: Record<string, string> = {
  full: 'کامل',
  partial: 'جزئی',
  spot: 'موردی',
};

const DISCREPANCY_TYPE: Record<string, string> = {
  none: 'بدون مغایرت',
  surplus: 'مازاد',
  shortage: 'کسری',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  started: 'شروع شمارش',
  counted: 'شمارش ثبت شد',
  approved: 'تأیید شد',
  closed: 'بسته شد',
  cancelled: 'لغو شد',
  frozen: 'عملیات متوقف شد',
  unfrozen: 'عملیات از سر گرفته شد',
  status_changed: 'تغییر وضعیت',
};

export default function StockTakingPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<StockTaking[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<StockTaking | null>(null);
  const [detailItems, setDetailItems] = useState<StockTakingItem[]>([]);
  const [detailHistory, setDetailHistory] = useState<StockTakingHistory[]>([]);
  const [historyDialog, setHistoryDialog] = useState<StockTaking | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ id: string; reason: string } | null>(null);
  const [countDialog, setCountDialog] = useState<StockTakingItem | null>(null);
  const [countValue, setCountValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stkData, whData, prodData, staffData] = await Promise.all([
        fetchData<StockTaking>('stock_takings', {
          orderBy: { createdAt: 'desc' },
          include: { items: true, history: { orderBy: { actionAt: 'desc' } } },
        }),
        fetchData<Warehouse>('warehouses', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRecords(stkData || []);
      setWarehouses(whData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری انبارگردانی ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const warehouseName = (id: string | null | undefined) => {
    if (!id) return '—';
    const w = warehouses.find((w) => w.id === id);
    return w ? w.name : '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return records.filter((r) => {
      const matches = !q || r.number.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: records.length,
    inProgress: records.filter((r) => r.status === 'in_progress').length,
    discrepancies: records.filter((r) => r.status === 'counted' || r.status === 'approved')
      .reduce((sum, r) => {
        const items = r.items || [];
        return sum + items.filter((i) => i.discrepancyType !== 'none').length;
      }, 0),
    closed: records.filter((r) => r.status === 'closed').length,
  }), [records]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این انبارگردانی؟')) return;
    try {
      await deleteData('stock_takings', { id });
      toast.success('انبارگردانی حذف شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, action: string) => {
    if (!profile) return;
    try {
      const updates: any = { status: newStatus, updatedAt: new Date().toISOString() };
      if (newStatus === 'approved') { updates.approvedBy = profile.id; updates.approvedAt = new Date().toISOString(); }
      if (newStatus === 'closed') { updates.closedBy = profile.id; updates.closedAt = new Date().toISOString(); }
      if (newStatus === 'in_progress' && !records.find((r) => r.id === id)?.startDate) {
        updates.startDate = new Date().toISOString();
      }
      await updateData('stock_takings', { id }, updates);
      await createData('stock_taking_history', {
        stockTakingId: id,
        action,
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === id)?.status || null,
        toStatus: newStatus,
        details: {},
      });
      toast.success('وضعیت تغییر کرد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleToggleFreeze = async (stk: StockTaking) => {
    if (!profile) return;
    const newFreeze = !stk.freezeOperations;
    try {
      await updateData('stock_takings', { id: stk.id }, {
        freezeOperations: newFreeze,
        updatedAt: new Date().toISOString(),
      });
      await createData('stock_taking_history', {
        stockTakingId: stk.id,
        action: newFreeze ? 'frozen' : 'unfrozen',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        details: {},
      });
      toast.success(newFreeze ? 'عملیات انبار متوقف شد' : 'عملیات انبار از سر گرفته شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleCancel = async () => {
    if (!cancelDialog || !profile) return;
    try {
      await updateData('stock_takings', { id: cancelDialog.id }, {
        status: 'cancelled',
        cancelledBy: profile.id,
        cancelledAt: new Date().toISOString(),
        cancelReason: cancelDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });
      await createData('stock_taking_history', {
        stockTakingId: cancelDialog.id,
        action: 'cancelled',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === cancelDialog.id)?.status || null,
        toStatus: 'cancelled',
        details: { reason: cancelDialog.reason || null },
      });
      toast.success('انبارگردانی لغو شد');
      setCancelDialog(null);
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadDetail = async (stk: StockTaking) => {
    setDetail(stk);
    setDetailItems(stk.items || []);
    setDetailHistory(stk.history || []);
  };

  const openCountDialog = (item: StockTakingItem) => {
    setCountDialog(item);
    setCountValue(String(item.countedQty || ''));
  };

  const handleSaveCount = async () => {
    if (!countDialog || !profile) return;
    const counted = Number(countValue) || 0;
    const system = Number(countDialog.systemQty) || 0;
    const discrepancy = counted - system;
    const discType = discrepancy === 0 ? 'none' : discrepancy > 0 ? 'surplus' : 'shortage';
    try {
      await updateData('stock_taking_items', { id: countDialog.id }, {
        countedQty: counted,
        finalQty: counted,
        discrepancy,
        discrepancyType: discType,
        counterId: profile.id,
        countedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('شمارش ثبت شد');
      setCountDialog(null);
      loadData();
    } catch (error: any) {
      toast.error('ثبت ناموفق: ' + error.message);
    }
  };

  const statCards = useMemo(() => [
    {
      label: 'کل انبارگردانی', value: stats.total, icon: ClipboardCheck,
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'در حال انجام', value: stats.inProgress, icon: Clock,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'اقلام مغایر', value: stats.discrepancies, icon: AlertTriangle,
      gradient: 'linear-gradient(135deg, #ef4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
    {
      label: 'بسته شده', value: stats.closed, icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      glow: 'rgba(99,102,241,0.25)',
    },
  ], [stats]);

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری انبارگردانی...</p>
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
              <h1>انبارگردانی</h1>
            </div>
            <p>مدیریت عملیات انبارگردانی و شمارش موجودی</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/stock-taking/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت انبارگردانی
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {statCards.map((stat) => (
          <div
            className="nb-stat-card-v2"
            key={stat.label}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
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

      {records.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><ClipboardCheck className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>انبارگردانی یافت نشد</h3>
          <p>برای شروع، اولین عملیات انبارگردانی را ثبت کنید</p>
          <Link href="/dashboard/stock-taking/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن انبارگردانی</Link>
        </div>
      ) : (
        <>
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>همه انبارگردانی‌ها</h2>
              <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
            </div>
            <div className="nb-toolbar-right">
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو بر اساس شماره..."
                />
                {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
              </div>
              <select
                className="nb-select-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">همه وضعیت‌ها</option>
                {Object.entries(STK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {pageItems.map((r) => {
                const stColor = STK_STATUS_COLOR[r.status] || '#64748b';
                const itemCount = (r.items || []).length;
                const discCount = (r.items || []).filter((i) => i.discrepancyType !== 'none').length;
                return (
                  <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => loadDetail(r)}>
                    <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{r.number}</div>
                        <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{STK_STATUS[r.status]}</Badge>
                        <Badge variant="outline" className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{STK_TYPE[r.stockTakingType] || r.stockTakingType}</Badge>
                        {r.freezeOperations && <Badge variant="outline" className="shrink-0 border-amber-200 text-amber-600 text-[10px] dark:border-amber-800 dark:text-amber-400">عملیات متوقف</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{warehouseName(r.warehouseId)}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.createdAt)}</span>
                        <span>{itemCount.toLocaleString('fa-IR')} قلم</span>
                        {discCount > 0 && <span className="text-rose-500">{discCount.toLocaleString('fa-IR')} مغایر</span>}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); loadDetail(r); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"><Eye className="h-4 w-4" /></button>
                    {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                );
              })}
              {pageItems.length === 0 && <div className="py-12 text-center text-sm text-slate-300 dark:text-slate-600">نتیجه‌ای یافت نشد</div>}
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">صفحه {currentPage.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                  <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={currentPage === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Link href="/dashboard/stock-taking/new" className="nb-fab" aria-label="ثبت انبارگردانی">
        <Plus className="h-6 w-6" />
      </Link>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (() => {
            const stColor = STK_STATUS_COLOR[detail.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">انبارگردانی {detail.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => setHistoryDialog(detail)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{STK_STATUS[detail.status]}</Badge>
                    <Badge variant="outline" className="text-slate-500 dark:text-slate-400">{STK_TYPE[detail.stockTakingType] || detail.stockTakingType}</Badge>
                    {detail.freezeOperations && <Badge variant="outline" className="border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400">عملیات متوقف</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-blue-50 dark:bg-blue-900/20 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">شماره</div><div className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">{detail.number}</div></div>
                    <div className="rounded-[10px] bg-slate-50 dark:bg-slate-700/50 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">انبار</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{warehouseName(detail.warehouseId)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 dark:bg-slate-700/50 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">مسئول</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{staffName(detail.responsibleId)}</div></div>
                    <div className="rounded-[10px] bg-emerald-50 dark:bg-emerald-900/20 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">تاریخ شروع</div><div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">{detail.startDate ? formatJalali(detail.startDate) : '—'}</div></div>
                    <div className="rounded-[10px] bg-slate-50 dark:bg-slate-700/50 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">تاریخ پایان</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{detail.endDate ? formatJalali(detail.endDate) : '—'}</div></div>
                    <div className="rounded-[10px] bg-slate-50 dark:bg-slate-700/50 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">ایجادکننده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{staffName(detail.createdBy)}</div></div>
                  </div>
                  {detail.description && <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detail.description}</p></div>}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">اقلام ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400 dark:text-slate-500">قلمی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => {
                          const discColor = item.discrepancyType === 'surplus' ? '#10b981' : item.discrepancyType === 'shortage' ? '#ef4444' : '#94a3b8';
                          return (
                            <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3 text-xs">
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-700 dark:text-slate-200">{item.productName || '—'}</div>
                                <div className="mt-0.5 flex gap-3 text-slate-400 dark:text-slate-500">
                                  <span>سیستمی: {formatToman(Number(item.systemQty))}</span>
                                  <span>شمارش: {formatToman(Number(item.countedQty))}</span>
                                  <span style={{ color: discColor }}>{DISCREPANCY_TYPE[item.discrepancyType]}: {formatToman(Math.abs(Number(item.discrepancy)))}</span>
                                </div>
                              </div>
                              {detail.status === 'in_progress' && (
                                <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={() => openCountDialog(item)}>ثبت شمارش</Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                    {detail.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" onClick={() => handleStatusChange(detail.id, 'in_progress', 'started')}><Send className="h-4 w-4" /> شروع شمارش</Button>
                    )}
                    {detail.status === 'in_progress' && isSuperAdmin && (
                      <Button variant="outline" onClick={() => handleStatusChange(detail.id, 'counted', 'counted')}><CheckCircle className="h-4 w-4" /> پایان شمارش</Button>
                    )}
                    {detail.status === 'counted' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20" onClick={() => handleStatusChange(detail.id, 'approved', 'approved')}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                    )}
                    {detail.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20" onClick={() => handleStatusChange(detail.id, 'closed', 'closed')}><CheckCircle className="h-4 w-4" /> بستن</Button>
                    )}
                    {isSuperAdmin && !['closed', 'cancelled'].includes(detail.status) && (
                      <Button variant="outline" onClick={() => handleToggleFreeze(detail)}>
                        {detail.freezeOperations ? <><Unlock className="h-4 w-4" /> از سرگیری عملیات</> : <><Lock className="h-4 w-4" /> توقف عملیات</>}
                      </Button>
                    )}
                    {isSuperAdmin && !['closed', 'cancelled'].includes(detail.status) && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20" onClick={() => setCancelDialog({ id: detail.id, reason: '' })}><Ban className="h-4 w-4" /> لغو</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!countDialog} onOpenChange={(o) => !o && setCountDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ثبت شمارش</DialogTitle></DialogHeader>
          {countDialog && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{countDialog.productName || '—'}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">موجودی سیستمی: {formatToman(Number(countDialog.systemQty))} {countDialog.unit || ''}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">مقدار شمارش‌شده</Label>
                <Input type="number" value={countValue} onChange={(e) => setCountValue(e.target.value)} placeholder="مقدار..." className="h-[42px] rounded-[10px] border-slate-200 dark:border-slate-700" autoFocus />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountDialog(null)}>انصراف</Button>
            <Button onClick={handleSaveCount} disabled={submitting}>ثبت شمارش</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelDialog} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>لغو انبارگردانی</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">دلیل لغو</Label>
              <Textarea value={cancelDialog?.reason || ''} onChange={(e) => setCancelDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل لغو..." className="rounded-[10px] border-slate-200 dark:border-slate-700" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleCancel}>لغو انبارگردانی</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه انبارگردانی</DialogTitle></DialogHeader>
          {detailHistory.length === 0 ? <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">تاریخچه‌ای ثبت نشده است</p> : (
            <div className="space-y-2">
              {detailHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400"><FileText className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ACTION_LABEL[h.action] || h.action}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{relativeTime(h.actionAt)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      توسط {staffName(h.actionBy)}
                      {h.fromStatus && h.toStatus && <span> • {STK_STATUS[h.fromStatus] || h.fromStatus} ← {STK_STATUS[h.toStatus] || h.toStatus}</span>}
                      {h.details?.reason && <div className="mt-1 text-rose-500">دلیل: {h.details.reason}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
