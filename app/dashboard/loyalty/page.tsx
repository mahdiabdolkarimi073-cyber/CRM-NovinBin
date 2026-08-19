'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Award, Star, Wallet, TrendingUp, Trophy } from 'lucide-react';
import { formatToman, relativeTime } from '@/lib/format';
import { fullName, CUSTOMER_LEVELS, tomanShort } from '@/lib/constants';
import type { Customer, LoyaltyTransaction } from '@/lib/types';

export default function LoyaltyPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await fetchData<Customer>('customers', {
        where: {},
        orderBy: { loyaltyPoints: 'desc' },
      });
      setCustomers(data);
    } catch {
      setCustomers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    fetchData<LoyaltyTransaction>('loyalty_transactions', {
      where: { customerId: selected },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).then((data) => setTransactions(data)).catch(() => setTransactions([]));
  }, [selected]);

  const levelInfo = (level: string) => CUSTOMER_LEVELS.find((l) => l.key === level) || CUSTOMER_LEVELS[0];
  const totalPoints = customers.reduce((s, c) => s + c.loyaltyPoints, 0);
  const totalWallet = customers.reduce((s, c) => s + c.walletBalance, 0);
  const vipCount = customers.filter((c) => c.level === 'vip').length;

  return (
    <div>
      <PageHeader title="باشگاه مشتریان" description="مدیریت امتیازات، سطح مشتریان و کیف پول" />

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">کل امتیازات</div><div className="text-xl font-bold text-slate-900">{totalPoints.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Star className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">کیف پول کل</div><div className="text-xl font-bold text-slate-900">{tomanShort(totalWallet)}</div></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">مشتریان VIP</div><div className="text-xl font-bold text-violet-600">{vipCount.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Trophy className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><div className="text-xs text-slate-400">تعداد مشتریان</div><div className="text-xl font-bold text-slate-900">{customers.length.toLocaleString('fa-IR')}</div></div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center"><Award className="w-5 h-5" /></div>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <EmptyState icon={<Award className="w-8 h-8" />} title="مشتری‌ای یافت نشد" description="ابتدا مشتری ثبت کنید" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer list */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {customers.map((c, i) => {
                    const level = levelInfo(c.level);
                    const name = c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                        className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-smooth text-right ${selected === c.id ? 'bg-sky-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-sky-100 text-sky-700">{name?.[0] || '؟'}</AvatarFallback>
                            </Avatar>
                            {i < 3 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center">
                                {(i + 1).toLocaleString('fa-IR')}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{name}</div>
                            <div className="text-xs text-slate-400">{c.loyaltyPoints.toLocaleString('fa-IR')} امتیاز</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-600">{formatToman(c.walletBalance)} ت</span>
                          <Badge variant="outline" style={{ color: level.color, borderColor: level.color + '40' }}>{level.label}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-bold text-slate-900 mb-4">تاریخچه امتیازات</h3>
                  {transactions.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">تراکنشی ثبت نشده</p>
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
                          <span className={`font-bold ${t.type === 'earn' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.type === 'earn' ? '+' : '−'}{t.points.toLocaleString('fa-IR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-slate-400 text-sm">
                  <Award className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  برای مشاهده تاریخچه امتیازات، یک مشتری را انتخاب کنید
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
