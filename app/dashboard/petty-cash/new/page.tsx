'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, Wallet, User, Building2, Landmark,
  Loader2, Plus, Hash, Calendar, ToggleLeft,
} from 'lucide-react';
import { toLocalDateString, formatToman } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type { BankAccount, Profile, ContactParty, Account } from '@/lib/types';

const CUSTODIAN_TYPES = [
  { key: 'fixed', label: 'ثابت' },
  { key: 'variable', label: 'متغیر' },
];

export default function NewPettyCashPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [personType, setPersonType] = useState<'contact_party' | 'profile'>('contact_party');
  const [contactPartyId, setContactPartyId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [code, setCode] = useState('');
  const [accountId, setAccountId] = useState('');
  const [ceiling, setCeiling] = useState('');
  const [type, setType] = useState('fixed');
  const [startDate, setStartDate] = useState('');
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [partyData, staffData, accData] = await Promise.all([
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
        fetchData<Account>('accounts', { where: {} }),
      ]);
      setContactParties(partyData || []);
      setStaff(staffData || []);
      setAccounts(accData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const partyLabel = (p: ContactParty) => {
    if (p.type === 'individual') return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام';
    return p.companyName || 'بدون نام';
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!code.trim()) e.code = 'کد تنخواه‌دار الزامی است';
    if (!ceiling.trim()) e.ceiling = 'سقف تنخواه الزامی است';
    if (personType === 'contact_party' && !contactPartyId) e.person = 'انتخاب طرف حساب الزامی است';
    if (personType === 'profile' && !profileId) e.person = 'انتخاب پرسنل الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data: Record<string, any> = {
        code: code.trim(),
        contactPartyId: personType === 'contact_party' ? contactPartyId : null,
        profileId: personType === 'profile' ? profileId : null,
        accountId: accountId || null,
        ceiling: Number(ceiling),
        type,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        active,
        description: description || null,
        createdBy: profile.id,
      };
      await createData('petty_cash_custodians', data);
      toast.success('تنخواه‌دار ایجاد شد');
      router.push('/dashboard/petty-cash');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ایجاد تنخواه‌دار جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> تنخواه‌دار <span className="mx-1.5 text-[#CBD5E1]">←</span> ایجاد</div>
        </div>
        <Link href="/dashboard/petty-cash">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Wallet className="h-5 w-5" /></span>
              <div>
                <h2 className="text-base font-bold text-[#1D2939]">اطلاعات تنخواه‌دار</h2>
                <p className="text-xs text-[#98A2B3]">شخص را به‌عنوان تنخواه‌دار تعریف کنید. این عمل به‌تنهایی سند مالی ایجاد نمی‌کند.</p>
              </div>
            </div>

            {/* Person type toggle */}
            <div className="mb-4">
              <Label className="mb-2 block text-sm font-semibold text-[#344054]">شخص / طرف حساب <span className="text-rose-500">*</span></Label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setPersonType('contact_party')} className={`flex items-center gap-2 rounded-[10px] border-2 p-4 text-sm font-semibold transition-all ${personType === 'contact_party' ? 'border-[#3155E7] bg-[#EFF4FF] text-[#3155E7]' : 'border-[#DCE3EE] bg-white text-[#667085] hover:border-[#BFD0FF]'}`}>
                  <Building2 className="h-5 w-5" /> طرف حساب
                </button>
                <button type="button" onClick={() => setPersonType('profile')} className={`flex items-center gap-2 rounded-[10px] border-2 p-4 text-sm font-semibold transition-all ${personType === 'profile' ? 'border-[#3155E7] bg-[#EFF4FF] text-[#3155E7]' : 'border-[#DCE3EE] bg-white text-[#667085] hover:border-[#BFD0FF]'}`}>
                  <User className="h-5 w-5" /> پرسنل
                </button>
              </div>
              {errors.person && <span className="mt-1 block text-xs text-rose-500">{errors.person}</span>}
            </div>

            {/* Select person */}
            {personType === 'contact_party' ? (
              <div className="mb-4 space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">انتخاب طرف حساب</Label>
                <Select value={contactPartyId} onValueChange={setContactPartyId}>
                  <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><SelectValue placeholder="انتخاب طرف حساب..." /></SelectTrigger>
                  <SelectContent>
                    {contactParties.map((p) => <SelectItem key={p.id} value={p.id}>{partyLabel(p)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="mb-4 space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">انتخاب پرسنل</Label>
                <Select value={profileId} onValueChange={setProfileId}>
                  <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><SelectValue placeholder="انتخاب پرسنل..." /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => <SelectItem key={s.id} value={s.id}>{fullName(s.firstName, s.lastName)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">کد تنخواه‌دار <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Hash className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثال: PC-001" className="h-[42px] rounded-[10px] border-[#DCE3EE] pr-9" />
                </div>
                {errors.code && <span className="text-xs text-rose-500">{errors.code}</span>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">حساب تفصیلی مرتبط</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون حساب</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">سقف تنخواه (تومان) <span className="text-rose-500">*</span></Label>
                <Input type="number" value={ceiling} onChange={(e) => setCeiling(e.target.value)} placeholder="مثال: 20000000" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                {errors.ceiling && <span className="text-xs text-rose-500">{errors.ceiling}</span>}
                {ceiling && <span className="text-xs text-[#98A2B3]">{formatToman(Number(ceiling))} تومان</span>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">نوع تنخواه</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTODIAN_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">تاریخ شروع فعالیت</Label>
                <JalaliDatePicker value={startDate ? new Date(startDate) : null} onChange={(d) => setStartDate(d ? toLocalDateString(d) : '')} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">وضعیت</Label>
                <button type="button" onClick={() => setActive(!active)} className={`flex h-[42px] w-full items-center justify-between rounded-[10px] border-2 px-4 text-sm font-semibold transition-all ${active ? 'border-[#10b981] bg-[#ECFDF5] text-[#10b981]' : 'border-[#DCE3EE] bg-white text-[#98A2B3]'}`}>
                  <span className="flex items-center gap-2"><ToggleLeft className="h-5 w-5" /> {active ? 'فعال' : 'غیرفعال'}</span>
                  <span className={`h-6 w-11 rounded-full transition-colors ${active ? 'bg-[#10b981]' : 'bg-[#CBD5E1]'} relative`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${active ? 'left-0.5' : 'right-0.5'}`} />
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
            </div>

            {/* Info box */}
            <div className="mt-5 rounded-[12px] border border-[#BFD0FF] bg-[#EFF4FF] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Landmark className="h-4 w-4" /></div>
                <div className="text-xs leading-6 text-[#344054]">
                  <p className="font-bold text-[#1D2939]">نکته مهم</p>
                  <p>تعریف تنخواه‌دار به‌تنهایی هیچ سند مالی ایجاد نمی‌کند. پس از تعریف، باید از طریق صفحه جزئیات، پرداخت‌های تنخواه را ثبت کنید تا مبلغ در اختیار تنخواه‌دار قرار گیرد.</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="mt-5 flex items-center justify-end gap-3">
              <Link href="/dashboard/petty-cash"><Button type="button" variant="outline" className="h-[42px] rounded-[10px]">انصراف</Button></Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</> : <><Plus className="h-4 w-4" /> ایجاد تنخواه‌دار</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
