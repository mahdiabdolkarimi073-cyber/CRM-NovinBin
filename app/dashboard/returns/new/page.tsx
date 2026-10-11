'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Undo2, Loader2, Plus, X, Check,
  Lightbulb, Info,
} from 'lucide-react';
import { fullName } from '@/lib/constants';
import { formatToman, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

interface LineItem {
  rowNumber: number;
  productId: string | null;
  productCode: string | null;
  productName: string;
  unit: string | null;
  qty: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  taxPct: number;
  taxAmount: number;
  dutyPct: number;
  dutyAmount: number;
  serial: string | null;
  finalPrice: number;
  description: string | null;
}

const PRICE_LISTS = [
  { key: 'standard', label: 'قیمت استاندارد' },
  { key: 'special', label: 'قیمت ویژه' },
  { key: 'export', label: 'قیمت صادراتی' },
];

const emptyItem = (rowNumber: number): LineItem => ({
  rowNumber, productId: null, productCode: null, productName: '', unit: null,
  qty: 1, unitPrice: 0, discountPct: 0, discountAmount: 0, taxPct: 0, taxAmount: 0,
  dutyPct: 0, dutyAmount: 0, serial: null, finalPrice: 0, description: null,
});

function recalcItem(item: LineItem): LineItem {
  const gross = item.qty * item.unitPrice;
  const discountAmount = Math.round((gross * item.discountPct) / 100);
  const afterDiscount = gross - discountAmount;
  const taxAmount = Math.round((afterDiscount * item.taxPct) / 100);
  const dutyAmount = Math.round((afterDiscount * item.dutyPct) / 100);
  const finalPrice = afterDiscount + taxAmount + dutyAmount;
  return { ...item, discountAmount, taxAmount, dutyAmount, finalPrice };
}

const inputStyle: React.CSSProperties = {
  height: 44, borderRadius: 10, border: '1px solid #E2E8F0',
  padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none',
};

export default function NewReturnPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeSearchRow, setActiveSearchRow] = useState<number | null>(null);

  const [form, setForm] = useState({
    type: 'sales' as 'sales' | 'purchase',
    priceList: 'standard',
    seller: '',
    issueDate: toLocalDateString(new Date()),
    returnReason: '',
    isRequestable: 'no',
    accountHolder: '',
    accountInfo: '',
    customerId: '',
    supplierName: '',
    notes: '',
  });
  const [items, setItems] = useState<LineItem[]>([emptyItem(1)]);

  const loadData = useCallback(async () => {
    try {
      const [cust, prods] = await Promise.all([
        fetchData('customers', { where: {} }),
        fetchData('products', { where: {} }),
      ]);
      setCustomers(cust || []);
      setProducts(prods || []);
    } catch {
      setCustomers([]);
      setProducts([]);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!productSearch || productSearch.length < 2) { setSearchResults([]); return; }
    const q = productSearch.toLowerCase();
    setSearchResults(products.filter((p) => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)).slice(0, 8));
  }, [productSearch, products]);

  const addItem = () => setItems((prev) => [...prev, emptyItem(prev.length + 1)]);
  const removeItem = (rowNumber: number) => setItems((prev) => prev.filter((i) => i.rowNumber !== rowNumber).map((i, idx) => ({ ...i, rowNumber: idx + 1 })));
  const updateItem = (rowNumber: number, patch: Partial<LineItem>) => setItems((prev) => prev.map((i) => (i.rowNumber === rowNumber ? recalcItem({ ...i, ...patch }) : i)));

  const selectProduct = (rowNumber: number, product: any) => {
    updateItem(rowNumber, { productId: product.id, productCode: product.sku, productName: product.name, unit: product.unit, unitPrice: Number(product.price) });
    setProductSearch(''); setSearchResults([]); setActiveSearchRow(null);
  };

  const totals = items.reduce((acc, i) => ({
    total_discount: acc.total_discount + i.discountAmount,
    total_tax: acc.total_tax + i.taxAmount,
    total_duty: acc.total_duty + i.dutyAmount,
    final_amount: acc.final_amount + i.finalPrice,
  }), { total_discount: 0, total_tax: 0, total_duty: 0, final_amount: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (form.type === 'sales' && !form.customerId) { toast.error('انتخاب مشتری الزامی است'); return; }
    if (form.type === 'purchase' && !form.supplierName) { toast.error('نام تأمین‌کننده الزامی است'); return; }
    if (!items.some((i) => i.productName && i.qty > 0)) { toast.error('حداقل یک ردیف کالایی معتبر وارد کنید'); return; }
    setSubmitting(true);
    const number = 'RET-' + form.type.slice(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-6);
    try {
      const ret = await createData<{ id: string }>('sales_returns', {
        number, type: form.type,
        customerId: form.type === 'sales' ? form.customerId || null : null,
        supplierName: form.type === 'purchase' ? form.supplierName || null : null,
        priceList: form.priceList, seller: form.seller || null,
        issueDate: form.issueDate,
        returnReason: form.returnReason || null,
        isRequestable: form.isRequestable === 'yes',
        accountHolder: form.accountHolder || null,
        accountInfo: form.accountInfo || null,
        totalDiscount: totals.total_discount, totalTax: totals.total_tax, totalDuty: totals.total_duty,
        finalAmount: totals.final_amount, notes: form.notes || null, status: 'draft', createdBy: profile.id,
      });
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.productName) continue;
        await createData('sales_return_items', {
          salesReturnId: ret.id, rowNumber: i + 1,
          productId: it.productId, productCode: it.productCode, productName: it.productName,
          unit: it.unit, qty: it.qty, unitPrice: it.unitPrice,
          discountPct: it.discountPct, discountAmount: it.discountAmount,
          taxPct: it.taxPct, taxAmount: it.taxAmount,
          dutyPct: it.dutyPct, dutyAmount: it.dutyAmount,
          serial: it.serial, finalPrice: it.finalPrice, description: it.description,
        });
      }
      toast.success('مرجوعی ثبت شد');
      router.push('/dashboard/returns');
    } catch (err: any) { toast.error('ایجاد ناموفق: ' + err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/returns" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به مرجوعی‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> مرجوعی <b>←</b> ایجاد مرجوعی</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/returns')} disabled={submitting}>انصراف</button>
          <button type="submit" form="return-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت مرجوعی'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="return-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20"><Undo2 className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات مرجوعی</h2>
                  <p className="text-sm text-slate-400">جزئیات مرجوعی جدید را وارد کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نوع مرجوعی <span className="text-red-500">*</span></Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as 'sales' | 'purchase' })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">مرجوعی فروش</SelectItem>
                      <SelectItem value="purchase">مرجوعی خرید</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">لیست قیمت</Label>
                  <Select value={form.priceList} onValueChange={(v) => setForm({ ...form, priceList: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_LISTS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">فروشنده</Label>
                  <Input value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} placeholder="نام فروشنده..." style={inputStyle} />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ صدور</Label>
                  <JalaliDatePicker value={form.issueDate ? new Date(form.issueDate) : null} onChange={(d) => setForm({ ...form, issueDate: d ? toLocalDateString(d) : '' })} className="h-11" />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">قابل درخواست</Label>
                  <Select value={form.isRequestable} onValueChange={(v) => setForm({ ...form, isRequestable: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">خیر</SelectItem>
                      <SelectItem value="yes">بله</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.type === 'sales' ? (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مشتری <span className="text-red-500">*</span></Label>
                  <Select value={form.customerId || 'none'} onValueChange={(v) => setForm({ ...form, customerId: v === 'none' ? '' : v })}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="انتخاب مشتری..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مشتری</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام تأمین‌کننده <span className="text-red-500">*</span></Label>
                  <Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="نام تأمین‌کننده..." style={inputStyle} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">علت مرجوعی</Label>
                  <Input value={form.returnReason} onChange={(e) => setForm({ ...form, returnReason: e.target.value })} placeholder="علت مرجوعی..." style={inputStyle} />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">صاحب حساب</Label>
                  <Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} placeholder="صاحب حساب..." style={inputStyle} />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">اطلاعات حساب</Label>
                  <Input value={form.accountInfo} onChange={(e) => setForm({ ...form, accountInfo: e.target.value })} placeholder="اطلاعات حساب..." style={inputStyle} />
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs dark:bg-slate-800">
                    <tr>
                      <th className="text-right p-2 font-medium">ردیف</th>
                      <th className="text-right p-2 font-medium min-w-[200px]">کالا</th>
                      <th className="text-right p-2 font-medium">کد</th>
                      <th className="text-right p-2 font-medium">واحد</th>
                      <th className="text-right p-2 font-medium">تعداد</th>
                      <th className="text-right p-2 font-medium">قیمت واحد</th>
                      <th className="text-right p-2 font-medium">تخفیف ٪</th>
                      <th className="text-right p-2 font-medium">مالیات ٪</th>
                      <th className="text-right p-2 font-medium">عوارض ٪</th>
                      <th className="text-right p-2 font-medium">سریال</th>
                      <th className="text-right p-2 font-medium">مبلغ نهایی</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {items.map((item) => (
                      <tr key={item.rowNumber} className="relative">
                        <td className="p-2 text-slate-400">{item.rowNumber}</td>
                        <td className="p-2 relative">
                          <Input value={item.productName} onChange={(e) => { updateItem(item.rowNumber, { productName: e.target.value, productId: null }); setProductSearch(e.target.value); setActiveSearchRow(item.rowNumber); }} onFocus={() => setActiveSearchRow(item.rowNumber)} placeholder="جستجوی کالا..." className="h-8" />
                          {activeSearchRow === item.rowNumber && searchResults.length > 0 && (
                            <div className="absolute z-50 mt-1 w-64 bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto dark:bg-slate-800">
                              {searchResults.map((p) => (
                                <button type="button" key={p.id} onClick={() => selectProduct(item.rowNumber, p)} className="w-full text-right px-3 py-2 hover:bg-slate-50 text-xs border-b last:border-0 dark:hover:bg-slate-700">
                                  <div className="font-medium text-slate-800 dark:text-slate-200">{p.name}</div>
                                  <div className="text-slate-400">{p.sku} • {formatToman(Number(p.price))} ت</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2"><Input dir="ltr" value={item.productCode || ''} onChange={(e) => updateItem(item.rowNumber, { productCode: e.target.value })} className="h-8 w-20" /></td>
                        <td className="p-2"><Input value={item.unit || ''} onChange={(e) => updateItem(item.rowNumber, { unit: e.target.value })} className="h-8 w-16" /></td>
                        <td className="p-2"><Input dir="ltr" type="number" min="0" step="any" value={item.qty} onChange={(e) => updateItem(item.rowNumber, { qty: Number(e.target.value) || 0 })} className="h-8 w-16" /></td>
                        <td className="p-2"><Input dir="ltr" type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(item.rowNumber, { unitPrice: Number(e.target.value) || 0 })} className="h-8 w-24" /></td>
                        <td className="p-2"><Input dir="ltr" type="number" min="0" max="100" step="any" value={item.discountPct} onChange={(e) => updateItem(item.rowNumber, { discountPct: Number(e.target.value) || 0 })} className="h-8 w-14" /></td>
                        <td className="p-2"><Input dir="ltr" type="number" min="0" max="100" step="any" value={item.taxPct} onChange={(e) => updateItem(item.rowNumber, { taxPct: Number(e.target.value) || 0 })} className="h-8 w-14" /></td>
                        <td className="p-2"><Input dir="ltr" type="number" min="0" max="100" step="any" value={item.dutyPct} onChange={(e) => updateItem(item.rowNumber, { dutyPct: Number(e.target.value) || 0 })} className="h-8 w-14" /></td>
                        <td className="p-2"><Input dir="ltr" value={item.serial || ''} onChange={(e) => updateItem(item.rowNumber, { serial: e.target.value })} className="h-8 w-24" /></td>
                        <td className="p-2 font-bold whitespace-nowrap">{formatToman(item.finalPrice)}</td>
                        <td className="p-2 text-center"><Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeItem(item.rowNumber)}><X className="w-4 h-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-2 border-t dark:border-slate-700">
                  <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4" /> افزودن ردیف</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>توضیحات</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm dark:bg-slate-800">
                  <div className="flex justify-between"><span className="text-slate-500">جمع تخفیف:</span><span className="font-medium">{formatToman(totals.total_discount)} ت</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">جمع مالیات:</span><span className="font-medium">{formatToman(totals.total_tax)} ت</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">جمع عوارض:</span><span className="font-medium">{formatToman(totals.total_duty)} ت</span></div>
                  <div className="flex justify-between border-t pt-2 text-base"><span className="font-bold">مبلغ نهایی:</span><span className="font-bold text-rose-600">{formatToman(totals.final_amount)} ت</span></div>
                </div>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20"><Lightbulb className="h-5 w-5" /></span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنما و نکات</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">علت مرجوعی را به‌صورت دقیق ثبت کنید. اطلاعات حساب برای بازگشت وجه در صورت نیاز استفاده می‌شود.</p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30"><Info className="h-5 w-5" /></span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">پس از ثبت مرجوعی می‌توانید وضعیت آن را در لیست تغییر دهید.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
