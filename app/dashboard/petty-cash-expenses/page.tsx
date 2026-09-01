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
  FileText, Plus, Search, Trash2, Eye, Calendar,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  Wallet, TrendingDown, FileCheck, Send, RotateCcw,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  PettyCashExpenseStatement, PettyCashCustodian, Profile,
  FiscalYear, CostCenter, PettyCashExpenseStatementItem,
} from '@/lib/types';

const STATEMENT_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ثبت شده',
  pending_approval: 'در انتظار تأیید',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  returned: 'برگشت برای اصلاح',
  accounting_posted: 'ثبت حسابداری',
  settled: 'تسویه شده',
};

const STATEMENT_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  submitted: '#3b82f6',
  pending_approval: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  returned: '#f97316',
  accounting_posted: '#6366f1',
  settled: '#16a34a',
};

const ITEM_STATUS: Record<string, string> = {
  pending: 'در انتظار',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

const ITEM_STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

export default function PettyCashExpensesPage() {
  const { profile } = useAuth();
  const [statements, setStatements] = useState<PettyCashExpenseStatement[]>([]);
  const [custodians, setCustodians] = useState<PettyCashCustodian[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCustodian, setFilterCustodian] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<PettyCashExpenseStatement | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stmtData, custData, fyData, ccData, staffData] = await Promise.all([
        fetchData<PettyCashExpenseStatement>('petty_cash_expense_statements', {
          where: {},
          orderBy: { createdAt: 'desc' },
          include: {
            custodian: { include: { contactParty: true, profile: true } },
            fiscalYear: true,
            costCenter: true,
            items: { include: { account: true, costCenter: true, documents: true } },
          },
        }),
        fetchData<PettyCashCustodian>('petty_cash_custodians', {
          where: {},
          include: { contactParty: true, profile: true, payments: true, expenses: true },
        }),
        fetchData<FiscalYear>('fiscal_years', { where: {} }),
        fetchData<CostCenter>('cost_centers', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setStatements(stmtData || []);
      setCustodians(custData || []);
      setFiscalYears(fyData || []);
      setCostCenters(ccData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری صورت هزینه‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const custodianName = (c: PettyCashCustodian | null | undefined) => {
    if (!c) return '—';
    if (c.contactParty) {
      if (c.contactParty.type === 'individual') return `${c.contactParty.firstName || ''} ${c.contactParty.lastName || ''}`.trim() || 'بدون نام';
      return c.contactParty.companyName || 'بدون نام';
    }
    if (c.profile) return fullName(c.profile.firstName, c.profile.lastName);
    return 'بدون نام';
  };

  const getCustodianBalance = (c: PettyCashCustodian) => {
    const totalPayments = (c.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalExpenses = (c.expenses || []).filter((e) => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return totalPayments - totalExpenses;
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return statements.filter((s) => {
      const name = custodianName(s.custodian).toLocaleLowerCase();
      const num = s.number.toLocaleLowerCase();
      const matchesQuery = !query || name.includes(query) || num.includes(query);
      const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchesCustodian = filterCustodian === 'all' || s.custodianId === filterCustodian;
      return matchesQuery && matchesStatus && matchesCustodian;
    });
  }, [statements, search, filterStatus, filterCustodian]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: statements.length,
    pending: statements.filter((s) => s.status === 'pending_approval').length,
    approved: statements.filter((s) => s.status === 'approved').length,
    totalAmount: statements.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0),
  }), [statements]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این صورت هزینه؟')) return;
    try {
      await deleteData('petty_cash_expense_statements', { id });
      toast.success('صورت هزینه حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleApprove = async (id: string) => {
    if (!profile) return;
    try {
      await updateData('petty_cash_expense_statements', { id }, {
        status: 'approved',
        approvedBy: profile.id,
        approvedAt: new Date().toISOString(),
      });
      toast.success('صورت هزینه تأیید شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('تأیید ناموفق: ' + error.message);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    try {
      await updateData('petty_cash_expense_statements', { id: rejectDialog.id }, {
        status: 'rejected',
        rejectedReason: rejectDialog.reason || null,
      });
      toast.success('صورت هزینه رد شد');
      setRejectDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleReturn = async (id: string) => {
    try {
      await updateData('petty_cash_expense_statements', { id }, { status: 'returned' });
      toast.success('صورت هزینه برگشت داده شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await updateData('petty_cash_expense_statements', { id }, { status: 'pending_approval' });
      toast.success('صورت هزینه برای تأیید ارسال شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handlePostAccounting = async (id: string) => {
    try {
      await updateData('petty_cash_expense_statements', { id }, {
        status: 'accounting_posted',
        postedToAccounting: true,
      });
      toast.success('سند حسابداری ثبت شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleSettle = async (id: string) => {
    try {
      await updateData('petty_cash_expense_statements', { id }, {
        status: 'settled',
        settledAt: new Date().toISOString(),
      });
      toast.success('صورت هزینه تسویه شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleApproveItem = async (itemId: string) => {
    if (!profile) return;
    try {
      await updateData('petty_cash_expense_statement_items', { id: itemId }, {
        status: 'approved',
        approvedBy: profile.id,
        approvedAt: new Date().toISOString(),
      });
      toast.success('ردیف تأیید شد');
      if (detailItem) {
        const updated = await fetchData<PettyCashExpenseStatement>('petty_cash_expense_statements', {
          where: { id: detailItem.id },
          include: {
            custodian: { include: { contactParty: true, profile: true } },
            fiscalYear: true, costCenter: true,
            items: { include: { account: true, costCenter: true, documents: true } },
          },
        });
        if (updated && updated[0]) setDetailItem(updated[0]);
      }
      loadData();
    } catch (error: any) {
      toast.error('تأیید ناموفق: ' + error.message);
    }
  };

  const handleRejectItem = async (itemId: string) => {
    try {
      await updateData('petty_cash_expense_statement_items', { id: itemId }, { status: 'rejected' });
      toast.success('ردیف رد شد');
      if (detailItem) {
        const updated = await fetchData<PettyCashExpenseStatement>('petty_cash_expense_statements', {
          where: { id: detailItem.id },
          include: {
            custodian: { include: { contactParty: true, profile: true } },
            fiscalYear: true, costCenter: true,
            items: { include: { account: true, costCenter: true, documents: true } },
          },
        });
        if (updated && updated[0]) setDetailItem(updated[0]);
      }
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const costCenterName = (id: string | null) => {
    if (!id) return null;
    const cc = costCenters.find((c) => c.id === id);
    return cc ? `${cc.code} - ${cc.name}` : null;
  };

  const fiscalYearName = (id: string | null) => {
    if (!id) return null;
    const fy = fiscalYears.find((f) => f.id === id);
    return fy ? fy.name : null;
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">صورت هزینه تنخواه</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> صورت هزینه تنخواه</div>
        </div>
        <Link href="/dashboard/petty-cash-expenses/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ایجاد صورت هزینه تنخواه
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><FileText className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل صورت هزینه‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">در انتظار تأیید</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.approved.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">تأیید شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><TrendingDown className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع هزینه‌ها (تومان)</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره یا تنخواه‌دار..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[300px]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterCustodian} onChange={(e) => setFilterCustodian(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه تنخواه‌دارها</option>
            {custodians.map((c) => <option key={c.id} value={c.id}>{custodianName(c)}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه وضعیت‌ها</option>
            {Object.entries(STATEMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : statements.length === 0 ? (
        <Card><EmptyState icon={<FileText className="h-8 w-8" />} title="صورت هزینه‌ای یافت نشد" description="برای شروع، اولین صورت هزینه تنخواه را ایجاد کنید" action={<Link href="/dashboard/petty-cash-expenses/new"><Button><Plus className="h-4 w-4" /> افزودن صورت هزینه</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((s) => {
              const stColor = STATEMENT_STATUS_COLOR[s.status] || '#64748b';
              const balance = s.custodian ? getCustodianBalance(s.custodian) : 0;
              const overBalance = Number(s.totalAmount) > balance;
              return (
                <div key={s.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => setDetailItem(s)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{s.number}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{STATEMENT_STATUS[s.status] || s.status}</Badge>
                      {overBalance && s.status === 'draft' && <Badge variant="outline" className="shrink-0 border-rose-300 text-[10px] text-rose-600">سقف تنخواه</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><Wallet className="h-3 w-3" />{custodianName(s.custodian)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(s.date)}</span>
                      {fiscalYearName(s.fiscalYearId) && <span>{fiscalYearName(s.fiscalYearId)}</span>}
                      <span>{relativeTime(s.createdAt)}</span>
                      <span>{(s.items || []).length.toLocaleString('fa-IR')} ردیف</span>
                    </div>
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="text-xs text-[#98A2B3]">مانده تنخواه: {formatToman(balance)}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(s.totalAmount))}</div>
                    <div className="text-[10px] text-[#98A2B3]">جمع هزینه</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(s); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && (s.status === 'draft' || s.status === 'rejected' || s.status === 'returned') && <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
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
            const stColor = STATEMENT_STATUS_COLOR[detailItem.status] || '#64748b';
            const balance = detailItem.custodian ? getCustodianBalance(detailItem.custodian) : 0;
            const overBalance = Number(detailItem.totalAmount) > balance;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">صورت هزینه {detailItem.number}</DialogTitle>
                    {isSuperAdmin && (detailItem.status === 'draft' || detailItem.status === 'rejected' || detailItem.status === 'returned') && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{STATEMENT_STATUS[detailItem.status] || detailItem.status}</Badge>
                    <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><Wallet className="h-3 w-3" />{custodianName(detailItem.custodian)}</span>
                    <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><Calendar className="h-3 w-3" />{formatJalali(detailItem.date)}</span>
                    {fiscalYearName(detailItem.fiscalYearId) && <span className="text-xs text-[#98A2B3]">{fiscalYearName(detailItem.fiscalYearId)}</span>}
                    {costCenterName(detailItem.costCenterId) && <span className="text-xs text-[#98A2B3]">{costCenterName(detailItem.costCenterId)}</span>}
                  </div>

                  {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}

                  {/* Balance summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">مانده تنخواه</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatToman(balance)}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">جمع صورت هزینه</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailItem.totalAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">ردیف‌های تأییدشده</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{((detailItem.items || []).filter((i) => i.status === 'approved')).length.toLocaleString('fa-IR')}</div></div>
                    <div className={`rounded-[10px] p-3 ${overBalance ? 'bg-rose-50' : 'bg-[#F0FDF4]'}`}><div className="text-xs text-[#667085]">وضعیت سقف</div><div className={`mt-1 text-sm font-bold ${overBalance ? 'text-rose-600' : 'text-[#16A34A]'}`}>{overBalance ? 'تجاوز' : 'مجاز'}</div></div>
                  </div>

                  {overBalance && <div className="rounded-[10px] bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">مجموع صورت هزینه از مانده تنخواه بیشتر است. مانده قابل استفاده: {formatToman(balance)} تومان</div>}

                  {/* Items */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center gap-2"><FileCheck className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">ردیف‌های هزینه</h4><Badge variant="secondary" className="text-xs">{(detailItem.items || []).length.toLocaleString('fa-IR')}</Badge></div>
                    <div className="space-y-2">
                      {(detailItem.items || []).length === 0 ? <p className="py-4 text-center text-xs text-slate-400">ردیفی ثبت نشده است</p>
                        : (detailItem.items || []).map((item: PettyCashExpenseStatementItem) => {
                          const itColor = ITEM_STATUS_COLOR[item.status] || '#64748b';
                          return (
                            <div key={item.id} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#1D2939]">{item.expenseType}</span>
                                  <Badge variant="outline" className="text-[10px]" style={{ color: itColor, borderColor: `${itColor}35`, backgroundColor: `${itColor}10` }}>{ITEM_STATUS[item.status] || item.status}</Badge>
                                </div>
                                <span className="text-sm font-bold text-[#1D2939]">{formatToman(Number(item.amount))} تومان</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(item.date)}</span>
                                {item.vendorName && <span>فروشنده: {item.vendorName}</span>}
                                {item.invoiceNumber && <span>فاکتور: {item.invoiceNumber}</span>}
                                {item.description && <span>{item.description}</span>}
                              </div>
                              {(item.documents || []).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {(item.documents || []).map((doc) => (
                                    <a key={doc.id} href={doc.attachmentUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                                      <FileText className="h-3 w-3" /> {doc.attachmentName || 'مدرک'}
                                    </a>
                                  ))}
                                </div>
                              )}
                              {item.status === 'pending' && isSuperAdmin && (
                                <div className="mt-2 flex gap-2">
                                  <Button size="sm" variant="outline" className="h-7 border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApproveItem(item.id)}><CheckCircle className="h-3.5 w-3.5" /> تأیید ردیف</Button>
                                  <Button size="sm" variant="outline" className="h-7 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleRejectItem(item.id)}><XCircle className="h-3.5 w-3.5" /> رد ردیف</Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detailItem.status === 'draft' && isSuperAdmin && <Button variant="outline" onClick={() => handleSubmit(detailItem.id)}><Send className="h-4 w-4" /> ارسال برای تأیید</Button>}
                    {detailItem.status === 'pending_approval' && isSuperAdmin && (
                      <>
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApprove(detailItem.id)}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectDialog({ id: detailItem.id, reason: '' })}><XCircle className="h-4 w-4" /> رد</Button>
                        <Button variant="outline" onClick={() => handleReturn(detailItem.id)}><RotateCcw className="h-4 w-4" /> برگشت برای اصلاح</Button>
                      </>
                    )}
                    {detailItem.status === 'approved' && isSuperAdmin && <Button variant="outline" onClick={() => handlePostAccounting(detailItem.id)}><FileCheck className="h-4 w-4" /> ثبت حسابداری</Button>}
                    {detailItem.status === 'accounting_posted' && isSuperAdmin && <Button variant="outline" onClick={() => handleSettle(detailItem.id)}><CheckCircle className="h-4 w-4" /> تسویه</Button>}
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
          <DialogHeader><DialogTitle>رد صورت هزینه</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">دلیل رد</label>
              <Input value={rejectDialog?.reason || ''} onChange={(e) => setRejectDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل رد صورت هزینه..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>انصراف</Button>
            <Button onClick={handleReject}>رد صورت هزینه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
