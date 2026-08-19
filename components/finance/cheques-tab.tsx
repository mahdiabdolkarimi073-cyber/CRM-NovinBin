'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileCheck, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { formatToman, formatJalali, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { Cheque, BankAccount } from '@/lib/types';

const chequeStatusLabels: Record<string, string> = {
  pending: 'در جریان', cleared: 'تسویه شده', bounced: 'برگشت‌خورده', transferred: 'واگذار شده',
};
const chequeStatusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700', cleared: 'bg-emerald-50 text-emerald-700',
  bounced: 'bg-red-50 text-red-700', transferred: 'bg-sky-50 text-sky-700',
};

interface ChequesTabProps {
  cheques: Cheque[];
  bankAccounts: BankAccount[];
  loading: boolean;
  onCreate: (data: any) => Promise<void>;
  onClear: (id: string) => Promise<void>;
  onBounce: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ChequesTab({ cheques, bankAccounts, loading, onCreate, onClear, onBounce, onDelete }: ChequesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    type: 'received', number: '', amount: '', issueDate: '', dueDate: '',
    bankName: '', bankAccountId: '', payee: '', notes: '',
  });

  const handleCreate = async () => {
    if (!form.number || !form.amount || !form.dueDate) { toast.error('شماره، مبلغ و سررسید الزامی است'); return; }
    await onCreate({
      type: form.type,
      number: form.number,
      amount: Number(form.amount.replace(/[^0-9]/g, '')) || 0,
      issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : new Date().toISOString(),
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : new Date().toISOString(),
      bankName: form.bankName || null,
      bankAccountId: form.bankAccountId || null,
      payee: form.payee || null,
      notes: form.notes || null,
    });
    setDialogOpen(false);
    setForm({ type: 'received', number: '', amount: '', issueDate: '', dueDate: '', bankName: '', bankAccountId: '', payee: '', notes: '' });
  };

  const filtered = filter === 'all' ? cheques : cheques.filter((c) => c.status === filter);
  const totalReceived = cheques.filter((c) => c.type === 'received' && c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = cheques.filter((c) => c.type === 'paid' && c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">چک‌های دریافتی در جریان</div><div className="text-lg font-bold text-emerald-600">{formatToman(totalReceived)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><FileCheck className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">چک‌های پرداختی در جریان</div><div className="text-lg font-bold text-red-600">{formatToman(totalPaid)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><FileCheck className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'cleared', 'bounced'].map((s) => (
            <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
              {s === 'all' ? 'همه' : chequeStatusLabels[s]}
            </Button>
          ))}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" /> چک جدید</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>ثبت چک</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>نوع</Label>
                  <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="received">دریافتی</option>
                    <option value="paid">پرداختی</option>
                  </select>
                </div>
                <div className="space-y-2"><Label>شماره چک *</Label><Input dir="ltr" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>مبلغ (تومان) *</Label><Input dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div className="space-y-2"><Label>سررسید *</Label><JalaliDatePicker value={form.dueDate ? new Date(form.dueDate) : null} onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>تاریخ صدور</Label><JalaliDatePicker value={form.issueDate ? new Date(form.issueDate) : null} onChange={(d) => setForm({ ...form, issueDate: d ? toLocalDateString(d) : '' })} /></div>
                <div className="space-y-2"><Label>نام بانک</Label><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>حساب بانکی مرتبط</Label>
                <Select value={form.bankAccountId} onValueChange={(v) => setForm({ ...form, bankAccountId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ارتباط</SelectItem>
                    {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} - {b.bankName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>طرف چک</Label><Input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} placeholder="در وجه / از طرف" /></div>
              <div className="space-y-2"><Label>توضیحات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button><Button onClick={handleCreate}>ثبت</Button></DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-400"><FileCheck className="w-8 h-8 mx-auto mb-2" /><div>چکی ثبت نشده</div></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50 text-slate-500 text-xs">
                <th className="text-right p-3 font-medium">شماره</th>
                <th className="text-right p-3 font-medium">نوع</th>
                <th className="text-right p-3 font-medium">مبلغ</th>
                <th className="text-right p-3 font-medium">سررسید</th>
                <th className="text-right p-3 font-medium">وضعیت</th>
                <th className="text-center p-3 font-medium">عملیات</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((chq) => (
                  <tr key={chq.id} className="hover:bg-slate-50 transition-smooth">
                    <td className="p-3 font-mono text-slate-600" dir="ltr">{chq.number}</td>
                    <td className="p-3"><Badge variant={chq.type === 'received' ? 'default' : 'secondary'} className="text-xs">{chq.type === 'received' ? 'دریافتی' : 'پرداختی'}</Badge></td>
                    <td className="p-3 font-bold">{formatToman(Number(chq.amount))} ت</td>
                    <td className="p-3 text-slate-600">{formatJalali(chq.dueDate)}</td>
                    <td className="p-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${chequeStatusColors[chq.status]}`}>{chequeStatusLabels[chq.status]}</span></td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {chq.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => onClear(chq.id)}><CheckCircle2 className="w-3 h-3" /> تسویه</Button>
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-600 hover:bg-red-50" onClick={() => onBounce(chq.id)}><XCircle className="w-3 h-3" /> برگشت</Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => onDelete(chq.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
