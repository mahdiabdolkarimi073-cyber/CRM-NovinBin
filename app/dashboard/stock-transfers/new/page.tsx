'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowRightLeft, Package, Warehouse, Truck, Lightbulb, Info, Loader2, AlertCircle, Boxes } from 'lucide-react';
import { toast } from 'sonner';

const guideItems = [
  { icon: Package, title: 'انتخاب محصول', desc: 'محصولی که می‌خواهید انتقال دهید را انتخاب کنید.' },
  { icon: Warehouse, title: 'انبار مبدأ و مقصد', desc: 'انبارهای مبدأ و مقصد باید متفاوت باشند.' },
  { icon: Boxes, title: 'تعداد صحیح', desc: 'تعداد باید حداقل ۱ واحد باشد.' },
  { icon: Truck, title: 'پیشگیری انتقال', desc: 'شماره انتقال به‌صورت خودکار تولید می‌شود.' },
];

export default function NewStockTransferPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    qty: '1',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [whs, prods] = await Promise.all([
        fetchData('warehouses', { where: {} }),
        fetchData('products', { where: { active: true } }),
      ]);
      setWarehouses(whs || []);
      setProducts(prods || []);
    } catch {
      setWarehouses([]);
      setProducts([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.productId) e.productId = 'محصول را انتخاب کنید';
    if (!form.fromWarehouseId) e.fromWarehouseId = 'انبار مبدأ را انتخاب کنید';
    if (!form.toWarehouseId) e.toWarehouseId = 'انبار مقصد را انتخاب کنید';
    if (form.fromWarehouseId && form.toWarehouseId && form.fromWarehouseId === form.toWarehouseId) {
      e.toWarehouseId = 'انبار مبدأ و مقصد نمی‌توانند یکسان باشند';
    }
    if (!Number(form.qty) || Number(form.qty) <= 0) e.qty = 'تعداد معتبر وارد کنید';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const number = `TR-${Date.now().toString().slice(-8)}`;
      await createData('stock_transfers', {
        number,
        productId: form.productId,
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        qty: Number(form.qty),
        status: 'pending',
        notes: form.notes || null,
        createdBy: profile.id,
      });
      toast.success('انتقال با موفقیت ایجاد شد');
      router.push('/dashboard/stock-transfers');
    } catch (error: any) {
      toast.error('ایجاد انتقال ناموفق: ' + (error?.message || 'خطا'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="create-task-page" dir="rtl">
      <div className="create-task-container">
        <header className="create-task-header">
          <div>
            <div className="create-task-title">
              <span className="title-accent-bar" />
              <h1>ایجاد انتقال بین انباری</h1>
            </div>
            <div className="create-task-breadcrumb">
              داشبورد <b>←</b> انتقال بین انبارها <b>←</b> ایجاد انتقال
            </div>
          </div>
          <Link href="/dashboard/stock-transfers" className="back-button">
            <ArrowRight className="h-4 w-4" />
            بازگشت به انتقال‌ها
          </Link>
        </header>

        <div className="create-task-grid">
          <form className="task-form-card" onSubmit={handleSubmit}>
            <div className="form-card-header">
              <div className="form-card-title">
                <span className="form-card-icon">
                  <ArrowRightLeft className="h-5 w-5" />
                </span>
                <div>
                  <h2>اطلاعات انتقال</h2>
                  <p>جزئیات انتقال بین انباری را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
                </div>
              </div>
            </div>
            <div className="form-card-divider" />

            <div className="form-fields">
              <div className="field-group">
                <Label className="field-label">محصول <span className="required-star">*</span></Label>
                <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                  <SelectTrigger className="task-select">
                    <span className="select-icon-right"><Package className="h-4 w-4" /></span>
                    <SelectValue placeholder="انتخاب محصول..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ''} — موجودی: {p.stock.toLocaleString('fa-IR')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.productId && <span className="field-error">{errors.productId}</span>}
              </div>

              <div className="management-row">
                <div className="field-group">
                  <Label className="field-label">انبار مبدأ <span className="required-star">*</span></Label>
                  <Select value={form.fromWarehouseId} onValueChange={(v) => setForm({ ...form, fromWarehouseId: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Warehouse className="h-4 w-4" /></span>
                      <SelectValue placeholder="مبدأ..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fromWarehouseId && <span className="field-error">{errors.fromWarehouseId}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">انبار مقصد <span className="required-star">*</span></Label>
                  <Select value={form.toWarehouseId} onValueChange={(v) => setForm({ ...form, toWarehouseId: v })}>
                    <SelectTrigger className="task-select">
                      <span className="select-icon-right"><Warehouse className="h-4 w-4" /></span>
                      <SelectValue placeholder="مقصد..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.toWarehouseId && <span className="field-error">{errors.toWarehouseId}</span>}
                </div>

                <div className="field-group">
                  <Label className="field-label">تعداد <span className="required-star">*</span></Label>
                  <Input
                    type="number"
                    dir="ltr"
                    min="1"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    className="task-input"
                  />
                  {errors.qty && <span className="field-error">{errors.qty}</span>}
                </div>
              </div>

              {form.fromWarehouseId && form.toWarehouseId && form.fromWarehouseId === form.toWarehouseId && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4" /> انبار مبدأ و مقصد یکسان هستند
                </div>
              )}

              <div className="field-group">
                <Label className="field-label">یادداشت</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="اختیاری..."
                  className="task-input"
                />
              </div>
            </div>

            <div className="form-actions-row">
              <button type="button" className="cancel-btn" onClick={() => router.push('/dashboard/stock-transfers')} disabled={submitting}>
                انصراف
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : 'ثبت انتقال'}
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
              <p>انتقال‌های ایجاد شده در بخش «انتقال بین انبارها» قابل مدیریت هستند. وضعیت انتقال را می‌توانید از «در انتظار» به «در حال انتقال» و سپس «دریافت شد» تغییر دهید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
