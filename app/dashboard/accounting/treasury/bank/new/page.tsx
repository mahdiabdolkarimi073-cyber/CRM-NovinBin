'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, Landmark, Info, Lightbulb, Loader2, Hash, Banknote } from 'lucide-react';
import { toast } from 'sonner';

const guideItems = [
  { icon: Landmark, title: 'نام بانک', desc: 'نام بانک و شعبه را به‌صورت دقیق وارد کنید.' },
  { icon: Hash, title: 'شماره حساب', desc: 'شماره حساب و شبا را به‌صورت لاتین وارد کنید.' },
  { icon: Banknote, title: 'موجودی اولیه', desc: 'موجودی اولیه حساب را به تومان وارد کنید.' },
];

export default function NewBankAccountPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', bankName: '', accountNo: '', branchName: '', iban: '', cardNumber: '', balance: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!form.name.trim() || !form.bankName.trim() || !form.accountNo.trim()) { toast.error('نام، نام بانک و شماره حساب الزامی است'); return; }
    setSubmitting(true);
    try {
      await createData('bank_accounts', {
        name: form.name.trim(),
        bankName: form.bankName.trim(),
        accountNo: form.accountNo.trim(),
        branchName: form.branchName || null,
        iban: form.iban || null,
        cardNumber: form.cardNumber || null,
        balance: Number(form.balance) || 0,
      });
      toast.success('حساب بانکی ایجاد شد');
      router.push('/dashboard/accounting');
    } catch (error: any) { toast.error('ایجاد ناموفق: ' + error.message); }
    setSubmitting(false);
  };

  return (
    <div className="w-full" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
            <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">ایجاد حساب بانکی</h1>
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">حساب بانکی جدید برای خزانه‌داری ثبت کنید</p>
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
              <Landmark className="h-[21px] w-[21px] text-[#2563EB]" />
              <h2 className="text-[20px] font-bold text-[#0F172A]">اطلاعات حساب بانکی</h2>
            </div>
            <div className="mt-2.5 h-[3px] w-[25px] rounded-full bg-[#2563EB]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">نام حساب <span className="text-[#DC2626]">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: حساب جاری اصلی" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" required />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">نام بانک <span className="text-[#DC2626]">*</span></Label>
                <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="مثال: بانک ملت" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" required />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">شماره حساب <span className="text-[#DC2626]">*</span></Label>
                <Input dir="ltr" value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })} placeholder="1234567890" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" required />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">شماره شبا</Label>
                <Input dir="ltr" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="IR..." className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">نام شعبه</Label>
                <Input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} placeholder="مثال: شعبه مرکزی" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">شماره کارت</Label>
                <Input dir="ltr" value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} placeholder="6037-xxxx-xxxx-xxxx" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">موجودی اولیه (تومان)</Label>
              <Input dir="ltr" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
            </div>

            <div className="flex flex-row gap-3.5 pt-2">
              <Button type="submit" disabled={submitting} className="h-[52px] w-[60%] rounded-[10px] bg-[#102A68] text-[14px] font-bold text-white transition-all hover:bg-[#1a3a7a] hover:shadow-md sm:w-[175px]">
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال ایجاد...</>) : 'ایجاد حساب'}
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
            <p className="text-[13px] leading-[2] text-[#64748B]">حساب‌های بانکی در خزانه‌داری استفاده می‌شوند و می‌توانید بین آن‌ها و صندوق‌های نقدی انتقال وجه انجام دهید.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
