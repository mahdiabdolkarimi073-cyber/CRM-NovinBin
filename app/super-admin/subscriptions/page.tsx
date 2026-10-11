'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<any>('subscriptions', {
        include: { org: true, plan: true },
        orderBy: { createdAt: 'desc' },
      });
      setSubs(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <PageHeader title="اشتراک‌ها" description="مدیریت اشتراک‌های سازمان‌ها" />
      {subs.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-slate-400">اشتراکی ثبت نشده است</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50 text-slate-500 text-xs">
                  <th className="text-right p-3 font-medium">سازمان</th>
                  <th className="text-right p-3 font-medium">پلن</th>
                  <th className="text-right p-3 font-medium">قیمت</th>
                  <th className="text-right p-3 font-medium">وضعیت</th>
                  <th className="text-right p-3 font-medium">شروع</th>
                  <th className="text-right p-3 font-medium">پایان</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {subs.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-smooth">
                      <td className="p-3 font-medium">{s.org?.name || '—'}</td>
                      <td className="p-3"><Badge variant="outline">{s.plan?.name}</Badge></td>
                      <td className="p-3 font-bold">{formatToman(Number(s.plan?.price || 0))} ت</td>
                      <td className="p-3"><Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{s.status}</Badge></td>
                      <td className="p-3 text-slate-400 text-xs">{formatJalali(s.startDate)}</td>
                      <td className="p-3 text-slate-400 text-xs">{s.endDate ? formatJalali(s.endDate) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
