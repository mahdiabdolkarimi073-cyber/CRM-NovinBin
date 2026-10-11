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
  AlertTriangle, Plus, Search, Eye, Trash2, Loader2, Save,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import {
  INSURANCE_CLAIM_STATUSES, INSURANCE_CLAIM_TYPES, fullName,
} from '@/lib/constants';
import { toast } from 'sonner';
import type { InsuranceClaim, InsurancePolicy, Customer, Profile, InsuranceCompany } from '@/lib/types';

const claimStatusInfo = (k: string) => INSURANCE_CLAIM_STATUSES.find(s => s.key === k) || INSURANCE_CLAIM_STATUSES[0];
const claimTypeLabel = (k: string) => INSURANCE_CLAIM_TYPES.find(t => t.key === k)?.label || k;
const PAGE_SIZE = 10;

export default function InsuranceClaimsPage() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceClaim | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<InsuranceClaim | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    claimNumber: '', policyId: '', customerId: '', companyId: '',
    claimType: 'accident', incidentDate: '', reportDate: '',
    incidentLocation: '', incidentDescription: '',
    estimatedAmount: '0', claimedAmount: '0', approvedAmount: '0', paidAmount: '0',
    companyClaimNumber: '', assignedTo: '', status: 'registered', notes: '',
  });

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [cl, p, c, s, comp] = await Promise.all([
        fetchData<InsuranceClaim>('insurance_claims', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsurancePolicy>('insurance_policies', { take: 200 }),
        fetchData<Customer>('customers', { take: 200 }),
        fetchData<Profile>('profiles', {}),
        fetchData<InsuranceCompany>('insurance_companies', {}),
      ]);
      setClaims(cl || []);
      setPolicies(p || []);
      setCustomers(c || []);
      setStaff(s || []);
      setCompanies(comp || []);
    } catch (e: any) { toast.error('بارگذاری ناموفق: ' + e.message); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const customerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find(c => c.id === id);
    return c ? fullName(c.firstName, c.lastName, c.companyName || '—') : '—';
  };

  const filtered = useMemo(() => {
    return claims.filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (search.trim()) {
        const cn = customerName(c.customerId);
        if (!c.claimNumber.toLowerCase().includes(search.trim().toLowerCase()) &&
            !cn.toLowerCase().includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [claims, filterStatus, search, customers]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openEdit = (c: InsuranceClaim | null) => {
    if (c) {
      setEditing(c);
      setForm({
        claimNumber: c.claimNumber || '', policyId: c.policyId || '', customerId: c.customerId || '',
        companyId: c.companyId || '', claimType: c.claimType || 'accident',
        incidentDate: c.incidentDate ? new Date(c.incidentDate).toISOString().split('T')[0] : '',
        reportDate: c.reportDate ? new Date(c.reportDate).toISOString().split('T')[0] : '',
        incidentLocation: c.incidentLocation || '', incidentDescription: c.incidentDescription || '',
        estimatedAmount: String(c.estimatedAmount || 0), claimedAmount: String(c.claimedAmount || 0),
        approvedAmount: String(c.approvedAmount || 0), paidAmount: String(c.paidAmount || 0),
        companyClaimNumber: c.companyClaimNumber || '', assignedTo: c.assignedTo || '',
        status: c.status || 'registered', notes: c.notes || '',
      });
    } else {
      setEditing(null);
      setForm({ claimNumber: '', policyId: '', customerId: '', companyId: '', claimType: 'accident', incidentDate: '', reportDate: '', incidentLocation: '', incidentDescription: '', estimatedAmount: '0', claimedAmount: '0', approvedAmount: '0', paidAmount: '0', companyClaimNumber: '', assignedTo: '', status: 'registered', notes: '' });
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        claimNumber: form.claimNumber || `CL-${Date.now()}`,
        policyId: form.policyId || null,
        customerId: form.customerId || null,
        companyId: form.companyId || null,
        claimType: form.claimType,
        incidentDate: form.incidentDate ? new Date(form.incidentDate).toISOString() : null,
        reportDate: form.reportDate ? new Date(form.reportDate).toISOString() : new Date().toISOString(),
        incidentLocation: form.incidentLocation || null,
        incidentDescription: form.incidentDescription || null,
        estimatedAmount: Number(form.estimatedAmount) || 0,
        claimedAmount: Number(form.claimedAmount) || 0,
        approvedAmount: Number(form.approvedAmount) || 0,
        paidAmount: Number(form.paidAmount) || 0,
        companyClaimNumber: form.companyClaimNumber || null,
        assignedTo: form.assignedTo || null,
        status: form.status,
        notes: form.notes || null,
        createdBy: profile?.id,
      };
      if (editing) {
        await updateData('insurance_claims', { id: editing.id }, data);
        toast.success('خسارت ویرایش شد');
      } else {
        await createData('insurance_claims', data);
        toast.success('خسارت ثبت شد');
      }
      setEditOpen(false);
      loadAll();
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  const handleDelete = async (c: InsuranceClaim) => {
    if (!confirm('حذف این پرونده خسارت؟')) return;
    try { await deleteData('insurance_claims', { id: c.id }); toast.success('حذف شد'); loadAll(); }
    catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">پرونده‌های خسارت</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت و پیگیری خسارت‌های بیمه</p>
        </div>
        <Button onClick={() => openEdit(null)} size="sm"><Plus className="h-4 w-4 ml-1" />خسارت جدید</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجو بر اساس شماره خسارت یا مشتری" value={search} onChange={e => setSearch(e.target.value)} className="pr-8" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {INSURANCE_CLAIM_STATUSES.map(s => (<SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>پرونده خسارتی یافت نشد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right">
                <th className="pb-2 pr-2 font-medium">شماره</th>
                <th className="pb-2 font-medium">مشتری</th>
                <th className="pb-2 font-medium">نوع</th>
                <th className="pb-2 font-medium">مبلغ ادعا</th>
                <th className="pb-2 font-medium">وضعیت</th>
                <th className="pb-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-2 font-medium">{c.claimNumber}</td>
                  <td className="py-2">{customerName(c.customerId)}</td>
                  <td className="py-2">{claimTypeLabel(c.claimType || '')}</td>
                  <td className="py-2">{formatToman(Number(c.claimedAmount) || 0)}</td>
                  <td className="py-2">
                    <Badge style={{ backgroundColor: claimStatusInfo(c.status).color + '20', color: claimStatusInfo(c.status).color }}>
                      {claimStatusInfo(c.status).label}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setViewing(c); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><AlertTriangle className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'ویرایش خسارت' : 'خسارت جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>شماره خسارت</Label><Input value={form.claimNumber} onChange={e => setForm(f => ({ ...f, claimNumber: e.target.value }))} placeholder="خالی = خودکار" /></div>
              <div>
                <Label>بیمه‌نامه</Label>
                <Select value={form.policyId} onValueChange={v => setForm(f => ({ ...f, policyId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {policies.map(p => <SelectItem key={p.id} value={p.id}>{p.policyNumber || '—'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>مشتری</Label>
                <Select value={form.customerId} onValueChange={v => setForm(f => ({ ...f, customerId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{fullName(c.firstName, c.lastName, c.companyName || '')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>شرکت بیمه</Label>
                <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>نوع خسارت</Label>
                <Select value={form.claimType} onValueChange={v => setForm(f => ({ ...f, claimType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INSURANCE_CLAIM_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>شماره خسارت شرکت</Label><Input value={form.companyClaimNumber} onChange={e => setForm(f => ({ ...f, companyClaimNumber: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>تاریخ حادثه</Label><JalaliDatePicker value={form.incidentDate} onChange={v => setForm(f => ({ ...f, incidentDate: v || '' }))} /></div>
              <div><Label>تاریخ گزارش</Label><JalaliDatePicker value={form.reportDate} onChange={v => setForm(f => ({ ...f, reportDate: v || '' }))} /></div>
            </div>
            <div><Label>محل حادثه</Label><Input value={form.incidentLocation} onChange={e => setForm(f => ({ ...f, incidentLocation: e.target.value }))} /></div>
            <div><Label>شرح حادثه</Label><Textarea value={form.incidentDescription} onChange={e => setForm(f => ({ ...f, incidentDescription: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><Label>مبلغ تخمینی</Label><Input type="number" value={form.estimatedAmount} onChange={e => setForm(f => ({ ...f, estimatedAmount: e.target.value }))} /></div>
              <div><Label>مبلغ ادعا</Label><Input type="number" value={form.claimedAmount} onChange={e => setForm(f => ({ ...f, claimedAmount: e.target.value }))} /></div>
              <div><Label>مبلغ تأیید</Label><Input type="number" value={form.approvedAmount} onChange={e => setForm(f => ({ ...f, approvedAmount: e.target.value }))} /></div>
              <div><Label>مبلغ پرداخت</Label><Input type="number" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>کارشناس مسئول</Label>
                <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>وضعیت</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INSURANCE_CLAIM_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>جزئیات پرونده خسارت</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">شماره:</span> {viewing.claimNumber}</div>
                <div><span className="text-muted-foreground">مشتری:</span> {customerName(viewing.customerId)}</div>
                <div><span className="text-muted-foreground">نوع:</span> {claimTypeLabel(viewing.claimType || '')}</div>
                <div><span className="text-muted-foreground">شماره شرکت:</span> {viewing.companyClaimNumber || '—'}</div>
                <div><span className="text-muted-foreground">تاریخ حادثه:</span> {viewing.incidentDate ? formatJalali(viewing.incidentDate) : '—'}</div>
                <div><span className="text-muted-foreground">تاریخ گزارش:</span> {formatJalali(viewing.reportDate)}</div>
                <div><span className="text-muted-foreground">وضعیت:</span> {claimStatusInfo(viewing.status).label}</div>
              </div>
              {viewing.incidentLocation && <div><span className="text-muted-foreground">محل:</span> {viewing.incidentLocation}</div>}
              {viewing.incidentDescription && <div><span className="text-muted-foreground">شرح:</span> {viewing.incidentDescription}</div>}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><span className="text-muted-foreground">تخمینی:</span> {formatToman(Number(viewing.estimatedAmount) || 0)}</div>
                <div><span className="text-muted-foreground">ادعا:</span> {formatToman(Number(viewing.claimedAmount) || 0)}</div>
                <div><span className="text-muted-foreground">تأیید:</span> {formatToman(Number(viewing.approvedAmount) || 0)}</div>
                <div><span className="text-muted-foreground">پرداخت:</span> {formatToman(Number(viewing.paidAmount) || 0)}</div>
              </div>
              {viewing.notes && <div className="pt-2 border-t"><span className="text-muted-foreground">توضیحات:</span> {viewing.notes}</div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>بستن</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
