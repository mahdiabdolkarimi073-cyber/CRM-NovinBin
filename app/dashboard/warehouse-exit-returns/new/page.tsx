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
  ArrowRight, RotateCcw, Loader2, Plus, Trash2,
  Lightbulb, Info, Building2, Calendar, Hash, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatToman, toEnglishDigits, parseNumber } from '@/lib/format';
import type { Warehouse, Product, Profile, WarehouseExit, WarehouseExitItem } from '@/lib/types';

interface ItemRow {
  originalExitItemId: string;
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

const guideItems = [
  { icon: Hash, title: 'انتخاب خروج مبنا', desc: 'برگشت باید به یک خروج نهایی‌شده متصل باشد.' },
  { icon: AlertTriangle, title: 'کنترل مقدار', desc: 'مقدار برگشتی نباید بیشتر از مقدار قابل برگشت باشد.' },
  { icon: Building2, title: 'وضعیت کالا', desc: 'وضعیت فیزیکی کالای برگشتی را مشخص کنید.' },
];

export default function NewWarehouseExitReturnPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [exits, setExits] = useState<WarehouseExit[]>([]);
  const [selectedExitItems, setSelectedExitItems] = useState<WarehouseExitItem[]>([]);

  const [number, setNumber] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [originalExitId, setOriginalExitId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [contactName, setContactName] = useState('');
  const [returnReason, setReturnReason] = useState('other');
  const [itemCondition, setItemCondition] = useState('usable');
  const [responsibleId, setResponsibleId] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [whData, prodData, staffData, exData] = await Promise.all([
        fetchData<Warehouse>('warehouses', { where: { active: true } }),
        fetchData<Product>('products', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
        fetchData<WarehouseExit>('warehouse_exits', {
          where: { status: 'finalized' },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      setWarehouses(whData || []);
      setProducts(prodData || []);
      setStaff(staffData || []);
      setExits(exData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`WER-${Date.now().toString().slice(-8)}`);
    setReturnDate(new Date().toISOString().slice(0, 10));
  }, []);

  const handleExitSelect = (exitId: string) => {
    setOriginalExitId(exitId);
    const exit = exits.find((e) => e.id === exitId);
    if (exit) {
      setWarehouseId(exit.warehouseId || '');
      setContactName(exit.contactName || '');
      const exItems = exit.items || [];
      setSelectedExitItems(exItems);
      setItems(exItems.map((item) => ({
        originalExitItemId: item.id,
        productId: item.productId || '',
        productName: item.productName || '',
        qty: '',
        unit: item.unit || '',
        unitPrice: String(item.unitPrice || 0),
        location: item.location || '',
        batchNo: item.batchNo || '',
        serialNo: item.serialNo || '',
        notes: '',
      })));
    } else {
      setSelectedExitItems([]);
      setItems([]);
    }
  };

  const addItem = () => {
    setItems([...items, { originalExitItemId: '', productId: '', productName: '', qty: '1', unit: '', unitPrice: '0', location: '', batchNo: '', serialNo: '', notes: '' }]);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const p = products.find((p) => p.id === value);
        if (p) {
          updated.productName = p.name;
          updated.unit = p.unit || '';
        }
      }
      return updated;
    }));
  };

