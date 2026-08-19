'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Plus, FileText } from 'lucide-react';
import { formatToman, toLocalDateString } from '@/lib/format';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ customerId: '', orderId: '', amount: '', dueDate: '', notes: '' });
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ amount: '', dueDate: '', notes: '', status: '' });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.customerId || !form.amount) { toast.error('مشتری و مبلغ را وارد کنید'); return; }
    setCreating(true);
    const invNum = 'INV-' + Date.now().toString().slice(-6);
    try {
      await createData('invoices', {
        number: invNum,
        customerId: form.customerId,
        orderId: form.orderId || null,
        amount: Number(form.amount.replace(/[^0-9]/g, '')) || 0,
        paid: 0,
        status: 'unpaid',
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        createdBy: profile.id,
      });
      toast.success('فاکتور صادر شد');
      setDialogOpen(false);
      setForm({ customerId: '', orderId: '', amount: '', dueDate: '', notes: '' });
      loadData();
    } catch (e: any) {
      toast.error('ایجاد ناموفق: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

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

  const openView = (inv: any) => {
    setViewInvoice(inv);
    setViewDialogOpen(true);
  };

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

  const filtered = search
    ? invoices.filter((inv) => {
        const q = search.toLowerCase();
        return (inv.number || '').toLowerCase().includes(q) ||
          getCustomerName(inv.customerId).toLowerCase().includes(q);
      })
    : invoices;

  const columns = INVOICE_STATUSES.map((s) => ({
    ...s,
    items: filtered.filter((inv) => inv.status === s.key),
  }));

  return (
    <div>
      <PageHeader
        title="فاکتورها"
        description="مدیریت فاکتورها و پرداخت‌ها"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> فاکتور جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>صدور فاکتور جدید</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>مشتری *</Label>
                  <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                    <SelectTrigger><SelectValue placeholder="انتخاب مشتری..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>سفارش مرتبط</Label>
                  <Select value={form.orderId} onValueChange={(v) => setForm({ ...form, orderId: v })}>
                    <SelectTrigger><SelectValue placeholder="بدون سفارش" /></SelectTrigger>
                    <SelectContent>
                      {orders.map((o) => <SelectItem key={o.id} value={o.id}>{o.number || o.id.slice(0, 8)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>مبلغ (ت) *</Label>
                    <Input dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label>سررسید</Label>
                    <JalaliDatePicker value={form.dueDate ? new Date(form.dueDate) : null} onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>توضیحات</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال صدور...' : 'صدور فاکتور'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-border bg-muted/40 px-3.5 transition-all focus-within:border-sky-500 focus-within:bg-card min-w-[240px]">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="جستجوی فاکتور..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{invoices.length.toLocaleString('fa-IR')}</span>
          <span>فاکتور</span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.key} className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-border bg-muted/30">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-bold text-foreground">{col.label}</span>
              </div>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md bg-muted px-1.5 text-xs font-bold text-muted-foreground">
                {col.items.length.toLocaleString('fa-IR')}
              </span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 340px)' }}>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                </div>
              )}
              {!loading && col.items.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <FileText className="h-5 w-5 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground/60">موردی وجود ندارد</p>
                </div>
              )}
              {col.items.map((inv) => {
                const st = statusInfo(inv.status);
                return (
                  <div
                    key={inv.id}
                    className="rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-500/30 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{inv.number}</span>
                      <span className="text-xs font-bold text-foreground">{tomanShort(Number(inv.amount))}</span>
                    </div>
                    <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">{getCustomerName(inv.customerId)}</p>
                    <div className="flex items-center justify-between mb-2">
                      <Select value={inv.status} onValueChange={(v) => updateStatus(inv.id, v)}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INVOICE_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: st.color + '15', color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                        <SuperAdminActions
                          onView={() => openView(inv)}
                          onEdit={() => openEdit(inv)}
                          onDelete={() => handleDelete(inv)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده فاکتور</DialogTitle></DialogHeader>
          {viewInvoice && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900">{viewInvoice.number}</div>
                <Badge style={{ backgroundColor: statusInfo(viewInvoice.status).color + '20', color: statusInfo(viewInvoice.status).color }}>{statusInfo(viewInvoice.status).label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">مشتری:</span> <span className="font-medium">{getCustomerName(viewInvoice.customerId)}</span></div>
                <div><span className="text-slate-400">مبلغ:</span> <span className="font-bold">{formatToman(Number(viewInvoice.amount))} ت</span></div>
                <div><span className="text-slate-400">پرداخت شده:</span> <span className="font-medium">{formatToman(Number(viewInvoice.paid))} ت</span></div>
                {viewInvoice.dueDate && <div><span className="text-slate-400">سررسید:</span> <span className="font-medium">{toLocalDateString(new Date(viewInvoice.dueDate))}</span></div>}
              </div>
              {viewInvoice.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">توضیحات:</span>
                  {viewInvoice.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ویرایش فاکتور</DialogTitle></DialogHeader>
          {editInvoice && (
            <div className="space-y-4">
              <div className="text-sm text-slate-500">فاکتور: <span className="font-bold text-slate-900">{editInvoice.number}</span></div>
              <div className="space-y-2">
                <Label>مبلغ (ت)</Label>
                <Input dir="ltr" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>سررسید</Label>
                <JalaliDatePicker value={editForm.dueDate ? new Date(editForm.dueDate) : null} onChange={(d) => setEditForm({ ...editForm, dueDate: d ? toLocalDateString(d) : '' })} />
              </div>
              <div className="space-y-2">
                <Label>وضعیت</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
                <Button onClick={handleEditSave}>ذخیره</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
