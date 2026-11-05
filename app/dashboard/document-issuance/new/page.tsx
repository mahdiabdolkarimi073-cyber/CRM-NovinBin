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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, FileText, Calendar, Landmark, Loader2, Plus,
  Lightbulb, Info, FileCheck, AlertCircle, Scale, Wallet,
  Hash, Trash2,
} from 'lucide-react';
import { toLocalDateString, formatToman } from '@/lib/format';
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
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>صدور سند جدید</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> صدور اسناد <b>←</b> ایجاد</div>
          </div>
          <Link href="/dashboard/document-issuance" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به اسناد
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            {/* Source document selection */}
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><FileText className="h-5 w-5" /></span>
                <div>
                  <h2>انتخاب سند مبنا</h2>
                  <p>سند تأییدشده‌ای که می‌خواهید به حسابداری ارسال شود را انتخاب کنید.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">نوع سند مبنا <span className="required-star">*</span></Label>
                  <Select value={referenceType} onValueChange={setReferenceType}>
                    <SelectTrigger className="task-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petty_cash_expense">سند هزینه تنخواه</SelectItem>
                      <SelectItem value="petty_cash_merge_statement">صورت ادغام اسناد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="field-group">
                  <Label className="field-label">سند مرجع <span className="required-star">*</span></Label>
                  <Select value={referenceId} onValueChange={setReferenceId}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب سند..." /></SelectTrigger>
                    <SelectContent>
                      {referenceType === 'petty_cash_expense' && sourceExpenses.map((exp) => (
                        <SelectItem key={exp.id} value={exp.id}>{exp.number} - {exp.expenseType} ({formatToman(Number(exp.amount))} ت)</SelectItem>
                      ))}
                      {referenceType === 'petty_cash_merge_statement' && sourceMergeStmts.map((ms) => (
                        <SelectItem key={ms.id} value={ms.id}>{ms.number} - ({formatToman(Number(ms.totalAmount))} ت)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.referenceId && <span className="field-error">{errors.referenceId}</span>}
                </div>
              </div>
            </div>

            {/* Header info */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Landmark className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات سند</h2>
                  <p>تاریخ‌ها و اطلاعات دوره مالی را مشخص کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">تاریخ عملیات <span className="required-star">*</span></Label>
                  <div className="date-input-wrap"><span className="date-icon"><Calendar className="h-4 w-4" /></span><JalaliDatePicker value={operationDate ? new Date(operationDate) : null} onChange={(d) => setOperationDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" /></div>
                  {errors.operationDate && <span className="field-error">{errors.operationDate}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">تاریخ سند حسابداری <span className="required-star">*</span></Label>
                  <div className="date-input-wrap"><span className="date-icon"><Calendar className="h-4 w-4" /></span><JalaliDatePicker value={documentDate ? new Date(documentDate) : null} onChange={(d) => setDocumentDate(d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" /></div>
                  {errors.documentDate && <span className="field-error">{errors.documentDate}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">دوره مالی</Label>
                  <Select value={fiscalYearId || '__none__'} onValueChange={(v) => setFiscalYearId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><Landmark className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب دوره مالی..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون دوره</SelectItem>
                      {fiscalYears.map((fy) => <SelectItem key={fy.id} value={fy.id}>{fy.name} ({fy.status === 'open' ? 'باز' : 'بسته'})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.fiscalYear && <span className="field-error">{errors.fiscalYear}</span>}
                </div>
                <div className="field-group">
                  <Label className="field-label">مرکز هزینه</Label>
                  <Select value={costCenterId || '__none__'} onValueChange={(v) => setCostCenterId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><Landmark className="ml-1 h-4 w-4 text-slate-400" /><SelectValue placeholder="انتخاب مرکز هزینه..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون مرکز هزینه</SelectItem>
                      {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="field-group">
                <Label className="field-label">شرح</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح سند..." className="task-textarea" />
              </div>
            </div>

            {/* Accounting lines */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Scale className="h-5 w-5" /></span>
                <div>
                  <h2>آرتیکل‌های حسابداری</h2>
                  <p>ردیف‌های بدهکار و بستانکار را وارد کنید. سند باید متوازن باشد.</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="mr-auto"><Plus className="h-4 w-4" /> ردیف جدید</Button>
            </div>

            {errors.lines && <div className="mb-3 ml-5 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.lines}</div>}

            <div className="space-y-3 px-5 pb-3">
              {lines.map((line, idx) => (
                <div key={idx} className="rounded-[10px] border border-slate-200 p-3 dark:border-slate-700">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-400"><Hash className="h-3 w-3" /> ردیف {(idx + 1).toLocaleString('fa-IR')}</span>
                    <button type="button" onClick={() => removeLine(idx)} className="text-slate-400 transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 lg:grid-cols-4">
                    <div className="field-group"><Label className="field-label">حساب</Label><Select value={line.accountId} onValueChange={(v) => updateLine(idx, 'accountId', v)}><SelectTrigger className="task-select"><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="field-group"><Label className="field-label">نقش</Label><Select value={line.accountRole} onValueChange={(v) => updateLine(idx, 'accountRole', v)}><SelectTrigger className="task-select"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ACCOUNT_ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                    <div className="field-group"><Label className="field-label">بدهکار</Label><Input value={line.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} className="task-input" type="number" /></div>
                    <div className="field-group"><Label className="field-label">بستانکار</Label><Input value={line.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} className="task-input" type="number" /></div>
                  </div>
                  <div className="mt-2"><Input value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} placeholder="شرح ردیف..." className="task-input" /></div>
                  {errors[`line_${idx}`] && <span className="field-error">{errors[`line_${idx}`]}</span>}
                </div>
              ))}
              {lines.length === 0 && <div className="rounded-[12px] border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700">هنوز ردیفی اضافه نشده است. روی «ردیف جدید» کلیک کنید.</div>}
            </div>

            {lines.length > 0 && (
              <div className={`mx-5 mb-3 flex items-center justify-between rounded-[10px] p-3 ${balanced ? 'bg-green-50 dark:bg-green-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
                <div className="flex items-center gap-2">
                  <Scale className={`h-5 w-5 ${balanced ? 'text-green-600' : 'text-rose-600'}`} />
                  <span className={`text-sm font-semibold ${balanced ? 'text-green-700 dark:text-green-400' : 'text-rose-700 dark:text-rose-400'}`}>{balanced ? 'سند متوازن است' : 'سند متوازن نیست!'}</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
                  <span>بدهکار: <strong className="text-slate-800 dark:text-slate-200">{formatToman(totalDebit)}</strong></span>
                  <span>بستانکار: <strong className="text-slate-800 dark:text-slate-200">{formatToman(totalCredit)}</strong></span>
                </div>
              </div>
            )}
            {errors.balance && <div className="mb-3 ml-5 text-xs text-rose-500">{errors.balance}</div>}

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/document-issuance')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting || lines.length === 0}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : (<><Plus className="h-4 w-4" /> ایجاد سند</>)}
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
              <p>صدور سند، اطلاعات تأییدشده تنخواه را به سند حسابداری متوازن و شماره‌دار تبدیل می‌کند. پس از ایجاد، سند در صفحه مدیریت اسناد قابل مشاهده و در صورت نیاز قابل صدور، قطعی یا ابطال است.</p>
            </div>

            {lines.length > 0 && (
              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-card-icon"><Scale className="h-5 w-5" /></span>
                  <h2>خلاصه سند</h2>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">تعداد ردیف</span><span className="font-bold text-slate-700 dark:text-slate-300">{lines.length.toLocaleString('fa-IR')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">جمع بدهکار</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(totalDebit)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">جمع بستانکار</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(totalCredit)}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 dark:border-slate-700"><span className="text-slate-400">وضعیت توازن</span><span className={`font-bold ${balanced ? 'text-green-600' : 'text-rose-600'}`}>{balanced ? 'متوازن' : 'نامتوازن'}</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
