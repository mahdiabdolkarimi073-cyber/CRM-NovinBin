'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, FileText, Clock, AlertTriangle, TrendingUp,
  Wallet, Coins, RefreshCw, Plus, Search, Eye, Loader2,
  BarChart3, Calendar,
} from 'lucide-react';
import { formatJalali, formatToman, relativeTime } from '@/lib/format';
import {
  INSURANCE_ISSUE_STATUSES, INSURANCE_CLAIM_STATUSES,
  INSURANCE_PAYMENT_STATUSES, INSURANCE_COMMISSION_STATUSES,
} from '@/lib/constants';
import { toast } from 'sonner';
import type {
  InsurancePolicy, InsuranceClaim, InsuranceRenewal,
  InsuranceCommission, InsurancePayment, Profile,
} from '@/lib/types';

const issueStatusInfo = (k: string) => INSURANCE_ISSUE_STATUSES.find(s => s.key === k) || INSURANCE_ISSUE_STATUSES[0];
const claimStatusInfo = (k: string) => INSURANCE_CLAIM_STATUSES.find(s => s.key === k) || INSURANCE_CLAIM_STATUSES[0];
const commissionStatusInfo = (k: string) => INSURANCE_COMMISSION_STATUSES.find(s => s.key === k) || INSURANCE_COMMISSION_STATUSES[0];

type TimeRange = 'today' | 'this_month' | '3months' | 'all';

