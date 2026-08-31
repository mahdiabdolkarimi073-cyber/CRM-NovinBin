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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Contact, Plus, Search, Trash2, Building2, User, Phone, Mail, MapPin,
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
        include: { contact_related_persons: true, contact_addresses: true, contact_phones: true },
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

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">طرف حساب</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> طرف حساب</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/contact-parties/new">
            <Button className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
              <Plus className="h-4 w-4" /> ایجاد طرف حساب
            </Button>
          </Link>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#3155E7]/10 text-[#3155E7]"><Contact className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.total.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">کل طرف حساب‌ها</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#10b981]/10 text-[#10b981]"><User className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.individuals.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">اشخاص حقیقی</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Building2 className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.companies.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">اشخاص حقوقی</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6]"><Wallet className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.suppliers.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">تامین‌کنندگان</div></div>
        </div>
        <div className="flex min-h-[120px] flex-col justify-between rounded-[14px] border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#06b6d4]/10 text-[#06b6d4]"><Tag className="h-5 w-5" strokeWidth={2.5} /></span>
          <div><div className="text-[26px] font-bold leading-none text-[#101828]">{stats.customers.toLocaleString('fa-IR')}</div><div className="mt-1.5 text-[13px] font-bold text-[#344054]">مشتریان</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#98A2B3]" />
          <Input placeholder="جستجوی طرف حساب..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-[42px] w-full rounded-[10px] border-[#DCE3EE] bg-white pr-9 text-sm sm:w-[300px]" />
        </div>
        <div className="flex items-center gap-2">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه انواع</option>
            <option value="individual">حقیقی</option>
            <option value="company">حقوقی</option>
          </select>
          <select value={filterDetail} onChange={(e) => setFilterDetail(e.target.value)} className="h-[42px] rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
            <option value="all">همه جزئیات</option>
            <option value="supplier">تامین‌کننده</option>
            <option value="customer">مشتری</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#2563EB] border-t-transparent" /></div>
      ) : contacts.length === 0 ? (
        <Card><EmptyState icon={<Contact className="h-8 w-8" />} title="طرف حسابی یافت نشد" description="برای شروع، اولین طرف حساب را ایجاد کنید" action={<Link href="/dashboard/contact-parties/new"><Button><Plus className="h-4 w-4" /> افزودن طرف حساب</Button></Link>} /></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((c) => {
              const name = getDisplayName(c);
              const initial = name[0] || '؟';
              const phones = c.contact_phones || [];
              const persons = c.contact_related_persons || [];
              const addresses = c.contact_addresses || [];
              return (
                <div key={c.id} className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-[#F8FAFD]">
                  <Avatar className="h-11 w-11 shrink-0"><AvatarFallback className="bg-[#EFF4FF] text-sm text-[#2563EB]">{initial}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold text-[#1D2939]">{name}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: c.type === 'individual' ? '#10b981' : '#f59e0b', borderColor: c.type === 'individual' ? '#10b98135' : '#f59e0b35' }}>{TYPE_LABELS[c.type]}</Badge>
                      {c.detailType !== 'detail' && <Badge variant="outline" className="shrink-0 text-[10px]" style={{ color: DETAIL_COLORS[c.detailType], borderColor: `${DETAIL_COLORS[c.detailType]}35`, backgroundColor: `${DETAIL_COLORS[c.detailType]}10` }}>{DETAIL_LABELS[c.detailType]}</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
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
                    <button onClick={() => handleDelete(c.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition-colors hover:bg-rose-50 hover:text-rose-500" title="حذف">
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
