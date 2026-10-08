'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ArrowRight, FileText, Loader2, Plus, Trash2,
  Lightbulb, Info, Calendar, Hash, ArrowRightLeft,
  AlertCircle, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { ContactParty, Account, CostCenter, FiscalYear, Profile } from '@/lib/types';

interface AllocRow {
  allocationType: string;
  referenceNumber: string;
  originalAmount: string;
  paidAmount: string;
  allocationAmount: string;
  description: string;
}

const ANNOUNCEMENT_TYPES = [
  { value: 'debit', label: 'بدهکار' },
  { value: 'credit', label: 'بستانکار' },
];

const SOURCE_DOC_TYPES = [
  { value: '', label: 'بدون سند مبنا' },
  { value: 'invoice', label: 'فاکتور' },
  { value: 'receipt', label: 'رسید' },
  { value: 'payment', label: 'پرداخت' },
  { value: 'cheque', label: 'چک' },
  { value: 'contract', label: 'قرارداد' },
  { value: 'other', label: 'سایر' },
];

const ALLOCATION_TYPES = [
  { value: 'invoice', label: 'فاکتور' },
  { value: 'debt', label: 'بدهی' },
  { value: 'credit', label: 'طلب' },
  { value: 'receipt', label: 'رسید' },
  { value: 'payment', label: 'پرداخت' },
  { value: 'prepayment', label: 'پیش‌پرداخت' },
  { value: 'on_account', label: 'حساب جاری' },
  { value: 'open_doc', label: 'سند باز' },
  { value: 'balance', label: 'مانده حساب' },
];

const TAX_STATUS = [
  { value: 'none', label: 'بدون مالیات' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'calculated', label: 'محاسبه شده' },
  { value: 'exempt', label: 'معاف' },
];

const guideItems = [
  { icon: ArrowRightLeft, title: 'انتخاب نوع اعلامیه', desc: 'بدهکار یا بستانکار بودن اعلامیه را مشخص کنید.' },
  { icon: User, title: 'انتخاب طرف حساب', desc: 'اعلامیه باید به یک طرف حساب معتبر متصل باشد.' },
  { icon: Calendar, title: 'تاریخ عملیات', desc: 'تاریخ عملیات باید در محدوده دوره مالی مجاز باشد.' },
  { icon: Hash, title: 'ثبت مبلغ', desc: 'مبلغ باید بزرگ‌تر از صفر و طبق واحد پول باشد.' },
  { icon: AlertCircle, title: 'شرح و علت', desc: 'هر اعلامیه باید دارای شرح مالی و علت ثبت باشد.' },
];

export default function NewFinancialAnnouncementPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [number, setNumber] = useState('');
  const [announcementType, setAnnouncementType] = useState('debit');
  const [contactPartyId, setContactPartyId] = useState('');
  const [contactPartyName, setContactPartyName] = useState('');
  const [operationDate, setOperationDate] = useState('');
  const [amount, setAmount] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonDescription, setReasonDescription] = useState('');
  const [description, setDescription] = useState('');
  const [sourceDocType, setSourceDocType] = useState('');
  const [sourceDocNumber, setSourceDocNumber] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [oppositeAccountId, setOppositeAccountId] = useState('');
  const [oppositeAccountName, setOppositeAccountName] = useState('');
  const [taxSubjectAmount, setTaxSubjectAmount] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [taxStatus, setTaxStatus] = useState('none');
  const [taxAccountId, setTaxAccountId] = useState('');
  const [allocations, setAllocations] = useState<AllocRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [cpData, accData, ccData, fyData, staffData] = await Promise.all([
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Account>('accounts', { where: { active: true } }),
        fetchData<CostCenter>('cost_centers', { where: { active: true } }),
        fetchData<FiscalYear>('fiscal_years', { where: { status: 'open' } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setContactParties(cpData || []);
      setAccounts(accData || []);
      setCostCenters(ccData || []);
      setFiscalYears(fyData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`FA-${Date.now().toString().slice(-8)}`);
    setOperationDate(new Date().toISOString().slice(0, 10));
  }, []);

  const taxAmount = useMemo(() => {
    const subject = parseNumber(taxSubjectAmount);
    const rate = parseNumber(taxRate);
    return Math.round(subject * rate / 100);
  }, [taxSubjectAmount, taxRate]);

  const totalAllocated = allocations.reduce((sum, a) => sum + parseNumber(a.allocationAmount), 0);
  const announcementAmount = parseNumber(amount);

  const addAlloc = () => {
    setAllocations([...allocations, { allocationType: 'invoice', referenceNumber: '', originalAmount: '0', paidAmount: '0', allocationAmount: '0', description: '' }]);
  };
  const removeAlloc = (i: number) => setAllocations(allocations.filter((_, idx) => idx !== i));
  const updateAlloc = (i: number, field: keyof AllocRow, value: string) =>
    setAllocations(allocations.map((a, idx) => idx === i ? { ...a, [field]: value } : a));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contactPartyId) e.contactPartyId = 'انتخاب طرف حساب الزامی است';
    if (!operationDate) e.operationDate = 'تاریخ عملیات الزامی است';
    if (announcementAmount <= 0) e.amount = 'مبلغ باید بزرگ‌تر از صفر باشد';
    if (totalAllocated > announcementAmount) e.allocations = 'مجموع تخصیص از مبلغ اعلامیه بیشتر است';
    if (!reasonDescription.trim() && !reasonCode.trim()) e.reasonDescription = 'علت ثبت الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fa = await createData('financial_announcements', {
        number,
        announcementType,
        contactPartyId: contactPartyId || null,
        contactPartyName: contactPartyName || null,
        operationDate: new Date(operationDate).toISOString(),
        accountingDate: new Date(operationDate).toISOString(),
        amount: announcementAmount,
        currency: 'IRR',
        reasonCode: reasonCode || null,
        reasonDescription: reasonDescription || null,
        description: description || null,
        sourceDocType: sourceDocType || null,
        sourceDocNumber: sourceDocNumber || null,
        fiscalYearId: fiscalYearId || null,
        costCenterId: costCenterId || null,
        oppositeAccountId: oppositeAccountId || null,
        oppositeAccountName: oppositeAccountName || null,
        taxSubjectAmount: parseNumber(taxSubjectAmount),
        taxRate: parseNumber(taxRate),
        taxAmount,
        taxAccountId: taxAccountId || null,
        taxStatus: taxStatus || null,
        balanceBefore: 0,
        balanceAfter: 0,
        accountingEffectApplied: false,
        duplicateChecked: false,
        status: 'draft',
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < allocations.length; i++) {
        const a = allocations[i];
        if (parseNumber(a.allocationAmount) <= 0) continue;
        await createData('financial_announcement_items', {
          announcementId: fa.id,
          allocationType: a.allocationType,
          referenceNumber: a.referenceNumber || null,
          originalAmount: parseNumber(a.originalAmount),
          paidAmount: parseNumber(a.paidAmount),
          allocationAmount: parseNumber(a.allocationAmount),
          itemStatus: 'open',
          description: a.description || null,
        });
      }

      try {
        await createData('financial_announcement_history', {
          announcementId: fa.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { number, announcementType, amount: announcementAmount },
        });
      } catch {}

      toast.success('اعلامیه مالی ثبت شد');
      router.push('/dashboard/financial-announcements');
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
              <h1>ثبت اعلامیه مالی جدید</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> اعلامیه‌های مالی <b>←</b> ثبت</div>
          </div>
          <Link href="/dashboard/financial-announcements" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            {/* اطلاعات اعلامیه */}
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><FileText className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات اعلامیه</h2>
                  <p>جزئیات اعلامیه بدهکار یا بستانکار را وارد کنید.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">شماره اعلامیه</Label>
                  <Input value={number} readOnly className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">نوع اعلامیه <span className="required-star">*</span></Label>
                  <Select value={announcementType} onValueChange={setAnnouncementType}>
                    <SelectTrigger className="task-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{ANNOUNCEMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">طرف حساب <span className="required-star">*</span></Label>
                  <Select value={contactPartyId} onValueChange={(v) => {
                    setContactPartyId(v);
                    const cp = contactParties.find((c) => c.id === v);
                    setContactPartyName(cp ? [cp.firstName, cp.lastName, cp.companyName].filter(Boolean).join(' ') : '');
                  }}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب طرف حساب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">انتخاب طرف حساب...</SelectItem>
                      {contactParties.map((cp) => <SelectItem key={cp.id} value={cp.id}>{[cp.firstName, cp.lastName, cp.companyName].filter(Boolean).join(' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.contactPartyId && <span className="field-error">{errors.contactPartyId}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">تاریخ عملیات <span className="required-star">*</span></Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker value={operationDate ? new Date(operationDate) : null} onChange={(d) => setOperationDate(d ? d.toISOString().slice(0, 10) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                  </div>
                  {errors.operationDate && <span className="field-error">{errors.operationDate}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">مبلغ اعلامیه (تومان) <span className="required-star">*</span></Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مبلغ..." className="task-input" />
                  {errors.amount && <span className="field-error">{errors.amount}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">سند مبنا</Label>
                  <Select value={sourceDocType || '__none__'} onValueChange={(v) => setSourceDocType(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="بدون سند مبنا" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون سند مبنا</SelectItem>
                      {SOURCE_DOC_TYPES.filter((t) => t.value).map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {sourceDocType && (
                  <div className="field-group tablet:col-span-2">
                    <Label className="field-label">شماره سند مبنا</Label>
                    <Input value={sourceDocNumber} onChange={(e) => setSourceDocNumber(e.target.value)} placeholder="شماره..." className="task-input" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
                <div className="field-group">
                  <Label className="field-label">دوره مالی</Label>
                  <Select value={fiscalYearId || '__none__'} onValueChange={(v) => setFiscalYearId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">انتخاب...</SelectItem>
                      {fiscalYears.map((fy) => <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">مرکز هزینه</Label>
                  <Select value={costCenterId || '__none__'} onValueChange={(v) => setCostCenterId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">انتخاب...</SelectItem>
                      {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} — {cc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">حساب مقابل</Label>
                  <Select value={oppositeAccountId || '__none__'} onValueChange={(v) => {
                    setOppositeAccountId(v === '__none__' ? '' : v);
                    const acc = accounts.find((a) => a.id === v);
                    setOppositeAccountName(acc ? `${acc.code} — ${acc.name}` : '');
                  }}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">انتخاب...</SelectItem>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">علت ثبت <span className="required-star">*</span></Label>
                <Input value={reasonDescription} onChange={(e) => setReasonDescription(e.target.value)} placeholder="علت ثبت اعلامیه..." className="task-input" />
                {errors.reasonDescription && <span className="field-error">{errors.reasonDescription}</span>}
              </div>
              <div className="field-group">
                <Label className="field-label">کد علت (اختیاری)</Label>
                <Input value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} placeholder="کد علت..." className="task-input" />
              </div>
              <div className="field-group">
                <Label className="field-label">شرح مالی</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح کامل عملیات مالی..." className="task-textarea" />
              </div>
            </div>

            {/* مالیات */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><AlertCircle className="h-5 w-5" /></span>
                <div>
                  <h2>مالیات</h2>
                  <p>در صورت نیاز به کنترل مالیاتی، اطلاعات را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-4">
                <div className="field-group">
                  <Label className="field-label">مبلغ مشمول</Label>
                  <Input type="number" value={taxSubjectAmount} onChange={(e) => setTaxSubjectAmount(e.target.value)} placeholder="0" className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">نرخ (٪)</Label>
                  <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" className="task-input" />
                </div>
                <div className="field-group">
                  <Label className="field-label">وضعیت مالیاتی</Label>
                  <Select value={taxStatus} onValueChange={setTaxStatus}>
                    <SelectTrigger className="task-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{TAX_STATUS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">حساب مالیاتی</Label>
                  <Select value={taxAccountId || '__none__'} onValueChange={(v) => setTaxAccountId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">انتخاب...</SelectItem>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {taxAmount > 0 && (
                <div className="flex items-center justify-end gap-3 rounded-lg bg-rose-50 p-3 dark:bg-rose-900/20">
                  <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">مبلغ مالیات:</span>
                  <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{formatToman(taxAmount)} تومان</span>
                </div>
              )}
            </div>

            {/* تخصیص به اسناد باز */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><ArrowRightLeft className="h-5 w-5" /></span>
                <div>
                  <h2>تخصیص به اسناد باز</h2>
                  <p>مبلغ اعلامیه را بین اسناد باز طرف حساب توزیع کنید.</p>
                </div>
              </div>
              <button type="button" onClick={addAlloc} className="cancel-btn"><Plus className="h-4 w-4" /> افزودن تخصیص</button>
            </div>

            <div className="form-fields">
              {allocations.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">تخصیصی اضافه نشده است</div>
              ) : (
                <div className="space-y-3">
                  {allocations.map((a, i) => (
                    <div key={i} className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">تخصیص {toEnglishDigits(String(i + 1))}</span>
                        <button type="button" onClick={() => removeAlloc(i)} className="text-slate-400 transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 lg:grid-cols-3">
                        <div className="field-group"><Label className="field-label">نوع تخصیص</Label><Select value={a.allocationType} onValueChange={(v) => updateAlloc(i, 'allocationType', v)}><SelectTrigger className="task-select"><SelectValue /></SelectTrigger><SelectContent>{ALLOCATION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
                        <div className="field-group"><Label className="field-label">شماره سند</Label><Input value={a.referenceNumber} onChange={(e) => updateAlloc(i, 'referenceNumber', e.target.value)} placeholder="شماره سند" className="task-input" /></div>
                        <div className="field-group"><Label className="field-label">مبلغ اصل</Label><Input type="number" value={a.originalAmount} onChange={(e) => updateAlloc(i, 'originalAmount', e.target.value)} placeholder="0" className="task-input" /></div>
                        <div className="field-group"><Label className="field-label">پرداخت شده</Label><Input type="number" value={a.paidAmount} onChange={(e) => updateAlloc(i, 'paidAmount', e.target.value)} placeholder="0" className="task-input" /></div>
                        <div className="field-group"><Label className="field-label">مبلغ تخصیص</Label><Input type="number" value={a.allocationAmount} onChange={(e) => updateAlloc(i, 'allocationAmount', e.target.value)} placeholder="0" className="task-input" /></div>
                      </div>
                    </div>
                  ))}
                  {errors.allocations && <span className="field-error">{errors.allocations}</span>}
                  <div className="flex items-center justify-end gap-3 rounded-lg bg-sky-50 p-3 dark:bg-sky-900/20">
                    <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">جمع تخصیص‌یافته:</span>
                    <span className="text-lg font-bold text-sky-700 dark:text-sky-300">{formatToman(totalAllocated)} تومان</span>
                    <span className="text-xs text-sky-400">از {formatToman(announcementAmount)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/financial-announcements')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت اعلامیه</>}
              </button>
            </div>
          </form>

          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنمای ثبت</h2>
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
              <p>پس از ثبت اعلامیه، باید آن را تکمیل، تأیید و سپس سند حسابداری را صادر کنید. چرخه: ایجاد ← تکمیل ← تأیید ← صدور سند ← نهایی‌سازی.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
