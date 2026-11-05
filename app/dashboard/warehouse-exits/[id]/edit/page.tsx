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
  ArrowRight, ArrowUpFromLine, Building2, Calendar,
  User, Loader2, Lightbulb, Info, Trash2, Check, Plus, Hash,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { formatToman, parseNumber } from '@/lib/format';
import { toast } from 'sonner';
import type { Warehouse, Profile, Product, WarehouseExit, WarehouseExitItem } from '@/lib/types';

interface ItemRow {
  id?: string;
  productId: string;
  productName: string;
  qty: string;
  unit: string;
  unitPrice: string;
  location: string;
  batchNo: string;
  serialNo: string;
  notes: string;
}

const EXIT_TYPES = [
  { value: 'sale', label: 'فروش' },
  { value: 'internal_use', label: 'مصرف داخلی' },
  { value: 'production', label: 'مصرف تولید' },
  { value: 'transfer_out', label: 'انتقال به انبار دیگر' },
  { value: 'return_to_supplier', label: 'برگشت به تأمین‌کننده' },
  { value: 'consignment', label: 'امانی' },
  { value: 'scrap', label: 'ضایعات' },
  { value: 'adjustment', label: 'خروج اصلاحی' },
  { value: 'other', label: 'سایر' },
];

const WE_STATUSES = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'pending_approval', label: 'در انتظار تأیید' },
  { value: 'approved', label: 'تأیید شده' },
  { value: 'completed', label: 'تکمیل شده' },
  { value: 'applied', label: 'اعمال شده' },
  { value: 'finalized', label: 'نهایی شده' },
  { value: 'voided', label: 'باطل شده' },
];

