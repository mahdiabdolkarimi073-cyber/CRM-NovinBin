'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  { icon: Building2, title: 'حساب بانکی مقصد', desc: 'حساب بانکی که چک به آن وصل می‌شود را انتخاب کنید. حساب باید فعال باشد.' },
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

  const clearableCheques = useMemo(() => {
    const pendingChequeIds = new Set(
      existingClearings
        .filter((c) => ['draft', 'pending_approval', 'approved'].includes(c.status))
        .map((c) => c.chequeId)
    );
    return cheques.filter((c) => CLEARABLE_STATUSES.includes(c.status) && !pendingChequeIds.has(c.id));
  }, [cheques, existingClearings]);

  const selectedCheque = useMemo(() => cheques.find((c) => c.id === chequeId), [cheques, chequeId]);

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

  const dueDateCheck = useMemo(() => {
    if (!selectedCheque?.dueDate || !clearingDate) return null;
    const due = new Date(selectedCheque.dueDate);
    const clr = new Date(clearingDate);
    return clr < due;
  }, [selectedCheque, clearingDate]);

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ثبت درخواست وصول چک پرداختی</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> وصول چک پرداختی <b>←</b> ثبت</div>
          </div>
          <Link href="/dashboard/cheque-clearings" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به وصول چک
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            {/* Cheque selection */}
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><WalletCards className="h-5 w-5" /></span>
                <div>
                  <h2>انتخاب چک پرداختی</h2>
                  <p>چک پرداختی که می‌خواهید وصل کنید را انتخاب نمایید. فقط چک‌های قابل وصول نمایش داده می‌شوند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">چک مورد وصول <span className="required-star">*</span></Label>
                <Select value={chequeId} onValueChange={setChequeId}>
                  <SelectTrigger className="task-select"><WalletCards className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب چک..." /></SelectTrigger>
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
                {errors.chequeId && <span className="field-error">{errors.chequeId}</span>}
              </div>

              {selectedCheque && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-[10px] bg-sky-50 p-3 dark:bg-sky-900/20"><div className="text-xs text-slate-400">شماره چک</div><div className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">{selectedCheque.chequeNumber}</div></div>
                  <div className="rounded-[10px] bg-amber-50 p-3 dark:bg-amber-900/20"><div className="text-xs text-slate-400">مبلغ چک</div><div className="mt-1 text-sm font-bold text-amber-600 dark:text-amber-400">{formatToman(Number(selectedCheque.amount))} تومان</div></div>
                  <div className="rounded-[10px] bg-green-50 p-3 dark:bg-green-900/20"><div className="text-xs text-slate-400">بانک</div><div className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">{selectedCheque.bankAccount?.bankName || '—'}</div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-400">سررسید</div><div className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{selectedCheque.dueDate ? formatJalali(selectedCheque.dueDate) : '—'}</div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-400">وضعیت</div><div className="mt-1"><Badge variant="outline" style={{ color: CHEQUE_STATUS_COLOR[selectedCheque.status], borderColor: `${CHEQUE_STATUS_COLOR[selectedCheque.status]}35` }}>{CHEQUE_STATUS[selectedCheque.status]}</Badge></div></div>
                  <div className="rounded-[10px] bg-slate-100 p-3 dark:bg-slate-800"><div className="text-xs text-slate-400">مانده قابل وصول</div><div className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">{formatToman(remainingAmount)} تومان</div></div>
                </div>
              )}

              {clearableCheques.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  چک قابل وصولی موجود نیست. چک‌های وصول‌شده، باطل‌شده یا برگشت‌خورده قابل وصول مجدد نیستند.
                </div>
              )}
            </div>

            {/* Clearing details */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Banknote className="h-5 w-5" /></span>
                <div>
                  <h2>جزئیات وصول</h2>
                  <p>تاریخ، مبلغ و حساب بانکی مقصد را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">تاریخ وصول <span className="required-star">*</span></Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker value={clearingDate ? new Date(clearingDate) : null} onChange={(d) => setClearingDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                  </div>
                  {errors.clearingDate && <span className="field-error">{errors.clearingDate}</span>}
                  {dueDateCheck === true && (
                    <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"><AlertCircle className="h-3 w-3" /> تاریخ وصول قبل از سررسید چک است</div>
                  )}
                </div>

                <div className="field-group">
                  <Label className="field-label">حساب بانکی مقصد <span className="required-star">*</span></Label>
                  <Select value={bankAccountId || '__none__'} onValueChange={(v) => setBankAccountId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><Building2 className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب حساب بانکی..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون حساب</SelectItem>
                      {bankAccounts.map((ba) => <SelectItem key={ba.id} value={ba.id}>{ba.bankName} - {ba.accountNo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.bankAccountId && <span className="field-error">{errors.bankAccountId}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">مبلغ وصول <span className="required-star">*</span></Label>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="مبلغ وصول..." className="task-input" />
                  <span className="text-[10px] text-slate-400">مانده قابل وصول: {formatToman(remainingAmount)} تومان</span>
                  {errors.amount && <span className="field-error">{errors.amount}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">دریافت‌کننده چک</Label>
                  <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="نام دریافت‌کننده..." className="task-input" />
                </div>
              </div>

              {selectedCheque && amount && Number(amount) < remainingAmount && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  این یک وصول جزئی است. مبلغ {formatToman(remainingAmount - Number(amount))} تومان از چک باقی می‌ماند و وضعیت چک به «در حال وصول» تغییر می‌کند.
                </div>
              )}

              <div className="field-group">
                <Label className="field-label">علت وصول <span className="required-star">*</span></Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="علت وصول چک..." className="task-textarea" />
                {errors.reason && <span className="field-error">{errors.reason}</span>}
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اضافی..." className="task-textarea" />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/cheque-clearings')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting || clearableCheques.length === 0}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : (<><Plus className="h-4 w-4" /> ثبت درخواست وصول</>)}
              </button>
            </div>
          </form>

          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنما و نکات</h2>
              </div>
              <div className="guide-items">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="guide-item">
                      <span className="guide-item-icon"><item.icon className="h-5 w-5" /></span>
                      <div className="guide-item-text"><strong>{item.title}</strong><p>{item.desc}</p></div>
                    </div>
                    {i < guideItems.length - 1 && <div className="guide-item-divider" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-header">
                <span className="info-card-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>درخواست وصول پس از ثبت در وضعیت «پیش‌نویس» قرار می‌گیرد. پس از ارسال برای تأیید و تأیید توسط مسئول، ثبت نهایی انجام می‌شود. با ثبت نهایی، وضعیت چک به «وصول‌شده» (یا «در حال وصول» برای وصول جزئی) تغییر می‌کند. در صورت برگشت بانکی، می‌توان وصول را برگشت داد تا چک به وضعیت قبلی بازگردد.</p>
            </div>

            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><AlertCircle className="h-5 w-5" /></span>
                <h2>چک‌های غیرقابل وصول</h2>
              </div>
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" />وصول‌شده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" />باطل‌شده</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500" />برگشت‌خورده</div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-400">این چک‌ها قابل وصول مجدد نیستند.</p>
            </div>

            {selectedCheque && (
              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-card-icon"><CheckSquare className="h-5 w-5" /></span>
                  <h2>خلاصه</h2>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">شماره چک</span><span className="font-bold text-slate-700 dark:text-slate-300">{selectedCheque.chequeNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">مبلغ چک</span><span className="font-bold text-slate-700 dark:text-slate-300">{formatToman(Number(selectedCheque.amount))} تومان</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">مانده قابل وصول</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(remainingAmount)} تومان</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">مبلغ وصول</span><span className="font-bold text-sky-600 dark:text-sky-400">{amount ? formatToman(Number(amount)) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">دریافت‌کننده</span><span className="font-bold text-slate-700 dark:text-slate-300">{payee || '—'}</span></div>
                  {amount && Number(amount) < remainingAmount && <div className="flex justify-between"><span className="text-slate-400">مانده پس از وصول</span><span className="font-bold text-amber-600">{formatToman(remainingAmount - Number(amount))} تومان</span></div>}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
