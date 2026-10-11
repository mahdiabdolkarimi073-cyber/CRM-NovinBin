'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileOutput, Plus, Search, Trash2, Calendar, Eye, Clock,
  CheckCircle, XCircle, X, FileText, LayoutGrid, List, Loader2,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import { fullName, tomanShort } from '@/lib/constants';
import { toast } from 'sonner';
import type { PreInvoice, PreInvoiceItem, Customer, Profile } from '@/lib/types';

const PI_STATUS: Record<string, string> = {
  draft: 'پیش‌نویس',
  sent: 'ارسال شده',
  confirmed: 'تأیید شده',
  rejected: 'رد شده',
  expired: 'منقضی شده',
};

const PI_STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  sent: '#3155E7',
  confirmed: '#10b981',
  rejected: '#ef4444',
  expired: '#f59e0b',
};

const PI_STATUSES = [
  { key: 'draft', label: 'پیش‌نویس', color: '#94a3b8' },
  { key: 'sent', label: 'ارسال شده', color: '#3155E7' },
  { key: 'confirmed', label: 'تأیید شده', color: '#10b981' },
  { key: 'rejected', label: 'رد شده', color: '#ef4444' },
  { key: 'expired', label: 'منقضی شده', color: '#f59e0b' },
];

const statusInfo = (key: string) => PI_STATUSES.find((s) => s.key === key) || PI_STATUSES[0];

