'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Wallet, TrendingUp } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, pay] = await Promise.all([
        fetchData('billing_invoices', { orderBy: { createdAt: 'desc' }, include: { org: true } }),
        fetchData('payments', { orderBy: { createdAt: 'desc' }, include: { org: true } }),
      ]);
      setInvoices(inv);
      setPayments(pay);
    } catch {
      setInvoices([]);
      setPayments([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>;

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
  const totalUnpaid = invoices.filter((i) => i.status === 'unpaid').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <PageHeader title="صورتحساب و پرداخت‌ها" description="مدیریت مالی پلتفرم" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">پرداخت‌شده</div><div className="text-xl font-bold text-emerald-600">{formatToman(totalPaid)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">پرداخت‌نشده</div><div className="text-xl font-bold text-red-600">{formatToman(totalUnpaid)} ت</div></div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">تعداد تراکنش‌ها</div><div className="text-xl font-bold text-slate-900">{payments.length.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b font-bold text-sm">صورتحساب‌ها</div>
            {invoices.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">صورتحسابی نیست</p> : (
              <div className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-smooth">
                    <div>
                      <div className="text-sm font-medium">{inv.number}</div>
                      <div className="text-xs text-slate-400">{inv.org?.name} - {formatJalali(inv.issueDate)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{formatToman(inv.amount)} ت</span>
                      <Badge variant={inv.status === 'paid' ? 'default' : 'destructive'} className="text-xs">{inv.status === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b font-bold text-sm">تراکنش‌های پرداخت</div>
            {payments.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">تراکنشی نیست</p> : (
              <div className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-smooth">
                    <div>
                      <div className="text-sm font-medium">{p.org?.name || '—'}</div>
                      <div className="text-xs text-slate-400">{p.method || '—'} - {formatJalali(p.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{formatToman(p.amount)} ت</span>
                      <Badge variant={p.status === 'completed' ? 'default' : 'secondary'} className="text-xs">{p.status === 'completed' ? 'موفق' : p.status === 'pending' ? 'در انتظار' : 'ناموفق'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
