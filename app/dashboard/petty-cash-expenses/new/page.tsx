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
  ArrowRight, FileText, Wallet, Calendar, Landmark,
  Loader2, Plus, Hash, Trash2, Lightbulb, Info,
  Type, AlignRight, FileCheck, AlertCircle,
} from 'lucide-react';
import { toLocalDateString, formatToman } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  PettyCashCustodian, Profile, FiscalYear, CostCenter, Account, ContactParty,
} from '@/lib/types';

interface ExpenseRow {
  id: string;
  date: string;
  expenseType: string;
  accountId: string;
  amount: string;
  description: string;
  costCenterId: string;
  vendorName: string;
  invoiceNumber: string;
}

const guideItems = [
  { icon: Type, title: 'انتخاب تنخواه‌دار', desc: 'تنخواه‌دار مربوطه را انتخاب کنید.' },
  { icon: AlignRight, title: 'ثبت ردیف‌های هزینه', desc: 'هر هزینه را به‌عنوان یک ردیف اضافه کنید.' },
  { icon: FileCheck, title: 'ثبت حساب هزینه', desc: 'برای هر ردیف، حساب هزینه مربوطه را انتخاب کنید.' },
  { icon: Calendar, title: 'تاریخ هزینه', desc: 'تاریخ هر هزینه را به‌درستی وارد کنید.' },
  { icon: AlertCircle, title: 'کنترل مبلغ', desc: 'جمع هزینه‌ها نباید از مانده تنخواه بیشتر باشد.' },
];

