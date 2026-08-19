'use client';

import { useState } from 'react';
import { toLocalDateString } from '@/lib/format';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import { Label } from '@/components/ui/label';
import { Loader2, User, UserPlus, CheckCircle2 } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { Logo } from '@/components/dashboard/logo';

export default function CustomerRegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    password: '',
    phone: '',
    birthDate: '',
    address: '',
    postalCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || (!form.firstName && !form.companyName)) {
      toast.error('لطفا فیلدهای ضروری را پر کنید');
      return;
    }
    if (form.password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          companyName: form.companyName || null,
          phone: form.phone || null,
          birthDate: form.birthDate || null,
          address: form.address || null,
          postalCode: form.postalCode || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا در ثبت');

      setSubmitted(true);
      toast.success('درخواست شما ثبت شد. پس از تایید مدیریت می‌توانید وارد شوید.');
    } catch (err: any) {
      toast.error('ثبت درخواست ناموفق: ' + (err.message || ''));
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6" dir="rtl">
        <div className="w-full max-w-md text-center animate-fade-in">
          <Link href="/" className="mb-8 justify-center">
            <Logo size={48} />
          </Link>
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">درخواست ثبت شد</h1>
          <p className="text-slate-500 text-sm mb-6">درخواست ثبت‌نام شما ارسال شد. پس از تایید توسط مدیریت، می‌توانید با ایمیل و رمز عبور خود وارد شوید.</p>
          <Link href="/login/customer">
            <Button className="w-full h-11">بازگشت به صفحه ورود</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div className="w-full max-w-md animate-fade-in">
          <Link href="/" className="mb-8">
            <Logo size={48} />
          </Link>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-4">
              <User className="w-3.5 h-3.5" />
              ثبت‌نام مشتری
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">درخواست ثبت‌نام مشتری</h1>
            <p className="text-slate-500 text-sm">اطلاعات خود را وارد کنید. پس از تایید مدیریت، حساب شما فعال می‌شود.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>نام *</Label><Input placeholder="نام" value={form.firstName} onChange={set('firstName')} /></div>
              <div className="space-y-2"><Label>نام خانوادگی</Label><Input placeholder="نام خانوادگی" value={form.lastName} onChange={set('lastName')} /></div>
            </div>
            <div className="space-y-2">
              <Label>نام شرکت (در صورت حقوقی بودن)</Label>
              <Input placeholder="نام شرکت" value={form.companyName} onChange={set('companyName')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>ایمیل *</Label><Input type="email" dir="ltr" placeholder="email@example.com" value={form.email} onChange={set('email')} className="text-left" required /></div>
              <div className="space-y-2"><Label>رمز عبور *</Label><PasswordInput dir="ltr" placeholder="حداقل ۶ کاراکتر" value={form.password} onChange={set('password')} className="text-left" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>شماره موبایل</Label><Input dir="ltr" placeholder="09123456789" value={form.phone} onChange={set('phone')} className="text-left" /></div>
              <div className="space-y-2"><Label>تاریخ تولد</Label><JalaliDatePicker value={form.birthDate ? new Date(form.birthDate) : null} onChange={(d) => setForm({ ...form, birthDate: d ? toLocalDateString(d) : '' })} /></div>
            </div>
            <div className="space-y-2"><Label>آدرس</Label><Input placeholder="آدرس کامل" value={form.address} onChange={set('address')} /></div>
            <div className="space-y-2"><Label>کد پستی</Label><Input dir="ltr" placeholder="کد پستی" value={form.postalCode} onChange={set('postalCode')} className="text-left" /></div>
            <Button type="submit" disabled={loading} className="w-full h-11 text-base">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              ثبت درخواست
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            قبلا ثبت‌نام کرده‌اید؟{' '}
            <Link href="/login/customer" className="text-sky-600 font-medium hover:underline">ورود</Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 30% 30%, white 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative flex flex-col justify-center p-16 text-white">
          <h2 className="text-4xl font-bold leading-tight mb-6">به باشگاه مشتریان بپیوندید</h2>
          <p className="text-emerald-50/80 text-lg leading-relaxed mb-8">
            ثبت‌نام کنید و پس از تایید، به پورتال اختصاصی مشتریان دسترسی پیدا کنید
          </p>
          <div className="space-y-3">
            {['پیگیری سفارش‌ها و فاکتورها', 'ثبت تیکت پشتیبانی', 'دریافت گزارش کار', 'امتیازات باشگاه مشتریان'].map((t) => (
              <div key={t} className="flex items-center gap-3 text-emerald-50">
                <div className="w-5 h-5 rounded-full bg-emerald-300/30 flex items-center justify-center text-xs">✓</div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
