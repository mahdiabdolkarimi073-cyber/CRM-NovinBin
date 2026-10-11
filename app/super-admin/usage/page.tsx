'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Users, Building2, ShoppingCart, FileText, Package, CheckSquare } from 'lucide-react';

export default function UsagePage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const orgs = await fetchData('organizations', { orderBy: { name: 'asc' }, take: 20 });
      const enriched = await Promise.all(
        orgs.slice(0, 20).map(async (o) => {
          try {
            const [users, customers, products, orders, invoices, tasks] = await Promise.all([
              fetchData('profiles', { where: { userType: 'staff' } }),
              fetchData('customers', {}),
              fetchData('products', {}),
              fetchData('orders', {}),
              fetchData('invoices', {}),
              fetchData('tasks', {}),
            ]);
            return {
              ...o,
              usage: {
                users: users.length,
                customers: customers.length,
                products: products.length,
                orders: orders.length,
                invoices: invoices.length,
                tasks: tasks.length,
              },
            };
          } catch {
            return { ...o, usage: { users: 0, customers: 0, products: 0, orders: 0, invoices: 0, tasks: 0 } };
          }
        })
      );
      setTenants(enriched);
    } catch {
      setTenants([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>;

  const metrics = [
    { key: 'users', label: 'کاربران', icon: Users, color: 'text-sky-600', max: 100 },
    { key: 'customers', label: 'مشتریان', icon: Building2, color: 'text-emerald-600', max: 500 },
    { key: 'products', label: 'محصولات', icon: Package, color: 'text-violet-600', max: 200 },
    { key: 'orders', label: 'سفارشات', icon: ShoppingCart, color: 'text-amber-600', max: 500 },
    { key: 'invoices', label: 'فاکتورها', icon: FileText, color: 'text-cyan-600', max: 500 },
    { key: 'tasks', label: 'وظایف', icon: CheckSquare, color: 'text-orange-600', max: 500 },
  ];

  return (
    <div>
      <PageHeader title="مصرف منابع" description="مانیتورینگ مصرف سازمان‌ها" />

      <div className="space-y-4">
        {tenants.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-900">{t.name}</span>
                <span className="text-xs text-slate-400" dir="ltr">{t.code}</span>
                <span className="text-xs text-slate-400">پلن: {t.plan}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {metrics.map((m) => {
                  const value = t.usage?.[m.key] || 0;
                  const pct = Math.min(100, (value / m.max) * 100);
                  return (
                    <div key={m.key}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                        <span className="text-xs text-slate-500">{m.label}</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900">{value.toLocaleString('fa-IR')}</div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 mt-1 overflow-hidden">
                        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
