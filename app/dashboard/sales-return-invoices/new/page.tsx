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
  ArrowRight, RotateCcw, Loader2, Plus, Trash2,
  Lightbulb, Info, Building2, Calendar, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { Customer, Product, Warehouse, Profile } from '@/lib/types';

interface ItemRow {
  productId: string;
  productName: string;
  qty: string;
  unit: string;
  unitPrice: string;
  discount: string;
  tax: string;
}

const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره فاکتور به‌صورت خودکار تولید می‌شود.' },
  { icon: Building2, title: 'انتخاب مشتری', desc: 'مشتری مرتبط با فاکتور برگشت را انتخاب کنید.' },
  { icon: Calendar, title: 'تاریخ برگشت', desc: 'تاریخ واقعی برگشت کالا را ثبت کنید.' },
];

export default function NewSalesReturnInvoicePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [number, setNumber] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', discount: '0', tax: '0' },
  ]);

  const loadData = useCallback(async () => {
    try {
      const [custData, prodData, whData, staffData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Warehouse>('warehouses', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setCustomers(custData || []);
      setProducts(prodData || []);
      setWarehouses(whData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`SRI-${Date.now().toString().slice(-8)}`);
    setReturnDate(new Date().toISOString().slice(0, 10));
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', discount: '0', tax: '0' }]);
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
      return updated;
    }));
  };

  const calcRow = (item: ItemRow) => {
    const qty = parseNumber(item.qty);
    const unitPrice = parseNumber(item.unitPrice);
    const gross = qty * unitPrice;
    const discount = parseNumber(item.discount);
    const tax = parseNumber(item.tax);
    const total = gross - discount + tax;
    return { gross, discount, tax, total };
  };

  const subtotal = items.reduce((sum, item) => sum + calcRow(item).gross, 0);
  const totalDiscount = items.reduce((sum, item) => sum + calcRow(item).discount, 0);
  const totalTax = items.reduce((sum, item) => sum + calcRow(item).tax, 0);
  const finalAmount = subtotal - totalDiscount + totalTax;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!returnDate) e.returnDate = 'تاریخ برگشت الزامی است';
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
      const cust = customers.find((c) => c.id === customerId);
      const seller = staff.find((s) => s.id === sellerId);
      const invoice = await createData('sales_return_invoices', {
        number,
        returnDate: new Date(returnDate).toISOString(),
        customerId: customerId || null,
        customerName: customerName || (cust ? (cust.companyName || `${cust.firstName || ''} ${cust.lastName || ''}`.trim()) : null),
        sellerId: sellerId || null,
        sellerName: seller ? `${seller.firstName || ''} ${seller.lastName || ''}`.trim() : null,
        warehouseId: warehouseId || null,
        returnReason: returnReason || null,
        subtotal,
        totalDiscount,
        totalTax,
        finalAmount,
        status: 'draft',
        notes: notes || null,
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        const r = calcRow(item);
        await createData('sales_return_invoice_items', {
          returnInvoiceId: invoice.id,
          rowNumber: i + 1,
          productId: item.productId || null,
          productName: item.productName || null,
          qty: parseNumber(item.qty),
          unit: item.unit || null,
          unitPrice: parseNumber(item.unitPrice),
          discountAmount: r.discount,
          taxAmount: r.tax,
          finalPrice: r.total,
        });
      }

      try {
        await createData('sales_return_invoice_history', {
          returnInvoiceId: invoice.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { number, customerId, warehouseId },
        });
      } catch {}

      toast.success('فاکتور برگشت از فروش ثبت شد');
      router.push('/dashboard/sales-return-invoices');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت فاکتور برگشت از فروش جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> فاکتور برگشت از فروش <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/sales-return-invoices">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><RotateCcw className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات فاکتور برگشت</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات برگشت کالا از مشتری را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره فاکتور</Label>
                    <Input value={number} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مشتری</Label>
                    <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); const c = customers.find((c) => c.id === e.target.value); setCustomerName(c ? (c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()) : ''); }} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب مشتری...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim()}</option>)}
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
                    <Label className="text-sm font-semibold text-[#344054]">فروشنده</Label>
                    <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب شخص...</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ برگشت <span className="text-rose-500">*</span></Label>
                    <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.returnDate && <span className="text-xs text-rose-500">{errors.returnDate}</span>}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">دلیل برگشت</Label>
                  <Input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="دلیل برگشت کالا..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
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
                          <Input placeholder="واحد" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="قیمت واحد" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="تخفیف" value={item.discount} onChange={(e) => updateItem(i, 'discount', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input type="number" placeholder="مالیات" value={item.tax} onChange={(e) => updateItem(i, 'tax', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700">{formatToman(r.total)}</div>
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
              <Link href="/dashboard/sales-return-invoices">
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
              <p className="text-xs text-blue-700">پس از ثبت فاکتور برگشت، باید آن را تأیید کنید. فاکتورهای تأیید شده در گزارش‌های فروش لحاظ می‌شوند.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
