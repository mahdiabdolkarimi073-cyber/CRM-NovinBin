'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, Banknote, Calendar, Loader2, Plus,
  Lightbulb, Info, Hash, User, AlertCircle, CheckSquare,
  Building2, WalletCards, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { toLocalDateString, formatToman, formatJalali } from '@/lib/format';
import { toast } from 'sonner';
import type { MyCheque, BankAccount, ChequeClearing } from '@/lib/types';

const CHEQUE_STATUS: Record<string, string> = {
  issued: 'صادرشده',
  in_clearing: 'در حال وصول',
  cleared: 'وصول‌شده',
  returned: 'برگشتی',
  voided: 'باطل‌شده',
  reversed: 'برگشت‌خورده',
};

const CHEQUE_STATUS_COLOR: Record<string, string> = {
  issued: '#3b82f6',
  in_clearing: '#f59e0b',
  cleared: '#10b981',
  returned: '#ef4444',
  voided: '#64748b',
  reversed: '#8b5cf6',
};

const CLEARABLE_STATUSES = ['issued', 'in_clearing'];

const guideItems = [
  { icon: CheckSquare, title: 'انتخاب چک قابل وصول', desc: 'فقط چک‌های پرداختی در وضعیت صادرشده یا در حال وصول قابل انتخاب هستند.' },
  { icon: Building2, title: 'حساب بانکی مقصد', desc: 'حساب بانکی که چک به آن وصول می‌شود را انتخاب کنید. حساب باید فعال باشد.' },
  { icon: Calendar, title: 'کنترل سررسید', desc: 'تاریخ وصول نسبت به سررسید چک کنترل می‌شود. وصول قبل از سررسید با هشدار همراه است.' },
  { icon: ShieldCheck, title: 'کنترل مبلغ', desc: 'مبلغ وصول نباید بیشتر از مانده چک باشد. وصول جزئی امکان‌پذیر است.' },
  { icon: TrendingUp, title: 'اثر حسابداری', desc: 'پس از ثبت نهایی، وضعیت چک به وصول‌شده تغییر می‌کند و تعهد مرتبط بسته می‌شود.' },
];

