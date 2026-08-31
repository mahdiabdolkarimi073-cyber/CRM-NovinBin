'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowRight, FileText, Plus, Trash2, Info, Lightbulb, Loader2, Scale, Calendar, Building2 } from 'lucide-react';
import { formatToman, toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { Account, CostCenter } from '@/lib/types';

const guideItems = [
  { icon: Scale, title: 'تراز سند', desc: 'مجموع بدهکار و بستانکار باید برابر باشد.' },
  { icon: Calendar, title: 'تاریخ سند', desc: 'تاریخ ثبت سند را دقیق انتخاب کنید.' },
  { icon: Building2, title: 'مرکز هزینه', desc: 'در صورت نیاز سند را به مرکز هزینه اختصاص دهید.' },
  { icon: Plus, title: 'سطرهای سند', desc: 'حداقل دو سطر برای هر سند لازم است.' },
];

export default function NewJournalPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    description: '', date: '', costCenterId: '',
    lines: [{ accountId: '', debit: '', credit: '', description: '' }],
  });

  const loadData = useCallback(async () => {
    try {
      const [accs, ccs] = await Promise.all([
        fetchData<Account>('accounts', { where: {}, orderBy: { code: 'asc' } }),
        fetchData<CostCenter>('cost_centers', { where: {}, orderBy: { code: 'asc' } }),
      ]);
      setAccounts(accs || []);
      setCostCenters(ccs || []);
    } catch { setAccounts([]); setCostCenters([]); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addLine = () => setForm({ ...form, lines: [...form.lines, { accountId: '', debit: '', credit: '', description: '' }] });
  const removeLine = (i: number) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i: number, field: string, value: string) => {
    const lines = [...form.lines];
    lines[i] = { ...lines[i], [field]: value };
    setForm({ ...form, lines });
  };

  const totalDebit = form.lines.reduce((s, l) => s + (Number(l.debit.replace(/[^0-9]/g, '')) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (Number(l.credit.replace(/[^0-9]/g, '')) || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!balanced) { toast.error('سند باید تراز باشد'); return; }
    if (form.lines.length < 2) { toast.error('حداقل دو سطر لازم است'); return; }
    if (form.lines.some((l) => !l.accountId)) { toast.error('حساب همه سطرها را انتخاب کنید'); return; }
    setSubmitting(true);
    try {
      const number = 'JE-' + Date.now().toString().slice(-6);
      await createData('journal_entries', {
        number,
        description: form.description || null,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        costCenterId: form.costCenterId || null,
        status: 'posted',
        createdBy: profile.id,
        lines: {
          create: form.lines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit.replace(/[^0-9]/g, '')) || 0,
            credit: Number(l.credit.replace(/[^0-9]/g, '')) || 0,
            description: l.description || null,
            costCenterId: form.costCenterId || null,
          })),
        },
      });
      toast.success('سند ثبت شد');
      router.push('/dashboard/accounting');
    } catch (error: any) { toast.error('ثبت ناموفق: ' + error.message); }
    setSubmitting(false);
  };

  return (
    <div className="w-full" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
            <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">ثبت سند حسابداری</h1>
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">سند حسابداری جدید با سطرهای بدهکار و بستانکار ثبت کنید</p>
        </div>
        <Link href="/dashboard/accounting">
          <Button variant="outline" className="h-[52px] w-full rounded-[10px] border-[#D6E0EC] bg-white text-[#0F172A] shadow-sm sm:w-[215px]">
            <ArrowRight className="h-4 w-4" /> بازگشت به حسابداری
          </Button>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[2fr_0.9fr]">
        <div className="rounded-[14px] border border-[#DCE4EF] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:p-7">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <FileText className="h-[21px] w-[21px] text-[#2563EB]" />
              <h2 className="text-[20px] font-bold text-[#0F172A]">اطلاعات سند</h2>
            </div>
            <div className="mt-2.5 h-[3px] w-[25px] rounded-full bg-[#2563EB]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">توضیحات</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="شرح سند..." className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
              </div>
              <div className="sm:col-span-1">
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">تاریخ سند</Label>
                <JalaliDatePicker value={form.date ? new Date(form.date) : null} onChange={(d) => setForm({ ...form, date: d ? toLocalDateString(d) : '' })} className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB]" />
              </div>
              <div className="sm:col-span-1">
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">مرکز هزینه</Label>
                <Select value={form.costCenterId || 'none'} onValueChange={(v) => setForm({ ...form, costCenterId: v === 'none' ? '' : v })}>
                  <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px]"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مرکز هزینه</SelectItem>
                    {costCenters.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-[14px] font-semibold text-[#172033]">سطرهای سند</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLine} className="rounded-[8px]"><Plus className="h-4 w-4" /> افزودن سطر</Button>
              </div>
              <div className="space-y-2.5">
                {form.lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <Select value={line.accountId} onValueChange={(v) => updateLine(i, 'accountId', v)}>
                        <SelectTrigger className="h-[42px] rounded-[10px] border-[#D4DEEA] text-[13px]"><SelectValue placeholder="انتخاب حساب..." /></SelectTrigger>
                        <SelectContent>{accounts.filter((a) => !a.isGroup).map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input className="col-span-4 sm:col-span-2 h-[42px] rounded-[10px] border-[#D4DEEA] text-left text-[13px]" dir="ltr" placeholder="بدهکار" value={line.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)} />
                    <Input className="col-span-4 sm:col-span-2 h-[42px] rounded-[10px] border-[#D4DEEA] text-left text-[13px]" dir="ltr" placeholder="بستانکار" value={line.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)} />
                    <Input className="col-span-3 sm:col-span-2 h-[42px] rounded-[10px] border-[#D4DEEA] text-[13px]" placeholder="شرح" value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} />
                    <Button type="button" size="sm" variant="ghost" className="col-span-1 h-[42px] hover:bg-red-50" onClick={() => removeLine(i)} disabled={form.lines.length <= 1}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-3 rounded-[10px] bg-[#F8FAFD] p-4 text-[14px]">
              <span>مجموع بدهکار: <strong className={balanced ? 'text-emerald-600' : 'text-red-600'}>{formatToman(totalDebit)} ت</strong></span>
              <span>مجموع بستانکار: <strong className={balanced ? 'text-emerald-600' : 'text-red-600'}>{formatToman(totalCredit)} ت</strong></span>
              <span>تراز: <strong className={balanced ? 'text-emerald-600' : 'text-red-600'}>{balanced ? 'بله' : 'خیر'}</strong></span>
            </div>

            <div className="flex flex-row gap-3.5 pt-2">
              <Button type="submit" disabled={submitting} className="h-[52px] w-[60%] rounded-[10px] bg-[#102A68] text-[14px] font-bold text-white transition-all hover:bg-[#1a3a7a] hover:shadow-md sm:w-[175px]">
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : 'ثبت سند'}
              </Button>
              <Link href="/dashboard/accounting" className="w-[40%] sm:w-[110px]">
                <Button type="button" variant="outline" className="h-[52px] w-full rounded-[10px] border-[#D4DEEA] bg-white text-[14px] font-medium text-[#172033]">انصراف</Button>
              </Link>
            </div>
          </form>
        </div>

        <div className="space-y-5">
          <div className="rounded-[14px] border border-[#DCE4EF] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-[#2563EB]" />
              <h3 className="text-[20px] font-bold text-[#0F172A]">راهنما و نکات</h3>
            </div>
            <div className="space-y-7">
              {guideItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#EFF6FF]">
                    <item.icon className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0F172A]">{item.title}</div>
                    <div className="mt-1 text-[13px] leading-relaxed text-[#64748B]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[12px] border border-[#BFDBFE] bg-[#EFF6FF] p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-[#2563EB]" />
              <h4 className="text-[14px] font-bold text-[#2563EB]">اطلاعات مفید</h4>
            </div>
            <p className="text-[13px] leading-[2] text-[#64748B]">سند ثبت‌شده در دفتر کل منظور می‌شود و در گزارش‌های مالی قابل مشاهده است. سندهای برگشتی با مبالغ معکوس ثبت می‌شوند.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
