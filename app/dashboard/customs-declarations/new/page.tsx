'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import {
  ArrowRight, FileSearch, Loader2, Plus, Trash2, Check,
  Lightbulb, Info, Building2, Calendar, Hash, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { ContactParty, Product, Profile } from '@/lib/types';

interface ItemRow {
  productId: string; productName: string; hsCode: string; originCountry: string;
  qty: string; unit: string; unitValue: string; totalValue: string;
  currency: string; conversionRate: string; rialValue: string;
}
interface CostRow {
  costType: string; amount: string; currency: string;
  conversionRate: string; rialAmount: string; contactName: string;
}

const OP_TYPES = [{ value: 'import', label: 'واردات' }, { value: 'export', label: 'صادرات' }];
const COST_TYPES = [
  { value: 'duty', label: 'حقوق گمرکی' }, { value: 'surcharge', label: 'عوارض' },
  { value: 'vat', label: 'مالیات بر ارزش افزوده' }, { value: 'customs_fee', label: 'کارمزد گمرک' },
  { value: 'freight', label: 'حمل و نقل' }, { value: 'insurance', label: 'بیمه' },
  { value: 'clearance', label: 'ترخیص' }, { value: 'storage', label: 'انبارداری' },
  { value: 'other', label: 'سایر' },
];
const guideItems = [
  { icon: Hash, title: 'شماره‌گذاری', desc: 'شماره داخلی اظهارنامه به‌صورت خودکار تولید می‌شود.' },
  { icon: Building2, title: 'گمرک', desc: 'گمرک محل انجام عملیات را انتخاب کنید.' },
  { icon: Globe, title: 'مبدا/مقصد', desc: 'کشور مبدا و مقصد کالا را وارد کنید.' },
];

