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
  FileText, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, Send, RotateCcw, FileCheck, Eye,
  AlertTriangle, Layers, TrendingDown, Scale,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  DocumentIssuance, DocumentIssuanceLine, DocumentIssuanceHistory,
  Profile, FiscalYear, CostCenter, Account,
  PettyCashExpense, PettyCashMergeStatement,
} from '@/lib/types';

const DOC_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  ready_to_issue: 'آماده صدور',
  issued: 'صادرشده',
  finalized: 'قطعی',
  rejected: 'ردشده',
  voided: 'ابطال‌شده',
  amended: 'اصلاح‌شده',
};

const DOC_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  ready_to_issue: '#f59e0b',
  issued: '#3b82f6',
  finalized: '#16a34a',
  rejected: '#ef4444',
  voided: '#64748b',
  amended: '#8b5cf6',
};

const REF_TYPE_LABEL: Record<string, string> = {
  petty_cash_expense: 'سند هزینه تنخواه',
  petty_cash_merge_statement: 'صورت ادغام اسناد',
  petty_cash_expense_statement: 'صورت هزینه تنخواه',
};

const ACCOUNT_ROLE_LABEL: Record<string, string> = {
  expense: 'حساب هزینه',
  custodian: 'حساب تنخواه‌دار',
  payable: 'حساب پرداختی',
  tax: 'مالیات و عوارض',
  other: 'سایر',
};

