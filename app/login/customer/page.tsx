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
import { Logo } from '@/components/dashboard/logo';
import { toast } from 'sonner';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('ایمیل و رمز عبور را وارد کنید'); return; }
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.success) { toast.error(result.error || 'ورود ناموفق'); return; }
    toast.success('خوش آمدید');
    if (result.profile?.userType === 'customer') {
      router.push('/portal');
    } else {
      toast.error('این حساب مشتری نیست');
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row" dir="rtl">
      <div className="relative flex flex-1 items-center justify-center bg-white px-6 py-10 sm:px-12 lg:px-20">
        <div className="w-full max-w-md animate-fade-in">
          <Link href="/" className="mb-10">
            <Logo size={56} />
          </Link>

          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
              <User className="h-3.5 w-3.5" />
              ورود مشتریان
            </div>
            <h1 className="text-3xl font-black leading-tight text-slate-950">به باشگاه مشتریان خوش آمدید</h1>
            <p className="mt-2 text-sm text-slate-500">برای پیگیری سفارش‌ها، فاکتورها و تیکت‌های خود وارد شوید</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">ایمیل</Label>
              <Input type="email" dir="ltr" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50/50 text-left text-base focus:border-slate-950 focus:bg-white focus:ring-slate-950/10" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">رمز عبور</Label>
              <PasswordInput dir="ltr" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50/50 text-left text-base focus:border-slate-950 focus:bg-white focus:ring-slate-950/10" required />
            </div>
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              ورود به پورتال
            </Button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link href="/register/customer" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-700">
              <User className="h-4 w-4" />
              ثبت‌نام مشتری جدید
            </Link>
            <Link href="/login" className="text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600">
              ورود پرسنل سازمان
            </Link>
          </div>

          <Link href="/" className="mt-10 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600">
            <ArrowLeft className="h-3.5 w-3.5" />
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>

      <div className="relative hidden min-h-screen flex-1 overflow-hidden lg:block">
        <Image
          src="/images/b18b651e-ce1a-4e5f-95cc-04605ed9a3ee.png"
          alt="نوین‌بین - پورتال مشتریان"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 via-transparent to-transparent" />
      </div>
    </div>
  );
}
