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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, FileText, Calendar, Landmark, Loader2, Plus,
  Lightbulb, Info, FileCheck, AlertCircle, Scale, Wallet,
  Hash, Trash2,
} from 'lucide-react';
import { toLocalDateString, formatToman, formatJalali } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  Account, FiscalYear, CostCenter, PettyCashExpense,
  PettyCashMergeStatement, PettyCashCustodian, Profile,
} from '@/lib/types';

const guideItems = [
  { icon: FileText, title: 'انتخاب سند مبنا', desc: 'سند تأییدشده تنخواه یا صورت ادغام را انتخاب کنید.' },
  { icon: Landmark, title: 'تعیین حساب‌ها', desc: 'حساب هزینه و تنخواه‌دار برای هر ردیف مشخص کنید.' },
  { icon: Scale, title: 'کنترل توازن', desc: 'جمع بدهکار باید با جمع بستانکار برابر باشد.' },
  { icon: AlertCircle, title: 'کنترل دوره مالی', desc: 'تاریخ سند باید در دوره مالی باز قرار داشته باشد.' },
  { icon: FileCheck, title: 'شماره‌گذاری یکتا', desc: 'سند صادرشده شماره سیستمی یکتا دریافت می‌کند.' },
];

interface LineDraft {
  accountId: string;
  accountRole: string;
  debit: string;
  credit: string;
  description: string;
  costCenterId: string;
}

const ACCOUNT_ROLE_LABEL: Record<string, string> = {
  expense: 'حساب هزینه',
  custodian: 'حساب تنخواه‌دار',
  payable: 'حساب پرداختی',
  tax: 'مالیات و عوارض',
  other: 'سایر',
};

