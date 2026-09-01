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
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, WalletCards, Building2, Calendar, Landmark, Loader2, Plus,
  Lightbulb, Info, Hash, User, FileText, AlertCircle, CheckSquare,
  Banknote,
} from 'lucide-react';
import { toLocalDateString, formatToman } from '@/lib/format';
import { toast } from 'sonner';
import type {
  ContactParty, BankAccount, CashFund,
} from '@/lib/types';

const guideItems = [
  { icon: Hash, title: 'شماره چک یکتا', desc: 'شماره چک باید یکتا و معتبر باشد.' },
  { icon: Building2, title: 'بانک صادرکننده', desc: 'بانک و شعبه صادرکننده چک را ثبت کنید.' },
  { icon: Calendar, title: 'سررسید', desc: 'تاریخ سررسید مبنای کنترل‌های واگذاری و وصول است.' },
  { icon: User, title: 'صادرکننده', desc: 'طرف حساب صادرکننده چک را انتخاب کنید.' },
  { icon: CheckSquare, title: 'محل نگهداری', desc: 'محل نگهداری چک (صندوق، خزانه) را مشخص کنید.' },
];

export default function NewReceivedChequePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashFunds, setCashFunds] = useState<CashFund[]>([]);

  const [chequeNumber, setChequeNumber] = useState('');
  const [sayadiNumber, setSayadiNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [issuerAccountNo, setIssuerAccountNo] = useState('');
  const [amount, setAmount] = useState(0);
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [issuerPartyId, setIssuerPartyId] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [subject, setSubject] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [cashFundId, setCashFundId] = useState('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [partyData, baData, cfData] = await Promise.all([
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<BankAccount>('bank_accounts', { where: { active: true } }),
        fetchData<CashFund>('cash_funds', { where: { active: true } }),
      ]);
      setContactParties(partyData || []);
      setBankAccounts(baData || []);
      setCashFunds(cfData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const partyName = (p: ContactParty) => {
    if (p.type === 'individual') return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام';
    return p.companyName || 'بدون نام';
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!chequeNumber) e.chequeNumber = 'شماره چک الزامی است';
    if (!bankName) e.bankName = 'نام بانک الزامی است';
    if (amount <= 0) e.amount = 'مبلغ باید بزرگتر از صفر باشد';
    if (!dueDate) e.dueDate = 'تاریخ سررسید الزامی است';
    if (!issueDate) e.issueDate = 'تاریخ صدور الزامی است';
    if (!issuerPartyId && !issuerName) e.issuer = 'صادرکننده الزامی است (طرف حساب یا نام)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const cheque = await createData('received_cheques', {
        number: `RC-${Date.now()}`,
        chequeNumber,
        sayadiNumber: sayadiNumber || null,
        bankName,
        branchName: branchName || null,
        issuerAccountNo: issuerAccountNo || null,
        amount,
        issueDate: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        issuerPartyId: issuerPartyId || null,
        issuerName: issuerName || null,
        receiverName: receiverName || null,
        subject: subject || null,
        cashFundId: cashFundId || null,
        storageLocation: storageLocation || (cashFundId ? 'صندوق' : null),
        status: 'received',
        description: description || null,
        createdBy: profile.id,
      }) as any;

      try {
        await createData('received_cheque_operations', {
          chequeId: cheque.id,
          operationType: 'receive',
          toStatus: 'received',
          operationDate: new Date().toISOString(),
          operationBy: profile.id,
          cashFundId: cashFundId || null,
          newLocation: storageLocation || (cashFundId ? 'صندوق' : null),
          details: { amount, chequeNumber, bankName },
        });
      } catch {}

      toast.success('چک دریافتی ثبت شد');
      router.push('/dashboard/received-cheques');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت چک دریافتی</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> چک‌های دریافتی <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/received-cheques">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><WalletCards className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات چک</h2>
                    <p className="text-xs text-[#98A2B3]">اطلاعات پایه و مالی چک را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره چک <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <Hash className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                      <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="شماره چک..." className="h-[42px] rounded-[10px] border-[#DCE3EE] pr-9" />
                    </div>
                    {errors.chequeNumber && <span className="text-xs text-rose-500">{errors.chequeNumber}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شناسه صیادی</Label>
                    <Input value={sayadiNumber} onChange={(e) => setSayadiNumber(e.target.value)} placeholder="شناسه صیادی (اختیاری)..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">بانک <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="نام بانک..." className="h-[42px] rounded-[10px] border-[#DCE3EE] pr-9" />
                    </div>
                    {errors.bankName && <span className="text-xs text-rose-500">{errors.bankName}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شعبه</Label>
                    <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="نام شعبه..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره حساب صادرکننده</Label>
                    <Input value={issuerAccountNo} onChange={(e) => setIssuerAccountNo(e.target.value)} placeholder="شماره حساب..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مبلغ <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <Banknote className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                      <Input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="مبلغ چک (تومان)..." className="h-[42px] rounded-[10px] border-[#DCE3EE] pr-9" />
                    </div>
                    {amount > 0 && <span className="text-xs text-[#3155E7] font-semibold">{formatToman(amount)} تومان</span>}
                    {errors.amount && <span className="text-xs text-rose-500">{errors.amount}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ صدور <span className="text-rose-500">*</span></Label>
                    <div className="date-input-wrap">
                      <span className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-3">
                        <Calendar className="h-4 w-4 text-[#98A2B3]" />
                        <JalaliDatePicker value={issueDate ? new Date(issueDate) : null} onChange={(d) => setIssueDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="h-[42px] flex-1 border-0 p-0 focus:ring-0" />
                      </span>
                    </div>
                    {errors.issueDate && <span className="text-xs text-rose-500">{errors.issueDate}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ سررسید <span className="text-rose-500">*</span></Label>
                    <div className="date-input-wrap">
                      <span className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-3">
                        <Calendar className="h-4 w-4 text-[#98A2B3]" />
                        <JalaliDatePicker value={dueDate ? new Date(dueDate) : null} onChange={(d) => setDueDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="h-[42px] flex-1 border-0 p-0 focus:ring-0" />
                      </span>
                    </div>
                    {errors.dueDate && <span className="text-xs text-rose-500">{errors.dueDate}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parties */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/10 text-[#10b981]"><User className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات طرفین</h2>
                    <p className="text-xs text-[#98A2B3]">صادرکننده و دریافت‌کننده چک را مشخص کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">صادرکننده (طرف حساب)</Label>
                    <Select value={issuerPartyId} onValueChange={setIssuerPartyId}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><User className="h-4 w-4 text-[#98A2B3]" /><SelectValue placeholder="انتخاب طرف حساب..." /></SelectTrigger>
                      <SelectContent>{contactParties.map((p) => <SelectItem key={p.id} value={p.id}>{partyName(p)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نام صادرکننده (دستی)</Label>
                    <Input value={issuerName} onChange={(e) => setIssuerName(e.target.value)} placeholder="اگر طرف حساب انتخاب نشده..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">دریافت‌کننده</Label>
                    <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="نام دریافت‌کننده..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">بابت</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="بابت..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>
                {errors.issuer && <span className="mt-2 block text-xs text-rose-500">{errors.issuer}</span>}
              </CardContent>
            </Card>

            {/* Storage */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f59e0b]/10 text-[#f59e0b]"><Landmark className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">محل نگهداری</h2>
                    <p className="text-xs text-[#98A2B3]">محل فعلی نگهداری چک را مشخص کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">صندوق نقدی</Label>
                    <Select value={cashFundId || '__none__'} onValueChange={(v) => setCashFundId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><WalletCards className="h-4 w-4 text-[#98A2B3]" /><SelectValue placeholder="انتخاب صندوق..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">بدون صندوق</SelectItem>
                        {cashFunds.map((cf) => <SelectItem key={cf.id} value={cf.id}>{cf.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">محل نگهداری (متنی)</Label>
                    <Input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="مثلاً: صندوق، خزانه..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/received-cheques"><Button type="button" variant="outline" className="h-[42px] rounded-[10px]">انصراف</Button></Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت چک دریافتی</>}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f59e0b]/10 text-[#f59e0b]"><Lightbulb className="h-5 w-5" /></span>
                <h2 className="text-sm font-bold text-[#101828]">راهنما و نکات</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F1F5F9] text-[#667085]"><item.icon className="h-4 w-4" /></span>
                      <div>
                        <strong className="text-xs text-[#344054]">{item.title}</strong>
                        <p className="mt-0.5 text-[11px] leading-5 text-[#98A2B3]">{item.desc}</p>
                      </div>
                    </div>
                    {i < guideItems.length - 1 && <div className="my-2 border-t border-[#F1F5F9]" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[14px] border border-[#BFD0FF] bg-[#EFF4FF] p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Info className="h-5 w-5" /></span>
                <h2 className="text-sm font-bold text-[#101828]">اطلاعات مفید</h2>
              </div>
              <p className="text-xs leading-6 text-[#344054]">چک دریافتی پس از ثبت در وضعیت «دریافت‌شده» قرار می‌گیرد. سپس می‌توانید آن را به بانک واگذار کنید، وصول کنید، یا در صورت نیاز برگشت، استرداد یا انتقال دهید. تمام عملیات در گردش چک ثبت می‌شود.</p>
            </div>

            {amount > 0 && (
              <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
                <h2 className="mb-3 text-sm font-bold text-[#101828]">خلاصه</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#98A2B3]">شماره چک</span><span className="font-bold text-[#344054]">{chequeNumber || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">بانک</span><span className="font-bold text-[#344054]">{bankName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">مبلغ</span><span className="font-bold text-[#3155E7]">{formatToman(amount)} تومان</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </form>
    </div>
  );
}
