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
  Banknote, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, TrendingUp, Send, Eye,
  AlertTriangle, FileCheck, Ban, FileText, Hash, Building2, User,
  WalletCards, Undo2,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  ChequeClearing, ChequeClearingHistory, MyCheque, BankAccount, Profile,
} from '@/lib/types';

const CLEARING_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending_approval: 'در انتظار تأیید',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  finalized: 'وصول‌شده',
  cancelled: 'لغو شده',
  reversed: 'برگشت وصول',
};

const CLEARING_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  pending_approval: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  finalized: '#3b82f6',
  cancelled: '#64748b',
  reversed: '#8b5cf6',
};

const CHEQUE_STATUS: Record<string, string> = {
  issued: 'صادرشده',
  in_clearing: 'در حال وصول',
  cleared: 'وصول‌شده',
  returned: 'برگشتی',
  voided: 'باطل‌شده',
  reversed: 'برگشت‌خورده',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  submitted: 'ارسال برای تأیید',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  finalized: 'وصول شد',
  cancelled: 'لغو شد',
  reversed: 'برگشت وصول',
  status_changed: 'تغییر وضعیت',
};

const CLEARABLE_STATUSES = ['issued', 'in_clearing'];
const BLOCKED_STATUSES = ['cleared', 'voided', 'reversed'];

