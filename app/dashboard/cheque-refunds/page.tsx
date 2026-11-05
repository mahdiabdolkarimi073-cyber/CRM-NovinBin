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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  RotateCcw, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, TrendingDown, WalletCards, Eye,
  AlertTriangle, Send, FileCheck, Ban, FileText, Building2, Hash,
  Banknote, User,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime, toLocalDateString } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  ChequeRefund, ChequeRefundHistory, ReceivedCheque, ContactParty, Profile,
} from '@/lib/types';

const REFUND_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending_approval: 'در انتظار تأیید',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  finalized: 'مستردشده',
  cancelled: 'لغو شده',
  voided: 'ابطال شده',
};

const REFUND_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  pending_approval: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  finalized: '#f97316',
  cancelled: '#64748b',
  voided: '#8b5cf6',
};

const CHEQUE_STATUS: Record<string, string> = {
  received: 'دریافت‌شده',
  in_custody: 'نزد صندوق',
  pending_due: 'در انتظار سررسید',
  deposited: 'واگذار‌شده به بانک',
  cleared: 'وصول‌شده',
  returned: 'برگشتی',
  refunded: 'استردادشده',
  voided: 'باطل‌شده',
  transferred: 'منتقل‌شده',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  submitted: 'ارسال برای تأیید',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  finalized: 'مسترد شد',
  cancelled: 'لغو شد',
  voided: 'ابطال شد',
  status_changed: 'تغییر وضعیت',
};

// Cheque statuses that allow refund
const REFUNDABLE_STATUSES = ['received', 'in_custody', 'pending_due', 'deposited', 'returned'];

// Cheque statuses that BLOCK refund
const BLOCKED_STATUSES = ['cleared', 'refunded', 'voided', 'transferred'];

