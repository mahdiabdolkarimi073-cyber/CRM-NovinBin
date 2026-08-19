'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Plus, Phone, Mail, Building2, User, Search, Star, ArrowRight, Eye, UserCheck } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { LEAD_STATUSES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Lead } from '@/lib/types';

const statusInfo = (key: string) => LEAD_STATUSES.find((s) => s.key === key) || LEAD_STATUSES[0];

export default function LeadsPage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', source: '', notes: '',
  });

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadLeads = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const where: any = {};
      if (filterStatus !== 'all') where.status = filterStatus;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      const data = await fetchData('leads', { where, orderBy: { createdAt: 'desc' } });
      setLeads((data as Lead[]) || []);
    } catch (error: any) {
      toast.error('بارگذاری سرنخ‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, [profile, filterStatus, search]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !form.name) {
      toast.error('نام سرنخ را وارد کنید');
      return;
    }
    setCreating(true);
    try {
      await createData('leads', {
        name: form.name,
        company: form.company || null,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source || null,
        notes: form.notes || null,
        status: 'new',
        createdBy: profile.id,
      });
      toast.success('سرنخ ایجاد شد');
      setDialogOpen(false);
      setForm({ name: '', company: '', phone: '', email: '', source: '', notes: '' });
      loadLeads();
    } catch (error: any) {
      toast.error('ایجاد سرنخ ناموفق: ' + error.message);
    }
    setCreating(false);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name || '',
      company: lead.company || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source || '',
      notes: lead.notes || '',
    });
    setEditDialogOpen(true);
  };

  const openView = (lead: Lead) => {
    setViewLead(lead);
    setViewDialogOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead || !form.name) return;
    setSaving(true);
    try {
      await updateData('leads', { id: editingLead.id }, {
        name: form.name,
        company: form.company || null,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source || null,
        notes: form.notes || null,
      });
      toast.success('سرنخ ویرایش شد');
      setEditDialogOpen(false);
      setEditingLead(null);
      loadLeads();
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`حذف سرنخ «${lead.name}»؟`)) return;
    try {
      await deleteData('leads', { id: lead.id });
      toast.success('سرنخ حذف شد');
      loadLeads();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const convertToCustomer = async (lead: Lead) => {
    if (!profile) return;
    if (!isSuperAdmin) {
      toast.error('فقط سوپرادمین می‌تواند سرنخ را به مشتری تبدیل کند');
      return;
    }
    setConverting(true);
    try {
      const cust = await createData('customers', {
        type: 'individual',
        firstName: lead.name,
        companyName: lead.company,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        level: 'bronze',
        createdBy: profile.id,
      });
      await updateData('leads', { id: lead.id }, { status: 'converted', customerId: cust.id });
      toast.success('سرنخ به مشتری واقعی تبدیل شد و در لیست مشتریان اضافه شد');
      setEditDialogOpen(false);
      setEditingLead(null);
      loadLeads();
    } catch (error: any) {
      toast.error('تبدیل ناموفق: ' + error.message);
    }
    setConverting(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateData('leads', { id }, { status });
      loadLeads();
    } catch (error: any) {
      toast.error('تغییر وضعیت ناموفق: ' + error.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="سرنخ‌های فروش"
        description="مدیریت سرنخ‌ها و تبدیل به مشتری"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> سرنخ جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>ثبت سرنخ جدید</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>نام *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>شرکت</Label>
                    <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>تلفن</Label>
                    <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>ایمیل</Label>
                    <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>منبع جذب</Label>
                  <Input placeholder="مثلا: وب‌سایت، نمایشگاه، معرفی" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>یادداشت</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال ایجاد...' : 'ثبت سرنخ'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="جستجوی سرنخ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {LEAD_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TrendingUp className="w-8 h-8" />}
            title="سرنخی یافت نشد"
            description="سرنخ‌های فروش جدید را ثبت کنید"
            action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> افزودن سرنخ</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => {
            const st = statusInfo(lead.status);
            return (
              <Card key={lead.id} className="hover:shadow-md transition-smooth">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold">
                        {lead.name?.[0] || '؟'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{lead.name}</div>
                        {lead.company && <div className="text-xs text-slate-400">{lead.company}</div>}
                      </div>
                    </div>
                    <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                  </div>

                  <div className="space-y-1.5 text-sm mb-3">
                    {lead.phone && <div className="flex items-center gap-2 text-slate-500"><Phone className="w-3.5 h-3.5 text-slate-400" /><span dir="ltr">{lead.phone}</span></div>}
                    {lead.email && <div className="flex items-center gap-2 text-slate-500"><Mail className="w-3.5 h-3.5 text-slate-400" /><span dir="ltr" className="truncate">{lead.email}</span></div>}
                    {lead.source && <div className="flex items-center gap-2 text-slate-500"><TrendingUp className="w-3.5 h-3.5 text-slate-400" />{lead.source}</div>}
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    {LEAD_STATUSES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => updateStatus(lead.id, s.key)}
                        className={`flex-1 h-1.5 rounded-full transition-smooth ${lead.status === s.key ? '' : 'bg-slate-100 hover:bg-slate-200'}`}
                        style={lead.status === s.key ? { backgroundColor: s.color } : {}}
                        title={s.label}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">{relativeTime(lead.createdAt)}</span>
                    <SuperAdminActions
                      onView={() => openView(lead)}
                      onEdit={() => openEdit(lead)}
                      onDelete={() => handleDelete(lead)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده سرنخ</DialogTitle></DialogHeader>
          {viewLead && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {viewLead.name?.[0] || '؟'}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{viewLead.name}</div>
                  <Badge style={{ backgroundColor: statusInfo(viewLead.status).color + '20', color: statusInfo(viewLead.status).color }}>{statusInfo(viewLead.status).label}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewLead.company && <div><span className="text-slate-400">شرکت:</span> <span className="font-medium">{viewLead.company}</span></div>}
                {viewLead.source && <div><span className="text-slate-400">منبع:</span> <span className="font-medium">{viewLead.source}</span></div>}
                {viewLead.phone && <div><span className="text-slate-400">تلفن:</span> <span className="font-medium" dir="ltr">{viewLead.phone}</span></div>}
                {viewLead.email && <div><span className="text-slate-400">ایمیل:</span> <span className="font-medium" dir="ltr">{viewLead.email}</span></div>}
              </div>
              {viewLead.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">یادداشت:</span>
                  {viewLead.notes}
                </div>
              )}
              <div className="text-xs text-slate-400">ایجاد شده: {relativeTime(viewLead.createdAt)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ویرایش سرنخ</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نام *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>شرکت</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>تلفن</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>منبع جذب</Label>
              <Input placeholder="مثلا: وب‌سایت، نمایشگاه، معرفی" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>یادداشت</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
                <Button type="submit" disabled={saving}>{saving ? 'در حال ذخیره...' : 'ذخیره'}</Button>
              </div>
              {isSuperAdmin && editingLead && editingLead.status !== 'converted' && (
                <Button
                  type="button"
                  variant="default"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                  disabled={converting}
                  onClick={() => convertToCustomer(editingLead)}
                >
                  <UserCheck className="w-4 h-4" />
                  {converting ? 'در حال تبدیل...' : 'تبدیل به مشتری واقعی'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
