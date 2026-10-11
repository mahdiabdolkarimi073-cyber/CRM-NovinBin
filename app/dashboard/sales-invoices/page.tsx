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
  FileText, Plus, Search, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, Clock, Eye, Ban, Send, User, TrendingUp, Package,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  SalesInvoice, SalesInvoiceItem, SalesInvoiceHistory,
  Customer, ProcessAgent, Warehouse, Profile,
} from '@/lib/types';

const SI_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  completed: 'تکمیل شده',
  pending_approval: 'در انتظار تأیید',
  approved: 'تأیید شده',
  finalized: 'نهایی شده',
  needs_correction: 'نیازمند اصلاح',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
  voided: 'باطل شده',
  returned: 'مرجوع شده',
  amended: 'اصلاحی',
};

const SI_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  completed: '#f59e0b',
  pending_approval: '#a855f7',
  approved: '#10b981',
  finalized: '#6366f1',
  needs_correction: '#f97316',
  rejected: '#ef4444',
  cancelled: '#64748b',
  voided: '#dc2626',
  returned: '#0ea5e9',
  amended: '#8b5cf6',
};

const SALE_TYPE: Record<string, string> = {
  cash: 'نقدی',
  credit: 'اعتباری',
  installment: 'قسطی',
  mixed: 'ترکیبی',
};

const ACTION_LABEL: Record<string, string> = {
  created: 'ایجاد شد',
  edited: 'ویرایش شد',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  finalized: 'نهایی شد',
  inventory_reserved: 'رزرو موجودی',
  goods_exited: 'خروج کالا',
  payment_received: 'دریافت وجه',
  commission_calculated: 'محاسبه پورسانت',
  journal_issued: 'ثبت سند',
  amended: 'اصلاح شد',
  returned: 'مرجوع شد',
  voided: 'باطل شد',
  status_changed: 'تغییر وضعیت',
};

