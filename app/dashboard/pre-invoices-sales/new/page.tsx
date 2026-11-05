'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, FileOutput, Loader2, Plus, Trash2,
  Lightbulb, Info, Calendar, Hash, Check,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { formatToman, toEnglishDigits, parseNumber, toLocalDateString } from '@/lib/format';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { toast } from 'sonner';
import type { Customer, Product, Profile } from '@/lib/types';

interface ItemRow {
  productId: string;
  productName: string;
  productCode: string;
  qty: string;
  unit: string;
  unitPrice: string;
  discountPct: string;
  taxPct: string;
}

const PRICE_LISTS = [
  { value: 'standard', label: 'استاندارد' },
  { value: 'wholesale', label: 'عمده' },
  { value: 'retail', label: 'خرده' },
];

const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره پیش‌فاکتور به‌صورت خودکار تولید می‌شود.' },
  { icon: Calendar, title: 'تاریخ انقضا', desc: 'تاریخ اعتبار پیش‌فاکتور را تعیین کنید.' },
  { icon: Lightbulb, title: 'لیست قیمت', desc: 'نوع لیست قیمت را انتخاب کنید.' },
];

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function NewPreInvoiceSalesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [number, setNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [priceList, setPriceList] = useState('standard');
  const [sellerId, setSellerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', productName: '', productCode: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', taxPct: '0' },
  ]);

  const loadData = useCallback(async () => {
    try {
      const [custData, prodData, staffData] = await Promise.all([
        fetchData<Customer>('customers', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setCustomers(custData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`PI-S-${Date.now().toString().slice(-8)}`);
    setIssueDate(new Date().toISOString().slice(0, 10));
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', productCode: '', qty: '1', unit: '', unitPrice: '0', discountPct: '0', taxPct: '0' }]);
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
          updated.productCode = p.sku || '';
          updated.unit = p.unit || '';
          updated.unitPrice = String(p.price || 0);
          updated.taxPct = String(p.taxRate || 0);
        }
      }
      return updated;
    }));
  };

  const calcRow = (item: ItemRow) => {
    const qty = parseNumber(item.qty);
    const unitPrice = parseNumber(item.unitPrice);
    const gross = qty * unitPrice;
    const discountPct = parseNumber(item.discountPct);
    const discountAmount = (gross * discountPct) / 100;
    const afterDiscount = gross - discountAmount;
    const taxPct = parseNumber(item.taxPct);
    const taxAmount = (afterDiscount * taxPct) / 100;
    const finalPrice = afterDiscount + taxAmount;
    return { gross, discountAmount, taxAmount, finalPrice };
  };

  const subtotal = items.reduce((sum, item) => sum + calcRow(item).gross, 0);
  const totalDiscount = items.reduce((sum, item) => sum + calcRow(item).discountAmount, 0);
  const totalTax = items.reduce((sum, item) => sum + calcRow(item).taxAmount, 0);
  const finalAmount = subtotal - totalDiscount + totalTax;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!issueDate) e.issueDate = 'تاریخ صدور الزامی است';
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
      const seller = staff.find((s) => s.id === sellerId);
      const invoice = await createData('pre_invoices', {
        number,
        type: 'sales',
        customerId: customerId || null,
        priceList,
        seller: seller ? `${seller.firstName || ''} ${seller.lastName || ''}`.trim() : null,
        issueDate: new Date(issueDate).toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        totalDiscount,
        totalTax,
        finalAmount,
        notes: notes || null,
        status: 'draft',
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        const r = calcRow(item);
        await createData('pre_invoice_items', {
          preInvoiceId: invoice.id,
          rowNumber: i + 1,
          productId: item.productId || null,
          productCode: item.productCode || null,
          productName: item.productName || null,
          unit: item.unit || null,
          qty: parseNumber(item.qty),
          unitPrice: parseNumber(item.unitPrice),
          discountPct: parseNumber(item.discountPct),
          discountAmount: r.discountAmount,
          taxPct: parseNumber(item.taxPct),
          taxAmount: r.taxAmount,
          finalPrice: r.finalPrice,
        });
      }

      toast.success('پیش‌فاکتور فروش ثبت شد');
      router.push('/dashboard/pre-invoices-sales');
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
          <Link href="/dashboard/pre-invoices-sales" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به پیش‌فاکتورهای فروش
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> پیش فاکتور فروش <b>←</b> ثبت پیش‌فاکتور</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/pre-invoices-sales')} disabled={submitting}>
            انصراف
          </button>
          <button type="submit" form="pre-invoice-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت پیش‌فاکتور'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="pre-invoice-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/20">
                  <FileOutput className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات پیش‌فاکتور</h2>
                  <p className="text-sm text-slate-400">جزئیات پیش‌فاکتور فروش را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">شماره پیش‌فاکتور</Label>
                  <input
                    type="text"
                    value={number}
                    readOnly
                    className="nb-input"
                    style={{ ...inputStyle, background: '#F8FAFC' }}
                  />
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مشتری</Label>
                  <Select
                    value={customerId || 'none'}
                    onValueChange={(v) => setCustomerId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="انتخاب مشتری..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مشتری</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName || fullName(c.firstName, c.lastName)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">لیست قیمت</Label>
                  <Select value={priceList} onValueChange={setPriceList}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="انتخاب لیست قیمت..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_LISTS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">فروشنده</Label>
                  <Select
                    value={sellerId || 'none'}
                    onValueChange={(v) => setSellerId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="انتخاب شخص..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون فروشنده</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ صدور <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker
                    value={issueDate ? new Date(issueDate) : null}
                    onChange={(d) => setIssueDate(d ? toLocalDateString(d) : '')}
                    placeholder="انتخاب تاریخ صدور"
                    className="h-11"
                  />
                  {errors.issueDate && <span className="nb-editor-error">{errors.issueDate}</span>}
                </div>

                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ انقضا</Label>
                  <JalaliDatePicker
                    value={expiryDate ? new Date(expiryDate) : null}
                    onChange={(d) => setExpiryDate(d ? toLocalDateString(d) : '')}
                    placeholder="انتخاب تاریخ انقضا"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="nb-input"
                  style={{ minHeight: 100, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={5}
                />
              </div>

              {/* اقلام کالا */}
              <div className="nb-editor-field-group">
                <div className="mb-3 flex items-center justify-between">
                  <Label className="nb-editor-label" style={{ marginBottom: 0 }}>اقلام کالا</Label>
                  <button type="button" className="nb-editor-save-btn" style={{ height: 36, padding: '0 14px' }} onClick={addItem}>
                    <Plus className="h-4 w-4" />
                    افزودن قلم
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, i) => {
                    const r = calcRow(item);
                    return (
                      <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">قلم {toEnglishDigits(String(i + 1))}</span>
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600" title="حذف قلم">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <Select
                            value={item.productId || 'none'}
                            onValueChange={(v) => updateItem(i, 'productId', v === 'none' ? '' : v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="انتخاب محصول..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">انتخاب دستی</SelectItem>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <input
                            type="text"
                            placeholder="نام محصول"
                            value={item.productName}
                            onChange={(e) => updateItem(i, 'productName', e.target.value)}
                            className="nb-input"
                            style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }}
                          />
                          <input
                            type="text"
                            placeholder="کد محصول"
                            value={item.productCode}
                            onChange={(e) => updateItem(i, 'productCode', e.target.value)}
                            className="nb-input"
                            style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }}
                          />
                          <input
                            type="text"
                            placeholder="واحد"
                            value={item.unit}
                            onChange={(e) => updateItem(i, 'unit', e.target.value)}
                            className="nb-input"
                            style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }}
                          />
                          <input
                            type="number"
                            placeholder="تعداد"
                            value={item.qty}
                            onChange={(e) => updateItem(i, 'qty', e.target.value)}
                            className="nb-input"
                            style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }}
                          />
                          <input
                            type="number"
                            placeholder="قیمت واحد"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                            className="nb-input"
                            style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }}
                          />
                          <input
                            type="number"
                            placeholder="درصد تخفیف"
                            value={item.discountPct}
                            onChange={(e) => updateItem(i, 'discountPct', e.target.value)}
                            className="nb-input"
                            style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }}
                          />
                          <input
                            type="number"
                            placeholder="درصد مالیات"
                            value={item.taxPct}
                            onChange={(e) => updateItem(i, 'taxPct', e.target.value)}
                            className="nb-input"
                            style={{ height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' }}
                          />
                          <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            {formatToman(r.finalPrice)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {errors.items && <span className="nb-editor-error">{errors.items}</span>}

                <div className="mt-4 space-y-1.5 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
                  <div className="flex justify-between text-sm"><span className="text-blue-600 dark:text-blue-400">جمع کل:</span><span className="font-bold text-blue-700 dark:text-blue-300">{formatToman(subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-blue-600 dark:text-blue-400">تخفیف:</span><span className="font-bold text-blue-700 dark:text-blue-300">{formatToman(totalDiscount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-blue-600 dark:text-blue-400">مالیات:</span><span className="font-bold text-blue-700 dark:text-blue-300">{formatToman(totalTax)}</span></div>
                  <div className="flex justify-between border-t border-blue-200 pt-1.5 dark:border-blue-800"><span className="text-sm font-semibold text-blue-600 dark:text-blue-400">مبلغ نهایی:</span><span className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatToman(finalAmount)} تومان</span></div>
                </div>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنمای ثبت</h2>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">پیش‌فاکتور فروش قبل از صدور فاکتور نهایی به مشتری ارسال می‌شود. چرخه: ایجاد ← ارسال ← تأیید ← تبدیل به فاکتور.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
