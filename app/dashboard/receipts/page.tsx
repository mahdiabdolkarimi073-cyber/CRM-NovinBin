'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Banknote, Plus, Search, Eye, Trash2 } from 'lucide-react';
import { SuperAdminActions } from '@/components/dashboard/super-admin-actions';
import { formatToman, formatJalali, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

const DEPOSIT_TO = [
  { key: 'main_account', label: 'حساب اصلی' },
  { key: 'tehran_branch', label: 'شعبه تهران' },
  { key: 'isfahan_branch', label: 'شعبه اصفهان' },
  { key: 'shiraz_branch', label: 'شعبه شیراز' },
];

const RECEIPT_TYPES = [
  { key: 'cash', label: 'نقدی' },
  { key: 'cheque', label: 'چک' },
  { key: 'bank_transfer', label: 'انتقال بانکی' },
  { key: 'card_to_card', label: 'کارت به کارت' },
  { key: 'pos', label: 'POS' },
];

const CASH_METHODS = [
  { key: 'direct', label: 'مستقیم' },
  { key: 'atm', label: 'ATM' },
  { key: 'internet', label: 'اینترنت' },
  { key: 'cash_register', label: 'صندوق فروش' },
];

const REMINDERS = [
  { key: 'none', label: 'بدون یادآوری' },
  { key: '1day', label: '۱ روز' },
  { key: '3day', label: '۳ روز' },
  { key: '7day', label: '۷ روز' },
];

const PAYER_TYPES = [
  { key: 'customer', label: 'مشتری' },
  { key: 'supplier', label: 'تأمین‌کننده' },
];

const RECEIPT_TYPE_LABEL: Record<string, string> = {
  cash: 'نقدی', cheque: 'چک', bank_transfer: 'انتقال بانکی', card_to_card: 'کارت به کارت', pos: 'POS',
};

const DEPOSIT_LABEL: Record<string, string> = {
  main_account: 'حساب اصلی', tehran_branch: 'شعبه تهران', isfahan_branch: 'شعبه اصفهان', shiraz_branch: 'شعبه شیراز',
};

const emptyForm = () => ({
  invoice_id: '',
  amount: '',
  deposit_to: 'main_account',
  receipt_type: 'cash',
  cash_method: 'direct',
  bank_name: '',
  cheque_number: '',
  branch_code: '',
  tracking_number: '',
  received_date: toLocalDateString(new Date()),
  reminder: 'none',
  payer_type: 'customer',
  payer_name: '',
  notes: '',
  manual_number: '',
});

export default function ReceiptsPage() {
  const { profile } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [viewReceipt, setViewReceipt] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const where = isSuperAdmin ? {} : {};
    const [recs, invData] = await Promise.all([
      fetchData('receipts', { where, orderBy: { createdAt: 'desc' } }),
      fetchData('invoices', { where }),
    ]);
    setReceipts(recs || []);
    setInvoices(invData || []);
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => setForm(emptyForm());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    if (amount <= 0) {
      toast.error('مبلغ معتبر وارد کنید');
      return;
    }
    setCreating(true);
    const number = 'REC-' + Date.now().toString().slice(-6);
    const payload = {
      number,
      relatedInvoiceId: form.invoice_id === 'none' || !form.invoice_id ? null : form.invoice_id,
      amount,
      depositTo: form.deposit_to || null,
      receiptType: form.receipt_type,
      cashMethod: form.cash_method || null,
      bankName: form.bank_name || null,
      chequeNumber: form.cheque_number || null,
      branchCode: form.branch_code || null,
      trackingNumber: form.tracking_number || null,
      receivedDate: form.received_date,
      reminder: form.reminder === 'none' ? null : form.reminder,
      payerType: form.payer_type || null,
      payerName: form.payer_name || null,
      notes: form.notes || null,
      manualNumber: form.manual_number || null,
      receiptImageUrl: null,
      createdBy: profile.id,
    };
    try {
      await createData('receipts', payload);
      toast.success('رسید ثبت شد');
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error('ثبت ناموفق: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const showBankFields = form.receipt_type === 'cheque' || form.receipt_type === 'bank_transfer' || form.receipt_type === 'card_to_card';
  const showCashMethod = form.receipt_type === 'cash' || form.receipt_type === 'pos';

  const filtered = search
    ? receipts.filter((r) => {
        const q = search.toLowerCase();
        return (r.number || '').toLowerCase().includes(q) ||
          (r.payerName || '').toLowerCase().includes(q) ||
          (r.manualNumber || '').toLowerCase().includes(q);
      })
    : receipts;

  const handleDelete = async (r: any) => {
    if (!confirm(`حذف رسید «${r.number}»؟`)) return;
    try { await deleteData('receipts', { id: r.id }); toast.success('رسید حذف شد'); loadData(); }
    catch (e: any) { toast.error('حذف ناموفق: ' + e.message); }
  };

  return (
    <div>
      <PageHeader
        title="رسیدها"
        description="ثبت و مدیریت رسیدهای دریافتی"
        action={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> رسید جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>ثبت رسید جدید</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label>فاکتور مرتبط</Label>
                    <Select value={form.invoice_id || 'none'} onValueChange={(v) => setForm({ ...form, invoice_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ندارد</SelectItem>
                        {invoices.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>{inv.number} — {formatToman(Number(inv.amount))} ت</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>مبلغ (تومان) *</Label>
                    <Input dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label>واریز به</Label>
                    <Select value={form.deposit_to} onValueChange={(v) => setForm({ ...form, deposit_to: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPOSIT_TO.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>نوع رسید</Label>
                    <Select value={form.receipt_type} onValueChange={(v) => setForm({ ...form, receipt_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECEIPT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>شماره دستی</Label>
                    <Input dir="ltr" value={form.manual_number} onChange={(e) => setForm({ ...form, manual_number: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>نوع پرداخت‌کننده</Label>
                    <Select value={form.payer_type} onValueChange={(v) => setForm({ ...form, payer_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYER_TYPES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نام پرداخت‌کننده</Label>
                    <Input value={form.payer_name} onChange={(e) => setForm({ ...form, payer_name: e.target.value })} />
                  </div>
                </div>

                {showCashMethod && (
                  <div className="space-y-2">
                    <Label>روش نقدی</Label>
                    <Select value={form.cash_method} onValueChange={(v) => setForm({ ...form, cash_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CASH_METHODS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showBankFields && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>نام بانک</Label>
                      <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                    </div>
                    {form.receipt_type === 'cheque' && (
                      <>
                        <div className="space-y-2">
                          <Label>شماره چک</Label>
                          <Input dir="ltr" value={form.cheque_number} onChange={(e) => setForm({ ...form, cheque_number: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>کد شعبه</Label>
                          <Input dir="ltr" value={form.branch_code} onChange={(e) => setForm({ ...form, branch_code: e.target.value })} />
                        </div>
                      </>
                    )}
                    {(form.receipt_type === 'bank_transfer' || form.receipt_type === 'card_to_card') && (
                      <div className="space-y-2">
                        <Label>شماره پیگیری</Label>
                        <Input dir="ltr" value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>تاریخ دریافت</Label>
                    <JalaliDatePicker value={form.received_date ? new Date(form.received_date) : null} onChange={(d) => setForm({ ...form, received_date: d ? toLocalDateString(d) : '' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>یادآوری</Label>
                    <Select value={form.reminder} onValueChange={(v) => setForm({ ...form, reminder: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REMINDERS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>توضیحات</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال ثبت...' : 'ثبت رسید'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="جستجوی رسید..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 max-w-md" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Banknote className="w-8 h-8" />}
            title="رسیدی یافت نشد"
            description="اولین رسید را ثبت کنید"
            action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> رسید جدید</Button>}
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                    <th className="text-right p-3 font-medium">شماره</th>
                    <th className="text-right p-3 font-medium">مبلغ</th>
                    <th className="text-right p-3 font-medium">نوع</th>
                    <th className="text-right p-3 font-medium">واریز به</th>
                    <th className="text-right p-3 font-medium">پرداخت‌کننده</th>
                    <th className="text-right p-3 font-medium">تاریخ</th>
                    {isSuperAdmin && <th className="text-center p-3 font-medium">عملیات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-smooth">
                      <td className="p-3 font-medium text-slate-800">{r.number}</td>
                      <td className="p-3 font-bold">{formatToman(Number(r.amount))} ت</td>
                      <td className="p-3 text-slate-600">{RECEIPT_TYPE_LABEL[r.receiptType] || r.receiptType}</td>
                      <td className="p-3 text-slate-500">{DEPOSIT_LABEL[r.depositTo || ''] || '—'}</td>
                      <td className="p-3 text-slate-600">{r.payerName || '—'}</td>
                      <td className="p-3 text-slate-500">{formatJalali(r.receivedDate)}</td>
                      {isSuperAdmin && (
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setViewReceipt(r); setViewDialogOpen(true); }}><Eye className="w-4 h-4 text-sky-600" /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDelete(r)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>مشاهده رسید</DialogTitle></DialogHeader>
          {viewReceipt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900">{viewReceipt.number}</div>
                <Badge variant="outline">{RECEIPT_TYPE_LABEL[viewReceipt.receiptType] || viewReceipt.receiptType}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">مبلغ:</span> <span className="font-bold">{formatToman(Number(viewReceipt.amount))} ت</span></div>
                <div><span className="text-slate-400">واریز به:</span> <span className="font-medium">{DEPOSIT_LABEL[viewReceipt.depositTo || ''] || '—'}</span></div>
                <div><span className="text-slate-400">پرداخت‌کننده:</span> <span className="font-medium">{viewReceipt.payerName || '—'}</span></div>
                <div><span className="text-slate-400">تاریخ:</span> <span className="font-medium">{formatJalali(viewReceipt.receivedDate)}</span></div>
                {viewReceipt.bankName && <div><span className="text-slate-400">بانک:</span> <span className="font-medium">{viewReceipt.bankName}</span></div>}
                {viewReceipt.chequeNumber && <div><span className="text-slate-400">شماره چک:</span> <span className="font-medium" dir="ltr">{viewReceipt.chequeNumber}</span></div>}
                {viewReceipt.trackingNumber && <div><span className="text-slate-400">شماره پیگیری:</span> <span className="font-medium" dir="ltr">{viewReceipt.trackingNumber}</span></div>}
                {viewReceipt.manualNumber && <div><span className="text-slate-400">شماره دستی:</span> <span className="font-medium" dir="ltr">{viewReceipt.manualNumber}</span></div>}
              </div>
              {viewReceipt.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-slate-400 block mb-1">توضیحات:</span>{viewReceipt.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
