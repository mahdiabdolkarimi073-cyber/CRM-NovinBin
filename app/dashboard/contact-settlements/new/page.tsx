'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  ArrowRight, Handshake, User, Calendar, Landmark, Loader2, Plus,
  Lightbulb, Info, FileCheck, AlertCircle, CheckSquare,
  Hash, Wallet, Banknote, TrendingUp, TrendingDown, Trash2,
} from 'lucide-react';
import { toLocalDateString, formatToman } from '@/lib/format';
import { toast } from 'sonner';
import type {
  ContactParty, FiscalYear, CostCenter, BankAccount, CashFund,
  Invoice, Payment, Receipt,
} from '@/lib/types';

interface SettlementItemDraft {
  key: string;
  itemType: string;
  referenceType: string | null;
  referenceId: string | null;
  referenceNumber: string | null;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  allocationAmount: number;
  discount: number;
  description: string;
}

const ITEM_TYPE_OPTIONS = [
  { value: 'invoice', label: 'فاکتور' },
  { value: 'debt', label: 'بدهی' },
  { value: 'credit', label: 'بستانکاری' },
  { value: 'receipt', label: 'رسید' },
  { value: 'payment', label: 'پرداخت' },
  { value: 'prepayment', label: 'پیش‌پرداخت' },
  { value: 'on_account', label: 'حساب جاری' },
  { value: 'cheque_receivable', label: 'چک دریافتی' },
  { value: 'cheque_payable', label: 'چک پرداختی' },
  { value: 'other', label: 'سایر' },
];

const SETTLEMENT_TYPE_OPTIONS = [
  { value: 'full', label: 'تسویه کامل' },
  { value: 'partial', label: 'تسویه جزئی' },
  { value: 'multi_document', label: 'تسویه چند سندی' },
  { value: 'from_payment', label: 'از طریق پرداخت' },
  { value: 'from_receipt', label: 'از طریق دریافت' },
  { value: 'setoff', label: 'تهاتر' },
  { value: 'adjustment', label: 'تعدیل' },
];

const FUND_TYPE_OPTIONS = [
  { value: 'none', label: 'بدون صندوق/بانک' },
  { value: 'cash', label: 'صندوق نقدی' },
  { value: 'bank', label: 'حساب بانکی' },
  { value: 'setoff', label: 'تهاتر' },
];

const guideItems = [
  { icon: User, title: 'انتخاب طرف مقابل', desc: 'طرف مقابل مربوطه را انتخاب کنید.' },
  { icon: CheckSquare, title: 'افزودن اقلام', desc: 'فاکتورها، پرداخت‌ها و سایر اقلام را اضافه کنید.' },
  { icon: Wallet, title: 'تعیین صندوق', desc: 'نحوه تسویه (نقدی، بانکی، تهاتر) را مشخص کنید.' },
  { icon: AlertCircle, title: 'کنترل مانده', desc: 'سیستم مانده هر قلم را محاسبه می‌کند.' },
  { icon: FileCheck, title: 'ثبت و ارسال', desc: 'پس از ایجاد می‌توانید برای تأیید ارسال کنید.' },
];

let itemKeyCounter = 0;