export default function NewPettyCashExpensePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [custodians, setCustodians] = useState<PettyCashCustodian[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [custodianId, setCustodianId] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<ExpenseRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [custData, fyData, ccData, accData] = await Promise.all([
        fetchData<PettyCashCustodian>('petty_cash_custodians', {
          where: { active: true },
          include: { contactParty: true, profile: true, payments: true, expenses: true },
        }),
        fetchData<FiscalYear>('fiscal_years', { where: { status: 'open' } }),
        fetchData<CostCenter>('cost_centers', { where: { active: true } }),
        fetchData<Account>('accounts', { where: { active: true, type: 'expense' } }),
      ]);
      setCustodians(custData || []);
      setFiscalYears(fyData || []);
      setCostCenters(ccData || []);
      setAccounts(accData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const custodianName = (c: PettyCashCustodian) => {
    if (c.contactParty) {
      if (c.contactParty.type === 'individual') return `${c.contactParty.firstName || ''} ${c.contactParty.lastName || ''}`.trim() || 'بدون نام';
      return c.contactParty.companyName || 'بدون نام';
    }
    if (c.profile) return fullName(c.profile.firstName, c.profile.lastName);
    return 'بدون نام';
  };

  const getCustodianBalance = (c: PettyCashCustodian) => {
    const totalPayments = (c.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalExpenses = (c.expenses || []).filter((e) => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return totalPayments - totalExpenses;
  };

  const selectedCustodian = custodians.find((c) => c.id === custodianId);
  const custodianBalance = selectedCustodian ? getCustodianBalance(selectedCustodian) : 0;
  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const overBalance = totalAmount > custodianBalance;

  const addRow = () => {
    setRows([...rows, {
      id: crypto.randomUUID(),
      date: date || '',
      expenseType: '',
      accountId: '',
      amount: '',
      description: '',
      costCenterId: '',
      vendorName: '',
      invoiceNumber: '',
    }]);
  };

  const updateRow = (id: string, field: keyof ExpenseRow, value: string) => {
    setRows(rows.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!custodianId) e.custodianId = 'انتخاب تنخواه‌دار الزامی است';
    if (!date) e.date = 'تاریخ صورت هزینه الزامی است';
    if (rows.length === 0) e.rows = 'حداقل یک ردیف هزینه الزامی است';
    rows.forEach((r, i) => {
      if (!r.expenseType.trim()) e[`row_${r.id}_type`] = 'نوع هزینه الزامی است';
      if (!r.amount || Number(r.amount) <= 0) e[`row_${r.id}_amount`] = 'مبلغ معتبر وارد کنید';
    });
    if (overBalance) e.balance = 'جمع هزینه‌ها از مانده تنخواه بیشتر است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const stmt = await createData('petty_cash_expense_statements', {
        number: `PCE-${Date.now()}`,
        custodianId,
        fiscalYearId: fiscalYearId || null,
        costCenterId: costCenterId || null,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        description: description || null,
        totalAmount: totalAmount,
        status: 'draft',
        createdBy: profile.id,
      });

      for (const row of rows) {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'petty_cash_expense_statement_items',
            data: {
              statementId: (stmt as any).id,
              date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
              expenseType: row.expenseType.trim(),
              accountId: row.accountId || null,
              amount: Number(row.amount),
              description: row.description || null,
              costCenterId: row.costCenterId || null,
              vendorName: row.vendorName || null,
              invoiceNumber: row.invoiceNumber || null,
              status: 'pending',
            },
          }),
        });
      }

      toast.success('صورت هزینه تنخواه ایجاد شد');
      router.push('/dashboard/petty-cash-expenses');
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
              <h1>ایجاد صورت هزینه تنخواه</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> صورت هزینه تنخواه <b>←</b> ایجاد</div>
          </div>
          <Link href="/dashboard/petty-cash-expenses" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به صورت هزینه‌ها
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><FileText className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات سربرگ</h2>
                  <p>اطلاعات اصلی صورت هزینه را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">تنخواه‌دار <span className="required-star">*</span></Label>
                  <Select value={custodianId} onValueChange={setCustodianId}>
                    <SelectTrigger className="task-select">
                      <Wallet className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="انتخاب تنخواه‌دار..." />
                    </SelectTrigger>
                    <SelectContent>
                      {custodians.map((c) => <SelectItem key={c.id} value={c.id}>{custodianName(c)} ({c.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.custodianId && <span className="field-error">{errors.custodianId}</span>}
                  {selectedCustodian && (
                    <div className="rounded-md bg-sky-50 px-3 py-2 text-xs text-slate-600 dark:bg-sky-900/20 dark:text-slate-300">
                      مانده تنخواه: <span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(custodianBalance)}</span> تومان
                    </div>
                  )}
                </div>

                <div className="field-group">
                  <Label className="field-label">تاریخ صورت هزینه <span className="required-star">*</span></Label>
                  <div className="date-input-wrap">
                    <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                    <JalaliDatePicker
                      value={date ? new Date(date) : null}
                      onChange={(d) => setDate(d ? toLocalDateString(d) : '')}
                      placeholder="انتخاب تاریخ"
                      className="task-date-input"
                    />
                  </div>
                  {errors.date && <span className="field-error">{errors.date}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">دوره مالی</Label>
                  <Select value={fiscalYearId || '__none__'} onValueChange={(v) => setFiscalYearId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select">
                      <Landmark className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="انتخاب دوره مالی..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون دوره</SelectItem>
                      {fiscalYears.map((fy) => <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">مرکز هزینه</Label>
                  <Select value={costCenterId || '__none__'} onValueChange={(v) => setCostCenterId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select">
                      <Landmark className="ml-1 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="انتخاب مرکز هزینه..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون مرکز هزینه</SelectItem>
                      {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">شرح کلی</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح کلی صورت هزینه..." className="task-textarea" />
              </div>
            </div>

            {/* Expense rows */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><FileCheck className="h-5 w-5" /></span>
                <div>
                  <h2>ردیف‌های هزینه</h2>
                  <p>هر هزینه را به‌عنوان یک ردیف اضافه کنید.</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="mr-auto">
                <Plus className="h-4 w-4" /> افزودن ردیف
              </Button>
            </div>

            {errors.rows && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.rows}</div>}

            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div key={row.id} className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">ردیف {(idx + 1).toLocaleString('fa-IR')}</span>
                    <button type="button" onClick={() => removeRow(row.id)} className="text-slate-400 transition-colors hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="field-group">
                      <Label className="field-label">نوع هزینه <span className="required-star">*</span></Label>
                      <Input value={row.expenseType} onChange={(e) => updateRow(row.id, 'expenseType', e.target.value)} placeholder="مثال: لوازم اداری" className="task-input" />
                      {errors[`row_${row.id}_type`] && <span className="field-error">{errors[`row_${row.id}_type`]}</span>}
                    </div>
                    <div className="field-group">
                      <Label className="field-label">حساب هزینه</Label>
                      <Select value={row.accountId || '__none__'} onValueChange={(v) => updateRow(row.id, 'accountId', v === '__none__' ? '' : v)}>
                        <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">بدون حساب</SelectItem>
                          {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="field-group">
                      <Label className="field-label">مبلغ (تومان) <span className="required-star">*</span></Label>
                      <Input type="number" value={row.amount} onChange={(e) => updateRow(row.id, 'amount', e.target.value)} placeholder="مثال: 2000000" className="task-input" />
                      {errors[`row_${row.id}_amount`] && <span className="field-error">{errors[`row_${row.id}_amount`]}</span>}
                    </div>
                    <div className="field-group">
                      <Label className="field-label">تاریخ هزینه</Label>
                      <div className="date-input-wrap">
                        <span className="date-icon"><Calendar className="h-4 w-4" /></span>
                        <JalaliDatePicker value={row.date ? new Date(row.date) : null} onChange={(d) => updateRow(row.id, 'date', d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="task-date-input" />
                      </div>
                    </div>
                    <div className="field-group">
                      <Label className="field-label">مرکز هزینه</Label>
                      <Select value={row.costCenterId || '__none__'} onValueChange={(v) => updateRow(row.id, 'costCenterId', v === '__none__' ? '' : v)}>
                        <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">بدون مرکز هزینه</SelectItem>
                          {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="field-group">
                      <Label className="field-label">طرف حساب / فروشنده</Label>
                      <Input value={row.vendorName} onChange={(e) => updateRow(row.id, 'vendorName', e.target.value)} placeholder="اختیاری" className="task-input" />
                    </div>
                    <div className="field-group">
                      <Label className="field-label">شماره فاکتور / رسید</Label>
                      <Input value={row.invoiceNumber} onChange={(e) => updateRow(row.id, 'invoiceNumber', e.target.value)} placeholder="اختیاری" className="task-input" />
                    </div>
                    <div className="field-group sm:col-span-2">
                      <Label className="field-label">شرح هزینه</Label>
                      <Input value={row.description} onChange={(e) => updateRow(row.id, 'description', e.target.value)} placeholder="شرح هزینه..." className="task-input" />
                    </div>
                  </div>
                </div>
              ))}
              {rows.length === 0 && <div className="rounded-[12px] border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700">هنوز ردیف هزینه‌ای اضافه نشده است. روی «افزودن ردیف» کلیک کنید.</div>}
            </div>

            {/* Total */}
            <div className="mt-4 flex items-center justify-between rounded-[10px] bg-sky-50 px-4 py-3 dark:bg-sky-900/20">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">جمع کل هزینه‌ها:</span>
              <span className={`text-lg font-bold ${overBalance ? 'text-rose-600' : 'text-sky-600 dark:text-sky-400'}`}>{formatToman(totalAmount)} تومان</span>
            </div>
            {overBalance && <div className="mt-2 rounded-[10px] bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">جمع هزینه‌ها از مانده تنخواه ({formatToman(custodianBalance)} تومان) بیشتر است!</div>}
            {errors.balance && <div className="mt-2 text-xs text-rose-500">{errors.balance}</div>}

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/petty-cash-expenses')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : (<><Plus className="h-4 w-4" /> ایجاد صورت هزینه</>)}
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
                      <div className="guide-item-text">
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
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
              <p>صورت هزینه تنخواه، هزینه‌کرد تنخواه را ثبت و قابل تسویه می‌کند. پس از ایجاد، می‌توانید آن را برای تأیید ارسال کنید. پس از تأیید، سند حسابداری ثبت شده و مانده تنخواه کاهش می‌یابد.</p>
            </div>

            {selectedCustodian && (
              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-card-icon"><Wallet className="h-5 w-5" /></span>
                  <h2>وضعیت تنخواه</h2>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">سقف تنخواه</span><span className="font-bold text-slate-700 dark:text-slate-300">{formatToman(Number(selectedCustodian.ceiling))}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">مانده فعلی</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(custodianBalance)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">جمع این صورت</span><span className={`font-bold ${overBalance ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>{formatToman(totalAmount)}</span></div>
                  <div className="border-t border-slate-100 pt-2 dark:border-slate-700">
                    <div className="flex justify-between"><span className="text-slate-400">باقی‌مانده پس از ثبت</span><span className={`font-bold ${custodianBalance - totalAmount < 0 ? 'text-rose-600' : 'text-green-600'}`}>{formatToman(custodianBalance - totalAmount)}</span></div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
