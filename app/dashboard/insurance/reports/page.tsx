'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  FileBarChart, Loader2, Download,
} from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import {
  INSURANCE_TYPES, INSURANCE_ISSUE_STATUSES, INSURANCE_PAYMENT_STATUSES,
  INSURANCE_CLAIM_STATUSES, fullName,
} from '@/lib/constants';
import type { InsurancePolicy, InsuranceClaim, InsuranceCommission, InsurancePayment, InsuranceCompany, Customer } from '@/lib/types';

const typeLabel = (code: string) => INSURANCE_TYPES.find(t => t.key === code)?.label || code;
const issueStatusInfo = (k: string) => INSURANCE_ISSUE_STATUSES.find(s => s.key === k) || INSURANCE_ISSUE_STATUSES[0];

export default function InsuranceReportsPage() {
  const { profile } = useAuth();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [commissions, setCommissions] = useState<InsuranceCommission[]>([]);
  const [payments, setPayments] = useState<InsurancePayment[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('summary');

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [p, cl, cm, pm, c, cust] = await Promise.all([
        fetchData<InsurancePolicy>('insurance_policies', { take: 500 }),
        fetchData<InsuranceClaim>('insurance_claims', { take: 500 }),
        fetchData<InsuranceCommission>('insurance_commissions', { take: 500 }),
        fetchData<InsurancePayment>('insurance_payments', { take: 500 }),
        fetchData<InsuranceCompany>('insurance_companies', {}),
        fetchData<Customer>('customers', { take: 300 }),
      ]);
      setPolicies(p || []);
      setClaims(cl || []);
      setCommissions(cm || []);
      setPayments(pm || []);
      setCompanies(c || []);
      setCustomers(cust || []);
    } catch (e: any) { console.error(e); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const customerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find(c => c.id === id);
    return c ? fullName(c.firstName, c.lastName, c.companyName || '—') : '—';
  };
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || '—';

  const stats = useMemo(() => {
    const active = policies.filter(p => p.issueStatus === 'issued');
    const pending = policies.filter(p => p.issueStatus === 'pending');
    const voided = policies.filter(p => p.issueStatus === 'voided');
    const totalPremium = policies.reduce((s, p) => s + (Number(p.finalAmount) || 0), 0);
    const openClaims = claims.filter(c => c.status !== 'closed' && c.status !== 'fully_paid');
    const totalClaimAmount = claims.reduce((s, c) => s + (Number(c.claimedAmount) || 0), 0);
    const totalPaidClaims = claims.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
    const totalCommission = commissions.reduce((s, c) => s + (Number(c.expectedAmount) || 0), 0);
    const paidCommission = commissions.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
    const totalPayments = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const collectedPayments = payments.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);

    return {
      total: policies.length, active: active.length, pending: pending.length, voided: voided.length,
      totalPremium, openClaims: openClaims.length, totalClaims: claims.length,
      totalClaimAmount, totalPaidClaims, totalCommission, paidCommission,
      totalPayments, collectedPayments,
    };
  }, [policies, claims, commissions, payments]);

  const byType = useMemo(() => {
    const map: Record<string, { count: number; premium: number }> = {};
    policies.forEach(p => {
      const code = p.insuranceTypeCode || 'other';
      if (!map[code]) map[code] = { count: 0, premium: 0 };
      map[code].count++;
      map[code].premium += Number(p.finalAmount) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [policies]);

  const byCompany = useMemo(() => {
    const map: Record<string, { count: number; premium: number; claims: number }> = {};
    policies.forEach(p => {
      const cid = p.companyId || 'unknown';
      if (!map[cid]) map[cid] = { count: 0, premium: 0, claims: 0 };
      map[cid].count++;
      map[cid].premium += Number(p.finalAmount) || 0;
    });
    claims.forEach(c => {
      const cid = c.companyId || 'unknown';
      if (!map[cid]) map[cid] = { count: 0, premium: 0, claims: 0 };
      map[cid].claims++;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [policies, claims]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">گزارش‌های بیمه</h1>
          <p className="text-sm text-muted-foreground mt-1">تحلیل و گزارش‌گیری ماژول بیمه</p>
        </div>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="summary">گزارش خلاصه</SelectItem>
            <SelectItem value="by_type">گزارش بر اساس رشته</SelectItem>
            <SelectItem value="by_company">گزارش بر اساس شرکت</SelectItem>
            <SelectItem value="claims">گزارش خسارت‌ها</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reportType === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">کل بیمه‌نامه‌ها</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">فعال</div><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">در انتظار</div><div className="text-2xl font-bold text-orange-600">{stats.pending}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">ابطال‌شده</div><div className="text-2xl font-bold text-red-600">{stats.voided}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">کل پریمیوم</div><div className="text-xl font-bold">{formatToman(stats.totalPremium)} تومان</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">پرداخت جمع‌آوری‌شده</div><div className="text-xl font-bold text-green-600">{formatToman(stats.collectedPayments)} تومان</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">خسارت‌های باز</div><div className="text-xl font-bold">{stats.openClaims}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">کل مبلغ ادعا</div><div className="text-xl font-bold">{formatToman(stats.totalClaimAmount)} تومان</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">پرداخت خسارت</div><div className="text-xl font-bold text-green-600">{formatToman(stats.totalPaidClaims)} تومان</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">کارمزد مورد انتظار</div><div className="text-xl font-bold">{formatToman(stats.totalCommission)} تومان</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">کارمزد پرداخت‌شده</div><div className="text-xl font-bold text-green-600">{formatToman(stats.paidCommission)} تومان</div></CardContent></Card>
          </div>
        </div>
      )}

      {reportType === 'by_type' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-right"><th className="pb-2 pr-2 font-medium">رشته</th><th className="pb-2 font-medium">تعداد</th><th className="pb-2 font-medium">پریمیوم</th></tr></thead>
            <tbody>
              {byType.map(([code, data]) => (
                <tr key={code} className="border-b"><td className="py-2 pr-2 font-medium">{typeLabel(code)}</td><td className="py-2">{data.count}</td><td className="py-2">{formatToman(data.premium)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'by_company' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-right"><th className="pb-2 pr-2 font-medium">شرکت</th><th className="pb-2 font-medium">بیمه‌نامه</th><th className="pb-2 font-medium">پریمیوم</th><th className="pb-2 font-medium">خسارت</th></tr></thead>
            <tbody>
              {byCompany.map(([cid, data]) => (
                <tr key={cid} className="border-b"><td className="py-2 pr-2 font-medium">{companyName(cid)}</td><td className="py-2">{data.count}</td><td className="py-2">{formatToman(data.premium)}</td><td className="py-2">{data.claims}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportType === 'claims' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-right"><th className="pb-2 pr-2 font-medium">شماره</th><th className="pb-2 font-medium">مشتری</th><th className="pb-2 font-medium">مبلغ ادعا</th><th className="pb-2 font-medium">تأییدشده</th><th className="pb-2 font-medium">پرداخت‌شده</th><th className="pb-2 font-medium">وضعیت</th></tr></thead>
            <tbody>
              {claims.map(c => {
                const info = INSURANCE_CLAIM_STATUSES.find(s => s.key === c.status) || INSURANCE_CLAIM_STATUSES[0];
                return (
                  <tr key={c.id} className="border-b">
                    <td className="py-2 pr-2 font-medium">{c.claimNumber}</td>
                    <td className="py-2">{customerName(c.customerId)}</td>
                    <td className="py-2">{formatToman(Number(c.claimedAmount) || 0)}</td>
                    <td className="py-2">{formatToman(Number(c.approvedAmount) || 0)}</td>
                    <td className="py-2">{formatToman(Number(c.paidAmount) || 0)}</td>
                    <td className="py-2"><Badge style={{ backgroundColor: info.color + '20', color: info.color }}>{info.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
