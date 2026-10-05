'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Plus, FileText, Search, X, Eye, Edit, Trash2, Clock, LayoutGrid, List, Loader2, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { formatToman, formatJalali, toLocalDateString, relativeTime } from '@/lib/format';
import { INVOICE_STATUSES, fullName, tomanShort } from '@/lib/constants';
import { toast } from 'sonner';

const statusInfo = (key: string) => INVOICE_STATUSES.find((s) => s.key === key) || INVOICE_STATUSES[0];

export default function InvoicesPage() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ amount: '', dueDate: '', notes: '', status: '' });
  const [filterStatus, setFilterStatus] = useState('all');

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [inv, cust, ords] = await Promise.all([
      fetchData('invoices', { where: {}, orderBy: { createdAt: 'desc' } }),
      fetchData('customers', { where: {} }),
      fetchData('orders', { where: {} }),
    ]);
    setInvoices(inv || []);
    setCustomers(cust || []);
    setOrders(ords || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'paid') {
      const inv = invoices.find((i) => i.id === id);
      if (inv) updates.paid = inv.amount;
    }
    await updateData('invoices', { id }, updates);
    loadData();
  };

  const getCustomerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find((c) => c.id === id);
    return c ? (c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)) : '—';
  };

  const openView = (inv: any) => { setViewInvoice(inv); setViewDialogOpen(true); };

  const openEdit = (inv: any) => {
    setEditInvoice(inv);
    setEditForm({
      amount: String(Number(inv.amount)),
      dueDate: inv.dueDate ? toLocalDateString(new Date(inv.dueDate)) : '',
      notes: inv.notes || '',
      status: inv.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editInvoice) return;
    try {
      await updateData('invoices', { id: editInvoice.id }, {
        amount: Number(editForm.amount.replace(/[^0-9]/g, '')) || 0,
        dueDate: editForm.dueDate || null,
        notes: editForm.notes || null,
        status: editForm.status,
      });
      toast.success('فاکتور ویرایش شد');
      setEditDialogOpen(false);
      setEditInvoice(null);
      loadData();
    } catch (e: any) {
      toast.error('ویرایش ناموفق: ' + e.message);
    }
  };

  const handleDelete = async (inv: any) => {
    if (!confirm(`حذف فاکتور «${inv.number}»؟`)) return;
    try {
      await deleteData('invoices', { id: inv.id });
      toast.success('فاکتور حذف شد');
      loadData();
    } catch (e: any) {
      toast.error('حذف ناموفق: ' + e.message);
    }
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (inv.number || '').toLowerCase().includes(q) || getCustomerName(inv.customerId).toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      label: 'کل فاکتورها', value: invoices.length, icon: FileText,
      filter: 'all',
      gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
      glow: 'rgba(37,99,235,0.25)',
    },
    {
      label: 'پرداخت شده', value: invoices.filter((i) => i.status === 'paid').length, icon: CheckCircle2,
      filter: 'paid',
      gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      glow: 'rgba(34,197,94,0.25)',
    },
    {
      label: 'پرداخت نشده', value: invoices.filter((i) => i.status === 'unpaid').length, icon: XCircle,
      filter: 'unpaid',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glow: 'rgba(239,68,68,0.25)',
    },
    {
      label: 'در انتظار', value: invoices.filter((i) => i.status === 'pending' || i.status === 'partial').length, icon: Clock3,
      filter: 'pending',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      glow: 'rgba(245,158,11,0.25)',
    },
  ];

  const columns = INVOICE_STATUSES.map((s) => ({
    ...s,
    items: filtered.filter((inv) => inv.status === s.key),
  }));

  if (loading) {
    return (
      <div className="nb-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری فاکتورها...</p>
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
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#16A34A,#22C55E)', boxShadow: '0 0 12px rgba(34,197,94,.25)' }} />
              <h1>فاکتورها</h1>
            </div>
            <p>مدیریت فاکتورها و پرداخت‌ها</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/invoices/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            فاکتور جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {stats.map((stat) => (
          <button
            type="button"
            className={`nb-stat-card-v2 ${filterStatus === stat.filter ? 'is-active' : ''}`}
            key={stat.label}
            onClick={() => setFilterStatus(filterStatus === stat.filter ? 'all' : stat.filter)}
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
          <h2>همه فاکتورها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی فاکتور..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="nb-view-toggle">
            <button className={viewMode === 'board' ? 'is-active' : ''} onClick={() => setViewMode('board')} aria-label="تخته‌ای"><LayoutGrid className="h-4 w-4" /></button>
            <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="لیستی"><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><FileText className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>فاکتوری ثبت نشده</h3>
          <p>فاکتورهای صادر شده در اینجا نمایش داده می‌شوند</p>
          <Link href="/dashboard/invoices/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> ایجاد فاکتور</Link>
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
                {col.items.map((inv) => {
                  const st = statusInfo(inv.status);
                  return (
                    <div key={inv.id} className="nb-card" style={{ borderBottomColor: st.color, borderBottomWidth: 3 }} onClick={() => openView(inv)}>
                      <div className="nb-card-top">
                        <span className="text-xs font-mono text-slate-400">{inv.number}</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{tomanShort(Number(inv.amount))}</span>
                      </div>
                      <p className="nb-card-excerpt">{getCustomerName(inv.customerId)}</p>
                      <div className="nb-card-footer">
                        <div className="nb-card-date"><Clock className="h-3 w-3" />{relativeTime(inv.createdAt)}</div>
                        <div className="nb-card-quick">
                          {inv.dueDate && <span className="text-[11px] text-slate-400">{formatJalali(inv.dueDate)}</span>}
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <div className="flex items-center gap-1 border-t border-slate-100 pt-2 dark:border-slate-700">
                          <button onClick={(e) => { e.stopPropagation(); openView(inv); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); openEdit(inv); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700" title="ویرایش"><Edit className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(inv); }} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-3.5 w-3.5" /></button>
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
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مبلغ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">پرداخت شده</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">سررسید</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                  {isSuperAdmin && <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((inv) => {
                  const st = statusInfo(inv.status);
                  return (
                    <tr key={inv.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50" onClick={() => openView(inv)}>
                      <td className="p-3"><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{inv.number}</span></td>
                      <td className="p-3 text-sm text-slate-700 dark:text-slate-200">{getCustomerName(inv.customerId)}</td>
                      <td className="p-3"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{tomanShort(Number(inv.amount))}</span></td>
                      <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{tomanShort(Number(inv.paid))}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{inv.dueDate ? formatJalali(inv.dueDate) : '—'}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <Select value={inv.status} onValueChange={(v) => updateStatus(inv.id, v)}>
                          <SelectTrigger className="h-8 text-xs" style={{ color: st.color }}><SelectValue /></SelectTrigger>
                          <SelectContent>{INVOICE_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      {isSuperAdmin && (
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button onClick={() => openView(inv)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => openEdit(inv)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700" title="ویرایش"><Edit className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(inv)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-4 w-4" /></button>
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

      <Link href="/dashboard/invoices/new" className="nb-fab" aria-label="فاکتور جدید"><Plus className="h-6 w-6" /></Link>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده فاکتور</DialogTitle></DialogHeader>
          {viewInvoice && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 dark:text-slate-100">{viewInvoice.number}</div>
                <Badge style={{ backgroundColor: statusInfo(viewInvoice.status).color + '20', color: statusInfo(viewInvoice.status).color }}>{statusInfo(viewInvoice.status).label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">مشتری:</span> <span className="font-medium">{getCustomerName(viewInvoice.customerId)}</span></div>
                <div><span className="text-slate-400">مبلغ:</span> <span className="font-bold">{formatToman(Number(viewInvoice.amount))} ت</span></div>
                <div><span className="text-slate-400">پرداخت شده:</span> <span className="font-medium">{formatToman(Number(viewInvoice.paid))} ت</span></div>
                {viewInvoice.dueDate && <div><span className="text-slate-400">سررسید:</span> <span className="font-medium">{toLocalDateString(new Date(viewInvoice.dueDate))}</span></div>}
              </div>
              {viewInvoice.notes && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"><span className="text-slate-400 block mb-1">توضیحات:</span>{viewInvoice.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ویرایش فاکتور</DialogTitle></DialogHeader>
          {editInvoice && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">فاکتور: <span className="font-bold text-slate-900 dark:text-slate-100">{editInvoice.number}</span></div>
              <div className="space-y-2"><Label>مبلغ (ت)</Label><Input dir="ltr" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} /></div>
              <div className="space-y-2"><Label>سررسید</Label><JalaliDatePicker value={editForm.dueDate ? new Date(editForm.dueDate) : null} onChange={(d) => setEditForm({ ...editForm, dueDate: d ? toLocalDateString(d) : '' })} /></div>
              <div className="space-y-2"><Label>وضعیت</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INVOICE_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>توضیحات</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button><Button onClick={handleEditSave}>ذخیره</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
