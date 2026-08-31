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
import { ArrowRight, FileCheck, Info, Lightbulb, Loader2, Hash, Calendar, Landmark, User } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import type { BankAccount } from '@/lib/types';

const guideItems = [
  { icon: Hash, title: 'شماره چک', desc: 'شماره چک را به‌صورت دقیق و لاتین وارد کنید.' },
  { icon: Calendar, title: 'سررسید', desc: 'تاریخ سررسید چک را برای پیگیری دقیق انتخاب کنید.' },
  { icon: Landmark, title: 'حساب مرتبط', desc: 'چک را به حساب بانکی مرتبط متصل کنید.' },
  { icon: User, title: 'طرف چک', desc: 'نام در وجه یا از طرف را وارد کنید.' },
];

export default function NewChequePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'received', number: '', amount: '', issueDate: '', dueDate: '',
    bankName: '', bankAccountId: '', payee: '', notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const bas = await fetchData<BankAccount>('bank_accounts', { where: {} });
      setBankAccounts(bas || []);
    } catch { setBankAccounts([]); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!form.number.trim() || !form.amount || !form.dueDate) { toast.error('شماره، مبلغ و سررسید الزامی است'); return; }
    setSubmitting(true);
    try {
      await createData('cheques', {
        type: form.type,
        number: form.number.trim(),
        amount: Number(form.amount.replace(/[^0-9]/g, '')) || 0,
        issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : new Date().toISOString(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : new Date().toISOString(),
        status: 'pending',
        bankName: form.bankName || null,
        bankAccountId: form.bankAccountId || null,
        payee: form.payee || null,
        notes: form.notes || null,
      });
      toast.success('چک ثبت شد');
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
            <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">ثبت چک</h1>
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">چک دریافتی یا پرداختی جدید ثبت کنید</p>
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
              <FileCheck className="h-[21px] w-[21px] text-[#2563EB]" />
              <h2 className="text-[20px] font-bold text-[#0F172A]">اطلاعات چک</h2>
            </div>
            <div className="mt-2.5 h-[3px] w-[25px] rounded-full bg-[#2563EB]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">نوع چک <span className="text-[#DC2626]">*</span></Label>
                <select className="h-[50px] w-full rounded-[10px] border border-[#D4DEEA] px-3 text-[14px] focus:border-[#2563EB]" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="received">دریافتی</option>
                  <option value="paid">پرداختی</option>
                </select>
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">شماره چک <span className="text-[#DC2626]">*</span></Label>
                <Input dir="ltr" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="123456" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" required />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">مبلغ (تومان) <span className="text-[#DC2626]">*</span></Label>
                <Input dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" required />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">سررسید <span className="text-[#DC2626]">*</span></Label>
                <JalaliDatePicker value={form.dueDate ? new Date(form.dueDate) : null} onChange={(d) => setForm({ ...form, dueDate: d ? toLocalDateString(d) : '' })} className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB]" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">تاریخ صدور</Label>
                <JalaliDatePicker value={form.issueDate ? new Date(form.issueDate) : null} onChange={(d) => setForm({ ...form, issueDate: d ? toLocalDateString(d) : '' })} className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB]" />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">نام بانک</Label>
                <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="مثال: بانک ملت" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">حساب بانکی مرتبط</Label>
              <Select value={form.bankAccountId || 'none'} onValueChange={(v) => setForm({ ...form, bankAccountId: v === 'none' ? '' : v })}>
                <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px]"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون ارتباط</SelectItem>
                  {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} - {b.bankName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">طرف چک</Label>
              <Input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} placeholder="در وجه / از طرف" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
            </div>
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">توضیحات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="توضیحات اختیاری..." className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
            </div>

            <div className="flex flex-row gap-3.5 pt-2">
              <Button type="submit" disabled={submitting} className="h-[52px] w-[60%] rounded-[10px] bg-[#102A68] text-[14px] font-bold text-white transition-all hover:bg-[#1a3a7a] hover:shadow-md sm:w-[175px]">
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</>) : 'ثبت چک'}
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
            <p className="text-[13px] leading-[2] text-[#64748B]">چک‌های ثبت‌شده را می‌توانید تسویه یا برگشت بزنید. چک‌های در جریان در گزارش خزانه‌داری لحاظ می‌شوند.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
