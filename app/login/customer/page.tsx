'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, User, ArrowLeft, Phone } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { signInWithPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('شماره موبایل و رمز عبور را وارد کنید');
      return;
    }
    setLoading(true);
    const result = await signInWithPhone(phone, password);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || 'ورود ناموفق');
      return;
    }
    toast.success('خوش آمدید');
    if (result.profile?.userType === 'customer') {
      router.push('/portal');
    } else {
      toast.error('این حساب مشتری نیست');
    }
  };

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-8 sm:px-6" dir="rtl">
      <Image
        src="/images/ChatGPT_Image_Sep_13,_2026,_12_18_29_PM.png"
        alt="تخت جمشید"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-[470px] animate-fade-in rounded-2xl border border-white/30 bg-white/15 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-9">
        <Link href="/" className="mb-7 flex justify-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/40 bg-white/20 p-3 shadow-lg sm:h-32 sm:w-32">
            <Image
              src="/images/1.png"
              alt="نوین‌بین"
              fill
              priority
              className="object-contain object-center p-2"
              sizes="128px"
            />
          </div>
        </Link>

        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/20 px-4 py-2 text-sm font-extrabold text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            ورود مشتریان
          </div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">به باشگاه مشتریان خوش آمدید</h1>
          <p className="mt-2 text-sm font-medium text-white/80">برای پیگیری سفارش‌ها، فاکتورها و تیکت‌های خود وارد شوید</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone" className="font-bold text-white">شماره موبایل</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <Input
                id="phone"
                dir="ltr"
                placeholder="09123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 border-white/30 bg-white/85 pr-10 text-left text-slate-900 placeholder:text-slate-500 focus:border-white focus:bg-white"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-bold text-white">رمز عبور</Label>
            <PasswordInput
              id="password"
              dir="ltr"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 border-white/30 bg-white/85 text-left text-slate-900 placeholder:text-slate-500 focus:border-white focus:bg-white"
              required
            />
          </div>
          <Button type="submit" disabled={loading} size="lg" className="mt-2 h-12 w-full bg-emerald-600 text-base font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-emerald-700">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
            ورود به پورتال
          </Button>
        </form>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Link href="/register/customer" className="inline-flex items-center gap-1.5 text-sm font-bold text-white transition-colors hover:text-emerald-300">
            <User className="h-4 w-4" />
            ثبت‌نام مشتری جدید
          </Link>
          <Link href="/login" className="text-xs font-medium text-white/75 transition-colors hover:text-white">
            ورود پرسنل سازمان
          </Link>
        </div>

        <Link href="/" className="mt-8 inline-flex items-center gap-1 text-xs font-semibold text-white/75 transition-colors hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" />
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </main>
  );
}
