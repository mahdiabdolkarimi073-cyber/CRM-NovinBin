'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData } from '@/lib/data-client';
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
  Wallet, Plus, Search, Trash2, Eye, Calendar, Landmark,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  ArrowDownToLine, FileText, TrendingUp, TrendingDown,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { PettyCashCustodian, PettyCashPayment, PettyCashExpense, BankAccount, Profile, ContactParty, Account } from '@/lib/types';

const CUSTODIAN_TYPES: Record<string, string> = {
  fixed: 'ثابت',
  variable: 'متغیر',
};

const EXPENSE_STATUS: Record<string, string> = {
  pending: 'در انتظار تأیید',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

const EXPENSE_STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

export default function PettyCashPage() {
  const { profile } = useAuth();
  const [custodians, setCustodians] = useState<PettyCashCustodian[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<PettyCashCustodian | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'payments' | 'expenses'>('info');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ bankAccountId: '', amount: '', date: '', description: '' });
  const [expenseForm, setExpenseForm] = useState({ number: '', date: '', expenseType: '', amount: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custData, bankData, staffData, partyData, accData] = await Promise.all([
        fetchData<PettyCashCustodian>('petty_cash_custodians', {
          where: {},
          orderBy: { createdAt: 'desc' },
          include: { contactParty: true, profile: true, account: true, payments: { include: { bankAccount: true } }, expenses: true },
        }),
        fetchData<BankAccount>('bank_accounts', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Account>('accounts', { where: {} }),
      ]);
      setCustodians(custData || []);
      setBankAccounts(bankData || []);
      setStaff(staffData || []);
      setContactParties(partyData || []);
      setAccounts(accData || []);
    } catch (error: any) {
      toast.error('بارگذاری تنخواه‌دارها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const partyLabel = (p: ContactParty) => {
    if (p.type === 'individual') return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام';
    return p.companyName || 'بدون نام';
  };

  const custodianName = (c: PettyCashCustodian) => {
    if (c.contactParty) return partyLabel(c.contactParty);
    if (c.profile) return fullName(c.profile.firstName, c.profile.lastName);
    return 'بدون نام';
  };

  const bankName = (id: string | null) => {
    if (!id) return null;
    const b = bankAccounts.find((a) => a.id === id);
    return b ? `${b.bankName} - ${b.accountNo}` : null;
  };

  const accountName = (id: string | null) => {
    if (!id) return null;
    const a = accounts.find((acc) => acc.id === id);
    return a ? `${a.code} - ${a.name}` : null;
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return custodians.filter((c) => {
      const name = custodianName(c).toLocaleLowerCase();
      const code = c.code.toLocaleLowerCase();
      const matchesQuery = !query || name.includes(query) || code.includes(query);
      const matchesActive = filterActive === 'all' || (filterActive === 'active' && c.active) || (filterActive === 'inactive' && !c.active);
      return matchesQuery && matchesActive;
    });
  }, [custodians, search, filterActive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getCustodianBalance = (c: PettyCashCustodian) => {
    const totalPayments = (c.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalExpenses = (c.expenses || []).filter((e) => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return totalPayments - totalExpenses;
  };

  const getTotalExpenses = (c: PettyCashCustodian) => {
    return (c.expenses || []).filter((e) => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  };

  const getPendingExpenses = (c: PettyCashCustodian) => {
    return (c.expenses || []).filter((e) => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  };

  const stats = useMemo(() => ({
    total: custodians.length,
    active: custodians.filter((c) => c.active).length,
    totalCeiling: custodians.reduce((sum, c) => sum + Number(c.ceiling || 0), 0),
    totalBalance: custodians.reduce((sum, c) => sum + getCustodianBalance(c), 0),
  }), [custodians]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این تنخواه‌دار؟')) return;
    try {
      await deleteData('petty_cash_custodians', { id });
      toast.success('تنخواه‌دار حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleAddPayment = async () => {
    if (!detailItem || !profile) return;
    if (!paymentForm.amount) { toast.error('مبلغ را وارد کنید'); return; }
    setSubmitting(true);
    try {
      await createPayment(detailItem.id, {
        bankAccountId: paymentForm.bankAccountId || null,
        amount: Number(paymentForm.amount),
        date: paymentForm.date ? new Date(paymentForm.date).toISOString() : new Date().toISOString(),
        description: paymentForm.description || null,
        createdBy: profile.id,
      });
      toast.success('پرداخت ثبت شد');
      setShowPaymentDialog(false);
      setPaymentForm({ bankAccountId: '', amount: '', date: '', description: '' });
      loadData();
    } catch (error: any) {
      toast.error('ثبت ناموفق: ' + error.message);
    }
    setSubmitting(false);
  };

  const handleAddExpense = async () => {
    if (!detailItem || !profile) return;
    if (!expenseForm.amount || !expenseForm.expenseType) { toast.error('نوع و مبلغ هزینه الزامی است'); return; }
    setSubmitting(true);
    try {
      await createExpense(detailItem.id, {
        number: expenseForm.number || `EXP-${Date.now()}`,
        date: expenseForm.date ? new Date(expenseForm.date).toISOString() : new Date().toISOString(),
        expenseType: expenseForm.expenseType,
        amount: Number(expenseForm.amount),
        description: expenseForm.description || null,
        status: 'pending',
        createdBy: profile.id,
      });
      toast.success('هزینه ثبت شد');
      setShowExpenseDialog(false);
      setExpenseForm({ number: '', date: '', expenseType: '', amount: '', description: '' });
      loadData();
    } catch (error: any) {
      toast.error('ثبت ناموفق: ' + error.message);
    }
    setSubmitting(false);
  };

  const handleApproveExpense = async (expenseId: string) => {
    if (!profile) return;
    try {
      await updateData('petty_cash_expenses', { id: expenseId }, { status: 'approved', approvedBy: profile.id, approvedAt: new Date().toISOString() });
      toast.success('هزینه تأیید شد');
      loadData();
    } catch (error: any) {
      toast.error('تأیید ناموفق: ' + error.message);
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    try {
      await updateData('petty_cash_expenses', { id: expenseId }, { status: 'rejected' });
      toast.success('هزینه رد شد');
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  // Helper functions to create nested records via API
  async function createPayment(custodianId: string, data: Record<string, any>) {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'petty_cash_payments', data: { ...data, custodianId } }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Create failed');
    return json.data;
  }

  async function createExpense(custodianId: string, data: Record<string, any>) {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'petty_cash_expenses', data: { ...data, custodianId } }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Create failed');
    return json.data;
  }

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">تنخواه‌دار</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> تنخواه‌دار</div>
        </div>
        <Link href="/dashboard/petty-cash/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ایجاد تنخواه
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Wallet className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل تنخواه‌دارها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.active.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">فعال</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><TrendingUp className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalCeiling)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع سقف تنخواه (تومان)</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#06b6d4]/10 text-[#06b6d4]"><ArrowDownToLine className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalBalance)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مانده فعلی (تومان)</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجوی تنخواه‌دار..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[300px]" />
        </div>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه</option>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : custodians.length === 0 ? (
        <Card><EmptyState icon={<Wallet className="h-8 w-8" />} title="تنخواه‌داری یافت نشد" description="برای شروع، اولین تنخواه‌دار را ایجاد کنید" action={<Link href="/dashboard/petty-cash/new"><Button><Plus className="h-4 w-4" /> افزودن تنخواه‌دار</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((c) => {
              const balance = getCustodianBalance(c);
              const totalExp = getTotalExpenses(c);
              const pendingExp = getPendingExpenses(c);
              const overCeiling = balance > Number(c.ceiling);
              return (
                <div key={c.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => { setDetailItem(c); setDetailTab('info'); }}>
                  <div className={`h-10 w-2 rounded-full ${c.active ? 'bg-[#10b981]' : 'bg-[#CBD5E1]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{custodianName(c)}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{c.code}</Badge>
                      {!c.active && <Badge variant="outline" className="shrink-0 border-[#CBD5E1] text-[10px] text-[#98A2B3]">غیرفعال</Badge>}
                      {overCeiling && <Badge variant="outline" className="shrink-0 border-rose-300 text-[10px] text-rose-600">مازاد</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span>نوع: {CUSTODIAN_TYPES[c.type] || c.type}</span>
                      {accountName(c.accountId) && <span className="flex items-center gap-1"><Landmark className="h-3 w-3" />{accountName(c.accountId)}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(c.startDate)}</span>
                      {pendingExp > 0 && <span className="flex items-center gap-1 text-amber-500"><Clock className="h-3 w-3" />در انتظار: {formatToman(pendingExp)}</span>}
                    </div>
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="text-xs text-[#98A2B3]">سقف: {formatToman(Number(c.ceiling))}</div>
                    <div className="text-xs text-[#98A2B3]">هزینه‌ها: {formatToman(totalExp)}</div>
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold ${overCeiling ? 'text-rose-500' : 'text-[#3155E7]'}`}>{formatToman(balance)}</div>
                    <div className="text-[10px] text-[#98A2B3]">مانده</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(c); setDetailTab('info'); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
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
            const balance = getCustodianBalance(detailItem);
            const totalExp = getTotalExpenses(detailItem);
            const pendingExp = getPendingExpenses(detailItem);
            const overCeiling = balance > Number(detailItem.ceiling);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">{custodianName(detailItem)}</DialogTitle>
                    {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200 pb-2">
                  {(['info', 'payments', 'expenses'] as const).map((tab) => (
                    <button key={tab} onClick={() => setDetailTab(tab)} className={`rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors ${detailTab === tab ? 'bg-[#EFF4FF] text-[#2563EB]' : 'text-[#667085] hover:bg-[#F1F5F9]'}`}>
                      {tab === 'info' ? 'اطلاعات' : tab === 'payments' ? 'پرداخت‌ها' : 'هزینه‌ها'}
                    </button>
                  ))}
                </div>

                {detailTab === 'info' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#E6EBF2] bg-[#FAFBFC] p-4 text-sm">
                      <div><div className="text-xs text-[#98A2B3]">کد تنخواه‌دار</div><div className="font-semibold text-[#1D2939]">{detailItem.code}</div></div>
                      <div><div className="text-xs text-[#98A2B3]">نوع تنخواه</div><div className="font-semibold text-[#1D2939]">{CUSTODIAN_TYPES[detailItem.type] || detailItem.type}</div></div>
                      <div><div className="text-xs text-[#98A2B3]">حساب تفصیلی</div><div className="font-semibold text-[#1D2939]">{accountName(detailItem.accountId) || '—'}</div></div>
                      <div><div className="text-xs text-[#98A2B3]">تاریخ شروع</div><div className="font-semibold text-[#1D2939]">{formatJalali(detailItem.startDate)}</div></div>
                      <div><div className="text-xs text-[#98A2B3]">وضعیت</div><div className="font-semibold text-[#1D2939]">{detailItem.active ? 'فعال' : 'غیرفعال'}</div></div>
                    </div>
                    {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}

                    {/* Balance summary */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">سقف تنخواه</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatToman(Number(detailItem.ceiling))}</div></div>
                      <div className="rounded-[10px] bg-[#E0F2FE] p-3"><div className="text-xs text-[#667085]">کل پرداخت‌ها</div><div className="mt-1 text-sm font-bold text-[#0284C7]">{formatToman((detailItem.payments || []).reduce((s, p) => s + Number(p.amount), 0))}</div></div>
                      <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">هزینه‌های تأییدشده</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(totalExp)}</div></div>
                      <div className={`rounded-[10px] p-3 ${overCeiling ? 'bg-rose-50' : 'bg-[#DCFCE7]'}`}><div className="text-xs text-[#667085]">مانده</div><div className={`mt-1 text-sm font-bold ${overCeiling ? 'text-rose-600' : 'text-[#16A34A]'}`}>{formatToman(balance)}</div></div>
                    </div>
                    {pendingExp > 0 && <div className="rounded-[10px] bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700">هزینه‌های در انتظار تأیید: {formatToman(pendingExp)} تومان</div>}
                  </div>
                )}

                {detailTab === 'payments' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-700">پرداخت‌های تنخواه</h4>
                      {isSuperAdmin && <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)}><Plus className="h-4 w-4" /> ثبت پرداخت</Button>}
                    </div>
                    {(detailItem.payments || []).length === 0 ? <p className="py-4 text-center text-xs text-slate-400">پرداختی ثبت نشده است</p> : (
                      <div className="space-y-2">
                        {(detailItem.payments || []).map((p) => (
                          <div key={p.id} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-[#1D2939]">{formatToman(Number(p.amount))} تومان</span>
                              <span className="text-xs text-[#98A2B3]">{formatJalali(p.date)}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-[#98A2B3]">
                              {bankName(p.bankAccountId) && <span className="flex items-center gap-1"><Landmark className="h-3 w-3" />{bankName(p.bankAccountId)}</span>}
                              {p.description && <span>{p.description}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'expenses' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-700">هزینه‌های تنخواه</h4>
                      <Button size="sm" variant="outline" onClick={() => setShowExpenseDialog(true)}><Plus className="h-4 w-4" /> ثبت هزینه</Button>
                    </div>
                    {(detailItem.expenses || []).length === 0 ? <p className="py-4 text-center text-xs text-slate-400">هزینه‌ای ثبت نشده است</p> : (
                      <div className="space-y-2">
                        {(detailItem.expenses || []).map((e) => {
                          const stColor = EXPENSE_STATUS_COLOR[e.status] || '#64748b';
                          return (
                            <div key={e.id} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#1D2939]">{e.expenseType}</span>
                                  <Badge variant="outline" className="text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{EXPENSE_STATUS[e.status] || e.status}</Badge>
                                </div>
                                <span className="text-sm font-bold text-[#1D2939]">{formatToman(Number(e.amount))} تومان</span>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs text-[#98A2B3]">
                                <span>سند: {e.number}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(e.date)}</span>
                                {e.description && <span>{e.description}</span>}
                              </div>
                              {e.status === 'pending' && isSuperAdmin && (
                                <div className="mt-2 flex gap-2">
                                  <Button size="sm" variant="outline" className="h-7 border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApproveExpense(e.id)}><CheckCircle className="h-3.5 w-3.5" /> تأیید</Button>
                                  <Button size="sm" variant="outline" className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleRejectExpense(e.id)}><XCircle className="h-3.5 w-3.5" /> رد</Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ثبت پرداخت تنخواه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">حساب بانکی</label>
              <select value={paymentForm.bankAccountId} onChange={(e) => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm">
                <option value="">بدون حساب</option>
                {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">مبلغ (تومان) *</label>
              <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="مثال: 5000000" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">تاریخ</label>
              <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">توضیحات</label>
              <Input value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="اختیاری" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>انصراف</Button>
            <Button onClick={handleAddPayment} disabled={submitting}>{submitting ? 'در حال ثبت...' : 'ثبت پرداخت'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ثبت هزینه تنخواه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">نوع هزینه *</label>
              <Input value={expenseForm.expenseType} onChange={(e) => setExpenseForm({ ...expenseForm, expenseType: e.target.value })} placeholder="مثال: لوازم اداری" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">مبلغ (تومان) *</label>
              <Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="مثال: 3000000" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">شماره سند</label>
              <Input value={expenseForm.number} onChange={(e) => setExpenseForm({ ...expenseForm, number: e.target.value })} placeholder="اختیاری" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">تاریخ</label>
              <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">شرح</label>
              <Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="اختیاری" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>انصراف</Button>
            <Button onClick={handleAddExpense} disabled={submitting}>{submitting ? 'در حال ثبت...' : 'ثبت هزینه'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
