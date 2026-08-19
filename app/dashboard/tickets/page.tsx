'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Plus, MessageSquare, Clock, User } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { TICKET_STATUSES, fullName, TASK_PRIORITIES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Ticket, Customer, Profile } from '@/lib/types';

const statusInfo = (key: string) => TICKET_STATUSES.find((s) => s.key === key) || TICKET_STATUSES[0];
const priorityInfo = (key: string) => TASK_PRIORITIES.find((p) => p.key === key) || TASK_PRIORITIES[0];

export default function TicketsPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', customer_id: '', priority: 'medium' });
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ subject: '', description: '', priority: 'medium', status: '' });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [ticketData, custData, staffData] = await Promise.all([
        fetchData('tickets', { where: {}, orderBy: { createdAt: 'desc' } }),
        fetchData('customers', { where: {} }),
        fetchData('profiles', { where: { userType: 'staff' } }),
      ]);
      setTickets((ticketData as Ticket[]) || []);
      setCustomers((custData as Customer[]) || []);
      setStaff((staffData as Profile[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری تیکت‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.subject) { toast.error('موضوع تیکت را وارد کنید'); return; }
    setCreating(true);
    try {
      await createData('tickets', {
        subject: form.subject,
        description: form.description || null,
        customerId: form.customer_id || null,
        priority: form.priority,
        status: 'open',
        createdBy: profile.id,
      });
      toast.success('تیکت ثبت شد');
      setDialogOpen(false);
      setForm({ subject: '', description: '', customer_id: '', priority: 'medium' });
      loadData();
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateData('tickets', { id }, { status });
      loadData();
    } catch (error: any) {
      toast.error('تغییر وضعیت ناموفق: ' + error.message);
    }
  };

  const getCustomer = (id: string | null) => {
    if (!id) return null;
    const c = customers.find((c) => c.id === id);
    return c ? (c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)) : null;
  };

  const openView = (t: Ticket) => {
    setViewTicket(t);
    setViewDialogOpen(true);
  };

  const openEdit = (t: Ticket) => {
    setEditTicket(t);
    setEditForm({ subject: t.subject, description: t.description || '', priority: t.priority, status: t.status });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTicket) return;
    try {
      await updateData('tickets', { id: editTicket.id }, {
        subject: editForm.subject,
        description: editForm.description || null,
        priority: editForm.priority,
        status: editForm.status,
      });
      toast.success('تیکت ویرایش شد');
      setEditDialogOpen(false);
      setEditTicket(null);
      loadData();
    } catch (e: any) {
      toast.error('ویرایش ناموفق: ' + e.message);
    }
  };

  const handleDelete = async (t: Ticket) => {
    if (!confirm(`حذف تیکت «${t.subject}»؟`)) return;
    try {
      await deleteData('tickets', { id: t.id });
      toast.success('تیکت حذف شد');
      loadData();
    } catch (e: any) {
      toast.error('حذف ناموفق: ' + e.message);
    }
  };

  const filtered = search
    ? tickets.filter((t) => {
        const q = search.toLowerCase();
        return (t.subject || '').toLowerCase().includes(q) ||
          (getCustomer(t.customerId) || '').toLowerCase().includes(q);
      })
    : tickets;

  const columns = TICKET_STATUSES.map((s) => ({
    ...s,
    items: filtered.filter((t) => t.status === s.key),
  }));

  return (
    <div>
      <PageHeader
        title="تیکت‌های پشتیبانی"
        description="مدیریت تیکت‌ها و درخواست‌های پشتیبانی"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> تیکت جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>ثبت تیکت جدید</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>موضوع *</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>توضیحات</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>مشتری</Label>
                    <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>اولویت</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال ثبت...' : 'ثبت تیکت'}</Button>
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
            placeholder="جستجوی تیکت..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{tickets.length.toLocaleString('fa-IR')}</span>
          <span>تیکت</span>
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
                  <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground/60">موردی وجود ندارد</p>
                </div>
              )}
              {col.items.map((t) => {
                const st = statusInfo(t.status);
                const pi = priorityInfo(t.priority);
                const cust = getCustomer(t.customerId);
                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-500/30 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: st.color + '15', color: st.color }}
                      >
                        {st.label}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: pi.color + '15', color: pi.color }}
                      >
                        {pi.label}
                      </span>
                    </div>
                    <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">{t.subject}</p>
                    {t.description && (
                      <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">{t.description}</p>
                    )}
                    <div className="mb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                      {cust && <span className="flex items-center gap-1"><User className="h-3 w-3" />{cust}</span>}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{relativeTime(t.createdAt)}</span>
                    </div>
                    <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                      <SelectTrigger className="h-7 w-full text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {isSuperAdmin && (
                      <div className="flex items-center justify-end pt-2 mt-2 border-t border-slate-100">
                        <SuperAdminActions
                          onView={() => openView(t)}
                          onEdit={() => openEdit(t)}
                          onDelete={() => handleDelete(t)}
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
          <DialogHeader><DialogTitle>مشاهده تیکت</DialogTitle></DialogHeader>
          {viewTicket && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900">{viewTicket.subject}</div>
                <Badge style={{ backgroundColor: statusInfo(viewTicket.status).color + '20', color: statusInfo(viewTicket.status).color }}>{statusInfo(viewTicket.status).label}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: priorityInfo(viewTicket.priority).color + '15', color: priorityInfo(viewTicket.priority).color }}>{priorityInfo(viewTicket.priority).label}</Badge>
                {getCustomer(viewTicket.customerId) && <span className="text-sm text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{getCustomer(viewTicket.customerId)}</span>}
              </div>
              {viewTicket.description && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">توضیحات:</span>
                  {viewTicket.description}
                </div>
              )}
              <div className="text-xs text-slate-400">ایجاد شده: {relativeTime(viewTicket.createdAt)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ویرایش تیکت</DialogTitle></DialogHeader>
          {editTicket && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>موضوع</Label>
                <Input value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>اولویت</Label>
                  <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>وضعیت</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
