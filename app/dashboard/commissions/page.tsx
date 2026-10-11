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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, Clock, Eye, Ban, FileText, Percent, XCircle,
  Send, AlertCircle, DollarSign, Wallet, X, Loader2,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  Commission, CommissionItem, CommissionAdjustment,
  CommissionHistory, Profile,
} from '@/lib/types';

const CM_STATUS: Record<string, string> = {
  calculated: 'محاسبه اولیه',
  review: 'بررسی',
  approved: 'تأیید شده',
  finalized: 'قطعی',
  needs_correction: 'نیاز به اصلاح',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
  corrected: 'اصلاح شده',
};

const CM_STATUS_COLOR: Record<string, string> = {
  calculated: '#3b82f6',
  review: '#f59e0b',
  approved: '#10b981',
  finalized: '#059669',
  needs_correction: '#f97316',
  rejected: '#ef4444',
  cancelled: '#dc2626',
  corrected: '#8b5cf6',
};

const PAYMENT_STATUS: Record<string, string> = {
  unpaid: 'پرداخت‌نشده',
  partial: 'پرداخت جزئی',
  paid: 'پرداخت کامل',
};

const CALC_BASIS: Record<string, string> = {
  gross_sales: 'ناخالص فروش',
  net_sales: 'خالص فروش',
  after_discount: 'پس از تخفیف',
  after_return: 'پس از برگشت',
  collected: 'وصول‌شده',
  profit: 'سود فروش',
  subject_amount: 'مبلغ مشمول',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  calculated: 'محاسبه شد',
  reviewed: 'بررسی شد',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  finalized: 'قطعی شد',
  cancelled: 'لغو شد',
  corrected: 'اصلاح شد',
  paid: 'پرداخت شد',
  adjusted: 'تعدیل ثبت شد',
  status_changed: 'تغییر وضعیت',
};

