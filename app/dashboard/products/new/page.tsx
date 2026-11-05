'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Package, Tag, Boxes, DollarSign, Warehouse, Lightbulb, Info, Loader2, Type, ScanLine, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const guideItems = [
  { icon: Type, title: 'نام محصول', desc: 'نامی واضح و مشخص برای محصول یا خدمت بنویسید.' },
  { icon: Tag, title: 'کد و برند', desc: 'کد یکتا (SKU) و برند محصول را وارد کنید.' },
  { icon: ScanLine, title: 'بارکد', desc: 'با کلیک روی دکمه اسکن، بارکد را با بارکدخوان وارد کنید.' },
  { icon: DollarSign, title: 'قیمت و موجودی', desc: 'قیمت به تومان و موجودی انبار را ثبت کنید.' },
  { icon: Warehouse, title: 'حداقل موجودی', desc: 'حداقل موجودی برای هشدار کمبود را مشخص کنید.' },
];

export default function NewProductPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [barcodeScanActive, setBarcodeScanActive] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');
  const [form, setForm] = useState({
    name: '', type: 'product', sku: '', barcode: '', brand: '',
    price: '', stock: '', min_stock: '10', unit: 'عدد', description: '',
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
      name: form.name,
      type: form.type as 'product' | 'service',
      sku: form.sku || null,
      barcode: form.barcode || null,
      brand: form.brand || null,
      price: Number(form.price.replace(/[^0-9]/g, '')) || 0,
      stock: Number(form.stock) || 0,
      minStock: Number(form.min_stock) || 0,
      unit: form.unit,
      description: form.description || null,
    };
    try {
      await createData('products', payload);
      toast.success('محصول با موفقیت ایجاد شد');
      router.push('/dashboard/products');
    } catch (error: any) {
      toast.error('ایجاد محصول ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>افزودن محصول جدید</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> محصولات <b>←</b> ایجاد محصول
            </div>
          </div>
          <Link href="/dashboard/products" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به محصولات
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <Package className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات محصول</h2>
                  <p>جزئیات محصول یا خدمت را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">نام <span className="required-star">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="نام محصول یا خدمت"
                    className="task-input"
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">نوع <span className="required-star">*</span></Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Boxes className="h-4 w-4" /></span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">کالا</SelectItem>
                      <SelectItem value="service">خدمت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-group">
                  <Label className="field-label">واحد</Label>
                  <Input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="عدد"
                    className="task-input"
                  />
                </div>
              </div>

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">کد (SKU)</Label>
                  <Input
                    dir="ltr"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="اختیاری"
                    className="task-input"
                  />
                </div>

                <div className="field-group">
                  <Label className="field-label">برند</Label>
                  <Input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder="اختیاری"
                    className="task-input"
                  />
                </div>

                <div className="field-group">
                  <Label className="field-label">بارکد</Label>
                  <div className="flex gap-2">
                    <Input
                      dir="ltr"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="اختیاری"
                      className="task-input"
                    />
                    <button
                      type="button"
                      onClick={() => setBarcodeScanActive((v) => !v)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all whitespace-nowrap ${
                        barcodeScanActive
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50'
                      }`}
                      title="اسکن بارکد با بارکدخوان"
                    >
                      <ScanLine className="h-4 w-4" />
                      {barcodeScanActive ? 'در حال اسکن...' : 'اسکن'}
                    </button>
                  </div>
                  {barcodeScanActive && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400">
                      <ScanLine className="h-3.5 w-3.5 animate-pulse" />
                      <span>بارکدخوان را آماده کنید و بارکد را اسکن کنید</span>
                    </div>
                  )}
                  {scanFeedback && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {scanFeedback}
                    </div>
                  )}
                </div>
              </div>

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">قیمت (تومان)</Label>
                  <Input
                    dir="ltr"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0"
                    className="task-input"
                  />
                </div>

                <div className="field-group">
                  <Label className="field-label">موجودی</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    placeholder="0"
                    className="task-input"
                  />
                </div>

                <div className="field-group">
                  <Label className="field-label">حداقل موجودی</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                    placeholder="10"
                    className="task-input"
                  />
                </div>
              </div>

              <div className="field-group">
                <Label className="field-label">توضیحات</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="توضیحات اختیاری..."
                  className="task-textarea"
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/products')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد محصول'}
              </button>
            </div>
          </form>

          <aside className="task-sidebar">
            <div className="guide-card">
              <div className="guide-card-header">
                <span className="guide-card-icon"><Lightbulb className="h-5 w-5" /></span>
                <h2>راهنما و نکات</h2>
              </div>
              <div className="guide-items">
                {guideItems.map((item, i) => (
                  <div key={i}>
                    <div className="guide-item">
                      <span className="guide-item-icon"><item.icon className="h-5 w-5" /></span>
                      <div className="guide-item-text">
                        <strong>{item.title}</strong>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                    {i < guideItems.length - 1 && <div className="guide-item-divider" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <span className="info-card-icon"><Info className="h-5 w-5" /></span>
                <h2>اطلاعات مفید</h2>
              </div>
              <p>محصولات ایجاد شده در بخش «محصولات» قابل مدیریت هستند. در صورت کاهش موجودی به زیر حداقل، هشدار نمایش داده می‌شود.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
