'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Landmark, Plus, Search, Trash2, CreditCard, Building2, Calendar, User,
  Hash, Wallet, X,
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

  const statsArr = useMemo(() => [
    { label: 'کل حساب‌ها', value: stats.total, icon: Landmark, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'حساب‌های جاری', value: stats.current, icon: CreditCard, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'حساب‌های پس‌انداز', value: stats.savings, icon: Wallet, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
    { label: 'حساب‌های مدت‌دار', value: stats.fixed, icon: Calendar, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
  ], [stats]);

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>حساب‌های بانکی</h1>
            </div>
            <p>مدیریت حساب‌های بانکی سازمان</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/bank-accounts/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            حساب بانکی جدید
          </Link>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        {statsArr.map((stat) => (
          <div className="nb-stat-card-v2" key={stat.label} style={{ '--stat-glow': stat.glow } as React.CSSProperties}>
            <div className="nb-stat-v2-icon" style={{ background: stat.gradient }}>
              <stat.icon className="h-[22px] w-[22px] text-white" />
            </div>
            <div className="nb-stat-v2-body">
              <strong>{stat.value.toLocaleString('fa-IR')}</strong>
              <span>{stat.label}</span>
            </div>
            <div className="nb-stat-v2-spark" style={{ background: stat.gradient }} />
          </div>
        ))}
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>همه حساب‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی شماره حساب، بانک، کارت..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="nb-select-filter h-10 w-[140px] rounded-md border border-input bg-background px-3 text-sm">
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
        <div className="nb-empty">
          <div className="sb-empty-icon"><Landmark className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>حساب بانکی یافت نشد</h3>
          <p>برای شروع، اولین حساب بانکی را ایجاد کنید</p>
          <Link href="/dashboard/bank-accounts/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن حساب بانکی</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
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
        </div>
      )}
      <Link href="/dashboard/bank-accounts/new" className="nb-fab" aria-label="حساب بانکی جدید">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
