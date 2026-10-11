'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData, createData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  RefreshCw, Plus, Search, Eye, Trash2, Loader2, Save,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import {
  INSURANCE_RENEWAL_STATUSES, INSURANCE_TYPES, fullName,
} from '@/lib/constants';
import { toast } from 'sonner';
import type { InsuranceRenewal, InsurancePolicy, Customer, Profile } from '@/lib/types';

const renewalStatusInfo = (k: string) => INSURANCE_RENEWAL_STATUSES.find(s => s.key === k) || INSURANCE_RENEWAL_STATUSES[0];
const typeLabel = (code: string) => INSURANCE_TYPES.find(t => t.key === code)?.label || code;
const PAGE_SIZE = 10;

export default function InsuranceRenewalsPage() {
  const { profile } = useAuth();
  const [renewals, setRenewals] = useState<InsuranceRenewal[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceRenewal | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<InsuranceRenewal | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    policyId: '', reminderDate: '', contactDate: '', contactResult: '',
    nextFollowUp: '', negotiationResult: '', nonRenewalReason: '',
    status: 'pending', notes: '',
  });

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [r, p, c, s] = await Promise.all([
        fetchData<InsuranceRenewal>('insurance_renewals', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsurancePolicy>('insurance_policies', { take: 200 }),
        fetchData<Customer>('customers', { take: 200 }),
        fetchData<Profile>('profiles', {}),
      ]);
      setRenewals(r || []);
      setPolicies(p || []);
      setCustomers(c || []);
      setStaff(s || []);
    } catch (e: any) { toast.error('بارگذاری ناموفق: ' + e.message); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const policyInfo = (pid: string | null) => {
    const p = policies.find(p => p.id === pid);
    if (!p) return { number: '—', customer: '—', type: '—', endDate: '—' as string };
    const cust = customers.find(c => c.id === p.customerId);
    return {
      number: p.policyNumber || '—',
      customer: cust ? fullName(cust.firstName, cust.lastName, cust.companyName || '—') : '—',
      type: typeLabel(p.insuranceTypeCode || ''),
      endDate: p.endDate ? formatJalali(p.endDate) : '—',
    };
  };

  const filtered = useMemo(() => {
    return renewals.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (search.trim()) {
        const info = policyInfo(r.policyId);
        if (!info.customer.toLowerCase().includes(search.trim().toLowerCase()) &&
            !info.number.toLowerCase().includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [renewals, filterStatus, search, policies, customers]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openEdit = (r: InsuranceRenewal | null) => {
    if (r) {
      setEditing(r);
      setForm({
        policyId: r.policyId || '',
        reminderDate: r.reminderDate ? new Date(r.reminderDate).toISOString().split('T')[0] : '',
        contactDate: r.contactDate ? new Date(r.contactDate).toISOString().split('T')[0] : '',
        contactResult: r.contactResult || '',
        nextFollowUp: r.nextFollowUp ? new Date(r.nextFollowUp).toISOString().split('T')[0] : '',
        negotiationResult: r.negotiationResult || '',
        nonRenewalReason: r.nonRenewalReason || '',
        status: r.status || 'pending', notes: r.notes || '',
      });
    } else {
      setEditing(null);
      setForm({ policyId: '', reminderDate: '', contactDate: '', contactResult: '', nextFollowUp: '', negotiationResult: '', nonRenewalReason: '', status: 'pending', notes: '' });
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        policyId: form.policyId || null,
        reminderDate: form.reminderDate ? new Date(form.reminderDate).toISOString() : null,
        contactDate: form.contactDate ? new Date(form.contactDate).toISOString() : null,
        contactResult: form.contactResult || null,
        nextFollowUp: form.nextFollowUp ? new Date(form.nextFollowUp).toISOString() : null,
        negotiationResult: form.negotiationResult || null,
        nonRenewalReason: form.nonRenewalReason || null,
        status: form.status,
        notes: form.notes || null,
        createdBy: profile?.id,
      };
      if (editing) {
        await updateData('insurance_renewals', { id: editing.id }, data);
        toast.success('تمدید ویرایش شد');
      } else {
        await createData('insurance_renewals', data);
        toast.success('تمدید ثبت شد');
      }
      setEditOpen(false);
      loadAll();
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  const handleDelete = async (r: InsuranceRenewal) => {
    if (!confirm('حذف این تمدید؟')) return;
    try { await deleteData('insurance_renewals', { id: r.id }); toast.success('حذف شد'); loadAll(); }
    catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">تمدیدهای بیمه</h1>
          <p className="text-sm text-muted-foreground mt-1">پیگیری هوشمند تمدید بیمه‌نامه‌ها</p>
        </div>
        <Button onClick={() => openEdit(null)} size="sm"><Plus className="h-4 w-4 ml-1" />تمدید جدید</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجو بر اساس شماره بیمه‌نامه یا مشتری" value={search} onChange={e => setSearch(e.target.value)} className="pr-8" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {INSURANCE_RENEWAL_STATUSES.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>تمدیلی یافت نشد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right">
                <th className="pb-2 pr-2 font-medium">بیمه‌نامه</th>
                <th className="pb-2 font-medium">مشتری</th>
                <th className="pb-2 font-medium">تاریخ یادآوری</th>
                <th className="pb-2 font-medium">تماس</th>
                <th className="pb-2 font-medium">وضعیت</th>
                <th className="pb-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(r => {
                const info = policyInfo(r.policyId);
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 pr-2 font-medium">{info.number}</td>
                    <td className="py-2">{info.customer}</td>
                    <td className="py-2">{formatJalali(r.reminderDate)}</td>
                    <td className="py-2">{r.contactDate ? formatJalali(r.contactDate) : '—'}</td>
                    <td className="py-2">
                      <Badge style={{ backgroundColor: renewalStatusInfo(r.status).color + '20', color: renewalStatusInfo(r.status).color }}>
                        {renewalStatusInfo(r.status).label}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setViewing(r); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><RefreshCw className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground">صفحه {currentPage} از {totalPages}</span>
          <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronLeft className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'ویرایش تمدید' : 'تمدید جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>بیمه‌نامه</Label>
              <Select value={form.policyId} onValueChange={v => setForm(f => ({ ...f, policyId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="انتخاب بیمه‌نامه" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {policies.map(p => {
                    const cust = customers.find(c => c.id === p.customerId);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.policyNumber || 'بدون شماره'} - {cust ? fullName(cust.firstName, cust.lastName, cust.companyName || '') : '—'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>تاریخ یادآوری</Label><JalaliDatePicker value={form.reminderDate} onChange={v => setForm(f => ({ ...f, reminderDate: v || '' }))} /></div>
              <div><Label>تاریخ تماس</Label><JalaliDatePicker value={form.contactDate} onChange={v => setForm(f => ({ ...f, contactDate: v || '' }))} /></div>
            </div>
            <div><Label>نتیجه تماس</Label><Input value={form.contactResult} onChange={e => setForm(f => ({ ...f, contactResult: e.target.value }))} /></div>
            <div><Label>پیگیری بعدی</Label><JalaliDatePicker value={form.nextFollowUp} onChange={v => setForm(f => ({ ...f, nextFollowUp: v || '' }))} /></div>
            <div><Label>نتیجه مذاکره</Label><Textarea value={form.negotiationResult} onChange={e => setForm(f => ({ ...f, negotiationResult: e.target.value }))} rows={2} /></div>
            <div>
              <Label>وضعیت</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_RENEWAL_STATUSES.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            {form.status === 'not_renewed' && (
              <div><Label>دلیل عدم تمدید</Label><Input value={form.nonRenewalReason} onChange={e => setForm(f => ({ ...f, nonRenewalReason: e.target.value }))} /></div>
            )}
            <div><Label>توضیحات</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>جزئیات تمدید</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              {(() => {
                const info = policyInfo(viewing.policyId);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="text-muted-foreground">بیمه‌نامه:</span> {info.number}</div>
                      <div><span className="text-muted-foreground">مشتری:</span> {info.customer}</div>
                      <div><span className="text-muted-foreground">رشته:</span> {info.type}</div>
                      <div><span className="text-muted-foreground">پایان بیمه‌نامه:</span> {info.endDate}</div>
                      <div><span className="text-muted-foreground">یادآوری:</span> {formatJalali(viewing.reminderDate)}</div>
                      <div><span className="text-muted-foreground">تماس:</span> {viewing.contactDate ? formatJalali(viewing.contactDate) : '—'}</div>
                      <div><span className="text-muted-foreground">پیگیری بعدی:</span> {viewing.nextFollowUp ? formatJalali(viewing.nextFollowUp) : '—'}</div>
                      <div><span className="text-muted-foreground">وضعیت:</span> {renewalStatusInfo(viewing.status).label}</div>
                    </div>
                    {viewing.contactResult && <div className="pt-2 border-t"><span className="text-muted-foreground">نتیجه تماس:</span> {viewing.contactResult}</div>}
                    {viewing.negotiationResult && <div><span className="text-muted-foreground">نتیجه مذاکره:</span> {viewing.negotiationResult}</div>}
                    {viewing.nonRenewalReason && <div><span className="text-muted-foreground">دلیل عدم تمدید:</span> {viewing.nonRenewalReason}</div>}
                    {viewing.notes && <div><span className="text-muted-foreground">توضیحات:</span> {viewing.notes}</div>}
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>بستن</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
