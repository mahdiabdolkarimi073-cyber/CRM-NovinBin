'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Undo2, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, Clock, Eye, Ban, FileText, Building2, Send,
  Loader2, X,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  WarehouseReceiptReturn, WarehouseReceiptReturnItem, WarehouseReceiptReturnHistory,
  Warehouse, Profile,
} from '@/lib/types';

const WRR_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending_review: 'در انتظار بررسی',
  approved: 'تأیید شده',
  applied: 'اعمال شده',
  finalized: 'نهایی شده',
  voided: 'باطل شده',
};

const WRR_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  pending_review: '#f59e0b',
  approved: '#10b981',
  applied: '#6366f1',
  finalized: '#16a34a',
  voided: '#ef4444',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  submitted: 'ارسال شد',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  applied: 'اعمال شد',
  finalized: 'نهایی شد',
  voided: 'باطل شد',
  status_changed: 'تغییر وضعیت',
};

export default function WarehouseReceiptReturnsPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<WarehouseReceiptReturn[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<WarehouseReceiptReturn | null>(null);
  const [detailItems, setDetailItems] = useState<WarehouseReceiptReturnItem[]>([]);
  const [detailHistory, setDetailHistory] = useState<WarehouseReceiptReturnHistory[]>([]);
  const [historyDialog, setHistoryDialog] = useState<WarehouseReceiptReturn | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wrrData, whData, staffData] = await Promise.all([
        fetchData<WarehouseReceiptReturn>('warehouse_receipt_returns', {
          orderBy: { createdAt: 'desc' },
          include: { items: true, history: { orderBy: { actionAt: 'desc' } } },
        }),
        fetchData<Warehouse>('warehouses', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRecords(wrrData || []);
      setWarehouses(whData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری برگشت‌ها ناموفق: ' + error.message);
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
      const matches = !q || r.number?.toLocaleLowerCase().includes(q) || r.contactName?.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: records.length,
    pending: records.filter((r) => r.status === 'draft' || r.status === 'pending_review').length,
    confirmed: records.filter((r) => r.status === 'approved' || r.status === 'applied' || r.status === 'finalized').length,
    totalValue: records.filter((r) => r.status !== 'voided').reduce((sum, r) => sum + Number(r.totalValue || 0), 0),
  }), [records]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این برگشت رسید؟')) return;
    try {
      await deleteData('warehouse_receipt_returns', { id });
      toast.success('برگشت حذف شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, action: string) => {
    if (!profile) return;
    try {
      await updateData('warehouse_receipt_returns', { id }, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      await createData('warehouse_receipt_return_history', {
        returnId: id,
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

  const handleVoid = async () => {
    if (!voidDialog || !profile) return;
    try {
      await updateData('warehouse_receipt_returns', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });
      await createData('warehouse_receipt_return_history', {
        returnId: voidDialog.id,
        action: 'voided',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === voidDialog.id)?.status || null,
        toStatus: 'voided',
        details: { reason: voidDialog.reason },
      });
      toast.success('برگشت باطل شد');
      setVoidDialog(null);
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadDetail = (wr: WarehouseReceiptReturn) => {
    setDetail(wr);
    setDetailItems(wr.items || []);
    setDetailHistory(wr.history || []);
  };

  const statCards = useMemo(() => [
    {
      label: 'کل برگشت‌ها', value: stats.total, icon: Undo2,
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'در انتظار', value: stats.pending, icon: Clock,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'تأیید شده', value: stats.confirmed, icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'ارزش کل (تومان)', value: formatToman(stats.totalValue), icon: FileText,
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      glow: 'rgba(99,102,241,0.25)',
    },
  ], [stats]);

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری برگشت‌ها...</p>
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
              <h1>برگشت رسید انبار</h1>
            </div>
            <p>مدیریت برگشت‌های رسید انبار</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/warehouse-receipt-returns/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت برگشت
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
              <strong>{typeof stat.value === 'number' ? stat.value.toLocaleString('fa-IR') : stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </div>
        ))}
      </section>

      {records.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Undo2 className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>برگشتی یافت نشد</h3>
          <p>برای شروع، اولین برگشت رسید انبار را ثبت کنید</p>
          <Link href="/dashboard/warehouse-receipt-returns/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن برگشت</Link>
        </div>
      ) : (
        <>
          <div className="nb-toolbar">
            <div className="nb-toolbar-left">
              <h2>همه برگشت‌ها</h2>
              <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
            </div>
            <div className="nb-toolbar-right">
              <div className="nb-search-box">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو بر اساس شماره یا طرف..."
                />
                {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
              </div>
              <select
                className="nb-select-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">همه وضعیت‌ها</option>
                {Object.entries(WRR_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {pageItems.map((r) => {
                const stColor = WRR_STATUS_COLOR[r.status] || '#64748b';
                return (
                  <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => loadDetail(r)}>
                    <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{r.number}</div>
                        <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{WRR_STATUS[r.status]}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{warehouseName(r.warehouseId)}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.returnDate)}</span>
                        {r.contactName && <span>{r.contactName}</span>}
                        <span>{formatToman(Number(r.totalValue))} تومان</span>
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

      <Link href="/dashboard/warehouse-receipt-returns/new" className="nb-fab" aria-label="ثبت برگشت">
        <Plus className="h-6 w-6" />
      </Link>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (() => {
            const stColor = WRR_STATUS_COLOR[detail.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">برگشت رسید {detail.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => setHistoryDialog(detail)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{WRR_STATUS[detail.status]}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-blue-50 dark:bg-blue-900/20 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">شماره</div><div className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">{detail.number}</div></div>
                    <div className="rounded-[10px] bg-slate-50 dark:bg-slate-700/50 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">انبار</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{warehouseName(detail.warehouseId)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 dark:bg-slate-700/50 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">طرف حساب</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{detail.contactName || '—'}</div></div>
                    <div className="rounded-[10px] bg-emerald-50 dark:bg-emerald-900/20 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">تاریخ برگشت</div><div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatJalali(detail.returnDate)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 dark:bg-slate-700/50 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">ایجادکننده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{staffName(detail.createdBy)}</div></div>
                    <div className="rounded-[10px] bg-blue-50 dark:bg-blue-900/20 p-3"><div className="text-xs text-slate-500 dark:text-slate-400">ارزش کل</div><div className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">{formatToman(Number(detail.totalValue))}</div></div>
                  </div>
                  {detail.returnReason && <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3"><div className="text-xs font-semibold text-amber-600 dark:text-amber-400">علت برگشت</div><p className="mt-1 whitespace-pre-wrap text-sm text-amber-700 dark:text-amber-300">{detail.returnReason}</p></div>}
                  {detail.description && <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detail.description}</p></div>}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">اقلام ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400 dark:text-slate-500">قلمی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700 dark:text-slate-200">{item.productName || '—'}</div>
                              <div className="mt-0.5 flex gap-3 text-slate-400 dark:text-slate-500">
                                <span>{formatToman(Number(item.qty))} {item.unit || ''}</span>
                                <span>قیمت واحد: {formatToman(Number(item.unitPrice))}</span>
                                <span>مبلغ: {formatToman(Number(item.totalValue))}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                    {detail.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20" onClick={() => handleStatusChange(detail.id, 'pending_review', 'submitted')}><Send className="h-4 w-4" /> ارسال برای بررسی</Button>
                    )}
                    {detail.status === 'pending_review' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20" onClick={() => handleStatusChange(detail.id, 'approved', 'approved')}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                    )}
                    {detail.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20" onClick={() => handleStatusChange(detail.id, 'applied', 'applied')}><Send className="h-4 w-4" /> اعمال برگشت</Button>
                    )}
                    {detail.status === 'applied' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20" onClick={() => handleStatusChange(detail.id, 'finalized', 'finalized')}><CheckCircle className="h-4 w-4" /> نهایی‌سازی</Button>
                    )}
                    {isSuperAdmin && detail.status !== 'voided' && detail.status !== 'finalized' && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20" onClick={() => setVoidDialog({ id: detail.id, reason: '' })}><Ban className="h-4 w-4" /> باطل کردن</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>باطل کردن برگشت</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">دلیل ابطال</Label>
            <Textarea value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل..." className="rounded-[10px] border-slate-200 dark:border-slate-700" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleVoid}>باطل کردن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه برگشت</DialogTitle></DialogHeader>
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
                      {h.fromStatus && h.toStatus && <span> • {WRR_STATUS[h.fromStatus] || h.fromStatus} ← {WRR_STATUS[h.toStatus] || h.toStatus}</span>}
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
