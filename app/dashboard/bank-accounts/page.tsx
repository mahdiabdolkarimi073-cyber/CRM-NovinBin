'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Landmark, Plus, Search, Trash2, CreditCard, Building2, Calendar, User,
  Hash, Wallet,
} from 'lucide-react';
import { formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import type { BankAccount } from '@/lib/types';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  current: 'جاری',
  savings: 'پس‌انداز',
  fixed: 'مدت‌دار',
};
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  current: '#3155E7',
  savings: '#10b981',
  fixed: '#f59e0b',
};

export default function BankAccountsPage() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<BankAccount>('bank_accounts', {
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      setAccounts(data || []);
    } catch (error: any) {
      toast.error('بارگذاری حساب‌های بانکی ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return accounts.filter((a) => {
      const matchesQuery = !query
        || (a.accountNumber || '').toLocaleLowerCase().includes(query)
        || (a.bankName || '').toLocaleLowerCase().includes(query)
        || (a.cardNumber || '').toLocaleLowerCase().includes(query)
        || (a.iban || '').toLocaleLowerCase().includes(query)
        || (a.cardHolderName || '').toLocaleLowerCase().includes(query)
        || (a.name || '').toLocaleLowerCase().includes(query);
      const matchesType = filterType === 'all' || a.accountType === filterType;
      return matchesQuery && matchesType;
    });
  }, [accounts, search, filterType]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این حساب بانکی؟')) return;
    try {
      await deleteData('bank_accounts', { id });
      toast.success('حساب بانکی حذف شد');
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const stats = useMemo(() => ({
    total: accounts.length,
    current: accounts.filter((a) => a.accountType === 'current').length,
    savings: accounts.filter((a) => a.accountType === 'savings').length,
    fixed: accounts.filter((a) => a.accountType === 'fixed').length,
  }), [accounts]);

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">حساب‌های بانکی</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> حساب‌های بانکی</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/bank-accounts/new">
            <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
              <Plus className="h-4 w-4" /> ایجاد حساب بانکی
            </Button>
          </Link>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Landmark className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل حساب‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><CreditCard className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.current.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">حساب‌های جاری</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><Wallet className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.savings.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">حساب‌های پس‌انداز</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Calendar className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.fixed.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">حساب‌های مدت‌دار</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجوی شماره حساب، بانک، کارت..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[320px]" />
        </div>
        <div className="flex items-center gap-2">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه انواع</option>
            <option value="current">جاری</option>
            <option value="savings">پس‌انداز</option>
            <option value="fixed">مدت‌دار</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : accounts.length === 0 ? (
        <Card><EmptyState icon={<Landmark className="h-8 w-8" />} title="حساب بانکی یافت نشد" description="برای شروع، اولین حساب بانکی را ایجاد کنید" action={<Link href="/dashboard/bank-accounts/new"><Button><Plus className="h-4 w-4" /> افزودن حساب بانکی</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((a) => {
              const typeColor = ACCOUNT_TYPE_COLORS[a.accountType] || '#64748b';
              const displayName = a.name || a.bankName || 'حساب نامشخص';
              return (
                <div key={a.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EFF4FF] text-[#2563EB]"><Landmark className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{displayName}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: typeColor, borderColor: `${typeColor}35`, backgroundColor: `${typeColor}10` }}>{ACCOUNT_TYPE_LABELS[a.accountType] || a.accountType}</Badge>
                      {!a.active && <Badge variant="outline" className="shrink-0 text-[10px] text-[#98A2B3]">غیرفعال</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                      <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{a.accountNumber || a.accountNo}</span>
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{a.bankName}</span>
                      {a.branchName && <span>شعبه: {a.branchName}</span>}
                      {a.cardNumber && <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />{a.cardNumber}</span>}
                      {a.iban && <span>IR{a.iban}</span>}
                      {a.cardHolderName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.cardHolderName}</span>}
                      {a.openingDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(a.openingDate)}</span>}
                      {a.detailTitle && <span>تفصیل: {a.detailTitle}</span>}
                      {a.detailCode && <span>کد: {a.detailCode}</span>}
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(a.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500" title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <div className="py-12 text-center text-sm text-[#CBD5E1]">نتیجه‌ای یافت نشد</div>}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
