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
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  WalletCards, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, TrendingDown, Send, RotateCcw, Eye,
  AlertTriangle, Building2, Hash, Landmark, Wallet, ArrowRightLeft,
  FileText, Banknote, AlertCircle,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime, toLocalDateString } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  ReceivedCheque, ReceivedChequeOperation, ContactParty, Profile,
  BankAccount, CashFund,
} from '@/lib/types';

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

const CHEQUE_STATUS_COLOR: Record<string, string> = {
  received: '#3b82f6',
  in_custody: '#6366f1',
  pending_due: '#f59e0b',
  deposited: '#8b5cf6',
  cleared: '#10b981',
  returned: '#ef4444',
  refunded: '#f97316',
  voided: '#64748b',
  transferred: '#0ea5e9',
};

const OP_LABEL: Record<string, string> = {
  receive: 'دریافت',
  deposit: 'واگذاری به بانک',
  clear: 'وصول',
  return: 'برگشت',
  refund: 'استرداد',
  transfer: 'انتقال',
  void: 'ابطال',
  amend: 'اصلاح',
  status_change: 'تغییر وضعیت',
};

interface OperationDialog {
  type: 'deposit' | 'clear' | 'return' | 'refund' | 'transfer' | 'void';
  chequeId: string;
  date: string;
  bankAccountId: string;
  cashFundId: string;
  counterpartyId: string;
  counterpartyName: string;
  reason: string;
  newLocation: string;
}

