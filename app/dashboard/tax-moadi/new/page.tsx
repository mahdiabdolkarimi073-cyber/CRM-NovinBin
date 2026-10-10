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
  ArrowRight, ReceiptText, Plus, Trash2, Loader2,
  Hash, User, Package, Calculator,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, parseNumber } from '@/lib/format';
import type { Customer, Product, TaxMoadiSetting, TaxMoadiFiscalMemory } from '@/lib/types';

interface ItemRow {
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  qty: string;
  unitPrice: string;
  rowDiscount: string;
  taxRate: string;
  dutyRate: string;
  description: string;
}

const INVOICE_TYPES = [
  { value: 'type1', label: 'نوع یک (اقلام همراه با قیمت)' },
  { value: 'type2', label: 'نوع دو (اقلام بدون قیمت)' },
  { value: 'type3', label: 'نوع سه (صورتحساب جمعی)' },
  { value: 'special', label: 'نوع خاص' },
];

const INVOICE_PATTERNS = [
  { value: 'general', label: 'عمومی' },
  { value: 'gold', label: 'طلایی' },
  { value: 'contractor', label: 'پیمانکاری' },
  { value: 'utility', label: 'آب و برق و گاز' },
  { value: 'ticket', label: 'بلیت' },
  { value: 'export', label: 'صادراتی' },
];

const SALE_TYPES = [
  { value: 'cash', label: 'نقدی' },
  { value: 'credit', label: 'اعتباری' },
  { value: 'installment', label: 'قسطی' },
  { value: 'mixed', label: 'ترکیبی' },
];

const CUSTOMER_TYPES = [
  { value: 'individual', label: 'حقیقی' },
  { value: 'company', label: 'حقوقی' },
  { value: 'government', label: 'دولتی' },
];

export default function NewTaxMoadiInvoicePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<TaxMoadiSetting | null>(null);
  const [memories, setMemories] = useState<TaxMoadiFiscalMemory[]>([]);

  const [internalNumber, setInternalNumber] = useState('');
  const [invoiceType, setInvoiceType] = useState('type1');
  const [invoicePattern, setInvoicePattern] = useState('general');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState('');
  const [customerType, setCustomerType] = useState('company');
  const [saleType, setSaleType] = useState('cash');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [subject, setSubject] = useState('');
  const [fiscalMemoryId, setFiscalMemoryId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', productName: '', productCode: '', unit: '', qty: '1', unitPrice: '0', rowDiscount: '0', taxRate: '9', dutyRate: '0', description: '' },
  ]);

  const loadData = useCallback(async () => {
    try {
      const [custData, prodData, settingData, memData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<TaxMoadiSetting>('tax_moadi_settings', { where: {} }),
        fetchData<TaxMoadiFiscalMemory>('tax_moadi_fiscal_memories', { where: { isActive: true } }),
      ]);
      setCustomers(custData || []);
      setProducts(prodData || []);
      setSettings(settingData?.[0] || null);
      setMemories(memData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setInternalNumber(`TM-${Date.now().toString().slice(-8)}`);
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', productCode: '', unit: '', qty: '1', unitPrice: '0', rowDiscount: '0', taxRate: '9', dutyRate: '0', description: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const p = products.find((p) => p.id === value);
        if (p) {
          updated.productName = p.name;
          updated.productCode = p.sku || '';
          updated.unit = p.unit || '';
          updated.unitPrice = String(p.price || 0);
        }
      }
      return updated;
    }));
  };

  const calcRowTotal = (item: ItemRow) => {
    const qty = parseNumber(item.qty);
    const unitPrice = parseNumber(item.unitPrice);
    const discount = parseNumber(item.rowDiscount);
    return Math.max(0, qty * unitPrice - discount);
  };

  const calcRowTax = (item: ItemRow) => {
    const rowTotal = calcRowTotal(item);
    return (rowTotal * parseNumber(item.taxRate)) / 100;
  };

  const calcRowDuty = (item: ItemRow) => {
    const rowTotal = calcRowTotal(item);
    return (rowTotal * parseNumber(item.dutyRate)) / 100;
  };

  const subtotal = items.reduce((sum, item) => sum + parseNumber(item.qty) * parseNumber(item.unitPrice), 0);
  const totalDiscount = items.reduce((sum, item) => sum + parseNumber(item.rowDiscount), 0);
  const taxableAmount = subtotal - totalDiscount;
  const totalTax = items.reduce((sum, item) => sum + calcRowTax(item), 0);
  const totalDuty = items.reduce((sum, item) => sum + calcRowDuty(item), 0);
  const finalAmount = taxableAmount + totalTax + totalDuty;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!invoiceDate) e.invoiceDate = 'تاریخ صورتحساب الزامی است';
    if (items.length === 0 || items.every((i) => !i.productId && !i.productName)) e.items = 'حداقل یک قلم الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const customer = customers.find((c) => c.id === customerId);
      const customerName = customer ? [customer.firstName, customer.lastName, customer.companyName].filter(Boolean).join(' ') : null;

      const invoice = await createData('tax_moadi_invoices', {
        internalNumber,
        invoiceType,
        invoicePattern,
        invoiceDate: new Date(invoiceDate).toISOString(),
        customerId: customerId || null,
        customerName,
        customerNationalId: customer?.nationalId || null,
        customerPostalCode: customer?.postalCode || null,
        customerAddress: customer?.address || null,
        customerType,
        saleType,
        paymentMethod,
        subject: subject || null,
        fiscalMemoryId: fiscalMemoryId || null,
        subtotal,
        totalDiscount,
        taxableAmount,
        totalTax,
        totalDuty,
        totalAdditions: 0,
        totalDeductions: 0,
        finalAmount,
        internalStatus: 'draft',
        createdBy: profile.id,
        idempotencyKey: `${internalNumber}-${Date.now()}`,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        const rowTotal = calcRowTotal(item);
        await createData('tax_moadi_invoice_items', {
          invoiceId: invoice.id,
          rowNumber: i + 1,
          productId: item.productId || null,
          productCode: item.productCode || null,
          productName: item.productName || null,
          unit: item.unit || null,
          qty: parseNumber(item.qty),
          unitPrice: parseNumber(item.unitPrice),
          rowDiscount: parseNumber(item.rowDiscount),
          rowTotal,
          taxRate: parseNumber(item.taxRate),
          taxAmount: calcRowTax(item),
          dutyRate: parseNumber(item.dutyRate),
          dutyAmount: calcRowDuty(item),
          description: item.description || null,
        });
      }

      try {
        await createData('tax_moadi_audit_logs', {
          action: 'create',
          entity: 'invoice',
          entityId: invoice.id,
          userId: profile.id,
          details: { internalNumber, invoiceType, saleType },
        });
      } catch {}

      toast.success('صورتحساب پیش‌نویس ایجاد شد');
      router.push('/dashboard/tax-moadi');
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
            <h1 className="text-[28px] font-bold text-[#101828]">صدور صورتحساب جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سامانه مؤدیان <span className="mx-1.5 text-[#CBD5E1]">←</span> صدور</div>
        </div>
        <Link href="/dashboard/tax-moadi">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><ReceiptText className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات صورتحساب</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات صورتحساب الکترونیکی را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره داخلی</Label>
                    <Input value={internalNumber} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ صورتحساب <span className="text-rose-500">*</span></Label>
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.invoiceDate && <span className="text-xs text-rose-500">{errors.invoiceDate}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع صورتحساب</Label>
                    <select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {INVOICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">الگوی صورتحساب</Label>
                    <select value={invoicePattern} onChange={(e) => setInvoicePattern(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {INVOICE_PATTERNS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مشتری</Label>
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب مشتری...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع مشتری</Label>
                    <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {CUSTOMER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع فروش</Label>
                    <select value={saleType} onChange={(e) => setSaleType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {SALE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">روش پرداخت</Label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="cash">نقدی</option>
                      <option value="bank">بانکی</option>
                      <option value="pos">کارتخوان</option>
                      <option value="credit">اعتباری</option>
                    </select>
                  </div>
                  {memories.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#344054]">حافظه مالیاتی</Label>
                      <select value={fiscalMemoryId} onChange={(e) => setFiscalMemoryId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                        <option value="">بدون حافظه (پیش‌نویس)</option>
                        {memories.map((m) => <option key={m.id} value={m.id}>{m.label || m.memoryId || 'حافظه'}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-semibold text-[#344054]">موضوع</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="موضوع صورتحساب..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF7A00]/10 text-[#FF7A00]"><Package className="h-5 w-5" /></span>
                    <h2 className="text-base font-bold text-[#1D2939]">اقلام صورتحساب</h2>
                  </div>
                  <Button type="button" variant="outline" onClick={addItem} className="h-[36px] rounded-[8px]">
                    <Plus className="h-4 w-4" /> افزودن قلم
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="rounded-[10px] border border-[#E7ECF3] bg-[#FAFBFF] p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#667085]">کالا/خدمت</Label>
                          <select value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)} className="h-[38px] w-full rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm text-[#344054]">
                            <option value="">انتخاب دستی...</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#667085]">نام قلم</Label>
                          <Input value={item.productName} onChange={(e) => updateItem(index, 'productName', e.target.value)} placeholder="نام..." className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#667085]">تعداد</Label>
                          <Input type="number" value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#667085]">قیمت واحد</Label>
                          <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#667085]">تخفیف</Label>
                          <Input type="number" value={item.rowDiscount} onChange={(e) => updateItem(index, 'rowDiscount', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#667085]">نرخ مالیات (%)</Label>
                          <Input type="number" value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-[#667085]">نرخ عوارض (%)</Label>
                          <Input type="number" value={item.dutyRate} onChange={(e) => updateItem(index, 'dutyRate', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        </div>
                        <div className="flex items-end">
                          <Button type="button" variant="ghost" onClick={() => removeItem(index)} className="h-[38px] rounded-[8px] text-rose-500 hover:bg-rose-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-[#667085]">
                        <span>مبلغ کل: {formatToman(calcRowTotal(item))}</span>
                        <span>مالیات: {formatToman(calcRowTax(item))}</span>
                        <span>عوارض: {formatToman(calcRowDuty(item))}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.items && <p className="mt-2 text-xs text-rose-500">{errors.items}</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/10 text-[#10b981]"><Calculator className="h-5 w-5" /></span>
                  <h2 className="text-base font-bold text-[#1D2939]">خلاصه مبالغ</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-[#667085]">مبلغ کل اقلام</span><span className="font-bold text-[#1D2939]">{formatToman(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-[#667085]">کل تخفیف</span><span className="font-bold text-rose-500">{formatToman(totalDiscount)}</span></div>
                  <div className="flex justify-between"><span className="text-[#667085]">مبلغ مشمول</span><span className="font-bold text-[#1D2939]">{formatToman(taxableAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-[#667085]">کل مالیات</span><span className="font-bold text-[#f59e0b]">{formatToman(totalTax)}</span></div>
                  <div className="flex justify-between"><span className="text-[#667085]">کل عوارض</span><span className="font-bold text-[#f59e0b]">{formatToman(totalDuty)}</span></div>
                  <div className="border-t border-[#E7ECF3] pt-3 flex justify-between"><span className="font-bold text-[#344054]">مبلغ نهایی</span><span className="text-lg font-bold text-[#3155E7]">{formatToman(finalAmount)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={submitting} className="h-[48px] w-full rounded-[10px] bg-[#3155E7] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7] disabled:opacity-50">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><ReceiptText className="h-4 w-4" /> ثبت پیش‌نویس صورتحساب</>}
            </Button>

            <div className="rounded-[10px] border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-2">
                <Hash className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-xs text-blue-700">صورتحساب به‌صورت پیش‌نویس ثبت می‌شود. پس از تأیید، می‌توانید آن را به صف ارسال سامانه مؤدیان اضافه کنید. ارسال واقعی نیازمند پیکربندی حافظه مالیاتی است.</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
