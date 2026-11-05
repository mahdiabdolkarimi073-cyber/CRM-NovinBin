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
  Banknote, Plus, Search, Eye, Trash2, Loader2, Save,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import {
  INSURANCE_PAYMENT_STATUSES, INSURANCE_PAYMENT_METHODS,
} from '@/lib/constants';
import { toast } from 'sonner';
import type { InsurancePayment, InsurancePolicy } from '@/lib/types';

const paymentStatusInfo = (k: string) => INSURANCE_PAYMENT_STATUSES.find(s => s.key === k) || INSURANCE_PAYMENT_STATUSES[0];
const paymentMethodLabel = (k: string) => INSURANCE_PAYMENT_METHODS.find(m => m.key === k)?.label || k;
const PAGE_SIZE = 10;

export default function InsurancePaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<InsurancePayment[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<InsurancePayment | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<InsurancePayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    policyId: '', amount: '0', paidAmount: '0',
    paymentDate: '', paymentMethod: 'cash', trackingNumber: '',
    dueDate: '', status: 'unpaid', notes: '',
  });

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [pm, p] = await Promise.all([
        fetchData<InsurancePayment>('insurance_payments', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsurancePolicy>('insurance_policies', { take: 200 }),
      ]);
      setPayments(pm || []);
      setPolicies(p || []);
    } catch (e: any) { toast.error('بارگذاری ناموفق: ' + e.message); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const policyNumber = (pid: string) => policies.find(p => p.id === pid)?.policyNumber || '—';

  const filtered = useMemo(() => {
    return payments.filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (search.trim()) {
        const pn = policyNumber(p.policyId);
        if (!pn.toLowerCase().includes(search.trim().toLowerCase()) &&
            !(p.trackingNumber || '').toLowerCase().includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [payments, filterStatus, search, policies]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openEdit = (p: InsurancePayment | null) => {
    if (p) {
      setEditing(p);
      setForm({
        policyId: p.policyId || '', amount: String(p.amount || 0), paidAmount: String(p.paidAmount || 0),
        paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : '',
        paymentMethod: p.paymentMethod || 'cash', trackingNumber: p.trackingNumber || '',
        dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '',
        status: p.status || 'unpaid', notes: p.notes || '',
      });
    } else {
      setEditing(null);
      setForm({ policyId: '', amount: '0', paidAmount: '0', paymentDate: '', paymentMethod: 'cash', trackingNumber: '', dueDate: '', status: 'unpaid', notes: '' });
    }
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        policyId: form.policyId || null,
        amount: Number(form.amount) || 0,
        paidAmount: Number(form.paidAmount) || 0,
        paymentDate: form.paymentDate ? new Date(form.paymentDate).toISOString() : null,
        paymentMethod: form.paymentMethod || null,
        trackingNumber: form.trackingNumber || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        status: form.status,
        notes: form.notes || null,
        createdBy: profile?.id,
      };
      if (editing) {
        await updateData('insurance_payments', { id: editing.id }, data);
        toast.success('پرداخت ویرایش شد');
      } else {
        await createData('insurance_payments', data);
        toast.success('پرداخت ثبت شد');
      }
      setEditOpen(false);
      loadAll();
    } catch (e: any) { toast.error('ذخیره ناموفق: ' + e.message); }
    setSaving(false);
  };

  const handleDelete = async (p: InsurancePayment) => {
    if (!confirm('حذف این پرداخت؟')) return;
    try { await deleteData('insurance_payments', { id: p.id }); toast.success('حذف شد'); loadAll(); }
    catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  const totalAmount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);
  const totalDue = totalAmount - totalPaid;

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">پرداخت‌ها و مطالبات</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت پرداخت‌های بیمه</p>
        </div>
        <Button onClick={() => openEdit(null)} size="sm"><Plus className="h-4 w-4 ml-1" />پرداخت جدید</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">کل مبلغ</div><div className="text-lg font-bold">{formatToman(totalAmount)} تومان</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">پرداخت‌شده</div><div className="text-lg font-bold text-green-600">{formatToman(totalPaid)} تومان</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">باقی‌مانده</div><div className="text-lg font-bold text-orange-600">{formatToman(totalDue)} تومان</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="جستجو بر اساس بیمه‌نامه یا شماره پیگیری" value={search} onChange={e => setSearch(e.target.value)} className="pr-8" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                {INSURANCE_PAYMENT_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>پرداختی یافت نشد</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right">
                <th className="pb-2 pr-2 font-medium">بیمه‌نامه</th>
                <th className="pb-2 font-medium">مبلغ</th>
                <th className="pb-2 font-medium">پرداخت‌شده</th>
                <th className="pb-2 font-medium">تاریخ پرداخت</th>
                <th className="pb-2 font-medium">روش</th>
                <th className="pb-2 font-medium">وضعیت</th>
                <th className="pb-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-2 font-medium">{policyNumber(p.policyId)}</td>
                  <td className="py-2">{formatToman(Number(p.amount) || 0)}</td>
                  <td className="py-2">{formatToman(Number(p.paidAmount) || 0)}</td>
                  <td className="py-2">{p.paymentDate ? formatJalali(p.paymentDate) : '—'}</td>
                  <td className="py-2">{paymentMethodLabel(p.paymentMethod || '')}</td>
                  <td className="py-2">
                    <Badge style={{ backgroundColor: paymentStatusInfo(p.status).color + '20', color: paymentStatusInfo(p.status).color }}>
                      {paymentStatusInfo(p.status).label}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setViewing(p); setViewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Banknote className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'ویرایش پرداخت' : 'پرداخت جدید'}</DialogTitle></DialogHeader>
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
              <div><Label>مبلغ کل (تومان)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>پرداخت‌شده (تومان)</Label><Input type="number" value={form.paidAmount} onChange={e => setForm(f => ({ ...f, paidAmount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>تاریخ پرداخت</Label><JalaliDatePicker value={form.paymentDate} onChange={v => setForm(f => ({ ...f, paymentDate: v || '' }))} /></div>
              <div><Label>تاریخ سررسید</Label><JalaliDatePicker value={form.dueDate} onChange={v => setForm(f => ({ ...f, dueDate: v || '' }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>روش پرداخت</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INSURANCE_PAYMENT_METHODS.map(m => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>شماره پیگیری</Label><Input value={form.trackingNumber} onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))} /></div>
            </div>
            <div>
              <Label>وضعیت</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INSURANCE_PAYMENT_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
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
          <DialogHeader><DialogTitle>جزئیات پرداخت</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">بیمه‌نامه:</span> {policyNumber(viewing.policyId)}</div>
                <div><span className="text-muted-foreground">روش:</span> {paymentMethodLabel(viewing.paymentMethod || '')}</div>
                <div><span className="text-muted-foreground">مبلغ:</span> {formatToman(Number(viewing.amount) || 0)}</div>
                <div><span className="text-muted-foreground">پرداخت‌شده:</span> {formatToman(Number(viewing.paidAmount) || 0)}</div>
                <div><span className="text-muted-foreground">تاریخ پرداخت:</span> {viewing.paymentDate ? formatJalali(viewing.paymentDate) : '—'}</div>
                <div><span className="text-muted-foreground">سررسید:</span> {viewing.dueDate ? formatJalali(viewing.dueDate) : '—'}</div>
                <div><span className="text-muted-foreground">پیگیری:</span> {viewing.trackingNumber || '—'}</div>
                <div><span className="text-muted-foreground">وضعیت:</span> {paymentStatusInfo(viewing.status).label}</div>
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
