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
  ArrowRight, FileSearch, Loader2, Plus, Trash2,
  Lightbulb, Info, Building2, Calendar, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';

interface ItemRow {
  serviceName: string;
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
  taxPct: string;
}

const PURCHASE_TYPES = [
  { value: 'service', label: 'خدمات' },
  { value: 'consulting', label: 'مشاوره' },
  { value: 'maintenance', label: 'تعمیر و نگهداری' },
  { value: 'other', label: 'سایر' },
];

const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره داخلی فاکتور به‌صورت خودکار تولید می‌شود.' },
  { icon: Building2, title: 'تأمین‌کننده', desc: 'نام و شماره فاکتور تأمین‌کننده را وارد کنید.' },
  { icon: Calendar, title: 'تاریخ فاکتور', desc: 'تاریخ صدور فاکتور را ثبت کنید.' },
];

export default function NewServicePurchaseInvoicePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [internalNumber, setInternalNumber] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [purchaseType, setPurchaseType] = useState('service');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { serviceName: '', description: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', taxPct: '0' },
  ]);

  useEffect(() => {
    setInternalNumber(`SPI-${Date.now().toString().slice(-8)}`);
    setInvoiceDate(new Date().toISOString().slice(0, 10));
  }, []);

  const addItem = () => {
    setItems([...items, { serviceName: '', description: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', taxPct: '0' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const calcRow = (item: ItemRow) => {
    const qty = parseNumber(item.qty);
    const unitPrice = parseNumber(item.unitPrice);
    const gross = qty * unitPrice;
    const discount = gross * (parseNumber(item.discountPct) / 100);
    const taxable = gross - discount;
    const tax = taxable * (parseNumber(item.taxPct) / 100);
    const final = taxable + tax;
    return { gross, discount, tax, final };
  };

  const totals = items.reduce((acc, item) => {
    const r = calcRow(item);
    return { subtotal: acc.subtotal + r.gross, discount: acc.discount + r.discount, tax: acc.tax + r.tax, final: acc.final + r.final };
  }, { subtotal: 0, discount: 0, tax: 0, final: 0 });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!supplierName) e.supplierName = 'نام تأمین‌کننده الزامی است';
    if (!invoiceDate) e.invoiceDate = 'تاریخ فاکتور الزامی است';
    if (items.length === 0 || items.every((i) => !i.serviceName)) e.items = 'حداقل یک قلم الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const invoice = await createData('service_purchase_invoices', {
        internalNumber,
        supplierInvoiceNo: supplierInvoiceNo || null,
        supplierName,
        purchaseType,
        invoiceDate: new Date(invoiceDate).toISOString(),
        registeredDate: new Date().toISOString(),
        currency: 'IRR',
        exchangeRate: 1,
        subtotal: totals.subtotal,
        totalDiscount: totals.discount,
        totalTax: totals.tax,
        totalDuty: 0,
        totalAdditions: 0,
        totalDeductions: 0,
        finalAmount: totals.final,
        paidAmount: 0,
        balanceDue: totals.final,
        status: 'draft',
        serviceConfirmed: false,
        financeApproved: false,
        sentToWorkboard: false,
        description: description || null,
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.serviceName) continue;
        const r = calcRow(item);
        await createData('service_purchase_invoice_items', {
          invoiceId: invoice.id,
          rowNumber: i + 1,
          serviceName: item.serviceName,
          description: item.description || null,
          qty: parseNumber(item.qty),
          unit: item.unit || null,
          unitPrice: parseNumber(item.unitPrice),
          grossAmount: r.gross,
          discountAmount: r.discount,
          discountPct: parseNumber(item.discountPct),
          taxableAmount: r.gross - r.discount,
          taxAmount: r.tax,
          taxPct: parseNumber(item.taxPct),
          dutyAmount: 0,
          dutyPct: 0,
          additions: 0,
          deductions: 0,
          finalPrice: r.final,
        });
      }

      try {
        await createData('service_purchase_invoice_history', {
          invoiceId: invoice.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { internalNumber, supplierName },
        });
      } catch {}

      toast.success('فاکتور ثبت شد');
      router.push('/dashboard/service-purchase-invoices');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت فاکتور خرید خدمات</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فاکتور خرید خدمات <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/service-purchase-invoices">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileSearch className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات فاکتور</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات فاکتور خرید خدمات را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره داخلی</Label>
                    <Input value={internalNumber} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره فاکتور تأمین‌کننده</Label>
                    <Input value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} placeholder="شماره..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نام تأمین‌کننده <span className="text-rose-500">*</span></Label>
                    <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="نام تأمین‌کننده..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.supplierName && <span className="text-xs text-rose-500">{errors.supplierName}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع خرید</Label>
                    <select value={purchaseType} onChange={(e) => setPurchaseType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {PURCHASE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ فاکتور <span className="text-rose-500">*</span></Label>
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.invoiceDate && <span className="text-xs text-rose-500">{errors.invoiceDate}</span>}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1D2939]">اقلام خدمات</h2>
                  <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /> افزودن قلم</Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, i) => {
                    const r = calcRow(item);
                    return (
                      <div key={i} className="rounded-lg border border-[#E7ECF3] bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-[#667085]">قلم {toEnglishDigits(String(i + 1))}</span>
                          {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <Input placeholder="نام خدمت" value={item.serviceName} onChange={(e) => updateItem(i, 'serviceName', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="توضیح" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="واحد" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="قیمت واحد" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="تخفیف ٪" value={item.discountPct} onChange={(e) => updateItem(i, 'discountPct', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="مالیات ٪" value={item.taxPct} onChange={(e) => updateItem(i, 'taxPct', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700">{formatToman(r.final)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-3 text-center"><div className="text-xs text-slate-500">جمع کل</div><div className="mt-1 text-sm font-bold text-slate-700">{formatToman(totals.subtotal)}</div></div>
                  <div className="rounded-lg bg-white p-3 text-center"><div className="text-xs text-slate-500">تخفیف</div><div className="mt-1 text-sm font-bold text-rose-500">{formatToman(totals.discount)}</div></div>
                  <div className="rounded-lg bg-white p-3 text-center"><div className="text-xs text-slate-500">مالیات</div><div className="mt-1 text-sm font-bold text-amber-600">{formatToman(totals.tax)}</div></div>
                  <div className="rounded-lg bg-blue-50 p-3 text-center"><div className="text-xs text-blue-500">مبلغ نهایی</div><div className="mt-1 text-sm font-bold text-blue-700">{formatToman(totals.final)}</div></div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/service-purchase-invoices">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت فاکتور</>}
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
              <p className="text-xs text-blue-700">پس از ثبت فاکتور، باید آن را تأیید خدمت، تأیید مالی و در نهایت ثبت سند کنید. چرخه: ایجاد ← تأیید خدمت ← تأیید مالی ← ثبت سند.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
