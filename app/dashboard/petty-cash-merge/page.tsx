'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileText, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, Wallet, TrendingDown, Layers, Send,
  RotateCcw, FileCheck, Eye, AlertTriangle, X, Loader2,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  PettyCashMergeStatement, PettyCashCustodian, Profile,
  FiscalYear, CostCenter, PettyCashExpense, PettyCashMergeHistory,
} from '@/lib/types';

const MERGE_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ثبت شده',
  pending_approval: 'در انتظار تأیید',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  returned: 'برگشت برای اصلاح',
  accounting_posted: 'ثبت حسابداری',
  settled: 'تسویه شده',
  cancelled: 'لغو شده',
};

const MERGE_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  submitted: '#3b82f6',
  pending_approval: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  returned: '#f97316',
  accounting_posted: '#6366f1',
  settled: '#16a34a',
  cancelled: '#64748b',
};

const EXPENSE_MERGE_STATUS: Record<string, string> = {
  mergeable: 'قابل ادغام',
  merged: 'ادغام‌شده',
  merge_cancelled: 'لغو ادغام',
  not_mergeable: 'غیرقابل ادغام',
};

const EXPENSE_MERGE_COLOR: Record<string, string> = {
  mergeable: '#10b981',
  merged: '#6366f1',
  merge_cancelled: '#f97316',
  not_mergeable: '#94a3b8',
};