const inputStyle: React.CSSProperties = { height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' };
const selectStyle: React.CSSProperties = { height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 12px', fontSize: 14, width: '100%', background: 'white', outline: 'none' };
const itemInputStyle: React.CSSProperties = { height: 38, borderRadius: 8, border: '1px solid #E2E8F0', padding: '0 10px', fontSize: 13, width: '100%', background: 'transparent', outline: 'none' };

export default function NewCustomsDeclarationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<ContactParty[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
  const [items, setItems] = useState<ItemRow[]>([{ productId: '', productName: '', hsCode: '', originCountry: '', qty: '1', unit: '', unitValue: '0', totalValue: '0', currency: 'IRR', conversionRate: '1', rialValue: '0' }]);
  const [costs, setCosts] = useState<CostRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [contactData, prodData] = await Promise.all([
        fetchData<ContactParty>('contact_parties', { where: {} }),
        fetchData<Product>('products', { where: { active: true } }),
      ]);
      setContacts(contactData || []);
      setProducts(prodData || []);
    } catch (error: any) { toast.error('بارگذاری داده‌ها ناموفق: ' + error.message); }
  }, []);
  useEffect(() => { loadData(); setInternalNumber(`CD-${Date.now().toString().slice(-8)}`); setDeclarationDate(new Date().toISOString().slice(0, 10)); setExchangeRateDate(new Date().toISOString().slice(0, 10)); }, [loadData]);

  const addItem = () => setItems([...items, { productId: '', productName: '', hsCode: '', originCountry: '', qty: '1', unit: '', unitValue: '0', totalValue: '0', currency: 'IRR', conversionRate: '1', rialValue: '0' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ItemRow, value: string) => {
    setItems(items.map((item, idx) => {
      if (idx !== i) return item;
      const u = { ...item, [field]: value };
      if (field === 'productId') { const p = products.find((p) => p.id === value); if (p) { u.productName = p.name; u.unit = p.unit || ''; u.unitValue = String(p.cost || p.price || 0); } }
      if (field === 'qty' || field === 'unitValue' || field === 'conversionRate') { const q = parseNumber(u.qty), uv = parseNumber(u.unitValue), c = parseNumber(u.conversionRate); u.totalValue = String(q * uv); u.rialValue = String(q * uv * c); }
      return u;
    }));
  };
  const addCost = () => setCosts([...costs, { costType: 'duty', amount: '0', currency: 'IRR', conversionRate: '1', rialAmount: '0', contactName: '' }]);
  const removeCost = (i: number) => setCosts(costs.filter((_, idx) => idx !== i));
  const updateCost = (i: number, field: keyof CostRow, value: string) => {
    setCosts(costs.map((cost, idx) => {
      if (idx !== i) return cost;
      const u = { ...cost, [field]: value };
      if (field === 'amount' || field === 'conversionRate') { u.rialAmount = String(parseNumber(u.amount) * parseNumber(u.conversionRate)); }
      return u;
    }));
  };

  const totalGoodsValue = items.reduce((s, i) => s + parseNumber(i.totalValue), 0);
  const totalRialValue = items.reduce((s, i) => s + parseNumber(i.rialValue), 0);
  const totalCosts = costs.reduce((s, c) => s + parseNumber(c.rialAmount), 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!declarationDate) e.declarationDate = 'تاریخ اظهار الزامی است';
    if (!operationType) e.operationType = 'نوع عملیات الزامی است';
    if (items.length === 0 || items.every((i) => !i.productId && !i.productName)) e.items = 'حداقل یک قلم الزامی است';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const contact = contacts.find((c) => c.id === contactPartyId);
      const cName = contact ? [contact.firstName, contact.lastName, contact.companyName].filter(Boolean).join(' ') : null;
      const declaration = await createData('customs_declarations', {
        internalNumber, customsNumber: customsNumber || null, operationType, customsOffice: customsOffice || null,
        declarationDate: new Date(declarationDate).toISOString(), registeredDate: new Date().toISOString(),
        contactPartyId: contactPartyId || null, contactName: cName, originCountry: originCountry || null,
        destinationCountry: destinationCountry || null, currency, exchangeRate: parseNumber(exchangeRate),
        exchangeRateDate: exchangeRateDate ? new Date(exchangeRateDate).toISOString() : null, contractType,
        status: 'draft', totalGoodsValue, totalRialValue, totalCosts, totalPaidAmount: 0,
        description: description || null, createdBy: profile.id,
      }) as any;
      for (let i = 0; i < items.length; i++) { const item = items[i]; if (!item.productId && !item.productName) continue; await createData('customs_declaration_items', { declarationId: declaration.id, rowNumber: i + 1, productId: item.productId || null, productName: item.productName || null, hsCode: item.hsCode || null, originCountry: item.originCountry || null, qty: parseNumber(item.qty), unit: item.unit || null, unitValue: parseNumber(item.unitValue), totalValue: parseNumber(item.totalValue), currency: item.currency, conversionRate: parseNumber(item.conversionRate), rialValue: parseNumber(item.rialValue) }); }
      for (let i = 0; i < costs.length; i++) { const cost = costs[i]; if (parseNumber(cost.amount) === 0) continue; await createData('customs_declaration_costs', { declarationId: declaration.id, costType: cost.costType, amount: parseNumber(cost.amount), currency: cost.currency, conversionRate: parseNumber(cost.conversionRate), rialAmount: parseNumber(cost.rialAmount), contactName: cost.contactName || null }); }
      try { await createData('customs_declaration_history', { declarationId: declaration.id, action: 'created', actionBy: profile.id, actionAt: new Date().toISOString(), toStatus: 'draft', details: { internalNumber, operationType, customsOffice } }); } catch {}
      toast.success('اظهارنامه گمرکی ثبت شد'); router.push('/dashboard/customs-declarations');
    } catch (error: any) { toast.error('ایجاد ناموفق: ' + error.message); } finally { setSubmitting(false); }
  };

  return (
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/customs-declarations" className="nb-editor-back"><ArrowRight className="h-4 w-4" /> بازگشت به اظهارات</Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> اظهارات گمرکی <b>←</b> ثبت</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/customs-declarations')} disabled={submitting}>انصراف</button>
          <button type="submit" form="cd-form" className="nb-editor-save-btn" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {submitting ? 'در حال ثبت...' : 'ثبت اظهارنامه'}
          </button>
        </div>
      </div>
      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="cd-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20"><FileSearch className="h-5 w-5" /></span>
                <div><h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات اظهارنامه</h2><p className="text-sm text-slate-400">جزئیات اظهارنامه گمرکی را وارد کنید.</p></div>
              </div>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group"><Label className="nb-editor-label">شماره داخلی</Label><input value={internalNumber} readOnly className="nb-input" style={{ ...inputStyle, background: '#f8fafc' }} /></div>
                <div className="nb-editor-field-group"><Label className="nb-editor-label">شماره گمرک</Label><input value={customsNumber} onChange={(e) => setCustomsNumber(e.target.value)} placeholder="شماره اظهارنامه گمرک..." className="nb-input" style={inputStyle} /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group"><Label className="nb-editor-label">نوع عملیات <span className="text-red-500">*</span></Label><select value={operationType} onChange={(e) => setOperationType(e.target.value)} className="nb-input" style={{ ...selectStyle, borderColor: errors.operationType ? '#FCA5A5' : '#E2E8F0' }}>{OP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>{errors.operationType && <span className="nb-editor-error">{errors.operationType}</span>}</div>
                <div className="nb-editor-field-group"><Label className="nb-editor-label">گمرک</Label><input value={customsOffice} onChange={(e) => setCustomsOffice(e.target.value)} placeholder="نام گمرک..." className="nb-input" style={inputStyle} /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group"><Label className="nb-editor-label">تاریخ اظهار <span className="text-red-500">*</span></Label><input type="date" value={declarationDate} onChange={(e) => setDeclarationDate(e.target.value)} className="nb-input" style={{ ...inputStyle, borderColor: errors.declarationDate ? '#FCA5A5' : '#E2E8F0' }} />{errors.declarationDate && <span className="nb-editor-error">{errors.declarationDate}</span>}</div>
                <div className="nb-editor-field-group"><Label className="nb-editor-label">طرف حساب</Label><select value={contactPartyId} onChange={(e) => setContactPartyId(e.target.value)} className="nb-input" style={selectStyle}><option value="">انتخاب طرف حساب...</option>{contacts.map((c) => <option key={c.id} value={c.id}>{[c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ')}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group"><Label className="nb-editor-label">کشور مبدا</Label><input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="مبدا کالا..." className="nb-input" style={inputStyle} /></div>
                <div className="nb-editor-field-group"><Label className="nb-editor-label">کشور مقصد</Label><input value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="مقصد کالا..." className="nb-input" style={inputStyle} /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group"><Label className="nb-editor-label">ارز</Label><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="nb-input" style={selectStyle}><option value="IRR">ریال</option><option value="USD">دلار</option><option value="EUR">یورو</option><option value="AED">درهم</option><option value="CNY">یوان</option></select></div>
                <div className="nb-editor-field-group"><Label className="nb-editor-label">نرخ تبدیل</Label><input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="nb-input" style={inputStyle} /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group"><Label className="nb-editor-label">تاریخ نرخ</Label><input type="date" value={exchangeRateDate} onChange={(e) => setExchangeRateDate(e.target.value)} className="nb-input" style={inputStyle} /></div>
                <div className="nb-editor-field-group"><Label className="nb-editor-label">نوع قرارداد</Label><select value={contractType} onChange={(e) => setContractType(e.target.value)} className="nb-input" style={selectStyle}><option value="purchase">خرید</option><option value="sale">فروش</option><option value="consignment">امانی</option><option value="other">سایر</option></select></div>
              </div>
              <div className="nb-editor-field-group"><Label className="nb-editor-label">توضیحات</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="nb-input" style={{ minHeight: 80, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }} rows={3} /></div>
            </div>

            {/* Items */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 18 }}>اقلام کالا</h2>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"><Plus className="h-3.5 w-3.5" /> افزودن قلم</button>
              </div>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-500 dark:text-slate-400">قلم {toEnglishDigits(String(i + 1))}</span>{items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div>
                    <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2 lg:grid-cols-3">
                      <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="nb-input" style={itemInputStyle}><option value="">انتخاب محصول...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                      <input placeholder="نام محصول" value={item.productName} onChange={(e) => updateItem(i, 'productName', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input placeholder="کد HS" value={item.hsCode} onChange={(e) => updateItem(i, 'hsCode', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input placeholder="واحد" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input type="number" placeholder="قیمت واحد" value={item.unitValue} onChange={(e) => updateItem(i, 'unitValue', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <input type="number" placeholder="نرخ تبدیل" value={item.conversionRate} onChange={(e) => updateItem(i, 'conversionRate', e.target.value)} className="nb-input" style={itemInputStyle} />
                      <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-xs font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{formatToman(parseNumber(item.rialValue))}</div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}
              <div className="mt-4 flex items-center justify-end gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20"><span className="text-sm font-semibold text-blue-600 dark:text-blue-400">ارزش کل کالاها (ریال):</span><span className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatToman(totalRialValue)}</span></div>
            </div>

            {/* Costs */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 18 }}>هزینه‌های گمرکی</h2>
                <button type="button" onClick={addCost} className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"><Plus className="h-3.5 w-3.5" /> افزودن هزینه</button>
              </div>
              {costs.length === 0 ? <p className="py-3 text-center text-xs text-slate-400">هزینه‌ای ثبت نشده است</p> : (
                <div className="space-y-3">
                  {costs.map((cost, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-amber-50/50 p-3 dark:border-slate-700 dark:bg-amber-900/10">
                      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-amber-700 dark:text-amber-400">هزینه {toEnglishDigits(String(i + 1))}</span><button type="button" onClick={() => removeCost(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
                      <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2 lg:grid-cols-3">
                        <select value={cost.costType} onChange={(e) => updateCost(i, 'costType', e.target.value)} className="nb-input" style={itemInputStyle}>{COST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                        <input type="number" placeholder="مبلغ" value={cost.amount} onChange={(e) => updateCost(i, 'amount', e.target.value)} className="nb-input" style={itemInputStyle} />
                        <input type="number" placeholder="نرخ تبدیل" value={cost.conversionRate} onChange={(e) => updateCost(i, 'conversionRate', e.target.value)} className="nb-input" style={itemInputStyle} />
                        <input placeholder="طرف حساب" value={cost.contactName} onChange={(e) => updateCost(i, 'contactName', e.target.value)} className="nb-input" style={itemInputStyle} />
                        <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-amber-100 px-3 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{formatToman(parseNumber(cost.rialAmount))} ریال</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {costs.length > 0 && <div className="mt-4 flex items-center justify-end gap-3 rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20"><span className="text-sm font-semibold text-amber-700 dark:text-amber-400">کل هزینه‌ها (ریال):</span><span className="text-lg font-bold text-amber-800 dark:text-amber-300">{formatToman(totalCosts)}</span></div>}
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas">
              <div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20"><Lightbulb className="h-5 w-5" /></span><h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 16 }}>راهنمای ثبت</h2></div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (<div key={i} className="flex items-start gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><item.icon className="h-3.5 w-3.5" /></span><div><div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</div><div className="mt-0.5 text-xs text-slate-400">{item.desc}</div></div></div>))}
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/30 dark:bg-sky-900/10"><Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" /><p className="text-xs text-sky-700 dark:text-sky-400">پس از ثبت اظهارنامه، باید اطلاعات را تکمیل کرده، ثبت، تأیید و سپس ترخیص کنید.</p></div>
          </aside>
        </div>
      </div>
    </div>
  );
}