export default function ReceivedChequesPage() {
  const { profile } = useAuth();
  const [cheques, setCheques] = useState<ReceivedCheque[]>([]);
  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashFunds, setCashFunds] = useState<CashFund[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<ReceivedCheque | null>(null);
  const [historyDialog, setHistoryDialog] = useState<ReceivedCheque | null>(null);
  const [opDialog, setOpDialog] = useState<OperationDialog | null>(null);
  const [opSubmitting, setOpSubmitting] = useState(false);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [chqData, partyData, baData, cfData, staffData] = await Promise.all([
        fetchData<ReceivedCheque>('received_cheques', {
          orderBy: { createdAt: 'desc' },
          include: { operations: { orderBy: { operationDate: 'desc' } } },
        }),
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<BankAccount>('bank_accounts', { where: { active: true } }),
        fetchData<CashFund>('cash_funds', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setCheques(chqData || []);
      setContactParties(partyData || []);
      setBankAccounts(baData || []);
      setCashFunds(cfData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری چک‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return cheques.filter((c) => {
      const num = c.chequeNumber.toLocaleLowerCase();
      const opNum = c.number.toLocaleLowerCase();
      const bank = c.bankName.toLocaleLowerCase();
      const issuer = (c.issuerName || partyName(c.issuerPartyId) || '').toLocaleLowerCase();
      const matchesQuery = !query || num.includes(query) || opNum.includes(query) || bank.includes(query) || issuer.includes(query);
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchesQuery && matchesStatus;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheques, search, filterStatus, contactParties]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: cheques.length,
    inCustody: cheques.filter((c) => ['received', 'in_custody', 'pending_due'].includes(c.status)).length,
    deposited: cheques.filter((c) => c.status === 'deposited').length,
    cleared: cheques.filter((c) => c.status === 'cleared').length,
    returned: cheques.filter((c) => c.status === 'returned').length,
    totalAmount: cheques.filter((c) => c.status !== 'voided' && c.status !== 'refunded').reduce((sum, c) => sum + Number(c.amount || 0), 0),
  }), [cheques]);

  const isDueSoon = (dueDate: string) => {
    const d = new Date(dueDate);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (['cleared', 'voided', 'refunded'].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این چک؟ این عملیات قابل بازگشت نیست.')) return;
    try {
      await deleteData('received_cheques', { id });
      toast.success('چک حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const openOpDialog = (type: OperationDialog['type'], chequeId: string) => {
    setOpDialog({
      type, chequeId, date: '', bankAccountId: '', cashFundId: '',
      counterpartyId: '', counterpartyName: '', reason: '', newLocation: '',
    });
  };

  const handleOperation = async () => {
    if (!opDialog || !profile) return;
    setOpSubmitting(true);
    try {
      const cheque = cheques.find((c) => c.id === opDialog.chequeId);
      if (!cheque) throw new Error('چک یافت نشد');

      const opDate = opDialog.date ? new Date(opDialog.date).toISOString() : new Date().toISOString();
      let newStatus = cheque.status;
      let updateDataObj: Record<string, any> = { updatedAt: new Date().toISOString() };
      let prevLocation = cheque.storageLocation || '';

      switch (opDialog.type) {
        case 'deposit':
          if (!opDialog.bankAccountId) throw new Error('انتخاب بانک مقصد الزامی است');
          newStatus = 'deposited';
          updateDataObj = { ...updateDataObj, status: newStatus, bankAccountId: opDialog.bankAccountId, storageLocation: 'بانک' };
          break;
        case 'clear':
          if (!opDialog.bankAccountId) throw new Error('انتخاب بانک الزامی است');
          newStatus = 'cleared';
          updateDataObj = { ...updateDataObj, status: newStatus, bankAccountId: opDialog.bankAccountId };
          break;
        case 'return':
          if (!opDialog.reason) throw new Error('علت برگشت الزامی است');
          newStatus = 'returned';
          updateDataObj = { ...updateDataObj, status: newStatus };
          break;
        case 'refund':
          newStatus = 'refunded';
          updateDataObj = { ...updateDataObj, status: newStatus };
          break;
        case 'transfer':
          if (!opDialog.counterpartyName && !opDialog.counterpartyId) throw new Error('گیرنده انتقال الزامی است');
          newStatus = 'transferred';
          updateDataObj = { ...updateDataObj, status: newStatus, storageLocation: opDialog.newLocation || 'منتقل‌شده' };
          break;
        case 'void':
          if (!opDialog.reason) throw new Error('دلیل ابطال الزامی است');
          newStatus = 'voided';
          updateDataObj = { ...updateDataObj, status: newStatus, description: cheque.description ? cheque.description + '\n[ابطال: ' + opDialog.reason + ']' : '[ابطال: ' + opDialog.reason + ']' };
          break;
      }

      await updateData('received_cheques', { id: opDialog.chequeId }, updateDataObj);

      await createData('received_cheque_operations', {
        chequeId: opDialog.chequeId,
        operationType: opDialog.type,
        fromStatus: cheque.status,
        toStatus: newStatus,
        operationDate: opDate,
        operationBy: profile.id,
        bankAccountId: opDialog.bankAccountId || null,
        cashFundId: opDialog.cashFundId || null,
        counterpartyId: opDialog.counterpartyId || null,
        counterpartyName: opDialog.counterpartyName || null,
        previousLocation: prevLocation || null,
        newLocation: updateDataObj.storageLocation || null,
        reason: opDialog.reason || null,
        details: {},
      });

      const opLabels: Record<string, string> = {
        deposit: 'واگذاری', clear: 'وصول', return: 'برگشت', refund: 'استرداد', transfer: 'انتقال', void: 'ابطال',
      };
      toast.success(`عملیات ${opLabels[opDialog.type]} با موفقیت ثبت شد`);
      setOpDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    } finally {
      setOpSubmitting(false);
    }
  };

  const renderHistory = (ops: ReceivedChequeOperation[]) => (
    <div className="space-y-2">
      {ops.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p>
        : ops.map((op) => (
          <div key={op.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
              {op.operationType === 'receive' ? <WalletCards className="h-3.5 w-3.5" /> :
               op.operationType === 'deposit' ? <Landmark className="h-3.5 w-3.5" /> :
               op.operationType === 'clear' ? <CheckCircle className="h-3.5 w-3.5" /> :
               op.operationType === 'return' ? <XCircle className="h-3.5 w-3.5" /> :
               op.operationType === 'void' ? <AlertTriangle className="h-3.5 w-3.5" /> :
               <RotateCcw className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{OP_LABEL[op.operationType] || op.operationType}</span>
                <span className="text-xs text-slate-400">{relativeTime(op.operationDate)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                توسط {staffName(op.operationBy)}
                {op.fromStatus && op.toStatus && <span className="mx-1">•</span>}
                {op.fromStatus && op.toStatus && <span>{CHEQUE_STATUS[op.fromStatus] || op.fromStatus} ← {CHEQUE_STATUS[op.toStatus] || op.toStatus}</span>}
                {op.reason && <div className="mt-1 text-rose-500">دلیل: {op.reason}</div>}
                {op.counterpartyName && <div className="mt-0.5">طرف: {op.counterpartyName}</div>}
              </div>
            </div>
          </div>
        ))}
    </div>
  );

  const opDialogTitle: Record<string, string> = {
    deposit: 'واگذاری چک به بانک',
    clear: 'وصول چک',
    return: 'برگشت چک',
    refund: 'استرداد چک',
    transfer: 'انتقال چک',
    void: 'ابطال چک',
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">چک‌های دریافتی</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> چک‌های دریافتی</div>
        </div>
        <Link href="/dashboard/received-cheques/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت چک دریافتی
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><WalletCards className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل چک‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.inCustody.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">نزد مجموعه</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.cleared.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">وصول‌شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><TrendingDown className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع چک‌ها (تومان)</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره چک، بانک، صادرکننده..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه وضعیت‌ها</option>
          {Object.entries(CHEQUE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : cheques.length === 0 ? (
        <Card><EmptyState icon={<WalletCards className="h-8 w-8" />} title="چکی یافت نشد" description="برای شروع، اولین چک دریافتی را ثبت کنید" action={<Link href="/dashboard/received-cheques/new"><Button><Plus className="h-4 w-4" /> افزودن چک</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((c) => {
              const stColor = CHEQUE_STATUS_COLOR[c.status] || '#64748b';
              const overdue = isOverdue(c.dueDate, c.status);
              const dueSoon = isDueSoon(c.dueDate);
              return (
                <div key={c.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => setDetailItem(c)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{c.chequeNumber}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{CHEQUE_STATUS[c.status] || c.status}</Badge>
                      {dueSoon && c.status !== 'cleared' && <Badge variant="outline" className="shrink-0 border-amber-200 text-[10px] text-amber-600">نزدیک سررسید</Badge>}
                      {overdue && <Badge variant="outline" className="shrink-0 border-rose-200 text-[10px] text-rose-600">گذشته از سررسید</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{c.bankName}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />سررسید: {formatJalali(c.dueDate)}</span>
                      {(c.issuerName || partyName(c.issuerPartyId)) && <span>صادرکننده: {c.issuerName || partyName(c.issuerPartyId)}</span>}
                      <span>{relativeTime(c.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(c.amount))}</div>
                    <div className="text-[10px] text-[#98A2B3]">مبلغ چک</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(c); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && c.status === 'received' && <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
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
            const stColor = CHEQUE_STATUS_COLOR[detailItem.status] || '#64748b';
            const overdue = isOverdue(detailItem.dueDate, detailItem.status);
            const dueSoon = isDueSoon(detailItem.dueDate);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">چک دریافتی {detailItem.chequeNumber}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailItem)}><RotateCcw className="h-4 w-4" /> گردش</Button>
                      {isSuperAdmin && detailItem.status === 'received' && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{CHEQUE_STATUS[detailItem.status] || detailItem.status}</Badge>
                    {dueSoon && detailItem.status !== 'cleared' && <Badge variant="outline" className="border-amber-200 text-amber-600">نزدیک سررسید</Badge>}
                    {overdue && <Badge variant="outline" className="border-rose-200 text-rose-600">گذشته از سررسید</Badge>}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">شماره چک</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{detailItem.chequeNumber}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">مبلغ</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailItem.amount))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">بانک</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{detailItem.bankName}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">تاریخ صدور</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatJalali(detailItem.issueDate)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">سررسید</div><div className="mt-1 text-sm font-bold text-[#344054]">{formatJalali(detailItem.dueDate)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">محل نگهداری</div><div className="mt-1 text-sm font-bold text-[#344054]">{detailItem.storageLocation || '—'}</div></div>
                  </div>

                  {/* Additional info */}
                  <div className="space-y-1.5 text-xs text-[#667085]">
                    {detailItem.sayadiNumber && <div className="flex items-center gap-1"><Hash className="h-3 w-3" />شناسه صیادی: {detailItem.sayadiNumber}</div>}
                    {detailItem.branchName && <div>شعبه: {detailItem.branchName}</div>}
                    {detailItem.issuerAccountNo && <div>شماره حساب صادرکننده: {detailItem.issuerAccountNo}</div>}
                    {(detailItem.issuerName || partyName(detailItem.issuerPartyId)) && <div>صادرکننده: {detailItem.issuerName || partyName(detailItem.issuerPartyId)}</div>}
                    {detailItem.receiverName && <div>دریافت‌کننده: {detailItem.receiverName}</div>}
                    {detailItem.subject && <div>بابت: {detailItem.subject}</div>}
                    {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600">{detailItem.description}</div>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {['received', 'in_custody', 'pending_due'].includes(detailItem.status) && isSuperAdmin && (
                      <Button variant="outline" onClick={() => openOpDialog('deposit', detailItem.id)}><Landmark className="h-4 w-4" /> واگذاری به بانک</Button>
                    )}
                    {['deposited', 'pending_due'].includes(detailItem.status) && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => openOpDialog('clear', detailItem.id)}><CheckCircle className="h-4 w-4" /> وصول</Button>
                    )}
                    {['received', 'in_custody', 'pending_due', 'deposited'].includes(detailItem.status) && isSuperAdmin && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => openOpDialog('return', detailItem.id)}><XCircle className="h-4 w-4" /> برگشت</Button>
                    )}
                    {['received', 'in_custody', 'pending_due'].includes(detailItem.status) && isSuperAdmin && (
                      <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50" onClick={() => openOpDialog('refund', detailItem.id)}><RotateCcw className="h-4 w-4" /> استرداد</Button>
                    )}
                    {['received', 'in_custody', 'pending_due'].includes(detailItem.status) && isSuperAdmin && (
                      <Button variant="outline" className="border-sky-200 text-sky-600 hover:bg-sky-50" onClick={() => openOpDialog('transfer', detailItem.id)}><ArrowRightLeft className="h-4 w-4" /> انتقال</Button>
                    )}
                    {detailItem.status !== 'voided' && detailItem.status !== 'cleared' && isSuperAdmin && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => openOpDialog('void', detailItem.id)}><AlertTriangle className="h-4 w-4" /> ابطال</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>گردش چک</DialogTitle></DialogHeader>
          {historyDialog && renderHistory(historyDialog.operations || [])}
        </DialogContent>
      </Dialog>

      {/* Operation Dialog */}
      <Dialog open={!!opDialog} onOpenChange={(o) => !o && setOpDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{opDialog ? opDialogTitle[opDialog.type] : ''}</DialogTitle></DialogHeader>
          {opDialog && (
            <div className="space-y-4">
              {(opDialog.type === 'deposit' || opDialog.type === 'clear') && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">بانک مقصد <span className="text-rose-500">*</span></Label>
                  <Select value={opDialog.bankAccountId} onValueChange={(v) => setOpDialog((d) => d ? { ...d, bankAccountId: v } : null)}>
                    <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><Landmark className="h-4 w-4 text-[#98A2B3]" /><SelectValue placeholder="انتخاب بانک..." /></SelectTrigger>
                    <SelectContent>{bankAccounts.map((ba) => <SelectItem key={ba.id} value={ba.id}>{ba.name} ({ba.bankName})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {opDialog.type === 'transfer' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">گیرنده <span className="text-rose-500">*</span></Label>
                    <Input value={opDialog.counterpartyName} onChange={(e) => setOpDialog((d) => d ? { ...d, counterpartyName: e.target.value } : null)} placeholder="نام گیرنده..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">محل جدید</Label>
                    <Input value={opDialog.newLocation} onChange={(e) => setOpDialog((d) => d ? { ...d, newLocation: e.target.value } : null)} placeholder="محل نگهداری جدید..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </>
              )}
              {(opDialog.type === 'return' || opDialog.type === 'void') && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">{opDialog.type === 'return' ? 'علت برگشت' : 'دلیل ابطال'} <span className="text-rose-500">*</span></Label>
                  <Textarea value={opDialog.reason} onChange={(e) => setOpDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              )}
              {opDialog.type === 'refund' && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">شخص تحویل‌گیرنده</Label>
                  <Input value={opDialog.counterpartyName} onChange={(e) => setOpDialog((d) => d ? { ...d, counterpartyName: e.target.value } : null)} placeholder="نام تحویل‌گیرنده..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">تاریخ عملیات</Label>
                <div className="date-input-wrap">
                  <span className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-3">
                    <Calendar className="h-4 w-4 text-[#98A2B3]" />
                    <JalaliDatePicker value={opDialog.date ? new Date(opDialog.date) : null} onChange={(d) => setOpDialog((p) => p ? { ...p, date: d ? toLocalDateString(d) : '' } : null)} placeholder="انتخاب تاریخ" className="h-[42px] flex-1 border-0 p-0 focus:ring-0" />
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpDialog(null)}>انصراف</Button>
            <Button onClick={handleOperation} disabled={opSubmitting}>
              {opSubmitting ? <><Clock className="h-4 w-4 animate-spin" /> در حال ثبت...</> : 'ثبت عملیات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
