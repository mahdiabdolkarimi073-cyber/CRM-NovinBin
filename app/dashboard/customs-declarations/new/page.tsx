'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, FileSearch, Loader2, Plus, Trash2,
  Lightbulb, Info, Building2, Calendar, Hash, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { ContactParty, Product, Profile } from '@/lib/types';

interface ItemRow {
  productId: string;
  productName: string;
  hsCode: string;
  originCountry: string;
  qty: string;
  unit: string;
  unitValue: string;
  totalValue: string;
  currency: string;
  conversionRate: string;
  rialValue: string;
}

interface CostRow {
  costType: string;
  amount: string;
  currency: string;
  conversionRate: string;
  rialAmount: string;
  contactName: string;
}

const OP_TYPES = [
  { value: 'import', label: 'واردات' },
  { value: 'export', label: 'صادرات' },
];

const COST_TYPES = [
  { value: 'duty', label: 'حقوق گمرکی' },
  { value: 'surcharge', label: 'عوارض' },
  { value: 'vat', label: 'مالیات بر ارزش افزوده' },
  { value: 'customs_fee', label: 'کارمزد گمرک' },
  { value: 'freight', label: 'حمل و نقل' },
  { value: 'insurance', label: 'بیمه' },
  { value: 'clearance', label: 'ترخیص' },
  { value: 'storage', label: 'انبارداری' },
  { value: 'other', label: 'سایر' },
];

const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره داخلی اظهارنامه به‌صورت خودکار تولید می‌شود.' },
  { icon: Building2, title: 'گمرک', desc: 'گمرک محل انجام عملیات را انتخاب کنید.' },
  { icon: Globe, title: 'مبدا/مقصد', desc: 'کشور مبدا و مقصد کالا را وارد کنید.' },
];

