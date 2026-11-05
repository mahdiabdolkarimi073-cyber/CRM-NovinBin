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
  CreditCard, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, TrendingUp, Send, Eye, AlertTriangle,
  Ban, FileText, Hash, Building2, User, Receipt, ArrowRightLeft,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  CardReader, CardReaderTransaction, CardReaderSettlement,
  CardReaderSettlementItem, CardReaderSettlementHistory,
  BankAccount, Profile,
} from '@/lib/types';

const READER_STATUS: Record<string, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  blocked: 'مسدود',
};

const READER_STATUS_COLOR: Record<string, string> = {
  active: '#10b981',
  inactive: '#94a3b8',
  blocked: '#ef4444',
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

const TXN_STATUS_COLOR: Record<string, string> = {
  registered: '#94a3b8',
  confirmed: '#10b981',
  pending_settlement: '#f59e0b',
  settled: '#3b82f6',
  failed: '#ef4444',
  returned: '#8b5cf6',
  discrepancy: '#f97316',
  cancelled: '#64748b',
};

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

const TXN_TYPE: Record<string, string> = {
  purchase: 'خرید',
  refund: 'بازگشت',
  reversal: 'برگشت تراکنش',
  adjustment: 'تعدیل',
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

type TabKey = 'readers' | 'transactions' | 'settlements';

export default function CardReadersPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('readers');

  // Readers
  const [readers, setReaders] = useState<CardReader[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detailReader, setDetailReader] = useState<CardReader | null>(null);
  const [readerTxns, setReaderTxns] = useState<CardReaderTransaction[]>([]);
  const [readerSettlements, setReaderSettlements] = useState<CardReaderSettlement[]>([]);
  const [historyDialog, setHistoryDialog] = useState<CardReader | null>(null);
  const [blockDialog, setBlockDialog] = useState<{ id: string; reason: string } | null>(null);

  // Transactions
  const [txns, setTxns] = useState<CardReaderTransaction[]>([]);
  const [txnSearch, setTxnSearch] = useState('');
  const [txnFilterStatus, setTxnFilterStatus] = useState('all');
  const [txnFilterReader, setTxnFilterReader] = useState('all');
  const [txnPage, setTxnPage] = useState(1);
  const [detailTxn, setDetailTxn] = useState<CardReaderTransaction | null>(null);
  const [txnDialogOpen, setTxnDialogOpen] = useState(false);
  const [newTxn, setNewTxn] = useState({
    cardReaderId: '', transactionDate: '', amount: '', trackingNumber: '',
    referenceNumber: '', transactionType: 'purchase', description: '',
  });

  // Settlements
  const [settlements, setSettlements] = useState<CardReaderSettlement[]>([]);
  const [settSearch, setSettSearch] = useState('');
  const [settFilterStatus, setSettFilterStatus] = useState('all');
  const [settPage, setSettPage] = useState(1);
  const [detailSett, setDetailSett] = useState<CardReaderSettlement | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [settHistoryDialog, setSettHistoryDialog] = useState<CardReaderSettlement | null>(null);
  const [newSettOpen, setNewSettOpen] = useState(false);
  const [newSett, setNewSett] = useState({
    cardReaderId: '', settlementDate: '', bankAccountId: '', description: '',
    selectedTxnIds: [] as string[],
  });
  const [settTxns, setSettTxns] = useState<CardReaderTransaction[]>([]);
  const [settItems, setSettItems] = useState<CardReaderSettlementItem[]>([]);
  const [settHistory, setSettHistory] = useState<CardReaderSettlementHistory[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rData, baData, staffData, tData, sData] = await Promise.all([
        fetchData<CardReader>('card_readers', {
          orderBy: { createdAt: 'desc' },
          include: { history: { orderBy: { actionAt: 'desc' } } },
        }),
        fetchData<BankAccount>('bank_accounts', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
        fetchData<CardReaderTransaction>('card_reader_transactions', {
          orderBy: { transactionDate: 'desc' },
          include: { cardReader: true },
        }),
        fetchData<CardReaderSettlement>('card_reader_settlements', {
          orderBy: { createdAt: 'desc' },
          include: { cardReader: true, items: { include: { transaction: true } } },
        }),
      ]);
      setReaders(rData || []);
      setBankAccounts(baData || []);
      setStaff(staffData || []);
      setTxns(tData || []);
      setSettlements(sData || []);
    } catch (error: any) {
      toast.error('بارگذاری کارتخوان‌ها ناموفق: ' + error.message);
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

  // --- Readers filtering ---
  const filteredReaders = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return readers.filter((r) => {
      const matches = !q ||
        r.number.toLocaleLowerCase().includes(q) ||
        r.tid.toLocaleLowerCase().includes(q) ||
        r.mid.toLocaleLowerCase().includes(q) ||
        (r.bankName || '').toLocaleLowerCase().includes(q) ||
        (r.owner || '').toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [readers, search, filterStatus]);

  const readerPages = Math.max(1, Math.ceil(filteredReaders.length / pageSize));
  const readerCurrentPage = Math.min(page, readerPages);
  const readerPageItems = filteredReaders.slice((readerCurrentPage - 1) * pageSize, readerCurrentPage * pageSize);

  // --- Transactions filtering ---
  const filteredTxns = useMemo(() => {
    const q = txnSearch.trim().toLocaleLowerCase();
    return txns.filter((t) => {
      const matches = !q ||
        t.number.toLocaleLowerCase().includes(q) ||
        (t.trackingNumber || '').toLocaleLowerCase().includes(q) ||
        (t.referenceNumber || '').toLocaleLowerCase().includes(q);
      const st = txnFilterStatus === 'all' || t.status === txnFilterStatus;
      const rd = txnFilterReader === 'all' || t.cardReaderId === txnFilterReader;
      return matches && st && rd;
    });
  }, [txns, txnSearch, txnFilterStatus, txnFilterReader]);

  const txnPages = Math.max(1, Math.ceil(filteredTxns.length / pageSize));
  const txnCurrentPage = Math.min(txnPage, txnPages);
  const txnPageItems = filteredTxns.slice((txnCurrentPage - 1) * pageSize, txnCurrentPage * pageSize);

  // --- Settlements filtering ---
  const filteredSetts = useMemo(() => {
    const q = settSearch.trim().toLocaleLowerCase();
    return settlements.filter((s) => {
      const matches = !q || s.number.toLocaleLowerCase().includes(q);
      const st = settFilterStatus === 'all' || s.status === settFilterStatus;
      return matches && st;
    });
  }, [settlements, settSearch, settFilterStatus]);

  const settPages = Math.max(1, Math.ceil(filteredSetts.length / pageSize));
  const settCurrentPage = Math.min(settPage, settPages);
  const settPageItems = filteredSetts.slice((settCurrentPage - 1) * pageSize, settCurrentPage * pageSize);

  // --- Stats ---
  const stats = useMemo(() => ({
    totalReaders: readers.length,
    activeReaders: readers.filter((r) => r.status === 'active').length,
    totalTxns: txns.length,
    totalTxnAmount: txns.filter((t) => t.status !== 'cancelled' && t.status !== 'failed').reduce((s, t) => s + Number(t.amount || 0), 0),
    pendingSettlements: settlements.filter((s) => s.status === 'pending_approval').length,
    settledAmount: settlements.filter((s) => s.status === 'finalized').reduce((s, st) => s + Number(st.netAmount || 0), 0),
  }), [readers, txns, settlements]);

  // --- Reader actions ---
  const handleDeleteReader = async (id: string) => {
    if (!confirm('حذف این کارتخوان؟ تراکنش‌ها و تسویه‌های مرتبط نیز حذف می‌شوند.')) return;
    try {
      await deleteData('card_readers', { id });
      toast.success('کارتخوان حذف شد');
      setDetailReader(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleToggleStatus = async (reader: CardReader) => {
    if (!profile) return;
    const newStatus = reader.status === 'active' ? 'inactive' : 'active';
    try {
      await updateData('card_readers', { id: reader.id }, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      await createData('card_reader_history', {
        cardReaderId: reader.id,
        action: newStatus === 'active' ? 'activated' : 'deactivated',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: reader.status,
        toStatus: newStatus,
        details: {},
      });
      toast.success(newStatus === 'active' ? 'کارتخوان فعال شد' : 'کارتخوان غیرفعال شد');
      setDetailReader(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleBlock = async () => {
    if (!blockDialog || !profile) return;
    try {
      await updateData('card_readers', { id: blockDialog.id }, {
        status: 'blocked',
        updatedAt: new Date().toISOString(),
      });
      await createData('card_reader_history', {
        cardReaderId: blockDialog.id,
        action: 'blocked',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        toStatus: 'blocked',
        reason: blockDialog.reason || null,
        details: {},
      });
      toast.success('کارتخوان مسدود شد');
      setBlockDialog(null);
      setDetailReader(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadReaderDetails = async (reader: CardReader) => {
    setDetailReader(reader);
    try {
      const [tData, sData] = await Promise.all([
        fetchData<CardReaderTransaction>('card_reader_transactions', {
          where: { cardReaderId: reader.id },
          orderBy: { transactionDate: 'desc' },
        }),
        fetchData<CardReaderSettlement>('card_reader_settlements', {
          where: { cardReaderId: reader.id },
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { transaction: true } } },
        }),
      ]);
      setReaderTxns(tData || []);
      setReaderSettlements(sData || []);
    } catch (error: any) {
      toast.error('بارگذاری جزئیات ناموفق: ' + error.message);
    }
  };

  // --- Transaction actions ---
  const handleCreateTxn = async () => {
    if (!profile) return;
    if (!newTxn.cardReaderId) { toast.error('انتخاب کارتخوان الزامی است'); return; }
    if (!newTxn.amount) { toast.error('مبلغ تراکنش الزامی است'); return; }
    if (!newTxn.trackingNumber && !newTxn.referenceNumber) { toast.error('شماره پیگیری یا شماره مرجع الزامی است'); return; }
    const reader = readerById(newTxn.cardReaderId);
    if (!reader) { toast.error('کارتخوان یافت نشد'); return; }
    if (reader.status !== 'active') { toast.error('کارتخوان فعال نیست'); return; }

    setSubmitting(true);
    try {
      const amountNum = Number(newTxn.amount);
      const existing = txns.find((t) =>
        t.referenceNumber === newTxn.referenceNumber &&
        t.trackingNumber === newTxn.trackingNumber &&
        Number(t.amount) === amountNum &&
        t.cardReaderId === newTxn.cardReaderId
      );
      if (existing) {
        toast.error('تراکنش تکراری — این تراکنش قبلاً ثبت شده است');
        setSubmitting(false);
        return;
      }

      await createData('card_reader_transactions', {
        number: `TXN-${Date.now()}`,
        cardReaderId: newTxn.cardReaderId,
        transactionDate: newTxn.transactionDate ? new Date(newTxn.transactionDate).toISOString() : new Date().toISOString(),
        amount: amountNum,
        tid: reader.tid,
        mid: reader.mid,
        trackingNumber: newTxn.trackingNumber || null,
        referenceNumber: newTxn.referenceNumber || null,
        transactionType: newTxn.transactionType,
        status: 'registered',
        commissionAmount: 0,
        deductions: 0,
        netAmount: amountNum,
        description: newTxn.description || null,
        createdBy: profile.id,
      });

      await createData('card_reader_history', {
        cardReaderId: newTxn.cardReaderId,
        action: 'transaction',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        amount: amountNum,
        details: { trackingNumber: newTxn.trackingNumber, referenceNumber: newTxn.referenceNumber, type: newTxn.transactionType },
      });

      toast.success('تراکنش ثبت شد');
      setTxnDialogOpen(false);
      setNewTxn({ cardReaderId: '', transactionDate: '', amount: '', trackingNumber: '', referenceNumber: '', transactionType: 'purchase', description: '' });
      loadData();
    } catch (error: any) {
      toast.error('ثبت تراکنش ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTxn = async (txn: CardReaderTransaction) => {
    if (!profile) return;
    try {
      await updateData('card_reader_transactions', { id: txn.id }, {
        status: 'confirmed',
        updatedAt: new Date().toISOString(),
      });
      toast.success('تراکنش تأیید شد');
      setDetailTxn(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleDeleteTxn = async (id: string) => {
    if (!confirm('حذف این تراکنش؟')) return;
    try {
      await deleteData('card_reader_transactions', { id });
      toast.success('تراکنش حذف شد');
      setDetailTxn(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  // --- Settlement actions ---
  const openNewSett = async () => {
    setNewSett({ cardReaderId: '', settlementDate: '', bankAccountId: '', description: '', selectedTxnIds: [] });
    setSettTxns([]);
    setNewSettOpen(true);
  };

  const onSettReaderChange = async (readerId: string) => {
    setNewSett((s) => ({ ...s, cardReaderId: readerId, selectedTxnIds: [] }));
    if (!readerId) { setSettTxns([]); return; }
    try {
      const tData = await fetchData<CardReaderTransaction>('card_reader_transactions', {
        where: { cardReaderId: readerId, status: 'confirmed' },
        orderBy: { transactionDate: 'desc' },
      });
      setSettTxns(tData || []);
    } catch (error: any) {
      toast.error('بارگذاری تراکنش‌ها ناموفق: ' + error.message);
    }
  };

  const toggleSettTxn = (txnId: string) => {
    setNewSett((s) => ({
      ...s,
      selectedTxnIds: s.selectedTxnIds.includes(txnId)
        ? s.selectedTxnIds.filter((id) => id !== txnId)
        : [...s.selectedTxnIds, txnId],
    }));
  };

  const newSettTotals = useMemo(() => {
    const selected = settTxns.filter((t) => newSett.selectedTxnIds.includes(t.id));
    const gross = selected.reduce((s, t) => s + Number(t.amount || 0), 0);
    return { gross, count: selected.length };
  }, [settTxns, newSett.selectedTxnIds]);

  const handleCreateSett = async () => {
    if (!profile) return;
    if (!newSett.cardReaderId) { toast.error('انتخاب کارتخوان الزامی است'); return; }
    if (newSett.selectedTxnIds.length === 0) { toast.error('حداقل یک تراکنش باید انتخاب شود'); return; }
    if (!newSett.bankAccountId) { toast.error('حساب بانکی مقصد الزامی است'); return; }

    setSubmitting(true);
    try {
      const selected = settTxns.filter((t) => newSett.selectedTxnIds.includes(t.id));
      const gross = selected.reduce((s, t) => s + Number(t.amount || 0), 0);

      const settlement = await createData('card_reader_settlements', {
        number: `STL-${Date.now()}`,
        cardReaderId: newSett.cardReaderId,
        settlementDate: newSett.settlementDate ? new Date(newSett.settlementDate).toISOString() : new Date().toISOString(),
        bankAccountId: newSett.bankAccountId || null,
        grossAmount: gross,
        commissionAmount: 0,
        deductions: 0,
        netAmount: gross,
        settledAmount: 0,
        discrepancyAmount: 0,
        status: 'draft',
        isPartial: false,
        remainingAmount: 0,
        accountingPosted: false,
        description: newSett.description || null,
        createdBy: profile.id,
      }) as any;

      for (const txn of selected) {
        await createData('card_reader_settlement_items', {
          settlementId: settlement.id,
          transactionId: txn.id,
          grossAmount: Number(txn.amount),
          commissionAmount: 0,
          deductions: 0,
          netAmount: Number(txn.amount),
          settledAmount: 0,
          discrepancyAmount: 0,
          itemStatus: 'open',
        });
        await updateData('card_reader_transactions', { id: txn.id }, {
          status: 'pending_settlement',
          settlementId: settlement.id,
          updatedAt: new Date().toISOString(),
        });
      }

      await createData('card_reader_settlement_history', {
        settlementId: settlement.id,
        action: 'created',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        toStatus: 'draft',
        details: { txnCount: selected.length, grossAmount: gross },
      });

      toast.success('سند تسویه ثبت شد');
      setNewSettOpen(false);
      loadData();
    } catch (error: any) {
      toast.error('ایجاد تسویه ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSett = async (id: string) => {
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
      setDetailSett(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleApproveSett = async (id: string) => {
    if (!profile) return;
    try {
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
        details: {},
      });
      toast.success('تسویه تأیید شد');
      setDetailSett(null);
      loadData();
    } catch (error: any) {
      toast.error('تأیید ناموفق: ' + error.message);
    }
  };

  const handleRejectSett = async () => {
    if (!rejectDialog || !profile) return;
    try {
      await updateData('card_reader_settlements', { id: rejectDialog.id }, {
        status: 'draft',
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
      setDetailSett(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleFinalizeSett = async (id: string) => {
    if (!profile) return;
    try {
      const sett = settlements.find((s) => s.id === id);
      if (!sett) throw new Error('سند تسویه یافت نشد');
      const items = sett.items || [];
      const settledAmount = items.reduce((s, it) => s + Number(it.settledAmount || it.netAmount || 0), 0);
      const discrepancy = items.reduce((s, it) => s + Number(it.discrepancyAmount || 0), 0);

      await updateData('card_reader_settlements', { id }, {
        status: 'finalized',
        finalizedBy: profile.id,
        finalizedAt: new Date().toISOString(),
        settledAmount,
        discrepancyAmount: discrepancy,
        accountingPosted: true,
        closedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      for (const item of items) {
        await updateData('card_reader_settlement_items', { id: item.id }, {
          itemStatus: 'settled',
        });
        await updateData('card_reader_transactions', { id: item.transactionId }, {
          status: 'settled',
          updatedAt: new Date().toISOString(),
        });
      }

      await createData('card_reader_settlement_history', {
        settlementId: id,
        action: 'finalized',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: 'approved',
        toStatus: 'finalized',
        amount: settledAmount,
        details: { settledAmount, discrepancyAmount: discrepancy, itemCount: items.length },
      });

      if (sett.cardReaderId) {
        await createData('card_reader_history', {
          cardReaderId: sett.cardReaderId,
          action: 'settlement',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          amount: settledAmount,
          details: { settlementNumber: sett.number },
        });
      }

      toast.success('تسویه نهایی شد');
      setDetailSett(null);
      loadData();
    } catch (error: any) {
      toast.error('ثبت نهایی ناموفق: ' + error.message);
    }
  };

  const handleVoidSett = async () => {
    if (!voidDialog || !profile) return;
    try {
      const sett = settlements.find((s) => s.id === voidDialog.id);
      if (!sett) throw new Error('سند یافت نشد');

      await updateData('card_reader_settlements', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });

      const items = sett.items || [];
      for (const item of items) {
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
        details: { restoredTxnCount: items.length },
      });

      toast.success('سند تسویه باطل شد و تراکنش‌ها به وضعیت قبلی بازگشتند');
      setVoidDialog(null);
      setDetailSett(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadSettDetails = async (sett: CardReaderSettlement) => {
    setDetailSett(sett);
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
      setSettItems(iData || []);
      setSettHistory(hData || []);
    } catch (error: any) {
      toast.error('بارگذاری جزئیات ناموفق: ' + error.message);
    }
  };

  const renderSettHistory = (history: CardReaderSettlementHistory[]) => (
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
               <Send className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{ACTION_LABEL[h.action] || h.action}</span>
                <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                توسط {staffName(h.actionBy)}
                {h.reason && <div className="mt-1 text-rose-500">دلیل: {h.reason}</div>}
              </div>
            </div>
          </div>
        ))}
    </div>
  );

  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: 'readers', label: 'کارتخوان‌ها', icon: CreditCard },
    { key: 'transactions', label: 'تراکنش‌ها', icon: Receipt },
    { key: 'settlements', label: 'تسویه‌ها', icon: ArrowRightLeft },
  ];

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">کارتخوان</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> کارتخوان</div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'readers' && (
            <Link href="/dashboard/card-readers/new">
              <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                <Plus className="h-4 w-4" /> ثبت کارتخوان
              </Button>
            </Link>
          )}
          {activeTab === 'transactions' && (
            <Button onClick={() => setTxnDialogOpen(true)} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
              <Plus className="h-4 w-4" /> ثبت تراکنش
            </Button>
          )}
          {activeTab === 'settlements' && (
            <Button onClick={openNewSett} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
              <Plus className="h-4 w-4" /> ثبت تسویه
            </Button>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><CreditCard className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.activeReaders.toLocaleString('fa-IR')} / {stats.totalReaders.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کارتخوان فعال / کل</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Receipt className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.totalTxns.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل تراکنش‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><TrendingUp className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalTxnAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع مبلغ تراکنش‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3b82f6]/10 text-[#3b82f6]"><ArrowRightLeft className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.settledAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مبلغ تسویه‌شده</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-[10px] border border-[#E7ECF3] bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); setTxnPage(1); setSettPage(1); }}
            className={`flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-[#3155E7] text-white' : 'text-[#667085] hover:bg-[#F1F5F9]'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : (
        <>
          {/* ============ READERS TAB ============ */}
          {activeTab === 'readers' && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
                  <Input placeholder="جستجو بر اساس شماره، TID، MID، بانک..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                  <option value="all">همه وضعیت‌ها</option>
                  {Object.entries(READER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {readers.length === 0 ? (
                <Card><EmptyState icon={<CreditCard className="h-8 w-8" />} title="کارتخوانی یافت نشد" description="برای شروع، اولین کارتخوان را ثبت کنید" action={<Link href="/dashboard/card-readers/new"><Button><Plus className="h-4 w-4" /> افزودن کارتخوان</Button></Link>} /></Card>
              ) : (
                <Card><CardContent className="p-0">
                  <div className="divide-y divide-[#F1F5F9]">
                    {readerPageItems.map((r) => {
                      const stColor = READER_STATUS_COLOR[r.status] || '#64748b';
                      return (
                        <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => loadReaderDetails(r)}>
                          <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-bold text-[#1D2939]">{r.bankName}</div>
                              <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{READER_STATUS[r.status]}</Badge>
                              <span className="text-xs text-[#98A2B3]">{r.number}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                              <span className="flex items-center gap-1"><Hash className="h-3 w-3" />TID: {r.tid}</span>
                              <span className="flex items-center gap-1"><Hash className="h-3 w-3" />MID: {r.mid}</span>
                              {r.owner && <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.owner}</span>}
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.startDate)}</span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); loadReaderDetails(r); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                          {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); handleDeleteReader(r.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      );
                    })}
                    {readerPageItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
                  </div>
                  {readerPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
                      <span className="text-xs text-[#667085]">صفحه {readerCurrentPage.toLocaleString('fa-IR')} از {readerPages.toLocaleString('fa-IR')}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={readerCurrentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                        <button onClick={() => setPage((p) => Math.min(readerPages, p + 1))} disabled={readerCurrentPage === readerPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )}
                </CardContent></Card>
              )}
            </>
          )}

          {/* ============ TRANSACTIONS TAB ============ */}
          {activeTab === 'transactions' && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
                  <Input placeholder="جستجو بر اساس شماره، پیگیری، مرجع..." value={txnSearch} onChange={(e) => setTxnSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[280px]" />
                </div>
                <div className="flex gap-2">
                  <select value={txnFilterReader} onChange={(e) => setTxnFilterReader(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                    <option value="all">همه کارتخوان‌ها</option>
                    {readers.map((r) => <option key={r.id} value={r.id}>{r.bankName} - {r.tid}</option>)}
                  </select>
                  <select value={txnFilterStatus} onChange={(e) => setTxnFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                    <option value="all">همه وضعیت‌ها</option>
                    {Object.entries(TXN_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              {txns.length === 0 ? (
                <Card><EmptyState icon={<Receipt className="h-8 w-8" />} title="تراکنشی یافت نشد" description="برای شروع، اولین تراکنش کارتخوان را ثبت کنید" action={<Button onClick={() => setTxnDialogOpen(true)}><Plus className="h-4 w-4" /> افزودن تراکنش</Button>} /></Card>
              ) : (
                <Card><CardContent className="p-0">
                  <div className="divide-y divide-[#F1F5F9]">
                    {txnPageItems.map((t) => {
                      const stColor = TXN_STATUS_COLOR[t.status] || '#64748b';
                      const reader = readerById(t.cardReaderId);
                      return (
                        <div key={t.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => setDetailTxn(t)}>
                          <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-bold text-[#1D2939]">{t.number}</div>
                              <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{TXN_STATUS[t.status]}</Badge>
                              <Badge variant="outline" className="shrink-0 text-[10px] text-[#667085]">{TXN_TYPE[t.transactionType] || t.transactionType}</Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                              <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />{reader ? `${reader.bankName} - ${reader.tid}` : '—'}</span>
                              {t.trackingNumber && <span>پیگیری: {t.trackingNumber}</span>}
                              {t.referenceNumber && <span>مرجع: {t.referenceNumber}</span>}
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(t.transactionDate)}</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(t.amount))}</div>
                            <div className="text-[10px] text-[#98A2B3]">مبلغ</div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setDetailTxn(t); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                        </div>
                      );
                    })}
                    {txnPageItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
                  </div>
                  {txnPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
                      <span className="text-xs text-[#667085]">صفحه {txnCurrentPage.toLocaleString('fa-IR')} از {txnPages.toLocaleString('fa-IR')}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setTxnPage((p) => Math.max(1, p - 1))} disabled={txnCurrentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                        <button onClick={() => setTxnPage((p) => Math.min(txnPages, p + 1))} disabled={txnCurrentPage === txnPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )}
                </CardContent></Card>
              )}
            </>
          )}

          {/* ============ SETTLEMENTS TAB ============ */}
          {activeTab === 'settlements' && (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
                  <Input placeholder="جستجو بر اساس شماره تسویه..." value={settSearch} onChange={(e) => setSettSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[280px]" />
                </div>
                <select value={settFilterStatus} onChange={(e) => setSettFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                  <option value="all">همه وضعیت‌ها</option>
                  {Object.entries(SETTLEMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {settlements.length === 0 ? (
                <Card><EmptyState icon={<ArrowRightLeft className="h-8 w-8" />} title="تسویه‌ای یافت نشد" description="برای شروع، اولین سند تسویه کارتخوان را ثبت کنید" action={<Button onClick={openNewSett}><Plus className="h-4 w-4" /> افزودن تسویه</Button>} /></Card>
              ) : (
                <Card><CardContent className="p-0">
                  <div className="divide-y divide-[#F1F5F9]">
                    {settPageItems.map((s) => {
                      const stColor = SETTLEMENT_STATUS_COLOR[s.status] || '#64748b';
                      const reader = readerById(s.cardReaderId);
                      return (
                        <div key={s.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => loadSettDetails(s)}>
                          <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-bold text-[#1D2939]">{s.number}</div>
                              <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{SETTLEMENT_STATUS[s.status]}</Badge>
                              {s.isPartial && <Badge variant="outline" className="shrink-0 border-amber-200 text-amber-600 text-[10px]">تسویه جزئی</Badge>}
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
                            <div className="text-[10px] text-[#98A2B3]">ناخالص / خالص: {formatToman(Number(s.netAmount))}</div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); loadSettDetails(s); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                        </div>
                      );
                    })}
                    {settPageItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
                  </div>
                  {settPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
                      <span className="text-xs text-[#667085]">صفحه {settCurrentPage.toLocaleString('fa-IR')} از {settPages.toLocaleString('fa-IR')}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSettPage((p) => Math.max(1, p - 1))} disabled={settCurrentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                        <button onClick={() => setSettPage((p) => Math.min(settPages, p + 1))} disabled={settCurrentPage === settPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )}
                </CardContent></Card>
              )}
            </>
          )}
        </>
      )}

      {/* ============ Reader Detail Dialog ============ */}
      <Dialog open={!!detailReader} onOpenChange={(o) => !o && setDetailReader(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detailReader && (() => {
            const stColor = READER_STATUS_COLOR[detailReader.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">کارتخوان {detailReader.bankName}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailReader)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDeleteReader(detailReader.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{READER_STATUS[detailReader.status]}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">شماره داخلی</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{detailReader.number}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">TID (ترمینال)</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailReader.tid}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">MID (پذیرنده)</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailReader.mid}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">بانک</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailReader.bankName}</div></div>
                    {detailReader.branchName && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">شعبه/محل</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailReader.branchName}</div></div>}
                    {detailReader.owner && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">مالک</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailReader.owner}</div></div>}
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ شروع</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatJalali(detailReader.startDate)}</div></div>
                    {detailReader.endDate && <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">تاریخ پایان</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatJalali(detailReader.endDate)}</div></div>}
                    {bankAccountName(detailReader.bankAccountId) && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">حساب بانکی</div><div className="mt-1 text-sm font-bold text-[#344054]">{bankAccountName(detailReader.bankAccountId)}</div></div>}
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">ایجادکننده</div><div className="mt-1 text-sm font-bold text-[#344054]">{staffName(detailReader.createdBy)}</div></div>
                  </div>

                  {detailReader.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailReader.description}</p></div>}

                  {/* Reader transactions summary */}
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[#1D2939]">تراکنش‌های اخیر ({readerTxns.length})</h3>
                    {readerTxns.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">تراکنشی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {readerTxns.slice(0, 5).map((t) => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                            <span className="text-slate-600">{formatJalali(t.transactionDate)} - {t.trackingNumber || t.referenceNumber || t.number}</span>
                            <span className="font-bold text-[#3155E7]">{formatToman(Number(t.amount))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reader settlements summary */}
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[#1D2939]">تسویه‌های اخیر ({readerSettlements.length})</h3>
                    {readerSettlements.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">تسویه‌ای ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {readerSettlements.slice(0, 5).map((s) => (
                          <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                            <span className="text-slate-600">{s.number} - {formatJalali(s.settlementDate)}</span>
                            <span className="font-bold text-[#3155E7]">{formatToman(Number(s.grossAmount))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {isSuperAdmin && detailReader.status !== 'blocked' && (
                      <Button variant="outline" onClick={() => handleToggleStatus(detailReader)}>
                        {detailReader.status === 'active' ? <><Ban className="h-4 w-4" /> غیرفعال کردن</> : <><CheckCircle className="h-4 w-4" /> فعال کردن</>}
                      </Button>
                    )}
                    {isSuperAdmin && detailReader.status !== 'blocked' && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setBlockDialog({ id: detailReader.id, reason: '' })}>
                        <AlertTriangle className="h-4 w-4" /> مسدود کردن
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={!!blockDialog} onOpenChange={(o) => !o && setBlockDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>مسدود کردن کارتخوان</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">با مسدود کردن کارتخوان، امکان ثبت تراکنش جدید برای آن از بین می‌رود.</div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل مسدودی</Label>
              <Input value={blockDialog?.reason || ''} onChange={(e) => setBlockDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل مسدودی..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleBlock}>مسدود کردن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reader History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه کارتخوان</DialogTitle></DialogHeader>
          {historyDialog && (historyDialog.history || []).length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p> : (
            <div className="space-y-2">
              {(historyDialog?.history || []).map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500"><FileText className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{h.action}</span>
                      <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      توسط {staffName(h.actionBy)}
                      {h.fromStatus && h.toStatus && <span> • {h.fromStatus} ← {h.toStatus}</span>}
                      {h.amount != null && <span> • مبلغ: {formatToman(Number(h.amount))}</span>}
                      {h.reason && <div className="mt-1 text-rose-500">دلیل: {h.reason}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!detailTxn} onOpenChange={(o) => !o && setDetailTxn(null)}>
        <DialogContent className="max-w-lg">
          {detailTxn && (() => {
            const stColor = TXN_STATUS_COLOR[detailTxn.status] || '#64748b';
            const reader = readerById(detailTxn.cardReaderId);
            return (
              <>
                <DialogHeader><DialogTitle>تراکنش {detailTxn.number}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{TXN_STATUS[detailTxn.status]}</Badge>
                    <Badge variant="outline" className="text-[#667085]">{TXN_TYPE[detailTxn.transactionType] || detailTxn.transactionType}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">مبلغ</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatToman(Number(detailTxn.amount))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">مبلغ خالص</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatToman(Number(detailTxn.netAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">کارتخوان</div><div className="mt-1 text-sm font-bold text-[#344054]">{reader ? `${reader.bankName} - ${reader.tid}` : '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">تاریخ</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatJalali(detailTxn.transactionDate)}</div></div>
                    {detailTxn.trackingNumber && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">شماره پیگیری</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailTxn.trackingNumber}</div></div>}
                    {detailTxn.referenceNumber && <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">شماره مرجع</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailTxn.referenceNumber}</div></div>}
                    {detailTxn.commissionAmount > 0 && <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">کارمزد</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailTxn.commissionAmount))}</div></div>}
                    {detailTxn.deductions > 0 && <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">کسورات</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailTxn.deductions))}</div></div>}
                  </div>
                  {detailTxn.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailTxn.description}</p></div>}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detailTxn.status === 'registered' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleConfirmTxn(detailTxn)}><CheckCircle className="h-4 w-4" /> تأیید تراکنش</Button>
                    )}
                    {isSuperAdmin && !['settled', 'pending_settlement'].includes(detailTxn.status) && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteTxn(detailTxn.id)}><Trash2 className="h-4 w-4" /> حذف</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* New Transaction Dialog */}
      <Dialog open={txnDialogOpen} onOpenChange={setTxnDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ثبت تراکنش کارتخوان</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">کارتخوان <span className="text-rose-500">*</span></Label>
              <select value={newTxn.cardReaderId} onChange={(e) => setNewTxn((s) => ({ ...s, cardReaderId: e.target.value }))} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                <option value="">انتخاب کارتخوان...</option>
                {readers.filter((r) => r.status === 'active').map((r) => <option key={r.id} value={r.id}>{r.bankName} - TID: {r.tid}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">مبلغ (تومان) <span className="text-rose-500">*</span></Label>
                <Input type="number" value={newTxn.amount} onChange={(e) => setNewTxn((s) => ({ ...s, amount: e.target.value }))} placeholder="مبلغ..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">نوع تراکنش</Label>
                <select value={newTxn.transactionType} onChange={(e) => setNewTxn((s) => ({ ...s, transactionType: e.target.value }))} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                  {Object.entries(TXN_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">شماره پیگیری</Label>
                <Input value={newTxn.trackingNumber} onChange={(e) => setNewTxn((s) => ({ ...s, trackingNumber: e.target.value }))} placeholder="شماره پیگیری..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">شماره مرجع</Label>
                <Input value={newTxn.referenceNumber} onChange={(e) => setNewTxn((s) => ({ ...s, referenceNumber: e.target.value }))} placeholder="شماره مرجع..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">تاریخ تراکنش</Label>
              <Input type="date" value={newTxn.transactionDate} onChange={(e) => setNewTxn((s) => ({ ...s, transactionDate: e.target.value }))} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
              <Textarea value={newTxn.description} onChange={(e) => setNewTxn((s) => ({ ...s, description: e.target.value }))} placeholder="توضیحات..." className="rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxnDialogOpen(false)}>انصراف</Button>
            <Button onClick={handleCreateTxn} disabled={submitting}>{submitting ? 'در حال ثبت...' : 'ثبت تراکنش'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Settlement Dialog */}
      <Dialog open={newSettOpen} onOpenChange={setNewSettOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>ثبت سند تسویه کارتخوان</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">کارتخوان <span className="text-rose-500">*</span></Label>
              <select value={newSett.cardReaderId} onChange={(e) => onSettReaderChange(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                <option value="">انتخاب کارتخوان...</option>
                {readers.map((r) => <option key={r.id} value={r.id}>{r.bankName} - TID: {r.tid}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">تاریخ تسویه</Label>
                <Input type="date" value={newSett.settlementDate} onChange={(e) => setNewSett((s) => ({ ...s, settlementDate: e.target.value }))} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">حساب بانکی مقصد <span className="text-rose-500">*</span></Label>
                <select value={newSett.bankAccountId} onChange={(e) => setNewSett((s) => ({ ...s, bankAccountId: e.target.value }))} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                  <option value="">انتخاب حساب...</option>
                  {bankAccounts.filter((b) => b.active).map((b) => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</option>)}
                </select>
              </div>
            </div>

            {/* Transaction selection */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm font-semibold text-[#344054]">تراکنش‌های قابل تسویه</Label>
                {newSettTotals.count > 0 && <span className="text-xs text-[#3155E7]">{newSettTotals.count.toLocaleString('fa-IR')} تراکنش - مجموع: {formatToman(newSettTotals.gross)} تومان</span>}
              </div>
              {settTxns.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">{newSett.cardReaderId ? 'تراکنش تأییدشده‌ای برای این کارتخوان موجود نیست' : 'ابتدا کارتخوان را انتخاب کنید'}</p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 p-2">
                  {settTxns.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={newSett.selectedTxnIds.includes(t.id)}
                        onChange={() => toggleSettTxn(t.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#3155E7]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-700">{t.number} - {formatJalali(t.transactionDate)}</div>
                        <div className="text-[10px] text-slate-400">{t.trackingNumber || t.referenceNumber || '—'}</div>
                      </div>
                      <span className="text-sm font-bold text-[#3155E7]">{formatToman(Number(t.amount))}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
              <Textarea value={newSett.description} onChange={(e) => setNewSett((s) => ({ ...s, description: e.target.value }))} placeholder="توضیحات..." className="rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSettOpen(false)}>انصراف</Button>
            <Button onClick={handleCreateSett} disabled={submitting || newSett.selectedTxnIds.length === 0}>{submitting ? 'در حال ثبت...' : 'ثبت تسویه'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement Detail Dialog */}
      <Dialog open={!!detailSett} onOpenChange={(o) => !o && setDetailSett(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detailSett && (() => {
            const stColor = SETTLEMENT_STATUS_COLOR[detailSett.status] || '#64748b';
            const reader = readerById(detailSett.cardReaderId);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">تسویه {detailSett.number}</DialogTitle>
                    <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setSettHistoryDialog(detailSett)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{SETTLEMENT_STATUS[detailSett.status]}</Badge>
                    {detailSett.isPartial && <Badge variant="outline" className="border-amber-200 text-amber-600">تسویه جزئی</Badge>}
                    {detailSett.accountingPosted && <Badge variant="outline" className="border-indigo-200 text-indigo-600"><CheckCircle className="ml-1 h-3 w-3" />اثر حسابداری ثبت شد</Badge>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">مبلغ ناخالص</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatToman(Number(detailSett.grossAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">کارمزد</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailSett.commissionAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">کسورات</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailSett.deductions))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">مبلغ خالص</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatToman(Number(detailSett.netAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">واریزشده</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatToman(Number(detailSett.settledAmount))}</div></div>
                    {detailSett.discrepancyAmount > 0 && <div className="rounded-[10px] bg-rose-50 p-3"><div className="text-xs text-[#667085]">مغایرت</div><div className="mt-1 text-sm font-bold text-rose-600">{formatToman(Number(detailSett.discrepancyAmount))}</div></div>}
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">کارتخوان</div><div className="mt-1 text-sm font-bold text-[#344054]">{reader ? `${reader.bankName} - ${reader.tid}` : '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">حساب بانکی</div><div className="mt-1 text-sm font-bold text-[#344054]">{bankAccountName(detailSett.bankAccountId) || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">تاریخ</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatJalali(detailSett.settlementDate)}</div></div>
                  </div>

                  {detailSett.discrepancyNote && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>شرح مغایرت: </strong>{detailSett.discrepancyNote}</p></div>}
                  {detailSett.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailSett.description}</p></div>}
                  {detailSett.rejectedReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل رد: </strong>{detailSett.rejectedReason}</p></div>}

                  {/* Items */}
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[#1D2939]">ردیف‌های تسویه ({settItems.length})</h3>
                    {settItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">ردیفی موجود نیست</p> : (
                      <div className="space-y-1.5">
                        {settItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700">{item.transaction ? `${item.transaction.number} - ${formatJalali(item.transaction.transactionDate)}` : item.transactionId}</div>
                              {item.discrepancyNote && <div className="mt-0.5 text-rose-500">{item.discrepancyNote}</div>}
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-[#3155E7]">{formatToman(Number(item.grossAmount))}</div>
                              <div className="text-[10px] text-slate-400">خالص: {formatToman(Number(item.netAmount))}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detailSett.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" onClick={() => handleSubmitSett(detailSett.id)}><Send className="h-4 w-4" /> ارسال برای تأیید</Button>
                    )}
                    {detailSett.status === 'pending_approval' && isSuperAdmin && (
                      <>
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApproveSett(detailSett.id)}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectDialog({ id: detailSett.id, reason: '' })}><XCircle className="h-4 w-4" /> رد</Button>
                      </>
                    )}
                    {detailSett.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleFinalizeSett(detailSett.id)}><ArrowRightLeft className="h-4 w-4" /> ثبت نهایی تسویه</Button>
                    )}
                    {isSuperAdmin && !['finalized', 'voided'].includes(detailSett.status) && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setVoidDialog({ id: detailSett.id, reason: '' })}><Ban className="h-4 w-4" /> باطل کردن</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject Settlement Dialog */}
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
            <Button onClick={handleRejectSett}>رد تسویه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Settlement Dialog */}
      <Dialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>باطل کردن تسویه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">با باطل کردن تسویه، تراکنش‌ها به وضعیت «تأیید شده» بازمی‌گردند و می‌توانید تسویه جدیدی ثبت کنید.</div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">دلیل ابطال <span className="text-rose-500">*</span></Label>
              <Textarea value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل ابطال..." className="rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleVoidSett} disabled={!voidDialog?.reason}>باطل کردن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settlement History Dialog */}
      <Dialog open={!!settHistoryDialog} onOpenChange={(o) => !o && setSettHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه تسویه</DialogTitle></DialogHeader>
          {renderSettHistory(settHistory)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
