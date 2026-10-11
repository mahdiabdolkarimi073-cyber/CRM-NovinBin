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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, Megaphone, Plus, Trash2, Calendar, Landmark,
  ArrowDownToLine, FileText, Wallet, Loader2,
  Lightbulb, Info, Banknote,
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

const guideItems = [
  { icon: Megaphone, title: 'نوع اعلامیه', desc: 'نوع پرداخت را انتخاب کنید.' },
  { icon: Wallet, title: 'طرف مقابل', desc: 'طرف مقابل پرداخت را مشخص کنید.' },
  { icon: ArrowDownToLine, title: 'برداشت‌ها', desc: 'حواله‌های پرداخت مرتبط را اضافه کنید.' },
  { icon: FileText, title: 'چک‌ها', desc: 'چک‌های دریافتی یا صادری مرتبط را ثبت کنید.' },
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
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>اعلامیه پرداخت جدید</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> اعلامیه‌های پرداخت <b>←</b> ایجاد</div>
          </div>
          <Link href="/dashboard/payment-announcements" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به اعلامیه‌ها
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            {/* Main info */}
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Megaphone className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات اعلامیه</h2>
                  <p>جزئیات اصلی اعلامیه پرداخت را وارد کنید</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">نوع اعلامیه <span className="required-star">*</span></Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="task-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{ANNOUNCEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">طرف مقابل <span className="required-star">*</span></Label>
                  <Select value={counterparty} onValueChange={(v) => { setCounterparty(v); setCounterpartyId(''); }}>
                    <SelectTrigger className="task-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTERPARTY_OPTIONS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {counterpartyOptions.length > 0 && (
                  <div className="field-group">
                    <Label className="field-label">انتخاب {COUNTERPARTY_OPTIONS.find((c) => c.key === counterparty)?.label || ''}</Label>
                    <Select value={counterpartyId} onValueChange={setCounterpartyId}>
                      <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب کنید..." /></SelectTrigger>
                      <SelectContent>
                        {counterparty === 'contact_party'
                          ? counterpartyOptions.map((p: any) => <SelectItem key={p.id} value={p.id}>{partyLabel(p)}</SelectItem>)
                          : (counterpartyOptions as Profile[]).map((s) => <SelectItem key={s.id} value={s.id}>{`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.phone || s.id.slice(0, 8)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="field-group">
                  <Label className="field-label">تاریخ اعلامیه</Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker value={date ? new Date(date) : null} onChange={(d) => setDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                  </div>
                </div>
                <div className="field-group">
                  <Label className="field-label">حساب بانکی</Label>
                  <Select value={bankAccountId || '__none__'} onValueChange={(v) => setBankAccountId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><Landmark className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون حساب</SelectItem>
                      {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">مبلغ پرداخت (تومان) <span className="required-star">*</span></Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثال: 5000000" className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">کارمزد بانکی (تومان)</Label>
                  <Input type="number" value={bankFee} onChange={(e) => setBankFee(e.target.value)} placeholder="مثال: 5000" className="task-input" />
                </div>
              </div>
              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="task-textarea" />
              </div>
            </div>

            {/* Withdrawals */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><ArrowDownToLine className="h-5 w-5" /></span>
                <div>
                  <h2>اعلامیه‌های برداشت</h2>
                  <p>حواله‌های پرداخت مرتبط با این اعلامیه</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addWithdrawal} className="mr-auto"><Plus className="h-4 w-4" /> افزودن</Button>
            </div>

            {withdrawals.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">اعلامیه برداشتی اضافه نشده است</div>
            ) : (
              <div className="space-y-3 px-5 pb-3">
                {withdrawals.map((w, i) => (
                  <div key={i} className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">برداشت {(i + 1).toLocaleString('fa-IR')}</span>
                      <button type="button" onClick={() => removeWithdrawal(i)} className="text-slate-400 transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="field-group"><Label className="field-label">شماره حواله</Label><Input value={w.transferNumber} onChange={(e) => updateWithdrawal(i, 'transferNumber', e.target.value)} placeholder="مثال: 12345" className="task-input" /></div>
                      <div className="field-group"><Label className="field-label">تاریخ</Label><div className="date-input-wrap"><span className="date-icon"><Calendar className="h-4 w-4" /></span><JalaliDatePicker value={w.date ? new Date(w.date) : null} onChange={(d) => updateWithdrawal(i, 'date', d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" /></div></div>
                      <div className="field-group"><Label className="field-label">مبلغ (تومان)</Label><Input type="number" value={w.amount} onChange={(e) => updateWithdrawal(i, 'amount', e.target.value)} placeholder="مثال: 1000000" className="task-input" /></div>
                      <div className="field-group"><Label className="field-label">حساب بانکی</Label><Select value={w.bankAccountId || '__none__'} onValueChange={(v) => updateWithdrawal(i, 'bankAccountId', v === '__none__' ? '' : v)}><SelectTrigger className="task-select"><SelectValue placeholder="انتخاب..." /></SelectTrigger><SelectContent><SelectItem value="__none__">بدون حساب</SelectItem>{bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</SelectItem>)}</SelectContent></Select></div>
                      <div className="field-group"><Label className="field-label">کارمزد بانکی</Label><Input type="number" value={w.bankFee} onChange={(e) => updateWithdrawal(i, 'bankFee', e.target.value)} placeholder="مثال: 3000" className="task-input" /></div>
                      <div className="field-group"><Label className="field-label">توضیحات</Label><Input value={w.description} onChange={(e) => updateWithdrawal(i, 'description', e.target.value)} placeholder="اختیاری" className="task-input" /></div>
                    </div>
                  </div>
                ))}
                <div className="rounded-[10px] bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-600 dark:bg-sky-900/20 dark:text-sky-400">مجموع برداشت‌ها: {formatToman(totalWithdrawals)} تومان</div>
              </div>
            )}

            {/* Cheques */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><FileText className="h-5 w-5" /></span>
                <div>
                  <h2>چک‌های من</h2>
                  <p>چک‌های دریافتی یا صادری مرتبط با این اعلامیه</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCheque} className="mr-auto"><Plus className="h-4 w-4" /> افزودن</Button>
            </div>

            {cheques.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">چکی اضافه نشده است</div>
            ) : (
              <div className="space-y-3 px-5 pb-3">
                {cheques.map((c, i) => (
                  <div key={i} className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">چک {(i + 1).toLocaleString('fa-IR')}</span>
                      <button type="button" onClick={() => removeCheque(i)} className="text-slate-400 transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="field-group"><Label className="field-label">حساب بانکی</Label><Select value={c.bankAccountId || '__none__'} onValueChange={(v) => updateCheque(i, 'bankAccountId', v === '__none__' ? '' : v)}><SelectTrigger className="task-select"><SelectValue placeholder="انتخاب..." /></SelectTrigger><SelectContent><SelectItem value="__none__">بدون حساب</SelectItem>{bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</SelectItem>)}</SelectContent></Select></div>
                      <div className="field-group"><Label className="field-label">شماره چک</Label><Input value={c.chequeNumber} onChange={(e) => updateCheque(i, 'chequeNumber', e.target.value)} placeholder="مثال: 9876543" className="task-input" /></div>
                      <div className="field-group"><Label className="field-label">شماره صیادی</Label><Input value={c.sayadiNumber} onChange={(e) => updateCheque(i, 'sayadiNumber', e.target.value)} placeholder="اختیاری" className="task-input" /></div>
                      <div className="field-group"><Label className="field-label">مبلغ (تومان)</Label><Input type="number" value={c.amount} onChange={(e) => updateCheque(i, 'amount', e.target.value)} placeholder="مثال: 2000000" className="task-input" /></div>
                      <div className="field-group"><Label className="field-label">تاریخ</Label><div className="date-input-wrap"><span className="date-icon"><Calendar className="h-4 w-4" /></span><JalaliDatePicker value={c.date ? new Date(c.date) : null} onChange={(d) => updateCheque(i, 'date', d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" /></div></div>
                      <div className="field-group"><Label className="field-label">نوع</Label><Select value={c.type} onValueChange={(v) => updateCheque(i, 'type', v)}><SelectTrigger className="task-select"><SelectValue /></SelectTrigger><SelectContent>{CHEQUE_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                      <div className="field-group sm:col-span-2 lg:col-span-3"><Label className="field-label">شرح</Label><Input value={c.description} onChange={(e) => updateCheque(i, 'description', e.target.value)} placeholder="اختیاری" className="task-input" /></div>
                    </div>
                  </div>
                ))}
                <div className="rounded-[10px] bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">مجموع چک‌ها: {formatToman(totalCheques)} تومان</div>
              </div>
            )}

            {/* Summary */}
            <div className="form-card-divider" />
            <div className="grid grid-cols-1 gap-3 px-5 pb-3 sm:grid-cols-3">
              <div className="rounded-[10px] bg-sky-50 p-3 dark:bg-sky-900/20"><div className="text-xs text-slate-400">مبلغ اعلامیه</div><div className="mt-1 text-lg font-bold text-sky-600 dark:text-sky-400">{formatToman(Number(amount) || 0)} <span className="text-xs font-normal">تومان</span></div></div>
              <div className="rounded-[10px] bg-cyan-50 p-3 dark:bg-cyan-900/20"><div className="text-xs text-slate-400">مجموع برداشت‌ها</div><div className="mt-1 text-lg font-bold text-cyan-600 dark:text-cyan-400">{formatToman(totalWithdrawals)} <span className="text-xs font-normal">تومان</span></div></div>
              <div className="rounded-[10px] bg-amber-50 p-3 dark:bg-amber-900/20"><div className="text-xs text-slate-400">مجموع چک‌ها</div><div className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">{formatToman(totalCheques)} <span className="text-xs font-normal">تومان</span></div></div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/payment-announcements')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : (<><Plus className="h-4 w-4" /> ایجاد اعلامیه</>)}
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
              <p>اعلامیه پرداخت، یک پرداخت را با جزئیات طرف مقابل، مبلغ، تاریخ و حواله‌های مرتبط ثبت می‌کند. پس از ایجاد، می‌توانید آن را برای تأیید ارسال کنید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