export default function ChequeClearingsPage() {
  const { profile } = useAuth();
  const [clearings, setClearings] = useState<ChequeClearing[]>([]);
  const [cheques, setCheques] = useState<MyCheque[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<ChequeClearing | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ id: string; reason: string } | null>(null);
  const [reverseDialog, setReverseDialog] = useState<{ id: string; reason: string } | null>(null);
  const [historyDialog, setHistoryDialog] = useState<ChequeClearing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clData, chqData, baData, staffData] = await Promise.all([
        fetchData<ChequeClearing>('cheque_clearings', {
          orderBy: { createdAt: 'desc' },
          include: { history: { orderBy: { actionAt: 'desc' } } },
        }),
        fetchData<MyCheque>('my_cheques', {
          where: { type: 'issued' },
          orderBy: { createdAt: 'desc' },
          include: { bankAccount: true },
        }),
        fetchData<BankAccount>('bank_accounts', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setClearings(clData || []);
      setCheques(chqData || []);
      setBankAccounts(baData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری وصول‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const bankAccountName = (id: string | null | undefined) => {
    if (!id) return null;
    const ba = bankAccounts.find((b) => b.id === id);
    return ba ? `${ba.bankName} - ${ba.accountNo}` : null;
  };

  const chequeById = (id: string) => cheques.find((c) => c.id === id);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return clearings.filter((c) => {
      const num = c.number.toLocaleLowerCase();
      const chqNum = c.chequeNumber?.toLocaleLowerCase() || '';
      const payee = (c.payee || '').toLocaleLowerCase();
      const matchesQuery = !query || num.includes(query) || chqNum.includes(query) || payee.includes(query);
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchesQuery && matchesStatus;
    });
  }, [clearings, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: clearings.length,
    pending: clearings.filter((c) => c.status === 'pending_approval').length,
    finalized: clearings.filter((c) => c.status === 'finalized').length,
    totalAmount: clearings.filter((c) => c.status === 'finalized').reduce((sum, c) => sum + Number(c.amount || 0), 0),
  }), [clearings]);

  const canClearCheque = (cheque: MyCheque | undefined): { ok: boolean; reason?: string } => {
    if (!cheque) return { ok: false, reason: 'چک یافت نشد' };
    if (BLOCKED_STATUSES.includes(cheque.status)) {
      return { ok: false, reason: `چک در وضعیت «${CHEQUE_STATUS[cheque.status]}» قابل وصول نیست` };
    }
    if (!CLEARABLE_STATUSES.includes(cheque.status)) {
      return { ok: false, reason: `وضعیت چک («${CHEQUE_STATUS[cheque.status]}») اجازه وصول نمی‌دهد` };
    }
    const existingPending = clearings.find((c) => c.chequeId === cheque.id && ['draft', 'pending_approval', 'approved'].includes(c.status));
    if (existingPending) {
      return { ok: false, reason: 'برای این چک درخواست وصول در جریان وجود دارد' };
    }
    return { ok: true };
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این درخواست وصول؟ این عملیات قابل بازگشت نیست.')) return;
    try {
      await deleteData('cheque_clearings', { id });
      toast.success('درخواست وصول حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleSubmit = async (id: string) => {
    setSubmitting(true);
    try {
      const clr = clearings.find((c) => c.id === id);
      if (!clr) throw new Error('درخواست یافت نشد');
      const chq = chequeById(clr.chequeId);
      const check = canClearCheque(chq);
      if (!check.ok) throw new Error(check.reason);

      // Validate due date
      const dueDate = chq?.dueDate ? new Date(chq.dueDate) : null;
      const now = new Date();
      const isBeforeDue = dueDate && dueDate > now;

      await updateData('cheque_clearings', { id }, {
        status: 'pending_approval',
        dueDateChecked: true,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_clearing_history', {
        clearingId: id,
        action: 'submitted',
        actionBy: profile!.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'draft',
        toStatus: 'pending_approval',
        details: { dueDateChecked: true, isBeforeDue: !!isBeforeDue },
      });

      if (isBeforeDue) {
        toast.warning('توجه: تاریخ وصول قبل از سررسید چک است. درخواست ارسال شد اما نیاز به بررسی دارد.');
      } else {
        toast.success('درخواست وصول برای تأیید ارسال شد');
      }
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!profile) return;
    try {
      // Validate bank account is active
      const clr = clearings.find((c) => c.id === id);
      if (!clr) throw new Error('درخواست یافت نشد');
      const ba = bankAccounts.find((b) => b.id === clr.bankAccountId);
      if (ba && !ba.active) throw new Error('حساب بانکی مقصد غیرفعال است');

      await updateData('cheque_clearings', { id }, {
        status: 'approved',
        approvedBy: profile.id,
        approvedAt: new Date().toISOString(),
        bankAccountActiveChecked: true,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_clearing_history', {
        clearingId: id,
        action: 'approved',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'pending_approval',
        toStatus: 'approved',
        details: { bankAccountActive: ba ? ba.active : null },
      });

      toast.success('وصول تأیید شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('تأیید ناموفق: ' + error.message);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !profile) return;
    try {
      await updateData('cheque_clearings', { id: rejectDialog.id }, {
        status: 'rejected',
        rejectedReason: rejectDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_clearing_history', {
        clearingId: rejectDialog.id,
        action: 'rejected',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'pending_approval',
        toStatus: 'rejected',
        reason: rejectDialog.reason || null,
        details: {},
      });

      toast.success('وصول رد شد');
      setRejectDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  // Finalize — changes cheque status to cleared, updates cleared_amount
  const handleFinalize = async (id: string) => {
    if (!profile) return;
    try {
      const clr = clearings.find((c) => c.id === id);
      if (!clr) throw new Error('درخواست یافت نشد');
      const chq = chequeById(clr.chequeId);
      if (!chq) throw new Error('چک یافت نشد');

      const check = canClearCheque(chq);
      if (!check.ok) throw new Error(check.reason);

      // Validate clearing amount doesn't exceed cheque amount
      const clearingAmount = Number(clr.amount);
      const chequeAmount = Number(chq.amount);
      const alreadyCleared = Number(chq.clearedAmount || 0);
      if (clearingAmount + alreadyCleared > chequeAmount) {
        throw new Error('مبلغ وصول بیشتر از مانده چک است');
      }

      const previousStatus = chq.status;
      const newClearedAmount = alreadyCleared + clearingAmount;
      const isFullClearing = newClearedAmount >= chequeAmount;
      const newChequeStatus = isFullClearing ? 'cleared' : 'in_clearing';

      // Update cheque status and cleared amount
      await updateData('my_cheques', { id: chq.id }, {
        status: newChequeStatus,
        clearedAmount: newClearedAmount,
        clearedDate: new Date().toISOString(),
        previousStatus: previousStatus,
        updatedAt: new Date().toISOString(),
      });

      // Update clearing record
      await updateData('cheque_clearings', { id }, {
        status: 'finalized',
        finalizedBy: profile.id,
        finalizedAt: new Date().toISOString(),
        previousChequeStatus: previousStatus,
        accountingPosted: true,
        obligationClosed: isFullClearing,
        remainingAmount: chequeAmount - newClearedAmount,
        isPartial: !isFullClearing,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_clearing_history', {
        clearingId: id,
        action: 'finalized',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'approved',
        toStatus: 'finalized',
        amount: clearingAmount,
        details: {
          previousChequeStatus: previousStatus,
          newChequeStatus,
          newClearedAmount,
          isFullClearing,
          remainingAmount: chequeAmount - newClearedAmount,
        },
      });

      toast.success(isFullClearing ? 'چک وصول شد و وضعیت به «وصول‌شده» تغییر کرد' : 'وصول جزئی ثبت شد. چک در وضعیت «در حال وصول» باقی می‌ماند.');
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
      await updateData('cheque_clearings', { id: cancelDialog.id }, {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_clearing_history', {
        clearingId: cancelDialog.id,
        action: 'cancelled',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        toStatus: 'cancelled',
        reason: cancelDialog.reason || null,
        details: {},
      });

      toast.success('درخواست وصول لغو شد');
      setCancelDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  // Reverse (after finalization — bank returned the cheque)
  const handleReverse = async () => {
    if (!reverseDialog || !profile) return;
    try {
      const clr = clearings.find((c) => c.id === reverseDialog.id);
      if (!clr) throw new Error('درخواست یافت نشد');

      const chq = chequeById(clr.chequeId);
      if (!chq) throw new Error('چک یافت نشد');

      // Restore cheque: reduce cleared amount, restore status
      const clearingAmount = Number(clr.amount);
      const currentCleared = Number(chq.clearedAmount || 0);
      const newClearedAmount = Math.max(0, currentCleared - clearingAmount);
      const restoredStatus = clr.previousChequeStatus || 'issued';

      await updateData('my_cheques', { id: chq.id }, {
        status: restoredStatus,
        clearedAmount: newClearedAmount,
        clearedDate: newClearedAmount > 0 ? chq.clearedDate : null,
        previousStatus: null,
        updatedAt: new Date().toISOString(),
      });

      // Update clearing record
      await updateData('cheque_clearings', { id: reverseDialog.id }, {
        status: 'reversed',
        reversedBy: profile.id,
        reversedAt: new Date().toISOString(),
        reverseReason: reverseDialog.reason || null,
        accountingPosted: false,
        obligationClosed: false,
        updatedAt: new Date().toISOString(),
      });

      await createData('cheque_clearing_history', {
        clearingId: reverseDialog.id,
        action: 'reversed',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'finalized',
        toStatus: 'reversed',
        reason: reverseDialog.reason || null,
        amount: clearingAmount,
        details: {
          restoredChequeStatus: restoredStatus,
          newClearedAmount,
        },
      });

      toast.success('وصول برگشت داده شد و چک به وضعیت قبلی بازگشت');
      setReverseDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('برگشت وصول ناموفق: ' + error.message);
    }
  };

  const renderHistory = (history: ChequeClearingHistory[]) => (
    <div className="space-y-2">
      {history.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p>
        : history.map((h) => (
          <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
              {h.action === 'created' ? <FileText className="h-3.5 w-3.5" /> :
               h.action === 'approved' ? <CheckCircle className="h-3.5 w-3.5" /> :
               h.action === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> :
               h.action === 'finalized' ? <Banknote className="h-3.5 w-3.5" /> :
               h.action === 'reversed' ? <Undo2 className="h-3.5 w-3.5" /> :
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
                {h.fromStatus && h.toStatus && <span>{CLEARING_STATUS[h.fromStatus] || h.fromStatus} ← {CLEARING_STATUS[h.toStatus] || h.toStatus}</span>}
                {h.amount != null && <span className="mx-1">•</span>}
                {h.amount != null && <span>مبلغ: {formatToman(Number(h.amount))}</span>}
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
            <h1 className="text-[28px] font-bold text-[#101828]">وصول چک پرداختی</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> وصول چک پرداختی</div>
        </div>
        <Link href="/dashboard/cheque-clearings/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت درخواست وصول
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Banknote className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل وصول‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">در انتظار تأیید</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3b82f6]/10 text-[#3b82f6]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.finalized.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">وصول‌شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><TrendingUp className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع وصول‌شده (تومان)</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره وصول، چک، دریافت‌کننده..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه وضعیت‌ها</option>
          {Object.entries(CLEARING_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : clearings.length === 0 ? (
        <Card><EmptyState icon={<Banknote className="h-8 w-8" />} title="وصولی یافت نشد" description="برای شروع، اولین درخواست وصول چک پرداختی را ثبت کنید" action={<Link href="/dashboard/cheque-clearings/new"><Button><Plus className="h-4 w-4" /> افزودن وصول</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((c) => {
              const stColor = CLEARING_STATUS_COLOR[c.status] || '#64748b';
              const chq = chequeById(c.chequeId);
              return (
                <div key={c.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => setDetailItem(c)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{c.number}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{CLEARING_STATUS[c.status] || c.status}</Badge>
                      {chq && <span className="text-xs text-[#98A2B3]">چک: {chq.chequeNumber}</span>}
                      {c.isPartial && <Badge variant="outline" className="shrink-0 border-amber-200 text-amber-600 text-[10px]">وصول جزئی</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.payee || '—'}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(c.clearingDate)}</span>
                      {c.bankAccountName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{c.bankAccountName}</span>}
                      <span>{relativeTime(c.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(c.amount))}</div>
                    <div className="text-[10px] text-[#98A2B3]">مبلغ وصول</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(c); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && (c.status === 'draft' || c.status === 'rejected') && <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
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
            const stColor = CLEARING_STATUS_COLOR[detailItem.status] || '#64748b';
            const chq = chequeById(detailItem.chequeId);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">وصول چک {detailItem.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailItem)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && (detailItem.status === 'draft' || detailItem.status === 'rejected') && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{CLEARING_STATUS[detailItem.status] || detailItem.status}</Badge>
                    {detailItem.isPartial && <Badge variant="outline" className="border-amber-200 text-amber-600">وصول جزئی</Badge>}
                    {detailItem.accountingPosted && <Badge variant="outline" className="border-indigo-200 text-indigo-600"><FileCheck className="ml-1 h-3 w-3" />اثر حسابداری ثبت شد</Badge>}
                    {detailItem.obligationClosed && <Badge variant="outline" className="border-green-200 text-green-600"><CheckCircle className="ml-1 h-3 w-3" />تعهد بسته شد</Badge>}
                    {detailItem.dueDateChecked && <Badge variant="outline" className="border-blue-200 text-blue-600"><CheckCircle className="ml-1 h-3 w-3" />سررسید کنترل شد</Badge>}
                    {detailItem.bankAccountActiveChecked && <Badge variant="outline" className="border-cyan-200 text-cyan-600"><CheckCircle className="ml-1 h-3 w-3" />حساب بانکی فعال</Badge>}
                  </div>

                  {/* Cheque info */}
                  {chq && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2"><WalletCards className="h-4 w-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">چک پرداختی مورد وصول</span></div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1"><Hash className="h-3 w-3 text-slate-400" />{chq.chequeNumber}</div>
                        <div className="flex items-center gap-1"><Building2 className="h-3 w-3 text-slate-400" />{chq.bankAccount?.bankName || '—'}</div>
                        <div className="flex items-center gap-1"><Banknote className="h-3 w-3 text-slate-400" />{formatToman(Number(chq.amount))} تومان</div>
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" />سررسید: {chq.dueDate ? formatJalali(chq.dueDate) : '—'}</div>
                        <div className="col-span-2"><Badge variant="outline" style={{ color: '#64748b' }}>وضعیت فعلی چک: {CHEQUE_STATUS[chq.status] || chq.status}</Badge></div>
                        {Number(chq.clearedAmount) > 0 && <div className="col-span-2 text-slate-500">وصول‌شده تاکنون: {formatToman(Number(chq.clearedAmount))} تومان</div>}
                      </div>
                    </div>
                  )}

                  {/* Clearing info grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">مبلغ وصول</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatToman(Number(detailItem.amount))}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">مانده چک</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailItem.remainingAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ وصول</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatJalali(detailItem.clearingDate)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">حساب بانکی مقصد</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailItem.bankAccountName || bankAccountName(detailItem.bankAccountId) || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">دریافت‌کننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailItem.payee || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">درخواست‌کننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.createdBy)}</div></div>
                    {detailItem.approvedBy && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">تأییدکننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.approvedBy)}</div></div>}
                    {detailItem.finalizedBy && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">ثبت‌کننده نهایی</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.finalizedBy)}</div></div>}
                  </div>

                  {/* Reason & description */}
                  {detailItem.reason && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-sm text-amber-800"><strong>علت وصول: </strong>{detailItem.reason}</p></div>}
                  {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}
                  {detailItem.rejectedReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل رد: </strong>{detailItem.rejectedReason}</p></div>}
                  {detailItem.reverseReason && <div className="rounded-lg bg-violet-50 p-3"><p className="text-sm text-violet-700"><strong>دلیل برگشت وصول: </strong>{detailItem.reverseReason}</p></div>}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detailItem.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" onClick={() => handleSubmit(detailItem.id)} disabled={submitting}><Send className="h-4 w-4" /> ارسال برای تأیید</Button>
                    )}
                    {detailItem.status === 'pending_approval' && isSuperAdmin && (
                      <>
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApprove(detailItem.id)}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectDialog({ id: detailItem.id, reason: '' })}><XCircle className="h-4 w-4" /> رد</Button>
                      </>
                    )}
                    {detailItem.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleFinalize(detailItem.id)}><Banknote className="h-4 w-4" /> ثبت نهایی وصول</Button>
                    )}
                    {isSuperAdmin && !['finalized', 'reversed', 'cancelled'].includes(detailItem.status) && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => setCancelDialog({ id: detailItem.id, reason: '' })}><AlertTriangle className="h-4 w-4" /> لغو درخواست</Button>
                    )}
                    {detailItem.status === 'finalized' && isSuperAdmin && (
                      <Button variant="outline" className="border-violet-200 text-violet-600 hover:bg-violet-50" onClick={() => setReverseDialog({ id: detailItem.id, reason: '' })}><Undo2 className="h-4 w-4" /> برگشت وصول</Button>
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
          <DialogHeader><DialogTitle>رد درخواست وصول</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل رد</Label>
              <Input value={rejectDialog?.reason || ''} onChange={(e) => setRejectDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل رد..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>انصراف</Button>
            <Button onClick={handleReject}>رد وصول</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>لغو درخواست وصول</DialogTitle></DialogHeader>
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

      {/* Reverse Dialog */}
      <Dialog open={!!reverseDialog} onOpenChange={(o) => !o && setReverseDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>برگشت وصول</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-violet-50 p-3 text-sm text-violet-700">با برگشت وصول، اثر حسابداری اصلاح می‌شود، مبلغ وصول‌شده از چک کسر می‌گردد و وضعیت چک به وضعیت قبلی ({detailItem?.previousChequeStatus ? CHEQUE_STATUS[detailItem.previousChequeStatus] || detailItem.previousChequeStatus : '—'}) برمی‌گردد. رکورد وصول حذف نمی‌شود و سابقه حفظ می‌شود.</div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل برگشت وصول <span className="text-rose-500">*</span></Label>
              <Textarea value={reverseDialog?.reason || ''} onChange={(e) => setReverseDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="مثلاً: برگشت بانکی، چک برگشتی..." className="rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleReverse} disabled={!reverseDialog?.reason}>برگشت وصول</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه وصول</DialogTitle></DialogHeader>
          {historyDialog && renderHistory(historyDialog.history || [])}
        </DialogContent>
      </Dialog>
    </div>
  );
}
