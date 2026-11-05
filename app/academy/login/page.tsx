'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, Headphones, Loader2, LockKeyhole, UserRound, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ACADEMY_TERMS_RULES_PATH } from '@/lib/academy-terms';

export default function AcademyLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/academy/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password, remember, acceptTerms }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ورود ناموفق بود');
      console.log('[academy-login] login response', { role: data.user?.role, hasUser: !!data.user });
      toast.success('خوش آمدید');
      const role = data.user?.role;
      const dest = role === 'AdminAcademy' ? '/academy/admin-dashboard' : '/academy/dashboard';
      setTimeout(() => { window.location.href = dest; }, 800);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'ورود ناموفق بود'); }
    finally { setLoading(false); }
  }

  return <main className="academy-auth-page" dir="rtl">
    <section className="academy-auth-panel">
      <div className="academy-login-card">
        <div className="academy-brand-mark">دنیای <span>الگوریتم</span></div>
        <div className="academy-auth-heading"><h1><span>ورود</span> به پنل کاربری بامالرن</h1></div>
        <form onSubmit={handleSubmit} className="academy-form">
          <label htmlFor="academy-identifier">نام کاربری، ایمیل یا شماره موبایل</label>
          <div className="academy-input-wrap"><UserRound /><input id="academy-identifier" dir="rtl" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="نام کاربری، ایمیل یا شماره موبایل" autoComplete="username" required /></div>
          <label htmlFor="academy-password">رمز عبور</label>
          <div className="academy-input-wrap"><LockKeyhole /><input id="academy-password" dir="rtl" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="رمز عبور" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="نمایش رمز عبور" style={{ order: 3 }}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
          <div className="academy-login-options"><label className="academy-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>مرا به خاطر بسپار</span></label><button type="button" className="academy-link">رمز عبور را فراموش کرده‌اید؟</button></div>
          <button className="academy-primary-btn" type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : null} ورود</button>
          <label className="academy-terms-check" htmlFor="login-accept-terms" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1.8 }}><input id="login-accept-terms" type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} style={{ marginTop: '0.35rem', width: '1rem', height: '1rem', flexShrink: 0, cursor: 'pointer' }} /><span>قوانین و مقررات آموزشگاه را خوانده‌ام و آن‌ها را می‌پذیرم. <Link href={ACADEMY_TERMS_RULES_PATH} target="_blank" style={{ color: 'var(--academy-primary, #1d4ed8)', textDecoration: 'underline', whiteSpace: 'nowrap' }}>مشاهده قوانین و مقررات آموزشگاه</Link></span></label>
        </form>
        <div className="academy-divider"><span>یا</span></div>
        <Link href="/academy/register" className="academy-outline-btn"><UserPlus /> ثبت‌نام به عنوان کاربر جدید</Link>
        <p className="academy-help-text">برای ورود به پنل خود، اطلاعات کاربری‌تان را وارد کنید</p>
        <p className="academy-support"><Headphones /> پشتیبانی: <span dir="ltr">09120733094</span></p>
        <Link href="https://www.bamalearn.com/" className="academy-back-link">رفتن به بامالرن</Link>
      </div>
    </section>
  </main>;
}