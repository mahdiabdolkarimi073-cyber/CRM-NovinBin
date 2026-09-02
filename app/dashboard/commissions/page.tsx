'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, Clock, Eye, Ban, FileText, Percent, XCircle,
  Send, AlertCircle, DollarSign, Wallet,
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
        commissionId: id,
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

  const handleCancel = async () => {
    if (!cancelDialog || !profile) return;
    try {
      await updateData('commissions', { id: cancelDialog.id }, {
        status: 'cancelled',
        cancelledBy: profile.id,
        cancelledAt: new Date().toISOString(),
        cancelReason: cancelDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });
      await createData('commission_history', {
        commissionId: cancelDialog.id,
        action: 'cancelled',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === cancelDialog.id)?.status || null,
        toStatus: 'cancelled',
        reason: cancelDialog.reason,
        details: {},
      });
      toast.success('پورسانت لغو شد');
      setCancelDialog(null);
      setDetail(null);
      loadData();
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
        commissionId: adjustDialog.id,
        adjustmentType: adjustDialog.type,
        amount: amt,
        reason: adjustDialog.reason || null,
        createdBy: profile.id,
      });
      const cm = records.find((r) => r.id === adjustDialog.id);
      if (cm) {
        const newAdjTotal = Number(cm.adjustmentsTotal || 0) + amt;
        const newFinal = Number(cm.calculatedCommission || 0) + newAdjTotal;
        await updateData('commissions', { id: adjustDialog.id }, {
          adjustmentsTotal: newAdjTotal,
          finalPayableAmount: newFinal,
          updatedAt: new Date().toISOString(),
        });
      }
      await createData('commission_history', {
        commissionId: adjustDialog.id,
        action: 'adjusted',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        details: { type: adjustDialog.type, amount: amt, reason: adjustDialog.reason },
      });
      toast.success('تعدیل ثبت شد');
      setAdjustDialog(null);
      loadData();
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

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">پورسانت</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> پورسانت</div>
        </div>
        <Link href="/dashboard/commissions/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت پورسانت
          </Button>
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-6">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Percent className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل پورسانت‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">در انتظار</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.approved.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">تأیید/قطعی</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><XCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.cancelled.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">لغو شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-emerald-50 text-emerald-500"><DollarSign className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[20px] font-bold leading-none text-[#101828]">{formatToman(stats.totalPayable)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">قابل پرداخت (تومان)</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-blue-50 text-blue-500"><Wallet className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[20px] font-bold leading-none text-[#101828]">{formatToman(stats.totalPaid)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">پرداخت شده (تومان)</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره یا فروشنده..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه وضعیت‌ها</option>
          {Object.entries(CM_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : records.length === 0 ? (
        <Card><EmptyState icon={<Percent className="h-8 w-8" />} title="پورسانتی یافت نشد" description="برای شروع، اولین پورسانت را ثبت کنید" action={<Link href="/dashboard/commissions/new"><Button><Plus className="h-4 w-4" /> افزودن پورسانت</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((r) => {
              const stColor = CM_STATUS_COLOR[r.status] || '#64748b';
              return (
                <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => loadDetail(r)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{r.number}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{CM_STATUS[r.status]}</Badge>
                      <Badge variant="outline" className="shrink-0 text-[10px] text-[#667085]">{PAYMENT_STATUS[r.paymentStatus] || r.paymentStatus}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.periodStart)} - {formatJalali(r.periodEnd)}</span>
                      {r.salespersonName && <span>{r.salespersonName}</span>}
                      <span>{formatToman(Number(r.finalPayableAmount))} تومان</span>
                      {r.calculationBasis && <span>{CALC_BASIS[r.calculationBasis] || r.calculationBasis}</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); loadDetail(r); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && r.status === 'calculated' && <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
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
                    <Badge variant="outline" className="text-[#667085]">{PAYMENT_STATUS[detail.paymentStatus] || detail.paymentStatus}</Badge>
                    {detail.calculationBasis && <Badge variant="outline" className="text-[#667085]">{CALC_BASIS[detail.calculationBasis] || detail.calculationBasis}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">شماره</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{detail.number}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">فروشنده</div><div className="mt-1 text-sm font-bold text-[#344054]">{detail.salespersonName || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">دوره</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatJalali(detail.periodStart)} - {formatJalali(detail.periodEnd)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">ایجادکننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detail.createdBy)}</div></div>
                    <div className="rounded-[10px] bg-blue-50 p-3"><div className="text-xs text-[#667085]">مبلغ مشمول</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(Number(detail.subjectAmount))}</div></div>
                    <div className="rounded-[10px] bg-emerald-50 p-3"><div className="text-xs text-[#667085]">پورسانت محاسبه‌شده</div><div className="mt-1 text-sm font-bold text-emerald-600">{formatToman(Number(detail.calculatedCommission))}</div></div>
                    <div className="rounded-[10px] bg-amber-50 p-3"><div className="text-xs text-[#667085]">تعدیلات</div><div className="mt-1 text-sm font-bold text-amber-600">{formatToman(Number(detail.adjustmentsTotal))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">قابل پرداخت</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatToman(Number(detail.finalPayableAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">پرداخت شده</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatToman(Number(detail.paidAmount))}</div></div>
                  </div>

                  {detail.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.description}</p></div>}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[#1D2939]">اسناد فروش ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">سندی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700">{item.invoiceNumber || 'بدون شماره'}</div>
                              <div className="mt-0.5 flex gap-3 text-slate-400">
                                <span>فاکتور: {formatToman(Number(item.invoiceAmount))}</span>
                                <span>تخفیف: {formatToman(Number(item.discountAmount))}</span>
                                <span>برگشت: {formatToman(Number(item.returnAmount))}</span>
                                <span>وصول: {formatToman(Number(item.collectedAmount))}</span>
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
                      <h3 className="mb-2 text-sm font-bold text-[#1D2939]">تعدیلات ({detailAdjustments.length})</h3>
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

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
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
            <Label className="text-sm font-semibold text-[#344054]">علت لغو</Label>
            <Textarea value={cancelDialog?.reason || ''} onChange={(e) => setCancelDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل..." className="rounded-[10px] border-[#DCE3EE]" />
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
              <Label className="text-sm font-semibold text-[#344054]">نوع تعدیل</Label>
              <select value={adjustDialog?.type || 'bonus'} onChange={(e) => setAdjustDialog((d) => d ? { ...d, type: e.target.value } : null)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                <option value="bonus">پاداش</option>
                <option value="deduction">کسورات</option>
                <option value="penalty">جریمه</option>
                <option value="correction">اصلاحیه</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">مبلغ (تومان)</Label>
              <Input type="number" value={adjustDialog?.amount || ''} onChange={(e) => setAdjustDialog((d) => d ? { ...d, amount: e.target.value } : null)} placeholder="مبلغ..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">علت</Label>
              <Textarea value={adjustDialog?.reason || ''} onChange={(e) => setAdjustDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="علت تعدیل..." className="rounded-[10px] border-[#DCE3EE]" />
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
                <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500"><FileText className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{ACTION_LABEL[h.action] || h.action}</span>
                      <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
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
    </div>
  );
}
