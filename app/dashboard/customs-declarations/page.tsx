'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileSearch, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, Clock, Eye, Ban, FileText, Building2, Send, Globe, Pencil,
  X, Loader2,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  CustomsDeclaration, CustomsDeclarationItem, CustomsDeclarationCost,
  CustomsDeclarationPayment, CustomsDeclarationHistory,
  ContactParty, Profile,
} from '@/lib/types';

const CD_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  completed_info: 'تکمیل اطلاعات',
  registered: 'ثبت شده',
  under_review: 'در حال بررسی',
  approved: 'تأیید شده',
  cleared: 'ترخیص شده',
  finalized: 'نهایی شده',
  needs_correction: 'نیازمند اصلاح',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
  voided: 'باطل شده',
  amended: 'اصلاحی',
};

const CD_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  completed_info: '#f59e0b',
  registered: '#3155E7',
  under_review: '#a855f7',
  approved: '#10b981',
  cleared: '#16A34A',
  finalized: '#6366f1',
  needs_correction: '#f97316',
  rejected: '#ef4444',
  cancelled: '#64748b',
  voided: '#dc2626',
  amended: '#0ea5e9',
};

const OP_TYPE: Record<string, string> = {
  import: 'واردات',
  export: 'صادرات',
};

const COST_TYPE: Record<string, string> = {
  duty: 'حقوق گمرکی',
  surcharge: 'عوارض',
  vat: 'مالیات بر ارزش افزوده',
  customs_fee: 'کارمزد گمرک',
  freight: 'حمل و نقل',
  insurance: 'بیمه',
  clearance: 'ترخیص',
  storage: 'انبارداری',
  other: 'سایر',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  info_changed: 'تغییر اطلاعات',
  amount_changed: 'تغییر مبلغ',
  item_changed: 'تغییر قلم',
  qty_changed: 'تغییر تعداد',
  rate_changed: 'تغییر نرخ',
  status_changed: 'تغییر وضعیت',
  approved: 'تأیید شد',
  cleared: 'ترخیص شد',
  paid: 'پرداخت شد',
  amended: 'اصلاح شد',
  voided: 'باطل شد',
  journal_issued: 'ثبت سند',
};

