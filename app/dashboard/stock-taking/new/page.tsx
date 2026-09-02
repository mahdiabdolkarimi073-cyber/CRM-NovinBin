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
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowRight, ClipboardCheck, Loader2, Plus,
  Lightbulb, Info, Building2, ShieldCheck, Calendar, User,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Warehouse, Profile } from '@/lib/types';

const STK_TYPES = [
  { value: 'full', label: 'کامل (کل انبار)' },
  { value: 'partial', label: 'جزئی (گروه خاص)' },
  { value: 'spot', label: 'موردی (محصول خاص)' },
];

const SCOPE_TYPES = [
  { value: 'all', label: 'کل محصولات' },
  { value: 'category', label: 'بر اساس دسته‌بندی' },
  { value: 'location', label: 'بر اساس موقعیت' },
];

const guideItems = [
  { icon: Building2, title: 'انتخاب انبار', desc: 'انبار مورد نظر برای انبارگردانی را انتخاب کنید.' },
  { icon: ShieldCheck, title: 'توقف عملیات', desc: 'در صورت نیاز، می‌توانید عملیات انبار را در طول انبارگردانی متوقف کنید.' },
  { icon: Calendar, title: 'نوع انبارگردانی', desc: 'انبارگردانی می‌تواند کامل، جزئی یا موردی باشد.' },
  { icon: User, title: 'مسئول', desc: 'شخص مسئول انجام انبارگردانی را تعیین کنید.' },
];

export default function NewStockTakingPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);

  const [number, setNumber] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [stockTakingType, setStockTakingType] = useState('full');
  const [scopeType, setScopeType] = useState('all');
  const [scopeValue, setScopeValue] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [freezeOperations, setFreezeOperations] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [whData, staffData] = await Promise.all([
        fetchData<Warehouse>('warehouses', { where: { active: true } }),
        fetchData<Profile>('profiles', { where: { active: true } }),
      ]);
      setWarehouses(whData || []);
      setStaff(staffData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`STK-${Date.now().toString().slice(-8)}`);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!warehouseId) e.warehouseId = 'انتخاب انبار الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const stk = await createData('stock_takings', {
        number,
        warehouseId,
        stockTakingType,
        scopeType,
        scopeValue: scopeValue || null,
        responsibleId: responsibleId || null,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        status: 'draft',
        description: description || null,
        freezeOperations,
        createdBy: profile.id,
      }) as any;

      try {
        await createData('stock_taking_history', {
          stockTakingId: stk.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'draft',
          details: { number, warehouseId, stockTakingType },
        });
      } catch {}

      toast.success('انبارگردانی ثبت شد');
      router.push('/dashboard/stock-taking');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت انبارگردانی جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> انبارگردانی <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/stock-taking">
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
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><ClipboardCheck className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات انبارگردانی</h2>
                    <p className="text-xs text-[#98A2B3]">جزئیات عملیات انبارگردانی را وارد کنید.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره داخلی</Label>
                    <Input value={number} onChange={(e) => setNumber(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">انبار <span className="text-rose-500">*</span></Label>
                    <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب انبار...</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    {errors.warehouseId && <span className="text-xs text-rose-500">{errors.warehouseId}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نوع انبارگردانی</Label>
                    <select value={stockTakingType} onChange={(e) => setStockTakingType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {STK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">دامنه شمارش</Label>
                    <select value={scopeType} onChange={(e) => setScopeType(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      {SCOPE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  {scopeType !== 'all' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#344054]">مقدار دامنه</Label>
                      <Input value={scopeValue} onChange={(e) => setScopeValue(e.target.value)} placeholder="مثلاً: دسته‌بندی یا موقعیت..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مسئول</Label>
                    <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب شخص...</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ شروع</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Checkbox id="freeze" checked={freezeOperations} onCheckedChange={(v) => setFreezeOperations(!!v)} />
                  <Label htmlFor="freeze" className="cursor-pointer text-sm font-semibold text-[#344054]">توقف عملیات انبار در طول انبارگردانی</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/stock-taking">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت انبارگردانی</>}
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
              <p className="text-xs text-blue-700">پس از ثبت انبارگردانی، باید اقلام را شمارش کنید و مغایرت‌ها را ثبت نمایید. چرخه: ایجاد ← شروع شمارش ← ثبت شمارش ← تأیید ← بستن.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
