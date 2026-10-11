'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  FileCheck, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, Wallet, TrendingDown, Handshake, Send,
  RotateCcw, Eye, AlertTriangle, User, Landmark,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  ContactSettlement, ContactSettlementItem, ContactSettlementHistory,
  ContactParty, Profile, FiscalYear, CostCenter, BankAccount, CashFund,
} from '@/lib/types';

const SETTLEMENT_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending_approval: 'در انتظار تأیید',
  approved: 'تأیید شده',
  finalized: 'نهایی شده',
  voided: 'باطل شده',
  cancelled: 'لغو شده',
};

const SETTLEMENT_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  pending_approval: '#f59e0b',
  approved: '#10b981',
  finalized: '#6366f1',
  voided: '#ef4444',
  cancelled: '#64748b',
};

const SETTLEMENT_TYPE: Record<string, string> = {
  full: 'تسویه کامل',
  partial: 'تسویه جزئی',
  multi_document: 'تسویه چند سندی',
  from_payment: 'از طریق پرداخت',
  from_receipt: 'از طریق دریافت',
  setoff: 'تهاتر',
  adjustment: 'تعدیل',
};

const ITEM_TYPE: Record<string, string> = {
  invoice: 'فاکتور',
  debt: 'بدهی',
  credit: 'بستانکاری',
  receipt: 'رسید',
  payment: 'پرداخت',
  prepayment: 'پیش‌پرداخت',
  on_account: 'حساب جاری',
  cheque_receivable: 'چک دریافتی',
  cheque_payable: 'چک پرداختی',
  other: 'سایر',
};

const ITEM_STATUS: Record<string, string> = {
  open: 'باز',
  partial: 'جزئی',
  settled: 'تسویه شده',
  closed: 'بسته شده',
  voided: 'باطل شده',
};

const ITEM_STATUS_COLOR: Record<string, string> = {
  open: '#f59e0b',
  partial: '#3b82f6',
  settled: '#10b981',
  closed: '#64748b',
  voided: '#ef4444',
};