export default function NewDocumentIssuancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [custodians, setCustodians] = useState<PettyCashCustodian[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [sourceExpenses, setSourceExpenses] = useState<PettyCashExpense[]>([]);
  const [sourceMergeStmts, setSourceMergeStmts] = useState<PettyCashMergeStatement[]>([]);

  const [referenceType, setReferenceType] = useState('petty_cash_expense');
  const [referenceId, setReferenceId] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [operationDate, setOperationDate] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [accData, fyData, ccData, custData, staffData] = await Promise.all([
        fetchData<Account>('accounts', { where: { active: true } }),
        fetchData<FiscalYear>('fiscal_years', { where: { status: 'open' } }),
        fetchData<CostCenter>('cost_centers', { where: { active: true } }),
        fetchData<PettyCashCustodian>('petty_cash_custodians', {
          where: { active: true },
          include: { contactParty: true, profile: true, payments: true, expenses: true },
        }),
        fetchData<Profile>('profiles', { where: {} }),
      ]);
      setAccounts(accData || []);
      setFiscalYears(fyData || []);
      setCostCenters(ccData || []);
      setCustodians(custData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load source documents based on referenceType
  useEffect(() => {
    setReferenceId('');
    setLines([]);
    if (referenceType === 'petty_cash_expense') {
      fetchData<PettyCashExpense>('petty_cash_expenses', {
        where: { status: 'approved' },
        orderBy: { date: 'desc' },
      }).then((data) => setSourceExpenses(data || []))
        .catch(() => setSourceExpenses([]));
    } else if (referenceType === 'petty_cash_merge_statement') {
      fetchData<PettyCashMergeStatement>('petty_cash_merge_statements', {
        where: { status: 'approved' },
        orderBy: { createdAt: 'desc' },
        include: { expenses: true },
      }).then((data) => setSourceMergeStmts(data || []))
        .catch(() => setSourceMergeStmts([]));
    } else {
      setSourceExpenses([]);
      setSourceMergeStmts([]);
    }
  }, [referenceType]);

  const custodianName = (c: PettyCashCustodian) => {
    if (c.contactParty) {
      if (c.contactParty.type === 'individual') return `${c.contactParty.firstName || ''} ${c.contactParty.lastName || ''}`.trim() || 'بدون نام';
      return c.contactParty.companyName || 'بدون نام';
    }
    if (c.profile) return fullName(c.profile.firstName, c.profile.lastName);
    return 'بدون نام';
  };

  // Auto-generate lines when source document is selected
  useEffect(() => {
    if (!referenceId) { setLines([]); return; }
    if (referenceType === 'petty_cash_expense') {
      const exp = sourceExpenses.find((e) => e.id === referenceId);
      if (exp) {
        const expenseAccount = accounts.find((a) => a.type === 'expense' && a.level === 3);
        const custodianAccount = accounts.find((a) => a.type === 'asset' && a.level === 3);
        setLines([
          { accountId: expenseAccount?.id || '', accountRole: 'expense', debit: String(exp.amount), credit: '0', description: exp.description || exp.expenseType, costCenterId: costCenterId || '' },
          { accountId: custodianAccount?.id || '', accountRole: 'custodian', debit: '0', credit: String(exp.amount), description: 'تنخواه‌دار', costCenterId: costCenterId || '' },
        ]);
        setOperationDate(exp.date.split('T')[0]);
      }
    } else if (referenceType === 'petty_cash_merge_statement') {
      const ms = sourceMergeStmts.find((m) => m.id === referenceId);
      if (ms) {
        const expenseAccount = accounts.find((a) => a.type === 'expense' && a.level === 3);
        const custodianAccount = accounts.find((a) => a.type === 'asset' && a.level === 3);
        setLines([
          { accountId: expenseAccount?.id || '', accountRole: 'expense', debit: String(ms.totalAmount), credit: '0', description: ms.description || 'صورت ادغام', costCenterId: costCenterId || '' },
          { accountId: custodianAccount?.id || '', accountRole: 'custodian', debit: '0', credit: String(ms.totalAmount), description: 'تنخواه‌دار', costCenterId: costCenterId || '' },
        ]);
        setOperationDate(ms.date.split('T')[0]);
      }
    }
  }, [referenceId, referenceType, sourceExpenses, sourceMergeStmts, accounts, costCenterId]);

  const totalDebit = useMemo(() => lines.reduce((s, l) => s + (Number(l.debit) || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + (Number(l.credit) || 0), 0), [lines]);
  const balanced = totalDebit === totalCredit;

  const addLine = () => {
    setLines([...lines, { accountId: '', accountRole: 'expense', debit: '0', credit: '0', description: '', costCenterId: '' }]);
  };

  const updateLine = (idx: number, field: keyof LineDraft, value: string) => {
    setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!referenceId) e.referenceId = 'انتخاب سند مبنا الزامی است';
    if (!documentDate) e.documentDate = 'تاریخ سند الزامی است';
    if (!operationDate) e.operationDate = 'تاریخ عملیات الزامی است';
    if (lines.length === 0) e.lines = 'حداقل یک ردیف حسابداری لازم است';
    if (!balanced) e.balance = 'سند متوازن نیست';
    if (fiscalYearId) {
      const fy = fiscalYears.find((f) => f.id === fiscalYearId);
      if (fy && fy.status !== 'open') e.fiscalYear = 'دوره مالی بسته است';
    }
    lines.forEach((l, i) => {
      if (!l.accountId) e[`line_${i}`] = 'حساب را انتخاب کنید';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const doc = await createData('document_issuances', {
        number: `DOC-${Date.now()}`,
        documentType: referenceType === 'petty_cash_merge_statement' ? 'petty_cash_merge' : 'petty_cash_expense',
        referenceType,
        referenceId,
        fiscalYearId: fiscalYearId || null,
        costCenterId: costCenterId || null,
        operationDate: operationDate ? new Date(operationDate).toISOString() : new Date().toISOString(),
        documentDate: documentDate ? new Date(documentDate).toISOString() : new Date().toISOString(),
        description: description || null,
        totalDebit,
        totalCredit,
        status: 'draft',
        createdBy: profile.id,
      }) as any;

      // Create lines
      for (const line of lines) {
        if (line.accountId) {
          await createData('document_issuance_lines', {
            documentIssuanceId: doc.id,
            accountId: line.accountId,
            accountRole: line.accountRole,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            description: line.description || null,
            costCenterId: line.costCenterId || null,
          });
        }
      }

      // Record history
      try {
        await createData('document_issuance_histories', {
          documentIssuanceId: doc.id,
          action: 'created',
          actionBy: profile.id,
          toStatus: 'draft',
          details: { referenceType, referenceId, lineCount: lines.length },
        });
      } catch {}

      toast.success('سند صدور ایجاد شد');
      router.push('/dashboard/document-issuance');
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
            <h1 className="text-[28px] font-bold text-[#101828]">صدور سند جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> صدور اسناد <span className="mx-1.5 text-[#CBD5E1]">←</span> ایجاد</div>
        </div>
        <Link href="/dashboard/document-issuance">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Source document selection */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileText className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">انتخاب سند مبنا</h2>
                    <p className="text-xs text-[#98A2B3]">سند تأییدشده‌ای که می‌خواهید به حسابداری ارسال شود را انتخاب کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع سند مبنا <span className="text-rose-500">*</span></Label>
                    <Select value={referenceType} onValueChange={setReferenceType}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petty_cash_expense">سند هزینه تنخواه</SelectItem>
                        <SelectItem value="petty_cash_merge_statement">صورت ادغام اسناد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">سند مرجع <span className="text-rose-500">*</span></Label>
                    <Select value={referenceId} onValueChange={setReferenceId}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                        <SelectValue placeholder="انتخاب سند..." />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceType === 'petty_cash_expense' && sourceExpenses.map((exp) => (
                          <SelectItem key={exp.id} value={exp.id}>
                            {exp.number} - {exp.expenseType} ({formatToman(Number(exp.amount))} ت)
                          </SelectItem>
                        ))}
                        {referenceType === 'petty_cash_merge_statement' && sourceMergeStmts.map((ms) => (
                          <SelectItem key={ms.id} value={ms.id}>
                            {ms.number} - ({formatToman(Number(ms.totalAmount))} ت)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.referenceId && <span className="text-xs text-rose-500">{errors.referenceId}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Header info */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Landmark className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات سند</h2>
                    <p className="text-xs text-[#98A2B3]">تاریخ‌ها و اطلاعات دوره مالی را مشخص کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ عملیات <span className="text-rose-500">*</span></Label>
                    <div className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-3">
                      <Calendar className="h-4 w-4 text-[#98A2B3]" />
                      <JalaliDatePicker value={operationDate ? new Date(operationDate) : null} onChange={(d) => setOperationDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="h-[42px] flex-1 border-0 p-0 focus:ring-0" />
                    </div>
                    {errors.operationDate && <span className="text-xs text-rose-500">{errors.operationDate}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ سند حسابداری <span className="text-rose-500">*</span></Label>
                    <div className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-3">
                      <Calendar className="h-4 w-4 text-[#98A2B3]" />
                      <JalaliDatePicker value={documentDate ? new Date(documentDate) : null} onChange={(d) => setDocumentDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="h-[42px] flex-1 border-0 p-0 focus:ring-0" />
                    </div>
                    {errors.documentDate && <span className="text-xs text-rose-500">{errors.documentDate}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">دوره مالی</Label>
                    <Select value={fiscalYearId || '__none__'} onValueChange={(v) => setFiscalYearId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                        <span className="flex items-center gap-2"><Landmark className="h-4 w-4 text-[#98A2B3]" /></span>
                        <SelectValue placeholder="انتخاب دوره مالی..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">بدون دوره</SelectItem>
                        {fiscalYears.map((fy) => <SelectItem key={fy.id} value={fy.id}>{fy.name} ({fy.status === 'open' ? 'باز' : 'بسته'})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.fiscalYear && <span className="text-xs text-rose-500">{errors.fiscalYear}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مرکز هزینه</Label>
                    <Select value={costCenterId || '__none__'} onValueChange={(v) => setCostCenterId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                        <span className="flex items-center gap-2"><Landmark className="h-4 w-4 text-[#98A2B3]" /></span>
                        <SelectValue placeholder="انتخاب مرکز هزینه..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">بدون مرکز هزینه</SelectItem>
                        {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">شرح</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح سند..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            {/* Accounting lines */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Scale className="h-5 w-5" /></span>
                    <div>
                      <h2 className="text-base font-bold text-[#1D2939]">آرتیکل‌های حسابداری</h2>
                      <p className="text-xs text-[#98A2B3]">ردیف‌های بدهکار و بستانکار را وارد کنید. سند باید متوازن باشد.</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> ردیف جدید</Button>
                </div>

                {errors.lines && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.lines}</div>}

                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div key={idx} className="rounded-[10px] border border-[#E6EBF2] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs font-semibold text-[#98A2B3]"><Hash className="h-3 w-3" /> ردیف {(idx + 1).toLocaleString('fa-IR')}</span>
                        <button type="button" onClick={() => removeLine(idx)} className="text-[#98A2B3] transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-[#98A2B3]">حساب</Label>
                          <Select value={line.accountId} onValueChange={(v) => updateLine(idx, 'accountId', v)}>
                            <SelectTrigger className="h-9 rounded-[8px] border-[#DCE3EE] text-xs"><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-[#98A2B3]">نقش</Label>
                          <Select value={line.accountRole} onValueChange={(v) => updateLine(idx, 'accountRole', v)}>
                            <SelectTrigger className="h-9 rounded-[8px] border-[#DCE3EE] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ACCOUNT_ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-[#98A2B3]">بدهکار</Label>
                          <Input value={line.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} className="h-9 rounded-[8px] border-[#DCE3EE] text-xs" type="number" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-[#98A2B3]">بستانکار</Label>
                          <Input value={line.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} className="h-9 rounded-[8px] border-[#DCE3EE] text-xs" type="number" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Input value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} placeholder="شرح ردیف..." className="h-9 rounded-[8px] border-[#DCE3EE] text-xs" />
                      </div>
                    </div>
                  ))}
                  {lines.length === 0 && <div className="rounded-[12px] border border-dashed border-[#DCE3EE] py-8 text-center text-sm text-[#CBD5E1]">هنوز ردیفی اضافه نشده است. روی «ردیف جدید» کلیک کنید.</div>}
                </div>

                {/* Balance summary */}
                {lines.length > 0 && (
                  <div className={`mt-4 flex items-center justify-between rounded-[10px] p-3 ${balanced ? 'bg-green-50' : 'bg-rose-50'}`}>
                    <div className="flex items-center gap-2">
                      <Scale className={`h-5 w-5 ${balanced ? 'text-green-600' : 'text-rose-600'}`} />
                      <span className={`text-sm font-semibold ${balanced ? 'text-green-700' : 'text-rose-700'}`}>{balanced ? 'سند متوازن است' : 'سند متوازن نیست!'}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span>بدهکار: <strong className="text-[#1D2939]">{formatToman(totalDebit)}</strong></span>
                      <span>بستانکار: <strong className="text-[#1D2939]">{formatToman(totalCredit)}</strong></span>
                    </div>
                  </div>
                )}
                {errors.balance && <div className="mt-2 text-xs text-rose-500">{errors.balance}</div>}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/document-issuance"><Button type="button" variant="outline" className="h-[42px] rounded-[10px]">انصراف</Button></Link>
              <Button type="submit" disabled={submitting || lines.length === 0} className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</> : <><Plus className="h-4 w-4" /> ایجاد سند</>}
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
              <p className="text-xs leading-6 text-[#344054]">صدور سند، اطلاعات تأییدشده تنخواه را به سند حسابداری متوازن و شماره‌دار تبدیل می‌کند. پس از ایجاد، سند در صفحه مدیریت اسناد قابل مشاهده و در صورت نیاز قابل صدور، قطعی یا ابطال است.</p>
            </div>

            {lines.length > 0 && (
              <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
                <h2 className="mb-3 text-sm font-bold text-[#101828]">خلاصه سند</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#98A2B3]">تعداد ردیف</span><span className="font-bold text-[#344054]">{lines.length.toLocaleString('fa-IR')}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">جمع بدهکار</span><span className="font-bold text-[#3155E7]">{formatToman(totalDebit)}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">جمع بستانکار</span><span className="font-bold text-[#3155E7]">{formatToman(totalCredit)}</span></div>
                  <div className="flex justify-between border-t border-[#F1F5F9] pt-2"><span className="text-[#98A2B3]">وضعیت توازن</span><span className={`font-bold ${balanced ? 'text-green-600' : 'text-rose-600'}`}>{balanced ? 'متوازن' : 'نامتوازن'}</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </form>
    </div>
  );
}
