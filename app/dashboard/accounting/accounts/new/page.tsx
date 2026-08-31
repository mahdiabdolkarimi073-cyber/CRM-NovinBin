'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData, createData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowRight, BookOpen, Hash, Type as TypeIcon, Layers, Building2, Wallet, FileText, Info, Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Account, CostCenter } from '@/lib/types';

const accountTypes = [
  { key: 'asset', label: 'دارایی', color: '#3b82f6' },
  { key: 'liability', label: 'بدهی', color: '#ef4444' },
  { key: 'equity', label: 'حقوق صاحبان سهام', color: '#8b5cf6' },
  { key: 'revenue', label: 'درآمد', color: '#10b981' },
  { key: 'expense', label: 'هزینه', color: '#f59e0b' },
];

const guideItems = [
  { icon: Hash, title: 'کد یکتا', desc: 'کد حساب باید منحصربه‌فرد و طبق استاندارد چارت حساب‌ها باشد.' },
  { icon: TypeIcon, title: 'نام واضح', desc: 'نام حساب را به‌صورت گویا و قابل تشخیص وارد کنید.' },
  { icon: Layers, title: 'سلسله‌مراتب', desc: 'با انتخاب حساب والد، ساختار درختی چارت را شکل دهید.' },
  { icon: Building2, title: 'مرکز هزینه', desc: 'در صورت نیاز، حساب را به مرکز هزینه مرتبط کنید.' },
];

export default function NewAccountPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', type: 'asset', parentId: '', costCenterId: '',
    description: '', isGroup: false, openingBalance: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('اطلاعات کاربر بارگذاری نشده'); return; }
    if (!form.code.trim() || !form.name.trim()) { toast.error('کد و نام حساب الزامی است'); return; }
    setSubmitting(true);
    try {
      await createData('accounts', {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        parentId: form.parentId || null,
        costCenterId: form.costCenterId || null,
        description: form.description || null,
        isGroup: form.isGroup,
        openingBalance: Number(form.openingBalance) || 0,
      });
      toast.success('حساب ایجاد شد');
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
            <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">ایجاد حساب جدید</h1>
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">حساب جدیدی در چارت حساب‌های سازمان تعریف کنید</p>
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
              <BookOpen className="h-[21px] w-[21px] text-[#2563EB]" />
              <h2 className="text-[20px] font-bold text-[#0F172A]">اطلاعات حساب</h2>
            </div>
            <div className="mt-2.5 h-[3px] w-[25px] rounded-full bg-[#2563EB]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">کد حساب <span className="text-[#DC2626]">*</span></Label>
                <Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="مثال: 1010" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" required />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">نوع حساب <span className="text-[#DC2626]">*</span></Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB]"><SelectValue /></SelectTrigger>
                  <SelectContent>{accountTypes.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">نام حساب <span className="text-[#DC2626]">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: صندوق" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" required />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">حساب والد</Label>
                <Select value={form.parentId || 'none'} onValueChange={(v) => setForm({ ...form, parentId: v === 'none' ? '' : v })}>
                  <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px]"><SelectValue placeholder="بدون والد" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون والد (حساب اصلی)</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">مرکز هزینه</Label>
                <Select value={form.costCenterId || 'none'} onValueChange={(v) => setForm({ ...form, costCenterId: v === 'none' ? '' : v })}>
                  <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px]"><SelectValue placeholder="بدون مرکز هزینه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مرکز هزینه</SelectItem>
                    {costCenters.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">موجودی اول دوره (تومان)</Label>
              <Input dir="ltr" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} placeholder="0" className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
            </div>

            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">توضیحات</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="توضیحات اختیاری..." className="rounded-[10px] border-[#D4DEEA] p-4 text-[14px] leading-[1.9] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]" />
            </div>

            <label className="flex items-center gap-2 text-[14px] cursor-pointer font-medium text-[#172033]">
              <input type="checkbox" checked={form.isGroup} onChange={(e) => setForm({ ...form, isGroup: e.target.checked })} className="h-4 w-4 rounded border-[#D4DEEA]" />
              این حساب یک گروه است (سند به آن ثبت نمی‌شود)
            </label>

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
            <p className="text-[13px] leading-[2] text-[#64748B]">چارت حساب‌ها پایه سیستم حسابداری است. حساب‌های گروهی برای دسته‌بندی و حساب‌های عادی برای ثبت سند استفاده می‌شوند.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
