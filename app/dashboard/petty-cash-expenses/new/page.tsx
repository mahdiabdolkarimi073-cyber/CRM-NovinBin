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
  ArrowRight, FileText, Wallet, Calendar, Landmark,
  Loader2, Plus, Hash, Trash2, Lightbulb, Info,
  Type, AlignRight, FileCheck, AlertCircle, Upload,
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
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ایجاد صورت هزینه تنخواه</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> صورت هزینه تنخواه <span className="mx-1.5 text-[#CBD5E1]">←</span> ایجاد</div>
        </div>
        <Link href="/dashboard/petty-cash-expenses">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileText className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات سربرگ</h2>
                    <p className="text-xs text-[#98A2B3]">اطلاعات اصلی صورت هزینه را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تنخواه‌دار <span className="text-rose-500">*</span></Label>
                    <Select value={custodianId} onValueChange={setCustodianId}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                        <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-[#98A2B3]" /></span>
                        <SelectValue placeholder="انتخاب تنخواه‌دار..." />
                      </SelectTrigger>
                      <SelectContent>
                        {custodians.map((c) => <SelectItem key={c.id} value={c.id}>{custodianName(c)} ({c.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.custodianId && <span className="text-xs text-rose-500">{errors.custodianId}</span>}
                    {selectedCustodian && (
                      <div className="mt-1 rounded-md bg-[#EFF4FF] px-3 py-2 text-xs text-[#344054]">
                        مانده تنخواه: <span className="font-bold text-[#3155E7]">{formatToman(custodianBalance)}</span> تومان
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ صورت هزینه <span className="text-rose-500">*</span></Label>
                    <div className="date-input-wrap">
                      <span className="flex h-[42px] items-center gap-2 rounded-[10px] border border-[#DCE3EE] bg-white px-3">
                        <Calendar className="h-4 w-4 text-[#98A2B3]" />
                        <JalaliDatePicker
                          value={date ? new Date(date) : null}
                          onChange={(d) => setDate(d ? toLocalDateString(d) : '')}
                          placeholder="انتخاب تاریخ"
                          className="h-[42px] flex-1 border-0 p-0 focus:ring-0"
                        />
                      </span>
                    </div>
                    {errors.date && <span className="text-xs text-rose-500">{errors.date}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">دوره مالی</Label>
                    <Select value={fiscalYearId} onValueChange={setFiscalYearId}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                        <span className="flex items-center gap-2"><Landmark className="h-4 w-4 text-[#98A2B3]" /></span>
                        <SelectValue placeholder="انتخاب دوره مالی..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">بدون دوره</SelectItem>
                        {fiscalYears.map((fy) => <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مرکز هزینه</Label>
                    <Select value={costCenterId} onValueChange={setCostCenterId}>
                      <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE3EE]">
                        <span className="flex items-center gap-2"><Landmark className="h-4 w-4 text-[#98A2B3]" /></span>
                        <SelectValue placeholder="انتخاب مرکز هزینه..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">بدون مرکز هزینه</SelectItem>
                        {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">شرح کلی</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح کلی صورت هزینه..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            {/* Expense rows */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileCheck className="h-5 w-5" /></span>
                    <div>
                      <h2 className="text-base font-bold text-[#1D2939]">ردیف‌های هزینه</h2>
                      <p className="text-xs text-[#98A2B3]">هر هزینه را به‌عنوان یک ردیف اضافه کنید.</p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4" /> افزودن ردیف</Button>
                </div>

                {errors.rows && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.rows}</div>}

                <div className="space-y-3">
                  {rows.map((row, idx) => (
                    <div key={row.id} className="rounded-[12px] border border-[#E6EBF2] bg-[#FAFBFC] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-[#344054]">ردیف {(idx + 1).toLocaleString('fa-IR')}</span>
                        <button type="button" onClick={() => removeRow(row.id)} className="text-[#98A2B3] transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#667085]">نوع هزینه *</Label>
                          <Input value={row.expenseType} onChange={(e) => updateRow(row.id, 'expenseType', e.target.value)} placeholder="مثال: لوازم اداری" className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          {errors[`row_${row.id}_type`] && <span className="text-[10px] text-rose-500">{errors[`row_${row.id}_type`]}</span>}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#667085]">حساب هزینه</Label>
                          <Select value={row.accountId} onValueChange={(v) => updateRow(row.id, 'accountId', v)}>
                            <SelectTrigger className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm"><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">بدون حساب</SelectItem>
                              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#667085]">مبلغ (تومان) *</Label>
                          <Input type="number" value={row.amount} onChange={(e) => updateRow(row.id, 'amount', e.target.value)} placeholder="مثال: 2000000" className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          {errors[`row_${row.id}_amount`] && <span className="text-[10px] text-rose-500">{errors[`row_${row.id}_amount`]}</span>}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#667085]">تاریخ هزینه</Label>
                          <JalaliDatePicker value={row.date ? new Date(row.date) : null} onChange={(d) => updateRow(row.id, 'date', d ? toLocalDateString(d) : '')} placeholder="انتخاب تاریخ" className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#667085]">مرکز هزینه</Label>
                          <Select value={row.costCenterId} onValueChange={(v) => updateRow(row.id, 'costCenterId', v)}>
                            <SelectTrigger className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm"><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">بدون مرکز هزینه</SelectItem>
                              {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#667085]">طرف حساب / فروشنده</Label>
                          <Input value={row.vendorName} onChange={(e) => updateRow(row.id, 'vendorName', e.target.value)} placeholder="اختیاری" className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-[#667085]">شماره فاکتور / رسید</Label>
                          <Input value={row.invoiceNumber} onChange={(e) => updateRow(row.id, 'invoiceNumber', e.target.value)} placeholder="اختیاری" className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs text-[#667085]">شرح هزینه</Label>
                          <Input value={row.description} onChange={(e) => updateRow(row.id, 'description', e.target.value)} placeholder="شرح هزینه..." className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {rows.length === 0 && <div className="rounded-[12px] border border-dashed border-[#DCE3EE] py-8 text-center text-sm text-[#CBD5E1]">هنوز ردیف هزینه‌ای اضافه نشده است. روی «افزودن ردیف» کلیک کنید.</div>}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[#EFF4FF] px-4 py-3">
                  <span className="text-sm font-semibold text-[#344054]">جمع کل هزینه‌ها:</span>
                  <span className={`text-lg font-bold ${overBalance ? 'text-rose-600' : 'text-[#3155E7]'}`}>{formatToman(totalAmount)} تومان</span>
                </div>
                {overBalance && <div className="mt-2 rounded-[10px] bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">جمع هزینه‌ها از مانده تنخواه ({formatToman(custodianBalance)} تومان) بیشتر است!</div>}
                {errors.balance && <div className="mt-2 text-xs text-rose-500">{errors.balance}</div>}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/petty-cash-expenses"><Button type="button" variant="outline" className="h-[42px] rounded-[10px]">انصراف</Button></Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</> : <><Plus className="h-4 w-4" /> ایجاد صورت هزینه</>}
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
              <p className="text-xs leading-6 text-[#344054]">صورت هزینه تنخواه، هزینه‌کرد تنخواه را ثبت و قابل تسویه می‌کند. پس از ایجاد، می‌توانید آن را برای تأیید ارسال کنید. پس از تأیید، سند حسابداری ثبت شده و مانده تنخواه کاهش می‌یابد.</p>
            </div>

            {selectedCustodian && (
              <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
                <h2 className="mb-3 text-sm font-bold text-[#101828]">وضعیت تنخواه</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#98A2B3]">سقف تنخواه</span><span className="font-bold text-[#344054]">{formatToman(Number(selectedCustodian.ceiling))}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">مانده فعلی</span><span className="font-bold text-[#3155E7]">{formatToman(custodianBalance)}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">جمع این صورت</span><span className={`font-bold ${overBalance ? 'text-rose-600' : 'text-[#344054]'}`}>{formatToman(totalAmount)}</span></div>
                  <div className="border-t border-[#F1F5F9] pt-2">
                    <div className="flex justify-between"><span className="text-[#98A2B3]">باقی‌مانده پس از ثبت</span><span className={`font-bold ${custodianBalance - totalAmount < 0 ? 'text-rose-600' : 'text-[#16A34A]'}`}>{formatToman(custodianBalance - totalAmount)}</span></div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </form>
    </div>
  );
}
