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
import { Banknote, Plus, Search, Eye, Trash2, X, Loader2, Clock } from 'lucide-react';
import Link from 'next/link';
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
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#22C55E,#16A34A)', boxShadow: '0 0 12px rgba(34,197,94,.25)' }} />
              <h1>رسیدها</h1>
            </div>
            <p>ثبت و مدیریت رسیدهای دریافتی</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/receipts/new" className="nb-new-btn"><Plus className="h-[18px] w-[18px]" /> رسید جدید</Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(34,197,94,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}><Banknote className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{receipts.length.toLocaleString('fa-IR')}</strong><span>کل رسیدها</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(37,99,235,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}><Banknote className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{receipts.filter(r => r.receiptType === 'cash').length.toLocaleString('fa-IR')}</strong><span>نقدی</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(245,158,11,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}><Banknote className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{receipts.filter(r => r.receiptType === 'cheque').length.toLocaleString('fa-IR')}</strong><span>چکی</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(14,165,233,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' }}><Banknote className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{receipts.filter(r => r.receiptType === 'bank_transfer' || r.receiptType === 'card_to_card').length.toLocaleString('fa-IR')}</strong><span>انتقال بانکی</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' }} />
        </div>
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه رسیدها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی رسید..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری رسیدها...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Banknote className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>رسیدی ثبت نشده</h3>
          <p>رسیدهای دریافتی در اینجا نمایش داده می‌شوند</p>
          <Link href="/dashboard/receipts/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> ثبت رسید</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <tr>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شماره</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مبلغ</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نوع</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">واریز به</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">پرداخت‌کننده</th>
                  <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                  {isSuperAdmin && <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">عملیات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="p-3"><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.number}</span></td>
                    <td className="p-3"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToman(Number(r.amount))} ت</span></td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{RECEIPT_TYPE_LABEL[r.receiptType] || r.receiptType}</td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{DEPOSIT_LABEL[r.depositTo || ''] || '—'}</td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{r.payerName || '—'}</td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalali(r.receivedDate)}</td>
                    {isSuperAdmin && (
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setViewReceipt(r); setViewDialogOpen(true); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700" title="مشاهده"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(r)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="حذف"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Link href="/dashboard/receipts/new" className="nb-fab" aria-label="رسید جدید"><Plus className="h-6 w-6" /></Link>

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
