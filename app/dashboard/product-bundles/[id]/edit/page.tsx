'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, Boxes, Loader2, Plus, Trash2,
  Lightbulb, Info, Hash, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { Product, ProductBundle, ProductBundleItem } from '@/lib/types';

interface ItemRow {
  id?: string;
  productId: string;
  productName: string;
  qty: string;
  unit: string;
  unitPrice: string;
  unitCost: string;
}

const guideItems = [
  { icon: Hash, title: 'کد بسته', desc: 'کد بسته را ویرایش کنید (اختیاری).' },
  { icon: Boxes, title: 'اقلام بسته', desc: 'محصولات تشکیل‌دهنده بسته را ویرایش کنید.' },
  { icon: Lightbulb, title: 'تخفیف بسته', desc: 'درصد تخفیف روی قیمت کل بسته اعمال می‌شود.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

const itemInputStyle: React.CSSProperties = {
  height: 38, borderRadius: 8, border: '1px solid #E2E8F0',
  padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none',
};

export default function EditProductBundlePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const bundleId = params.id as string;
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [discountPct, setDiscountPct] = useState('0');
  const [items, setItems] = useState<ItemRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [prodData, bundleData] = await Promise.all([
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<ProductBundle>('product_bundles', {
          where: { id: bundleId },
          include: { items: true },
        }),
      ]);
      setProducts(prodData || []);
      const bundle = (bundleData as any[])[0] as ProductBundle | undefined;
      if (bundle) {
        setCode(bundle.code || '');
        setName(bundle.name || '');
        setDescription(bundle.description || '');
        setUnit(bundle.unit || '');
        setDiscountPct(String(bundle.discountPct || 0));
        setItems((bundle.items || []).map((it: ProductBundleItem) => ({
          id: it.id,
          productId: it.productId || '',
          productName: it.productName || '',
          qty: String(it.qty),
          unit: it.unit || '',
          unitPrice: String(it.unitPrice || 0),
          unitCost: '0',
        })));
      }
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفک: ' + error.message);
    }
    setLoading(false);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, [bundleId]);

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
      await updateData('product_bundles', { id: bundleId }, {
        code: code || null,
        name,
        description: description || null,
        unit: unit || null,
        totalCost,
        totalPrice,
        discountPct: discountVal,
        finalPrice,
        updatedAt: new Date().toISOString(),
      });

      for (const item of items) {
        if (!item.productId && !item.productName) continue;
        const r = calcRow(item);
        const data = {
          productId: item.productId || null,
          productName: item.productName || null,
          qty: parseNumber(item.qty),
          unit: item.unit || null,
          unitPrice: parseNumber(item.unitPrice),
          totalCost: r.totalCost,
          totalPrice: r.totalPrice,
        };
        if (item.id) {
          await updateData('product_bundle_items', { id: item.id }, data);
        } else {
          await createData('product_bundle_items', { bundleId, rowNumber: items.indexOf(item) + 1, ...data });
        }
      }

      toast.success('بسته محصول ویرایش شد');
      router.push('/dashboard/product-bundles');
    } catch (error: any) {
      toast.error('ویرایش ناموفک: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/product-bundles" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به بسته‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> بسته محصول <b>←</b> ویرایش</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/product-bundles')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="bundle-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="bundle-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات بسته</h2>
                  <p className="text-sm text-slate-400">جزئیات بسته محصول را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">کد بسته</Label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="کد اختیاری..."
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام بسته <span className="text-red-500">*</span></Label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام بسته..."
                    className={`nb-input ${errors.name ? 'border-red-300' : ''}`}
                    style={{ ...inputStyle, borderColor: errors.name ? '#FCA5A5' : '#E2E8F0' }}
                  />
                  {errors.name && <span className="nb-editor-error">{errors.name}</span>}
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">واحد</Label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="واحد..."
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">درصد تخفیف</Label>
                  <input
                    type="number"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    placeholder="0"
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="nb-input"
                  style={{ minHeight: 100, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={5}
                />
              </div>
            </div>

            {/* Items section */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 18 }}>اقلام بسته</h2>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30">
                  <Plus className="h-3.5 w-3.5" /> افزودن قلم
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, i) => {
                  const r = calcRow(item);
                  return (
                    <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">قلم {toEnglishDigits(String(i + 1))}</span>
                        {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="nb-input" style={itemInputStyle}>
                          <option value="">انتخاب محصول...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input placeholder="نام محصول" value={item.productName} onChange={(e) => updateItem(i, 'productName', e.target.value)} className="nb-input" style={itemInputStyle} />
                        <input placeholder="واحد" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="nb-input" style={itemInputStyle} />
                        <input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="nb-input" style={itemInputStyle} />
                        <input type="number" placeholder="قیمت واحد" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="nb-input" style={itemInputStyle} />
                        <input type="number" placeholder="هزینه واحد" value={item.unitCost} onChange={(e) => updateItem(i, 'unitCost', e.target.value)} className="nb-input" style={itemInputStyle} />
                        <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-xs font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">قیمت: {formatToman(r.totalPrice)} | هزینه: {formatToman(r.totalCost)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}

              <div className="mt-4 space-y-1.5 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <div className="flex justify-between text-sm"><span className="text-blue-600 dark:text-blue-400">هزینه کل:</span><span className="font-bold text-blue-700 dark:text-blue-400">{formatToman(totalCost)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-blue-600 dark:text-blue-400">قیمت کل:</span><span className="font-bold text-blue-700 dark:text-blue-400">{formatToman(totalPrice)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-blue-600 dark:text-blue-400">تخفیف ({toEnglishDigits(discountPct)}٪):</span><span className="font-bold text-blue-700 dark:text-blue-400">{formatToman(discountAmount)}</span></div>
                <div className="flex justify-between border-t border-blue-200 pt-1.5 dark:border-blue-800/50"><span className="text-sm font-semibold text-blue-600 dark:text-blue-400">قیمت نهایی:</span><span className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatToman(finalPrice)} تومان</span></div>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنمای ویرایش</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-slate-300"><item.icon className="h-4 w-4" /></span>
                    <div>
                      <strong className="text-sm text-slate-700 dark:text-slate-300">{item.title}</strong>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">تغییرات بسته محصول بلافاصله پس از ذخیره اعمال می‌شود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
