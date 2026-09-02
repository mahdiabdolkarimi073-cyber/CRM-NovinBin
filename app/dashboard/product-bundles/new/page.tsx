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
  ArrowRight, Boxes, Loader2, Plus, Trash2,
  Lightbulb, Info, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { Product } from '@/lib/types';

interface ItemRow {
  productId: string;
  productName: string;
  qty: string;
  unit: string;
  unitPrice: string;
  unitCost: string;
}

const guideItems = [
  { icon: Hash, title: 'کد بسته', desc: 'کد یکتای بسته را وارد کنید (اختیاری).' },
  { icon: Boxes, title: 'اقلام بسته', desc: 'محصولات تشکیل‌دهنده بسته را اضافه کنید.' },
  { icon: Lightbulb, title: 'تخفیف بسته', desc: 'درصد تخفیف روی قیمت کل بسته اعمال می‌شود.' },
];

export default function NewProductBundlePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [products, setProducts] = useState<Product[]>([]);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', unitCost: '0' },
  ]);

  const loadData = useCallback(async () => {
    try {
      const prodData = await fetchData<Product>('products', { where: { active: true } });
      setProducts(prodData || []);
    } catch (error: any) {
      toast.error('بارگذاری محصولات ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', unitCost: '0' }]);
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
          updated.unitCost = String(p.cost || 0);
        }
      }
      return updated;
    }));
  };

  const calcRow = (item: ItemRow) => {
    const qty = parseNumber(item.qty);
    const unitPrice = parseNumber(item.unitPrice);
    const unitCost = parseNumber(item.unitCost);
    return { totalCost: qty * unitCost, totalPrice: qty * unitPrice };
  };

  const totalCost = items.reduce((sum, item) => sum + calcRow(item).totalCost, 0);
  const totalPrice = items.reduce((sum, item) => sum + calcRow(item).totalPrice, 0);
  const discountVal = parseNumber(discountPct);
  const discountAmount = (totalPrice * discountVal) / 100;
  const finalPrice = totalPrice - discountAmount;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name) e.name = 'نام بسته الزامی است';
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
      const bundle = await createData('product_bundles', {
        code: code || null,
        name,
        description: description || null,
        unit: unit || null,
        totalCost,
        totalPrice,
        discountPct: discountVal,
        finalPrice,
        active: true,
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        const r = calcRow(item);
        await createData('product_bundle_items', {
          bundleId: bundle.id,
          rowNumber: i + 1,
          productId: item.productId || null,
          productName: item.productName || null,
          qty: parseNumber(item.qty),
          unit: item.unit || null,
          unitPrice: parseNumber(item.unitPrice),
          totalCost: r.totalCost,
          totalPrice: r.totalPrice,
        });
      }

      toast.success('بسته محصول ثبت شد');
      router.push('/dashboard/product-bundles');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت بسته محصول جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> بسته محصول <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/product-bundles">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><Boxes className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات بسته</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات بسته محصول را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">کد بسته</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد اختیاری..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نام بسته <span className="text-rose-500">*</span></Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام بسته..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.name && <span className="text-xs text-rose-500">{errors.name}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">واحد</Label>
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="واحد..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">درصد تخفیف</Label>
                    <Input type="number" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="0" className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
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
                  <h2 className="text-base font-bold text-[#1D2939]">اقلام بسته</h2>
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
                          <Input type="number" placeholder="هزینه واحد" value={item.unitCost} onChange={(e) => updateItem(i, 'unitCost', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-xs font-bold text-blue-700">قیمت: {formatToman(r.totalPrice)} | هزینه: {formatToman(r.totalCost)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}

                <div className="mt-4 space-y-1.5 rounded-lg bg-blue-50 p-3">
                  <div className="flex justify-between text-sm"><span className="text-blue-600">هزینه کل:</span><span className="font-bold text-blue-700">{formatToman(totalCost)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-blue-600">قیمت کل:</span><span className="font-bold text-blue-700">{formatToman(totalPrice)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-blue-600">تخفیف ({toEnglishDigits(discountPct)}٪):</span><span className="font-bold text-blue-700">{formatToman(discountAmount)}</span></div>
                  <div className="flex justify-between border-t border-blue-200 pt-1.5"><span className="text-sm font-semibold text-blue-600">قیمت نهایی:</span><span className="text-lg font-bold text-blue-700">{formatToman(finalPrice)} تومان</span></div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/product-bundles">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت بسته</>}
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
              <p className="text-xs text-blue-700">بسته محصول ترکیبی از چند محصول است که با قیمت واحد به فروش می‌رسد. تخفیف بسته روی قیمت کل اعمال می‌شود.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