export default function PreInvoicesSalesPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<PreInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [detail, setDetail] = useState<PreInvoice | null>(null);
  const [detailItems, setDetailItems] = useState<PreInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [piData, custData, staffData] = await Promise.all([
        fetchData<PreInvoice>('pre_invoices', {
          where: { type: 'sales' },
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        }),
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setRecords(piData || []);
      setCustomers(custData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری پیش‌فاکتورها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const customerName = (id: string | null | undefined) => {
    if (!id) return '—';
    const c = customers.find((c) => c.id === id);
    return c ? (c.companyName || fullName(c.firstName, c.lastName)) : '—';
  };

  const staffNameById = (id: string | null | undefined) => {
    if (!id) return '—';
    const s = staff.find((p) => p.id === id);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return records.filter((r) => {
      const matches = !q || r.number?.toLocaleLowerCase().includes(q) || r.supplierName?.toLocaleLowerCase().includes(q) || customerName(r.customerId).toLocaleLowerCase().includes(q);
      const st = filterStatus === 'all' || r.status === filterStatus;
      return matches && st;
    });
  }, [records, search, filterStatus, customers]);

  const stats = useMemo(() => [
    {
      label: 'کل پیش‌فاکتورها', value: records.length, icon: FileOutput,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'در انتظار', value: records.filter((r) => r.status === 'draft').length, icon: Clock,
      filter: 'draft',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
    {
      label: 'تأیید / ارسال شده', value: records.filter((r) => r.status === 'confirmed' || r.status === 'sent').length, icon: CheckCircle,
      filter: 'confirmed',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'رد شده', value: records.filter((r) => r.status === 'rejected').length, icon: XCircle,
      filter: 'rejected',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
  ], [records]);

  const columns = PI_STATUSES.map((s) => ({
    ...s,
    items: filtered.filter((r) => r.status === s.key),
  }));

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این پیش‌فاکتور؟')) return;
    try {
      await deleteData('pre_invoices', { id });
      toast.success('پیش‌فاکتور حذف شد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!profile) return;
    try {
      await updateData('pre_invoices', { id }, { status: newStatus });
      toast.success('وضعیت تغییر کرد');
      setDetail(null);
      loadData();
    } catch (error: any) {
      toast.error('عملیات ناموفق: ' + error.message);
    }
  };

  const handleStatClick = (f: string) => {
    setFilterStatus(filterStatus === f ? 'all' : f);
  };

  const loadDetail = (r: PreInvoice) => {
    setDetail(r);
    setDetailItems(r.items || []);
  };

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری پیش‌فاکتورها...</p>
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
              <h1>پیش فاکتور فروش</h1>
            </div>
            <p>مدیریت پیش‌فاکتورهای فروش</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/pre-invoices-sales/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            ثبت پیش‌فاکتور
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
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </button>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه پیش‌فاکتورها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی پیش‌فاکتور..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="nb-select-filter h-10 w-[150px]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {PI_STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><FileOutput className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>پیش‌فاکتوری یافت نشد</h3>
          <p>اولین پیش‌فاکتور فروش را ثبت کنید</p>
          <Link href="/dashboard/pre-invoices-sales/new" className="nb-empty-new-btn">
            <Plus className="h-4 w-4" />
            ایجاد پیش‌فاکتور
          </Link>
        </div>
      ) : viewMode === 'board' ? (
        <div className="grid grid-cols-1 gap-3 mobile:gap-4 tablet:grid-cols-2 desktop:grid-cols-4 pb-4">
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center justify-between border-b-[3px] px-4 py-3" style={{ borderColor: col.color }}>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{col.label}</span>
                </div>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md bg-slate-100 px-1.5 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">{col.items.length.toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                {col.items.length === 0 && <div className="flex flex-col items-center gap-2 py-8 text-center"><FileText className="h-5 w-5 text-slate-300" /><p className="text-xs text-slate-400">موردی وجود ندارد</p></div>}
                {col.items.map((r) => {
                  const stColor = PI_STATUS_COLOR[r.status] || '#64748b';
                  return (
                    <div key={r.id} className="nb-card" style={{ borderBottomColor: stColor, borderBottomWidth: 3 }} onClick={() => loadDetail(r)}>
                      <div className="nb-card-top">
                        <span className="text-xs font-mono text-slate-400">{r.number}</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{tomanShort(Number(r.finalAmount))}</span>
                      </div>
                      <p className="nb-card-excerpt">{customerName(r.customerId)}</p>
                      <div className="nb-card-footer">
                        <div className="nb-card-date"><Clock className="h-3 w-3" />{relativeTime(r.createdAt)}</div>
                        {r.issueDate && <span className="text-[11px] text-slate-400">{formatJalali(r.issueDate)}</span>}
                      </div>
                      {isSuperAdmin && (
                        <div className="flex items-center gap-1 border-t border-slate-100 pt-2 dark:border-slate-700">
                          <button onClick={(e) => { e.stopPropagation(); loadDetail(r); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شماره</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مشتری</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">فروشنده</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ صدور</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مبلغ نهایی</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  {isSuperAdmin && <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((r) => {
                  const stColor = PI_STATUS_COLOR[r.status] || '#64748b';
                  return (
                    <tr key={r.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => loadDetail(r)}>
                      <td className="p-3"><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.number}</span></td>
                      <td className="p-3 text-sm text-slate-700 dark:text-slate-200">{customerName(r.customerId)}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{r.seller || '—'}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalali(r.issueDate)}</td>
                      <td className="p-3"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToman(Number(r.finalAmount))} ت</span></td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${stColor}15`, color: stColor }}>
                          {PI_STATUS[r.status] || r.status}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button onClick={() => loadDetail(r)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link href="/dashboard/pre-invoices-sales/new" className="nb-fab" aria-label="پیش‌فاکتور جدید">
        <Plus className="h-6 w-6" />
      </Link>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && (() => {
            const stColor = PI_STATUS_COLOR[detail.status] || '#64748b';
            return (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-lg">پیش‌فاکتور {detail.number}</DialogTitle>
                    {isSuperAdmin && <Button size="sm" variant="ghost" className="h-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(detail.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${stColor}20`, color: stColor }}>{PI_STATUS[detail.status] || detail.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">شماره</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{detail.number}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">مشتری</div><div className="mt-1 text-sm font-bold text-[#344054]">{customerName(detail.customerId)}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">فروشنده</div><div className="mt-1 text-sm font-bold text-[#344054]">{detail.seller || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">تاریخ صدور</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{formatJalali(detail.issueDate)}</div></div>
                    {detail.expiryDate && <div className="rounded-[10px] bg-amber-50 p-3"><div className="text-xs text-[#667085]">تاریخ انقضا</div><div className="mt-1 text-sm font-bold text-amber-600">{formatJalali(detail.expiryDate)}</div></div>}
                    <div className="rounded-[10px] bg-blue-50 p-3"><div className="text-xs text-[#667085]">مبلغ نهایی</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(Number(detail.finalAmount))}</div></div>
                  </div>
                  {detail.notes && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"><p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detail.notes}</p></div>}

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">اقلام ({detailItems.length})</h3>
                    {detailItems.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">قلمی ثبت نشده است</p> : (
                      <div className="space-y-1.5">
                        {detailItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700 dark:text-slate-200">{item.productName || '—'}</div>
                              <div className="mt-0.5 flex gap-3 text-slate-400">
                                <span>{formatToman(Number(item.qty))} {item.unit || ''}</span>
                                <span>قیمت واحد: {formatToman(Number(item.unitPrice))}</span>
                                <span>مبلغ نهایی: {formatToman(Number(item.finalPrice))}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {detail.status === 'draft' && isSuperAdmin && (
                      <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleStatusChange(detail.id, 'sent')}><FileOutput className="h-4 w-4" /> ارسال به مشتری</Button>
                    )}
                    {detail.status === 'sent' && isSuperAdmin && (
                      <Button variant="outline" className="border-green-200 text-green-600 hover:bg-green-50" onClick={() => handleStatusChange(detail.id, 'confirmed')}><CheckCircle className="h-4 w-4" /> تأیید</Button>
                    )}
                    {detail.status === 'sent' && isSuperAdmin && (
                      <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleStatusChange(detail.id, 'rejected')}><XCircle className="h-4 w-4" /> رد</Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
