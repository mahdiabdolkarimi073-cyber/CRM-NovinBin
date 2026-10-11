'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Loader2 } from 'lucide-react';
import { formatJalali, formatToman } from '@/lib/format';
import {
  INSURANCE_TYPES, INSURANCE_RENEWAL_STATUSES, INSURANCE_PAYMENT_STATUSES,
  INSURANCE_CLAIM_STATUSES, fullName,
} from '@/lib/constants';
import type { InsurancePolicy, InsuranceRenewal, InsurancePayment, InsuranceClaim, Customer } from '@/lib/types';

const typeLabel = (code: string) => INSURANCE_TYPES.find(t => t.key === code)?.label || code;
const renewalStatusInfo = (k: string) => INSURANCE_RENEWAL_STATUSES.find(s => s.key === k) || INSURANCE_RENEWAL_STATUSES[0];
const paymentStatusInfo = (k: string) => INSURANCE_PAYMENT_STATUSES.find(s => s.key === k) || INSURANCE_PAYMENT_STATUSES[0];
const claimStatusInfo = (k: string) => INSURANCE_CLAIM_STATUSES.find(s => s.key === k) || INSURANCE_CLAIM_STATUSES[0];

type CalendarItem = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  badge: { label: string; color: string };
  category: 'policy_end' | 'renewal' | 'payment' | 'claim';
};

export default function InsuranceCalendarPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');

  const loadAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [p, r, pm, cl, c] = await Promise.all([
        fetchData<InsurancePolicy>('insurance_policies', { take: 500 }),
        fetchData<InsuranceRenewal>('insurance_renewals', { take: 200 }),
        fetchData<InsurancePayment>('insurance_payments', { take: 200 }),
        fetchData<InsuranceClaim>('insurance_claims', { take: 200 }),
        fetchData<Customer>('customers', { take: 200 }),
      ]);
      setCustomers(c || []);

      const result: CalendarItem[] = [];

      (p || []).forEach(pol => {
        if (pol.endDate && pol.issueStatus !== 'voided') {
          const cust = (c || []).find(cu => cu.id === pol.customerId);
          result.push({
            id: `pol-${pol.id}`,
            date: pol.endDate,
            title: `پایان بیمه‌نامه ${pol.policyNumber}`,
            subtitle: `${typeLabel(pol.insuranceTypeCode || '')} - ${cust ? fullName(cust.firstName, cust.lastName, cust.companyName || '') : '—'}`,
            badge: { label: 'پایان بیمه‌نامه', color: '#f59e0b' },
            category: 'policy_end',
          });
        }
      });

      (r || []).forEach(ren => {
        if (ren.reminderDate) {
          result.push({
            id: `ren-${ren.id}`,
            date: ren.reminderDate,
            title: 'یادآوری تمدید',
            subtitle: renewalStatusInfo(ren.status).label,
            badge: { label: renewalStatusInfo(ren.status).label, color: renewalStatusInfo(ren.status).color },
            category: 'renewal',
          });
        }
      });

      (pm || []).forEach(pmt => {
        if (pmt.dueDate) {
          result.push({
            id: `pmt-${pmt.id}`,
            date: pmt.dueDate,
            title: `سررسید پرداخت ${formatToman(Number(pmt.amount) || 0)} تومان`,
            subtitle: paymentStatusInfo(pmt.status).label,
            badge: { label: paymentStatusInfo(pmt.status).label, color: paymentStatusInfo(pmt.status).color },
            category: 'payment',
          });
        }
      });

      (cl || []).forEach(clm => {
        if (clm.reportDate && clm.status !== 'closed' && clm.status !== 'fully_paid') {
          result.push({
            id: `clm-${clm.id}`,
            date: clm.reportDate,
            title: `خسارت ${clm.claimNumber}`,
            subtitle: claimStatusInfo(clm.status).label,
            badge: { label: claimStatusInfo(clm.status).label, color: claimStatusInfo(clm.status).color },
            category: 'claim',
          });
        }
      });

      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setItems(result);
    } catch (e: any) { console.error(e); }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    if (filterCategory === 'all') return items;
    return items.filter(i => i.category === filterCategory);
  }, [items, filterCategory]);

  const now = new Date();
  const upcoming = filtered.filter(i => new Date(i.date) >= now);
  const past = filtered.filter(i => new Date(i.date) < now).reverse();

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  const categoryLabels: Record<string, string> = {
    policy_end: 'پایان بیمه‌نامه',
    renewal: 'تمدید',
    payment: 'پرداخت',
    claim: 'خسارت',
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">تقویم سررسیدها</h1>
        <p className="text-sm text-muted-foreground mt-1">سررسید بیمه‌نامه‌ها، تمدیدها، پرداخت‌ها و خسارت‌ها</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌ها</SelectItem>
              {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>سررسیدی یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">رویدادهای پیش‌رو</h2>
              <div className="space-y-2">
                {upcoming.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-center flex-shrink-0 w-16">
                          <div className="text-xs text-muted-foreground">{formatJalali(item.date).split(' ')[1]}</div>
                          <div className="text-lg font-bold">{formatJalali(item.date).split(' ')[0]}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="text-sm text-muted-foreground truncate">{item.subtitle}</div>
                        </div>
                      </div>
                      <Badge style={{ backgroundColor: item.badge.color + '20', color: item.badge.color }} className="flex-shrink-0">
                        {item.badge.label}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">رویدادهای گذشته</h2>
              <div className="space-y-2">
                {past.map(item => (
                  <Card key={item.id} className="opacity-60">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-center flex-shrink-0 w-16">
                          <div className="text-xs text-muted-foreground">{formatJalali(item.date).split(' ')[1]}</div>
                          <div className="text-lg font-bold">{formatJalali(item.date).split(' ')[0]}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.title}</div>
                          <div className="text-sm text-muted-foreground truncate">{item.subtitle}</div>
                        </div>
                      </div>
                      <Badge style={{ backgroundColor: item.badge.color + '20', color: item.badge.color }} className="flex-shrink-0">
                        {item.badge.label}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
