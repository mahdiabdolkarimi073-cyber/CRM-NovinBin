'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, User, ArrowLeft } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';

export default function UnifiedLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('ایمیل و رمز عبور را وارد کنید');
      return;
    }
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error || 'ورود ناموفق');
      return;
    }

    toast.success('خوش آمدید');
    const profile = result.profile;
    if (profile?.userType === 'customer') {
      router.push('/portal');
    } else if (profile?.role === 'super_admin' || profile?.role === 'owner') {
      router.push('/super-admin');
    } else {
      router.push('/dashboard');
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
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff9a18]" />
            ورود به سیستم
          </div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">به نوین‌بین خوش آمدید</h1>
          <p className="mt-2 text-sm font-medium text-white/80">برای ادامه، اطلاعات حساب خود را وارد کنید</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold text-white">ایمیل</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 border-white/30 bg-white/85 text-left text-slate-900 placeholder:text-slate-500 focus:border-white focus:bg-white"
              required
            />
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
          <Button type="submit" disabled={loading} size="lg" className="mt-2 h-12 w-full bg-[#2851d9] text-base font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#1e43bd]">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
            ورود به سیستم
          </Button>
        </form>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Link href="/login/customer" className="inline-flex items-center gap-1.5 text-sm font-bold text-white transition-colors hover:text-[#ffb34d]">
            <User className="h-4 w-4" />
            ورود مشتریان
          </Link>
          <p className="text-center text-xs font-medium text-white/75">حساب سازمانی ندارید؟ با سوپرادمین تماس بگیرید</p>
        </div>

        <Link href="/" className="mt-8 inline-flex items-center gap-1 text-xs font-semibold text-white/75 transition-colors hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" />
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </main>
  );
}
