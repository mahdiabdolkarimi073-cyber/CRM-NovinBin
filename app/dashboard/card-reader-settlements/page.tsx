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
  ArrowRightLeft, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, TrendingUp, Send, Eye, AlertTriangle,
  Ban, FileText, Building2, CreditCard, Receipt, Wallet, ShieldCheck,
  RotateCcw, FileCheck, Hash, AlertCircle,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  CardReader, CardReaderTransaction, CardReaderSettlement,
  CardReaderSettlementItem, CardReaderSettlementHistory,
  BankAccount, Profile,
} from '@/lib/types';

const SETTLEMENT_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending_approval: 'در انتظار تأیید',
  approved: 'تأیید شده',
  finalized: 'تسویه نهایی',
  cancelled: 'لغو شده',
  voided: 'باطل شده',
};

const SETTLEMENT_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  pending_approval: '#f59e0b',
  approved: '#10b981',
  finalized: '#3b82f6',
  cancelled: '#64748b',
  voided: '#ef4444',
};

const ITEM_STATUS: Record<string, string> = {
  open: 'باز',
  partial: 'جزئی',
  settled: 'تسویه‌شده',
  discrepancy: 'مغایر',
  voided: 'باطل شده',
};

const ITEM_STATUS_COLOR: Record<string, string> = {
  open: '#94a3b8',
  partial: '#f59e0b',
  settled: '#10b981',
  discrepancy: '#f97316',
  voided: '#ef4444',
};

const TXN_STATUS: Record<string, string> = {
  registered: 'ثبت‌شده',
  confirmed: 'تأیید شده',
  pending_settlement: 'در انتظار تسویه',
  settled: 'تسویه‌شده',
  failed: 'ناموفق',
  returned: 'برگشتی',
  discrepancy: 'مغایر',
  cancelled: 'لغو شده',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  submitted: 'ارسال برای تأیید',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  finalized: 'تسویه نهایی شد',
  cancelled: 'لغو شد',
  voided: 'باطل شد',
  status_changed: 'تغییر وضعیت',
};

const DISCREPANCY_TYPE: Record<string, string> = {
  short: 'کمتر از انتظار',
  excess: 'بیشتر از انتظار',
  timing: 'اختلاف زمانی',
  commission: 'اختلاف کارمزد',
  other: 'سایر',
};

