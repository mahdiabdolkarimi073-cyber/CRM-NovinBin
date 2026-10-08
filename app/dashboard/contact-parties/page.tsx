'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Contact, Plus, Search, Trash2, Building2, User, Phone, Mail, MapPin, X,
  Users as UsersIcon, Tag, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ContactParty } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = {
  individual: 'شخص حقیقی',
  company: 'شخص حقوقی',
};
const DETAIL_LABELS: Record<string, string> = {
  detail: '—',
  supplier: 'تامین‌کننده',
  customer: 'مشتری',
};
const DETAIL_COLORS: Record<string, string> = {
  detail: '#64748b',
  supplier: '#f59e0b',
  customer: '#10b981',
};

export default function ContactPartiesPage() {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<ContactParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDetail, setFilterDetail] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData<ContactParty>('contact_parties', {
        where: {},
        orderBy: { createdAt: 'desc' },
        include: { relatedPersons: true, addresses: true, phones: true },
      });
      setContacts(data || []);
    } catch (error: any) {
      toast.error('بارگذاری طرف حساب‌ها ناموفق: ' + error.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return contacts.filter((c) => {
      const name = c.type === 'individual'
        ? `${c.firstName || ''} ${c.lastName || ''}`.trim()
        : c.companyName || '';
      const matchesQuery = !query || name.toLocaleLowerCase().includes(query) || (c.nationalId || '').includes(query) || (c.companyName || '').toLocaleLowerCase().includes(query);
      const matchesType = filterType === 'all' || c.type === filterType;
      const matchesDetail = filterDetail === 'all' || c.detailType === filterDetail;
      return matchesQuery && matchesType && matchesDetail;
    });
  }, [contacts, search, filterType, filterDetail]);

  const handleDelete = async (id: string) => {
    if (!confirm('حذف این طرف حساب؟')) return;
    try {
      await deleteData('contact_parties', { id });
      toast.success('طرف حساب حذف شد');
      loadData();
    } catch (error: any) {
      toast.error('حذف ناموفق: ' + error.message);
    }
  };

  const getDisplayName = (c: ContactParty) => c.type === 'individual'
    ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'بدون نام'
    : c.companyName || 'بدون نام';

  const stats = useMemo(() => ({
    total: contacts.length,
    individuals: contacts.filter((c) => c.type === 'individual').length,
    companies: contacts.filter((c) => c.type === 'company').length,
    suppliers: contacts.filter((c) => c.detailType === 'supplier').length,
    customers: contacts.filter((c) => c.detailType === 'customer').length,
  }), [contacts]);

  const statsArr = useMemo(() => [
    { label: 'کل طرف حساب‌ها', value: stats.total, icon: Contact, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'اشخاص حقیقی', value: stats.individuals, icon: User, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
    { label: 'اشخاص حقوقی', value: stats.companies, icon: Building2, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.25)' },
    { label: 'تامین‌کنندگان', value: stats.suppliers, icon: Wallet, gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', glow: 'rgba(37,99,235,0.25)' },
    { label: 'مشتریان', value: stats.customers, icon: Tag, gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', glow: 'rgba(34,197,94,0.25)' },
  ], [stats]);

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#FF7A00,#E65100)', boxShadow: '0 0 12px rgba(255,122,0,.25)' }} />
              <h1>طرف حساب</h1>
            </div>
            <p>مدیریت اشخاص حقیقی، حقوقی، تامین‌کنندگان و مشتریان</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Link href="/dashboard/contact-parties/new" className="nb-new-btn">
            <Plus className="h-[18px] w-[18px]" />
            طرف حساب جدید
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
          <h2>همه طرف حساب‌ها</h2>
          <span className="nb-count-badge">{filtered.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی طرف حساب..."
            />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="nb-select-filter h-10 w-[140px] rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">همه انواع</option>
            <option value="individual">حقیقی</option>
            <option value="company">حقوقی</option>
          </select>
          <select value={filterDetail} onChange={(e) => setFilterDetail(e.target.value)} className="nb-select-filter h-10 w-[140px] rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">همه جزئیات</option>
            <option value="supplier">تامین‌کننده</option>
            <option value="customer">مشتری</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="nb-empty">
          <div className="sb-empty-icon"><Contact className="h-12 w-12 text-muted-foreground/30" /></div>
          <h3>طرف حسابی یافت نشد</h3>
          <p>برای شروع، اولین طرف حساب را ایجاد کنید</p>
          <Link href="/dashboard/contact-parties/new" className="nb-empty-new-btn"><Plus className="h-4 w-4" /> افزودن طرف حساب</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((c) => {
              const name = getDisplayName(c);
              const initial = name[0] || '؟';
              const phones = c.phones || [];
              const persons = c.relatedPersons || [];
              const addresses = c.addresses || [];
              return (
                <div key={c.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <Avatar className="h-11 w-11 shrink-0"><AvatarFallback className="bg-sky-100 text-sm text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{initial}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{name}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: c.type === 'individual' ? '#10b981' : '#f59e0b', borderColor: c.type === 'individual' ? '#10b98135' : '#f59e0b35' }}>{TYPE_LABELS[c.type]}</Badge>
                      {c.detailType !== 'detail' && <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: DETAIL_COLORS[c.detailType], borderColor: `${DETAIL_COLORS[c.detailType]}35`, backgroundColor: `${DETAIL_COLORS[c.detailType]}10` }}>{DETAIL_LABELS[c.detailType]}</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {c.nationalId && <span>کد ملی: {c.nationalId}</span>}
                      {c.companyName && c.type === 'company' && <span>شرکت: {c.companyName}</span>}
                      {phones.length > 0 && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{phones.length.toLocaleString('fa-IR')} تلفن</span>}
                      {persons.length > 0 && <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{persons.length.toLocaleString('fa-IR')} فرد مرتبط</span>}
                      {addresses.length > 0 && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{addresses.length.toLocaleString('fa-IR')} نشانی</span>}
                      {c.detailType === 'supplier' && c.supplierIdentity && <span>هویت: {c.supplierIdentity === 'debit' ? 'بدهکار' : 'بستانکار'}</span>}
                      {c.detailType === 'customer' && c.discountPercent > 0 && <span>تخفیف: {Number(c.discountPercent).toLocaleString('fa-IR')}%</span>}
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(c.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500" title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <div className="py-12 text-center text-sm text-slate-400">نتیجه‌ای یافت نشد</div>}
          </div>
        </div>
      )}
      <Link href="/dashboard/contact-parties/new" className="nb-fab" aria-label="طرف حساب جدید">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
