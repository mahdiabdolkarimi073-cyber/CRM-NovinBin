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
    <div className="mx-auto flex min-h-[100svh] w-full flex-col bg-card lg:max-w-[1040px] lg:flex-row xl:max-w-none" dir="rtl">
      {/* Right side – login form */}
      <div className="relative flex min-h-[100svh] w-full flex-1 items-center justify-center bg-card px-5 py-8 sm:px-12 lg:w-[46%] lg:px-16 lg:py-12 xl:w-[60%]">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute -left-40 -bottom-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-lg animate-fade-in">
          <Link href="/" className="mb-10 flex flex-col items-center">
            <div className="relative h-72 w-72 overflow-hidden drop-shadow-lg sm:h-80 sm:w-80">
              <Image
                src="/images/1.png"
                alt="نوین‌بین"
                fill
                priority
                className="object-contain object-center"
                sizes="192px"
              />
            </div>
          </Link>

          <div className="mb-8">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-extrabold text-accent-foreground shadow-lg shadow-accent/20">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                ورود به سیستم
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-left"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <PasswordInput
                id="password"
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-left"
                required
              />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="mt-2 w-full">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              ورود به سیستم
            </Button>
          </form>

          {/* Footer links */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link href="/login/customer" className="inline-flex items-center gap-1.5 text-sm font-bold text-accent transition-colors hover:text-accent-dark">
              <User className="h-4 w-4" />
              ورود مشتریان
            </Link>
            <p className="text-center text-xs text-muted-foreground">حساب سازمانی ندارید؟ با سوپرادمین تماس بگیرید</p>
          </div>

          <Link href="/" className="mt-10 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>

      <div className="relative min-h-[340px] w-full overflow-hidden bg-slate-950 lg:min-h-[100svh] lg:w-[54%] xl:w-[40%]">
        <Image
          src="/images/login-hero.png"
          alt="نوین‌بین - سیستم مدیریت یکپارچه سازمان"
          fill
          priority
          sizes="(min-width: 1024px) 54vw, 100vw"
          className="object-cover object-center"
        />
      </div>
    </div>
  );
}