export default function NewContactSettlementPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [contactParties, setContactParties] = useState<ContactParty[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashFunds, setCashFunds] = useState<CashFund[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const [contactPartyId, setContactPartyId] = useState('');
  const [settlementType, setSettlementType] = useState('full');
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [fundType, setFundType] = useState('none');
  const [bankAccountId, setBankAccountId] = useState('');
  const [cashFundId, setCashFundId] = useState('');
  const [items, setItems] = useState<SettlementItemDraft[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [partyData, fyData, ccData, baData, cfData, invData, payData, recData] = await Promise.all([
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<FiscalYear>('fiscal_years', { where: { status: 'open' } }),
        fetchData<CostCenter>('cost_centers', { where: { active: true } }),
        fetchData<BankAccount>('bank_accounts', { where: { active: true } }),
        fetchData<CashFund>('cash_funds', { where: { active: true } }),
        fetchData<Invoice>('invoices', { where: {} }),
        fetchData<Payment>('payments', { where: {} }),
        fetchData<Receipt>('receipts', { where: {} }),
      ]);
      setContactParties(partyData || []);
      setFiscalYears(fyData || []);
      setCostCenters(ccData || []);
      setBankAccounts(baData || []);
      setCashFunds(cfData || []);
      setInvoices(invData || []);
      setPayments(payData || []);
      setReceipts(recData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const partyName = (p: ContactParty) => {
    if (p.type === 'individual') return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام';
    return p.companyName || 'بدون نام';
  };

  const addInvoiceItem = (inv: Invoice) => {
    const balance = Number(inv.amount || 0) - Number(inv.paid || 0);
    itemKeyCounter++;
    setItems((prev) => [...prev, {
      key: `item-${itemKeyCounter}`,
      itemType: 'invoice',
      referenceType: 'invoices',
      referenceId: inv.id,
      referenceNumber: inv.number,
      originalAmount: Number(inv.amount || 0),
      paidAmount: Number(inv.paid || 0),
      balance,
      allocationAmount: balance,
      discount: 0,
      description: '',
    }]);
  };

  const addPaymentItem = (pay: Payment) => {
    itemKeyCounter++;
    setItems((prev) => [...prev, {
      key: `item-${itemKeyCounter}`,
      itemType: 'payment',
      referenceType: 'payments',
      referenceId: pay.id,
      referenceNumber: pay.number,
      originalAmount: Number(pay.amount || 0),
      paidAmount: 0,
      balance: Number(pay.amount || 0),
      allocationAmount: Number(pay.amount || 0),
      discount: 0,
      description: '',
    }]);
  };

  const addReceiptItem = (rec: Receipt) => {
    itemKeyCounter++;
    setItems((prev) => [...prev, {
      key: `item-${itemKeyCounter}`,
      itemType: 'receipt',
      referenceType: 'receipts',
      referenceId: rec.id,
      referenceNumber: rec.number,
      originalAmount: Number(rec.amount || 0),
      paidAmount: 0,
      balance: Number(rec.amount || 0),
      allocationAmount: Number(rec.amount || 0),
      discount: 0,
      description: '',
    }]);
  };

  const addManualItem = () => {
    itemKeyCounter++;
    setItems((prev) => [...prev, {
      key: `item-${itemKeyCounter}`,
      itemType: 'debt',
      referenceType: null,
      referenceId: null,
      referenceNumber: null,
      originalAmount: 0,
      paidAmount: 0,
      balance: 0,
      allocationAmount: 0,
      discount: 0,
      description: '',
    }]);
  };

  const updateItem = (key: string, field: keyof SettlementItemDraft, value: any) => {
    setItems((prev) => prev.map((it) => it.key === key ? { ...it, [field]: value } : it));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const totals = useMemo(() => {
    const totalDebit = items.filter((it) => ['debt', 'invoice', 'cheque_payable', 'payment'].includes(it.itemType))
      .reduce((sum, it) => sum + Number(it.allocationAmount || 0), 0);
    const totalCredit = items.filter((it) => ['credit', 'receipt', 'cheque_receivable', 'prepayment'].includes(it.itemType))
      .reduce((sum, it) => sum + Number(it.allocationAmount || 0), 0);
    const totalDiscount = items.reduce((sum, it) => sum + Number(it.discount || 0), 0);
    return { totalDebit, totalCredit, totalDiscount, totalAmount: totalDebit - totalCredit - totalDiscount };
  }, [items]);

  const availableInvoices = useMemo(() => {
    if (!contactPartyId) return [];
    const party = contactParties.find((p) => p.id === contactPartyId);
    if (!party) return [];
    const customerId = party.detailType === 'customer' ? (party as any).customerId : null;
    return invoices.filter((inv) => inv.customerId && inv.customerId === customerId && Number(inv.amount || 0) > Number(inv.paid || 0));
  }, [invoices, contactPartyId, contactParties]);

  const availablePayments = useMemo(() => {
    if (!contactPartyId) return [];
    const party = contactParties.find((p) => p.id === contactPartyId);
    if (!party) return [];
    const customerId = party.detailType === 'customer' ? (party as any).customerId : null;
    return payments.filter((p) => p.customerId && p.customerId === customerId);
  }, [payments, contactPartyId, contactParties]);

  const availableReceipts = useMemo(() => {
    if (!contactPartyId) return [];
    const party = contactParties.find((p) => p.id === contactPartyId);
    if (!party) return [];
    const customerId = party.detailType === 'customer' ? (party as any).customerId : null;
    return receipts.filter((r) => r.payerId && r.payerId === customerId);
  }, [receipts, contactPartyId, contactParties]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!contactPartyId) e.contactPartyId = 'انتخاب طرف مقابل الزامی است';
    if (!date) e.date = 'تاریخ تسویه الزامی است';
    if (items.length === 0) e.items = 'حداقل یک قلم باید اضافه شود';
    if (fundType === 'bank' && !bankAccountId) e.bankAccountId = 'انتخاب حساب بانکی الزامی است';
    if (fundType === 'cash' && !cashFundId) e.cashFundId = 'انتخاب صندوق نقدی الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const stmt = await createData('contact_settlements', {
        number: `CS-${Date.now()}`,
        contactPartyId,
        settlementType,
        settlementDate: date ? new Date(date).toISOString() : new Date().toISOString(),
        fiscalYearId: fiscalYearId || null,
        costCenterId: costCenterId || null,
        totalAmount: totals.totalAmount,
        totalDebit: totals.totalDebit,
        totalCredit: totals.totalCredit,
        fundType: fundType === 'none' ? null : fundType,
        bankAccountId: fundType === 'bank' ? bankAccountId : null,
        cashFundId: fundType === 'cash' ? cashFundId : null,
        description: description || null,
        status: 'draft',
        createdBy: profile.id,
      }) as any;

      for (const item of items) {
        await createData('contact_settlement_items', {
          settlementId: stmt.id,
          itemType: item.itemType,
          referenceType: item.referenceType,
          referenceId: item.referenceId,
          referenceNumber: item.referenceNumber,
          originalAmount: item.originalAmount,
          paidAmount: item.paidAmount,
          settledAmount: 0,
          discount: item.discount,
          tax: 0,
          fee: 0,
          adjustments: 0,
          balance: item.balance,
          allocationAmount: item.allocationAmount,
          itemStatus: Number(item.allocationAmount) >= Number(item.balance) ? 'settled' : 'partial',
          description: item.description || null,
        });
      }

      try {
        await createData('contact_settlement_history', {
          settlementId: stmt.id,
          action: 'created',
          actionBy: profile.id,
          toStatus: 'draft',
          details: { itemCount: items.length },
        });
      } catch {}

      toast.success('تسویه حساب ایجاد شد');
      router.push('/dashboard/contact-settlements');
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
              <h1>ایجاد تسویه حساب طرف مقابل</h1>
            </div>
            <div className="create-task-breadcrumb">داشبورد <b>←</b> تسویه حساب طرف مقابل <b>←</b> ایجاد</div>
          </div>
          <Link href="/dashboard/contact-settlements" className="back-button">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            {/* اطلاعات سربرگ */}
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Handshake className="h-5 w-5" /></span>
                <div>
                  <h2>اطلاعات سربرگ</h2>
                  <p>اطلاعات اصلی تسویه را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">طرف مقابل <span className="required-star">*</span></Label>
                  <Select value={contactPartyId} onValueChange={setContactPartyId}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب طرف مقابل..." /></SelectTrigger>
                    <SelectContent>
                      {contactParties.map((p) => <SelectItem key={p.id} value={p.id}>{partyName(p)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.contactPartyId && <span className="field-error">{errors.contactPartyId}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">تاریخ تسویه <span className="required-star">*</span></Label>
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
                  <Label className="field-label">نوع تسویه</Label>
                  <Select value={settlementType} onValueChange={setSettlementType}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="نوع تسویه..." /></SelectTrigger>
                    <SelectContent>
                      {SETTLEMENT_TYPE_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">دوره مالی</Label>
                  <Select value={fiscalYearId || '__none__'} onValueChange={(v) => setFiscalYearId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب دوره مالی..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون دوره</SelectItem>
                      {fiscalYears.map((fy) => <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">مرکز هزینه</Label>
                  <Select value={costCenterId || '__none__'} onValueChange={(v) => setCostCenterId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب مرکز هزینه..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون مرکز هزینه</SelectItem>
                      {costCenters.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">شرح کلی</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح کلی تسویه..." className="task-textarea" />
              </div>
            </div>

            {/* نحوه تسویه */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><Wallet className="h-5 w-5" /></span>
                <div>
                  <h2>نحوه تسویه</h2>
                  <p>صندوق یا حساب بانکی مورد استفاده در تسویه را مشخص کنید.</p>
                </div>
              </div>
            </div>

            <div className="form-fields">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <div className="field-group">
                  <Label className="field-label">نوع تسویه مالی</Label>
                  <Select value={fundType} onValueChange={setFundType}>
                    <SelectTrigger className="task-select"><SelectValue placeholder="نوع تسویه مالی..." /></SelectTrigger>
                    <SelectContent>
                      {FUND_TYPE_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {fundType === 'bank' && (
                  <div className="field-group">
                    <Label className="field-label">حساب بانکی <span className="required-star">*</span></Label>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب حساب بانکی..." /></SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((ba) => <SelectItem key={ba.id} value={ba.id}>{ba.name} ({ba.bankName})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.bankAccountId && <span className="field-error">{errors.bankAccountId}</span>}
                  </div>
                )}

                {fundType === 'cash' && (
                  <div className="field-group">
                    <Label className="field-label">صندوق نقدی <span className="required-star">*</span></Label>
                    <Select value={cashFundId} onValueChange={setCashFundId}>
                      <SelectTrigger className="task-select"><SelectValue placeholder="انتخاب صندوق..." /></SelectTrigger>
                      <SelectContent>
                        {cashFunds.map((cf) => <SelectItem key={cf.id} value={cf.id}>{cf.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.cashFundId && <span className="field-error">{errors.cashFundId}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* اقلام تسویه */}
            <div className="form-card-divider" />
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon"><FileCheck className="h-5 w-5" /></span>
                <div>
                  <h2>اقلام تسویه</h2>
                  <p>فاکتورها، پرداخت‌ها و سایر اقلام را اضافه کنید.</p>
                </div>
              </div>
              <button type="button" onClick={addManualItem} className="cancel-btn"><Plus className="h-4 w-4" /> افزودن قلم</button>
            </div>

            <div className="form-fields">
              {/* Quick add from existing documents */}
              {contactPartyId && (availableInvoices.length > 0 || availablePayments.length > 0 || availableReceipts.length > 0) && (
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">افزودن سریع از اسناد موجود:</div>
                  <div className="flex flex-wrap gap-2">
                    {availableInvoices.slice(0, 5).map((inv) => (
                      <button key={inv.id} type="button" onClick={() => addInvoiceItem(inv)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-sky-900/30">
                        <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{inv.number}</span>
                        <span className="mr-2 text-slate-400">{formatToman(Number(inv.amount) - Number(inv.paid))}</span>
                      </button>
                    ))}
                    {availablePayments.slice(0, 3).map((pay) => (
                      <button key={pay.id} type="button" onClick={() => addPaymentItem(pay)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-sky-900/30">
                        <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" />{pay.number}</span>
                        <span className="mr-2 text-slate-400">{formatToman(Number(pay.amount))}</span>
                      </button>
                    ))}
                    {availableReceipts.slice(0, 3).map((rec) => (
                      <button key={rec.id} type="button" onClick={() => addReceiptItem(rec)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-sky-900/30">
                        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{rec.number}</span>
                        <span className="mr-2 text-slate-400">{formatToman(Number(rec.amount))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errors.items && <span className="field-error">{errors.items}</span>}

              {items.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">هنوز قلمی اضافه نشده است. روی «افزودن قلم» کلیک کنید یا از اسناد موجود انتخاب کنید.</div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.key} className="rounded-[12px] border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] text-slate-500 dark:text-slate-400">{ITEM_TYPE_OPTIONS.find((o) => o.value === item.itemType)?.label || item.itemType}</Badge>
                          {item.referenceNumber && <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.referenceNumber}</span>}
                        </div>
                        <button type="button" onClick={() => removeItem(item.key)} className="text-slate-400 transition-colors hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
                        <div className="field-group">
                          <Label className="field-label">نوع قلم</Label>
                          <select value={item.itemType} onChange={(e) => updateItem(item.key, 'itemType', e.target.value)} className="task-input">
                            {ITEM_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div className="field-group">
                          <Label className="field-label">اصل مبلغ</Label>
                          <Input type="number" value={item.originalAmount} onChange={(e) => updateItem(item.key, 'originalAmount', Number(e.target.value))} className="task-input" />
                        </div>
                        <div className="field-group">
                          <Label className="field-label">پرداخت‌شده</Label>
                          <Input type="number" value={item.paidAmount} onChange={(e) => updateItem(item.key, 'paidAmount', Number(e.target.value))} className="task-input" />
                        </div>
                        <div className="field-group">
                          <Label className="field-label">مانده</Label>
                          <Input type="number" value={item.balance} onChange={(e) => updateItem(item.key, 'balance', Number(e.target.value))} className="task-input" />
                        </div>
                        <div className="field-group">
                          <Label className="field-label">مبلغ تخصیص</Label>
                          <Input type="number" value={item.allocationAmount} onChange={(e) => updateItem(item.key, 'allocationAmount', Number(e.target.value))} className="task-input" />
                        </div>
                        <div className="field-group">
                          <Label className="field-label">تخفیف</Label>
                          <Input type="number" value={item.discount} onChange={(e) => updateItem(item.key, 'discount', Number(e.target.value))} className="task-input" />
                        </div>
                        <div className="col-span-2 field-group">
                          <Label className="field-label">شرح</Label>
                          <Input value={item.description} onChange={(e) => updateItem(item.key, 'description', e.target.value)} placeholder="شرح قلم..." className="task-input" />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
                    <div className="rounded-[10px] bg-rose-50 p-3 dark:bg-rose-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">بدهکاری</div><div className="mt-1 text-sm font-bold text-rose-600 dark:text-rose-400">{formatToman(totals.totalDebit)}</div></div>
                    <div className="rounded-[10px] bg-emerald-50 p-3 dark:bg-emerald-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">بستانکاری</div><div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatToman(totals.totalCredit)}</div></div>
                    <div className="rounded-[10px] bg-amber-50 p-3 dark:bg-amber-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">تخفیف</div><div className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-400">{formatToman(totals.totalDiscount)}</div></div>
                    <div className="rounded-[10px] bg-sky-50 p-3 dark:bg-sky-900/20"><div className="text-xs text-slate-500 dark:text-slate-400">مبلغ خالص</div><div className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">{formatToman(totals.totalAmount)}</div></div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/contact-settlements')} disabled={submitting}>انصراف</button>
              <button type="submit" className="submit-btn" disabled={submitting || items.length === 0}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</> : <><Plus className="h-4 w-4" /> ایجاد تسویه حساب</>}
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
              <p>تسویه حساب طرف مقابل، مانده حساب مشتری یا تأمین‌کننده را با تخصیص پرداخت‌ها و دریافت‌ها به فاکتورها و اسناد مالی صفر یا کاهش می‌دهد. پس از ایجاد، می‌توانید آن را برای تأیید ارسال کنید.</p>
            </div>
            {items.length > 0 && (
              <div className="info-card">
                <div className="info-card-header">
                  <span className="info-card-icon"><FileCheck className="h-5 w-5" /></span>
                  <h2>خلاصه تسویه</h2>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">تعداد اقلام</span><span className="font-bold text-slate-600 dark:text-slate-300">{items.length.toLocaleString('fa-IR')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">بدهکاری</span><span className="font-bold text-rose-500">{formatToman(totals.totalDebit)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">بستانکاری</span><span className="font-bold text-emerald-500">{formatToman(totals.totalCredit)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">تخفیف</span><span className="font-bold text-amber-600">{formatToman(totals.totalDiscount)}</span></div>
                  <div className="mt-2 border-t border-slate-200 pt-2 flex justify-between dark:border-slate-700"><span className="text-slate-600 dark:text-slate-300">مبلغ خالص</span><span className="font-bold text-sky-600 dark:text-sky-400">{formatToman(totals.totalAmount)} تومان</span></div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
