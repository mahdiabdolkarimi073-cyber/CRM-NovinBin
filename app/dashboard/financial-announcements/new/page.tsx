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
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت اعلامیه مالی جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> اعلامیه‌های مالی <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/financial-announcements">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileText className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات اعلامیه</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات اعلامیه بدهکار یا بستانکار را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره اعلامیه</Label>
                    <Input value={number} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع اعلامیه <span className="text-rose-500">*</span></Label>
                    <select value={announcementType} onChange={(e) => setAnnouncementType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {ANNOUNCEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">طرف حساب <span className="text-rose-500">*</span></Label>
                    <select value={contactPartyId} onChange={(e) => {
                      setContactPartyId(e.target.value);
                      const cp = contactParties.find((c) => c.id === e.target.value);
                      setContactPartyName(cp ? [cp.firstName, cp.lastName, cp.companyName].filter(Boolean).join(' ') : '');
                    }} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب طرف حساب...</option>
                      {contactParties.map((cp) => <option key={cp.id} value={cp.id}>{[cp.firstName, cp.lastName, cp.companyName].filter(Boolean).join(' ')}</option>)}
                    </select>
                    {errors.contactPartyId && <span className="text-xs text-rose-500">{errors.contactPartyId}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ عملیات <span className="text-rose-500">*</span></Label>
                    <Input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.operationDate && <span className="text-xs text-rose-500">{errors.operationDate}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مبلغ اعلامیه (تومان) <span className="text-rose-500">*</span></Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مبلغ..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.amount && <span className="text-xs text-rose-500">{errors.amount}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">سند مبنا</Label>
                    <select value={sourceDocType} onChange={(e) => setSourceDocType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {SOURCE_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {sourceDocType && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#344054]">شماره سند مبنا</Label>
                      <Input value={sourceDocNumber} onChange={(e) => setSourceDocNumber(e.target.value)} placeholder="شماره..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">دوره مالی</Label>
                    <select value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب...</option>
                      {fiscalYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مرکز هزینه</Label>
                    <select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب...</option>
                      {costCenters.map((cc) => <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">حساب مقابل</Label>
                    <select value={oppositeAccountId} onChange={(e) => {
                      setOppositeAccountId(e.target.value);
                      const acc = accounts.find((a) => a.id === e.target.value);
                      setOppositeAccountName(acc ? `${acc.code} — ${acc.name}` : '');
                    }} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">علت ثبت <span className="text-rose-500">*</span></Label>
                  <Input value={reasonDescription} onChange={(e) => setReasonDescription(e.target.value)} placeholder="علت ثبت اعلامیه..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  {errors.reasonDescription && <span className="text-xs text-rose-500">{errors.reasonDescription}</span>}
                </div>
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">کد علت (اختیاری)</Label>
                  <Input value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} placeholder="کد علت..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                </div>
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">شرح مالی</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح کامل عملیات مالی..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><AlertCircle className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">مالیات</h2>
                    <p className="text-xs text-[#98A2B3]">در صورت نیاز به کنترل مالیاتی، اطلاعات را وارد کنید.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مبلغ مشمول</Label>
                    <Input type="number" value={taxSubjectAmount} onChange={(e) => setTaxSubjectAmount(e.target.value)} placeholder="0" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نرخ (٪)</Label>
                    <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">وضعیت مالیاتی</Label>
                    <select value={taxStatus} onChange={(e) => setTaxStatus(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {TAX_STATUS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">حساب مالیاتی</Label>
                    <select value={taxAccountId} onChange={(e) => setTaxAccountId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                </div>
                {taxAmount > 0 && (
                  <div className="mt-3 flex items-center justify-end gap-3 rounded-lg bg-rose-50 p-3">
                    <span className="text-sm font-semibold text-rose-600">مبلغ مالیات:</span>
                    <span className="text-lg font-bold text-rose-700">{formatToman(taxAmount)} تومان</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500"><ArrowRightLeft className="h-5 w-5" /></span>
                    <div>
                      <h2 className="text-base font-bold text-[#1D2939]">تخصیص به اسناد باز</h2>
                      <p className="text-xs text-[#98A2B3]">مبلغ اعلامیه را بین اسناد باز طرف حساب توزیع کنید.</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addAlloc}><Plus className="h-4 w-4" /> افزودن تخصیص</Button>
                </div>

                <div className="space-y-3">
                  {allocations.map((a, i) => (
                    <div key={i} className="rounded-lg border border-[#E7ECF3] bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#667085]">تخصیص {toEnglishDigits(String(i + 1))}</span>
                        {allocations.length > 1 && <button type="button" onClick={() => removeAlloc(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <select value={a.allocationType} onChange={(e) => updateAlloc(i, 'allocationType', e.target.value)} className="h-[38px] rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm">
                          {ALLOCATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <Input placeholder="شماره سند" value={a.referenceNumber} onChange={(e) => updateAlloc(i, 'referenceNumber', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input type="number" placeholder="مبلغ اصل" value={a.originalAmount} onChange={(e) => updateAlloc(i, 'originalAmount', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input type="number" placeholder="پرداخت شده" value={a.paidAmount} onChange={(e) => updateAlloc(i, 'paidAmount', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input type="number" placeholder="مبلغ تخصیص" value={a.allocationAmount} onChange={(e) => updateAlloc(i, 'allocationAmount', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                      </div>
                    </div>
                  ))}
                </div>

                {errors.allocations && <span className="mt-2 block text-xs text-rose-500">{errors.allocations}</span>}

                <div className="mt-4 flex items-center justify-end gap-3 rounded-lg bg-blue-50 p-3">
                  <span className="text-sm font-semibold text-blue-600">جمع تخصیص‌یافته:</span>
                  <span className="text-lg font-bold text-blue-700">{formatToman(totalAllocated)} تومان</span>
                  <span className="text-xs text-blue-400">از {formatToman(announcementAmount)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/financial-announcements">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت اعلامیه</>}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><Lightbulb className="h-5 w-5" /></span>
                  <h2 className="text-base font-bold text-[#1D2939]">راهنمای ثبت</h2>
                </div>
                <div className="space-y-3">
                  {guideItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#3155E7]"><item.icon className="h-3.5 w-3.5" /></span>
                      <div>
                        <div className="text-sm font-semibold text-[#344054]">{item.title}</div>
                        <div className="mt-0.5 text-xs text-[#98A2B3]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-[12px] border border-blue-100 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700">پس از ثبت اعلامیه، باید آن را تکمیل، تأیید و سپس سند حسابداری را صادر کنید. چرخه: ایجاد ← تکمیل ← تأیید ← صدور سند ← نهایی‌سازی.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
