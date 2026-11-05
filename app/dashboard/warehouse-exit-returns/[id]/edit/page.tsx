'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, updateData, createData, deleteData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, RotateCcw, Building2, Calendar,
  User, Loader2, Lightbulb, Info, Trash2, Check, Plus, Hash, AlertTriangle,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { formatToman, parseNumber } from '@/lib/format';
import { toast } from 'sonner';
import type { Warehouse, Profile, Product, WarehouseExit, WarehouseExitReturn, WarehouseExitReturnItem } from '@/lib/types';

interface ItemRow {
  id?: string;
  originalExitItemId?: string;
  productId: string;
  productName: string;
  qty: string;
  unit: string;
  unitPrice: string;
}

const RETURN_REASONS = [
  { value: 'wrong_delivery', label: 'تحویل اشتباه' },
  { value: 'excess_delivery', label: 'تحویل مازاد' },
  { value: 'defective', label: 'کالای معیوب' },
  { value: 'quality_issue', label: 'مشکل کیفیت' },
  { value: 'cancellation', label: 'لغو خروج' },
  { value: 'other', label: 'سایر' },
];

const ITEM_CONDITIONS = [
  { value: 'usable', label: 'قابل استفاده' },
  { value: 'quarantine', label: 'قرنطینه' },
  { value: 'defective', label: 'معیوب' },
  { value: 'scrap', label: 'ضایعاتی' },
  { value: 'needs_inspection', label: 'نیازمند بازرسی' },
];

const WER_STATUSES = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'pending_review', label: 'در انتظار بررسی' },
  { value: 'approved', label: 'تأیید شده' },
  { value: 'applied', label: 'اعمال شده' },
  { value: 'finalized', label: 'نهایی شده' },
  { value: 'voided', label: 'باطل شده' },
];

const guideItems = [
  { icon: Hash, title: 'شماره سند', desc: 'شماره ثبت برگشت خروج کالا در انبارداری نوین‌بین.' },
  { icon: AlertTriangle, title: 'وضعیت سلامت', desc: 'مشخص کردن وضعیت کیفی کالای ارجاع‌شده.' },
  { icon: Building2, title: 'انبار مقصد', desc: 'انباری که موجودی کالا به آن بازگردانده می‌شود.' },
];

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 10,
  border: '1px solid #E2E8F0',
  padding: '0 14px',
  fontSize: 14,
  width: '100%',
  background: 'transparent',
  outline: 'none',
};

export default function EditWarehouseExitReturnPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [exits, setExits] = useState<WarehouseExit[]>([]);

  const [number, setNumber] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [originalExitId, setOriginalExitId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [contactName, setContactName] = useState('');
  const [returnReason, setReturnReason] = useState('other');
  const [itemCondition, setItemCondition] = useState('usable');
  const [responsibleId, setResponsibleId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState<ItemRow[]>([]);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [whData, prodData, staffData, exList, returnList, returnItems] = await Promise.all([
        fetchData<Warehouse>('warehouses', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: {} }),
        fetchData<WarehouseExit>('warehouse_exits', { orderBy: { createdAt: 'desc' } }),
        fetchData<WarehouseExitReturn>('warehouse_exit_returns', { where: { id } }),
        fetchData<WarehouseExitReturnItem>('warehouse_exit_return_items', { where: { returnId: id }, orderBy: { rowNumber: 'asc' } }),
      ]);
      setWarehouses(whData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);
      setExits(exList || []);

      if (returnList && returnList.length > 0) {
        const r = returnList[0];
        setNumber(r.number || '');
        setReturnDate(r.returnDate ? new Date(r.returnDate).toISOString().slice(0, 10) : '');
        setOriginalExitId(r.originalExitId || '');
        setWarehouseId(r.warehouseId || '');
        setContactName(r.contactName || '');
        setReturnReason(r.returnReason || 'other');
        setItemCondition(r.itemCondition || 'usable');
        setResponsibleId(r.responsibleId || '');
        setDescription(r.description || '');
        setStatus(r.status || 'draft');

        if (returnItems && returnItems.length > 0) {
          setItems(
            returnItems.map((item) => ({
              id: item.id,
              originalExitItemId: item.originalExitItemId || '',
              productId: item.productId || '',
              productName: item.productName || '',
              qty: String(item.qty || 1),
              unit: item.unit || '',
              unitPrice: String(item.unitPrice || 0),
            }))
          );
        } else {
          setItems([{ productId: '', productName: '', qty: '1', unit: '', unitPrice: '0' }]);
        }
      } else {
        toast.error('سند برگشت خروج یافت نشد');
        router.push('/dashboard/warehouse-exit-returns');
      }
    } catch (error: any) {
      toast.error('خطا در بارگذاری اطلاعات: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems(
      items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const p = products.find((prod) => prod.id === value);
          if (p) {
            updated.productName = p.name;
            updated.unit = p.unit || '';
            updated.unitPrice = String(p.price || p.cost || 0);
          }
        }
        return updated;
      })
    );
  };

  const calcRow = (item: ItemRow) => parseNumber(item.qty) * parseNumber(item.unitPrice);
  const totalValue = items.reduce((sum, item) => sum + calcRow(item), 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!returnDate) e.returnDate = 'تاریخ برگشت الزامی است';
    if (items.length === 0 || items.every((i) => !i.productId && !i.productName)) {
      e.items = 'حداقل یک قلم کالا الزامی است';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error('کاربر وارد نشده است');
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      await updateData(
        'warehouse_exit_returns',
        { id },
        {
          returnDate: new Date(returnDate).toISOString(),
          originalExitId: originalExitId || null,
          warehouseId: warehouseId || null,
          contactName: contactName || null,
          returnReason,
          itemCondition,
          responsibleId: responsibleId || null,
          description: description || null,
          totalValue,
          status,
        }
      );

      // Clean existing items and re-insert
      try {
        await deleteData('warehouse_exit_return_items', { returnId: id });
      } catch {}

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        await createData('warehouse_exit_return_items', {
          returnId: id,
          rowNumber: i + 1,
          originalExitItemId: item.originalExitItemId || null,
          productId: item.productId || null,
          productName: item.productName || null,
          qty: parseNumber(item.qty),
          unit: item.unit || null,
          unitPrice: parseNumber(item.unitPrice),
          totalPrice: calcRow(item),
        });
      }

      toast.success('سند برگشت خروج با موفقیت ذخیره شد');
      router.push('/dashboard/warehouse-exit-returns');
    } catch (error: any) {
      toast.error('خطا در ذخیره تغییرات: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('آیا از حذف این برگشت خروج اطمینان دارید؟')) return;
    try {
      await deleteData('warehouse_exit_return_items', { returnId: id });
      await deleteData('warehouse_exit_returns', { id });
      toast.success('سند برگشت خروج حذف شد');
      router.push('/dashboard/warehouse-exit-returns');
    } catch (error: any) {
      toast.error('خطا در حذف: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="nb-editor-page" dir="rtl">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/warehouse-exit-returns" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="nb-editor-breadcrumb">
            <span className="nb-editor-breadcrumb-muted">داشبورد</span>
            <span className="nb-editor-breadcrumb-separator">/</span>
            <Link href="/dashboard/warehouse-exit-returns" className="nb-editor-breadcrumb-muted hover:text-slate-900 dark:hover:text-slate-100">
              برگشت خروج از انبار
            </Link>
            <span className="nb-editor-breadcrumb-separator">/</span>
            <span className="nb-editor-breadcrumb-current">ویرایش {number}</span>
          </div>
        </div>

        <div className="nb-editor-topbar-right">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </button>
          )}
          <Link href="/dashboard/warehouse-exit-returns" className="nb-editor-discard">
            انصراف
          </Link>
          <button
            type="submit"
            form="edit-exit-return-form"
            disabled={submitting}
            className="nb-editor-save-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ذخیره...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                ذخیره تغییرات
              </>
            )}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="edit-exit-return-form" onSubmit={handleSave} className="lg:col-span-2 space-y-6">
            <div className="nb-editor-canvas">
              <div className="nb-editor-canvas-header">
                <span className="nb-editor-canvas-icon" style={{ background: 'linear-gradient(135deg, #FF7A00 0%, #E65100 100%)' }}>
                  <RotateCcw className="h-4 w-4 text-white" />
                </span>
                <div>
                  <h2>ویرایش برگشت خروج از انبار</h2>
                  <p>اطلاعات سند مرجوعی و اقلام بازگردانده شده را ویرایش کنید</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره سند</Label>
                  <input
                    value={number}
                    readOnly
                    dir="ltr"
                    className="nb-input bg-slate-50 dark:bg-slate-900 text-slate-500 font-mono"
                    style={inputStyle}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت سند</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    {WER_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">خروج مبنا</Label>
                  <select
                    value={originalExitId}
                    onChange={(e) => setOriginalExitId(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    <option value="">انتخاب خروج مبنا...</option>
                    {exits.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.number} — {ex.contactName || 'تحویل‌گیرنده نامشخص'} ({ex.totalValue ? formatToman(Number(ex.totalValue)) + ' ت' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">انبار مقصد برگشت</Label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    <option value="">انتخاب انبار...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">
                    تاریخ برگشت <span className="text-rose-500">*</span>
                  </Label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => {
                      setReturnDate(e.target.value);
                      if (errors.returnDate) setErrors({ ...errors, returnDate: '' });
                    }}
                    className={`nb-input ${errors.returnDate ? 'border-rose-400' : ''}`}
                    style={inputStyle}
                  />
                  {errors.returnDate && <p className="text-xs text-rose-500">{errors.returnDate}</p>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تحویل‌دهنده / طرف حساب</Label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="نام تحویل‌دهنده..."
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">دلیل برگشت</Label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    {RETURN_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت سلامت کالا</Label>
                  <select
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    {ITEM_CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مسئول رسیدگی</Label>
                  <select
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    <option value="">انتخاب مسئول...</option>
                    {staff.map((p) => (
                      <option key={p.id} value={p.id}>
                        {fullName(p.firstName, p.lastName)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات و یادداشت</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="علت ارجاع کالا یا نکات پیرامون تحویل..."
                  rows={2}
                  className="rounded-lg border border-slate-200 bg-transparent text-sm focus:border-amber-400 focus:outline-none dark:border-slate-700"
                />
              </div>
            </div>

            {/* Items Canvas */}
            <div className="nb-editor-canvas">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">اقلام بازگشتی</h3>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-8 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> افزودن ردیف
                </Button>
              </div>

              {errors.items && <p className="text-xs text-rose-500">{errors.items}</p>}

              <div className="space-y-3 pt-3">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-slate-500">کالا</Label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="">انتخاب کالا...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs text-slate-500">تعداد</Label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-slate-500">واحد</Label>
                        <input
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          placeholder="عدد، جعبه..."
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-slate-500">قیمت واحد (تومان)</Label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>

                      <div className="flex items-end justify-between sm:justify-end gap-2">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block">جمع ردیف</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {formatToman(calcRow(item))}
                          </span>
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-left dark:bg-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">مجموع ارزش برگشت:</span>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {formatToman(totalValue)} تومان
                </span>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنما و نکات</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-slate-300">
                      <item.icon className="h-4 w-4" />
                    </span>
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
                <h2 className="font-bold text-slate-900 dark:text-slate-100">افزایش مجدد موجودی</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                در صورت نهایی‌شدن یا اعمال این سند، اقلام ارجاع‌شده مجدداً به موجودی انبار مقصد افزوده شده و حواله خروج اصلی تعدیل خواهد شد.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
