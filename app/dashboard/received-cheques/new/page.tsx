'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ثبت چک دریافتی</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> چک‌های دریافتی <b>←</b> ثبت</div>
          </div>
          <Link href="/dashboard/received-cheques" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به چک‌های دریافتی
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><WalletCards className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات چک</h2>
                  <p>اطلاعات پایه و مالی چک را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">شماره چک <span className="required-star">*</span></Label>
                  <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="شماره چک..." className="task-input" />
                  {errors.chequeNumber && <span className="field-error">{errors.chequeNumber}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">شناسه صیادی</Label>
                  <Input value={sayadiNumber} onChange={(e) => setSayadiNumber(e.target.value)} placeholder="شناسه صیادی (اختیاری)..." className="task-input" />
                </div>

                <div className="field-group">
                  <Label className="field-label">بانک <span className="required-star">*</span></Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="نام بانک..." className="task-input" />
                  {errors.bankName && <span className="field-error">{errors.bankName}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">شعبه</Label>
                  <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="نام شعبه..." className="task-input" />
                </div>

                <div className="field-group">
                  <Label className="field-label">شماره حساب صادرکننده</Label>
                  <Input value={issuerAccountNo} onChange={(e) => setIssuerAccountNo(e.target.value)} placeholder="شماره حساب..." className="task-input" />
                </div>

                <div className="field-group">
                  <Label className="field-label">مبلغ <span className="required-star">*</span></Label>
                  <Input type="number" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="مبلغ چک (تومان)..." className="task-input" />
                  {amount > 0 && <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">{formatToman(amount)} تومان</span>}
                  {errors.amount && <span className="field-error">{errors.amount}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">تاریخ صدور <span className="required-star">*</span></Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker value={issueDate ? new Date(issueDate) : null} onChange={(d) => setIssueDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                  </div>
                  {errors.issueDate && <span className="field-error">{errors.issueDate}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">تاریخ سررسید <span className="required-star">*</span></Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker value={dueDate ? new Date(dueDate) : null} onChange={(d) => setDueDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                  </div>
                  {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
                </div>
              </div>
            </div>

            {/* Parties section */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><User className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات طرفین</h2>
                  <p>صادرکننده و دریافت‌کننده چک را مشخص کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">صادرکننده (طرف حساب)</Label>
                  <Select value={issuerPartyId} onValueChange={setIssuerPartyId}>
                    <SelectTrigger className="task-select"><User className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب طرف حساب..." /></SelectTrigger>
                    <SelectContent>{contactParties.map((p) => <SelectItem key={p.id} value={p.id}>{partyName(p)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">نام صادرکننده (دستی)</Label>
                  <Input value={issuerName} onChange={(e) => setIssuerName(e.target.value)} placeholder="اگر طرف حساب انتخاب نشده..." className="task-input" />
                </div>

                <div className="field-group">
                  <Label className="field-label">دریافت‌کننده</Label>
                  <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="نام دریافت‌کننده..." className="task-input" />
                </div>

                <div className="field-group">
                  <Label className="field-label">بابت</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="بابت..." className="task-input" />
                </div>
              </div>
              {errors.issuer && <span className="field-error">{errors.issuer}</span>}
            </div>

            {/* Storage section */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Landmark className="h-5 w-5" /></span>
                <div>
                  <h2>محل نگهداری</h2>
                  <p>محل فعلی نگهداری چک را مشخص کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">صندوق نقدی</Label>
                  <Select value={cashFundId || '__none__'} onValueChange={(v) => setCashFundId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><WalletCards className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب صندوق..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون صندوق</SelectItem>
                      {cashFunds.map((cf) => <SelectItem key={cf.id} value={cf.id}>{cf.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">محل نگهداری (متنی)</Label>
                  <Input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="مثلاً: صندوق، خزانه..." className="task-input" />
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات..." className="task-textarea" />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/received-cheques')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : (<><Plus className="h-4 w-4" /> ثبت چک دریافتی</>)}
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
              <p>چک دریافتی پس از ثبت در وضعیت «دریافت‌شده» قرار می‌گیرد. سپس می‌توانید آن را به بانک واگذار کنید، وصل کنید، یا در صورت نیاز برگشت، استرداد یا انتقال دهید. تمام عملیات در گردش چک ثبت می‌شود.</p>
            </div>

            {amount > 0 && (
              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-card-icon"><Banknote className="h-5 w-5" /></span>
                  <h2>خلاصه</h2>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">شماره چک</span><span className="font-bold text-slate-700 dark:text-slate-300">{chequeNumber || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">بانک</span><span className="font-bold text-slate-700 dark:text-slate-300">{bankName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">مبلغ</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(amount)} تومان</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
