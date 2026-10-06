'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Percent, Loader2, Plus, Trash2, Check,
  Lightbulb, Info, Calendar, Hash, AlertCircle, User, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { Profile, Invoice, CommissionRule, FiscalYear } from '@/lib/types';

interface InvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: string;
  discountAmount: string;
  returnAmount: string;
  collectedAmount: string;
  subjectAmount: string;
  commissionRate: string;
  commissionAmount: string;
}

const CALC_BASIS = [
  { value: 'gross_sales', label: 'ناخالص فروش' },
  { value: 'net_sales', label: 'خالص فروش' },
  { value: 'after_discount', label: 'پس از تخفیف' },
  { value: 'after_return', label: 'پس از برگشت' },
  { value: 'collected', label: 'وصول‌شده' },
  { value: 'profit', label: 'سود فروش' },
  { value: 'subject_amount', label: 'مبلغ مشمول' },
];

const guideItems = [
  { icon: User, title: 'انتخاب فروشنده', desc: 'فروشنده یا کارشناس فروش را مشخص کنید.' },
  { icon: Calendar, title: 'دوره محاسبه', desc: 'بازه زمانی محاسبه پورسانت را مشخص کنید.' },
  { icon: Hash, title: 'مبنای محاسبه', desc: 'مبنای محاسبه پورسانت را انتخاب کنید.' },
  { icon: AlertCircle, title: 'اسناد فروش', desc: 'فاکتورهای مشمول پورسانت را اضافه کنید.' },
  { icon: Percent, title: 'درصد پورسانت', desc: 'درصد یا مبلغ ثابت پورسانت را وارد کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 12px', fontSize: 14, width: '100%', background: 'white', outline: 'none',
};

const itemInputStyle: React.CSSProperties = {
  height: 38, borderRadius: 8, border: '1px solid #E2E8F0',
  padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none',
};

export default function NewCommissionPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [staff, setStaff] = useState<Profile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);

  const [number, setNumber] = useState('');
  const [salespersonId, setSalespersonId] = useState('');
  const [salespersonName, setSalespersonName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [calculationBasis, setCalculationBasis] = useState('gross_sales');
  const [ruleId, setRuleId] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionFixedAmount, setCommissionFixedAmount] = useState('');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [description, setDescription] = useState('');
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [staffData, invData, ruleData, fyData] = await Promise.all([
        fetchData<Profile>('profiles', { where: { active: true } }),
        fetchData<Invoice>('invoices', { where: {} }),
        fetchData<CommissionRule>('commission_rules', { where: { active: true } }),
        fetchData<FiscalYear>('fiscal_years', { where: { status: 'open' } }),
      ]);
      setStaff(staffData || []);
      setInvoices(invData || []);
      setRules(ruleData || []);
      setFiscalYears(fyData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`CM-${Date.now().toString().slice(-8)}`);
    const today = new Date().toISOString().slice(0, 10);
    setPeriodStart(today);
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    setPeriodEnd(end.toISOString().slice(0, 10));
  }, []);

  const calcRow = (row: InvoiceRow) => {
    const subject = parseNumber(row.subjectAmount);
    const rate = parseNumber(row.commissionRate);
    return Math.round(subject * rate / 100);
  };

  const totalSubject = invoiceRows.reduce((s, r) => s + parseNumber(r.subjectAmount), 0);
  const totalCommission = invoiceRows.reduce((s, r) => s + calcRow(r), 0);
  const fixedAmt = parseNumber(commissionFixedAmount);
  const calculatedCommission = totalCommission + fixedAmt;
  const finalPayable = calculatedCommission;

  const addRow = () => {
    setInvoiceRows([...invoiceRows, { invoiceId: '', invoiceNumber: '', invoiceDate: '', invoiceAmount: '0', discountAmount: '0', returnAmount: '0', collectedAmount: '0', subjectAmount: '0', commissionRate: commissionRate || '0', commissionAmount: '0' }]);
  };
  const removeRow = (i: number) => setInvoiceRows(invoiceRows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof InvoiceRow, value: string) => {
    setInvoiceRows(invoiceRows.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [field]: value };
      if (field === 'invoiceId') {
        const inv = invoices.find((v) => v.id === value);
        if (inv) {
          updated.invoiceNumber = inv.number;
          updated.invoiceDate = inv.issueDate ? inv.issueDate.slice(0, 10) : '';
          updated.invoiceAmount = String(inv.amount || 0);
          updated.discountAmount = String(inv.discount || 0);
        }
      }
      if (field === 'subjectAmount' || field === 'commissionRate') {
        updated.commissionAmount = String(calcRow(updated));
      }
      return updated;
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!salespersonId) e.salespersonId = 'انتخاب فروشنده الزامی است';
    if (!periodStart || !periodEnd) e.periodStart = 'دوره محاسبه الزامی است';
    if (calculatedCommission <= 0) e.calculatedCommission = 'مبلغ پورسانت باید بزرگ‌تر از صفر باشد';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const cm = await createData('commissions', {
        number, salespersonId: salespersonId || null, salespersonName: salespersonName || null,
        periodStart: new Date(periodStart).toISOString(), periodEnd: new Date(periodEnd).toISOString(),
        calculationBasis, ruleId: ruleId || null, ruleName: ruleName || null,
        subjectAmount: totalSubject, commissionRate: parseNumber(commissionRate),
        commissionFixedAmount: fixedAmt, calculatedCommission, adjustmentsTotal: 0,
        finalPayableAmount: finalPayable, paidAmount: 0, paymentStatus: 'unpaid',
        status: 'calculated', fiscalYearId: fiscalYearId || null,
        description: description || null, createdBy: profile.id,
      }) as any;

      for (let i = 0; i < invoiceRows.length; i++) {
        const row = invoiceRows[i];
        if (!row.invoiceId && parseNumber(row.subjectAmount) <= 0) continue;
        await createData('commission_items', {
          commissionId: cm.id, invoiceId: row.invoiceId || null,
          invoiceNumber: row.invoiceNumber || null,
          invoiceDate: row.invoiceDate ? new Date(row.invoiceDate).toISOString() : null,
          invoiceAmount: parseNumber(row.invoiceAmount), discountAmount: parseNumber(row.discountAmount),
          returnAmount: parseNumber(row.returnAmount), collectedAmount: parseNumber(row.collectedAmount),
          subjectAmount: parseNumber(row.subjectAmount), commissionRate: parseNumber(row.commissionRate),
          commissionAmount: calcRow(row), calcStatus: 'included',
        });
      }

      try {
        await createData('commission_history', {
          commissionId: cm.id, action: 'created', actionBy: profile.id, actionAt: new Date().toISOString(),
          toStatus: 'calculated', details: { number, salespersonId, calculationBasis, calculatedCommission },
        });
      } catch {}

      toast.success('پورسانت ثبت شد');
      router.push('/dashboard/commissions');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/commissions" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به پورسانت‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> پورسانت <b>←</b> ثبت</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/commissions')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="cm-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت پورسانت'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="cm-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <Percent className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات پورسانت</h2>
                  <p className="text-sm text-slate-400">جزئیات پورسانت فروشنده را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره پورسانت</Label>
                  <input value={number} readOnly className="nb-input" style={{ ...inputStyle, background: '#f8fafc' }} />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">فروشنده <span className="text-red-500">*</span></Label>
                  <select value={salespersonId} onChange={(e) => {
                    setSalespersonId(e.target.value);
                    const s = staff.find((p) => p.id === e.target.value);
                    setSalespersonName(s ? [s.firstName, s.lastName].filter(Boolean).join(' ') : '');
                  }} className="nb-input" style={{ ...selectStyle, borderColor: errors.salespersonId ? '#FCA5A5' : '#E2E8F0' }}>
                    <option value="">انتخاب فروشنده...</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{[s.firstName, s.lastName].filter(Boolean).join(' ')}</option>)}
                  </select>
                  {errors.salespersonId && <span className="nb-editor-error">{errors.salespersonId}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شروع دوره <span className="text-red-500">*</span></Label>
                  <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="nb-input" style={inputStyle} />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">پایان دوره <span className="text-red-500">*</span></Label>
                  <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="nb-input" style={{ ...inputStyle, borderColor: errors.periodStart ? '#FCA5A5' : '#E2E8F0' }} />
                  {errors.periodStart && <span className="nb-editor-error">{errors.periodStart}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مبنای محاسبه</Label>
                  <select value={calculationBasis} onChange={(e) => setCalculationBasis(e.target.value)} className="nb-input" style={selectStyle}>
                    {CALC_BASIS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">قانون پورسانت</Label>
                  <select value={ruleId} onChange={(e) => {
                    setRuleId(e.target.value);
                    const r = rules.find((x) => x.id === e.target.value);
                    setRuleName(r ? r.name : '');
                    if (r) { setCommissionRate(String(r.commissionPct)); setCommissionFixedAmount(String(r.fixedAmount)); setCalculationBasis(r.calculationBasis); }
                  }} className="nb-input" style={selectStyle}>
                    <option value="">بدون قانون</option>
                    {rules.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">درصد پورسانت (٪)</Label>
                  <input type="number" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} placeholder="0" className="nb-input" style={inputStyle} />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مبلغ ثابت (تومان)</Label>
                  <input type="number" value={commissionFixedAmount} onChange={(e) => setCommissionFixedAmount(e.target.value)} placeholder="0" className="nb-input" style={inputStyle} />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">دوره مالی</Label>
                <select value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} className="nb-input" style={selectStyle}>
                  <option value="">انتخاب...</option>
                  {fiscalYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}</option>)}
                </select>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="nb-input"
                  style={{ minHeight: 80, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }} rows={3} />
              </div>
            </div>

            {/* Invoice rows section */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20"><FileText className="h-5 w-5" /></span>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 18 }}>اسناد فروش مشمول</h2>
                </div>
                <button type="button" onClick={addRow} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30">
                  <Plus className="h-3.5 w-3.5" /> افزودن فاکتور
                </button>
              </div>

              <div className="space-y-3">
                {invoiceRows.map((row, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سند {toEnglishDigits(String(i + 1))}</span>
                      {invoiceRows.length > 1 && <button type="button" onClick={() => removeRow(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2 lg:grid-cols-3">
                      <select value={row.invoiceId} onChange={(e) => updateRow(i, 'invoiceId', e.target.value)} className="nb-input" style={itemInputStyle}>
                        <option value="">انتخاب فاکتور...</option>
                        {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.number}</option>)}
                      </select>
                      <input placeholder="مبلغ فاکتور" value={row.invoiceAmount} onChange={(e) => updateRow(i, 'invoiceAmount', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input placeholder="تخفیف" value={row.discountAmount} onChange={(e) => updateRow(i, 'discountAmount', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input placeholder="برگشت" value={row.returnAmount} onChange={(e) => updateRow(i, 'returnAmount', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input placeholder="وصول شده" value={row.collectedAmount} onChange={(e) => updateRow(i, 'collectedAmount', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input placeholder="مبلغ مشمول" value={row.subjectAmount} onChange={(e) => updateRow(i, 'subjectAmount', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input placeholder="درصد (٪)" value={row.commissionRate} onChange={(e) => updateRow(i, 'commissionRate', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-xs font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{formatToman(calcRow(row))}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-end gap-3 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/50">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">جمع مبلغ مشمول:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{formatToman(totalSubject)}</span>
                </div>
                {fixedAmt > 0 && (
                  <div className="flex items-center justify-end gap-3 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/50">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">مبلغ ثابت:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatToman(fixedAmt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-end gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">پورسانت محاسبه‌شده:</span>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatToman(calculatedCommission)} تومان</span>
                </div>
              </div>
              {errors.calculatedCommission && <span className="mt-2 block text-xs text-rose-500">{errors.calculatedCommission}</span>}
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20"><Lightbulb className="h-5 w-5" /></span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 16 }}>راهنمای ثبت</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><item.icon className="h-3.5 w-3.5" /></span>
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/30 dark:bg-sky-900/10">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
              <p className="text-xs text-sky-700 dark:text-sky-400">پس از ثبت پورسانت، باید آن را بررسی، تأیید و سپس قطعی کنید. چرخه: محاسبه ← بررسی ← تأیید ← قطعی ← پرداخت.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