export default function CommissionsPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<Commission[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Commission | null>(null);
  const [detailItems, setDetailItems] = useState<CommissionItem[]>([]);
  const [detailAdjustments, setDetailAdjustments] = useState<CommissionAdjustment[]>([]);
  const [detailHistory, setDetailHistory] = useState<CommissionHistory[]>([]);
  const [historyDialog, setHistoryDialog] = useState<Commission | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ id: string; reason: string } | null>(null);
  const [adjustDialog, setAdjustDialog] = useState<{ id: string; type: string; amount: string; reason: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cmData, staffData] = await Promise.all([
        fetchData<Commission>('commissions', {
          orderBy: { createdAt: 'desc' },
          include: { items: true, adjustments: true, history: { orderBy: { actionAt: 'desc' } } },
        }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRecords(cmData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری پورسانت‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return records.filter((r) => {
      const matches = !q || r.number?.toLocaleLowerCase().includes(q) || r.salespersonName?.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: records.length,
    pending: records.filter((r) => r.status === 'calculated' || r.status === 'review' || r.status === 'needs_correction').length,
    approved: records.filter((r) => r.status === 'approved' || r.status === 'finalized').length,
    cancelled: records.filter((r) => r.status === 'cancelled').length,
    totalPayable: records.filter((r) => r.status !== 'cancelled').reduce((sum, r) => sum + Number(r.finalPayableAmount || 0), 0),
    totalPaid: records.filter((r) => r.status !== 'cancelled').reduce((sum, r) => sum + Number(r.paidAmount || 0), 0),
  }), [records]);

  const statsList = useMemo(() => [
    { label: 'کل پورسانت‌ها', value: stats.total.toLocaleString('fa-IR'), icon: Percent, filter: 'all', gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'در انتظار', value: stats.pending.toLocaleString('fa-IR'), icon: Clock, filter: 'calculated', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
    { label: 'تأیید/قطعی', value: stats.approved.toLocaleString('fa-IR'), icon: CheckCircle, filter: 'approved', gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
    { label: 'لغو شده', value: stats.cancelled.toLocaleString('fa-IR'), icon: XCircle, filter: 'cancelled', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', glow: 'rgba(239,68,68,0.25)' },
    { label: 'قابل پرداخت (تومان)', value: formatToman(stats.totalPayable), icon: DollarSign, filter: 'all', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', glow: 'rgba(16,185,129,0.25)' },
    { label: 'پرداخت شده (تومان)', value: formatToman(stats.totalPaid), icon: Wallet, filter: 'all', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', glow: 'rgba(99,102,241,0.25)' },
  ], [stats]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این پورسانت؟')) return;
    try {
      await deleteData('commissions', { id });
      toast.success('پورسانت حذف شد');
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
      if (newStatus === 'finalized') { updates.finalizedBy = profile.id; updates.finalizedAt = new Date().toISOString(); }
      if (newStatus === 'rejected') { updates.rejectedBy = profile.id; updates.rejectedAt = new Date().toISOString(); }
      await updateData('commissions', { id }, updates);
      await createData('commission_history', {
        commissionId: id, action, actionBy: profile.id, actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === id)?.status || null, toStatus: newStatus, details: {},
      });
      toast.success('وضعیت تغییر کرد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleCancel = async () => {
    if (!cancelDialog || !profile) return;
    try {
      await updateData('commissions', { id: cancelDialog.id }, {
        status: 'cancelled', cancelledBy: profile.id, cancelledAt: new Date().toISOString(),
        cancelReason: cancelDialog.reason || null, updatedAt: new Date().toISOString(),
      });
      await createData('commission_history', {
        commissionId: cancelDialog.id, action: 'cancelled', actionBy: profile.id, actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === cancelDialog.id)?.status || null, toStatus: 'cancelled',
        reason: cancelDialog.reason, details: {},
      });
      toast.success('پورسانت لغو شد');
      setCancelDialog(null); setDetail(null); loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleAdjust = async () => {
    if (!adjustDialog || !profile) return;
    const amt = Number(adjustDialog.amount);
    if (isNaN(amt) || amt === 0) { toast.error('مبلغ تعدیل نامعتبر است'); return; }
    try {
      await createData('commission_adjustments', {
        commissionId: adjustDialog.id, adjustmentType: adjustDialog.type, amount: amt,
        reason: adjustDialog.reason || null, createdBy: profile.id,
      });
      const cm = records.find((r) => r.id === adjustDialog.id);
      if (cm) {
        const newAdjTotal = Number(cm.adjustmentsTotal || 0) + amt;
        const newFinal = Number(cm.calculatedCommission || 0) + newAdjTotal;
        await updateData('commissions', { id: adjustDialog.id }, {
          adjustmentsTotal: newAdjTotal, finalPayableAmount: newFinal, updatedAt: new Date().toISOString(),
        });
      }
      await createData('commission_history', {
        commissionId: adjustDialog.id, action: 'adjusted', actionBy: profile.id, actionAt: new Date().toISOString(),
        details: { type: adjustDialog.type, amount: amt, reason: adjustDialog.reason },
      });
      toast.success('تعدیل ثبت شد');
      setAdjustDialog(null); loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadDetail = (cm: Commission) => {
    setDetail(cm);
    setDetailItems(cm.items || []);
    setDetailAdjustments(cm.adjustments || []);
    setDetailHistory(cm.history || []);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری پورسانت‌ها...</p>
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
              <h1>پورسانت</h1>
            </div>
            <p>مدیریت پورسانت فروشندگان، تأیید و پرداخت</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/commissions/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت پورسانت
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
          <h2>همه پورسانت‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو بر اساس شماره یا فروشنده..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(CM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Percent className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>پورسانتی یافت نشد</h3>
          <p>برای شروع، اولین پورسانت را ثبت کنید</p>
          <Link href="/dashboard/commissions/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن پورسانت</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شماره</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">فروشنده</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">دوره</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">قابل پرداخت</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pageItems.map((r) => {
                  const stColor = CM_STATUS_COLOR[r.status] || '#64748b';
                  return (
                    <tr key={r.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => loadDetail(r)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stColor }} />
                          <div className="font-medium text-slate-800 dark:text-slate-100">{r.number}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge style={{ backgroundColor: `${stColor}15`, color: stColor }} className="rounded-full text-xs">{CM_STATUS[r.status]}</Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{r.salespersonName || '—'}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.periodStart)}</span>
                      </td>
                      <td className="p-3 text-xs font-medium text-slate-700 dark:text-slate-300">{formatToman(Number(r.finalPayableAmount))} تومان</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => loadDetail(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></button>
                          {isSuperAdmin && r.status === 'calculated' && <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="حذف"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
          {detail && (() => {
            const stColor = CM_STATUS_COLOR[detail.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">پورسانت {detail.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detail)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && detail.status === 'calculated' && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{CM_STATUS[detail.status]}</Badge>
                    <Badge variant="outline" className="text-slate-500 dark:text-slate-400">{PAYMENT_STATUS[detail.paymentStatus] || detail.paymentStatus}</Badge>
                    {detail.calculationBasis && <Badge variant="outline" className="text-slate-500 dark:text-slate-400">{CALC_BASIS[detail.calculationBasis] || detail.calculationBasis}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-sky-50 p-3"><div className="text-xs text-slate-500">شماره</div><div className="mt-1 text-sm font-bold text-sky-700">{detail.number}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">فروشنده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{detail.salespersonName || '—'}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">دوره</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{formatJalali(detail.periodStart)} - {formatJalali(detail.periodEnd)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">ایجادکننده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{staffName(detail.createdBy)}</div></div>
                    <div className="rounded-[10px] bg-blue-50 p-3"><div className="text-xs text-slate-500">مبلغ مشمول</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(Number(detail.subjectAmount))}</div></div>
                    <div className="rounded-[10px] bg-emerald-50 p-3"><div className="text-xs text-slate-500">پورسانت محاسبه‌شده</div><div className="mt-1 text-sm font-bold text-emerald-600">{formatToman(Number(detail.calculatedCommission))}</div></div>
                    <div className="rounded-[10px] bg-amber-50 p-3"><div className="text-xs text-slate-500">تعدیلات</div><div className="mt-1 text-sm font-bold text-amber-600">{formatToman(Number(detail.adjustmentsTotal))}</div></div>
                    <div className="rounded-[10px] bg-green-50 p-3"><div className="text-xs text-slate-500">قابل پرداخت</div><div className="mt-1 text-sm font-bold text-green-700">{formatToman(Number(detail.finalPayableAmount))}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500 dark:text-slate-400">پرداخت شده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{formatToman(Number(detail.paidAmount))}</div></div>
                  </div>
                  {detail.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"><p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detail.description}</p></div>}
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">اسناد فروش ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">سندی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700 dark:text-slate-200">{item.invoiceNumber || 'بدون شماره'}</div>
                              <div className="mt-0.5 flex gap-3 text-slate-400">
                                <span>فاکتور: {formatToman(Number(item.invoiceAmount))}</span>
                                <span>تخفیف: {formatToman(Number(item.discountAmount))}</span>
                                <span>برگشت: {formatToman(Number(item.returnAmount))}</span>
                                <span>مشمول: {formatToman(Number(item.subjectAmount))}</span>
                                <span>پورسانت: {formatToman(Number(item.commissionAmount))}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="shrink-0 text-[10px]">{item.calcStatus}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {detailAdjustments.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">تعدیلات ({detailAdjustments.length})</h3>
                      <div className="space-y-1.5">
                        {detailAdjustments.map((adj) => (
                          <div key={adj.id} className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-amber-700">{adj.adjustmentType}</div>
                              {adj.reason && <div className="mt-0.5 text-amber-600">{adj.reason}</div>}
                            </div>
                            <span className="font-bold text-amber-700">{formatToman(Number(adj.amount))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {detail.status === 'calculated' && isSuperAdmin && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => handleStatusChange(detail.id, 'review', 'reviewed')}><Clock className="h-4 w-4" /> بررسی</Button>
                    )}
                    {detail.status === 'review' && isSuperAdmin && (
                      <>
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(detail.id, 'approved', 'approved')}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleStatusChange(detail.id, 'rejected', 'rejected')}><XCircle className="h-4 w-4" /> رد</Button>
                      </>
                    )}
                    {detail.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => handleStatusChange(detail.id, 'finalized', 'finalized')}><Send className="h-4 w-4" /> قطعی</Button>
                    )}
                    {isSuperAdmin && detail.status !== 'cancelled' && detail.status !== 'finalized' && (
                      <>
                        <Button variant="outline" className="border-violet-200 text-violet-600 hover:bg-violet-50" onClick={() => setAdjustDialog({ id: detail.id, type: 'bonus', amount: '', reason: '' })}><AlertCircle className="h-4 w-4" /> تعدیل</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setCancelDialog({ id: detail.id, reason: '' })}><Ban className="h-4 w-4" /> لغو</Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelDialog} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>لغو پورسانت</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">علت لغو</Label>
            <Textarea value={cancelDialog?.reason || ''} onChange={(e) => setCancelDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل..." className="rounded-[10px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleCancel}>لغو پورسانت</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustDialog} onOpenChange={(o) => !o && setAdjustDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ثبت تعدیل</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">نوع تعدیل</Label>
              <select value={adjustDialog?.type || 'bonus'} onChange={(e) => setAdjustDialog((d) => d ? { ...d, type: e.target.value } : null)} className="h-[42px] w-full rounded-[10px] border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <option value="bonus">پاداش</option>
                <option value="deduction">کسورات</option>
                <option value="penalty">جریمه</option>
                <option value="correction">اصلاحیه</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">مبلغ (تومان)</Label>
              <Input type="number" value={adjustDialog?.amount || ''} onChange={(e) => setAdjustDialog((d) => d ? { ...d, amount: e.target.value } : null)} placeholder="مبلغ..." className="h-[42px] rounded-[10px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">علت</Label>
              <Textarea value={adjustDialog?.reason || ''} onChange={(e) => setAdjustDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="علت تعدیل..." className="rounded-[10px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>انصراف</Button>
            <Button onClick={handleAdjust}>ثبت تعدیل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه پورسانت</DialogTitle></DialogHeader>
          {detailHistory.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p> : (
            <div className="space-y-2">
              {detailHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 dark:bg-slate-700 dark:text-slate-300"><FileText className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ACTION_LABEL[h.action] || h.action}</span>
                      <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      توسط {staffName(h.actionBy)}
                      {h.fromStatus && h.toStatus && <span> • {CM_STATUS[h.fromStatus] || h.fromStatus} ← {CM_STATUS[h.toStatus] || h.toStatus}</span>}
                      {h.reason && <span> • {h.reason}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Link href="/dashboard/commissions/new" className="nb-fab" aria-label="ثبت پورسانت">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