export default function NewCustomsDeclarationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [contacts, setContacts] = useState<ContactParty[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [internalNumber, setInternalNumber] = useState('');
  const [customsNumber, setCustomsNumber] = useState('');
  const [operationType, setOperationType] = useState('import');
  const [customsOffice, setCustomsOffice] = useState('');
  const [declarationDate, setDeclarationDate] = useState('');
  const [contactPartyId, setContactPartyId] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [currency, setCurrency] = useState('IRR');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [exchangeRateDate, setExchangeRateDate] = useState('');
  const [contractType, setContractType] = useState('purchase');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', productName: '', hsCode: '', originCountry: '', qty: '1', unit: '', unitValue: '0', totalValue: '0', currency: 'IRR', conversionRate: '1', rialValue: '0' },
  ]);
  const [costs, setCosts] = useState<CostRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [contactData, prodData, staffData] = await Promise.all([
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setContacts(contactData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setInternalNumber(`CD-${Date.now().toString().slice(-8)}`);
    setDeclarationDate(new Date().toISOString().slice(0, 10));
    setExchangeRateDate(new Date().toISOString().slice(0, 10));
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', hsCode: '', originCountry: '', qty: '1', unit: '', unitValue: '0', totalValue: '0', currency: 'IRR', conversionRate: '1', rialValue: '0' }]);
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
          updated.unit = p.unit || '';
          updated.unitValue = String(p.cost || p.price || 0);
        }
      }
      if (field === 'qty' || field === 'unitValue' || field === 'conversionRate') {
        const qty = parseNumber(updated.qty);
        const unitValue = parseNumber(updated.unitValue);
        const conv = parseNumber(updated.conversionRate);
        updated.totalValue = String(qty * unitValue);
        updated.rialValue = String(qty * unitValue * conv);
      }
      return updated;
    }));
  };

  const addCost = () => {
    setCosts([...costs, { costType: 'duty', amount: '0', currency: 'IRR', conversionRate: '1', rialAmount: '0', contactName: '' }]);
  };

  const removeCost = (index: number) => {
    setCosts(costs.filter((_, i) => i !== index));
  };

  const updateCost = (index: number, field: keyof CostRow, value: string) => {
    setCosts(costs.map((cost, i) => {
      if (i !== index) return cost;
      const updated = { ...cost, [field]: value };
      if (field === 'amount' || field === 'conversionRate') {
        const amount = parseNumber(updated.amount);
        const conv = parseNumber(updated.conversionRate);
        updated.rialAmount = String(amount * conv);
      }
      return updated;
    }));
  };

  const totalGoodsValue = items.reduce((sum, item) => sum + parseNumber(item.totalValue), 0);
  const totalRialValue = items.reduce((sum, item) => sum + parseNumber(item.rialValue), 0);
  const totalCosts = costs.reduce((sum, cost) => sum + parseNumber(cost.rialAmount), 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!declarationDate) e.declarationDate = 'تاریخ اظهار الزامی است';
    if (!operationType) e.operationType = 'نوع عملیات الزامی است';
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
      const contact = contacts.find((c) => c.id === contactPartyId);
      const contactName = contact ? [contact.firstName, contact.lastName, contact.companyName].filter(Boolean).join(' ') : null;

      const declaration = await createData('customs_declarations', {
        internalNumber,
        customsNumber: customsNumber || null,
        operationType,
        customsOffice: customsOffice || null,
        declarationDate: new Date(declarationDate).toISOString(),
        registeredDate: new Date().toISOString(),
        contactPartyId: contactPartyId || null,
        contactName,
        originCountry: originCountry || null,
        destinationCountry: destinationCountry || null,
        currency,
        exchangeRate: parseNumber(exchangeRate),
        exchangeRateDate: exchangeRateDate ? new Date(exchangeRateDate).toISOString() : null,
        contractType,
        status: 'draft',
        totalGoodsValue,
        totalRialValue,
        totalCosts,
        totalPaidAmount: 0,
        description: description || null,
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        await createData('customs_declaration_items', {
          declarationId: declaration.id,
          rowNumber: i + 1,
          productId: item.productId || null,
          productName: item.productName || null,
          hsCode: item.hsCode || null,
          originCountry: item.originCountry || null,
          qty: parseNumber(item.qty),
          unit: item.unit || null,
          unitValue: parseNumber(item.unitValue),
          totalValue: parseNumber(item.totalValue),
          currency: item.currency,
          conversionRate: parseNumber(item.conversionRate),
          rialValue: parseNumber(item.rialValue),
        });
      }

      for (let i = 0; i < costs.length; i++) {
        const cost = costs[i];
        if (parseNumber(cost.amount) === 0) continue;
        await createData('customs_declaration_costs', {
          declarationId: declaration.id,
          costType: cost.costType,
          amount: parseNumber(cost.amount),
          currency: cost.currency,
          conversionRate: parseNumber(cost.conversionRate),
          rialAmount: parseNumber(cost.rialAmount),
          contactName: cost.contactName || null,
        });
      }

      try {
        await createData('customs_declaration_history', {
          declarationId: declaration.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { internalNumber, operationType, customsOffice },
        });
      } catch {}

      toast.success('اظهارنامه گمرکی ثبت شد');
      router.push('/dashboard/customs-declarations');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-10 w-[5px] rounded-full bg-[#FF7A00]" />
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت اظهارنامه گمرکی جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> اظهارات گمرکی <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/customs-declarations">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><FileSearch className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات اظهارنامه</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات اظهارنامه گمرکی را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره داخلی</Label>
                    <Input value={internalNumber} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره گمرک</Label>
                    <Input value={customsNumber} onChange={(e) => setCustomsNumber(e.target.value)} placeholder="شماره اظهارنامه گمرک..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع عملیات <span className="text-rose-500">*</span></Label>
                    <select value={operationType} onChange={(e) => setOperationType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {OP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {errors.operationType && <span className="text-xs text-rose-500">{errors.operationType}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">گمرک</Label>
                    <Input value={customsOffice} onChange={(e) => setCustomsOffice(e.target.value)} placeholder="نام گمرک..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ اظهار <span className="text-rose-500">*</span></Label>
                    <Input type="date" value={declarationDate} onChange={(e) => setDeclarationDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.declarationDate && <span className="text-xs text-rose-500">{errors.declarationDate}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">طرف حساب</Label>
                    <select value={contactPartyId} onChange={(e) => setContactPartyId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب طرف حساب...</option>
                      {contacts.map((c) => <option key={c.id} value={c.id}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">کشور مبدا</Label>
                    <Input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="مبدا کالا..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">کشور مقصد</Label>
                    <Input value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="مقصد کالا..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">ارز</Label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="IRR">ریال</option>
                      <option value="USD">دلار</option>
                      <option value="EUR">یورو</option>
                      <option value="AED">درهم</option>
                      <option value="CNY">یوان</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نرخ تبدیل</Label>
                    <Input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ نرخ</Label>
                    <Input type="date" value={exchangeRateDate} onChange={(e) => setExchangeRateDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع قرارداد</Label>
                    <select value={contractType} onChange={(e) => setContractType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="purchase">خرید</option>
                      <option value="sale">فروش</option>
                      <option value="consignment">امانی</option>
                      <option value="other">سایر</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1D2939]">اقلام کالا</h2>
                  <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /> افزودن قلم</Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-[#E7ECF3] bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#667085]">قلم {toEnglishDigits(String(i + 1))}</span>
                        {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="h-[38px] rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm">
                          <option value="">انتخاب محصول...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <Input placeholder="نام محصول" value={item.productName} onChange={(e) => updateItem(i, 'productName', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="کد HS" value={item.hsCode} onChange={(e) => updateItem(i, 'hsCode', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="تعداد" type="number" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="واحد" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="قیمت واحد" type="number" value={item.unitValue} onChange={(e) => updateItem(i, 'unitValue', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="نرخ تبدیل" type="number" value={item.conversionRate} onChange={(e) => updateItem(i, 'conversionRate', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700">{formatToman(parseNumber(item.rialValue))}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}

                <div className="mt-4 flex items-center justify-end gap-3 rounded-lg bg-blue-50 p-3">
                  <span className="text-sm font-semibold text-blue-600">ارزش کل کالاها (ریال):</span>
                  <span className="text-lg font-bold text-blue-700">{formatToman(totalRialValue)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1D2939]">هزینه‌های گمرکی</h2>
                  <Button type="button" size="sm" variant="outline" onClick={addCost}><Plus className="h-4 w-4" /> افزودن هزینه</Button>
                </div>

                {costs.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-400">هزینه‌ای ثبت نشده است</p>
                ) : (
                  <div className="space-y-3">
                    {costs.map((cost, i) => (
                      <div key={i} className="rounded-lg border border-[#E7ECF3] bg-amber-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-700">هزینه {toEnglishDigits(String(i + 1))}</span>
                          <button type="button" onClick={() => removeCost(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <select value={cost.costType} onChange={(e) => updateCost(i, 'costType', e.target.value)} className="h-[38px] rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm">
                            {COST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <Input placeholder="مبلغ" type="number" value={cost.amount} onChange={(e) => updateCost(i, 'amount', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="نرخ تبدیل" type="number" value={cost.conversionRate} onChange={(e) => updateCost(i, 'conversionRate', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <Input placeholder="طرف حساب" value={cost.contactName} onChange={(e) => updateCost(i, 'contactName', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                          <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-amber-100 px-3 text-sm font-bold text-amber-800">{formatToman(parseNumber(cost.rialAmount))} ریال</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {costs.length > 0 && (
                  <div className="mt-4 flex items-center justify-end gap-3 rounded-lg bg-amber-100 p-3">
                    <span className="text-sm font-semibold text-amber-700">کل هزینه‌ها (ریال):</span>
                    <span className="text-lg font-bold text-amber-800">{formatToman(totalCosts)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/customs-declarations">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت اظهارنامه</>}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><Lightbulb className="h-5 w-5" /></span>
                  <h2 className="text-base font-bold text-[#1D2939]">راهنمای ثبت</h2>
                </div>
                <div className="space-y-3">
                  {guideItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#3155E7]"><item.icon className="h-3.5 w-3.5" /></span>
                      <div>
                        <div className="text-sm font-semibold text-[#344054]">{item.title}</div>
                        <div className="mt-0.5 text-xs text-[#98A2B3]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 rounded-[12px] border border-blue-100 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700">پس از ثبت اظهارنامه، باید اطلاعات را تکمیل کرده، ثبت، تأیید و سپس ترخیص کنید. چرخه: ایجاد ← تکمیل اطلاعات ← ثبت ← تأیید ← ترخیص.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
