'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Wallet, Star, TrendingUp } from 'lucide-react';
import { formatToman, relativeTime } from '@/lib/format';
import { CUSTOMER_LEVELS } from '@/lib/constants';
import type { Customer, LoyaltyTransaction } from '@/lib/types';

export default function PortalLoyaltyPage() {
  const { profile } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.customerId) return;
    setLoading(true);
    try {
      const custArr = await fetchData<Customer>('customers', { where: { id: profile.customerId } });
      setCustomer(custArr[0] || null);
      const txns = await fetchData<LoyaltyTransaction>('loyalty_transactions', { where: { customerId: profile.customerId }, orderBy: { createdAt: 'desc' } });
      setTransactions(txns);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [profile?.customerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" /></div>;

  const level = customer ? (CUSTOMER_LEVELS.find((l) => l.key === customer.level) || CUSTOMER_LEVELS[0]) : null;
  const nextLevel = level ? CUSTOMER_LEVELS[CUSTOMER_LEVELS.findIndex((l) => l.key === level.key) + 1] : null;

  return (
    <div>
      <PageHeader title="باشگاه مشتریان" description="امتیازات و سطح شما" />

      {customer && level && (
        <Card className="mb-6 bg-gradient-to-l from-violet-500 to-purple-700 text-white border-0 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Star className="w-8 h-8" style={{ color: level.color }} />
                </div>
                <div>
                  <div className="text-sm text-violet-100/80">سطح فعلی شما</div>
                  <div className="text-3xl font-bold">{level.label}</div>
                  {nextLevel && <div className="text-xs text-violet-100/70 mt-1">سطح بعدی: {nextLevel.label}</div>}
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">{customer.loyaltyPoints.toLocaleString('fa-IR')}</div>
                <div className="text-sm text-violet-100/80">امتیاز</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">موجودی کیف پول</div><div className="text-2xl font-bold text-slate-900">{formatToman(customer?.walletBalance || 0)} ت</div></div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet className="w-6 h-6" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">کل امتیازات</div><div className="text-2xl font-bold text-slate-900">{(customer?.loyaltyPoints || 0).toLocaleString('fa-IR')}</div></div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Award className="w-6 h-6" /></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold text-slate-900 mb-4">تاریخچه تراکنش‌ها</h3>
          {transactions.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">تراکنشی ثبت نشده</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <TrendingUp className={`w-4 h-4 ${t.type === 'spend' ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <div className="text-slate-700">{t.description || (t.type === 'earn' ? 'کسب امتیاز' : 'استفاده امتیاز')}</div>
                    <div className="text-xs text-slate-400">{relativeTime(t.createdAt)}</div>
                  </div>
                  <span className={`font-bold ${t.type === 'earn' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'earn' ? '+' : '−'}{t.points.toLocaleString('fa-IR')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