export default function CustomsDeclarationsPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<CustomsDeclaration[]>([]);
  const [contacts, setContacts] = useState<ContactParty[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<CustomsDeclaration | null>(null);
  const [detailItems, setDetailItems] = useState<CustomsDeclarationItem[]>([]);
  const [detailCosts, setDetailCosts] = useState<CustomsDeclarationCost[]>([]);
  const [detailPayments, setDetailPayments] = useState<CustomsDeclarationPayment[]>([]);
  const [detailHistory, setDetailHistory] = useState<CustomsDeclarationHistory[]>([]);
  const [historyDialog, setHistoryDialog] = useState<CustomsDeclaration | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cdData, contactData, staffData] = await Promise.all([
        fetchData<CustomsDeclaration>('customs_declarations', {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            costs: true,
            payments: true,
            history: { orderBy: { actionAt: 'desc' } },
          },
        }),
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRecords(cdData || []);
      setContacts(contactData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری اظهارات ناموفق: ' + error.message);
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
      const matches = !q || r.internalNumber?.toLocaleLowerCase().includes(q) || r.customsNumber?.toLocaleLowerCase().includes(q) || r.contactName?.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: records.length,
    pending: records.filter((r) => r.status === 'draft' || r.status === 'completed_info').length,
    cleared: records.filter((r) => r.status === 'cleared' || r.status === 'finalized').length,
    totalValue: records.filter((r) => r.status !== 'voided').reduce((sum, r) => sum + Number(r.totalRialValue || 0), 0),
  }), [records]);

  const statsList = useMemo(() => [
    { label: 'کل اظهارنامه‌ها', value: stats.total.toLocaleString('fa-IR'), icon: FileSearch, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'در انتظار', value: stats.pending.toLocaleString('fa-IR'), icon: Clock, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
    { label: 'ترخیص شده', value: stats.cleared.toLocaleString('fa-IR'), icon: CheckCircle, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
    { label: 'ارزش کل (ریال)', value: formatToman(stats.totalValue), icon: FileText, gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', glow: 'rgba(99,102,241,0.25)' },
  ], [stats]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این اظهارنامه؟')) return;
    try {
      await deleteData('customs_declarations', { id });
      toast.success('اظهارنامه حذف شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, action: string) => {
    if (!profile) return;
    try {
      await updateData('customs_declarations', { id }, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      await createData('customs_declaration_history', {
        declarationId: id,
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

  const handleVoid = async () => {
    if (!voidDialog || !profile) return;
    try {
      await updateData('customs_declarations', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });
      await createData('customs_declaration_history', {
        declarationId: voidDialog.id,
        action: 'voided',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === voidDialog.id)?.status || null,
        toStatus: 'voided',
        reason: voidDialog.reason || null,
        details: {},
      });
      toast.success('اظهارنامه باطل شد');
      setVoidDialog(null);
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadDetail = (cd: CustomsDeclaration) => {
    setDetail(cd);
    setDetailItems(cd.items || []);
    setDetailCosts(cd.costs || []);
    setDetailPayments(cd.payments || []);
    setDetailHistory(cd.history || []);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری اظهارات...</p>
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
              <h1>اظهارات گمرکی</h1>
            </div>
            <p>مدیریت اظهارنامه‌های گمرکی، ترخیص و هزینه‌ها</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/customs-declarations/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت اظهارنامه
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {statsList.map((stat) => (
          <button
            type="button"
            className="nb-stat-card-v2"
            key={stat.label}
            style={{ '--stat-glow': stat.glow } as React.CSSProperties}
          >
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه اظهارنامه‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس شماره، گمرک یا طرف..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(CD_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><FileSearch className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>اظهارنامه‌ای یافت نشد</h3>
          <p>برای شروع، اولین اظهارنامه گمرکی را ثبت کنید</p>
          <Link href="/dashboard/customs-declarations/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن اظهارنامه</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500">شماره</th>
                  <th className="p-3 text-right font-medium text-slate-500">وضعیت</th>
                  <th className="p-3 text-right font-medium text-slate-500">نوع</th>
                  <th className="p-3 text-right font-medium text-slate-500">گمرک</th>
                  <th className="p-3 text-right font-medium text-slate-500">تاریخ</th>
                  <th className="p-3 text-right font-medium text-slate-500">طرف حساب</th>
                  <th className="p-3 text-right font-medium text-slate-500">ارزش</th>
                  <th className="p-3 text-right font-medium text-slate-500">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((r) => {
                  const stColor = CD_STATUS_COLOR[r.status] || '#64748b';
                  return (
                    <tr key={r.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => loadDetail(r)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stColor }} />
                          <div>
                            <div className="font-medium text-slate-800">{r.internalNumber}</div>
                            {r.customsNumber && <div className="text-xs text-slate-400">({r.customsNumber})</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge style={{ backgroundColor: `${stColor}15`, color: stColor }} className="rounded-full text-xs">{CD_STATUS[r.status]}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs text-slate-500">{OP_TYPE[r.operationType] || r.operationType}</Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {r.customsOffice ? (
                          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{r.customsOffice}</span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.declarationDate)}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">{r.contactName || '—'}</td>
                      <td className="p-3 text-xs font-medium text-slate-600">{formatToman(Number(r.totalRialValue))} ریال</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => loadDetail(r)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="مشاهده"><Eye className="h-4 w-4" /></button>
                          {isSuperAdmin && <Link href={`/dashboard/customs-declarations/${r.id}/edit`} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" title="ویرایش"><Pencil className="h-4 w-4" /></Link>}
                          {isSuperAdmin && <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500" title="حذف"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-slate-300">نتیجه‌ای یافت نشد</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <span className="text-xs text-slate-500">صفحه {currentPage.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={currentPage === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (() => {
            const stColor = CD_STATUS_COLOR[detail.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">اظهارنامه {detail.internalNumber}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detail)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && <Link href={`/dashboard/customs-declarations/${detail.id}/edit`}><Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50"><Pencil className="h-4 w-4" /> ویرایش</Button></Link>}
                      {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{CD_STATUS[detail.status]}</Badge>
                    <Badge variant="outline" className="text-slate-500">{OP_TYPE[detail.operationType] || detail.operationType}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-sky-50 p-3"><div className="text-xs text-slate-500">شماره داخلی</div><div className="mt-1 text-sm font-bold text-sky-700">{detail.internalNumber}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3"><div className="text-xs text-slate-500">شماره گمرک</div><div className="mt-1 text-sm font-bold text-slate-700">{detail.customsNumber || '—'}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3"><div className="text-xs text-slate-500">گمرک</div><div className="mt-1 text-sm font-bold text-slate-700">{detail.customsOffice || '—'}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3"><div className="text-xs text-slate-500">طرف حساب</div><div className="mt-1 text-sm font-bold text-slate-700">{contactName(detail.contactPartyId, detail.contactName)}</div></div>
                    <div className="rounded-[10px] bg-green-50 p-3"><div className="text-xs text-slate-500">تاریخ اظهار</div><div className="mt-1 text-sm font-bold text-green-700">{formatJalali(detail.declarationDate)}</div></div>
                    <div className="rounded-[10px] bg-slate-50 p-3"><div className="text-xs text-slate-500">ایجادکننده</div><div className="mt-1 text-sm font-bold text-slate-700">{staffName(detail.createdBy)}</div></div>
                    {detail.originCountry && <div className="rounded-[10px] bg-slate-50 p-3"><div className="text-xs text-slate-500">مبدا</div><div className="mt-1 text-sm font-bold text-slate-700">{detail.originCountry}</div></div>}
                    {detail.destinationCountry && <div className="rounded-[10px] bg-slate-50 p-3"><div className="text-xs text-slate-500">مقصد</div><div className="mt-1 text-sm font-bold text-slate-700">{detail.destinationCountry}</div></div>}
                    <div className="rounded-[10px] bg-blue-50 p-3"><div className="text-xs text-slate-500">ارزش ریالی</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(Number(detail.totalRialValue))}</div></div>
                  </div>
                  {detail.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.description}</p></div>}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800">اقلام ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">قلمی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700">{item.productName || '—'}</div>
                              <div className="mt-0.5 flex flex-wrap gap-3 text-slate-400">
                                <span>{formatToman(Number(item.qty))} {item.unit || ''}</span>
                                <span>ارزش واحد: {formatToman(Number(item.unitValue))}</span>
                                <span>ارزش کل: {formatToman(Number(item.totalValue))}</span>
                                {item.hsCode && <span>HS: {item.hsCode}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {detailCosts.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-800">هزینه‌ها ({detailCosts.length})</h3>
                      <div className="space-y-1.5">
                        {detailCosts.map((cost) => (
                          <div key={cost.id} className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-xs">
                            <div className="font-semibold text-amber-800">{COST_TYPE[cost.costType] || cost.costType}</div>
                            <div className="font-bold text-amber-700">{formatToman(Number(cost.rialAmount))} ریال</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailPayments.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-800">پرداخت‌ها ({detailPayments.length})</h3>
                      <div className="space-y-1.5">
                        {detailPayments.map((pay) => (
                          <div key={pay.id} className="flex items-center justify-between rounded-lg bg-green-50 p-3 text-xs">
                            <div className="font-semibold text-green-800">{formatJalali(pay.paymentDate)} - {pay.receiverName || '—'}</div>
                            <div className="font-bold text-green-700">{formatToman(Number(pay.amount))} ریال</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detail.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => handleStatusChange(detail.id, 'completed_info', 'info_changed')}><CheckCircle className="h-4 w-4" /> تکمیل اطلاعات</Button>
                    )}
                    {detail.status === 'completed_info' && isSuperAdmin && (
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleStatusChange(detail.id, 'registered', 'status_changed')}><Send className="h-4 w-4" /> ثبت</Button>
                    )}
                    {detail.status === 'registered' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(detail.id, 'approved', 'approved')}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                    )}
                    {detail.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(detail.id, 'cleared', 'cleared')}><Globe className="h-4 w-4" /> ترخیص</Button>
                    )}
                    {isSuperAdmin && detail.status !== 'voided' && detail.status !== 'finalized' && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setVoidDialog({ id: detail.id, reason: '' })}><Ban className="h-4 w-4" /> باطل کردن</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidDialog} onOpenChange={(o) => !o && setVoidDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>باطل کردن اظهارنامه</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">دلیل ابطال</Label>
            <Textarea value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل..." className="rounded-[10px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleVoid}>باطل کردن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه اظهارنامه</DialogTitle></DialogHeader>
          {detailHistory.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">تاریخچه‌ای ثبت نشده است</p> : (
            <div className="space-y-2">
              {detailHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500"><FileText className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{ACTION_LABEL[h.action] || h.action}</span>
                      <span className="text-xs text-slate-400">{relativeTime(h.actionAt)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      توسط {staffName(h.actionBy)}
                      {h.fromStatus && h.toStatus && <span> • {CD_STATUS[h.fromStatus] || h.fromStatus} ← {CD_STATUS[h.toStatus] || h.toStatus}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Link href="/dashboard/customs-declarations/new" className="nb-fab" aria-label="ثبت اظهارنامه">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
