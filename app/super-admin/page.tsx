'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData } from '@/lib/data-client';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, Users, TrendingUp, Wallet, Activity, Server, CheckCircle2, Clock } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { tomanShort } from '@/lib/constants';
import Link from 'next/link';
import type { Organization } from '@/lib/types';

export default function SuperAdminDashboard() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgData, profData, custData] = await Promise.all([
        fetchData<Organization>('organizations', { orderBy: { createdAt: 'desc' } }),
        fetchData('profiles', { where: { userType: 'staff' } }),
        fetchData('customers', {}),
      ]);
      setOrgs(orgData);
      setTotalUsers(profData.length);
      setTotalCustomers(custData.length);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  const totalOrgs = orgs.length;
  const activeOrgs = orgs.filter((o) => o.subscriptionStatus === 'active' || o.subscriptionStatus === 'trial').length;
  const trialOrgs = orgs.filter((o) => o.subscriptionStatus === 'trial').length;
  const activeSubscriptions = orgs.filter((o) => o.subscriptionStatus === 'active').length;
  const recentOrgs = orgs.slice(0, 8);

  const cards = [
    { label: 'سازمان‌های فعال', value: activeOrgs.toLocaleString('fa-IR'), icon: Building2, color: 'bg-sky-50 text-sky-600', sub: `از ${totalOrgs.toLocaleString('fa-IR')} سازمان` },
    { label: 'کاربران کل', value: totalUsers.toLocaleString('fa-IR'), icon: Users, color: 'bg-emerald-50 text-emerald-600', sub: 'در کل پلتفرم' },
    { label: 'مشتریان فعال', value: totalCustomers.toLocaleString('fa-IR'), icon: TrendingUp, color: 'bg-violet-50 text-violet-600', sub: 'در کل پلتفرم' },
    { label: 'اشتراک‌های فعال', value: activeSubscriptions.toLocaleString('fa-IR'), icon: CheckCircle2, color: 'bg-amber-50 text-amber-600', sub: 'پرداخت جاری' },
    { label: 'دوره آزمایشی', value: trialOrgs.toLocaleString('fa-IR'), icon: Clock, color: 'bg-orange-50 text-orange-600', sub: 'سازمان در حال تست' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="داشبورد سوپر ادمین" description="نمای کلی پلتفرم نوین بین" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, i) => (
          <Card key={i} className="hover:shadow-md transition-smooth">
            <CardContent className="p-3 sm:p-4">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${c.color} flex items-center justify-center mb-2 sm:mb-3`}>
                <c.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tnum">{c.value}</div>
              <div className="text-xs text-slate-500 mt-1">{c.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">آخرین سازمان‌های ثبت‌شده</CardTitle>
              <Link href="/super-admin/tenants" className="text-xs text-amber-600 hover:underline">مشاهده همه</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentOrgs.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">سازمانی ثبت نشده است</p>
            ) : (
              <div className="space-y-3">
                {recentOrgs.map((org) => (
                  <Link key={org.id} href={`/super-admin/tenants/${org.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-smooth">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-sky-100 text-sky-700 text-sm">{org.name?.[0] || 'س'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{org.name}</div>
                        <div className="text-xs text-slate-400">کد: {org.code} - {relativeTime(org.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{org.plan}</Badge>
                      <Badge variant={org.subscriptionStatus === 'trial' ? 'secondary' : 'default'} className="text-xs">
                        {org.subscriptionStatus === 'trial' ? 'آزمایشی' : org.subscriptionStatus === 'active' ? 'فعال' : 'معلق'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">وضعیت سیستم</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">سرور پایگاه داده</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">API فعال</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span className="text-sm text-sky-700">کاربران کل</span>
                </div>
                <span className="text-sm font-bold text-sky-700">{totalUsers.toLocaleString('fa-IR')}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700">سازمان‌های کل</span>
                </div>
                <span className="text-sm font-bold text-amber-700">{totalOrgs.toLocaleString('fa-IR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