export default function DocumentIssuancePage() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<DocumentIssuance[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRefType, setFilterRefType] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<DocumentIssuance | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [historyDialog, setHistoryDialog] = useState<DocumentIssuance | null>(null);
  const [refExpenses, setRefExpenses] = useState<Record<string, PettyCashExpense>>({});
  const [refMergeStmts, setRefMergeStmts] = useState<Record<string, PettyCashMergeStatement>>({});
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docData, accData, fyData, ccData, staffData] = await Promise.all([
        fetchData<DocumentIssuance>('document_issuances', {
          where: {},
          orderBy: { createdAt: 'desc' },
          include: {
            fiscalYear: true,
            costCenter: true,
            lines: { include: { account: true, costCenter: true } },
            history: { orderBy: { actionAt: 'desc' } },
          },
        }),
        fetchData<Account>('accounts', { where: { active: true } }),
        fetchData<FiscalYear>('fiscal_years', { where: {} }),
        fetchData<CostCenter>('cost_centers', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setDocuments(docData || []);
      setAccounts(accData || []);
      setFiscalYears(fyData || []);
      setCostCenters(ccData || []);
      setStaff(staffData || []);

      // Load referenced source documents
      const expRefIds = (docData || []).filter((d) => d.referenceType === 'petty_cash_expense').map((d) => d.referenceId);
      const mergeRefIds = (docData || []).filter((d) => d.referenceType === 'petty_cash_merge_statement').map((d) => d.referenceId);
      if (expRefIds.length > 0) {
        try {
          const exps = await fetchData<PettyCashExpense>('petty_cash_expenses', { where: { id: { in: expRefIds } } });
          const map: Record<string, PettyCashExpense> = {};
          (exps || []).forEach((e) => { map[e.id] = e; });
          setRefExpenses(map);
        } catch {}
      }
      if (mergeRefIds.length > 0) {
        try {
          const merges = await fetchData<PettyCashMergeStatement>('petty_cash_merge_statements', { where: { id: { in: mergeRefIds } } });
          const map: Record<string, PettyCashMergeStatement> = {};
          (merges || []).forEach((m) => { map[m.id] = m; });
          setRefMergeStmts(map);
        } catch {}
      }
    } catch (error: any) {
      toast.error('بارگذاری اسناد ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const refLabel = (doc: DocumentIssuance) => {
    if (doc.referenceType === 'petty_cash_expense') {
      const exp = refExpenses[doc.referenceId];
      return exp ? `سند هزینه ${exp.number}` : 'سند هزینه';
    }
    if (doc.referenceType === 'petty_cash_merge_statement') {
      const ms = refMergeStmts[doc.referenceId];
      return ms ? `صورت ادغام ${ms.number}` : 'صورت ادغام';
    }
    return REF_TYPE_LABEL[doc.referenceType] || doc.referenceType;
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return documents.filter((d) => {
      const num = d.number.toLocaleLowerCase();
      const ref = refLabel(d).toLocaleLowerCase();
      const matchesQuery = !query || num.includes(query) || ref.includes(query);
      const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
      const matchesRefType = filterRefType === 'all' || d.referenceType === filterRefType;
      return matchesQuery && matchesStatus && matchesRefType;
    });
  }, [documents, search, filterStatus, filterRefType, refExpenses, refMergeStmts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: documents.length,
    ready: documents.filter((d) => d.status === 'ready_to_issue').length,
    issued: documents.filter((d) => d.status === 'issued').length,
    finalized: documents.filter((d) => d.status === 'finalized').length,
    totalAmount: documents.filter((d) => d.status !== 'voided').reduce((sum, d) => sum + Number(d.totalDebit || 0), 0),
  }), [documents]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این سند صدور؟')) return;
    try {
      await deleteData('document_issuances', { id });
      toast.success('سند حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('حذف ناموفق: ' + error.message); }
  };

  const handleReadyToIssue = async (id: string) => {
    try {
      await updateData('document_issuances', { id }, { status: 'ready_to_issue' });
      toast.success('سند آماده صدور شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleIssue = async (id: string) => {
    if (!profile) return;
    try {
      const doc = documents.find((d) => d.id === id);
      if (!doc) return;
      const totalDebit = (doc.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCredit = (doc.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0);
      if (totalDebit !== totalCredit) {
        toast.error('سند متوازن نیست - جمع بدهکار با بستانکار برابر نیست');
        return;
      }
      await updateData('document_issuances', { id }, {
        status: 'issued',
        issuedBy: profile.id,
        issuedAt: new Date().toISOString(),
        totalDebit,
        totalCredit,
      });
      try {
        await createData('document_issuance_histories', {
          documentIssuanceId: id,
          action: 'issued',
          actionBy: profile.id,
          fromStatus: doc.status,
          toStatus: 'issued',
          details: { totalDebit, totalCredit },
        });
      } catch {}
      toast.success('سند صادر شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('صدور ناموفق: ' + error.message); }
  };

  const handleFinalize = async (id: string) => {
    if (!profile) return;
    try {
      await updateData('document_issuances', { id }, {
        status: 'finalized',
        finalizedBy: profile.id,
        finalizedAt: new Date().toISOString(),
      });
      try {
        await createData('document_issuance_histories', {
          documentIssuanceId: id,
          action: 'finalized',
          actionBy: profile.id,
          fromStatus: 'issued',
          toStatus: 'finalized',
          details: {},
        });
      } catch {}
      toast.success('سند قطعی شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleReject = async () => {
    if (!rejectDialog || !profile) return;
    try {
      await updateData('document_issuances', { id: rejectDialog.id }, { status: 'rejected' });
      try {
        await createData('document_issuance_histories', {
          documentIssuanceId: rejectDialog.id,
          action: 'status_changed',
          actionBy: profile.id,
          toStatus: 'rejected',
          details: { reason: rejectDialog.reason },
        });
      } catch {}
      toast.success('سند رد شد');
      setRejectDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleVoid = async () => {
    if (!voidDialog || !profile) return;
    try {
      await updateData('document_issuances', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
      });
      try {
        await createData('document_issuance_histories', {
          documentIssuanceId: voidDialog.id,
          action: 'voided',
          actionBy: profile.id,
          toStatus: 'voided',
          details: { reason: voidDialog.reason },
        });
      } catch {}
      toast.success('سند ابطال شد');
      setVoidDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const accountName = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} - ${a.name}` : '—';
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

  const renderHistory = (history: DocumentIssuanceHistory[]) => {
    const actionLabel: Record<string, string> = {
      created: 'ایجاد شد',
      issued: 'صادر شد',
      finalized: 'قطعی شد',
      voided: 'ابطال شد',
      amended: 'اصلاح شد',
      status_changed: 'تغییر وضعیت',
    };
    return (
      <div className="space-y-2">
        {history.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p>
          : history.map((h) => (
            <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
                {h.action === 'issued' ? <FileCheck className="h-3.5 w-3.5" /> : h.action === 'voided' ? <XCircle className="h-3.5 w-3.5" /> : h.action === 'finalized' ? <CheckCircle className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{actionLabel[h.action] || h.action}</span>
                  <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  توسط {staffName(h.actionBy)}
                  {h.fromStatus && h.toStatus && <span className="mx-1">•</span>}
                  {h.fromStatus && h.toStatus && <span>{DOC_STATUS[h.fromStatus] || h.fromStatus} ← {DOC_STATUS[h.toStatus] || h.toStatus}</span>}
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
            <h1 className="text-[28px] font-bold text-[#101828]">صدور اسناد</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> صدور اسناد</div>
        </div>
        <Link href="/dashboard/document-issuance/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> صدور سند جدید
          </Button>
        </Link>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Layers className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل اسناد</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.ready.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">آماده صدور</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3b82f6]/10 text-[#3b82f6]"><FileCheck className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.issued.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">صادرشده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#16a34a]/10 text-[#16a34a]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.finalized.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">قطعی</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><TrendingDown className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{formatToman(stats.totalAmount)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مجموع (تومان)</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره یا سند مبنا..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[300px]" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterRefType} onChange={(e) => setFilterRefType(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه انواع سند</option>
            <option value="petty_cash_expense">سند هزینه تنخواه</option>
            <option value="petty_cash_merge_statement">صورت ادغام اسناد</option>
            <option value="petty_cash_expense_statement">صورت هزینه تنخواه</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه وضعیت‌ها</option>
            {Object.entries(DOC_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : documents.length === 0 ? (
        <Card><EmptyState icon={<FileText className="h-8 w-8" />} title="سندی یافت نشد" description="برای شروع، اولین سند صدور را ایجاد کنید" action={<Link href="/dashboard/document-issuance/new"><Button><Plus className="h-4 w-4" /> افزودن سند</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((d) => {
              const stColor = DOC_STATUS_COLOR[d.status] || '#64748b';
              const balanced = Number(d.totalDebit) === Number(d.totalCredit);
              return (
                <div key={d.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => setDetailItem(d)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{d.number}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{DOC_STATUS[d.status] || d.status}</Badge>
                      {!balanced && <Badge variant="outline" className="shrink-0 border-rose-200 text-[10px] text-rose-500">نا متوازن</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span>{refLabel(d)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(d.documentDate)}</span>
                      {fiscalYearName(d.fiscalYearId) && <span>{fiscalYearName(d.fiscalYearId)}</span>}
                      <span>{relativeTime(d.createdAt)}</span>
                      <span>{(d.lines || []).length.toLocaleString('fa-IR')} ردیف</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(d.totalDebit))}</div>
                    <div className="text-[10px] text-[#98A2B3]">جمع بدهکار</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(d); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && (d.status === 'draft' || d.status === 'rejected') && <button onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
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
            const stColor = DOC_STATUS_COLOR[detailItem.status] || '#64748b';
            const totalDebit = (detailItem.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0);
            const totalCredit = (detailItem.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0);
            const balanced = totalDebit === totalCredit;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">سند صدور {detailItem.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailItem)}><RotateCcw className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && (detailItem.status === 'draft' || detailItem.status === 'rejected') && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{DOC_STATUS[detailItem.status] || detailItem.status}</Badge>
                    <span className="text-xs text-[#98A2B3]">{refLabel(detailItem)}</span>
                    <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><Calendar className="h-3 w-3" />{formatJalali(detailItem.documentDate)}</span>
                    {fiscalYearName(detailItem.fiscalYearId) && <span className="text-xs text-[#98A2B3]">{fiscalYearName(detailItem.fiscalYearId)}</span>}
                    {costCenterName(detailItem.costCenterId) && <span className="text-xs text-[#98A2B3]">{costCenterName(detailItem.costCenterId)}</span>}
                  </div>

                  {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}
                  {detailItem.voidReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل ابطال: </strong>{detailItem.voidReason}</p></div>}

                  {/* Dates */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">تاریخ عملیات</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatJalali(detailItem.operationDate)}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">تاریخ سند</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatJalali(detailItem.documentDate)}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ صدور</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatJalali(detailItem.issueDate)}</div></div>
                  </div>

                  {/* Balance check */}
                  <div className={`flex items-center justify-between rounded-[10px] p-3 ${balanced ? 'bg-green-50' : 'bg-rose-50'}`}>
                    <div className="flex items-center gap-2">
                      <Scale className={`h-5 w-5 ${balanced ? 'text-green-600' : 'text-rose-600'}`} />
                      <span className={`text-sm font-semibold ${balanced ? 'text-green-700' : 'text-rose-700'}`}>{balanced ? 'سند متوازن است' : 'سند متوازن نیست!'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span>بدهکار: <strong>{formatToman(totalDebit)}</strong></span>
                      <span>بستانکار: <strong>{formatToman(totalCredit)}</strong></span>
                    </div>
                  </div>

                  {/* Lines */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center gap-2"><FileCheck className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">ردیف‌های حسابداری</h4><Badge variant="secondary" className="text-xs">{(detailItem.lines || []).length.toLocaleString('fa-IR')}</Badge></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs text-[#98A2B3]">
                            <th className="py-2 pr-2 text-right font-medium">حساب</th>
                            <th className="py-2 text-right font-medium">نقش</th>
                            <th className="py-2 text-left font-medium">بدهکار</th>
                            <th className="py-2 text-left font-medium">بستانکار</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detailItem.lines || []).map((line: DocumentIssuanceLine) => (
                            <tr key={line.id} className="border-b border-slate-100">
                              <td className="py-2 pr-2 text-right text-[#1D2939]">{accountName(line.accountId)}</td>
                              <td className="py-2 text-right"><Badge variant="outline" className="text-[10px]">{ACCOUNT_ROLE_LABEL[line.accountRole] || line.accountRole}</Badge></td>
                              <td className="py-2 text-left font-medium text-[#1D2939]">{Number(line.debit) ? formatToman(Number(line.debit)) : '—'}</td>
                              <td className="py-2 text-left font-medium text-[#1D2939]">{Number(line.credit) ? formatToman(Number(line.credit)) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200 font-bold">
                            <td colSpan={2} className="py-2 pr-2 text-right text-[#344054]">جمع کل</td>
                            <td className="py-2 text-left text-[#3155E7]">{formatToman(totalDebit)}</td>
                            <td className="py-2 text-left text-[#3155E7]">{formatToman(totalCredit)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Audit info */}
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-xs">
                    <div><span className="text-[#98A2B3]">ایجادکننده: </span><span className="font-medium text-[#344054]">{staffName(detailItem.createdBy)}</span></div>
                    {detailItem.issuedBy && <div><span className="text-[#98A2B3]">صادرکننده: </span><span className="font-medium text-[#344054]">{staffName(detailItem.issuedBy)}</span></div>}
                    {detailItem.finalizedBy && <div><span className="text-[#98A2B3]">تأییدکننده: </span><span className="font-medium text-[#344054]">{staffName(detailItem.finalizedBy)}</span></div>}
                    {detailItem.voidedBy && <div><span className="text-[#98A2B3]">ابطال‌کننده: </span><span className="font-medium text-[#344054]">{staffName(detailItem.voidedBy)}</span></div>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detailItem.status === 'draft' && isSuperAdmin && <Button variant="outline" onClick={() => handleReadyToIssue(detailItem.id)}><Send className="h-4 w-4" /> آماده صدور</Button>}
                    {detailItem.status === 'ready_to_issue' && isSuperAdmin && (
                      <>
                        <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleIssue(detailItem.id)}><FileCheck className="h-4 w-4" /> صدور سند</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectDialog({ id: detailItem.id, reason: '' })}><XCircle className="h-4 w-4" /> رد</Button>
                      </>
                    )}
                    {detailItem.status === 'issued' && isSuperAdmin && <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleFinalize(detailItem.id)}><CheckCircle className="h-4 w-4" /> قطعی کردن</Button>}
                    {isSuperAdmin && detailItem.status !== 'voided' && detailItem.status !== 'finalized' && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => setVoidDialog({ id: detailItem.id, reason: '' })}><AlertTriangle className="h-4 w-4" /> ابطال سند</Button>
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
          <DialogHeader><DialogTitle>رد سند</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">دلیل رد</label>
              <Input value={rejectDialog?.reason || ''} onChange={(e) => setRejectDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل رد سند..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>انصراف</Button>
            <Button onClick={handleReject}>رد سند</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ابطال سند</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">با ابطال سند، وضعیت آن به «ابطال‌شده» تغییر می‌کند ولی سابقه سند حذف نخواهد شد. ارتباط با سند مبنا حفظ می‌شود.</div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">دلیل ابطال</label>
              <Input value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل ابطال..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleVoid}>ابطال سند</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه سند</DialogTitle></DialogHeader>
          {historyDialog && renderHistory(historyDialog.history || [])}
        </DialogContent>
      </Dialog>
    </div>
  );
}
