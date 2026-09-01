'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData, updateData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, Layers, Wallet, Calendar, Landmark, Loader2, Plus,
  Lightbulb, Info, Type, AlignRight, FileCheck, AlertCircle, CheckSquare,
  XCircle, Hash,
} from 'lucide-react';
import { toLocalDateString, formatToman, formatJalali } from '@/lib/format';
import { fullName } from '@/lib/constants';
import { toast } from 'sonner';
import type {
  PettyCashCustodian, FiscalYear, CostCenter, PettyCashExpense,
} from '@/lib/types';

const guideItems = [
  { icon: Wallet, title: 'انتخاب تنخواه‌دار', desc: 'تنخواه‌دار مربوطه را انتخاب کنید.' },
  { icon: CheckSquare, title: 'انتخاب اسناد', desc: 'اسناد قابل ادغام را انتخاب کنید.' },
  { icon: AlignRight, title: 'کنترل شرایط', desc: 'سیستم کنترل می‌کند اسناد متعلق به یک تنخواه‌دار باشند.' },
  { icon: AlertCircle, title: 'جلوگیری از ادغام مجدد', desc: 'اسناد ادغام‌شده قابل انتخاب مجدد نیستند.' },
  { icon: FileCheck, title: 'حفظ جزئیات', desc: 'اسناد اصلی حفظ می‌شوند و فقط تجمیع می‌گردند.' },
];

