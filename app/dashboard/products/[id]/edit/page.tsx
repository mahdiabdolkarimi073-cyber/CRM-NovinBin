'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import {
  ArrowRight, Package, Tag, Boxes, DollarSign, Warehouse,
  Lightbulb, Info, Loader2, Type, ScanLine, CheckCircle2,
  Trash2, Save, X, HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';

const guideItems = [
  { icon: Type, title: 'نام محصول یا خدمت', desc: 'نامی واضح و دقیق وارد کنید تا در تمام بخش‌ها به‌راحتی شناسایی شود.' },
  { icon: Tag, title: 'کد و برند', desc: 'کد یکتای انبارداری (SKU) و نام برند محصول را ثبت کنید.' },
  { icon: ScanLine, title: 'بارکدخوان', desc: 'می‌توانید با دکمه اسکن یا اتصال بارکدخوان، بارکد جدید ثبت کنید.' },
  { icon: DollarSign, title: 'قیمت و موجودی', desc: 'قیمت فروش و موجودی فیزیکی واقعی کالا در انبار را به‌روز نگه دارید.' },
  { icon: Warehouse, title: 'حداقل موجودی هشدار', desc: 'با رسیدن موجودی به این حد، سیستم هشدار کمبود موجودی صادر می‌کند.' },
];

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const productId = unwrappedParams.id;
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [barcodeScanActive, setBarcodeScanActive] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');
  const [productMeta, setProductMeta] = useState<Product | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'product',
    sku: '',
    barcode: '',
    brand: '',
    price: '',
    stock: '',
    min_stock: '10',
    unit: 'عدد',
    description: '',
    active: true,
  });

  const handleBarcodeScan = useCallback((barcode: string) => {
    setForm((prev) => ({ ...prev, barcode }));
    setScanFeedback(`بارکد اسکن شد: ${barcode}`);
    setBarcodeScanActive(false);
    setTimeout(() => setScanFeedback(''), 4000);
  }, []);

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: barcodeScanActive,
    minLength: 3,
  });

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await fetchData<Product>('products', { where: { id: productId } });
        const prod = data?.[0];
        if (!prod) {
          toast.error('محصول یافت نشد');
          router.push('/dashboard/products');
          return;
        }
        setProductMeta(prod);
        setForm({
          name: prod.name || '',
          type: prod.type || 'product',
          sku: prod.sku || '',
          barcode: prod.barcode || '',
          brand: prod.brand || '',
          price: prod.price != null ? String(prod.price) : '',
          stock: prod.stock != null ? String(prod.stock) : '',
          min_stock: prod.minStock != null ? String(prod.minStock) : '10',
          unit: prod.unit || 'عدد',
          description: prod.description || '',
          active: prod.active !== false,
        });
      } catch (err: any) {
        toast.error('خطا در بارگذاری محصول: ' + (err?.message || 'نامشخص'));
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [productId, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'نام محصول الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      brand: form.brand.trim() || null,
      price: form.price ? Number(form.price) : 0,
      stock: form.type === 'service' ? 0 : form.stock ? Number(form.stock) : 0,
      minStock: form.type === 'service' ? 0 : form.min_stock ? Number(form.min_stock) : 0,
      unit: form.unit.trim() || 'عدد',
      description: form.description.trim() || null,
      active: form.active,
    };
    try {
      await updateData('products', { id: productId }, payload);
      toast.success('محصول با موفقیت ویرایش شد');
      router.push('/dashboard/products');
    } catch (error: any) {
      toast.error('ویرایش ناموفق: ' + error.message);
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`آیا از حذف محصول «${form.name}» اطمینان دارید؟`)) return;
    setDeleting(true);
    try {
      await deleteData('products', { id: productId });
      toast.success('محصول حذف شد');
      router.push('/dashboard/products');
    } catch (err: any) {
      toast.error('حذف ناموفق: ' + err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="nb-empty">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          <p>در حال بارگذاری اطلاعات محصول...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/products" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به محصولات
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> انبار و محصولات <b>←</b> ویرایش محصول</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors dark:border-rose-900/40 dark:hover:bg-rose-950/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? 'در حال حذف...' : 'حذف محصول'}
          </button>
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/products')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="product-edit-form"
            className="nb-editor-save-btn"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="product-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <Package className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>ویرایش محصول / خدمت</h2>
                  <p className="text-sm text-slate-400">اطلاعات کاتالوگ، انبارداری و قیمت‌گذاری را ویرایش کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">نام محصول یا خدمت <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`nb-input ${errors.name ? 'border-red-300' : ''}`}
                    placeholder="مثال: سرور اختصاصی یا قطعه شبکه"
                  />
                  {errors.name && <span className="nb-editor-error">{errors.name}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">نوع آیتم</label>
                  <select
                    className="nb-input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="product">کالای فیزیکی (انباردار)</option>
                    <option value="service">خدمات (بدون موجودی انبار)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">کد کالا (SKU)</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="nb-input"
                    placeholder="مثال: PRD-1001"
                    dir="ltr"
                  />
                </div>

                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">برند / سازنده</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="nb-input"
                    placeholder="مثال: سیسکو، دل"
                  />
                </div>

                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">واحد اندازه‌گیری</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="nb-input"
                    placeholder="عدد، بسته، متر، ساعت..."
                  />
                </div>
              </div>

              {/* Barcode row */}
              <div className="nb-editor-field-group">
                <div className="flex items-center justify-between mb-1">
                  <label className="nb-editor-label">بارکد کالا</label>
                  <button
                    type="button"
                    onClick={() => setBarcodeScanActive(!barcodeScanActive)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      barcodeScanActive
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    {barcodeScanActive ? 'اسکنر فعال است...' : 'اسکن بارکد'}
                  </button>
                </div>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="nb-input"
                  placeholder="بارکد محصول را وارد یا اسکن کنید"
                  dir="ltr"
                />
                {scanFeedback && (
                  <span className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {scanFeedback}
                  </span>
                )}
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">قیمت فروش (تومان)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="nb-input"
                    placeholder="مثال: ۲۵۰۰۰۰۰"
                  />
                </div>

                {form.type === 'product' && (
                  <>
                    <div className="nb-editor-field-group">
                      <label className="nb-editor-label">موجودی فعلی انبار</label>
                      <input
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        className="nb-input"
                        placeholder="تعداد در انبار"
                      />
                    </div>

                    <div className="nb-editor-field-group">
                      <label className="nb-editor-label">حداقل موجودی (نقطه سفارش)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.min_stock}
                        onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                        className="nb-input"
                        placeholder="مثال: ۱۰"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="nb-editor-field-group">
                <label className="nb-editor-label">توضیحات و مشخصات فنی</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="nb-input min-h-[100px] leading-6"
                  placeholder="توضیحات تکمیلی محصول..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="product-active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 rounded text-primary"
                />
                <label htmlFor="product-active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  محصول فعال و در دسترس برای فروش و اسناد انبار باشد
                </label>
              </div>
            </div>
          </form>

          {/* Sidebar guide */}
          <div className="space-y-4">
            <div className="nb-editor-guide-card">
              <div className="flex items-center gap-2 mb-3 text-primary font-bold text-sm">
                <Lightbulb className="w-4 h-4" />
                راهنمای ویرایش محصول
              </div>
              <div className="space-y-3">
                {guideItems.map((item, index) => (
                  <div key={index} className="flex gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                    <item.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-800 dark:text-slate-200">{item.title}</strong>
                      <span>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