  const calcRow = (item: ItemRow) => parseNumber(item.qty) * parseNumber(item.unitPrice);
  const totalValue = items.reduce((sum, item) => sum + calcRow(item), 0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!originalExitId) e.originalExitId = 'انتخاب خروج مبنا الزامی است';
    if (!returnDate) e.returnDate = 'تاریخ برگشت الزامی است';
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
      const record = await createData('warehouse_exit_returns', {
        number,
        returnDate: new Date(returnDate).toISOString(),
        registeredDate: new Date().toISOString(),
        originalExitId,
        warehouseId: warehouseId || null,
        contactName: contactName || null,
        returnReason,
        itemCondition,
        responsibleId: responsibleId || null,
        status: 'draft',
        totalValue,
        description: description || null,
        createdBy: profile.id,
      }) as any;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.productId && !item.productName) continue;
        await createData('warehouse_exit_return_items', {
          returnId: record.id,
          rowNumber: i + 1,
          originalExitItemId: item.originalExitItemId || null,
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

      try {
        await createData('warehouse_exit_return_history', {
          returnId: record.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { number, originalExitId },
        });
      } catch {}

      toast.success('برگشت خروج از انبار ثبت شد');
      router.push('/dashboard/warehouse-exit-returns');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت برگشت خروج از انبار</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> برگشت خروج از انبار <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/warehouse-exit-returns">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]"><ArrowRight className="h-4 w-4" /> بازگشت</Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><RotateCcw className="h-5 w-5" /></span>
                  <div><h2 className="text-base font-bold text-[#1D2939]">اطلاعات برگشت</h2><p className="text-xs text-[#98A2B3]">برگشت خروج را به یک خروج نهایی‌شده متصل کنید.</p></div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label className="text-sm font-semibold text-[#344054]">شماره برگشت</Label><Input value={number} readOnly className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" /></div>
                  <div className="space-y-2"><Label className="text-sm font-semibold text-[#344054]">خروج مبنا <span className="text-rose-500">*</span></Label><select value={originalExitId} onChange={(e) => handleExitSelect(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]"><option value="">انتخاب خروج...</option>{exits.map((e) => <option key={e.id} value={e.id}>{e.number} ({e.contactName || '—'})</option>)}</select>{errors.originalExitId && <span className="text-xs text-rose-500">{errors.originalExitId}</span>}</div>
                  <div className="space-y-2"><Label className="text-sm font-semibold text-[#344054]">تاریخ برگشت <span className="text-rose-500">*</span></Label><Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />{errors.returnDate && <span className="text-xs text-rose-500">{errors.returnDate}</span>}</div>
                  <div className="space-y-2"><Label className="text-sm font-semibold text-[#344054]">انبار</Label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]"><option value="">انتخاب انبار...</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                  <div className="space-y-2"><Label className="text-sm font-semibold text-[#344054]">طرف حساب</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="نام طرف حساب..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" /></div>
                  <div className="space-y-2"><Label className="text-sm font-semibold text-[#344054]">علت برگشت</Label><select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">{RETURN_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                  <div className="space-y-2"><Label className="text-sm font-semibold text-[#344054]">وضعیت کالا</Label><select value={itemCondition} onChange={(e) => setItemCondition(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">{ITEM_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                  <div className="space-y-2"><Label className="text-sm font-semibold text-[#344054]">مسئول</Label><select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]"><option value="">انتخاب شخص...</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></div>
                </div>
                <div className="mt-4 space-y-2"><Label className="text-sm font-semibold text-[#344054]">توضیحات</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold text-[#1D2939]">اقلام برگشتی</h2><Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /> افزودن قلم</Button></div>
                {selectedExitItems.length > 0 && <div className="mb-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">اقلام از خروج مبنا بارگذاری شد. مقدار برگشتی هر قلم را وارد کنید.</div>}
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-lg border border-[#E7ECF3] bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-[#667085]">قلم {toEnglishDigits(String(i + 1))}</span>{items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} className="h-[38px] rounded-[8px] border border-[#DCE3EE] bg-white px-2 text-sm"><option value="">انتخاب محصول...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                        <Input placeholder="نام محصول" value={item.productName} onChange={(e) => updateItem(i, 'productName', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="واحد" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input type="number" placeholder="مقدار برگشتی" value={item.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input type="number" placeholder="قیمت واحد" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="محل" value={item.location} onChange={(e) => updateItem(i, 'location', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="شماره بچ" value={item.batchNo} onChange={(e) => updateItem(i, 'batchNo', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <Input placeholder="سریال" value={item.serialNo} onChange={(e) => updateItem(i, 'serialNo', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm" />
                        <div className="flex h-[38px] items-center justify-center rounded-[8px] bg-blue-50 px-3 text-sm font-bold text-blue-700">{formatToman(calcRow(item))}</div>
                        <Input placeholder="توضیحات قلم" value={item.notes} onChange={(e) => updateItem(i, 'notes', e.target.value)} className="h-[38px] rounded-[8px] border-[#DCE3EE] text-sm sm:col-span-2 lg:col-span-3" />
                      </div>
                    </div>
                  ))}
                </div>
                {errors.items && <span className="mt-2 block text-xs text-rose-500">{errors.items}</span>}
                <div className="mt-4 flex items-center justify-end gap-3 rounded-lg bg-blue-50 p-3"><span className="text-sm font-semibold text-blue-600">ارزش کل برگشت:</span><span className="text-lg font-bold text-blue-700">{formatToman(totalValue)} تومان</span></div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3"><Link href="/dashboard/warehouse-exit-returns"><Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button></Link><Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت برگشت</>}</Button></div>
          </div>

          <div className="space-y-4"><Card><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><Lightbulb className="h-5 w-5" /></span><h2 className="text-base font-bold text-[#1D2939]">راهنمای ثبت</h2></div><div className="space-y-3">{guideItems.map((item, i) => <div key={i} className="flex items-start gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#3155E7]"><item.icon className="h-3.5 w-3.5" /></span><div><div className="text-sm font-semibold text-[#344054]">{item.title}</div><div className="mt-0.5 text-xs text-[#98A2B3]">{item.desc}</div></div></div>)}</div></CardContent></Card><div className="flex items-start gap-3 rounded-[12px] border border-blue-100 bg-blue-50 p-4"><Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" /><p className="text-xs text-blue-700">برگشت خروج یک عملیات معکوس است. چرخه: ایجاد ← ارسال ← تأیید ← اعمال ← نهایی. پس از اعمال، موجودی به انبار برمی‌گردد.</p></div></div>
        </div>
      </form>
    </div>
  );
}
