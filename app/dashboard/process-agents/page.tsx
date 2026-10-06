'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Network, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, Ban, Eye, FileText, User, TrendingUp, Pencil, X, Loader2,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  ProcessAgent, ProcessAgentRole, ProcessAgentDebt,
  ProcessAgentHistory, ContactParty, Profile,
} from '@/lib/types';

const PA_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  active: 'فعال',
  inactive: 'غیرفعال',
};

const PA_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  active: '#10b981',
  inactive: '#ef4444',
};

const AGENT_TYPE: Record<string, string> = {
  individual: 'حقیقی',
  company: 'حقوقی',
  broker: 'کارگزار',
  representative: 'نماینده',
  other: 'سایر',
};

const CALC_METHOD: Record<string, string> = {
  percentage: 'درصدی',
  fixed_amount: 'مبلغ ثابت',
  tiered: 'پله‌ای',
};

const DEBT_TYPE: Record<string, string> = {
  commission: 'پورسانت',
  bonus: 'پاداش',
  advance: 'پیش‌پرداخت',
  other: 'سایر',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  info_changed: 'تغییر اطلاعات',
  status_changed: 'تغییر وضعیت',
  assigned_to_sale: 'اختصاص به فروش',
  rule_changed: 'تغییر قانون',
  commission_calculated: 'محاسبه پورسانت',
  approved: 'تأیید شد',
  debt_created: 'ایجاد بدهی',
  paid: 'پرداخت شد',
  settled: 'تسویه شد',
  amended: 'اصلاح شد',
  voided: 'باطل شد',
  deactivated: 'غیرفعال شد',
};

