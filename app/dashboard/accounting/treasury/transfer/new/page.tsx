'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowRightLeft, Info, Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { BankAccount, CashFund } from '@/lib/types';

const guideItems = [
  { icon: ArrowRightLeft, title: 'مبدأ و مقصد', desc: 'مبدأ و مقصد انتقال را از بین حساب‌های بانکی و صندوق‌ها انتخاب کنید.' },
  { icon: ArrowRightLeft, title: 'مبلغ معتبر', desc: 'مبلغ انتقال را به تومان و به‌صورت عددی وارد کنید.' },
];

export default function NewTransferPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashFunds, setCashFunds] = useState<CashFund[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ from_type: 'bank', from_id: '', to_type: 'cash', to_id: '', amount: '', description: '' });

  const loadData = useCallback(async () => {
    try {
      const [bas, cfs] = await Promise.all([
        fetchData<BankAccount>('bank_accounts', { where: {} }),
        fetchData<CashFund>('cash_funds', { where: {} }),
      ]);
      setBankAccounts(bas || []);
      setCashFunds(cfs || []);
    } catch { setBankAccounts([]); setCashFunds([]); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!form.from_id || !form.to_id) { toast.error('مبدأ و مقصد را انتخاب کنید'); return; }
    if (form.from_id === form.to_id && form.from_type === form.to_type) { toast.error('مبدأ و مقصد یکسان هستند'); return; }
    const amount = Number(form.amount.replace(/[^0-9]/g, '')) || 0;
    if (amount <= 0) { toast.error('مبلغ معتبر وارد کنید'); return; }
    setSubmitting(true);
    try {
      const number = 'FT-' + Date.now().toString().slice(-6);
      await createData('fund_transfers', {
        number,
        fromType: form.from_type,
        fromId: form.from_id,
        toType: form.to_type,
        toId: form.to_id,
        amount,
        description: form.description || null,
        createdBy: profile.id,
      });
      toast.success('انتقال وجه انجام شد');
      router.push('/dashboard/accounting');
    } catch (error: any) { toast.error('انتقال ناموفق: ' + error.message); }
    setSubmitting(false);
  };

  return (
    <div className="w-full" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
            <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">انتقال وجه</h1>
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">وجه را بین حساب‌های بانکی و صندوق‌های نقدی جابه‌جا کنید</p>
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
              <ArrowRightLeft className="h-[21px] w-[21px] text-[#2563EB]" />
              <h2 className="text-[20px] font-bold text-[#0F172A]">اطلاعات انتقال</h2>
            </div>
            <div className="mt-2.5 h-[3px] w-[25px] rounded-full bg-[#2563EB]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">مبدأ <span className="text-[#DC2626]">*</span></Label>
                <select className="h-[50px] w-full rounded-[10px] border border-[#D4DEEA] px-3 text-[14px] focus:border-[#2563EB]" value={`${form.from_type}:${form.from_id}`} onChange={(e) => { const [t, id] = e.target.value.split(':'); setForm({ ...form, from_type: t, from_id: id }); }}>
                  <option value="bank:">— انتخاب مبدأ —</option>
                  {bankAccounts.map((b) => <option key={b.id} value={`bank:${b.id}`}>بانک - {b.name}</option>)}
                  {cashFunds.map((c) => <option key={c.id} value={`cash:${c.id}`}>صندوق - {c.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">مقصد <span className="text-[#DC2626]">*</span></Label>
                <select className="h-[50px] w-full rounded-[10px] border border-[#D4DEEA] px-3 text-[14px] focus:border-[#2563EB]" value={`${form.to_type}:${form.to_id}`} onChange={(e) => { const [t, id] = e.target.value.split(':'); setForm({ ...form, to_type: t, to_id: id }); }}>
                  <option value="cash:">— انتخاب مقصد —</option>
                  {bankAccounts.map((b) => <option key={b.id} value={`bank:${b.id}`}>بانک - {b.name}</option>)}
                  {cashFunds.map((c) => <option key={c.id} value={`cash:${c.id}`}>صندوق - {c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">مبلغ (تومان) <span className="text-[#DC2626]">*</span></Label>
              <Input dir="ltr" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" required />
            </div>
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">توضیحات</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="توضیحات اختیاری..." className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
            </div>

            <div className="flex flex-row gap-3.5 pt-2">
              <Button type="submit" disabled={submitting} className="h-[52px] w-[60%] rounded-[10px] bg-[#102A68] text-[14px] font-bold text-white transition-all hover:bg-[#1a3a7a] hover:shadow-md sm:w-[175px]">
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> در حال انتقال...</>) : 'انتقال وجه'}
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
            <p className="text-[13px] leading-[2] text-[#64748B]">انتقال وجه بین صندوق‌ها و حساب‌های بانکی در تاریخچه خزانه‌داری ثبت می‌شود.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