export default function InsuranceDashboardPage() {
  const { profile } = useAuth();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [renewals, setRenewals] = useState<InsuranceRenewal[]>([]);
  const [commissions, setCommissions] = useState<InsuranceCommission[]>([]);
  const [payments, setPayments] = useState<InsurancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('this_month');

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [p, c, r, com, pay] = await Promise.all([
        fetchData<InsurancePolicy>('insurance_policies', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsuranceClaim>('insurance_claims', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsuranceRenewal>('insurance_renewals', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsuranceCommission>('insurance_commissions', { orderBy: { createdAt: 'desc' } }),
        fetchData<InsurancePayment>('insurance_payments', { orderBy: { createdAt: 'desc' } }),
      ]);
      setPolicies(p || []);
      setClaims(c || []);
      setRenewals(r || []);
      setCommissions(com || []);
      setPayments(pay || []);
    } catch (e: any) {
      toast.error('بارگذاری داده‌های بیمه ناموفق: ' + e.message);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const now = Date.now();
  const rangeStart = useMemo(() => {
    const d = new Date();
    if (timeRange === 'today') d.setHours(0, 0, 0, 0);
    else if (timeRange === 'this_month') d.setDate(1);
    else if (timeRange === '3months') d.setMonth(d.getMonth() - 3);
    else d.setFullYear(2000);
    return d.getTime();
  }, [timeRange]);

  const inRange = (dateStr: string) => new Date(dateStr).getTime() >= rangeStart && new Date(dateStr).getTime() <= now;

  const stats = useMemo(() => {
    const activePolicies = policies.filter(p => p.issueStatus === 'issued' && (!p.endDate || new Date(p.endDate).getTime() > now));
    const pendingPolicies = policies.filter(p => p.issueStatus === 'pending');
    const expiringPolicies = policies.filter(p => {
      if (!p.endDate) return false;
      const days = (new Date(p.endDate).getTime() - now) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 30;
    });
    const expiredPolicies = policies.filter(p => p.endDate && new Date(p.endDate).getTime() < now && p.issueStatus !== 'voided');
    const completedRenewals = renewals.filter(r => r.status === 'renewed');
    const openClaims = claims.filter(c => !['closed', 'fully_paid', 'rejected'].includes(c.status));
    const awaitingDocsClaims = claims.filter(c => c.status === 'awaiting_docs');
    const totalPremium = policies.filter(p => inRange(p.createdAt)).reduce((s, p) => s + (Number(p.premium) || 0), 0);
    const totalCollected = payments.filter(p => p.status === 'paid' && inRange(p.createdAt)).reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);
    const overduePayments = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + (Number(p.amount) || 0) - (Number(p.paidAmount) || 0), 0);
    const unpaidCommissions = commissions.filter(c => !['settled', 'cancelled'].includes(c.status)).reduce((s, c) => s + (Number(c.remainingAmount) || 0), 0);

    return [
      { label: 'کل بیمه‌نامه‌ها', value: policies.length, icon: FileText, href: '/dashboard/insurance/policies', color: '#2563eb' },
      { label: 'بیمه‌نامه‌های فعال', value: activePolicies.length, icon: ShieldCheck, href: '/dashboard/insurance/policies', color: '#10b981' },
      { label: 'در انتظار صدور', value: pendingPolicies.length, icon: Clock, href: '/dashboard/insurance/policies', color: '#f59e0b' },
      { label: 'نزدیک به انقضا', value: expiringPolicies.length, icon: AlertTriangle, href: '/dashboard/insurance/renewals', color: '#f97316' },
      { label: 'منقضی‌شده', value: expiredPolicies.length, icon: AlertTriangle, href: '/dashboard/insurance/renewals', color: '#ef4444' },
      { label: 'تمدیدهای انجام‌شده', value: completedRenewals.length, icon: RefreshCw, href: '/dashboard/insurance/renewals', color: '#22c55e' },
      { label: 'خسارت‌های باز', value: openClaims.length, icon: AlertTriangle, href: '/dashboard/insurance/claims', color: '#dc2626' },
      { label: 'خسارت‌های در انتظار مدارک', value: awaitingDocsClaims.length, icon: Clock, href: '/dashboard/insurance/claims', color: '#f59e0b' },
      { label: 'مجموع حق بیمه', value: formatToman(totalPremium), icon: TrendingUp, href: '/dashboard/insurance/policies', color: '#0ea5e9' },
      { label: 'مجموع مبالغ وصول‌شده', value: formatToman(totalCollected), icon: Wallet, href: '/dashboard/insurance/payments', color: '#06b6d4' },
      { label: 'مطالبات سررسیدشده', value: formatToman(overduePayments), icon: Wallet, href: '/dashboard/insurance/payments', color: '#ef4444' },
      { label: 'کارمزدهای پرداخت‌نشده', value: formatToman(unpaidCommissions), icon: Coins, href: '/dashboard/insurance/commissions', color: '#f59e0b' },
    ];
  }, [policies, claims, renewals, commissions, payments, timeRange, now]);

  const recentPolicies = policies.slice(0, 5);
  const recentClaims = claims.slice(0, 5);
  const upcomingRenewals = renewals
    .filter(r => r.status === 'pending' || r.status === 'contacted')
    .sort((a, b) => new Date(a.reminderDate || '').getTime() - new Date(b.reminderDate || '').getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">داشبورد بیمه</h1>
          <p className="text-sm text-muted-foreground mt-1">نمای کلی ماژول مدیریت بیمه</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 rounded-lg border bg-background text-sm"
          >
            <option value="today">امروز</option>
            <option value="this_month">ماه جاری</option>
            <option value="3months">سه ماه اخیر</option>
            <option value="all">کل</option>
          </select>
          <Link href="/dashboard/insurance/policies/new">
            <Button size="sm">
              <Plus className="h-4 w-4 ml-1" />
              بیمه‌نامه جدید
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s, i) => (
          <Link key={i} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخرین بیمه‌نامه‌ها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPolicies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">بیمه‌نامه‌ای ثبت نشده است</p>
            ) : (
              recentPolicies.map(p => (
                <Link key={p.id} href={`/dashboard/insurance/policies/${p.id}`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{p.policyNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatJalali(p.createdAt)}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {issueStatusInfo(p.issueStatus).label}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخرین پرونده‌های خسارت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentClaims.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">پرونده خسارتی ثبت نشده است</p>
            ) : (
              recentClaims.map(c => (
                <Link key={c.id} href={`/dashboard/insurance/claims`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="text-sm font-medium">{c.claimNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatJalali(c.createdAt)}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {claimStatusInfo(c.status).label}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">تمدیدهای نزدیک</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingRenewals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">تمدید نزدیکی وجود ندارد</p>
            ) : (
              upcomingRenewals.map(r => (
                <Link key={r.id} href="/dashboard/insurance/renewals">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="text-sm font-medium">
                        {r.reminderDate ? formatJalali(r.reminderDate) : 'بدون تاریخ'}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.status}</div>
                    </div>
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">خلاصه کارمزدها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commissions.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="text-sm">
                    <Badge variant="secondary" className="text-xs ml-2">
                      {commissionStatusInfo(c.status).label}
                    </Badge>
                    {formatToman(Number(c.expectedAmount) || 0)} تومان
                  </div>
                  <div className="text-xs text-muted-foreground">
                    پرداخت‌شده: {formatToman(Number(c.paidAmount) || 0)}
                  </div>
                </div>
              ))}
              {commissions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">کارمزدی ثبت نشده است</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">خلاصه پرداخت‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="text-sm">
                    {formatToman(Number(p.amount) || 0)} تومان
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.status === 'paid' ? 'پرداخت‌شده' : p.status === 'partial' ? 'پرداخت جزئی' : 'پرداخت‌نشده'}
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">پرداختی ثبت نشده است</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