export default function ChequeRefundsPage() {
  const { profile } = useAuth();
  const [refunds, setRefunds] = useState<ChequeRefund[]>([]);
  const [cheques, setCheques] = useState<ReceivedCheque[]>([]);
  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<ChequeRefund | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ id: string; reason: string } | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [historyDialog, setHistoryDialog] = useState<ChequeRefund | null>(null);
  const [submitSubmitting, setSubmitSubmitting] = useState(false);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [refundData, chqData, partyData, staffData] = await Promise.all([
        fetchData<ChequeRefund>('cheque_refunds', {
          orderBy: { createdAt: 'desc' },
          include: { history: { orderBy: { actionAt: 'desc' } } },
        }),
        fetchData<ReceivedCheque>('received_cheques', {
          orderBy: { createdAt: 'desc' },
          include: { operations: { orderBy: { operationDate: 'desc' } } },
        }),
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRefunds(refundData || []);
      setCheques(chqData || []);
      setContactParties(partyData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری استردادها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const partyName = (id: string | null | undefined) => {
    if (!id) return null;
    const p = contactParties.find((c) => c.id === id);
    if (!p) return null;
    if (p.type === 'individual') return `${p.firstName || ''} ${p.lastName || ''}`.trim() || null;
    return p.companyName || null;
  };

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const chequeById = (id: string) => cheques.find((c) => c.id === id);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return refunds.filter((r) => {
      const chq = chequeById(r.chequeId);
      const num = r.number.toLocaleLowerCase();
      const chqNum = chq?.chequeNumber?.toLocaleLowerCase() || '';
      const recipient = (r.recipientName || partyName(r.recipientPartyId) || '').toLocaleLowerCase();
      const matchesQuery = !query || num.includes(query) || chqNum.includes(query) || recipient.includes(query);
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchesQuery && matchesStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refunds, search, filterStatus, cheques, contactParties]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: refunds.length,
    pending: refunds.filter((r) => r.status === 'pending_approval').length,
    finalized: refunds.filter((r) => r.status === 'finalized').length,
    totalAmount: refunds.filter((r) => r.status === 'finalized').reduce((sum, r) => sum + Number(r.amount || 0), 0),
  }), [refunds]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این درخواست استرداد؟ این عملیات قابل بازگشت نیست.')) return;
    try {
      await deleteData('cheque_refunds', { id });
      toast.success('درخواست استرداد حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  // Validation: check if cheque can be refunded
  const canRefundCheque = (cheque: ReceivedCheque | undefined): { ok: boolean; reason?: string } => {
    if (!cheque) return { ok: false, reason: 'چک یافت نشد' };
    if (BLOCKED_STATUSES.includes(cheque.status)) {
      return { ok: false, reason: `چک در وضعیت «${CHEQUE_STATUS[cheque.status]}» قابل استرداد نیست` };
    }
    if (!REFUNDABLE_STATUSES.includes(cheque.status)) {
      return { ok: false, reason: `وضعیت چک («${CHEQUE_STATUS[cheque.status]}») اجازه استرداد نمی‌دهد` };
    }
    // Check if there's already a pending refund for this cheque
    const existingPending = refunds.find((r) => r.chequeId === cheque.id && ['draft', 'pending_approval', 'approved'].includes(r.status));
    if (existingPending) {
      return { ok: false, reason: 'برای این چک درخواست استرداد در جریان وجود دارد' };
    }
    return { ok: true };
  };

  // Submit for approval
  const handleSubmit = async (id: string) => {
    setSubmitSubmitting(true);
    try {
      const refund = refunds.find((r) => r.id === id);
      if (!refund) throw new Error('درخواست یافت نشد');
      const chq = chequeById(refund.chequeId);
      const check = canRefundCheque(chq);
      if (!check.ok) throw new Error(check.reason);

      await updateData('cheque_refunds', { id }, {
        status: 'pending_approval',
        settlementsChecked: true,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_refund_history', {
        refundId: id,
        action: 'submitted',
        actionBy: profile!.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'draft',
        toStatus: 'pending_approval',
        details: {},
      });

      toast.success('درخواست استرداد برای تأیید ارسال شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    } finally {
      setSubmitSubmitting(false);
    }
  };

  // Approve
  const handleApprove = async (id: string) => {
    if (!profile) return;
    try {
      await updateData('cheque_refunds', { id }, {
        status: 'approved',
        approvedBy: profile.id,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_refund_history', {
        refundId: id,
        action: 'approved',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'pending_approval',
        toStatus: 'approved',
        details: {},
      });

      toast.success('استرداد تأیید شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('تأیید ناموفق: ' + error.message);
    }
  };

  // Reject
  const handleReject = async () => {
    if (!rejectDialog || !profile) return;
    try {
      await updateData('cheque_refunds', { id: rejectDialog.id }, {
        status: 'rejected',
        rejectedReason: rejectDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_refund_history', {
        refundId: rejectDialog.id,
        action: 'rejected',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'pending_approval',
        toStatus: 'rejected',
        reason: rejectDialog.reason || null,
        details: {},
      });

      toast.success('استرداد رد شد');
      setRejectDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  // Finalize — changes cheque status to refunded, posts accounting effect
  const handleFinalize = async (id: string) => {
    if (!profile) return;
    try {
      const refund = refunds.find((r) => r.id === id);
      if (!refund) throw new Error('درخواست یافت نشد');
      const chq = chequeById(refund.chequeId);
      if (!chq) throw new Error('چک یافت نشد');

      // Final validation before finalizing
      const check = canRefundCheque(chq);
      if (!check.ok) throw new Error(check.reason);

      const previousStatus = chq.status;

      // Update cheque status to refunded
      await updateData('received_cheques', { id: chq.id }, {
        status: 'refunded',
        updatedAt: new Date().toISOString(),
      });

      // Record operation on cheque
      await createData('received_cheque_operations', {
        chequeId: chq.id,
        operationType: 'refund',
        fromStatus: previousStatus,
        toStatus: 'refunded',
        operationDate: new Date().toISOString(),
        operationBy: profile.id,
        counterpartyId: refund.recipientPartyId || null,
        counterpartyName: refund.recipientName || null,
        reason: refund.reason || null,
        journalEntryId: refund.journalEntryId || null,
        details: { refundId: id, refundNumber: refund.number },
      });

      // Update refund record
      await updateData('cheque_refunds', { id }, {
        status: 'finalized',
        finalizedBy: profile.id,
        finalizedAt: new Date().toISOString(),
        previousChequeStatus: previousStatus,
        accountingPosted: true,
        balanceAdjusted: true,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_refund_history', {
        refundId: id,
        action: 'finalized',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'approved',
        toStatus: 'finalized',
        details: { previousChequeStatus: previousStatus },
      });

      toast.success('چک مسترد شد و وضعیت به «استردادشده» تغییر کرد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('ثبت نهایی ناموفق: ' + error.message);
    }
  };

  // Cancel (before finalization)
  const handleCancel = async () => {
    if (!cancelDialog || !profile) return;
    try {
      await updateData('cheque_refunds', { id: cancelDialog.id }, {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_refund_history', {
        refundId: cancelDialog.id,
        action: 'cancelled',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: null,
        toStatus: 'cancelled',
        reason: cancelDialog.reason || null,
        details: {},
      });

      toast.success('درخواست استرداد لغو شد');
      setCancelDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  // Void (after finalization — reversal, restores cheque to previous status)
  const handleVoid = async () => {
    if (!voidDialog || !profile) return;
    try {
      const refund = refunds.find((r) => r.id === voidDialog.id);
      if (!refund) throw new Error('درخواست یافت نشد');

      // Restore cheque to previous status
      if (refund.previousChequeStatus) {
        await updateData('received_cheques', { id: refund.chequeId }, {
          status: refund.previousChequeStatus,
          updatedAt: new Date().toISOString(),
        });

        await createData('received_cheque_operations', {
          chequeId: refund.chequeId,
          operationType: 'amend',
          fromStatus: 'refunded',
          toStatus: refund.previousChequeStatus,
          operationDate: new Date().toISOString(),
          operationBy: profile.id,
          reason: `ابطال استرداد: ${voidDialog.reason}`,
          details: { refundId: voidDialog.id, voidReason: voidDialog.reason },
        });
      }

      // Update refund record
      await updateData('cheque_refunds', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
        accountingPosted: false,
        balanceAdjusted: false,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_refund_history', {
        refundId: voidDialog.id,
        action: 'voided',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'finalized',
        toStatus: 'voided',
        reason: voidDialog.reason || null,
        details: { restoredChequeStatus: refund.previousChequeStatus },
      });

      toast.success('استرداد ابطال شد و چک به وضعیت قبلی برگشت');
      setVoidDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('ابطال ناموفق: ' + error.message);
    }
  };

  const renderHistory = (history: ChequeRefundHistory[]) => (
    <div className="space-y-2">
      {history.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p>
        : history.map((h) => (
          <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
              {h.action === 'created' ? <FileText className="h-3.5 w-3.5" /> :
               h.action === 'approved' ? <CheckCircle className="h-3.5 w-3.5" /> :
               h.action === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> :
               h.action === 'finalized' ? <RotateCcw className="h-3.5 w-3.5" /> :
               h.action === 'voided' ? <Ban className="h-3.5 w-3.5" /> :
               h.action === 'cancelled' ? <XCircle className="h-3.5 w-3.5" /> :
               <Send className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{ACTION_LABEL[h.action] || h.action}</span>
                <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                توسط {staffName(h.actionBy)}
                {h.fromStatus && h.toStatus && <span className="mx-1">•</span>}
                {h.fromStatus && h.toStatus && <span>{REFUND_STATUS[h.fromStatus] || h.fromStatus} ← {REFUND_STATUS[h.toStatus] || h.toStatus}</span>}
                {h.reason && <div className="mt-1 text-rose-500">دلیل: {h.reason}</div>}
              </div>
            </div>
          </div>
        ))}
    </div>
  );

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">استرداد چک</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> استرداد چک</div>
        </div>
        <Link href="/dashboard/cheque-refunds/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت درخواست استرداد
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><RotateCcw className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل استردادها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">در انتظار تأیید</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f97316]/10 text-[#f97316]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.finalized.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مستردشده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><TrendingDown className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع مستردشده (تومان)</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره استرداد، چک، گیرنده..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه وضعیت‌ها</option>
          {Object.entries(REFUND_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : refunds.length === 0 ? (
        <Card><EmptyState icon={<RotateCcw className="h-8 w-8" />} title="استردادی یافت نشد" description="برای شروع، اولین درخواست استرداد چک را ثبت کنید" action={<Link href="/dashboard/cheque-refunds/new"><Button><Plus className="h-4 w-4" /> افزودن استرداد</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((r) => {
              const stColor = REFUND_STATUS_COLOR[r.status] || '#64748b';
              const chq = chequeById(r.chequeId);
              return (
                <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => setDetailItem(r)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{r.number}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{REFUND_STATUS[r.status] || r.status}</Badge>
                      {chq && <span className="text-xs text-[#98A2B3]">چک: {chq.chequeNumber}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.recipientName || partyName(r.recipientPartyId) || '—'}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.refundDate)}</span>
                      {r.reason && <span className="truncate">علت: {r.reason}</span>}
                      <span>{relativeTime(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(r.amount))}</div>
                    <div className="text-[10px] text-[#98A2B3]">مبلغ چک</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(r); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && (r.status === 'draft' || r.status === 'rejected') && <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              );
            })}
            {pageItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
              <span className="text-xs text-[#667085]">صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detailItem && (() => {
            const stColor = REFUND_STATUS_COLOR[detailItem.status] || '#64748b';
            const chq = chequeById(detailItem.chequeId);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">استرداد چک {detailItem.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailItem)}><RotateCcw className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && (detailItem.status === 'draft' || detailItem.status === 'rejected') && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{REFUND_STATUS[detailItem.status] || detailItem.status}</Badge>
                    {detailItem.accountingPosted && <Badge variant="outline" className="border-indigo-200 text-indigo-600"><FileCheck className="ml-1 h-3 w-3" />اثر حسابداری ثبت شد</Badge>}
                    {detailItem.balanceAdjusted && <Badge variant="outline" className="border-green-200 text-green-600"><CheckCircle className="ml-1 h-3 w-3" />مانده طرف حساب اصلاح شد</Badge>}
                  </div>

                  {/* Cheque info */}
                  {chq && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2"><WalletCards className="h-4 w-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">چک مورد استرداد</span></div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1"><Hash className="h-3 w-3 text-slate-400" />{chq.chequeNumber}</div>
                        <div className="flex items-center gap-1"><Building2 className="h-3 w-3 text-slate-400" />{chq.bankName}</div>
                        <div className="flex items-center gap-1"><Banknote className="h-3 w-3 text-slate-400" />{formatToman(Number(chq.amount))} تومان</div>
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" />سررسید: {formatJalali(chq.dueDate)}</div>
                        <div className="col-span-2"><Badge variant="outline" style={{ color: '#64748b' }}>وضعیت فعلی چک: {CHEQUE_STATUS[chq.status] || chq.status}</Badge></div>
                      </div>
                    </div>
                  )}

                  {/* Refund info grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">گیرنده استرداد</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{detailItem.recipientName || partyName(detailItem.recipientPartyId) || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">مبلغ</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailItem.amount))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ استرداد</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatJalali(detailItem.refundDate)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">درخواست‌کننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.createdBy)}</div></div>
                    {detailItem.approvedBy && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">تأییدکننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.approvedBy)}</div></div>}
                    {detailItem.finalizedBy && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">ثبت‌کننده نهایی</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.finalizedBy)}</div></div>}
                  </div>

                  {/* Reason & description */}
                  {detailItem.reason && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-sm text-amber-800"><strong>علت استرداد: </strong>{detailItem.reason}</p></div>}
                  {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}
                  {detailItem.rejectedReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل رد: </strong>{detailItem.rejectedReason}</p></div>}
                  {detailItem.voidReason && <div className="rounded-lg bg-violet-50 p-3"><p className="text-sm text-violet-700"><strong>دلیل ابطال: </strong>{detailItem.voidReason}</p></div>}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detailItem.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" onClick={() => handleSubmit(detailItem.id)} disabled={submitSubmitting}><Send className="h-4 w-4" /> ارسال برای تأیید</Button>
                    )}
                    {detailItem.status === 'pending_approval' && isSuperAdmin && (
                      <>
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApprove(detailItem.id)}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectDialog({ id: detailItem.id, reason: '' })}><XCircle className="h-4 w-4" /> رد</Button>
                      </>
                    )}
                    {detailItem.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50" onClick={() => handleFinalize(detailItem.id)}><RotateCcw className="h-4 w-4" /> ثبت نهایی استرداد</Button>
                    )}
                    {isSuperAdmin && !['finalized', 'voided', 'cancelled'].includes(detailItem.status) && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => setCancelDialog({ id: detailItem.id, reason: '' })}><AlertTriangle className="h-4 w-4" /> لغو درخواست</Button>
                    )}
                    {detailItem.status === 'finalized' && isSuperAdmin && (
                      <Button variant="outline" className="border-violet-200 text-violet-600 hover:bg-violet-50" onClick={() => setVoidDialog({ id: detailItem.id, reason: '' })}><Ban className="h-4 w-4" /> ابطال استرداد</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>رد درخواست استرداد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل رد</Label>
              <Input value={rejectDialog?.reason || ''} onChange={(e) => setRejectDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل رد..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>انصراف</Button>
            <Button onClick={handleReject}>رد استرداد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>لغو درخواست استرداد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">با لغو درخواست، این درخواست به وضعیت «لغو شده» تغییر می‌کند و چک در وضعیت قبلی خود باقی می‌ماند.</div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل لغو</Label>
              <Input value={cancelDialog?.reason || ''} onChange={(e) => setCancelDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل لغو..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleCancel}>لغو درخواست</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ابطال استرداد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700">با ابطال استرداد، اثر حسابداری اصلاح می‌شود و وضعیت چک به وضعیت معتبر قبلی ({detailItem?.previousChequeStatus ? CHEQUE_STATUS[detailItem.previousChequeStatus] || detailItem.previousChequeStatus : '—'}) برمی‌گردد. رکورد استرداد حذف نمی‌شود و سابقه حفظ می‌شود.</div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل ابطال <span className="text-rose-500">*</span></Label>
              <Textarea value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل ابطال استرداد..." className="rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidDialog?.reason}>ابطال استرداد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه استرداد</DialogTitle></DialogHeader>
          {historyDialog && renderHistory(historyDialog.history || [])}
        </DialogContent>
      </Dialog>
    </div>
  );
}