export default function ContactSettlementsPage() {
  const { profile } = useAuth();
  const [settlements, setSettlements] = useState<ContactSettlement[]>([]);
  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashFunds, setCashFunds] = useState<CashFund[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterParty, setFilterParty] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<ContactSettlement | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [historyDialog, setHistoryDialog] = useState<ContactSettlement | null>(null);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const partyName = (id: string | null | undefined) => {
    if (!id) return '—';
    const p = contactParties.find((c) => c.id === id);
    if (!p) return '—';
    if (p.type === 'individual') return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام';
    return p.companyName || 'بدون نام';
  };

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stmtData, partyData, fyData, ccData, baData, cfData, staffData] = await Promise.all([
        fetchData<ContactSettlement>('contact_settlements', {
          orderBy: { createdAt: 'desc' },
          include: { items: true, history: { orderBy: { actionAt: 'desc' } } },
        }),
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<FiscalYear>('fiscal_years', { where: {} }),
        fetchData<CostCenter>('cost_centers', { where: {} }),
        fetchData<BankAccount>('bank_accounts', { where: { active: true } }),
        fetchData<CashFund>('cash_funds', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setSettlements(stmtData || []);
      setContactParties(partyData || []);
      setFiscalYears(fyData || []);
      setCostCenters(ccData || []);
      setBankAccounts(baData || []);
      setCashFunds(cfData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری تسویه‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return settlements.filter((s) => {
      const name = partyName(s.contactPartyId).toLocaleLowerCase();
      const num = s.number.toLocaleLowerCase();
      const matchesQuery = !query || name.includes(query) || num.includes(query);
      const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchesParty = filterParty === 'all' || s.contactPartyId === filterParty;
      return matchesQuery && matchesStatus && matchesParty;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settlements, search, filterStatus, filterParty, contactParties]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: settlements.length,
    pending: settlements.filter((s) => s.status === 'pending_approval').length,
    finalized: settlements.filter((s) => s.status === 'finalized').length,
    totalAmount: settlements.filter((s) => s.status !== 'cancelled' && s.status !== 'voided').reduce((sum, s) => sum + Number(s.totalAmount || 0), 0),
  }), [settlements]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این تسویه حساب؟ این عملیات قابل بازگشت نیست.')) return;
    try {
      await deleteData('contact_settlements', { id });
      toast.success('تسویه حساب حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await updateData('contact_settlements', { id }, { status: 'pending_approval' });
      await createData('contact_settlement_history', {
        settlementId: id, action: 'submitted', actionBy: profile?.id,
        fromStatus: 'draft', toStatus: 'pending_approval', details: {},
      });
      toast.success('تسویه حساب برای تأیید ارسال شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleApprove = async (id: string) => {
    if (!profile) return;
    try {
      await updateData('contact_settlements', { id }, {
        status: 'approved',
        approvedBy: profile.id,
        approvedAt: new Date().toISOString(),
      });
      await createData('contact_settlement_history', {
        settlementId: id, action: 'approved', actionBy: profile.id,
        fromStatus: 'pending_approval', toStatus: 'approved', details: {},
      });
      toast.success('تسویه حساب تأیید شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('تأیید ناموفق: ' + error.message); }
  };

  const handleFinalize = async (id: string) => {
    if (!profile) return;
    try {
      await updateData('contact_settlements', { id }, {
        status: 'finalized',
        finalizedBy: profile.id,
        finalizedAt: new Date().toISOString(),
      });
      await createData('contact_settlement_history', {
        settlementId: id, action: 'finalized', actionBy: profile.id,
        fromStatus: 'approved', toStatus: 'finalized', details: {},
      });
      toast.success('تسویه حساب نهایی شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleVoid = async () => {
    if (!voidDialog || !profile) return;
    try {
      await updateData('contact_settlements', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
      });
      await createData('contact_settlement_history', {
        settlementId: voidDialog.id, action: 'voided', actionBy: profile.id,
        toStatus: 'voided', details: {}, reason: voidDialog.reason || null,
      });
      toast.success('تسویه حساب باطل شد');
      setVoidDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const fiscalYearName = (id: string | null) => {
    if (!id) return null;
    const fy = fiscalYears.find((f) => f.id === id);
    return fy ? fy.name : null;
  };

  const costCenterName = (id: string | null) => {
    if (!id) return null;
    const cc = costCenters.find((c) => c.id === id);
    return cc ? `${cc.code} - ${cc.name}` : null;
  };

  const fundName = (s: ContactSettlement) => {
    if (s.fundType === 'bank' && s.bankAccountId) {
      const ba = bankAccounts.find((b) => b.id === s.bankAccountId);
      return ba ? `${ba.name} (${ba.bankName})` : null;
    }
    if (s.fundType === 'cash' && s.cashFundId) {
      const cf = cashFunds.find((c) => c.id === s.cashFundId);
      return cf ? cf.name : null;
    }
    if (s.fundType === 'setoff') return 'تهاتر';
    return null;
  };

  const renderHistory = (history: ContactSettlementHistory[]) => {
    const actionLabel: Record<string, string> = {
      created: 'ایجاد شد',
      submitted: 'ارسال شد',
      approved: 'تأیید شد',
      rejected: 'رد شد',
      finalized: 'نهایی شد',
      voided: 'باطل شد',
      cancelled: 'لغو شد',
      amended: 'اصلاح شد',
    };
    return (
      <div className="space-y-2">
        {history.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p>
          : history.map((h) => (
            <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
                {h.action === 'created' ? <FileCheck className="h-3.5 w-3.5" /> : h.action === 'voided' ? <XCircle className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{actionLabel[h.action] || h.action}</span>
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
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">تسویه حساب طرف مقابل</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> تسویه حساب طرف مقابل</div>
        </div>
        <Link href="/dashboard/contact-settlements/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ایجاد تسویه حساب
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Handshake className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل تسویه‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">در انتظار تأیید</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#6366f1]/10 text-[#6366f1]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.finalized.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">نهایی شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><TrendingDown className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع تسویه (تومان)</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره یا طرف مقابل..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[300px]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه طرف‌های مقابل</option>
            {contactParties.map((p) => <option key={p.id} value={p.id}>{p.type === 'individual' ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : p.companyName || 'بدون نام'}</option>)}
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
        <Card><EmptyState icon={<Handshake className="h-8 w-8" />} title="تسویه‌ای یافت نشد" description="برای شروع، اولین تسویه حساب طرف مقابل را ایجاد کنید" action={<Link href="/dashboard/contact-settlements/new"><Button><Plus className="h-4 w-4" /> افزودن تسویه</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((s) => {
              const stColor = SETTLEMENT_STATUS_COLOR[s.status] || '#64748b';
              return (
                <div key={s.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => setDetailItem(s)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{s.number}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{SETTLEMENT_STATUS[s.status] || s.status}</Badge>
                      <Badge variant="outline" className="shrink-0 text-[10px] text-[#667085]">{SETTLEMENT_TYPE[s.settlementType] || s.settlementType}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{partyName(s.contactPartyId)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(s.settlementDate)}</span>
                      {fiscalYearName(s.fiscalYearId) && <span>{fiscalYearName(s.fiscalYearId)}</span>}
                      <span>{relativeTime(s.createdAt)}</span>
                      <span>{(s.items || []).length.toLocaleString('fa-IR')} قلم</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(s.totalAmount))}</div>
                    <div className="text-[10px] text-[#98A2B3]">مبلغ تسویه</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(s); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && s.status === 'draft' && <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
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
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {detailItem && (() => {
            const stColor = SETTLEMENT_STATUS_COLOR[detailItem.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">تسویه حساب {detailItem.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailItem)}><RotateCcw className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && detailItem.status === 'draft' && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{SETTLEMENT_STATUS[detailItem.status] || detailItem.status}</Badge>
                    <Badge variant="outline" className="text-xs text-[#667085]">{SETTLEMENT_TYPE[detailItem.settlementType] || detailItem.settlementType}</Badge>
                    <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><User className="h-3 w-3" />{partyName(detailItem.contactPartyId)}</span>
                    <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><Calendar className="h-3 w-3" />{formatJalali(detailItem.settlementDate)}</span>
                    {fiscalYearName(detailItem.fiscalYearId) && <span className="text-xs text-[#98A2B3]">{fiscalYearName(detailItem.fiscalYearId)}</span>}
                    {costCenterName(detailItem.costCenterId) && <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><Landmark className="h-3 w-3" />{costCenterName(detailItem.costCenterId)}</span>}
                    {fundName(detailItem) && <span className="text-xs text-[#98A2B3]">{fundName(detailItem)}</span>}
                  </div>

                  {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}
                  {detailItem.voidReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل ابطال: </strong>{detailItem.voidReason}</p></div>}

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">تعداد اقلام</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{(detailItem.items || []).length.toLocaleString('fa-IR')}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">مبلغ کل</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailItem.totalAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">بدهکاری</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatToman(Number(detailItem.totalDebit))}</div></div>
                    <div className="rounded-[10px] bg-[#FEE2E2] p-3"><div className="text-xs text-[#667085]">بستانکاری</div><div className="mt-1 text-sm font-bold text-[#DC2626]">{formatToman(Number(detailItem.totalCredit))}</div></div>
                  </div>

                  {/* Items */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center gap-2"><FileCheck className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">اقلام تسویه</h4><Badge variant="secondary" className="text-xs">{(detailItem.items || []).length.toLocaleString('fa-IR')}</Badge></div>
                    <div className="space-y-2">
                      {(detailItem.items || []).length === 0 ? <p className="py-4 text-center text-xs text-slate-400">قلمی ثبت نشده است</p>
                        : (detailItem.items || []).map((item: ContactSettlementItem) => {
                          const isColor = ITEM_STATUS_COLOR[item.itemStatus] || '#64748b';
                          return (
                            <div key={item.id} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] text-[#667085]">{ITEM_TYPE[item.itemType] || item.itemType}</Badge>
                                  {item.referenceNumber && <span className="text-sm font-semibold text-[#1D2939]">{item.referenceNumber}</span>}
                                  <Badge variant="outline" className="text-[10px]" style={{ color: isColor, borderColor: `${isColor}35`, backgroundColor: `${isColor}10` }}>{ITEM_STATUS[item.itemStatus] || item.itemStatus}</Badge>
                                </div>
                                <span className="text-sm font-bold text-[#1D2939]">{formatToman(Number(item.allocationAmount))} تومان</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                                <span>اصل: {formatToman(Number(item.originalAmount))}</span>
                                <span>پرداخت‌شده: {formatToman(Number(item.paidAmount))}</span>
                                <span>مانده: {formatToman(Number(item.balance))}</span>
                                {Number(item.discount) > 0 && <span className="text-amber-600">تخفیف: {formatToman(Number(item.discount))}</span>}
                                {item.description && <span className="truncate">{item.description}</span>}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detailItem.status === 'draft' && isSuperAdmin && <Button variant="outline" onClick={() => handleSubmit(detailItem.id)}><Send className="h-4 w-4" /> ارسال برای تأیید</Button>}
                    {detailItem.status === 'pending_approval' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApprove(detailItem.id)}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                    )}
                    {detailItem.status === 'approved' && isSuperAdmin && <Button variant="outline" onClick={() => handleFinalize(detailItem.id)}><FileCheck className="h-4 w-4" /> نهایی کردن</Button>}
                    {isSuperAdmin && detailItem.status !== 'cancelled' && detailItem.status !== 'voided' && detailItem.status !== 'finalized' && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => setVoidDialog({ id: detailItem.id, reason: '' })}><AlertTriangle className="h-4 w-4" /> ابطال</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ابطال تسویه حساب</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">با ابطال تسویه حساب، این سند غیرفعال می‌شود و عملیات قابل بازگشت نیست.</div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">دلیل ابطال</label>
              <Input value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل ابطال..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleVoid}>ابطال تسویه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه تسویه حساب</DialogTitle></DialogHeader>
          {historyDialog && renderHistory(historyDialog.history || [])}
        </DialogContent>
      </Dialog>
    </div>
  );
}
