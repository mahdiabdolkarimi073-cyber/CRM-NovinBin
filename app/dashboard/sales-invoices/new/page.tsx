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
  ArrowRight, FileText, Loader2, Plus, Trash2,
  Lightbulb, Info, Hash, User, Calendar, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { Customer, ProcessAgent, Warehouse, Product, Profile } from '@/lib/types';

interface ItemRow {
  productId: string;
  productName: string;
  qty: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
  discountAmount: string;
  taxPct: string;
  taxAmount: string;
  finalPrice: string;
}

const SALE_TYPES = [
  { value: 'cash', label: 'نقدی' },
  { value: 'credit', label: 'اعتباری' },
  { value: 'installment', label: 'قسطی' },
  { value: 'mixed', label: 'ترکیبی' },
];

const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره داخلی فاکتور به‌صورت خودکار تولید می‌شود.' },
  { icon: User, title: 'مشتری', desc: 'مشتری و عامل فروش را انتخاب کنید.' },
  { icon: Package, title: 'اقلام', desc: 'اقلام کالا/خدمات را با تخفیف و مالیات وارد کنید.' },
];

export default function NewSalesInvoicePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<ProcessAgent[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [internalNumber, setInternalNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [saleType, setSaleType] = useState('cash');
  const [sellerId, setSellerId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', discountAmount: '0', taxPct: '0', taxAmount: '0', finalPrice: '0' },
  ]);

  const loadData = useCallback(async () => {
    try {
      const [custData, agentData, whData, prodData, staffData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<ProcessAgent>('process_agents', { where: { active: true } }),
        fetchData<Warehouse>('warehouses', { where: { active: true } }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setCustomers(custData || []);
      setAgents(agentData || []);
      setWarehouses(whData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setInternalNumber(`SI-${Date.now().toString().slice(-8)}`);
    setSaleDate(new Date().toISOString().slice(0, 10));
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', discountAmount: '0', taxPct: '0', taxAmount: '0', finalPrice: '0' }]);
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
          updated.unit = p.unit || '';
          updated.unitPrice = String(p.price || 0);
        }
      }
      if (field === 'qty' || field === 'unitPrice' || field === 'discountPct' || field === 'taxPct') {
        const qty = parseNumber(updated.qty);
        const unitPrice = parseNumber(updated.unitPrice);
        const gross = qty * unitPrice;
        const discPct = parseNumber(updated.discountPct);
        const discountAmount = (gross * discPct) / 100;
        updated.discountAmount = String(discountAmount);
        const taxable = gross - discountAmount;
        const taxPct = parseNumber(updated.taxPct);
        const taxAmount = (taxable * taxPct) / 100;
        updated.taxAmount = String(taxAmount);
        updated.finalPrice = String(taxable + taxAmount);
      }
      return updated;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + parseNumber(item.qty) * parseNumber(item.unitPrice), 0);
  const totalDiscount = items.reduce((sum, item) => sum + parseNumber(item.discountAmount), 0);
  const totalTax = items.reduce((sum, item) => sum + parseNumber(item.taxAmount), 0);
  const finalAmount = items.reduce((sum, item) => sum + parseNumber(item.finalPrice), 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!saleDate) e.saleDate = 'تاریخ فروش الزامی است';
    if (!customerId) e.customerId = 'انتخاب مشتری الزامی است';
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
      const agent = agents.find((a) => a.id === agentId);
      const agentName = agent ? agent.name : null;
      const seller = staff.find((s) => s.id === sellerId);
      const sellerName = seller ? fullName(seller.firstName, seller.lastName) : null;

      const invoice = await createData('sales_invoices', {
        internalNumber,
        invoiceNumber: invoiceNumber || null,
        saleDate: new Date(saleDate).toISOString(),
        registeredDate: new Date().toISOString(),
        customerId: customerId || null,
        customerName,
        saleType,
        sellerId: sellerId || null,
        sellerName,
        agentId: agentId || null,
        agentName,
        currency: 'IRR',
        exchangeRate: 1,
        paymentTerms: paymentTerms || null,
        warehouseId: warehouseId || null,
        subtotal,
        totalDiscount,
        taxableAmount: subtotal - totalDiscount,
        totalTax,
        totalDuty: 0,
        totalAdditions: 0,
        totalDeductions: 0,
        finalAmount,
        paidAmount: 0,
        balanceDue: finalAmount,
        commissionAmount: 0,
        status: 'draft',
        accountingPosted: false,
        description: description || null,
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        await createData('sales_invoice_items', {
          invoiceId: invoice.id,
          rowNumber: i + 1,
          productId: item.productId || null,
          productName: item.productName || null,
          qty: parseNumber(item.qty),
          unit: item.unit || null,
          unitPrice: parseNumber(item.unitPrice),
          grossAmount: parseNumber(item.qty) * parseNumber(item.unitPrice),
          discountAmount: parseNumber(item.discountAmount),
          discountPct: parseNumber(item.discountPct),
          taxableAmount: parseNumber(item.qty) * parseNumber(item.unitPrice) - parseNumber(item.discountAmount),
          taxAmount: parseNumber(item.taxAmount),
          taxPct: parseNumber(item.taxPct),
          dutyAmount: 0,
          dutyPct: 0,
          additions: 0,
          deductions: 0,
          finalPrice: parseNumber(item.finalPrice),
          warehouseId: warehouseId || null,
        });
      }

      try {
        await createData('sales_invoice_history', {
          invoiceId: invoice.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { internalNumber, customerId, saleType },
        });
      } catch {}

      toast.success('فاکتور فروش ثبت شد');
      router.push('/dashboard/sales-invoices');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت فاکتور فروش جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فاکتور فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/sales-invoices">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileText className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات فاکتور</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات فاکتور فروش را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره داخلی</Label>
                    <Input value={internalNumber} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره فاکتور</Label>
                    <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="شماره فاکتور رسمی..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ فروش <span className="text-rose-500">*</span></Label>
                    <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.saleDate && <span className="text-xs text-rose-500">{errors.saleDate}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مشتری <span className="text-rose-500">*</span></Label>
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب مشتری...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</option>)}
                    </select>
                    {errors.customerId && <span className="text-xs text-rose-500">{errors.customerId}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع فروش</Label>
                    <select value={saleType} onChange={(e) => setSaleType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {SALE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">فروشنده</Label>
                    <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب فروشنده...</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">عامل فرایند</Label>
                    <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب عامل...</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">انبار</Label>
                    <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب انبار...</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شرایط پرداخت</Label>
                    <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="شرایط پرداخت..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
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
                  <h2 className="text-base font-bold text-[#1D2939]">اقلام کالا/خدمات</h2>
                  <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /> افزودن قلم</Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-[#E7ECF3] bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#667085]">قلم {toEnglishDigits(String(i + 1))}</span>
                        {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="h-[38px] rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm">
                          <option value="">انتخاب محصول...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <Input placeholder="نام محصول" value={item.productName} onChange={(e) => updateItem(i, 'productName', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="واحد" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="تعداد" type="number" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="قیمت واحد" type="number" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="تخفیف (%)" type="number" value={item.discountPct} onChange={(e) => updateItem(i, 'discountPct', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="مالیات (%)" type="number" value={item.taxPct} onChange={(e) => updateItem(i, 'taxPct', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700">{formatToman(parseNumber(item.finalPrice))}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}

                <div className="mt-4 space-y-2 rounded-lg bg-blue-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-600">جمع کل:</span>
                    <span className="font-bold text-blue-700">{formatToman(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-600">تخفیف:</span>
                    <span className="font-bold text-rose-600">{formatToman(totalDiscount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-600">مالیات:</span>
                    <span className="font-bold text-amber-600">{formatToman(totalTax)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-blue-200 pt-2 text-base">
                    <span className="font-bold text-blue-700">مبلغ نهایی:</span>
                    <span className="font-bold text-blue-800">{formatToman(finalAmount)} تومان</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/sales-invoices">
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
              <p className="text-xs text-blue-700">پس از ثبت فاکتور، باید آن را تکمیل، ارسال برای تأیید، تأیید و سپس نهایی کنید. چرخه: ایجاد ← تکمیل ← تأیید ← نهایی.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
