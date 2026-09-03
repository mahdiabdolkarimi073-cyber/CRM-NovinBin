'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Plus, CreditCard, Clock } from 'lucide-react';
import Link from 'next/link';
import { relativeTime, toLocalDateString } from '@/lib/format';
import { tomanShort } from '@/lib/constants';
import { toast } from 'sonner';

const PAYMENT_STATUSES = [
  { key: 'pending', label: 'در انتظار', color: '#f59e0b' },
  { key: 'completed', label: 'تکمیل شده', color: '#10b981' },
  { key: 'cancelled', label: 'لغو شده', color: '#ef4444' },
];

const PAYMENT_METHODS = [
  { key: 'cash', label: 'نقدی' },
  { key: 'cheque', label: 'چک' },
  { key: 'transfer', label: 'انتقال بانکی' },
  { key: 'card', label: 'کارت' },
  { key: 'online', label: 'آنلاین' },
];

const CASH_METHODS = [
  { key: 'direct', label: 'مستقیم' },
  { key: 'pos', label: 'POS' },
  { key: 'internet', label: 'اینترنت' },
  { key: 'santna', label: 'سنتنا' },
  { key: 'paya', label: 'پایا' },
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

const METHOD_LABEL: Record<string, string> = {
  cash: 'نقدی', cheque: 'چک', transfer: 'انتقال بانکی', card: 'کارت', online: 'آنلاین',
};

const statusInfo = (key: string) => PAYMENT_STATUSES.find((s) => s.key === key) || PAYMENT_STATUSES[0];

const emptyForm = () => ({
  invoiceId: '', amount: '', paymentMethod: 'cash', cashMethod: 'direct',
  bankName: '', chequeNumber: '', branchCode: '', trackingNumber: '',
  receivedDate: toLocalDateString(new Date()), reminder: 'none',
  payerType: 'customer', payerName: '', description: '',
});

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const where = profile.role === 'super_admin' || profile.role === 'owner' ? {} : {};
    const [pay, inv] = await Promise.all([
      fetchData('payments', { where, orderBy: { createdAt: 'desc' } }),
      fetchData('invoices', { where }),
    ]);
    setPayments(pay || []);
    setInvoices(inv || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    if (amount <= 0) { toast.error('مبلغ معتبر وارد کنید'); return; }
    setCreating(true);
    const number = 'PAY-' + Date.now().toString().slice(-6);
    try {
      await createData('payments', {
        invoiceId: form.invoiceId === 'none' || !form.invoiceId ? null : form.invoiceId,
        amount, method: form.paymentMethod,
        reference: form.trackingNumber || form.chequeNumber || null,
        date: new Date().toISOString(), status: 'pending',
        description: form.description || null,
        cashMethod: form.cashMethod || null, bankName: form.bankName || null,
        chequeNumber: form.chequeNumber || null, branchCode: form.branchCode || null,
        trackingNumber: form.trackingNumber || null,
        reminder: form.reminder === 'none' ? null : form.reminder,
        payerType: form.payerType || null, payerName: form.payerName || null,
        receivedDate: form.receivedDate || null, createdBy: profile.id,
      });
      toast.success('پرداخت ثبت شد');
      setDialogOpen(false); setForm(emptyForm()); loadData();
    } catch (e: any) { toast.error('ثبت ناموفق: ' + e.message); }
    setCreating(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try { await updateData('payments', { id }, { status }); loadData(); }
    catch (e: any) { toast.error('تغییر وضعیت ناموفق: ' + e.message); }
  };

  const showBankFields = ['cheque', 'transfer', 'card', 'online'].includes(form.paymentMethod);
  const showCashMethod = form.paymentMethod === 'cash';

  const filtered = search
    ? payments.filter((p) => {
        const q = search.toLowerCase();
        return (p.number || '').toLowerCase().includes(q) ||
          (p.payerName || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q);
      })
    : payments;

  const columns = PAYMENT_STATUSES.map((s) => ({
    ...s,
    items: filtered.filter((p) => p.status === s.key),
  }));

  return (
    <div>
      <PageHeader
        title="پرداخت‌ها"
        description="ثبت و مدیریت پرداخت‌ها"
        action={
          <Link href="/dashboard/payments/new">
            <Button size="sm"><Plus className="w-4 h-4" /> پرداخت جدید</Button>
          </Link>
        }
      />

      {/* Search bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-border bg-muted/40 px-3.5 transition-all focus-within:border-sky-500 focus-within:bg-card min-w-[240px]">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="جستجوی پرداخت..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{payments.length.toLocaleString('fa-IR')}</span>
          <span>پرداخت</span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.key} className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-muted/30">
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
                  <CreditCard className="h-5 w-5 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground/60">موردی وجود ندارد</p>
                </div>
              )}
              {col.items.map((p) => {
                const st = statusInfo(p.status);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-500/30 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{p.number}</span>
                      <span className="text-xs font-bold text-foreground">{tomanShort(Number(p.amount))}</span>
                    </div>
                    <p className="mb-1 line-clamp-1 text-xs text-muted-foreground">{p.payerName || '—'}</p>
                    <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">{METHOD_LABEL[p.method] || p.method}</p>
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {relativeTime(p.date)}
                    </div>
                    <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                      <SelectTrigger className="h-7 w-full text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
