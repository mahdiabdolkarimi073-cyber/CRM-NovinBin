'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { PageHeader } from '@/components/dashboard/page-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Plus, Search, X, Loader2 } from 'lucide-react';
import { formatToman, formatJalali, toLocalDateString } from '@/lib/format';
import { fullName } from '@/lib/constants';
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
  finalPrice: number;
  description: string | null;
}

const PRICE_LISTS = [
  { key: 'standard', label: 'قیمت استاندارد' },
  { key: 'special', label: 'قیمت ویژه' },
  { key: 'export', label: 'قیمت صادراتی' },
];

const PRICE_LIST_LABEL: Record<string, string> = {
  standard: 'استاندارد',
  special: 'ویژه',
  export: 'صادراتی',
};

const TYPE_LABEL: Record<string, string> = { sales: 'فروش', purchase: 'خرید' };

const emptyItem = (rowNumber: number): LineItem => ({
  rowNumber,
  productId: null,
  productCode: null,
  productName: '',
  unit: null,
  qty: 1,
  unitPrice: 0,
  discountPct: 0,
  discountAmount: 0,
  taxPct: 0,
  taxAmount: 0,
  dutyPct: 0,
  dutyAmount: 0,
  finalPrice: 0,
  description: null,
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

export default function PreInvoicesPage() {
  const { profile } = useAuth();
  const [preInvoices, setPreInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'purchase'>('sales');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // form state
  const [form, setForm] = useState({
    price_list: 'standard',
    seller: '',
    issue_date: toLocalDateString(new Date()),
    expiry_date: '',
    customer_id: '',
    supplier_name: '',
    shipping: '0',
    notes: '',
  });
  const [items, setItems] = useState<LineItem[]>([emptyItem(1)]);

  // product search
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeSearchRow, setActiveSearchRow] = useState<number | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const where = isSuperAdmin ? {} : {};
    const [pis, cust, prods] = await Promise.all([
      fetchData('pre_invoices', { where, orderBy: { createdAt: 'desc' }, include: { items: true } }),
      fetchData('customers', { where }),
      fetchData('products', { where }),
    ]);
    setPreInvoices(pis || []);
    setCustomers(cust || []);
    setAllProducts(prods || []);
    setLoading(false);
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // product live search (client-side filter)
  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(() => {
      const q = productSearch.toLowerCase();
      const results = allProducts
        .filter((p) => (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
        .slice(0, 8);
      if (active) {
        setSearchResults(results);
        setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [productSearch, allProducts]);

  const filtered = preInvoices.filter((p) => p.type === activeTab);

  const addItem = () => setItems((prev) => [...prev, emptyItem(prev.length + 1)]);
  const removeItem = (rowNumber: number) =>
    setItems((prev) =>
      prev.filter((i) => i.rowNumber !== rowNumber).map((i, idx) => ({ ...i, rowNumber: idx + 1 }))
    );

  const updateItem = (rowNumber: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.rowNumber === rowNumber ? recalcItem({ ...i, ...patch }) : i))
    );
  };

  const selectProduct = (rowNumber: number, product: any) => {
    updateItem(rowNumber, {
      productId: product.id,
      productCode: product.sku,
      productName: product.name,
      unit: product.unit,
      unitPrice: Number(product.price),
    });
    setProductSearch('');
    setSearchResults([]);
    setActiveSearchRow(null);
  };

  const totals = items.reduce(
    (acc, i) => ({
      total_discount: acc.total_discount + i.discountAmount,
      total_tax: acc.total_tax + i.taxAmount,
      total_duty: acc.total_duty + i.dutyAmount,
      final_amount: acc.final_amount + i.finalPrice,
    }),
    { total_discount: 0, total_tax: 0, total_duty: 0, final_amount: 0 }
  );
  const shipping = Number(form.shipping.replace(/[^0-9]/g, '')) || 0;
  const finalAmount = totals.final_amount + shipping;

  const resetForm = () => {
    setForm({
      price_list: 'standard',
      seller: '',
      issue_date: toLocalDateString(new Date()),
      expiry_date: '',
      customer_id: '',
      supplier_name: '',
      shipping: '0',
      notes: '',
    });
    setItems([emptyItem(1)]);
    setProductSearch('');
    setSearchResults([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (activeTab === 'sales' && !form.customer_id) {
      toast.error('انتخاب مشتری الزامی است');
      return;
    }
    if (activeTab === 'purchase' && !form.supplier_name) {
      toast.error('نام تأمین‌کننده الزامی است');
      return;
    }
    if (items.length === 0 || !items.some((i) => i.productName && i.qty > 0)) {
      toast.error('حداقل یک ردیف کالایی معتبر وارد کنید');
      return;
    }
    setCreating(true);
    const number = 'PRE-' + activeTab.slice(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-6);
    const payload = {
      number,
      type: activeTab,
      customerId: activeTab === 'sales' ? form.customer_id || null : null,
      supplierName: activeTab === 'purchase' ? form.supplier_name || null : null,
      priceList: form.price_list,
      seller: form.seller || null,
      issueDate: form.issue_date,
      expiryDate: form.expiry_date || null,
      totalDiscount: totals.total_discount,
      totalTax: totals.total_tax,
      totalDuty: totals.total_duty,
      shipping,
      finalAmount,
      notes: form.notes || null,
      status: 'draft',
      createdBy: profile.id,
      items: {
        create: items
          .filter((i) => i.productName)
          .map((i, idx) => ({
            rowNumber: idx + 1,
            productId: i.productId,
            productCode: i.productCode,
            productName: i.productName,
            unit: i.unit,
            qty: i.qty,
            unitPrice: i.unitPrice,
            discountPct: i.discountPct,
            discountAmount: i.discountAmount,
            taxPct: i.taxPct,
            taxAmount: i.taxAmount,
            dutyPct: i.dutyPct,
            dutyAmount: i.dutyAmount,
            finalPrice: i.finalPrice,
            description: i.description,
          })),
      },
    };
    try {
      await createData('pre_invoices', payload);
      toast.success('پیش فاکتور صادر شد');
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (e: any) {
      toast.error('ایجاد ناموفق: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const getCustomerName = (id: string | null) => {
    if (!id) return '—';
    const c = customers.find((c) => c.id === id);
    return c ? (c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)) : '—';
  };

  const filteredBySearch = search
    ? filtered.filter((pi) => {
        const q = search.toLowerCase();
        return (pi.number || '').toLowerCase().includes(q) || (pi.supplierName || '').toLowerCase().includes(q);
      })
    : filtered;

  return (
    <div>
      <PageHeader
        title="پیش فاکتور"
        description="مدیریت پیش فاکتورهای فروش و خرید"
        action={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" /> پیش فاکتور جدید</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {activeTab === 'sales' ? 'پیش فاکتور فروش جدید' : 'پیش فاکتور خرید جدید'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {/* header fields */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label>لیست قیمت</Label>
                    <Select value={form.price_list} onValueChange={(v) => setForm({ ...form, price_list: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRICE_LISTS.map((p) => (
                          <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>فروشنده</Label>
                    <Input value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ صدور</Label>
                    <JalaliDatePicker value={form.issue_date ? new Date(form.issue_date) : null} onChange={(d) => setForm({ ...form, issue_date: d ? toLocalDateString(d) : '' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ انقضا</Label>
                    <JalaliDatePicker value={form.expiry_date ? new Date(form.expiry_date) : null} onChange={(d) => setForm({ ...form, expiry_date: d ? toLocalDateString(d) : '' })} />
                  </div>
                </div>

                {activeTab === 'sales' ? (
                  <div className="space-y-2">
                    <Label>مشتری *</Label>
                    <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="انتخاب مشتری..." /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.type === 'company' ? c.companyName : fullName(c.firstName, c.lastName)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>نام تأمین‌کننده *</Label>
                    <Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="نام تأمین‌کننده..." />
                  </div>
                )}

                {/* line items */}
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs">
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
                        <th className="text-right p-2 font-medium">مبلغ نهایی</th>
                        <th className="text-center p-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.rowNumber} className="relative">
                          <td className="p-2 text-slate-400">{item.rowNumber}</td>
                          <td className="p-2 relative">
                            <Input
                              value={item.productName}
                              onChange={(e) => {
                                updateItem(item.rowNumber, { productName: e.target.value, productId: null });
                                setProductSearch(e.target.value);
                                setActiveSearchRow(item.rowNumber);
                              }}
                              onFocus={() => setActiveSearchRow(item.rowNumber)}
                              placeholder="جستجوی کالا..."
                              className="h-8"
                            />
                            {activeSearchRow === item.rowNumber && searchResults.length > 0 && (
                              <div className="absolute z-50 mt-1 w-64 bg-white border rounded-md shadow-lg max-h-56 overflow-y-auto">
                                {searchResults.map((p) => (
                                  <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => selectProduct(item.rowNumber, p)}
                                    className="w-full text-right px-3 py-2 hover:bg-slate-50 text-xs border-b last:border-0"
                                  >
                                    <div className="font-medium text-slate-800">{p.name}</div>
                                    <div className="text-slate-400">{p.sku} • {formatToman(Number(p.price))} ت</div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {activeSearchRow === item.rowNumber && searching && (
                              <div className="absolute z-50 mt-1 w-64 bg-white border rounded-md shadow-lg p-2 text-xs text-slate-400 flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> در حال جستجو...
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
                          <td className="p-2 font-bold whitespace-nowrap">{formatToman(item.finalPrice)}</td>
                          <td className="p-2 text-center">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeItem(item.rowNumber)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-2 border-t">
                    <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-4 h-4" /> افزودن ردیف</Button>
                  </div>
                </div>

                {/* totals + shipping */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>هزینه ارسال (تومان)</Label>
                    <Input dir="ltr" value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} />
                    <Label>توضیحات</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">جمع تخفیف:</span><span className="font-medium">{formatToman(totals.total_discount)} ت</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">جمع مالیات:</span><span className="font-medium">{formatToman(totals.total_tax)} ت</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">جمع عوارض:</span><span className="font-medium">{formatToman(totals.total_duty)} ت</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">هزینه ارسال:</span><span className="font-medium">{formatToman(shipping)} ت</span></div>
                    <div className="flex justify-between border-t pt-2 text-base"><span className="font-bold">مبلغ نهایی:</span><span className="font-bold text-sky-600">{formatToman(finalAmount)} ت</span></div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال صدور...' : 'صدور پیش فاکتور'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'purchase')}>
        <TabsList className="mb-4">
          <TabsTrigger value="sales">پیش فاکتور فروش</TabsTrigger>
          <TabsTrigger value="purchase">پیش فاکتور خرید</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="جستجو بر اساس شماره / تأمین‌کننده..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 max-w-md" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredBySearch.length === 0 ? (
            <Card>
              <EmptyState
                icon={<FileText className="w-8 h-8" />}
                title="پیش فاکتوری یافت نشد"
                description="اولین پیش فاکتور را صادر کنید"
                action={<Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> پیش فاکتور جدید</Button>}
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                        <th className="text-right p-3 font-medium">شماره</th>
                        <th className="text-right p-3 font-medium">نوع</th>
                        <th className="text-right p-3 font-medium">{activeTab === 'sales' ? 'مشتری' : 'تأمین‌کننده'}</th>
                        <th className="text-right p-3 font-medium">لیست قیمت</th>
                        <th className="text-right p-3 font-medium">تاریخ صدور</th>
                        <th className="text-right p-3 font-medium">مبلغ نهایی</th>
                        <th className="text-right p-3 font-medium">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBySearch.map((pi) => (
                        <tr key={pi.id} className="hover:bg-slate-50 transition-smooth">
                          <td className="p-3 font-medium text-slate-800">{pi.number}</td>
                          <td className="p-3"><Badge variant="secondary">{TYPE_LABEL[pi.type]}</Badge></td>
                          <td className="p-3 text-slate-600">{activeTab === 'sales' ? getCustomerName(pi.customerId) : pi.supplierName || '—'}</td>
                          <td className="p-3 text-slate-500">{PRICE_LIST_LABEL[pi.priceList] || pi.priceList}</td>
                          <td className="p-3 text-slate-500">{formatJalali(pi.issueDate)}</td>
                          <td className="p-3 font-bold">{formatToman(Number(pi.finalAmount))} ت</td>
                          <td className="p-3"><Badge variant="outline">{pi.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
