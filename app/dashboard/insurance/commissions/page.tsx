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
  Coins, Plus, Search, Eye, Trash2, Loader2, Save,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import {
  INSURANCE_COMMISSION_STATUSES, fullName,
} from '@/lib/constants';
import { toast } from 'sonner';
import type { InsuranceCommission, InsurancePolicy, Profile, InsuranceCompany } from '@/lib/types';

const commissionStatusInfo = (k: string) => INSURANCE_COMMISSION_STATUSES.find(s => s.key === k) || INSURANCE_COMMISSION_STATUSES[0];
const PAGE_SIZE = 10;

export default function InsuranceCommissionsPage() {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<InsuranceCommission[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceCommission | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<InsuranceCommission | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    policyId: '', companyId: '', profileId: '',
    calculationBasis: 'premium', rate: '0',
    expectedAmount: '0', confirmedAmount: '0', paidAmount: '0',
    dueDate: '', receivedDate: '', status: 'predicted', notes: '',
  });

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [cm, p, s, c] = await Promise.all([
        fetchData<InsuranceCommission>('insurance_commissions', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsurancePolicy>('insurance_policies', { take: 200 }),
        fetchData<Profile>('profiles', {}),
        fetchData<InsuranceCompany>('insurance_companies', {}),
      ]);
      setCommissions(cm || []);
      setPolicies(p || []);
      setStaff(s || []);
      setCompanies(c || []);
    } catch (e: any) { toast.error('بارگذاری ناموفق: ' + e.message); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const policyNumber = (pid: string | null) => policies.find(p => p.id === pid)?.policyNumber || '—';
  const staffName = (pid: string | null) => {
    if (!pid) return '—';
    const s = staff.find(s => s.id === pid);
    return s ? fullName(s.firstName, s.lastName) : '—';
  };
  const companyName = (cid: string | null) => companies.find(c => c.id === cid)?.name || '—';

  const filtered = useMemo(() => {
    return commissions.filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (search.trim()) {
        const pn = policyNumber(c.policyId);
        const sn = staffName(c.profileId);
        if (!pn.toLowerCase().includes(search.trim().toLowerCase()) &&
            !sn.toLowerCase().includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [commissions, filterStatus, search, policies, staff]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openEdit = (c: InsuranceCommission | null) => {
    if (c) {
      setEditing(c);
      setForm({
        policyId: c.policyId || '', companyId: c.companyId || '', profileId: c.profileId || '',
        calculationBasis: c.calculationBasis || 'premium', rate: String(c.rate || 0),
        expectedAmount: String(c.expectedAmount || 0), confirmedAmount: String(c.confirmedAmount || 0),
        paidAmount: String(c.paidAmount || 0),
        dueDate: c.dueDate ? new Date(c.dueDate).toISOString().split('T')[0] : '',
        receivedDate: c.receivedDate ? new Date(c.receivedDate).toISOString().split('T')[0] : '',
        status: c.status || 'predicted', notes: c.notes || '',
      });
    } else {
      setEditing(null);
      setForm({ policyId: '', companyId: '', profileId: '', calculationBasis: 'premium', rate: '0', expectedAmount: '0', confirmedAmount: '0', paidAmount: '0', dueDate: '', receivedDate: '', status: 'predicted', notes: '' });
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const expected = Number(form.expectedAmount) || 0;
      const paid = Number(form.paidAmount) || 0;
      const confirmed = Number(form.confirmedAmount) || 0;
      const data = {
        policyId: form.policyId || null,
        companyId: form.companyId || null,
        profileId: form.profileId || null,
        calculationBasis: form.calculationBasis,
        rate: Number(form.rate) || 0,
        expectedAmount: expected,
        confirmedAmount: confirmed,
        paidAmount: paid,
        remainingAmount: confirmed - paid,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        receivedDate: form.receivedDate ? new Date(form.receivedDate).toISOString() : null,
        status: form.status,
        notes: form.notes || null,
        createdBy: profile?.id,
      };
      if (editing) {
        await updateData('insurance_commissions', { id: editing.id }, data);
        toast.success('کارمزد ویرایش شد');
      } else {
        await createData('insurance_commissions', data);
        toast.success('کارمزد ثبت شد');
      }
      setEditOpen(false);
      loadAll();
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  const handleDelete = async (c: InsuranceCommission) => {
    if (!confirm('حذف این کارمزد؟')) return;
    try { await deleteData('insurance_commissions', { id: c.id }); toast.success('حذف شد'); loadAll(); }
    catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  const totalExpected = commissions.reduce((s, c) => s + (Number(c.expectedAmount) || 0), 0);
  const totalPaid = commissions.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
  const totalRemaining = commissions.reduce((s, c) => s + (Number(c.remainingAmount) || 0), 0);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">کارمزدها و کمیسیون‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">پیگیری کارمزد بیمه‌نامه‌ها</p>
        </div>
        <Button onClick={() => openEdit(null)} size="sm"><Plus className="h-4 w-4 ml-1" />کارمزد جدید</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">کارمزد مورد انتظار</div><div className="text-lg font-bold">{formatToman(totalExpected)} تومان</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">پرداخت‌شده</div><div className="text-lg font-bold text-green-600">{formatToman(totalPaid)} تومان</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">باقی‌مانده</div><div className="text-lg font-bold text-orange-600">{formatToman(totalRemaining)} تومان</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجو بر اساس بیمه‌نامه یا کارشناس" value={search} onChange={e => setSearch(e.target.value)} className="pr-8" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                {INSURANCE_COMMISSION_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Coins className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>کارمزدی یافت نشد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right">
                <th className="pb-2 pr-2 font-medium">بیمه‌نامه</th>
                <th className="pb-2 font-medium">کارشناس</th>
                <th className="pb-2 font-medium">شرکت</th>
                <th className="pb-2 font-medium">مبلغ مورد انتظار</th>
                <th className="pb-2 font-medium">پرداخت‌شده</th>
                <th className="pb-2 font-medium">وضعیت</th>
                <th className="pb-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-2 font-medium">{policyNumber(c.policyId)}</td>
                  <td className="py-2">{staffName(c.profileId)}</td>
                  <td className="py-2">{companyName(c.companyId)}</td>
                  <td className="py-2">{formatToman(Number(c.expectedAmount) || 0)}</td>
                  <td className="py-2">{formatToman(Number(c.paidAmount) || 0)}</td>
                  <td className="py-2">
                    <Badge style={{ backgroundColor: commissionStatusInfo(c.status).color + '20', color: commissionStatusInfo(c.status).color }}>
                      {commissionStatusInfo(c.status).label}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setViewing(c); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Coins className="h-4 w-4" /></Button>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'ویرایش کارمزد' : 'کارمزد جدید'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div>
                <Label>کارشناس</Label>
                <Select value={form.profileId} onValueChange={v => setForm(f => ({ ...f, profileId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>مبنای محاسبه</Label>
                <Select value={form.calculationBasis} onValueChange={v => setForm(f => ({ ...f, calculationBasis: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">پریمیوم</SelectItem>
                    <SelectItem value="commission">کارمزد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>نرخ (٪)</Label><Input type="number" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>مبلغ مورد انتظار</Label><Input type="number" value={form.expectedAmount} onChange={e => setForm(f => ({ ...f, expectedAmount: e.target.value }))} /></div>
              <div><Label>تأییدشده</Label><Input type="number" value={form.confirmedAmount} onChange={e => setForm(f => ({ ...f, confirmedAmount: e.target.value }))} /></div>
              <div><Label>پرداخت‌شده</Label><Input type="number" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>تاریخ سررسید</Label><JalaliDatePicker value={form.dueDate} onChange={v => setForm(f => ({ ...f, dueDate: v || '' }))} /></div>
              <div><Label>تاریخ دریافت</Label><JalaliDatePicker value={form.receivedDate} onChange={v => setForm(f => ({ ...f, receivedDate: v || '' }))} /></div>
            </div>
            <div>
              <Label>وضعیت</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INSURANCE_COMMISSION_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>جزئیات کارمزد</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">بیمه‌نامه:</span> {policyNumber(viewing.policyId)}</div>
                <div><span className="text-muted-foreground">کارشناس:</span> {staffName(viewing.profileId)}</div>
                <div><span className="text-muted-foreground">شرکت:</span> {companyName(viewing.companyId)}</div>
                <div><span className="text-muted-foreground">نرخ:</span> {viewing.rate}٪</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><span className="text-muted-foreground">مورد انتظار:</span> {formatToman(Number(viewing.expectedAmount) || 0)}</div>
                <div><span className="text-muted-foreground">تأییدشده:</span> {formatToman(Number(viewing.confirmedAmount) || 0)}</div>
                <div><span className="text-muted-foreground">پرداخت‌شده:</span> {formatToman(Number(viewing.paidAmount) || 0)}</div>
                <div><span className="text-muted-foreground">باقی‌مانده:</span> {formatToman(Number(viewing.remainingAmount) || 0)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div><span className="text-muted-foreground">سررسید:</span> {viewing.dueDate ? formatJalali(viewing.dueDate) : '—'}</div>
                <div><span className="text-muted-foreground">دریافت:</span> {viewing.receivedDate ? formatJalali(viewing.receivedDate) : '—'}</div>
              </div>
              <div><span className="text-muted-foreground">وضعیت:</span> {commissionStatusInfo(viewing.status).label}</div>
              {viewing.notes && <div><span className="text-muted-foreground">توضیحات:</span> {viewing.notes}</div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>بستن</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