const guideItems = [
  { icon: Hash, title: 'شماره خروج', desc: 'شناسه اختصاصی حواله خروج کالا در انبارداری.' },
  { icon: Building2, title: 'انبار مبدأ', desc: 'موجودی کالاها از این انبار کسر خواهد شد.' },
  { icon: Calendar, title: 'تاریخ خروج', desc: 'تاریخ تحویل فیزیکی یا ثبت رسمی خروج کالا.' },
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

export default function EditWarehouseExitPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [number, setNumber] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [exitType, setExitType] = useState('sale');
  const [recipientUnit, setRecipientUnit] = useState('');
  const [contactName, setContactName] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [items, setItems] = useState<ItemRow[]>([]);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [whData, prodData, staffData, exitList, exitItems] = await Promise.all([
        fetchData<Warehouse>('warehouses', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: {} }),
        fetchData<WarehouseExit>('warehouse_exits', { where: { id } }),
        fetchData<WarehouseExitItem>('warehouse_exit_items', { where: { exitId: id }, orderBy: { rowNumber: 'asc' } }),
      ]);
      setWarehouses(whData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);

      if (exitList && exitList.length > 0) {
        const e = exitList[0];
        setNumber(e.number || '');
        setExitDate(e.exitDate ? new Date(e.exitDate).toISOString().slice(0, 10) : '');
        setWarehouseId(e.warehouseId || '');
        setExitType(e.exitType || 'sale');
        setRecipientUnit(e.recipientUnit || '');
        setContactName(e.contactName || '');
        setResponsibleId(e.responsibleId || '');
        setDescription(e.description || '');
        setStatus(e.status || 'draft');

        if (exitItems && exitItems.length > 0) {
          setItems(
            exitItems.map((item) => ({
              id: item.id,
              productId: item.productId || '',
              productName: item.productName || '',
              qty: String(item.qty || 1),
              unit: item.unit || '',
              unitPrice: String(item.unitPrice || 0),
              location: item.location || '',
              batchNo: item.batchNo || '',
              serialNo: item.serialNo || '',
              notes: item.notes || '',
            }))
          );
        } else {
          setItems([{ productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', location: '', batchNo: '', serialNo: '', notes: '' }]);
        }
      } else {
        toast.error('حواله خروج یافت نشد');
        router.push('/dashboard/warehouse-exits');
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
    setItems([...items, { productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', location: '', batchNo: '', serialNo: '', notes: '' }]);
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
    if (!warehouseId) e.warehouseId = 'انتخاب انبار مبدأ الزامی است';
    if (!exitDate) e.exitDate = 'تاریخ خروج الزامی است';
    if (items.length === 0 || items.every((i) => !i.productId && !i.productName)) {
      e.items = 'حداقل یک ردیف کالا لازم است';
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
        'warehouse_exits',
        { id },
        {
          warehouseId,
          exitType,
          exitDate: new Date(exitDate).toISOString(),
          recipientUnit: recipientUnit || null,
          contactName: contactName || null,
          responsibleId: responsibleId || null,
          description: description || null,
          totalValue,
          status,
        }
      );

      // Clean existing items and re-insert
      try {
        await deleteData('warehouse_exit_items', { exitId: id });
      } catch {}

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        await createData('warehouse_exit_items', {
          exitId: id,
          rowNumber: i + 1,
          productId: item.productId || null,
          productName: item.productName || null,
          qty: parseNumber(item.qty),
          unit: item.unit || null,
          baseUnit: item.unit || null,
          conversionFactor: 1,
          baseQty: parseNumber(item.qty),
          unitPrice: parseNumber(item.unitPrice),
          totalValue: calcRow(item),
          location: item.location || null,
          batchNo: item.batchNo || null,
          serialNo: item.serialNo || null,
          notes: item.notes || null,
        });
      }

      toast.success('حواله خروج با موفقیت ذخیره شد');
      router.push('/dashboard/warehouse-exits');
    } catch (error: any) {
      toast.error('خطا در ذخیره حواله خروج: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('آیا از حذف این حواله خروج اطمینان دارید؟')) return;
    try {
      await deleteData('warehouse_exit_items', { exitId: id });
      await deleteData('warehouse_exits', { id });
      toast.success('حواله خروج حذف شد');
      router.push('/dashboard/warehouse-exits');
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
          <Link href="/dashboard/warehouse-exits" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="nb-editor-breadcrumb">
            <span className="nb-editor-breadcrumb-muted">داشبورد</span>
            <span className="nb-editor-breadcrumb-separator">/</span>
            <Link href="/dashboard/warehouse-exits" className="nb-editor-breadcrumb-muted hover:text-slate-900 dark:hover:text-slate-100">
              خروج از انبار
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
          <Link href="/dashboard/warehouse-exits" className="nb-editor-discard">
            انصراف
          </Link>
          <button
            type="submit"
            form="edit-exit-form"
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
          <form id="edit-exit-form" onSubmit={handleSave} className="lg:col-span-2 space-y-6">
            <div className="nb-editor-canvas">
              <div className="nb-editor-canvas-header">
                <span className="nb-editor-canvas-icon" style={{ background: 'linear-gradient(135deg, #FF7A00 0%, #E65100 100%)' }}>
                  <ArrowUpFromLine className="h-4 w-4 text-white" />
                </span>
                <div>
                  <h2>ویرایش حواله خروج از انبار</h2>
                  <p>اطلاعات تحویل و اقلام خارج‌شده را ویرایش کنید</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره حواله</Label>
                  <input
                    value={number}
                    readOnly
                    dir="ltr"
                    className="nb-input bg-slate-50 dark:bg-slate-900 text-slate-500 font-mono"
                    style={inputStyle}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت حواله</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    {WE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">
                    انبار مبدأ <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={warehouseId}
                    onChange={(e) => {
                      setWarehouseId(e.target.value);
                      if (errors.warehouseId) setErrors({ ...errors, warehouseId: '' });
                    }}
                    className={`nb-input ${errors.warehouseId ? 'border-rose-400' : ''}`}
                    style={inputStyle}
                  >
                    <option value="">انتخاب انبار...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.warehouseId && <p className="text-xs text-rose-500">{errors.warehouseId}</p>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع خروج</Label>
                  <select
                    value={exitType}
                    onChange={(e) => setExitType(e.target.value)}
                    className="nb-input"
                    style={inputStyle}
                  >
                    {EXIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">
                    تاریخ خروج <span className="text-rose-500">*</span>
                  </Label>
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => {
                      setExitDate(e.target.value);
                      if (errors.exitDate) setErrors({ ...errors, exitDate: '' });
                    }}
                    className={`nb-input ${errors.exitDate ? 'border-rose-400' : ''}`}
                    style={inputStyle}
                  />
                  {errors.exitDate && <p className="text-xs text-rose-500">{errors.exitDate}</p>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تحویل‌گیرنده / طرف حساب</Label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="مشتری یا طرف حساب..."
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">واحد متقاضی / پروژه</Label>
                  <input
                    value={recipientUnit}
                    onChange={(e) => setRecipientUnit(e.target.value)}
                    placeholder="واحد اداری، کارگاه، پروژه..."
                    className="nb-input"
                    style={inputStyle}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مسئول خروج</Label>
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
                <Label className="nb-editor-label">توضیحات</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیحات تکمیلی یا علت خروج..."
                  rows={2}
                  className="rounded-lg border border-slate-200 bg-transparent text-sm focus:border-amber-400 focus:outline-none dark:border-slate-700"
                />
              </div>
            </div>

            {/* Items Canvas */}
            <div className="nb-editor-canvas">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">اقلام خروجی</h3>
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
                          placeholder="عدد، بسته..."
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
                <span className="text-xs font-medium text-slate-500">مجموع ارزش حواله:</span>
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
                <h2 className="font-bold text-slate-900 dark:text-slate-100">کسر موجودی</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                در وضعیت‌های «تکمیل شده»، «تأیید شده» و «اعمال شده»، کسر موجودی فیزیکی از انبار به طور رسمی لحاظ می‌گردد.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
