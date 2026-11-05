'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import {
  ArrowRight, ArrowRightLeft, Package, Warehouse, Truck, Lightbulb,
  Info, Loader2, AlertCircle, Boxes, CheckCircle2, XCircle, Trash2,
  Save, X,
} from 'lucide-react';
import { toast } from 'sonner';

const guideItems = [
  { icon: Package, title: 'انتخاب محصول', desc: 'محصولی که می‌خواهید انتقال دهید را بررسی و انتخاب کنید.' },
  { icon: Warehouse, title: 'انبار مبدأ و مقصد', desc: 'انبارهای مبدأ و مقصد باید دو انبار مجزا و متفاوت باشند.' },
  { icon: Boxes, title: 'تعداد انتقال', desc: 'تعداد باید حداقل ۱ واحد باشد و از موجودی انبار مبدأ بیشتر نباشد.' },
  { icon: Truck, title: 'وضعیت انتقال', desc: 'پس از ارسال، وضعیت به «در حال انتقال» و پس از تحویل به «دریافت شد» تغییر می‌کند.' },
];

export default function EditStockTransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const transferId = unwrappedParams.id;
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transferNumber, setTransferNumber] = useState('');

  const [form, setForm] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    qty: '1',
    status: 'pending',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [whs, prods, transfers] = await Promise.all([
        fetchData('warehouses', { where: {} }),
        fetchData('products', { where: { active: true } }),
        fetchData('stock_transfers', { where: { id: transferId } }),
      ]);
      setWarehouses(whs || []);
      setProducts(prods || []);

      const t = transfers?.[0];
      if (!t) {
        toast.error('سند انتقال یافت نشد');
        router.push('/dashboard/stock-transfers');
        return;
      }

      setTransferNumber(t.number || '');
      setForm({
        productId: t.productId || '',
        fromWarehouseId: t.fromWarehouseId || '',
        toWarehouseId: t.toWarehouseId || '',
        qty: String(t.qty || '1'),
        status: t.status || 'pending',
        notes: t.notes || '',
      });
    } catch (err: any) {
      toast.error('خطا در بارگذاری اطلاعات انتقال: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  }, [transferId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.productId) e.productId = 'محصول را انتخاب کنید';
    if (!form.fromWarehouseId) e.fromWarehouseId = 'انبار مبدأ را انتخاب کنید';
    if (!form.toWarehouseId) e.toWarehouseId = 'انبار مقصد را انتخاب کنید';
    if (form.fromWarehouseId && form.toWarehouseId && form.fromWarehouseId === form.toWarehouseId) {
      e.toWarehouseId = 'انبار مبدأ و مقصد نمی‌توانند یکسان باشند';
    }
    const q = Number(form.qty);
    if (!form.qty || isNaN(q) || q <= 0) e.qty = 'تعداد باید عدد مثبت باشد';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updateData(
        'stock_transfers',
        { id: transferId },
        {
          productId: form.productId,
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          qty: Number(form.qty),
          status: form.status,
          notes: form.notes.trim() || null,
        }
      );
      toast.success('سند انتقال با موفقیت ویرایش شد');
      router.push('/dashboard/stock-transfers');
    } catch (error: any) {
      toast.error('ویرایش انتقال ناموفق: ' + error.message);
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('آیا از حذف این سند انتقال اطمینان دارید؟')) return;
    setDeleting(true);
    try {
      await deleteData('stock_transfers', { id: transferId });
      toast.success('سند انتقال حذف شد');
      router.push('/dashboard/stock-transfers');
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
          <p>در حال بارگذاری اطلاعات انتقال...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      {/* Top Bar */}
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/stock-transfers" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به انتقال‌ها
          </Link>
          <span className="nb-editor-breadcrumb">
            داشبورد <b>←</b> انبارداری <b>←</b> ویرایش انتقال {transferNumber}
          </span>
        </div>
        <div className="nb-editor-topbar-right">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors dark:border-rose-900/40 dark:hover:bg-rose-950/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? 'در حال حذف...' : 'حذف انتقال'}
          </button>
          <button
            type="button"
            className="nb-editor-discard"
            onClick={() => router.push('/dashboard/stock-transfers')}
            disabled={submitting}
          >
            انصراف
          </button>
          <button
            type="submit"
            form="transfer-edit-form"
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
          <form id="transfer-edit-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <ArrowRightLeft className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>
                    ویرایش سند انتقال بین انبار
                  </h2>
                  <p className="text-sm text-slate-400">
                    شماره سند: <span dir="ltr" className="font-mono text-slate-700 dark:text-slate-200">{transferNumber}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <label className="nb-editor-label">محصول مورد انتقال <span className="text-red-500">*</span></label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className={`nb-input ${errors.productId ? 'border-red-300' : ''}`}
                >
                  <option value="">انتخاب محصول...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ''} — موجودی کل: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
                {errors.productId && <span className="nb-editor-error">{errors.productId}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">انبار مبدأ <span className="text-red-500">*</span></label>
                  <select
                    value={form.fromWarehouseId}
                    onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}
                    className={`nb-input ${errors.fromWarehouseId ? 'border-red-300' : ''}`}
                  >
                    <option value="">انتخاب انبار مبدأ...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  {errors.fromWarehouseId && <span className="nb-editor-error">{errors.fromWarehouseId}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">انبار مقصد <span className="text-red-500">*</span></label>
                  <select
                    value={form.toWarehouseId}
                    onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}
                    className={`nb-input ${errors.toWarehouseId ? 'border-red-300' : ''}`}
                  >
                    <option value="">انتخاب انبار مقصد...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  {errors.toWarehouseId && <span className="nb-editor-error">{errors.toWarehouseId}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">تعداد مورد انتقال <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    className={`nb-input ${errors.qty ? 'border-red-300' : ''}`}
                  />
                  {errors.qty && <span className="nb-editor-error">{errors.qty}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <label className="nb-editor-label">وضعیت سند</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="nb-input"
                  >
                    <option value="pending">در انتظار ارسال</option>
                    <option value="in_transit">در حال انتقال (ارسال شده)</option>
                    <option value="received">دریافت شده در انبار مقصد</option>
                    <option value="cancelled">لغو شده</option>
                  </select>
                </div>
              </div>

              <div className="nb-editor-field-group">
                <label className="nb-editor-label">توضیحات و یادداشت‌ها</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="nb-input min-h-[100px] leading-6"
                  placeholder="علت انتقال یا توضیحات راننده/حمل‌کننده..."
                />
              </div>
            </div>
          </form>

          {/* Sidebar guide */}
          <div className="space-y-4">
            <div className="nb-editor-guide-card">
              <div className="flex items-center gap-2 mb-3 text-primary font-bold text-sm">
                <Lightbulb className="w-4 h-4" />
                راهنمای انتقال کالا
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
