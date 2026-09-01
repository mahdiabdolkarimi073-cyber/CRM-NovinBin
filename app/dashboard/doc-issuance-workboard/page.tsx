'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileCheck, Search, Calendar, Clock, Send, RotateCcw, Eye,
  AlertTriangle, Scale, Lock, Unlock, Flag, LayoutGrid, BarChart3,
  CheckCircle, XCircle, PlayCircle, Circle, ChevronLeft, ChevronRight,
  UserCog, FileText, TrendingDown,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  DocumentIssuance, DocumentIssuanceLine, DocumentIssuanceHistory,
  Profile, FiscalYear, CostCenter, Account,
  PettyCashExpense, PettyCashMergeStatement,
} from '@/lib/types';

const WB_STATUS: Record<string, string> = {
  draft: 'در انتظار صدور',
  ready_to_issue: 'آماده صدور',
  issued: 'صادرشده',
  finalized: 'قطعی',
  rejected: 'ردشده',
  voided: 'ابطال‌شده',
  amended: 'نیازمند اصلاح',
};

const WB_STATUS_COLOR: Record<string, string> = {
  draft: '#64748b',
  ready_to_issue: '#f59e0b',
  issued: '#3b82f6',
  finalized: '#16a34a',
  rejected: '#ef4444',
  voided: '#94a3b8',
  amended: '#8b5cf6',
};

const WB_FLOW: { key: string; label: string; color: string }[] = [
  { key: 'draft', label: 'در انتظار صدور', color: '#64748b' },
  { key: 'amended', label: 'نیازمند اصلاح', color: '#8b5cf6' },
  { key: 'ready_to_issue', label: 'آماده صدور', color: '#f59e0b' },
  { key: 'issued', label: 'صادرشده', color: '#3b82f6' },
  { key: 'finalized', label: 'قطعی', color: '#16a34a' },
  { key: 'rejected', label: 'ردشده', color: '#ef4444' },
  { key: 'voided', label: 'ابطال‌شده', color: '#94a3b8' },
];

const REF_TYPE_LABEL: Record<string, string> = {
  petty_cash_expense: 'تنخواه',
  petty_cash_merge_statement: 'صورت ادغام',
  petty_cash_expense_statement: 'صورت هزینه',
  receipt: 'دریافت',
  payment: 'پرداخت',
  purchase: 'خرید',
  sales: 'فروش',
  payroll: 'حقوق',
  fixed_asset: 'دارایی ثابت',
  inventory: 'انبار',
  other: 'سایر',
};

const PRIORITY_OPTS = [
  { key: 'low', label: 'کم', color: '#64748b' },
  { key: 'medium', label: 'متوسط', color: '#3b82f6' },
  { key: 'high', label: 'زیاد', color: '#f59e0b' },
  { key: 'urgent', label: 'فوری', color: '#ef4444' },
];

const priorityInfo = (key: string | null) => PRIORITY_OPTS.find((p) => p.key === key) || PRIORITY_OPTS[0];

