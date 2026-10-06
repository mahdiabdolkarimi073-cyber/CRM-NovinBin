'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
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
import { Undo2, Plus, Search, X, Loader2 } from 'lucide-react';
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
  serial: string | null;
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
  serial: null,
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

export default function ReturnsPage() {
  const { profile } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'purchase'>('sales');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    price_list: 'standard',
    seller: '',
    issue_date: toLocalDateString(new Date()),
    return_reason: '',
    is_requestable: 'no',
    account_holder: '',
    account_info: '',
    customer_id: '',
    supplier_name: '',
    notes: '',
  });
  const [items, setItems] = useState<LineItem[]>([emptyItem(1)]);

  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeSearchRow, setActiveSearchRow] = useState<number | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const where = {};
    const [rets, cust, prods] = await Promise.all([
      fetchData('sales_returns', { where, orderBy: { createdAt: 'desc' }, include: { items: true } }),
      fetchData('customers', { where }),
      fetchData('products', { where }),
    ]);
    setReturns(rets || []);
    setCustomers(cust || []);
    setAllProducts(prods || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const filtered = returns.filter((r) => r.type === activeTab);

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

  const resetForm = () => {
    setForm({
      price_list: 'standard',
      seller: '',
      issue_date: toLocalDateString(new Date()),
      return_reason: '',
      is_requestable: 'no',
      account_holder: '',
      account_info: '',
      customer_id: '',
      supplier_name: '',
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
    if (!items.some((i) => i.productName && i.qty > 0)) {
      toast.error('حداقل یک ردیف کالایی معتبر وارد کنید');
      return;
    }
    setCreating(true);
    const number = 'RET-' + activeTab.slice(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-6);
    const payload = {
      number,
      type: activeTab,
      customerId: activeTab === 'sales' ? form.customer_id || null : null,
      supplierName: activeTab === 'purchase' ? form.supplier_name || null : null,
      priceList: form.price_list,
      seller: form.seller || null,
      issueDate: form.issue_date,
      returnReason: form.return_reason || null,
      isRequestable: form.is_requestable === 'yes',
      accountHolder: form.account_holder || null,
      accountInfo: form.account_info || null,
      totalDiscount: totals.total_discount,
      totalTax: totals.total_tax,
      totalDuty: totals.total_duty,
      finalAmount: totals.final_amount,
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
            serial: i.serial,
            finalPrice: i.finalPrice,
            description: i.description,
          })),
      },
    };
    try {
      await createData('sales_returns', payload);
      toast.success('مرجوعی ثبت شد');
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
    ? filtered.filter((r) => {
        const q = search.toLowerCase();
        return (r.number || '').toLowerCase().includes(q) || (r.supplierName || '').toLowerCase().includes(q);
      })
    : filtered;

  return (
    <div className="nb-page" dir="rtl">
      <header className="nb-hero">
        <div className="nb-hero-left">
          <div>
            <div className="nb-hero-title-row">
              <span className="nb-hero-marker" style={{ background: 'linear-gradient(180deg,#EF4444,#DC2626)', boxShadow: '0 0 12px rgba(239,68,68,.25)' }} />
              <h1>مرجوعی</h1>
            </div>
            <p>مدیریت مرجوعی فروش و خرید</p>
          </div>
        </div>
        <div className="nb-hero-right">
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <button className="nb-new-btn"><Plus className="h-[18px] w-[18px]" /> مرجوعی جدید</button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {activeTab === 'sales' ? 'مرجوعی فروش جدید' : 'مرجوعی خرید جدید'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
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
                    <Label>قابل درخواست</Label>
                    <Select value={form.is_requestable} onValueChange={(v) => setForm({ ...form, is_requestable: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">خیر</SelectItem>
                        <SelectItem value="yes">بله</SelectItem>
                      </SelectContent>
                    </Select>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label>علت مرجوعی</Label>
                    <Input value={form.return_reason} onChange={(e) => setForm({ ...form, return_reason: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>صاحب حساب</Label>
                    <Input value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>اطلاعات حساب</Label>
                    <Input value={form.account_info} onChange={(e) => setForm({ ...form, account_info: e.target.value })} />
                  </div>
                </div>

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
                        <th className="text-right p-2 font-medium">سریال</th>
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
                          <td className="p-2"><Input dir="ltr" value={item.serial || ''} onChange={(e) => updateItem(item.rowNumber, { serial: e.target.value })} className="h-8 w-24" /></td>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>توضیحات</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">جمع تخفیف:</span><span className="font-medium">{formatToman(totals.total_discount)} ت</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">جمع مالیات:</span><span className="font-medium">{formatToman(totals.total_tax)} ت</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">جمع عوارض:</span><span className="font-medium">{formatToman(totals.total_duty)} ت</span></div>
                    <div className="flex justify-between border-t pt-2 text-base"><span className="font-bold">مبلغ نهایی:</span><span className="font-bold text-rose-600">{formatToman(totals.final_amount)} ت</span></div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
                  <Button type="submit" disabled={creating}>{creating ? 'در حال ثبت...' : 'ثبت مرجوعی'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="nb-stats-grid-v2">
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(239,68,68,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}><Undo2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{returns.filter(r => r.type === 'sales').length.toLocaleString('fa-IR')}</strong><span>مرجوعی فروش</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(245,158,11,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}><Undo2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{returns.filter(r => r.type === 'purchase').length.toLocaleString('fa-IR')}</strong><span>مرجوعی خرید</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(37,99,235,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }}><Undo2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{returns.length.toLocaleString('fa-IR')}</strong><span>کل مرجوعی‌ها</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' }} />
        </div>
        <div className="nb-stat-card-v2" style={{ '--stat-glow': 'rgba(34,197,94,0.25)' } as React.CSSProperties}>
          <div className="nb-stat-v2-icon" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}><Undo2 className="h-[22px] w-[22px] text-white" /></div>
          <div className="nb-stat-v2-body"><strong>{filteredBySearch.length.toLocaleString('fa-IR')}</strong><span>مورد نمایش</span></div>
          <div className="nb-stat-v2-spark" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }} />
        </div>
      </section>

      <div className="nb-toolbar">
        <div className="nb-toolbar-left">
          <h2>مرجوعی {activeTab === 'sales' ? 'فروش' : 'خرید'}</h2>
          <span className="nb-count-badge">{filteredBySearch.length.toLocaleString('fa-IR')} مورد</span>
        </div>
        <div className="nb-toolbar-right">
          <div className="nb-search-box">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو بر اساس شماره / تأمین‌کننده..." />
            {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'purchase')}>
        <TabsList className="mb-4">
          <TabsTrigger value="sales">مرجوعی فروش</TabsTrigger>
          <TabsTrigger value="purchase">مرجوعی خرید</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="nb-empty">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
              <p>در حال بارگذاری مرجوعی‌ها...</p>
            </div>
          ) : filteredBySearch.length === 0 ? (
            <div className="nb-empty">
              <div className="sb-empty-icon"><Undo2 className="h-12 w-12 text-muted-foreground/30" /></div>
              <h3>مرجوعی یافت نشد</h3>
              <p>اولین مرجوعی را ثبت کنید</p>
              <button className="nb-empty-new-btn" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> مرجوعی جدید</button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                    <tr>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">شماره</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">نوع</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">{activeTab === 'sales' ? 'مشتری' : 'تأمین‌کننده'}</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">تاریخ</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">علت</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">مبلغ نهایی</th>
                      <th className="p-3 text-right font-medium text-slate-500 dark:text-slate-400">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredBySearch.map((r) => (
                      <tr key={r.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-3"><span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.number}</span></td>
                        <td className="p-3"><Badge variant="secondary">{TYPE_LABEL[r.type]}</Badge></td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-300">{activeTab === 'sales' ? getCustomerName(r.customerId) : r.supplierName || '—'}</td>
                        <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatJalali(r.issueDate)}</td>
                        <td className="p-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{r.returnReason || '—'}</td>
                        <td className="p-3"><span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToman(Number(r.finalAmount))} ت</span></td>
                        <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}