export default function NewChequeClearingPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [cheques, setCheques] = useState<MyCheque[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [existingClearings, setExistingClearings] = useState<ChequeClearing[]>([]);

  const [chequeId, setChequeId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [clearingDate, setClearingDate] = useState('');
  const [amount, setAmount] = useState('');
  const [isPartial, setIsPartial] = useState(false);
  const [payee, setPayee] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [chqData, baData, clData] = await Promise.all([
        fetchData<MyCheque>('my_cheques', {
          where: { type: 'issued' },
          orderBy: { createdAt: 'desc' },
          include: { bankAccount: true },
        }),
        fetchData<BankAccount>('bank_accounts', { where: { active: true } }),
        fetchData<ChequeClearing>('cheque_clearings', { where: {} }),
      ]);
      setCheques(chqData || []);
      setBankAccounts(baData || []);
      setExistingClearings(clData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter cheques: only clearable ones AND no pending clearing
  const clearableCheques = useMemo(() => {
    const pendingChequeIds = new Set(
      existingClearings
        .filter((c) => ['draft', 'pending_approval', 'approved'].includes(c.status))
        .map((c) => c.chequeId)
    );
    return cheques.filter((c) => CLEARABLE_STATUSES.includes(c.status) && !pendingChequeIds.has(c.id));
  }, [cheques, existingClearings]);

  const selectedCheque = useMemo(() => cheques.find((c) => c.id === chequeId), [cheques, chequeId]);

  // Auto-fill amount and payee when cheque selected
  useEffect(() => {
    if (selectedCheque) {
      const remaining = Number(selectedCheque.amount) - Number(selectedCheque.clearedAmount || 0);
      setAmount(String(remaining));
      setPayee(selectedCheque.payee || '');
      if (!bankAccountId && selectedCheque.bankAccountId) {
        setBankAccountId(selectedCheque.bankAccountId);
      }
    }
  }, [selectedCheque, bankAccountId]);

  const remainingAmount = useMemo(() => {
    if (!selectedCheque) return 0;
    return Number(selectedCheque.amount) - Number(selectedCheque.clearedAmount || 0);
  }, [selectedCheque]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!chequeId) e.chequeId = 'انتخاب چک الزامی است';
    if (!clearingDate) e.clearingDate = 'تاریخ وصول الزامی است';
    if (!amount) e.amount = 'مبلغ وصول الزامی است';
    if (amount && Number(amount) > remainingAmount) e.amount = `مبلغ وصول نباید بیشتر از مانده چک (${formatToman(remainingAmount)} تومان) باشد`;
    if (!bankAccountId) e.bankAccountId = 'انتخاب حساب بانکی الزامی است';
    if (!reason) e.reason = 'علت وصول الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    if (!selectedCheque) { toast.error('چک یافت نشد'); return; }
    if (!CLEARABLE_STATUSES.includes(selectedCheque.status)) {
      toast.error(`چک در وضعیت «${CHEQUE_STATUS[selectedCheque.status]}» قابل وصول نیست`);
      return;
    }

    const clearingAmount = Number(amount);
    if (clearingAmount > remainingAmount) {
      toast.error('مبلغ وصول بیشتر از مانده چک است');
      return;
    }

    setSubmitting(true);
    try {
      const selectedBank = bankAccounts.find((b) => b.id === bankAccountId);
      const isFullClearing = clearingAmount >= remainingAmount;

      const clearing = await createData('cheque_clearings', {
        number: `CL-${Date.now()}`,
        chequeId,
        chequeNumber: selectedCheque.chequeNumber,
        bankName: selectedCheque.bankAccount?.bankName || null,
        chequeAmount: Number(selectedCheque.amount),
        clearingDate: clearingDate ? new Date(clearingDate).toISOString() : new Date().toISOString(),
        bankAccountId: bankAccountId || null,
        bankAccountName: selectedBank ? `${selectedBank.bankName} - ${selectedBank.accountNo}` : null,
        amount: clearingAmount,
        isPartial: !isFullClearing,
        remainingAmount: remainingAmount - clearingAmount,
        payee: payee || null,
        description: description || null,
        reason: reason || null,
        status: 'draft',
        createdBy: profile.id,
        accountingPosted: false,
        obligationClosed: false,
        fiscalPeriodChecked: false,
        bankAccountActiveChecked: false,
        dueDateChecked: false,
      }) as any;

      try {
        await createData('cheque_clearing_history', {
          clearingId: clearing.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          amount: clearingAmount,
          details: {
            chequeId,
            chequeNumber: selectedCheque.chequeNumber,
            chequeAmount: Number(selectedCheque.amount),
            clearingAmount,
            remainingAmount: remainingAmount - clearingAmount,
            isPartial: !isFullClearing,
          },
        });
      } catch {}

      toast.success('درخواست وصول چک پرداختی ثبت شد');
      router.push('/dashboard/cheque-clearings');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Due date check
  const dueDateCheck = useMemo(() => {
    if (!selectedCheque?.dueDate || !clearingDate) return null;
    const due = new Date(selectedCheque.dueDate);
    const clr = new Date(clearingDate);
    return clr < due;
  }, [selectedCheque, clearingDate]);

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت درخواست وصول چک پرداختی</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> وصول چک پرداختی <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/cheque-clearings">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cheque selection */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><WalletCards className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">انتخاب چک پرداختی</h2>
                    <p className="text-xs text-[#98A2B3]">چک پرداختی که می‌خواهید وصول کنید را انتخاب نمایید. فقط چک‌های قابل وصول نمایش داده می‌شوند.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">چک مورد وصول <span className="text-rose-500">*</span></Label>
                  <Select value={chequeId} onValueChange={setChequeId}>
                    <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><WalletCards className="h-4 w-4 text-[#98A2B3]" /><SelectValue placeholder="انتخاب چک..." /></SelectTrigger>
                    <SelectContent>
                      {clearableCheques.length === 0 ? (
                        <SelectItem value="__none__" disabled>چک قابل وصولی موجود نیست</SelectItem>
                      ) : (
                        clearableCheques.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.chequeNumber} - {c.bankAccount?.bankName || 'بدون بانک'} - {formatToman(Number(c.amount))} تومان ({CHEQUE_STATUS[c.status]})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.chequeId && <span className="text-xs text-rose-500">{errors.chequeId}</span>}
                </div>

                {/* Selected cheque details */}
                {selectedCheque && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] bg-[#EFF4FF] p-3"><div className="text-xs text-[#667085]">شماره چک</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{selectedCheque.chequeNumber}</div></div>
                    <div className="rounded-[10px] bg-[#FEF3C7] p-3"><div className="text-xs text-[#667085]">مبلغ چک</div><div className="mt-1 text-sm font-bold text-[#92400E]">{formatToman(Number(selectedCheque.amount))} تومان</div></div>
                    <div className="rounded-[10px] bg-[#DCFCE7] p-3"><div className="text-xs text-[#667085]">بانک</div><div className="mt-1 text-sm font-bold text-[#16A34A]">{selectedCheque.bankAccount?.bankName || '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">سررسید</div><div className="mt-1 text-sm font-bold text-[#344054]">{selectedCheque.dueDate ? formatJalali(selectedCheque.dueDate) : '—'}</div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">وضعیت</div><div className="mt-1"><Badge variant="outline" style={{ color: CHEQUE_STATUS_COLOR[selectedCheque.status], borderColor: `${CHEQUE_STATUS_COLOR[selectedCheque.status]}35` }}>{CHEQUE_STATUS[selectedCheque.status]}</Badge></div></div>
                    <div className="rounded-[10px] bg-[#F1F5F9] p-3"><div className="text-xs text-[#667085]">مانده قابل وصول</div><div className="mt-1 text-sm font-bold text-[#3155E7]">{formatToman(remainingAmount)} تومان</div></div>
                  </div>
                )}

                {clearableCheques.length === 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    چک قابل وصولی موجود نیست. چک‌های وصول‌شده، باطل‌شده یا برگشت‌خورده قابل وصول مجدد نیستند.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clearing details */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3b82f6]/10 text-[#3b82f6]"><Banknote className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">جزئیات وصول</h2>
                    <p className="text-xs text-[#98A2B3]">تاریخ، مبلغ و حساب بانکی مقصد را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ وصول <span className="text-rose-500">*</span></Label>
                    <div className="date-input-wrap">
                      <span className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-3">
                        <Calendar className="h-4 w-4 text-[#98A2B3]" />
                        <JalaliDatePicker value={clearingDate ? new Date(clearingDate) : null} onChange={(d) => setClearingDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="h-[42px] flex-1 border-0 p-0 focus:ring-0" />
                      </span>
                    </div>
                    {errors.clearingDate && <span className="text-xs text-rose-500">{errors.clearingDate}</span>}
                    {dueDateCheck === true && (
                      <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700"><AlertCircle className="h-3 w-3" /> تاریخ وصول قبل از سررسید چک است</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">حساب بانکی مقصد <span className="text-rose-500">*</span></Label>
                    <Select value={bankAccountId || '__none__'} onValueChange={(v) => setBankAccountId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]"><Building2 className="h-4 w-4 text-[#98A2B3]" /><SelectValue placeholder="انتخاب حساب بانکی..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">بدون حساب</SelectItem>
                        {bankAccounts.map((ba) => <SelectItem key={ba.id} value={ba.id}>{ba.bankName} - {ba.accountNo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.bankAccountId && <span className="text-xs text-rose-500">{errors.bankAccountId}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مبلغ وصول <span className="text-rose-500">*</span></Label>
                    <div className="relative">
                      <Banknote className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                      <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="مبلغ وصول..." className="h-[42px] rounded-[10px] border-[#DCE3EE] pr-9" />
                    </div>
                    <span className="text-[10px] text-[#98A2B3]">مانده قابل وصول: {formatToman(remainingAmount)} تومان</span>
                    {errors.amount && <span className="text-xs text-rose-500">{errors.amount}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">دریافت‌کننده چک</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                      <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="نام دریافت‌کننده..." className="h-[42px] rounded-[10px] border-[#DCE3EE] pr-9" />
                    </div>
                  </div>
                </div>

                {/* Partial clearing indicator */}
                {selectedCheque && amount && Number(amount) < remainingAmount && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    این یک وصول جزئی است. مبلغ {formatToman(remainingAmount - Number(amount))} تومان از چک باقی می‌ماند و وضعیت چک به «در حال وصول» تغییر می‌کند.
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">علت وصول <span className="text-rose-500">*</span></Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="علت وصول چک..." className="rounded-[10px] border-[#DCE3EE]" />
                  {errors.reason && <span className="text-xs text-rose-500">{errors.reason}</span>}
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اضافی..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/cheque-clearings"><Button type="button" variant="outline" className="h-[42px] rounded-[10px]">انصراف</Button></Link>
              <Button type="submit" disabled={submitting || clearableCheques.length === 0} className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت درخواست وصول</>}
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
              <p className="text-xs leading-6 text-[#344054]">درخواست وصول پس از ثبت در وضعیت «پیش‌نویس» قرار می‌گیرد. پس از ارسال برای تأیید و تأیید توسط مسئول، ثبت نهایی انجام می‌شود. با ثبت نهایی، وضعیت چک به «وصول‌شده» (یا «در حال وصول» برای وصول جزئی) تغییر می‌کند. در صورت برگشت بانکی، می‌توان وصول را برگشت داد تا چک به وضعیت قبلی بازگردد.</p>
            </div>

            <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
              <h2 className="mb-3 text-sm font-bold text-[#101828]">چک‌های غیرقابل وصول</h2>
              <div className="space-y-2 text-xs text-[#667085]">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#10b981]" />وصول‌شده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#64748b]" />باطل‌شده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />برگشت‌خورده</div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[#98A2B3]">این چک‌ها قابل وصول مجدد نیستند.</p>
            </div>

            {/* Summary */}
            {selectedCheque && (
              <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
                <h2 className="mb-3 text-sm font-bold text-[#101828]">خلاصه</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#98A2B3]">شماره چک</span><span className="font-bold text-[#344054]">{selectedCheque.chequeNumber}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">مبلغ چک</span><span className="font-bold text-[#344054]">{formatToman(Number(selectedCheque.amount))} تومان</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">مانده قابل وصول</span><span className="font-bold text-[#3155E7]">{formatToman(remainingAmount)} تومان</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">مبلغ وصول</span><span className="font-bold text-[#3155E7]">{amount ? formatToman(Number(amount)) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">دریافت‌کننده</span><span className="font-bold text-[#344054]">{payee || '—'}</span></div>
                  {amount && Number(amount) < remainingAmount && <div className="flex justify-between"><span className="text-[#98A2B3]">مانده پس از وصول</span><span className="font-bold text-amber-600">{formatToman(remainingAmount - Number(amount))} تومان</span></div>}
                </div>
              </div>
            )}
          </aside>
        </div>
      </form>
    </div>
  );
}