export default function NewPettyCashMergePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [custodians, setCustodians] = useState<PettyCashCustodian[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [availableExpenses, setAvailableExpenses] = useState<PettyCashExpense[]>([]);

  const [custodianId, setCustodianId] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [custData, fyData, ccData] = await Promise.all([
        fetchData<PettyCashCustodian>('petty_cash_custodians', {
          where: { active: true },
          include: { contactParty: true, profile: true, payments: true, expenses: true },
        }),
        fetchData<FiscalYear>('fiscal_years', { where: { status: 'open' } }),
        fetchData<CostCenter>('cost_centers', { where: { active: true } }),
      ]);
      setCustodians(custData || []);
      setFiscalYears(fyData || []);
      setCostCenters(ccData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load available expenses when custodian changes
  useEffect(() => {
    if (!custodianId) { setAvailableExpenses([]); return; }
    fetchData<PettyCashExpense>('petty_cash_expenses', {
      where: { custodianId, mergeStatus: 'mergeable', status: 'approved' },
      orderBy: { date: 'desc' },
    }).then((data) => setAvailableExpenses(data || []))
      .catch(() => setAvailableExpenses([]));
    setSelectedExpenses(new Set());
  }, [custodianId]);

  const custodianName = (c: PettyCashCustodian) => {
    if (c.contactParty) {
      if (c.contactParty.type === 'individual') return `${c.contactParty.firstName || ''} ${c.contactParty.lastName || ''}`.trim() || 'بدون نام';
      return c.contactParty.companyName || 'بدون نام';
    }
    if (c.profile) return fullName(c.profile.firstName, c.profile.lastName);
    return 'بدون نام';
  };

  const toggleExpense = (id: string) => {
    setSelectedExpenses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedExpenses.size === availableExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(availableExpenses.map((e) => e.id)));
    }
  };

  const totalAmount = useMemo(() => {
    return availableExpenses
      .filter((e) => selectedExpenses.has(e.id))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [availableExpenses, selectedExpenses]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!custodianId) e.custodianId = 'انتخاب تنخواه‌دار الزامی است';
    if (!date) e.date = 'تاریخ صورت ادغام الزامی است';
    if (selectedExpenses.size === 0) e.expenses = 'حداقل یک سند باید انتخاب شود';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const stmt = await createData('petty_cash_merge_statements', {
        number: `PCM-${Date.now()}`,
        custodianId,
        fiscalYearId: fiscalYearId || null,
        costCenterId: costCenterId || null,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        description: description || null,
        totalAmount,
        status: 'draft',
        createdBy: profile.id,
      }) as any;

      // Link expenses to merge statement
      for (const expId of Array.from(selectedExpenses)) {
        await updateData('petty_cash_expenses', { id: expId }, {
          mergeStatementId: stmt.id,
          mergeStatus: 'merged',
        });
      }

      // Record history
      try {
        await createData('petty_cash_merge_histories', {
          mergeStatementId: stmt.id,
          action: 'created',
          actionBy: profile.id,
          details: { expenseIds: Array.from(selectedExpenses), count: selectedExpenses.size },
        });
      } catch {}

      toast.success('صورت ادغام اسناد ایجاد شد');
      router.push('/dashboard/petty-cash-merge');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ایجاد صورت ادغام اسناد</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> صورت ادغام اسناد <span className="mx-1.5 text-[#CBD5E1]">←</span> ایجاد</div>
        </div>
        <Link href="/dashboard/petty-cash-merge">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Layers className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات سربرگ</h2>
                    <p className="text-xs text-[#98A2B3]">اطلاعات اصلی صورت ادغام را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
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
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ صورت ادغام <span className="text-rose-500">*</span></Label>
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
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح کلی صورت ادغام..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            {/* Expense selection */}
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileCheck className="h-5 w-5" /></span>
                    <div>
                      <h2 className="text-base font-bold text-[#1D2939]">انتخاب اسناد قابل ادغام</h2>
                      <p className="text-xs text-[#98A2B3]">اسناد تأییدشده و قابل ادغام این تنخواه‌دار را انتخاب کنید.</p>
                    </div>
                  </div>
                  {availableExpenses.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                      {selectedExpenses.size === availableExpenses.length ? 'لغو همه' : 'انتخاب همه'}
                    </Button>
                  )}
                </div>

                {!custodianId ? (
                  <div className="rounded-[12px] border border-dashed border-[#DCE3EE] py-12 text-center text-sm text-[#CBD5E1]">ابتدا تنخواه‌دار را انتخاب کنید تا اسناد قابل ادغام نمایش داده شوند.</div>
                ) : availableExpenses.length === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-[#DCE3EE] py-12 text-center text-sm text-[#CBD5E1]">سند قابل ادغامی برای این تنخواه‌دار وجود ندارد. فقط اسناد تأییدشده و ادغام‌نشده قابل انتخاب هستند.</div>
                ) : (
                  <>
                    {errors.expenses && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.expenses}</div>}
                    <div className="space-y-2">
                      {availableExpenses.map((exp) => {
                        const isSelected = selectedExpenses.has(exp.id);
                        return (
                          <label key={exp.id} className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 transition-colors ${isSelected ? 'border-[#3155E7] bg-[#EFF4FF]' : 'border-[#E6EBF2] bg-white hover:bg-[#F8FAFD]'}`}>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleExpense(exp.id)} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-sm font-semibold text-[#1D2939]"><Hash className="h-3 w-3 text-[#98A2B3]" />{exp.number}</span>
                                <Badge variant="outline" className="border-green-200 text-[10px] text-green-600">قابل ادغام</Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#98A2B3]">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(exp.date)}</span>
                                <span>{exp.expenseType}</span>
                                {exp.description && <span className="truncate">{exp.description}</span>}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-[#1D2939]">{formatToman(Number(exp.amount))} تومان</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[#EFF4FF] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#344054]">جمع اسناد انتخاب‌شده:</span>
                        <Badge variant="secondary" className="text-xs">{selectedExpenses.size.toLocaleString('fa-IR')} سند</Badge>
                      </div>
                      <span className="text-lg font-bold text-[#3155E7]">{formatToman(totalAmount)} تومان</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/petty-cash-merge"><Button type="button" variant="outline" className="h-[42px] rounded-[10px]">انصراف</Button></Link>
              <Button type="submit" disabled={submitting || selectedExpenses.size === 0} className="h-[42px] rounded-[10px] bg-[#3155E7] px-6 text-sm font-semibold text-white hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</> : <><Plus className="h-4 w-4" /> ایجاد صورت ادغام</>}
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
              <p className="text-xs leading-6 text-[#344054]">صورت ادغام اسناد، چند سند هزینه را زیر یک سند اصلی تجمیع می‌کند. اسناد اصلی حفظ می‌شوند و ارتباط بین سند اصلی و اسناد ادغام‌شده نگه‌داری می‌شود. پس از ایجاد، می‌توانید آن را برای تأیید ارسال کنید.</p>
            </div>

            {selectedExpenses.size > 0 && (
              <div className="rounded-[14px] border border-[#E6EBF2] bg-white p-4 shadow-[0_3px_14px_rgba(20,40,80,.05)]">
                <h2 className="mb-3 text-sm font-bold text-[#101828]">خلاصه انتخاب</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#98A2B3]">تعداد اسناد</span><span className="font-bold text-[#344054]">{selectedExpenses.size.toLocaleString('fa-IR')}</span></div>
                  <div className="flex justify-between"><span className="text-[#98A2B3]">جمع مبلغ</span><span className="font-bold text-[#3155E7]">{formatToman(totalAmount)} تومان</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </form>
    </div>
  );
}