export default function ProcessAgentsPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<ProcessAgent[]>([]);
  const [contacts, setContacts] = useState<ContactParty[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ProcessAgent | null>(null);
  const [detailRoles, setDetailRoles] = useState<ProcessAgentRole[]>([]);
  const [detailDebts, setDetailDebts] = useState<ProcessAgentDebt[]>([]);
  const [detailHistory, setDetailHistory] = useState<ProcessAgentHistory[]>([]);
  const [historyDialog, setHistoryDialog] = useState<ProcessAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [paData, contactData, staffData] = await Promise.all([
        fetchData<ProcessAgent>('process_agents', {
          orderBy: { createdAt: 'desc' },
          include: {
            roles: true,
            debts: true,
            history: { orderBy: { actionAt: 'desc' } },
          },
        }),
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRecords(paData || []);
      setContacts(contactData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری عوامل ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const contactName = (id: string | null | undefined, name?: string | null) => {
    if (name) return name;
    if (!id) return '—';
    const c = contacts.find((c) => c.id === id);
    return c ? [c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ') : '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return records.filter((r) => {
      const matches = !q || r.code?.toLocaleLowerCase().includes(q) || r.name?.toLocaleLowerCase().includes(q) || r.contactName?.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => [
    {
      label: 'کل عوامل', value: records.length, icon: Network,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'فعال', value: records.filter((r) => r.status === 'active').length, icon: CheckCircle,
      filter: 'active',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'غیرفعال', value: records.filter((r) => r.status === 'inactive').length, icon: Ban,
      filter: 'inactive',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
    {
      label: 'مانده کل (تومان)', value: records.reduce((sum, r) => sum + Number(r.balance || 0), 0), icon: TrendingUp,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      glow: 'rgba(99,102,241,0.25)',
    },
  ], [records]);

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این عامل؟')) return;
    try {
      await deleteData('process_agents', { id });
      toast.success('عامل حذف شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, action: string) => {
    if (!profile) return;
    try {
      await updateData('process_agents', { id }, {
        status: newStatus,
        active: newStatus === 'active',
        updatedAt: new Date().toISOString(),
      });
      await createData('process_agent_history', {
        agentId: id,
        action,
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === id)?.status || null,
        toStatus: newStatus,
        details: {},
      });
      toast.success('وضعیت تغییر کرد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadDetail = (pa: ProcessAgent) => {
    setDetail(pa);
    setDetailRoles(pa.roles || []);
    setDetailDebts(pa.debts || []);
    setDetailHistory(pa.history || []);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری عوامل...</p>
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
              <h1>عامل فرایند</h1>
            </div>
            <p>مدیریت عوامل فرایند، نقش‌ها و پورسانت</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/process-agents/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت عامل
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => handleStatClick(stat.filter)}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" strokeWidth={2.5} />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.label.includes('تومان') ? formatToman(stat.value) : stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه عوامل</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس کد، نام یا طرف..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(PA_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Network className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>عاملی یافت نشد</h3>
          <p>برای شروع، اولین عامل فرایند را ثبت کنید</p>
          <Link href="/dashboard/process-agents/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن عامل</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عامل</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نوع</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">طرف حساب</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مانده</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {pageItems.map((r) => {
                  const stColor = PA_STATUS_COLOR[r.status] || '#64748b';
                  return (
                    <tr key={r.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => loadDetail(r)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: stColor }} />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">{r.code} - {r.name}</div>
                            <Badge variant="outline" className="mt-0.5 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{PA_STATUS[r.status]}</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px] text-slate-500 dark:text-slate-400">{AGENT_TYPE[r.agentType] || r.agentType}</Badge></td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        {r.contactName ? <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.contactName}</span> : '—'}
                      </td>
                      <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-300">{formatToman(Number(r.balance))}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.createdAt)}</span>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => loadDetail(r)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-900/20" title="مشاهده"><Eye className="h-4 w-4" /></button>
                          {isSuperAdmin && <Link href={`/dashboard/process-agents/${r.id}/edit`} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="ویرایش"><Pencil className="h-4 w-4" /></Link>}
                          {isSuperAdmin && <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20" title="حذف"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-300 dark:text-slate-600">نتیجه‌ای یافت نشد</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">صفحه {currentPage.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={currentPage === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <Link href="/dashboard/process-agents/new" className="nb-fab" aria-label="ثبت عامل">
        <Plus className="h-6 w-6" />
      </Link>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (() => {
            const stColor = PA_STATUS_COLOR[detail.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">{detail.code} - {detail.name}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setHistoryDialog(detail)} className="flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"><FileText className="h-4 w-4" /> تاریخچه</button>
                      {isSuperAdmin && <Link href={`/dashboard/process-agents/${detail.id}/edit`}><button className="flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"><Pencil className="h-4 w-4" /> ویرایش</button></Link>}
                      {isSuperAdmin && <button onClick={() => handleDelete(detail.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{PA_STATUS[detail.status]}</Badge>
                    <Badge variant="outline" className="text-slate-500 dark:text-slate-400">{AGENT_TYPE[detail.agentType] || detail.agentType}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
                    <div className="rounded-[10px] bg-sky-50 p-3 dark:bg-sky-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">کد</div><div className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">{detail.code}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-700/40"><div className="text-xs text-slate-500 dark:text-slate-400">نام</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{detail.name}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-700/40"><div className="text-xs text-slate-500 dark:text-slate-400">طرف حساب</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{contactName(detail.contactPartyId, detail.contactName)}</div></div>
                    <div className="rounded-[10px] bg-green-50 p-3 dark:bg-green-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">بدهی کل</div><div className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">{formatToman(Number(detail.totalDebt))}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3 dark:bg-slate-700/40"><div className="text-xs text-slate-500 dark:text-slate-400">پرداخت شده</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{formatToman(Number(detail.totalPaid))}</div></div>
                    <div className="rounded-[10px] bg-blue-50 p-3 dark:bg-blue-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">مانده</div><div className="mt-1 text-sm font-bold text-blue-600 dark:text-blue-400">{formatToman(Number(detail.balance))}</div></div>
                  </div>
                  {detail.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"><p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detail.description}</p></div>}

                  {detailRoles.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">نقش‌ها ({detailRoles.length})</h3>
                      <div className="space-y-1.5">
                        {detailRoles.map((role) => (
                          <div key={role.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700 dark:text-slate-200">{role.roleTitle}</div>
                              <div className="mt-0.5 flex flex-wrap gap-3 text-slate-400">
                                <span>{CALC_METHOD[role.calcMethod] || role.calcMethod}</span>
                                {role.commissionRate > 0 && <span>نرخ: {String(role.commissionRate)}%</span>}
                                {role.fixedAmount > 0 && <span>مبلغ ثابت: {formatToman(Number(role.fixedAmount))}</span>}
                              </div>
                            </div>
                            <Badge variant="outline" className={role.active ? 'text-green-600' : 'text-slate-400'}>{role.active ? 'فعال' : 'غیرفعال'}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailDebts.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">بدهی‌ها ({detailDebts.length})</h3>
                      <div className="space-y-1.5">
                        {detailDebts.map((debt) => (
                          <div key={debt.id} className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-xs dark:bg-amber-900/20">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-amber-800 dark:text-amber-400">{DEBT_TYPE[debt.debtType] || debt.debtType}</div>
                              <div className="mt-0.5 flex gap-3 text-amber-600 dark:text-amber-500">
                                <span>{formatJalali(debt.debtDate)}</span>
                                <span>مانده: {formatToman(Number(debt.balance))}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className={debt.status === 'settled' ? 'text-green-600' : 'text-amber-600'}>{debt.status === 'settled' ? 'تسویه' : debt.status === 'partial' ? 'جزئی' : 'باز'}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {detail.status === 'draft' && isSuperAdmin && (
                      <button className="flex h-9 items-center gap-1.5 rounded-lg border border-green-200 px-3 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20" onClick={() => handleStatusChange(detail.id, 'active', 'status_changed')}><CheckCircle className="h-4 w-4" /> فعال‌سازی</button>
                    )}
                    {detail.status === 'active' && isSuperAdmin && (
                      <button className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-900/20" onClick={() => handleStatusChange(detail.id, 'inactive', 'deactivated')}><Ban className="h-4 w-4" /> غیرفعال‌سازی</button>
                    )}
                    {detail.status === 'inactive' && isSuperAdmin && (
                      <button className="flex h-9 items-center gap-1.5 rounded-lg border border-green-200 px-3 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 dark:border-green-900/40 dark:hover:bg-green-900/20" onClick={() => handleStatusChange(detail.id, 'active', 'status_changed')}><CheckCircle className="h-4 w-4" /> فعال‌سازی</button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه عامل</DialogTitle></DialogHeader>
          {detailHistory.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p> : (
            <div className="space-y-2">
              {detailHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 dark:bg-slate-700 dark:text-slate-300"><FileText className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{ACTION_LABEL[h.action] || h.action}</span>
                      <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      توسط {staffName(h.actionBy)}
                      {h.fromStatus && h.toStatus && <span> • {PA_STATUS[h.fromStatus] || h.fromStatus} ← {PA_STATUS[h.toStatus] || h.toStatus}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
