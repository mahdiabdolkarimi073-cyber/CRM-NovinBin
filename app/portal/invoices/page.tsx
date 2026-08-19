'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import { INVOICE_STATUSES } from '@/lib/constants';
import type { Invoice } from '@/lib/types';

const statusInfo = (key: string) => INVOICE_STATUSES.find((s) => s.key === key) || INVOICE_STATUSES[0];

export default function PortalInvoicesPage() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.customerId) return;
    setLoading(true);
    try {
      const data = await fetchData<Invoice>('invoices', { where: { customerId: profile.customerId }, orderBy: { createdAt: 'desc' } });
      setInvoices(data);
    } catch {
      setInvoices([]);
    }
    setLoading(false);
  }, [profile?.customerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <PageHeader title="فاکتورهای من" description="فاکتورها و پرداخت‌ها" />
      {invoices.length === 0 ? (
        <Card><EmptyState icon={<FileText className="w-8 h-8" />} title="فاکتوری ندارید" description="فاکتورهای شما در اینجا نمایش داده می‌شود" /></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                    <th className="text-right p-3 font-medium">شماره</th>
                    <th className="text-right p-3 font-medium">مبلغ</th>
                    <th className="text-right p-3 font-medium">پرداخت شده</th>
                    <th className="text-right p-3 font-medium">سررسید</th>
                    <th className="text-right p-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const st = statusInfo(inv.status);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-smooth">
                        <td className="p-3 font-medium">{inv.number}</td>
                        <td className="p-3 font-bold">{formatToman(inv.amount)} ت</td>
                        <td className="p-3 text-emerald-600">{formatToman(inv.paid)} ت</td>
                        <td className="p-3 text-slate-500">{inv.dueDate ? formatJalali(inv.dueDate) : '—'}</td>
                        <td className="p-3"><Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
