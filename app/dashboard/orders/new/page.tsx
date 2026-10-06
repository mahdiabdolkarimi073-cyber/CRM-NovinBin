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
  ArrowRight, ShoppingCart, Loader2, Plus, Trash2,
  Lightbulb, Info, Hash, User, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import { fullName } from '@/lib/constants';
import type { Customer, Product, Profile } from '@/lib/types';

interface ItemRow {
  productId: string;
  name: string;
  qty: string;
  price: string;
  discount: string;
  total: string;
}

const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره سفارش به‌صورت خودکار تولید می‌شود.' },
  { icon: User, title: 'مشتری', desc: 'مشتری مرتبط با سفارش را انتخاب کنید.' },
  { icon: Package, title: 'اقلام', desc: 'محصولات و تعداد هر یک را وارد کنید.' },
];

export default function NewOrderPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [number, setNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', name: '', qty: '1', price: '0', discount: '0', total: '0' },
  ]);

  const loadData = useCallback(async () => {
    try {
      const [custData, prodData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
      ]);
      setCustomers(custData || []);
      setProducts(prodData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`ORD-${Date.now().toString().slice(-6)}`);
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', name: '', qty: '1', price: '0', discount: '0', total: '0' }]);
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
          updated.name = p.name;
          updated.price = String(p.price || 0);
        }
      }
      if (field === 'qty' || field === 'price' || field === 'discount') {
        const qty = parseNumber(updated.qty);
        const price = parseNumber(updated.price);
        const discount = parseNumber(updated.discount);
        updated.total = String(qty * price - discount);
      }
      return updated;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + parseNumber(item.qty) * parseNumber(item.price), 0);
  const totalDiscount = items.reduce((sum, item) => sum + parseNumber(item.discount), 0);
  const tax = items.reduce((sum, item) => sum + Math.round(parseNumber(item.qty) * parseNumber(item.price) * 0.09), 0);
  const total = subtotal - totalDiscount + tax;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerId) e.customerId = 'انتخاب مشتری الزامی است';
    if (items.length === 0 || items.every((i) => !i.productId && !i.name)) e.items = 'حداقل یک قلم الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const order = await createData('orders', {
        number,
        customerId: customerId || null,
        status: 'registered',
        subtotal,
        discount: totalDiscount,
        tax,
        total,
        notes: notes || null,
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.name) continue;
        await createData('order_items', {
          orderId: order.id,
          productId: item.productId || null,
          name: item.name || null,
          qty: parseNumber(item.qty),
          price: parseNumber(item.price),
          discount: parseNumber(item.discount),
          total: parseNumber(item.total),
        });
      }

      toast.success('سفارش ثبت شد');
      router.push('/dashboard/orders');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت سفارش جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> سفارشات <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/orders">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><ShoppingCart className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات سفارش</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات سفارش را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره سفارش</Label>
                    <Input value={number} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مشتری <span className="text-rose-500">*</span></Label>
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب مشتری...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName || fullName(c.firstName, c.lastName)}</option>)}
                    </select>
                    {errors.customerId && <span className="text-xs text-rose-500">{errors.customerId}</span>}
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
                  <h2 className="text-base font-bold text-[#1D2939]">اقلام سفارش</h2>
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
                        <Input placeholder="نام محصول" value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input type="number" placeholder="قیمت واحد" value={item.price} onChange={(e) => updateItem(i, 'price', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input type="number" placeholder="تخفیف" value={item.discount} onChange={(e) => updateItem(i, 'discount', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700">{formatToman(parseNumber(item.total))}</div>
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
                    <span className="font-semibold text-blue-600">مالیات (۹٪):</span>
                    <span className="font-bold text-amber-600">{formatToman(tax)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-blue-200 pt-2 text-base">
                    <span className="font-bold text-blue-700">مبلغ نهایی:</span>
                    <span className="font-bold text-blue-800">{formatToman(total)} تومان</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/orders">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت سفارش</>}
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
              <p className="text-xs text-blue-700">پس از ثبت سفارش، می‌توانید وضعیت آن را به پرداخت شده، ارسال، تحویل یا لغو تغییر دهید.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
