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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, CreditCard, Loader2, Plus,
  Lightbulb, Info, Hash, User, AlertCircle, CheckSquare,
  Building2, ShieldCheck, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BankAccount } from '@/lib/types';

const guideItems = [
  { icon: CheckSquare, title: 'شناسه‌های یکتا', desc: 'شماره ترمینال (TID) و شماره پذیرنده (MID) باید یکتا باشند و تکراری ثبت نشوند.' },
  { icon: Building2, title: 'حساب بانکی متصل', desc: 'حساب بانکی که تسویه کارتخوان به آن واریز می‌شود را انتخاب کنید.' },
  { icon: ShieldCheck, title: 'وضعیت فعال', desc: 'کارتخوان با وضعیت فعال قابل ثبت تراکنش است. می‌توانید بعداً آن را غیرفعال یا مسدود کنید.' },
  { icon: Calendar, title: 'تاریخ شروع', desc: 'تاریخ شروع استفاده از کارتخوان را ثبت کنید.' },
];

export default function NewCardReaderPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [number, setNumber] = useState('');
  const [tid, setTid] = useState('');
  const [mid, setMid] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [owner, setOwner] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const baData = await fetchData<BankAccount>('bank_accounts', { where: { active: true } });
      setBankAccounts(baData || []);
    } catch (error: any) {
      toast.error('بارگذاری داده‌ها ناموفق: ' + error.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setNumber(`CR-${Date.now().toString().slice(-8)}`);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!tid) e.tid = 'شماره ترمینال (TID) الزامی است';
    if (!mid) e.mid = 'شماره پذیرنده (MID) الزامی است';
    if (!bankName) e.bankName = 'نام بانک/شرکت پرداخت الزامی است';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const reader = await createData('card_readers', {
        number,
        tid,
        mid,
        bankName,
        branchName: branchName || null,
        bankAccountId: bankAccountId || null,
        owner: owner || null,
        status: 'active',
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        description: description || null,
        createdBy: profile.id,
      }) as any;

      try {
        await createData('card_reader_history', {
          cardReaderId: reader.id,
          action: 'created',
          actionBy: profile.id,
          actionAt: new Date().toISOString(),
          toStatus: 'active',
          details: { tid, mid, bankName },
        });
      } catch {}

      toast.success('کارتخوان ثبت شد');
      router.push('/dashboard/card-readers');
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
            <h1 className="text-[28px] font-bold text-[#101828]">ثبت کارتخوان جدید</h1>
          </div>
          <div className="mt-2 text-xs font-medium text-[#667085]">داشبورد <span className="mx-1.5 text-[#CBD5E1]">←</span> کارتخوان <span className="mx-1.5 text-[#CBD5E1]">←</span> ثبت</div>
        </div>
        <Link href="/dashboard/card-readers">
          <Button variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-white text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#FAFBFF]">
            <ArrowRight className="h-4 w-4" /> بازگشت
          </Button>
        </Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3155E7]/10 text-[#3155E7]"><CreditCard className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-base font-bold text-[#1D2939]">اطلاعات کارتخوان</h2>
                    <p className="text-xs text-[#98A2B3]">شناسه‌های ترمینال و پذیرنده را وارد کنید. این مقادیر باید یکتا باشند.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره داخلی</Label>
                    <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="CR-..." className="h-[42px] rounded-[10px] border-[#DCE3EE] bg-slate-50" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">نام بانک / شرکت پرداخت <span className="text-rose-500">*</span></Label>
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="مثلاً: ملت، سامان، آپ..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.bankName && <span className="text-xs text-rose-500">{errors.bankName}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره ترمینال (TID) <span className="text-rose-500">*</span></Label>
                    <Input value={tid} onChange={(e) => setTid(e.target.value)} placeholder="TID..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.tid && <span className="text-xs text-rose-500">{errors.tid}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شماره پذیرنده (MID) <span className="text-rose-500">*</span></Label>
                    <Input value={mid} onChange={(e) => setMid(e.target.value)} placeholder="MID..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                    {errors.mid && <span className="text-xs text-rose-500">{errors.mid}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">شعبه / محل استفاده</Label>
                    <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="شعبه یا محل..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">مالک / واحد استفاده‌کننده</Label>
                    <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="مالک یا واحد..." className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">حساب بانکی متصل</Label>
                    <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="h-[42px] w-full rounded-[10px] border border-[#DCE3EE] bg-white px-3 text-sm text-[#344054]">
                      <option value="">انتخاب حساب...</option>
                      {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNo}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#344054]">تاریخ شروع استفاده</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-[42px] rounded-[10px] border-[#DCE3EE]" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-[#344054]">توضیحات</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#DCE3EE]" />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/card-readers">
                <Button type="button" variant="outline" className="h-[42px] rounded-[10px] border-[#DCE3EE]">انصراف</Button>
              </Link>
              <Button type="submit" disabled={submitting} className="h-[42px] rounded-[10px] bg-[#3155E7] px-[18px] text-sm font-semibold text-white shadow-sm hover:bg-[#2445C7]">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : <><Plus className="h-4 w-4" /> ثبت کارتخوان</>}
              </Button>
            </div>
          </div>

          {/* Guide */}
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
              <p className="text-xs text-blue-700">پس از ثبت کارتخوان، می‌توانید تراکنش‌های آن را ثبت کنید و سپس سند تسویه ایجاد نمایید. چرخه کامل: تعریف کارتخوان ← ثبت تراکنش ← تأیید تراکنش ← ایجاد تسویه ← تأیید و ثبت نهایی.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
