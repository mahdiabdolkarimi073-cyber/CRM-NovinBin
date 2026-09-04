'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Headphones, Loader2, LockKeyhole, UserRound, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function AcademyLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/academy/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password, remember }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ورود ناموفق بود');
      toast.success('خوش آمدید');
      const role = data.user?.role;
      if (role === 'AdminAcademy') router.push('/academy/admin-dashboard');
      else if (role === 'teacher') router.push('/academy/dashboard');
      else router.push('/academy/dashboard');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'ورود ناموفق بود'); }
    finally { setLoading(false); }
  }

  return <main className="academy-auth-page" dir="rtl">
    <section className="academy-auth-art"><Image src="/images/ChatGPT_Image_Aug_30,_2026,_02_39_21_PM.png" alt="دنیای الگوریتم" fill priority sizes="(max-width: 900px) 100vw, 50vw" /></section>
    <section className="academy-auth-panel">
      <div className="academy-login-card">
        <div className="academy-brand-mark">دنیای <span>الگوریتم</span></div>
        <div className="academy-auth-heading"><h1><span>ورود</span> به پنل کاربری</h1><p>به <b>دنیای الگوریتم</b> خوش آمدید!</p></div>
        <form onSubmit={handleSubmit} className="academy-form">
          <label htmlFor="academy-identifier">نام کاربری یا ایمیل</label>
          <div className="academy-input-wrap"><UserRound /><input id="academy-identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="نام کاربری یا ایمیل" autoComplete="username" required /></div>
          <label htmlFor="academy-password">رمز عبور</label>
          <div className="academy-input-wrap"><LockKeyhole /><input id="academy-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="رمز عبور" autoComplete="current-password" required style={{ textAlign: 'left' }} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="نمایش رمز عبور" style={{ order: 3 }}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
          <div className="academy-login-options"><label className="academy-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>مرا به خاطر بسپار</span></label><button type="button" className="academy-link">رمز عبور را فراموش کرده‌اید؟</button></div>
          <button className="academy-primary-btn" type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : null} ورود</button>
        </form>
        <div className="academy-divider"><span>یا</span></div>
        <Link href="/academy/register" className="academy-outline-btn"><UserPlus /> ثبت‌نام به عنوان کاربر جدید</Link>
        <p className="academy-help-text">برای ورود به پنل خود، اطلاعات کاربری‌تان را وارد کنید</p>
        <p className="academy-support"><Headphones /> پشتیبانی: <span dir="ltr">021-12345678</span></p>
        <Link href="/" className="academy-back-link">بازگشت به نوین‌بین</Link>
      </div>
    </section>
  </main>;
}