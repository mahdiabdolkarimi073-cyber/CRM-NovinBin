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
  ArrowRight, FileOutput, Loader2, Plus, Trash2,
  Lightbulb, Info, Calendar, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { Customer, Product, Profile } from '@/lib/types';

interface ItemRow {
  productId: string;
  productName: string;
  productCode: string;
  qty: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
  taxPct: string;
}

const PRICE_LISTS = [
  { value: 'standard', label: 'استاندارد' },
  { value: 'wholesale', label: 'عمده' },
  { value: 'retail', label: 'خرده' },
];

const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره پیش‌فاکتور به‌صورت خودکار تولید می‌شود.' },
  { icon: Calendar, title: 'تاریخ انقضا', desc: 'تاریخ اعتبار پیش‌فاکتور را تعیین کنید.' },
  { icon: Lightbulb, title: 'لیست قیمت', desc: 'نوع لیست قیمت را انتخاب کنید.' },
];

export default function NewPreInvoiceSalesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [priceList, setPriceList] = useState('standard');
  const [sellerId, setSellerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', productName: '', productCode: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', taxPct: '0' },
  ]);

  const loadData = useCallback(async () => {
    try {
      const [custData, prodData, staffData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setCustomers(custData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`PI-S-${Date.now().toString().slice(-8)}`);
    setIssueDate(new Date().toISOString().slice(0, 10));
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', productCode: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', taxPct: '0' }]);
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
          updated.taxPct = String(p.taxRate || 0);
        }
      }
      return updated;
    }));
  };

  const calcRow = (item: ItemRow) => {
    const qty = parseNumber(item.qty);
    const unitPrice = parseNumber(item.unitPrice);
    const gross = qty * unitPrice;
    const discountPct = parseNumber(item.discountPct);
    const discountAmount = (gross * discountPct) / 100;
    const afterDiscount = gross - discountAmount;
    const taxPct = parseNumber(item.taxPct);
    const taxAmount = (afterDiscount * taxPct) / 100;
    const finalPrice = afterDiscount + taxAmount;
    return { gross, discountAmount, taxAmount, finalPrice };
  };

  const subtotal = items.reduce((sum, item) => sum + calcRow(item).gross, 0);
  const totalDiscount = items.reduce((sum, item) => sum + calcRow(item).discountAmount, 0);
  const totalTax = items.reduce((sum, item) => sum + calcRow(item).taxAmount, 0);
  const finalAmount = subtotal - totalDiscount + totalTax;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!issueDate) e.issueDate = 'تاریخ صدور الزامی است';
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
      const seller = staff.find((s) => s.id === sellerId);
      const invoice = await createData('pre_invoices', {
        number,
        type: 'sales',
        customerId: customerId || null,
        priceList,
        seller: seller ? `${seller.firstName || ''} ${seller.lastName || ''}`.trim() : null,
        issueDate: new Date(issueDate).toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        totalDiscount,
        totalTax,
        finalAmount,
        notes: notes || null,
        status: 'draft',
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        const r = calcRow(item);
        await createData('pre_invoice_items', {
          preInvoiceId: invoice.id,
          rowNumber: i + 1,
          productId: item.productId || null,
          productCode: item.productCode || null,
          productName: item.productName || null,
          unit: item.unit || null,
          qty: parseNumber(item.qty),
          unitPrice: parseNumber(item.unitPrice),
          discountPct: parseNumber(item.discountPct),
          discountAmount: r.discountAmount,
          taxPct: parseNumber(item.taxPct),
          taxAmount: r.taxAmount,
          finalPrice: r.finalPrice,
        });
      }

      toast.success('پیش‌فاکتور فروش ثبت شد');
      router.push('/dashboard/pre-invoices-sales');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت پیش فاکتور فروش جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> پیش فاکتور فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/pre-invoices-sales">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileOutput className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات پیش‌فاکتور</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات پیش‌فاکتور فروش را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره پیش‌فاکتور</Label>
                    <Input value={number} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مشتری</Label>
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب مشتری...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">لیست قیمت</Label>
                    <select value={priceList} onChange={(e) => setPriceList(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {PRICE_LISTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">فروشنده</Label>
                    <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب شخص...</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ صدور <span className="text-rose-500">*</span></Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.issueDate && <span className="text-xs text-rose-500">{errors.issueDate}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ انقضا</Label>
                    <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1D2939]">اقلام کالا</h2>
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
                          <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="h-[38px] rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm">
                            <option value="">انتخاب محصول...</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <Input placeholder="نام محصول" value={item.productName} onChange={(e) => updateItem(i, 'productName', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="کد محصول" value={item.productCode} onChange={(e) => updateItem(i, 'productCode', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="واحد" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="قیمت واحد" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="درصد تخفیف" value={item.discountPct} onChange={(e) => updateItem(i, 'discountPct', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="درصد مالیات" value={item.taxPct} onChange={(e) => updateItem(i, 'taxPct', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700">{formatToman(r.finalPrice)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}

                <div className="mt-4 space-y-1.5 rounded-lg bg-blue-50 p-3">
                  <div className="flex justify-between text-sm"><span className="text-blue-600">جمع کل:</span><span className="font-bold text-blue-700">{formatToman(subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-blue-600">تخفیف:</span><span className="font-bold text-blue-700">{formatToman(totalDiscount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-blue-600">مالیات:</span><span className="font-bold text-blue-700">{formatToman(totalTax)}</span></div>
                  <div className="flex justify-between border-t border-blue-200 pt-1.5"><span className="text-sm font-semibold text-blue-600">مبلغ نهایی:</span><span className="text-lg font-bold text-blue-700">{formatToman(finalAmount)} تومان</span></div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/pre-invoices-sales">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت پیش‌فاکتور</>}
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
              <p className="text-xs text-blue-700">پیش‌فاکتور فروش قبل از صدور فاکتور نهایی به مشتری ارسال می‌شود. چرخه: ایجاد ← ارسال ← تأیید ← تبدیل به فاکتور.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
