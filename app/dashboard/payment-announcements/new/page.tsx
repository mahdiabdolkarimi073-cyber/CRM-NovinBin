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
  ArrowRight, Megaphone, Plus, Trash2, Calendar, Landmark,
  ArrowDownToLine, FileText, Wallet, Loader2,
} from 'lucide-react';
import { toLocalDateString, formatToman } from '@/lib/format';
import { toast } from 'sonner';
import type { BankAccount, Profile, ContactParty } from '@/lib/types';

type WithdrawalRow = {
  transferNumber: string;
  date: string;
  amount: string;
  bankAccountId: string;
  bankFee: string;
  description: string;
};

type ChequeRow = {
  bankAccountId: string;
  chequeNumber: string;
  sayadiNumber: string;
  amount: string;
  date: string;
  type: string;
  description: string;
};

const COUNTERPARTY_OPTIONS = [
  { key: 'super_admin', label: 'سوپرادمین' },
  { key: 'admin', label: 'ادمین' },
  { key: 'personnel', label: 'پرسنل' },
  { key: 'customer', label: 'مشتری' },
  { key: 'contact_party', label: 'طرف حساب' },
];

const ANNOUNCEMENT_TYPES = [
  'پرداخت حقوق',
  'پرداخت آوراگل',
  'پرداخت پاداش',
  'پرداخت هزینه',
  'پرداخت وام',
  'پرداخت اجاره',
  'پرداخت خرید',
  'سایر',
];

const CHEQUE_TYPES = [
  { key: 'received', label: 'دریافتی' },
  { key: 'issued', label: 'صادری' },
];

export default function NewPaymentAnnouncementPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [contactParties, setContactParties] = useState<ContactParty[]>([]);

  const [type, setType] = useState(ANNOUNCEMENT_TYPES[0]);
  const [counterparty, setCounterparty] = useState('personnel');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [date, setDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankFee, setBankFee] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [cheques, setCheques] = useState<ChequeRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [bankData, staffData, partyData] = await Promise.all([
        fetchData<BankAccount>('bank_accounts', { where: {} }),
        fetchData<Profile>('profiles', { where: {} }),
        fetchData<ContactParty>('contact_parties', { where: {} }),
      ]);
      setBankAccounts(bankData || []);
      setStaff(staffData || []);
      setContactParties(partyData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const counterpartyOptions = (() => {
    if (counterparty === 'customer' || counterparty === 'personnel' || counterparty === 'admin' || counterparty === 'super_admin') {
      return staff.filter((s) => {
        if (counterparty === 'customer') return s.userType === 'customer';
        if (counterparty === 'personnel') return s.role === 'personnel';
        if (counterparty === 'admin') return s.role === 'admin';
        if (counterparty === 'super_admin') return s.role === 'super_admin' || s.role === 'owner';
        return true;
      });
    }
    if (counterparty === 'contact_party') return contactParties;
    return [];
  })();

  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const totalCheques = cheques.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!type) { toast.error('نوع اعلامیه را انتخاب کنید'); return; }
    if (!amount) { toast.error('مبلغ پرداخت را وارد کنید'); return; }
    setSubmitting(true);
    try {
      const data: Record<string, any> = {
        type,
        counterparty,
        counterpartyId: counterpartyId || null,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        bankAccountId: bankAccountId || null,
        bankFee: bankFee ? Number(bankFee) : 0,
        amount: Number(amount),
        description: description || null,
        status: 'draft',
        createdBy: profile.id,
      };

      if (withdrawals.length > 0) {
        data.withdrawals = {
          create: withdrawals.filter((w) => w.transferNumber.trim()).map((w) => ({
            transferNumber: w.transferNumber.trim(),
            date: w.date ? new Date(w.date).toISOString() : new Date().toISOString(),
            amount: Number(w.amount) || 0,
            bankAccountId: w.bankAccountId || null,
            bankFee: w.bankFee ? Number(w.bankFee) : 0,
            description: w.description || null,
            createdBy: profile.id,
          })),
        };
      }

      if (cheques.length > 0) {
        data.cheques = {
          create: cheques.filter((c) => c.chequeNumber.trim()).map((c) => ({
            bankAccountId: c.bankAccountId || null,
            chequeNumber: c.chequeNumber.trim(),
            sayadiNumber: c.sayadiNumber || null,
            amount: Number(c.amount) || 0,
            date: c.date ? new Date(c.date).toISOString() : new Date().toISOString(),
            type: c.type || 'received',
            description: c.description || null,
            createdBy: profile.id,
          })),
        };
      }

      await createData('payment_announcements', data);
      toast.success('اعلامیه پرداخت ایجاد شد');
      router.push('/dashboard/payment-announcements');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const addWithdrawal = () => setWithdrawals([...withdrawals, { transferNumber: '', date: '', amount: '', bankAccountId: '', bankFee: '', description: '' }]);
  const removeWithdrawal = (i: number) => setWithdrawals(withdrawals.filter((_, idx) => idx !== i));
  const updateWithdrawal = (i: number, field: keyof WithdrawalRow, val: string) => setWithdrawals(withdrawals.map((w, idx) => idx === i ? { ...w, [field]: val } : w));

  const addCheque = () => setCheques([...cheques, { bankAccountId: '', chequeNumber: '', sayadiNumber: '', amount: '', date: '', type: 'received', description: '' }]);
  const removeCheque = (i: number) => setCheques(cheques.filter((_, idx) => idx !== i));
  const updateCheque = (i: number, field: keyof ChequeRow, val: string) => setCheques(cheques.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const partyLabel = (p: ContactParty) => {
    if (p.type === 'individual') return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام';
    return p.companyName || 'بدون نام';
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">اعلامیه پرداخت جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> اعلامیه‌های پرداخت <span className="mx-1.5 text-[#CBD5E1]">←</span> ایجاد</div>
        </div>
        <Link href="/dashboard/payment-announcements">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Main info */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Megaphone className="h-5 w-5" /></span>
              <div>
                <h2 className="text-base font-bold text-[#1D2939]">اطلاعات اعلامیه</h2>
                <p className="text-xs text-[#98A2B3]">جزئیات اصلی اعلامیه پرداخت را وارد کنید</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">نوع اعلامیه <span className="text-rose-500">*</span></Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><SelectValue /></SelectTrigger>
                  <SelectContent>{ANNOUNCEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">طرف مقابل <span className="text-rose-500">*</span></Label>
                <Select value={counterparty} onValueChange={(v) => { setCounterparty(v); setCounterpartyId(''); }}>
                  <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTERPARTY_OPTIONS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {counterpartyOptions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">انتخاب {COUNTERPARTY_OPTIONS.find((c) => c.key === counterparty)?.label || ''}</Label>
                  <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                    <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><SelectValue placeholder="انتخاب کنید..." /></SelectTrigger>
                    <SelectContent>
                      {counterparty === 'contact_party'
                        ? counterpartyOptions.map((p: any) => <SelectItem key={p.id} value={p.id}>{partyLabel(p)}</SelectItem>)
                        : (counterpartyOptions as Profile[]).map((s) => <SelectItem key={s.id} value={s.id}>{`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">تاریخ اعلامیه</Label>
                <JalaliDatePicker value={date ? new Date(date) : null} onChange={(d) => setDate(d ? toLocalDateString(d) : '')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">حساب بانکی</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون حساب</SelectItem>
                    {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">مبلغ پرداخت (تومان) <span className="text-rose-500">*</span></Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثال: 5000000" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#344054]">کارمزد بانکی (تومان)</Label>
                <Input type="number" value={bankFee} onChange={(e) => setBankFee(e.target.value)} placeholder="مثال: 5000" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawals */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#06b6d4]/10 text-[#06b6d4]"><ArrowDownToLine className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-base font-bold text-[#1D2939]">اعلامیه‌های برداشت</h2>
                  <p className="text-xs text-[#98A2B3]">حواله‌های پرداخت مرتبط با این اعلامیه</p>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={addWithdrawal} className="h-9 rounded-[10px]"><Plus className="h-4 w-4" /> افزودن</Button>
            </div>
            {withdrawals.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#CBD5E1]">اعلامیه برداشتی اضافه نشده است</div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w, i) => (
                  <div key={i} className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#667085]">برداشت {(i + 1).toLocaleString('fa-IR')}</span>
                      <button type="button" onClick={() => removeWithdrawal(i)} className="text-[#98A2B3] transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">شماره حواله</Label>
                        <Input value={w.transferNumber} onChange={(e) => updateWithdrawal(i, 'transferNumber', e.target.value)} placeholder="مثال: 12345" className="h-9 rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">تاریخ</Label>
                        <JalaliDatePicker value={w.date ? new Date(w.date) : null} onChange={(d) => updateWithdrawal(i, 'date', d ? toLocalDateString(d) : '')} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">مبلغ (تومان)</Label>
                        <Input type="number" value={w.amount} onChange={(e) => updateWithdrawal(i, 'amount', e.target.value)} placeholder="مثال: 1000000" className="h-9 rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">حساب بانکی</Label>
                        <Select value={w.bankAccountId} onValueChange={(v) => updateWithdrawal(i, 'bankAccountId', v)}>
                          <SelectTrigger className="h-9 rounded-[8px] text-sm"><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">بدون حساب</SelectItem>
                            {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">کارمزد بانکی</Label>
                        <Input type="number" value={w.bankFee} onChange={(e) => updateWithdrawal(i, 'bankFee', e.target.value)} placeholder="مثال: 3000" className="h-9 rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">توضیحات</Label>
                        <Input value={w.description} onChange={(e) => updateWithdrawal(i, 'description', e.target.value)} placeholder="اختیاری" className="h-9 rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-[10px] bg-[#EFF4FF] px-4 py-2.5 text-sm font-semibold text-[#3155E7]">
                  مجموع برداشت‌ها: {formatToman(totalWithdrawals)} تومان
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cheques */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f59e0b]/10 text-[#f59e0b]"><FileText className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-base font-bold text-[#1D2939]">چک‌های من</h2>
                  <p className="text-xs text-[#98A2B3]">چک‌های دریافتی یا صادری مرتبط با این اعلامیه</p>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={addCheque} className="h-9 rounded-[10px]"><Plus className="h-4 w-4" /> افزودن</Button>
            </div>
            {cheques.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#CBD5E1]">چکی اضافه نشده است</div>
            ) : (
              <div className="space-y-3">
                {cheques.map((c, i) => (
                  <div key={i} className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#667085]">چک {(i + 1).toLocaleString('fa-IR')}</span>
                      <button type="button" onClick={() => removeCheque(i)} className="text-[#98A2B3] transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">حساب بانکی</Label>
                        <Select value={c.bankAccountId} onValueChange={(v) => updateCheque(i, 'bankAccountId', v)}>
                          <SelectTrigger className="h-9 rounded-[8px] text-sm"><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">بدون حساب</SelectItem>
                            {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">شماره چک</Label>
                        <Input value={c.chequeNumber} onChange={(e) => updateCheque(i, 'chequeNumber', e.target.value)} placeholder="مثال: 9876543" className="h-9 rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">شماره صیادی</Label>
                        <Input value={c.sayadiNumber} onChange={(e) => updateCheque(i, 'sayadiNumber', e.target.value)} placeholder="اختیاری" className="h-9 rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">مبلغ (تومان)</Label>
                        <Input type="number" value={c.amount} onChange={(e) => updateCheque(i, 'amount', e.target.value)} placeholder="مثال: 2000000" className="h-9 rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">تاریخ</Label>
                        <JalaliDatePicker value={c.date ? new Date(c.date) : null} onChange={(d) => updateCheque(i, 'date', d ? toLocalDateString(d) : '')} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-[#667085]">نوع</Label>
                        <Select value={c.type} onValueChange={(v) => updateCheque(i, 'type', v)}>
                          <SelectTrigger className="h-9 rounded-[8px] text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{CHEQUE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                        <Label className="text-xs text-[#667085]">شرح</Label>
                        <Input value={c.description} onChange={(e) => updateCheque(i, 'description', e.target.value)} placeholder="اختیاری" className="h-9 rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-[10px] bg-[#FEF3C7] px-4 py-2.5 text-sm font-semibold text-[#92400E]">
                  مجموع چک‌ها: {formatToman(totalCheques)} تومان
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary & submit */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-[10px] bg-[#EFF4FF] p-3">
                <div className="text-xs text-[#667085]">مبلغ اعلامیه</div>
                <div className="mt-1 text-lg font-bold text-[#3155E7]">{formatToman(Number(amount) || 0)} <span className="text-xs font-normal">تومان</span></div>
              </div>
              <div className="rounded-[10px] bg-[#E0F2FE] p-3">
                <div className="text-xs text-[#667085]">مجموع برداشت‌ها</div>
                <div className="mt-1 text-lg font-bold text-[#0284C7]">{formatToman(totalWithdrawals)} <span className="text-xs font-normal">تومان</span></div>
              </div>
              <div className="rounded-[10px] bg-[#FEF3C7] p-3">
                <div className="text-xs text-[#667085]">مجموع چک‌ها</div>
                <div className="mt-1 text-lg font-bold text-[#92400E]">{formatToman(totalCheques)} <span className="text-xs font-normal">تومان</span></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/payment-announcements"><Button type="button" variant="outline" className="h-[42px] rounded-[10px]">انصراف</Button></Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</> : <><Plus className="h-4 w-4" /> ایجاد اعلامیه</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