export default function SalesInvoicesPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<SalesInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<ProcessAgent[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<SalesInvoice | null>(null);
  const [detailItems, setDetailItems] = useState<SalesInvoiceItem[]>([]);
  const [detailHistory, setDetailHistory] = useState<SalesInvoiceHistory[]>([]);
  const [historyDialog, setHistoryDialog] = useState<SalesInvoice | null>(null);
  const [voidDialog, setVoidDialog] = useState<{ id: string; reason: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [siData, custData, agentData, whData, staffData] = await Promise.all([
        fetchData<SalesInvoice>('sales_invoices', {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            history: { orderBy: { actionAt: 'desc' } },
          },
        }),
        fetchData<Customer>('customers', { where: {} }),
        fetchData<ProcessAgent>('process_agents', { where: {} }),
        fetchData<Warehouse>('warehouses', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRecords(siData || []);
      setCustomers(custData || []);
      setAgents(agentData || []);
      setWarehouses(whData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری فاکتورها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const staffName = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const customerName = (id: string | null | undefined, name?: string | null) => {
    if (name) return name;
    if (!id) return '—';
    const c = customers.find((c) => c.id === id);
    return c ? [c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ') : '—';
  };

  const warehouseName = (id: string | null | undefined) => {
    if (!id) return '—';
    const w = warehouses.find((w) => w.id === id);
    return w ? w.name : '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return records.filter((r) => {
      const matches = !q || r.internalNumber?.toLocaleLowerCase().includes(q) || r.invoiceNumber?.toLocaleLowerCase().includes(q) || r.customerName?.toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: records.length,
    pending: records.filter((r) => r.status === 'draft' || r.status === 'completed').length,
    finalized: records.filter((r) => r.status === 'finalized').length,
    totalValue: records.filter((r) => r.status !== 'voided').reduce((sum, r) => sum + Number(r.finalAmount || 0), 0),
  }), [records]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این فاکتور؟')) return;
    try {
      await deleteData('sales_invoices', { id });
      toast.success('فاکتور حذف شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, action: string) => {
    if (!profile) return;
    try {
      await updateData('sales_invoices', { id }, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      await createData('sales_invoice_history', {
        invoiceId: id,
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
      await updateData('sales_invoices', { id: voidDialog.id }, {
        status: 'voided',
        voidedBy: profile.id,
        voidedAt: new Date().toISOString(),
        voidReason: voidDialog.reason || null,
        updatedAt: new Date().toISOString(),
      });
      await createData('sales_invoice_history', {
        invoiceId: voidDialog.id,
        action: 'voided',
        actionBy: profile.id,
        actionAt: new Date().toISOString(),
        fromStatus: records.find((r) => r.id === voidDialog.id)?.status || null,
        toStatus: 'voided',
        reason: voidDialog.reason || null,
        details: {},
      });
      toast.success('فاکتور باطل شد');
      setVoidDialog(null);
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const loadDetail = (si: SalesInvoice) => {
    setDetail(si);
    setDetailItems(si.items || []);
    setDetailHistory(si.history || []);
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">فاکتور فروش</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> فاکتور فروش</div>
        </div>
        <Link href="/dashboard/sales-invoices/new">
          <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
            <Plus className="h-4 w-4" /> ثبت فاکتور
          </Button>
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><FileText className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل فاکتورها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Clock className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.pending.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">در انتظار</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><CheckCircle className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.finalized.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">نهایی شده</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#6366f1]/10 text-[#6366f1]"><TrendingUp className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[20px] font-bold leading-none text-[#101828]">{formatToman(stats.totalValue)}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">ارزش کل (تومان)</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجو بر اساس شماره یا مشتری..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
          <option value="all">همه وضعیت‌ها</option>
          {Object.entries(SI_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : records.length === 0 ? (
        <Card><EmptyState icon={<FileText className="h-8 w-8" />} title="فاکتوری یافت نشد" description="برای شروع، اولین فاکتور فروش را ثبت کنید" action={<Link href="/dashboard/sales-invoices/new"><Button><Plus className="h-4 w-4" /> افزودن فاکتور</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {pageItems.map((r) => {
              const stColor = SI_STATUS_COLOR[r.status] || '#64748b';
              return (
                <div key={r.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]" onClick={() => loadDetail(r)}>
                  <div className="h-10 w-2 rounded-full" style={{ backgroundColor: stColor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{r.internalNumber}</div>
                      {r.invoiceNumber && <div className="truncate text-xs text-[#667085]">({r.invoiceNumber})</div>}
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: stColor, borderColor: `${stColor}35`, backgroundColor: `${stColor}10` }}>{SI_STATUS[r.status]}</Badge>
                      <Badge variant="outline" className="shrink-0 text-[10px] text-[#667085]">{SALE_TYPE[r.saleType] || r.saleType}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{customerName(r.customerId, r.customerName)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(r.saleDate)}</span>
                      <span>{formatToman(Number(r.finalAmount))} تومان</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); loadDetail(r); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-[#EFF4FF] hover:text-[#2563EB]"><Eye className="h-4 w-4" /></button>
                  {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              );
            })}
            {pageItems.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-3">
              <span className="text-xs text-[#667085]">صفحه {currentPage.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={currentPage === pages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3EE] text-[#667085] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </CardContent></Card>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (() => {
            const stColor = SI_STATUS_COLOR[detail.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">فاکتور {detail.internalNumber}</DialogTitle>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 shrink-0 text-slate-500 hover:bg-slate-50" onClick={() => setHistoryDialog(detail)}><FileText className="h-4 w-4" /> تاریخچه</Button>
                      {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{SI_STATUS[detail.status]}</Badge>
                    <Badge variant="outline" className="text-[#667085]">{SALE_TYPE[detail.saleType] || detail.saleType}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">شماره داخلی</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{detail.internalNumber}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">شماره فاکتور</div><div className="mt-1 text-sm font-bold text-[#344054]">{detail.invoiceNumber || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">مشتری</div><div className="mt-1 text-sm font-bold text-[#344054]">{customerName(detail.customerId, detail.customerName)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">عامل</div><div className="mt-1 text-sm font-bold text-[#344054]">{detail.agentName || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ فروش</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatJalali(detail.saleDate)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">انبار</div><div className="mt-1 text-sm font-bold text-[#344054]">{warehouseName(detail.warehouseId)}</div></div>
                    <div className="rounded-[10px] bg-blue-50 p-3"><div className="text-xs text-[#667085]">مبلغ نهایی</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(Number(detail.finalAmount))}</div></div>
                    <div className="rounded-[10px] bg-green-50 p-3"><div className="text-xs text-[#667085]">پرداخت شده</div><div className="mt-1 text-sm font-bold text-green-700">{formatToman(Number(detail.paidAmount))}</div></div>
                    <div className="rounded-[10px] bg-amber-50 p-3"><div className="text-xs text-[#667085]">مانده</div><div className="mt-1 text-sm font-bold text-amber-700">{formatToman(Number(detail.balanceDue))}</div></div>
                  </div>
                  {detail.description && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.description}</p></div>}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[#1D2939]">اقلام ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">قلمی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700">{item.productName || '—'}</div>
                              <div className="mt-0.5 flex flex-wrap gap-3 text-slate-400">
                                <span>{formatToman(Number(item.qty))} {item.unit || ''}</span>
                                <span>قیمت واحد: {formatToman(Number(item.unitPrice))}</span>
                                {item.discountAmount > 0 && <span>تخفیف: {formatToman(Number(item.discountAmount))}</span>}
                                {item.taxAmount > 0 && <span>مالیات: {formatToman(Number(item.taxAmount))}</span>}
                                <span>مبلغ نهایی: {formatToman(Number(item.finalPrice))}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {detail.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => handleStatusChange(detail.id, 'completed', 'edited')}><CheckCircle className="h-4 w-4" /> تکمیل</Button>
                    )}
                    {detail.status === 'completed' && isSuperAdmin && (
                      <Button variant="outline" className="border-purple-200 text-purple-600 hover:bg-purple-50" onClick={() => handleStatusChange(detail.id, 'pending_approval', 'status_changed')}><Send className="h-4 w-4" /> ارسال برای تأیید</Button>
                    )}
                    {detail.status === 'pending_approval' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(detail.id, 'approved', 'approved')}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                    )}
                    {detail.status === 'approved' && isSuperAdmin && (
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleStatusChange(detail.id, 'finalized', 'finalized')}><Package className="h-4 w-4" /> نهایی‌سازی</Button>
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
          <DialogHeader><DialogTitle>باطل کردن فاکتور</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#344054]">دلیل ابطال</Label>
            <Textarea value={voidDialog?.reason || ''} onChange={(e) => setVoidDialog((d) => d ? { ...d, reason: e.target.value } : null)} placeholder="دلیل..." className="rounded-[10px] border-[#DCE3EE]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(null)}>انصراف</Button>
            <Button variant="destructive" onClick={handleVoid}>باطل کردن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyDialog} onOpenChange={(o) => !o && setHistoryDialog(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>تاریخچه فاکتور</DialogTitle></DialogHeader>
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
                      {h.fromStatus && h.toStatus && <span> • {SI_STATUS[h.fromStatus] || h.fromStatus} ← {SI_STATUS[h.toStatus] || h.toStatus}</span>}
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