export default function CardReaderSettlementsPage() {
  const { profile } = useAuth();
  const [settlements, setSettlements] = useState<CardReaderSettlement[]>([]);
  const [readers, setReaders] = useState<CardReader[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReader, setFilterReader] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<CardReaderSettlement | null>(null);
  const [detailItems, setDetailItems] = useState<CardReaderSettlementItem[]>([]);
  const [detailHistory, setDetailHistory] = useState<CardReaderSettlementHistory[]>([]);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ id: string; reason: string } | null>(null);
  const [finalizeDialog, setFinalizeDialog] = useState<{
    id: string; settledAmount: string; transferTrackingNumber: string;
    transferReferenceNumber: string; transferDate: string; transferNote: string;
    discrepancyAmount: string; discrepancyType: string; discrepancyNote: string;
  } | null>(null);
  const [historyDialog, setHistoryDialog] = useState<CardReaderSettlement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sData, rData, baData, staffData] = await Promise.all([
        fetchData<CardReaderSettlement>('card_reader_settlements', {
          orderBy: { createdAt: 'desc' },
          include: {
            cardReader: true,
            items: { include: { transaction: true } },
            history: { orderBy: { actionAt: 'desc' } },
          },
        }),
        fetchData<CardReader>('card_readers', { where: {} }),
        fetchData<BankAccount>('bank_accounts', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setSettlements(sData || []);
      setReaders(rData || []);
      setBankAccounts(baData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری تسویه‌ها ناموفق: ' + error.message);
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

  const readerById = (id: string) => readers.find((r) => r.id === id);
  const readerLabel = (id: string | null | undefined) => {
    if (!id) return '—';
    const r = readerById(id);
    return r ? `${r.bankName} - TID: ${r.tid}` : '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return settlements.filter((s) => {
      const matches = !q || s.number.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || s.status === filterStatus;
      const rd = filterReader === 'all' || s.cardReaderId === filterReader;
      return matches && st && rd;
    });
  }, [settlements, search, filterStatus, filterReader]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: settlements.length,
    pending: settlements.filter((s) => s.status === 'pending_approval').length,
    finalized: settlements.filter((s) => s.status === 'finalized').length,
    finalizedAmount: settlements.filter((s) => s.status === 'finalized').reduce((sum, s) => sum + Number(s.settledAmount || 0), 0),
    discrepancy: settlements.filter((s) => Number(s.discrepancyAmount) > 0).length,
  }), [settlements]);

  const loadDetail = async (sett: CardReaderSettlement) => {
    setDetailItem(sett);
    try {
      const [iData, hData] = await Promise.all([
        fetchData<CardReaderSettlementItem>('card_reader_settlement_items', {
          where: { settlementId: sett.id },
          include: { transaction: true },
        }),
        fetchData<CardReaderSettlementHistory>('card_reader_settlement_history', {
          where: { settlementId: sett.id },
          orderBy: { actionAt: 'desc' },
        }),
      ]);
      setDetailItems(iData || []);
      setDetailHistory(hData || []);
    } catch (error: any) {
      toast.error('بارگذاری جزئیات ناموفق: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این سند تسویه؟ تراکنش‌های مرتبط آزاد می‌شوند.')) return;
    try {
      const sett = settlements.find((s) => s.id === id);
      if (sett) {
        for (const item of sett.items || []) {
          await updateData('card_reader_transactions', { id: item.transactionId }, {
            status: 'confirmed',
            settlementId: null,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      await deleteData('card_reader_settlements', { id });
      toast.success('سند تسویه حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleSubmit = async (id: string) => {
    if (!profile) return;
    try {
      await updateData('card_reader_settlements', { id }, {
        status: 'pending_approval',
        updatedAt: new Date().toISOString(),
      });
      await createData('card_reader_settlement_history', {
        settlementId: id,
        action: 'submitted',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'draft',
        toStatus: 'pending_approval',
        details: {},
      });
      toast.success('سند تسویه برای تأیید ارسال شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleApprove = async (id: string) => {
    if (!profile) return;
    try {
      const sett = settlements.find((s) => s.id === id);
      if (!sett) throw new Error('سند یافت نشد');
      const ba = bankAccounts.find((b) => b.id === sett.bankAccountId);
      if (ba && !ba.active) throw new Error('حساب بانکی مقصد غیرفعال است');

      await updateData('card_reader_settlements', { id }, {
        status: 'approved',
        approvedBy: profile.id,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await createData('card_reader_settlement_history', {
        settlementId: id,
        action: 'approved',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'pending_approval',
        toStatus: 'approved',
        details: { bankAccountActive: ba ? ba.active : null },
      });
      toast.success('تسویه تأیید شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('تأیید ناموفق: ' + error.message);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !profile) return;
    try {
      await updateData('card_reader_settlements', { id: rejectDialog.id }, {
        status: 'draft',
        rejectedReason: rejectDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });
      await createData('card_reader_settlement_history', {
        settlementId: rejectDialog.id,
        action: 'rejected',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'pending_approval',
        toStatus: 'draft',
        reason: rejectDialog.reason || null,
        details: {},
      });
      toast.success('تسویه رد شد و به پیش‌نویس بازگشت');
      setRejectDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const openFinalize = (sett: CardReaderSettlement) => {
    setFinalizeDialog({
      id: sett.id,
      settledAmount: String(Number(sett.netAmount)),
      transferTrackingNumber: '',
      transferReferenceNumber: '',
      transferDate: '',
      transferNote: '',
      discrepancyAmount: '',
      discrepancyType: '',
      discrepancyNote: '',
    });
  };

  const handleFinalize = async () => {
    if (!finalizeDialog || !profile) return;
    const d = finalizeDialog;
    if (!d.settledAmount) { toast.error('مبلغ واریزشده الزامی است'); return; }
    if (!d.transferTrackingNumber && !d.transferReferenceNumber) { toast.error('شماره پیگیری یا مرجع واریز الزامی است'); return; }

    setSubmitting(true);
    try {
      const sett = settlements.find((s) => s.id === d.id);
      if (!sett) throw new Error('سند یافت نشد');

      const settledAmt = Number(d.settledAmount);
      const expectedNet = Number(sett.netAmount);
      const discAmt = d.discrepancyAmount ? Number(d.discrepancyAmount) : Math.abs(settledAmt - expectedNet);
      const hasDiscrepancy = discAmt > 0;

      // Update settlement
      await updateData('card_reader_settlements', { id: d.id }, {
        status: 'finalized',
        finalizedBy: profile.id,
        finalizedAt: new Date().toISOString(),
        settledAmount: settledAmt,
        discrepancyAmount: discAmt,
        discrepancyType: hasDiscrepancy ? (d.discrepancyType || (settledAmt < expectedNet ? 'short' : 'excess')) : null,
        discrepancyNote: hasDiscrepancy ? (d.discrepancyNote || null) : null,
        accountingPosted: true,
        closedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update items and transactions
      const items = sett.items || [];
      for (const item of items) {
        await updateData('card_reader_settlement_items', { id: item.id }, {
          itemStatus: hasDiscrepancy ? 'discrepancy' : 'settled',
          settledAmount: Number(item.netAmount),
          discrepancyAmount: hasDiscrepancy ? discAmt : 0,
          discrepancyNote: hasDiscrepancy ? (d.discrepancyNote || null) : null,
        });
        await updateData('card_reader_transactions', { id: item.transactionId }, {
          status: 'settled',
          updatedAt: new Date().toISOString(),
        });
      }

      // History
      await createData('card_reader_settlement_history', {
        settlementId: d.id,
        action: 'finalized',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'approved',
        toStatus: 'finalized',
        amount: settledAmt,
        details: {
          settledAmount: settledAmt,
          expectedNet,
          discrepancyAmount: discAmt,
          hasDiscrepancy,
          transferTrackingNumber: d.transferTrackingNumber || null,
          transferReferenceNumber: d.transferReferenceNumber || null,
          transferDate: d.transferDate || null,
          itemCount: items.length,
        },
      });

      // Reader history
      if (sett.cardReaderId) {
        await createData('card_reader_history', {
          cardReaderId: sett.cardReaderId,
          action: 'settlement',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          amount: settledAmt,
          details: { settlementNumber: sett.number, hasDiscrepancy },
        });
      }

      // Create receipt
      try {
        await createData('receipts', {
          number: `RC-CRS-${Date.now()}`,
          amount: settledAmt,
          date: d.transferDate ? new Date(d.transferDate).toISOString() : new Date().toISOString(),
          bankAccountId: sett.bankAccountId || null,
          trackingNumber: d.transferTrackingNumber || null,
          referenceNumber: d.transferReferenceNumber || null,
          description: `واریز تسویه کارتخوان ${sett.number} - ${readerLabel(sett.cardReaderId)}`,
          status: 'confirmed',
          createdBy: profile.id,
        });
      } catch {}

      if (hasDiscrepancy) {
        toast.warning(`تسویه نهایی شد با مغایرت ${formatToman(discAmt)} تومان`);
      } else {
        toast.success('تسویه نهایی شد و رسید دریافت ثبت شد');
      }
      setFinalizeDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('ثبت نهایی ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelDialog || !profile) return;
    try {
      const sett = settlements.find((s) => s.id === cancelDialog.id);
      if (!sett) throw new Error('سند یافت نشد');

      await updateData('card_reader_settlements', { id: cancelDialog.id }, {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });

      for (const item of sett.items || []) {
        await updateData('card_reader_transactions', { id: item.transactionId }, {
          status: 'confirmed',
          settlementId: null,
          updatedAt: new Date().toISOString(),
        });
      }

      await createData('card_reader_settlement_history', {
        settlementId: cancelDialog.id,
        action: 'cancelled',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: sett.status,
        toStatus: 'cancelled',
        reason: cancelDialog.reason || null,
        details: { restoredTxnCount: sett.items?.length || 0 },
      });

      toast.success('سند تسویه لغو شد و تراکنش‌ها آزاد شدند');
      setCancelDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleVoid = async () => {
    if (!voidDialog || !profile) return;
    try {
      const sett = settlements.find((s) => s.id === voidDialog.id);
      if (!sett) throw new Error('سند یافت نشد');

      await updateData('card_reader_settlements', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
        accountingPosted: false,
        updatedAt: new Date().toISOString(),
      });

      for (const item of sett.items || []) {
        await updateData('card_reader_settlement_items', { id: item.id }, {
          itemStatus: 'voided',
        });
        await updateData('card_reader_transactions', { id: item.transactionId }, {
          status: 'confirmed',
          settlementId: null,
          updatedAt: new Date().toISOString(),
        });
      }

      await createData('card_reader_settlement_history', {
        settlementId: voidDialog.id,
        action: 'voided',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: sett.status,
        toStatus: 'voided',
        reason: voidDialog.reason || null,
        details: { restoredTxnCount: sett.items?.length || 0 },
      });

      toast.success('سند تسویه باطل شد و تراکنش‌ها به وضعیت قبلی بازگشتند');
      setVoidDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const renderHistory = (history: CardReaderSettlementHistory[]) => (
    <div className="space-y-2">
      {history.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p>
        : history.map((h) => (
          <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
              {h.action === 'created' ? <FileText className="h-3.5 w-3.5" /> :
               h.action === 'approved' ? <CheckCircle className="h-3.5 w-3.5" /> :
               h.action === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> :
               h.action === 'finalized' ? <CheckCircle className="h-3.5 w-3.5" /> :
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
                {h.fromStatus && h.toStatus && <span>{SETTLEMENT_STATUS[h.fromStatus] || h.fromStatus} ← {SETTLEMENT_STATUS[h.toStatus] || h.toStatus}</span>}
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
            <h1 className="text-[28px] font-bold text-[#101828]">تسویه کارتخوان</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> تسویه کارتخوان</div>
        </div>
        <Link href="/dashboard/card-reader-settlements/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت تسویه
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><ArrowRightLeft className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل تسویه‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">در انتظار تأیید</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3b82f6]/10 text-[#3b82f6]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.finalizedAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مبلغ تسویه‌شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f97316]/10 text-[#f97316]"><AlertCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.discrepancy.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">تسویه با مغایرت</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره تسویه..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[280px]" />
        </div>
        <div className="flex gap-2">
          <select value={filterReader} onChange={(e) => setFilterReader(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه کارتخوان‌ها</option>
            {readers.map((r) => <option key={r.id} value={r.id}>{r.bankName} - {r.tid}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه وضعیت‌ها</option>
            {Object.entries(SETTLEMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : settlements.length === 0 ? (
        <Card><EmptyState icon={<ArrowRightLeft className="h-8 w-8" />} title="تسویه‌ای یافت نشد" description="برای شروع، اولین سند تسویه کارتخوان را ثبت کنید" action={<Link href="/dashboard/card-reader-settlements/new"><Button><Plus className="h-4 w-4" /> افزودن تسویه</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((s) => {
              const stColor = SETTLEMENT_STATUS_COLOR[s.status] || '#64748b';
              const reader = readerById(s.cardReaderId);
              return (
                <div key={s.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => loadDetail(s)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{s.number}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{SETTLEMENT_STATUS[s.status]}</Badge>
                      {s.isPartial && <Badge variant="outline" className="shrink-0 border-amber-200 text-amber-600 text-[10px]">تسویه جزئی</Badge>}
                      {Number(s.discrepancyAmount) > 0 && <Badge variant="outline" className="shrink-0 border-orange-200 text-orange-600 text-[10px]">مغایرت</Badge>}
                      {s.accountingPosted && <Badge variant="outline" className="shrink-0 border-indigo-200 text-indigo-600 text-[10px]"><FileCheck className="ml-1 h-3 w-3" />حسابداری</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />{reader ? `${reader.bankName} - ${reader.tid}` : '—'}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(s.settlementDate)}</span>
                      {s.bankAccountId && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{bankAccountName(s.bankAccountId)}</span>}
                      <span>{relativeTime(s.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(s.grossAmount))}</div>
                    <div className="text-[10px] text-[#98A2B3]">خالص: {formatToman(Number(s.netAmount))}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); loadDetail(s); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && (s.status === 'draft' || s.status === 'rejected') && <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
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
            const stColor = SETTLEMENT_STATUS_COLOR[detailItem.status] || '#64748b';
            const reader = readerById(detailItem.cardReaderId);
            const items = detailItems.length > 0 ? detailItems : (detailItem.items || []);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">تسویه {detailItem.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailItem)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && (detailItem.status === 'draft' || detailItem.status === 'rejected') && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{SETTLEMENT_STATUS[detailItem.status]}</Badge>
                    {detailItem.isPartial && <Badge variant="outline" className="border-amber-200 text-amber-600">تسویه جزئی</Badge>}
                    {detailItem.accountingPosted && <Badge variant="outline" className="border-indigo-200 text-indigo-600"><FileCheck className="ml-1 h-3 w-3" />اثر حسابداری ثبت شد</Badge>}
                    {Number(detailItem.discrepancyAmount) > 0 && <Badge variant="outline" className="border-orange-200 text-orange-600"><AlertCircle className="ml-1 h-3 w-3" />مغایرت: {formatToman(Number(detailItem.discrepancyAmount))}</Badge>}
                  </div>

                  {/* Reader info */}
                  {reader && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2"><CreditCard className="h-4 w-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">کارتخوان</span></div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1"><Hash className="h-3 w-3 text-slate-400" />TID: {reader.tid}</div>
                        <div className="flex items-center gap-1"><Hash className="h-3 w-3 text-slate-400" />MID: {reader.mid}</div>
                        <div className="flex items-center gap-1"><Building2 className="h-3 w-3 text-slate-400" />{reader.bankName}</div>
                        {reader.owner && <div className="flex items-center gap-1 text-slate-500">{reader.owner}</div>}
                      </div>
                    </div>
                  )}

                  {/* Amount grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">مبلغ ناخالص</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatToman(Number(detailItem.grossAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">کارمزد</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailItem.commissionAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">کسورات</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailItem.deductions))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">مبلغ خالص</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatToman(Number(detailItem.netAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">واریزشده</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatToman(Number(detailItem.settledAmount))}</div></div>
                    {Number(detailItem.discrepancyAmount) > 0 && <div className="rounded-[10px] bg-orange-50 p-3"><div className="text-xs text-[#667085]">مغایرت</div><div className="mt-1 text-sm font-bold text-orange-600">{formatToman(Number(detailItem.discrepancyAmount))}</div></div>}
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">حساب بانکی مقصد</div><div className="mt-1 text-sm font-bold text-[#344054]">{bankAccountName(detailItem.bankAccountId) || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">تاریخ تسویه</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatJalali(detailItem.settlementDate)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">درخواست‌کننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.createdBy)}</div></div>
                    {detailItem.approvedBy && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">تأییدکننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.approvedBy)}</div></div>}
                    {detailItem.finalizedBy && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">ثبت‌کننده نهایی</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailItem.finalizedBy)}</div></div>}
                  </div>

                  {detailItem.discrepancyType && <div className="rounded-lg border border-orange-200 bg-orange-50 p-3"><p className="text-sm text-orange-700"><strong>نوع مغایرت: </strong>{DISCREPANCY_TYPE[detailItem.discrepancyType] || detailItem.discrepancyType}</p></div>}
                  {detailItem.discrepancyNote && <div className="rounded-lg bg-orange-50 p-3"><p className="text-sm text-orange-700"><strong>شرح مغایرت: </strong>{detailItem.discrepancyNote}</p></div>}
                  {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}
                  {detailItem.rejectedReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل رد: </strong>{detailItem.rejectedReason}</p></div>}
                  {detailItem.voidReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل ابطال: </strong>{detailItem.voidReason}</p></div>}

                  {/* Items */}
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[#1D2939]">ردیف‌های تسویه ({items.length})</h3>
                    {items.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">ردیفی موجود نیست</p> : (
                      <div className="space-y-1.5">
                        {items.map((item) => {
                          const itColor = ITEM_STATUS_COLOR[item.itemStatus] || '#64748b';
                          return (
                            <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-700">{item.transaction ? `${item.transaction.number} - ${formatJalali(item.transaction.transactionDate)}` : item.transactionId}</span>
                                  <Badge variant="outline" className="text-[9px]" style={{ color: itColor, borderColor: `${itColor}35` }}>{ITEM_STATUS[item.itemStatus] || item.itemStatus}</Badge>
                                </div>
                                {item.transaction?.trackingNumber && <div className="mt-0.5 text-[10px] text-slate-400">پیگیری: {item.transaction.trackingNumber}</div>}
                                {item.discrepancyNote && <div className="mt-0.5 text-orange-500">{item.discrepancyNote}</div>}
                              </div>
                              <div className="text-left">
                                <div className="font-bold text-[#3155E7]">{formatToman(Number(item.grossAmount))}</div>
                                <div className="text-[10px] text-slate-400">خالص: {formatToman(Number(item.netAmount))}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detailItem.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" onClick={() => handleSubmit(detailItem.id)}><Send className="h-4 w-4" /> ارسال برای تأیید</Button>
                    )}
                    {detailItem.status === 'pending_approval' && isSuperAdmin && (
                      <>
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApprove(detailItem.id)}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectDialog({ id: detailItem.id, reason: '' })}><XCircle className="h-4 w-4" /> رد</Button>
                      </>
                    )}
                    {detailItem.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => openFinalize(detailItem)}><ArrowRightLeft className="h-4 w-4" /> ثبت نهایی و واریز</Button>
                    )}
                    {isSuperAdmin && !['finalized', 'voided', 'cancelled'].includes(detailItem.status) && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => setCancelDialog({ id: detailItem.id, reason: '' })}><AlertTriangle className="h-4 w-4" /> لغو</Button>
                    )}
                    {detailItem.status === 'finalized' && isSuperAdmin && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setVoidDialog({ id: detailItem.id, reason: '' })}><Ban className="h-4 w-4" /> ابطال تسویه</Button>
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
          <DialogHeader><DialogTitle>رد تسویه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل رد</Label>
              <Input value={rejectDialog?.reason || ''} onChange={(e) => setRejectDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل رد..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>انصراف</Button>
            <Button onClick={handleReject}>رد تسویه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>لغو تسویه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">با لغو تسویه، تراکنش‌ها به وضعیت «تأیید شده» بازمی‌گردند و می‌توانید تسویه جدیدی ثبت کنید.</div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل لغو</Label>
              <Input value={cancelDialog?.reason || ''} onChange={(e) => setCancelDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل لغو..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleCancel}>لغو تسویه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ابطال تسویه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">با ابطال تسویه، اثر حسابداری اصلاح می‌شود، تراکنش‌ها به وضعیت «تأیید شده» بازمی‌گردند و ردیف‌های تسویه باطل می‌شوند. رکورد تسویه حذف نمی‌شود و سابقه حفظ می‌شود.</div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل ابطال <span className="text-rose-500">*</span></Label>
              <Textarea value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل ابطال..." className="rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidDialog?.reason}>ابطال تسویه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Dialog */}
      <Dialog open={!!finalizeDialog} onOpenChange={(o) => !o && setFinalizeDialog(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>ثبت نهایی تسویه و واریز بانکی</DialogTitle></DialogHeader>
          {finalizeDialog && (() => {
            const sett = settlements.find((s) => s.id === finalizeDialog.id);
            const expectedNet = sett ? Number(sett.netAmount) : 0;
            const enteredAmt = Number(finalizeDialog.settledAmount) || 0;
            const autoDisc = Math.abs(enteredAmt - expectedNet);
            return (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><strong>کنترل واریز بانکی</strong></div>
                  <p className="mt-1">مبلغ واریزشده را با خالص تسویه مقایسه کنید. در صورت مغایرت، وضعیت مغایرت ثبت می‌شود.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">مبلغ خالص مورد انتظار</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatToman(expectedNet)}</div></div>
                  <div className={`rounded-[10px] p-3 ${autoDisc > 0 ? 'bg-orange-50' : 'bg-[#EFF4FF]'}`}>
                    <div className="text-xs text-[#667085]">اختلاف خودکار</div>
                    <div className={`mt-1 text-sm font-bold ${autoDisc > 0 ? 'text-orange-600' : 'text-[#3155E7]'}`}>{formatToman(autoDisc)}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">مبلغ واریزشده (تومان) <span className="text-rose-500">*</span></Label>
                  <Input type="number" value={finalizeDialog.settledAmount} onChange={(e) => setFinalizeDialog((d) => d ? { ...d, settledAmount: e.target.value } : null)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره پیگیری واریز</Label>
                    <Input value={finalizeDialog.transferTrackingNumber} onChange={(e) => setFinalizeDialog((d) => d ? { ...d, transferTrackingNumber: e.target.value } : null)} placeholder="پیگیری..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره مرجع واریز</Label>
                    <Input value={finalizeDialog.transferReferenceNumber} onChange={(e) => setFinalizeDialog((d) => d ? { ...d, transferReferenceNumber: e.target.value } : null)} placeholder="مرجع..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">تاریخ واریز</Label>
                  <Input type="date" value={finalizeDialog.transferDate} onChange={(e) => setFinalizeDialog((d) => d ? { ...d, transferDate: e.target.value } : null)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                </div>

                {/* Discrepancy */}
                {autoDisc > 0 && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <div className="flex items-center gap-2 text-orange-700"><AlertCircle className="h-4 w-4" /><strong>مغایرت شناسایی شد</strong></div>
                    <p className="mt-1 text-xs text-orange-600">مبلغ واریزشده با خالص مورد انتظار همخوانی ندارد. نوع مغایرت و شرح آن را وارد کنید.</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-[#344054]">نوع مغایرت</Label>
                        <select value={finalizeDialog.discrepancyType} onChange={(e) => setFinalizeDialog((d) => d ? { ...d, discrepancyType: e.target.value } : null)} className="h-[38px] w-full rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm text-[#344054]">
                          <option value="">انتخاب...</option>
                          {Object.entries(DISCREPANCY_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-[#344054]">مبلغ مغایرت (تومان)</Label>
                        <Input type="number" value={finalizeDialog.discrepancyAmount || String(autoDisc)} onChange={(e) => setFinalizeDialog((d) => d ? { ...d, discrepancyAmount: e.target.value } : null)} className="h-[38px] rounded-[8px] border-[#DCE3EE]" />
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      <Label className="text-xs font-semibold text-[#344054]">شرح مغایرت</Label>
                      <Input value={finalizeDialog.discrepancyNote} onChange={(e) => setFinalizeDialog((d) => d ? { ...d, discrepancyNote: e.target.value } : null)} placeholder="علت اختلاف..." className="h-[38px] rounded-[8px] border-[#DCE3EE]" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات واریز</Label>
                  <Textarea value={finalizeDialog.transferNote} onChange={(e) => setFinalizeDialog((d) => d ? { ...d, transferNote: e.target.value } : null)} placeholder="توضیحات..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-[#F1F5F9] p-3 text-xs text-[#667085]">
                  <Receipt className="h-4 w-4 text-[#3155E7]" />
                  پس از ثبت نهایی، رسید دریافت ثبت می‌شود، وضعیت تراکنش‌ها به «تسویه‌شده» تغییر می‌کند و سند حسابداری ایجاد می‌شود.
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeDialog(null)}>انصراف</Button>
            <Button onClick={handleFinalize} disabled={submitting}>{submitting ? 'در حال ثبت...' : 'ثبت نهایی و واریز'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه تسویه</DialogTitle></DialogHeader>
          {renderHistory(detailHistory)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
