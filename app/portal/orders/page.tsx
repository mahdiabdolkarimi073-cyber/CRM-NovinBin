'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { formatToman, formatJalali } from '@/lib/format';
import { ORDER_STATUSES } from '@/lib/constants';
import type { Order, OrderItem } from '@/lib/types';

const statusInfo = (key: string) => ORDER_STATUSES.find((s) => s.key === key) || ORDER_STATUSES[0];

export default function PortalOrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<(Order & { items?: OrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.customerId) return;
    setLoading(true);
    try {
      const ords = await fetchData<Order>('orders', {
        where: { customerId: profile.customerId },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
      setOrders(ords.map((o) => ({ ...o, items: (o.items as OrderItem[]) || [] })));
    } catch {
      setOrders([]);
    }
    setLoading(false);
  }, [profile?.customerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <PageHeader title="سفارشات من" description="سفارشات و جزئیات آن‌ها" />
      {orders.length === 0 ? (
        <Card><EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="سفارشی ندارید" description="سفارشات شما در اینجا نمایش داده می‌شود" /></Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = statusInfo(o.status);
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <button className="w-full text-right" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center"><ShoppingCart className="w-5 h-5" /></div>
                        <div>
                          <div className="font-medium text-slate-900">{o.number || o.id.slice(0, 8)}</div>
                          <div className="text-xs text-slate-400">{formatJalali(o.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatToman(o.total)} ت</span>
                        <Badge style={{ backgroundColor: st.color + '20', color: st.color }}>{st.label}</Badge>
                      </div>
                    </div>
                  </button>
                  {expanded === o.id && o.items && o.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{it.name} × {it.qty.toLocaleString('fa-IR')}</span>
                          <span className="font-medium">{formatToman(it.total)} ت</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
