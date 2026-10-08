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
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ایجاد صورت ادغام اسناد</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> صورت ادغام اسناد <b>←</b> ایجاد</div>
          </div>
          <Link href="/dashboard/petty-cash-merge" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت به صورت ادغام
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Layers className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات سربرگ</h2>
                  <p>اطلاعات اصلی صورت ادغام را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
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
                </div>

                <div className="field-group">
                  <Label className="field-label">تاریخ صورت ادغام <span className="required-star">*</span></Label>
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
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح کلی صورت ادغام..." className="task-textarea" />
              </div>
            </div>

            {/* Expense selection */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><FileCheck className="h-5 w-5" /></span>
                <div>
                  <h2>انتخاب اسناد قابل ادغام</h2>
                  <p>اسناد تأییدشده و قابل ادغام این تنخواه‌دار را انتخاب کنید.</p>
                </div>
              </div>
              {availableExpenses.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={selectAll} className="mr-auto">
                  {selectedExpenses.size === availableExpenses.length ? 'لغو همه' : 'انتخاب همه'}
                </Button>
              )}
            </div>

            {!custodianId ? (
              <div className="rounded-[12px] border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-slate-700">ابتدا تنخواه‌دار را انتخاب کنید تا اسناد قابل ادغام نمایش داده شوند.</div>
            ) : availableExpenses.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-slate-700">سند قابل ادغامی برای این تنخواه‌دار وجود ندارد. فقط اسناد تأییدشده و ادغام‌نشده قابل انتخاب هستند.</div>
            ) : (
              <>
                {errors.expenses && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600">{errors.expenses}</div>}
                <div className="space-y-2">
                  {availableExpenses.map((exp) => {
                    const isSelected = selectedExpenses.has(exp.id);
                    return (
                      <label key={exp.id} className={`flex cursor-pointer items-center gap-3 rounded-[10px] border p-3 transition-colors ${isSelected ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleExpense(exp.id)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-200"><Hash className="h-3 w-3 text-slate-400" />{exp.number}</span>
                            <Badge variant="outline" className="border-green-200 text-[10px] text-green-600">قابل ادغام</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatJalali(exp.date)}</span>
                            <span>{exp.expenseType}</span>
                            {exp.description && <span className="truncate">{exp.description}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatToman(Number(exp.amount))} تومان</span>
                      </label>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-center justify-between rounded-[10px] bg-sky-50 px-4 py-3 dark:bg-sky-900/20">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">جمع اسناد انتخاب‌شده:</span>
                    <Badge variant="secondary" className="text-xs">{selectedExpenses.size.toLocaleString('fa-IR')} سند</Badge>
                  </div>
                  <span className="text-lg font-bold text-sky-600 dark:text-sky-400">{formatToman(totalAmount)} تومان</span>
                </div>
              </>
            )}

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/petty-cash-merge')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting || selectedExpenses.size === 0}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : (<><Plus className="h-4 w-4" /> ایجاد صورت ادغام</>)}
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
              <p>صورت ادغام اسناد، چند سند هزینه را زیر یک سند اصلی تجمیع می‌کند. اسناد اصلی حفظ می‌شوند و ارتباط بین سند اصلی و اسناد ادغام‌شده نگه‌داری می‌شود. پس از ایجاد، می‌توانید آن را برای تأیید ارسال کنید.</p>
            </div>

            {selectedExpenses.size > 0 && (
              <div className="guide-card">
                <div className="guide-card-header">
                  <span className="guide-card-icon"><CheckSquare className="h-5 w-5" /></span>
                  <h2>خلاصه انتخاب</h2>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">تعداد اسناد</span><span className="font-bold text-slate-700 dark:text-slate-300">{selectedExpenses.size.toLocaleString('fa-IR')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">جمع مبلغ</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(totalAmount)} تومان</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
