'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, ShoppingCart, Loader2, Plus, Trash2, Check,
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

  const customerRef = useRef<HTMLSelectElement>(null);

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

  useEffect(() => {
    loadData();
    setNumber(`ORD-${Date.now().toString().slice(-6)}`);
    setTimeout(() => customerRef.current?.focus(), 100);
  }, [loadData]);

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
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/orders" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به سفارشات
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> سفارشات <b>←</b> ثبت</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/orders')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="order-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت سفارش'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="order-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <ShoppingCart className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات سفارش</h2>
                  <p className="text-sm text-slate-400">جزئیات سفارش را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره سفارش</Label>
                  <input value={number} readOnly className="nb-input" style={{ ...inputStyle, background: '#f8fafc' }} />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مشتری <span className="text-red-500">*</span></Label>
                  <select ref={customerRef} value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="nb-input" style={{ ...selectStyle, borderColor: errors.customerId ? '#FCA5A5' : '#E2E8F0' }}>
                    <option value="">انتخاب مشتری...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName || fullName(c.firstName, c.lastName)}</option>)}
                  </select>
                  {errors.customerId && <span className="nb-editor-error">{errors.customerId}</span>}
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="nb-input"
                  style={{ minHeight: 80, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={3}
                />
              </div>
            </div>

            {/* Items section */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 18 }}>اقلام سفارش</h2>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30">
                  <Plus className="h-3.5 w-3.5" /> افزودن قلم
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">قلم {toEnglishDigits(String(i + 1))}</span>
                      {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2 lg:grid-cols-3">
                      <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="nb-input" style={itemInputStyle}>
                        <option value="">انتخاب محصول...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input placeholder="نام محصول" value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input type="number" placeholder="قیمت واحد" value={item.price} onChange={(e) => updateItem(i, 'price', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input type="number" placeholder="تخفیف" value={item.discount} onChange={(e) => updateItem(i, 'discount', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-xs font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{formatToman(parseNumber(item.total))}</div>
                    </div>
                  </div>
                ))}
              </div>

              {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}

              <div className="mt-4 space-y-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">جمع کل:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{formatToman(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">تخفیف:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{formatToman(totalDiscount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">مالیات (۹٪):</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{formatToman(tax)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-blue-200 pt-2 text-base dark:border-blue-800">
                  <span className="font-bold text-blue-700 dark:text-blue-300">مبلغ نهایی:</span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">{formatToman(total)} تومان</span>
                </div>
              </div>
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
              <p className="text-xs text-sky-700 dark:text-sky-400">پس از ثبت سفارش، می‌توانید وضعیت آن را به پرداخت شده، ارسال، تحویل یا لغو تغییر دهید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