export default function DocIssuanceWorkboardPage() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<DocumentIssuance[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterRefType, setFilterRefType] = useState('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<DocumentIssuance | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [amendDialog, setAmendDialog] = useState<{ id: string; reason: string } | null>(null);
  const [assignDialog, setAssignDialog] = useState<{ id: string; assigneeId: string } | null>(null);
  const [priorityDialog, setPriorityDialog] = useState<{ id: string; priority: string } | null>(null);
  const [historyDialog, setHistoryDialog] = useState<DocumentIssuance | null>(null);
  const [refExpenses, setRefExpenses] = useState<Record<string, PettyCashExpense>>({});
  const [refMergeStmts, setRefMergeStmts] = useState<Record<string, PettyCashMergeStatement>>({});
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [visibleCount, setVisibleCount] = useState(10);
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
      toast.error('بارگذاری کارتابل ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setVisibleCount(10); }, [search, filterStatus, filterPriority, filterAssignee, filterRefType]);

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const refLabel = (doc: DocumentIssuance) => {
    if (doc.referenceType === 'petty_cash_expense') {
      const exp = refExpenses[doc.referenceId];
      return exp ? `سند هزینه ${exp.number}` : 'سند هزینه تنخواه';
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
      const matchesPriority = filterPriority === 'all' || d.priority === filterPriority;
      const matchesAssignee = filterAssignee === 'all' || d.assignedTo === filterAssignee;
      const matchesRefType = filterRefType === 'all' || d.referenceType === filterRefType;
      return matchesQuery && matchesStatus && matchesPriority && matchesAssignee && matchesRefType;
    });
  }, [documents, search, filterStatus, filterPriority, filterAssignee, filterRefType, refExpenses, refMergeStmts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: documents.length,
    draft: documents.filter((d) => d.status === 'draft').length,
    amended: documents.filter((d) => d.status === 'amended').length,
    ready: documents.filter((d) => d.status === 'ready_to_issue').length,
    issued: documents.filter((d) => d.status === 'issued').length,
    finalized: documents.filter((d) => d.status === 'finalized').length,
    rejected: documents.filter((d) => d.status === 'rejected').length,
    voided: documents.filter((d) => d.status === 'voided').length,
    totalAmount: documents.filter((d) => d.status !== 'voided').reduce((sum, d) => sum + Number(d.totalDebit || 0), 0),
  }), [documents]);

  const addHistory = async (id: string, action: string, fromStatus: string | null, toStatus: string, details: Record<string, any> = {}) => {
    if (!profile) return;
    try {
      await createData('document_issuance_histories', {
        documentIssuanceId: id,
        action,
        actionBy: profile.id,
        fromStatus,
        toStatus,
        details,
      });
    } catch {}
  };

  const validateBeforeIssue = (doc: DocumentIssuance): { blocking: string[]; warnings: string[] } => {
    const blocking: string[] = [];
    const warnings: string[] = [];
    const lines = doc.lines || [];
    if (lines.length === 0) blocking.push('سند فاقد ردیف حسابداری است');
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (totalDebit !== totalCredit) blocking.push('سند متوازن نیست - جمع بدهکار با بستانکار برابر نیست');
    if (totalDebit === 0 && totalCredit === 0) blocking.push('مبلغ سند صفر است');
    lines.forEach((l, i) => {
      if (!l.accountId) blocking.push(`ردیف ${i + 1}: حساب مشخص نشده`);
    });
    const fy = fiscalYears.find((f) => f.id === doc.fiscalYearId);
    if (fy && fy.status === 'closed') blocking.push('دوره مالی بسته شده است');
    const docDate = new Date(doc.documentDate);
    if (fy) {
      if (docDate < new Date(fy.startDate) || docDate > new Date(fy.endDate)) {
        warnings.push('تاریخ سند خارج از بازه دوره مالی است');
      }
    }
    if (!doc.fiscalYearId) warnings.push('دوره مالی مشخص نشده');
    return { blocking, warnings };
  };

  const handleReadyToIssue = async (id: string) => {
    try {
      const doc = documents.find((d) => d.id === id);
      if (!doc) return;
      const { blocking } = validateBeforeIssue(doc);
      if (blocking.length > 0) {
        toast.error(blocking[0]);
        return;
      }
      await updateData('document_issuances', { id }, { status: 'ready_to_issue' });
      await addHistory(id, 'status_changed', doc.status, 'ready_to_issue', { action: 'ready' });
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
      const { blocking } = validateBeforeIssue(doc);
      if (blocking.length > 0) {
        toast.error(blocking[0]);
        return;
      }
      const existing = documents.find((d) => d.referenceType === doc.referenceType && d.referenceId === doc.referenceId && (d.status === 'issued' || d.status === 'finalized') && d.id !== id);
      if (existing) {
        toast.error('برای این عملیات قبلاً سند حسابداری صادر شده است');
        return;
      }
      const totalDebit = (doc.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCredit = (doc.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0);
      await updateData('document_issuances', { id }, {
        status: 'issued',
        issuedBy: profile.id,
        issuedAt: new Date().toISOString(),
        totalDebit,
        totalCredit,
        lockedBy: null,
        lockedAt: null,
      });
      await addHistory(id, 'issued', doc.status, 'issued', { totalDebit, totalCredit });
      toast.success('سند صادر شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('صدور ناموفق: ' + error.message); }
  };

  const handleFinalize = async (id: string) => {
    if (!profile) return;
    try {
      const doc = documents.find((d) => d.id === id);
      if (!doc) return;
      await updateData('document_issuances', { id }, {
        status: 'finalized',
        finalizedBy: profile.id,
        finalizedAt: new Date().toISOString(),
      });
      await addHistory(id, 'finalized', doc.status, 'finalized');
      toast.success('سند قطعی شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleReject = async () => {
    if (!rejectDialog || !profile) return;
    if (!rejectDialog.reason.trim()) { toast.error('دلیل رد الزامی است'); return; }
    try {
      const doc = documents.find((d) => d.id === rejectDialog.id);
      await updateData('document_issuances', { id: rejectDialog.id }, { status: 'rejected' });
      await addHistory(rejectDialog.id, 'status_changed', doc?.status || null, 'rejected', { reason: rejectDialog.reason });
      toast.success('سند رد شد');
      setRejectDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleVoid = async () => {
    if (!voidDialog || !profile) return;
    try {
      const doc = documents.find((d) => d.id === voidDialog.id);
      await updateData('document_issuances', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
      });
      await addHistory(voidDialog.id, 'voided', doc?.status || null, 'voided', { reason: voidDialog.reason });
      toast.success('سند ابطال شد');
      setVoidDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleAmend = async () => {
    if (!amendDialog || !profile) return;
    if (!amendDialog.reason.trim()) { toast.error('دلیل برگشت به اصلاح الزامی است'); return; }
    try {
      const doc = documents.find((d) => d.id === amendDialog.id);
      await updateData('document_issuances', { id: amendDialog.id }, { status: 'amended' });
      await addHistory(amendDialog.id, 'status_changed', doc?.status || null, 'amended', { reason: amendDialog.reason });
      toast.success('سند برای اصلاح برگردانده شد');
      setAmendDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleLock = async (id: string) => {
    if (!profile) return;
    try {
      const doc = documents.find((d) => d.id === id);
      if (doc?.lockedBy && doc.lockedBy !== profile.id) {
        toast.error(`سند توسط ${staffName(doc.lockedBy)} در حال بررسی است`);
        return;
      }
      await updateData('document_issuances', { id }, { lockedBy: profile.id, lockedAt: new Date().toISOString() });
      await addHistory(id, 'locked', doc?.status || null, doc?.status || 'draft', { lockedBy: profile.id });
      toast.success('سند قفل شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleUnlock = async (id: string) => {
    if (!profile) return;
    try {
      const doc = documents.find((d) => d.id === id);
      if (doc?.lockedBy && doc.lockedBy !== profile.id && !isSuperAdmin) {
        toast.error('فقط کاربری که قفل کرده یا مدیر می‌تواند آزاد کند');
        return;
      }
      await updateData('document_issuances', { id }, { lockedBy: null, lockedAt: null });
      await addHistory(id, 'unlocked', doc?.status || null, doc?.status || 'draft', { unlockedBy: profile.id });
      toast.success('قفل سند باز شد');
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handleAssign = async () => {
    if (!assignDialog) return;
    try {
      const doc = documents.find((d) => d.id === assignDialog.id);
      await updateData('document_issuances', { id: assignDialog.id }, { assignedTo: assignDialog.assigneeId || null });
      await addHistory(assignDialog.id, 'assigned', doc?.status || null, doc?.status || 'draft', { assignedTo: assignDialog.assigneeId });
      toast.success('سند تخصیص داده شد');
      setAssignDialog(null);
      setDetailItem(null);
      loadData();
    } catch (error: any) { toast.error('عملیات ناموفق: ' + error.message); }
  };

  const handlePriority = async () => {
    if (!priorityDialog) return;
    try {
      const doc = documents.find((d) => d.id === priorityDialog.id);
      await updateData('document_issuances', { id: priorityDialog.id }, { priority: priorityDialog.priority });
      await addHistory(priorityDialog.id, 'priority_changed', doc?.status || null, doc?.status || 'draft', { priority: priorityDialog.priority });
      toast.success('اولویت سند تغییر کرد');
      setPriorityDialog(null);
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
      locked: 'قفل شد',
      unlocked: 'باز شد',
      assigned: 'تخصیص داده شد',
      priority_changed: 'تغییر اولویت',
    };
    return (
      <div className="space-y-2">
        {history.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p>
          : history.map((h) => (
            <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500">
                {h.action === 'issued' ? <FileCheck className="h-3.5 w-3.5" /> : h.action === 'voided' ? <XCircle className="h-3.5 w-3.5" /> : h.action === 'finalized' ? <CheckCircle className="h-3.5 w-3.5" /> : h.action === 'locked' ? <Lock className="h-3.5 w-3.5" /> : h.action === 'unlocked' ? <Unlock className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{actionLabel[h.action] || h.action}</span>
                  <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  توسط {staffName(h.actionBy)}
                  {h.fromStatus && h.toStatus && <span className="mx-1">•</span>}
                  {h.fromStatus && h.toStatus && <span>{WB_STATUS[h.fromStatus] || h.fromStatus} ← {WB_STATUS[h.toStatus] || h.toStatus}</span>}
                  {h.details?.reason && <div className="mt-1 text-xs text-slate-400">دلیل: {h.details.reason}</div>}
                </div>
              </div>
            </div>
          ))}
      </div>
    );
  };

  const DocCard = ({ doc }: { doc: DocumentIssuance }) => {
    const stColor = WB_STATUS_COLOR[doc.status] || '#64748b';
    const pr = priorityInfo(doc.priority);
    const balanced = Number(doc.totalDebit) === Number(doc.totalCredit);
    const lockedByOther = doc.lockedBy && doc.lockedBy !== profile?.id;
    return (
      <div onClick={() => setDetailItem(doc)}
        className={`cursor-pointer rounded-[11px] border bg-white p-[14px] shadow-[0_2px_8px_rgba(20,40,80,.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(20,40,80,.08)] ${lockedByOther ? 'border-amber-200' : 'border-[#E7ECF3]'}`}>
        <div className="mb-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-bold leading-7 text-[#1D2939]">{doc.number}</div>
              {lockedByOther && <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
            </div>
            <div className="mt-0.5 text-xs text-[#667085]">{refLabel(doc)}</div>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{WB_STATUS[doc.status] || doc.status}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}35`, backgroundColor: `${pr.color}10` }} className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">{pr.label}</Badge>
          <span className="flex items-center gap-1 text-[11px] text-[#8490A5]"><Calendar className="h-3 w-3" />{formatJalali(doc.operationDate)}</span>
          {!balanced && <Badge variant="outline" className="border-rose-200 text-[10px] text-rose-500">نا متوازن</Badge>}
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-[#EEF1F5] pt-2.5">
          <span className="text-sm font-bold text-[#3155E7]">{formatToman(Number(doc.totalDebit))}</span>
          {doc.assignedTo ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6"><AvatarFallback className="bg-[#EFF4FF] text-[10px] text-[#2563EB]">{staffName(doc.assignedTo)[0]}</AvatarFallback></Avatar>
              <span className="text-[11px] text-[#667085]">{staffName(doc.assignedTo)}</span>
            </div>
          ) : <span className="text-[11px] text-[#CBD5E1]">عمومی</span>}
        </div>
      </div>
    );
  };

  const renderBoard = () => (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4">
        {WB_FLOW.map((stage) => {
          const items = filtered.filter((d) => d.status === stage.key);
          return (
            <div key={stage.key} className="w-[240px] shrink-0 overflow-hidden rounded-[14px] border border-[#E6EBF2] bg-[#F8FAFD]">
              <div className="flex h-[52px] items-center justify-between border-b-[3px] bg-white px-4" style={{ borderColor: stage.color }}>
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} /><span className="text-sm font-bold text-[#1D2939]">{stage.label}</span></div>
                <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#667085]">{items.length.toLocaleString('fa-IR')}</span>
              </div>
              <div className="min-h-[300px] space-y-2.5 p-2.5">
                {items.slice(0, visibleCount).map((doc) => <DocCard key={doc.id} doc={doc} />)}
                {items.length === 0 && <div className="py-8 text-center text-xs text-[#CBD5E1]">سندی در این وضعیت نیست</div>}
                {items.length > visibleCount && <button type="button" onClick={() => setVisibleCount((c) => c + 10)} className="w-full rounded-lg py-2 text-xs font-semibold text-[#3155E7] transition-colors hover:bg-[#EFF4FF]">نمایش موارد بیشتر</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderList = () => {
    const visibleItems = pageItems;
    return (
      <Card><CardContent className="p-0">
        <div className="divide-y divide-[#F1F5F9]">
          {visibleItems.map((d) => {
            const stColor = WB_STATUS_COLOR[d.status] || '#64748b';
            const pr = priorityInfo(d.priority);
            const balanced = Number(d.totalDebit) === Number(d.totalCredit);
            const lockedByOther = d.lockedBy && d.lockedBy !== profile?.id;
            return (
              <div key={d.id} className={`flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD] ${lockedByOther ? 'bg-amber-50/30' : ''}`} onClick={() => setDetailItem(d)}>
                <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-bold text-[#1D2939]">{d.number}</div>
                    <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{WB_STATUS[d.status] || d.status}</Badge>
                    {lockedByOther && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                    {!balanced && <Badge variant="outline" className="shrink-0 border-rose-200 text-[10px] text-rose-500">نا متوازن</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                    <span>{refLabel(d)}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(d.operationDate)}</span>
                    <span>{relativeTime(d.createdAt)}</span>
                    <span>{(d.lines || []).length.toLocaleString('fa-IR')} ردیف</span>
                    {d.assignedTo && <span>مسئول: {staffName(d.assignedTo)}</span>}
                  </div>
                </div>
                <Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}35` }} className="text-xs">{pr.label}</Badge>
                <div className="text-left">
                  <div className="text-sm font-bold text-[#3155E7]">{formatToman(Number(d.totalDebit))}</div>
                  <div className="text-[10px] text-[#98A2B3]">جمع بدهکار</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDetailItem(d); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
              </div>
            );
          })}
          {visibleItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
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
    );
  };

  const statCards = [
    { key: 'draft', label: 'در انتظار صدور', count: stats.draft, color: '#64748b', Icon: Circle },
    { key: 'amended', label: 'نیازمند اصلاح', count: stats.amended, color: '#8b5cf6', Icon: AlertTriangle },
    { key: 'ready', label: 'آماده صدور', count: stats.ready, color: '#f59e0b', Icon: Clock },
    { key: 'issued', label: 'صادرشده', count: stats.issued, color: '#3b82f6', Icon: FileCheck },
    { key: 'finalized', label: 'قطعی', count: stats.finalized, color: '#16a34a', Icon: CheckCircle },
    { key: 'rejected', label: 'ردشده', count: stats.rejected, color: '#ef4444', Icon: XCircle },
    { key: 'voided', label: 'ابطال‌شده', count: stats.voided, color: '#94a3b8', Icon: XCircle },
  ];

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">کارتابل صدور سند</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> کارتابل <span className="mx-1.5 text-[#CBD5E1]">←</span> صدور سند حسابداری</div>
        </div>
        <div className="flex h-[42px] items-center rounded-[10px] border border-[#DCE3EE] bg-white p-1 shadow-sm">
          <button onClick={() => setViewMode('list')} className={`flex h-full items-center rounded-[8px] px-3 text-sm font-semibold transition-colors ${viewMode === 'list' ? 'bg-[#EFF4FF] text-[#2563EB]' : 'text-[#667085] hover:text-[#344054]'}`}><BarChart3 className="ml-1 h-4 w-4" /> لیست</button>
          <button onClick={() => setViewMode('board')} className={`flex h-full items-center rounded-[8px] px-3 text-sm font-semibold transition-colors ${viewMode === 'board' ? 'bg-[#EFF4FF] text-[#2563EB]' : 'text-[#667085] hover:text-[#344054]'}`}><LayoutGrid className="ml-1 h-4 w-4" /> برد</button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.slice(0, 4).map((s) => (
          <div key={s.key} className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
            <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full" style={{ color: s.color, backgroundColor: `${s.color}15` }}><s.Icon className="h-5 w-5" strokeWidth={2.5} /></span>
            <div><div className="text-[26px] font-bold leading-none text-[#101828]">{s.count.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Secondary stats row */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statCards.slice(4).map((s) => (
          <div key={s.key} className="flex min-h-[80px] items-center gap-3 rounded-[14px] border border-[#E7ECF3] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
            <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full" style={{ color: s.color, backgroundColor: `${s.color}15` }}><s.Icon className="h-4 w-4" strokeWidth={2.5} /></span>
            <div><div className="text-lg font-bold text-[#101828]">{s.count.toLocaleString('fa-IR')}</div><div className="text-xs text-[#667085]">{s.label}</div></div>
          </div>
        ))}
        <div className="flex min-h-[80px] items-center gap-3 rounded-[14px] border border-[#E7ECF3] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]"><TrendingDown className="h-4 w-4" strokeWidth={2.5} /></span>
          <div><div className="text-lg font-bold text-[#101828]">{formatToman(stats.totalAmount)}</div><div className="text-xs text-[#667085]">مجموع (تومان)</div></div>
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
            <option value="all">همه منابع</option>
            {Object.entries(REF_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه وضعیت‌ها</option>
            {WB_FLOW.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه اولویت‌ها</option>
            {PRIORITY_OPTS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه مسئولین</option>
            <option value="">عمومی</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : documents.length === 0 ? (
        <Card><EmptyState icon={<FileCheck className="h-8 w-8" />} title="سندی در کارتابل نیست" description="اسنادی که در ماژول‌های دیگر ایجاد شده‌اند پس از تکمیل فرآیند به کارتابل صدور وارد می‌شوند" /></Card>
      ) : (
        viewMode === 'board' ? renderBoard() : renderList()
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {detailItem && (() => {
            const stColor = WB_STATUS_COLOR[detailItem.status] || '#64748b';
            const totalDebit = (detailItem.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0);
            const totalCredit = (detailItem.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0);
            const balanced = totalDebit === totalCredit;
            const pr = priorityInfo(detailItem.priority);
            const lockedByOther = detailItem.lockedBy && detailItem.lockedBy !== profile?.id;
            const validation = validateBeforeIssue(detailItem);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">سند صدور {detailItem.number}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detailItem)}><RotateCcw className="h-4 w-4" /> تاریخچه</Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{WB_STATUS[detailItem.status] || detailItem.status}</Badge>
                    <Badge variant="outline" style={{ color: pr.color, borderColor: `${pr.color}40` }}>{pr.label}</Badge>
                    <span className="text-xs text-[#98A2B3]">{refLabel(detailItem)}</span>
                    <span className="flex items-center gap-1 text-xs text-[#98A2B3]"><Calendar className="h-3 w-3" />{formatJalali(detailItem.operationDate)}</span>
                    {fiscalYearName(detailItem.fiscalYearId) && <span className="text-xs text-[#98A2B3]">{fiscalYearName(detailItem.fiscalYearId)}</span>}
                    {costCenterName(detailItem.costCenterId) && <span className="text-xs text-[#98A2B3]">{costCenterName(detailItem.costCenterId)}</span>}
                    {lockedByOther && <Badge variant="outline" className="border-amber-300 text-amber-600"><Lock className="ml-1 h-3 w-3" />قفل توسط {staffName(detailItem.lockedBy)}</Badge>}
                  </div>

                  {detailItem.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detailItem.description}</p></div>}
                  {detailItem.voidReason && <div className="rounded-lg bg-rose-50 p-3"><p className="text-sm text-rose-700"><strong>دلیل ابطال: </strong>{detailItem.voidReason}</p></div>}

                  {/* Dates */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">تاریخ عملیات</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatJalali(detailItem.operationDate)}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">تاریخ سند</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatJalali(detailItem.documentDate)}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ صدور</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{detailItem.issueDate ? formatJalali(detailItem.issueDate) : '—'}</div></div>
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

                  {/* Validation warnings */}
                  {(validation.blocking.length > 0 || validation.warnings.length > 0) && (
                    <div className="space-y-2">
                      {validation.blocking.map((b, i) => (
                        <div key={`b${i}`} className="flex items-start gap-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{b}</div>
                      ))}
                      {validation.warnings.map((w, i) => (
                        <div key={`w${i}`} className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</div>
                      ))}
                    </div>
                  )}

                  {/* Lines */}
                  <div className="border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center gap-2"><FileCheck className="h-4 w-4 text-slate-400" /><h4 className="text-sm font-semibold text-slate-700">ردیف‌های حسابداری</h4><Badge variant="secondary" className="text-xs">{(detailItem.lines || []).length.toLocaleString('fa-IR')}</Badge></div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs text-[#98A2B3]">
                            <th className="py-2 pr-2 text-right font-medium">حساب</th>
                            <th className="py-2 text-right font-medium">مرکز هزینه</th>
                            <th className="py-2 text-left font-medium">بدهکار</th>
                            <th className="py-2 text-left font-medium">بستانکار</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detailItem.lines || []).map((line: DocumentIssuanceLine) => (
                            <tr key={line.id} className="border-b border-slate-100">
                              <td className="py-2 pr-2 text-right text-[#1D2939]">{accountName(line.accountId)}</td>
                              <td className="py-2 text-right text-xs text-[#667085]">{costCenterName(line.costCenterId) || '—'}</td>
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

                  {/* Assignment & priority */}
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-xs">
                    <div><span className="text-[#98A2B3]">مسئول رسیدگی: </span><span className="font-medium text-[#344054]">{detailItem.assignedTo ? staffName(detailItem.assignedTo) : 'عمومی'}</span></div>
                    <div><span className="text-[#98A2B3]">اولویت: </span><span className="font-medium text-[#344054]">{pr.label}</span></div>
                    <div><span className="text-[#98A2B3]">ایجادکننده: </span><span className="font-medium text-[#344054]">{staffName(detailItem.createdBy)}</span></div>
                    {detailItem.issuedBy && <div><span className="text-[#98A2B3]">صادرکننده: </span><span className="font-medium text-[#344054]">{staffName(detailItem.issuedBy)}</span></div>}
                    {detailItem.finalizedBy && <div><span className="text-[#98A2B3]">تأییدکننده: </span><span className="font-medium text-[#344054]">{staffName(detailItem.finalizedBy)}</span></div>}
                    {detailItem.voidedBy && <div><span className="text-[#98A2B3]">ابطال‌کننده: </span><span className="font-medium text-[#344054]">{staffName(detailItem.voidedBy)}</span></div>}
                  </div>

                  {/* Action buttons */}
                  {isSuperAdmin && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                      {/* Lock/Unlock */}
                      {detailItem.status !== 'voided' && detailItem.status !== 'finalized' && (
                        !detailItem.lockedBy ? (
                          <Button variant="outline" onClick={() => handleLock(detailItem.id)}><Lock className="h-4 w-4" /> قفل برای بررسی</Button>
                        ) : detailItem.lockedBy === profile?.id || isSuperAdmin ? (
                          <Button variant="outline" onClick={() => handleUnlock(detailItem.id)}><Unlock className="h-4 w-4" /> آزاد کردن</Button>
                        ) : null
                      )}

                      {/* Assign */}
                      {detailItem.status !== 'voided' && detailItem.status !== 'finalized' && (
                        <Button variant="outline" onClick={() => setAssignDialog({ id: detailItem.id, assigneeId: detailItem.assignedTo || '' })}><UserCog className="h-4 w-4" /> تخصیص</Button>
                      )}

                      {/* Priority */}
                      {detailItem.status !== 'voided' && (
                        <Button variant="outline" onClick={() => setPriorityDialog({ id: detailItem.id, priority: detailItem.priority || 'medium' })}><Flag className="h-4 w-4" /> اولویت</Button>
                      )}

                      {/* Ready to issue */}
                      {detailItem.status === 'draft' && (
                        <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleReadyToIssue(detailItem.id)}><Send className="h-4 w-4" /> آماده صدور</Button>
                      )}

                      {/* Issue */}
                      {detailItem.status === 'ready_to_issue' && (
                        <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleIssue(detailItem.id)}><FileCheck className="h-4 w-4" /> صدور نهایی</Button>
                      )}

                      {/* Finalize */}
                      {detailItem.status === 'issued' && (
                        <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleFinalize(detailItem.id)}><CheckCircle className="h-4 w-4" /> قطعی کردن</Button>
                      )}

                      {/* Amend (return for correction) */}
                      {(detailItem.status === 'ready_to_issue' || detailItem.status === 'issued') && (
                        <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => setAmendDialog({ id: detailItem.id, reason: '' })}><RotateCcw className="h-4 w-4" /> برگشت به اصلاح</Button>
                      )}

                      {/* Reject */}
                      {detailItem.status !== 'voided' && detailItem.status !== 'finalized' && detailItem.status !== 'rejected' && (
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectDialog({ id: detailItem.id, reason: '' })}><XCircle className="h-4 w-4" /> رد</Button>
                      )}

                      {/* Void */}
                      {detailItem.status !== 'voided' && detailItem.status !== 'finalized' && (
                        <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setVoidDialog({ id: detailItem.id, reason: '' })}><AlertTriangle className="h-4 w-4" /> ابطال</Button>
                      )}
                    </div>
                  )}
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
            <p className="text-sm text-slate-500">رد سند فرآیند آن را متوقف می‌کند. دلیل رد الزامی است.</p>
            <div className="space-y-2">
              <Label>دلیل رد *</Label>
              <Textarea value={rejectDialog?.reason || ''} onChange={(e) => setRejectDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل رد سند..." />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRejectDialog(null)}>انصراف</Button><Button variant="destructive" onClick={handleReject}>رد سند</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ابطال سند</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">با ابطال سند، وضعیت آن به «ابطال‌شده» تغییر می‌کند ولی سابقه سند حذف نخواهد شد. ارتباط با سند مبنا حفظ می‌شود.</div>
            <div className="space-y-2">
              <Label>دلیل ابطال</Label>
              <Textarea value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل ابطال..." />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button><Button variant="destructive" onClick={handleVoid}>ابطال سند</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amend Dialog */}
      <Dialog open={!!amendDialog} onOpenChange={(o) => !o && setAmendDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>برگشت به اصلاح</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">سند برای اصلاح به مرحله «نیازمند اصلاح» برگردانده می‌شود. دلیل برگشت الزامی است.</p>
            <div className="space-y-2">
              <Label>دلیل برگشت *</Label>
              <Textarea value={amendDialog?.reason || ''} onChange={(e) => setAmendDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل برگشت به اصلاح..." />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAmendDialog(null)}>انصراف</Button><Button onClick={handleAmend}>برگشت به اصلاح</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(o) => !o && setAssignDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تخصیص سند</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>مسئول رسیدگی</Label>
              <Select value={assignDialog?.assigneeId || 'none'} onValueChange={(v) => setAssignDialog((d) => d ? { ...d, assigneeId: v === 'none' ? '' : v } : null)}>
                <SelectTrigger><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">عمومی (بدون تخصیص)</SelectItem>
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAssignDialog(null)}>انصراف</Button><Button onClick={handleAssign}>تخصیص</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Dialog */}
      <Dialog open={!!priorityDialog} onOpenChange={(o) => !o && setPriorityDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تغییر اولویت</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اولویت</Label>
              <Select value={priorityDialog?.priority || 'medium'} onValueChange={(v) => setPriorityDialog((d) => d ? { ...d, priority: v } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_OPTS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPriorityDialog(null)}>انصراف</Button><Button onClick={handlePriority}>ذخیره</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه کامل سند</DialogTitle></DialogHeader>
          {historyDialog && renderHistory(historyDialog.history || [])}
        </DialogContent>
      </Dialog>
    </div>
  );
}