export default function PettyCashMergePage() {
  const { profile } = useAuth();
  const [statements, setStatements] = useState<PettyCashMergeStatement[]>([]);
  const [custodians, setCustodians] = useState<PettyCashCustodian[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCustodian, setFilterCustodian] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<PettyCashMergeStatement | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ id: string; reason: string } | null>(null);
  const [historyDialog, setHistoryDialog] = useState<PettyCashMergeStatement | null>(null);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stmtData, custData, fyData, ccData, staffData] = await Promise.all([
        fetchData<PettyCashMergeStatement>('petty_cash_merge_statements', {
          where: {},
          orderBy: { createdAt: 'desc' },
          include: {
            custodian: { include: { contactParty: true, profile: true } },
            fiscalYear: true,
            costCenter: true,
            expenses: true,
            history: { orderBy: { actionAt: 'desc' } },
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
      toast.error('بارگذاری صورت ادغام ناموفق: ' + error.message);
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

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
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

  const stats = useMemo(() => [
    {
      label: 'کل صورت ادغام', value: statements.length, icon: Layers,
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'در انتظار تأیید', value: statements.filter((s) => s.status === 'pending_approval').length, icon: Clock,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'تأیید شده', value: statements.filter((s) => s.status === 'approved').length, icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'مجموع اسناد (تومان)', value: statements.filter((s) => s.status !== 'cancelled').reduce((sum, s) => sum + Number(s.totalAmount || 0), 0), icon: TrendingDown,
      formatToman: true,
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
  ], [statements]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این صورت ادغام؟ اسناد زیرمجموعه به وضعیت قابل ادغام برمی‌گردند.')) return;
    try {
      const stmt = statements.find((s) => s.id === id);
      if (stmt) {
        for (const exp of stmt.expenses || []) {
          await updateData('petty_cash_expenses', { id: exp.id }, { mergeStatementId: null, mergeStatus: 'mergeable' });
        }
      }
      await deleteData('petty_cash_merge_statements', { id });
      toast.success('صورت ادغام حذف شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await updateData('petty_cash_merge_statements', { id }, { status: 'pending_approval' });
      toast.success('صورت ادغام برای تأیید ارسال شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleApprove = async (id: string) => {
    if (!profile) return;
    try {
      await updateData('petty_cash_merge_statements', { id }, {
        status: 'approved',
        approvedBy: profile.id,
        approvedAt: new Date().toISOString(),
      });
      toast.success('صورت ادغام تأیید شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('تأیید ناموفق: ' + error.message); }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    try {
      await updateData('petty_cash_merge_statements', { id: rejectDialog.id }, {
        status: 'rejected',
        rejectedReason: rejectDialog.reason || null,
      });
      toast.success('صورت ادغام رد شد');
      setRejectDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleReturn = async (id: string) => {
    try {
      await updateData('petty_cash_merge_statements', { id }, { status: 'returned' });
      toast.success('صورت ادغام برگشت داده شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handlePostAccounting = async (id: string) => {
    try {
      await updateData('petty_cash_merge_statements', { id }, {
        status: 'accounting_posted',
        postedToAccounting: true,
      });
      toast.success('سند حسابداری ثبت شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleSettle = async (id: string) => {
    try {
      await updateData('petty_cash_merge_statements', { id }, {
        status: 'settled',
        settledAt: new Date().toISOString(),
      });
      toast.success('صورت ادغام تسویه شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleCancelMerge = async () => {
    if (!cancelDialog || !profile) return;
    try {
      const stmt = statements.find((s) => s.id === cancelDialog.id);
      if (stmt) {
        for (const exp of stmt.expenses || []) {
          await updateData('petty_cash_expenses', { id: exp.id }, { mergeStatementId: null, mergeStatus: 'mergeable' });
        }
      }
      await updateData('petty_cash_merge_statements', { id: cancelDialog.id }, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: profile.id,
        cancelReason: cancelDialog.reason || null,
      });
      toast.success('ادغام لغو شد و اسناد به وضعیت قابل ادغام بازگشتند');
      setCancelDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
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

  const renderHistory = (history: PettyCashMergeHistory[]) => {
    const actionLabel: Record<string, string> = {
      created: 'ایجاد شد',
      cancelled: 'لغو شد',
      status_changed: 'تغییر وضعیت',
    };
    return (
      <div className="space-y-2">
        {history.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p>
          : history.map((h) => (
            <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
                {h.action === 'created' ? <FileText className="h-3.5 w-3.5" /> : h.action === 'cancelled' ? <XCircle className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{actionLabel[h.action] || h.action}</span>
                  <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  توسط {staffName(h.actionBy)}
                  {h.fromStatus && h.toStatus && <span className="mx-1">•</span>}
                  {h.fromStatus && h.toStatus && <span>{MERGE_STATUS[h.fromStatus] || h.fromStatus} ← {MERGE_STATUS[h.toStatus] || h.toStatus}</span>}
                </div>
              </div>
            </div>
          ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>صورت ادغام اسناد</h1>
            </div>
            <p>ادغام و تسویه اسناد تنخواه</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/petty-cash-merge/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            صورت ادغام جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <div className="nb-stat-card-v2" key={stat.label}>
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.formatToman ? formatToman(stat.value) : stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </div>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه صورت‌های ادغام</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس شماره یا تنخواه‌دار..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterCustodian} onValueChange={setFilterCustodian}>
            <SelectTrigger className="nb-select-filter h-10 w-[160px]">
              <SelectValue placeholder="تنخواه‌دار" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه تنخواه‌دارها</SelectItem>
              {custodians.map((c) => <SelectItem key={c.id} value={c.id}>{custodianName(c)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(MERGE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {statements.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Layers className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>صورت ادغامی یافت نشد</h3>
          <p>برای شروع، اولین صورت ادغام اسناد را ایجاد کنید</p>
          <Link href="/dashboard/petty-cash-merge/new" className="nb-empty-new-btn">
            <Plus className="h-4 w-4" /> افزودن صورت ادغام
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {pageItems.map((s) => {
              const stColor = MERGE_STATUS_COLOR[s.status] || '#64748b';
              return (
                <div key={s.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => setDetailItem(s)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{s.number}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{MERGE_STATUS[s.status] || s.status}</Badge>
                      {s.status === 'cancelled' && <Badge variant="outline" className="shrink-0 border-slate-300 text-[10px] text-slate-500">لغو شده</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Wallet className="h-3 w-3" />{custodianName(s.custodian)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(s.date)}</span>
                      {fiscalYearName(s.fiscalYearId) && <span>{fiscalYearName(s.fiscalYearId)}</span>}
                      <span>{relativeTime(s.createdAt)}</span>
                      <span>{(s.expenses || []).length.toLocaleString('fa-IR')} سند ادغام‌شده</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToman(Number(s.totalAmount))}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">جمع اسناد</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDetailItem(s); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && (s.status === 'draft' || s.status === 'rejected' || s.status === 'returned') && <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              );
            })}
            {pageItems.length === 0 && <div className="py-12 text-center text-sm text-slate-300 dark:text-slate-600">نتیجه‌ای یافت نشد</div>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-4 py-3">
              <span className="text-xs text-slate-600 dark:text-slate-300">صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <Link href="/dashboard/petty-cash-merge/new" className="nb-fab" aria-label="صورت ادغام جدید">
        <Plus className="h-6 w-6" />
      </Link>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {detailItem && (() => {
            const stColor = MERGE_STATUS_COLOR[detailItem.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">صورت ادغام {detailItem.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailItem)}><RotateCcw className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && (detailItem.status === 'draft' || detailItem.status === 'rejected' || detailItem.status === 'returned') && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{MERGE_STATUS[detailItem.status] || detailItem.status}</Badge>
                    <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><Wallet className="h-3 w-3" />{custodianName(detailItem.custodian)}</span>
                    <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><Calendar className="h-3 w-3" />{formatJalali(detailItem.date)}</span>
                    {fiscalYearName(detailItem.fiscalYearId) && <span className="text-xs text-[#98A2B3]">{fiscalYearName(detailItem.fiscalYearId)}</span>}
                    {costCenterName(detailItem.costCenterId) && <span className="text-xs text-[#98A2B3]">{costCenterName(detailItem.costCenterId)}</span>}
                  </div>

                  {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}

                  {detailItem.cancelReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل لغو: </strong>{detailItem.cancelReason}</p></div>}

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">تعداد اسناد</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{(detailItem.expenses || []).length.toLocaleString('fa-IR')}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">جمع اسناد</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(detailItem.totalAmount))}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">ایجادکننده</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{staffName(detailItem.createdBy)}</div></div>
                  </div>

                  {/* Merged expenses */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center gap-2"><FileCheck className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">اسناد ادغام‌شده</h4><Badge variant="secondary" className="text-xs">{(detailItem.expenses || []).length.toLocaleString('fa-IR')}</Badge></div>
                    <div className="space-y-2">
                      {(detailItem.expenses || []).length === 0 ? <p className="py-4 text-center text-xs text-slate-400">سندی ثبت نشده است</p>
                        : (detailItem.expenses || []).map((exp: PettyCashExpense) => {
                          const msColor = EXPENSE_MERGE_COLOR[exp.mergeStatus || 'mergeable'] || '#64748b';
                          return (
                            <div key={exp.id} className="rounded-lg border border-[#E6EBF2] bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#1D2939]">{exp.number}</span>
                                  <Badge variant="outline" className="text-[10px]" style={{ color: msColor, borderColor: `${msColor}35`, backgroundColor: `${msColor}10` }}>{EXPENSE_MERGE_STATUS[exp.mergeStatus || 'mergeable'] || exp.mergeStatus}</Badge>
                                </div>
                                <span className="text-sm font-bold text-[#1D2939]">{formatToman(Number(exp.amount))} تومان</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(exp.date)}</span>
                                <span>{exp.expenseType}</span>
                                {exp.description && <span>{exp.description}</span>}
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
                      <>
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleApprove(detailItem.id)}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectDialog({ id: detailItem.id, reason: '' })}><XCircle className="h-4 w-4" /> رد</Button>
                        <Button variant="outline" onClick={() => handleReturn(detailItem.id)}><RotateCcw className="h-4 w-4" /> برگشت برای اصلاح</Button>
                      </>
                    )}
                    {detailItem.status === 'approved' && isSuperAdmin && <Button variant="outline" onClick={() => handlePostAccounting(detailItem.id)}><FileCheck className="h-4 w-4" /> ثبت حسابداری</Button>}
                    {detailItem.status === 'accounting_posted' && isSuperAdmin && <Button variant="outline" onClick={() => handleSettle(detailItem.id)}><CheckCircle className="h-4 w-4" /> تسویه</Button>}
                    {isSuperAdmin && detailItem.status !== 'cancelled' && detailItem.status !== 'settled' && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => setCancelDialog({ id: detailItem.id, reason: '' })}><AlertTriangle className="h-4 w-4" /> لغو ادغام</Button>
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
          <DialogHeader><DialogTitle>رد صورت ادغام</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">دلیل رد</label>
              <Input value={rejectDialog?.reason || ''} onChange={(e) => setRejectDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل رد..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>انصراف</Button>
            <Button onClick={handleReject}>رد صورت ادغام</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Merge Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>لغو ادغام اسناد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">با لغو ادغام، تمام اسناد زیرمجموعه به وضعیت «قابل ادغام» بازمی‌گردند و می‌توانید آن‌ها را در صورت ادغام دیگری استفاده کنید.</div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#344054]">دلیل لغو</label>
              <Input value={cancelDialog?.reason || ''} onChange={(e) => setCancelDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل لغو ادغام..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleCancelMerge}>لغو ادغام</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه صورت ادغام</DialogTitle></DialogHeader>
          {historyDialog && renderHistory(historyDialog.history || [])}
        </DialogContent>
      </Dialog>
    </div>
  );
}
