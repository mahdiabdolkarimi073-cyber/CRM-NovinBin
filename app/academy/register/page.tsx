'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function AcademyRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', username: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    try { const response = await fetch('/api/academy/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success('ثبت‌نام با موفقیت انجام شد'); router.push('/academy/login'); } catch (error) { toast.error(error instanceof Error ? error.message : 'ثبت‌نام ناموفق بود'); } finally { setLoading(false); }
  }
  return <main className="academy-register-page" dir="rtl"><section className="academy-register-art"><Image src="/images/ChatGPT_Image_Aug_30,_2026,_02_39_21_PM.png" alt="دنیای الگوریتم" fill sizes="(max-width: 900px) 100vw, 48vw" priority /></section><section className="academy-register-panel"><div className="academy-register-card"><Link href="/academy/login" className="academy-back-top"><ArrowRight /> بازگشت به ورود</Link><div className="academy-auth-heading"><h1>ثبت‌نام <span>دانش‌آموز</span></h1><p>حساب آموزشی اختصاصی خود را بسازید</p></div><form onSubmit={handleSubmit} className="academy-form academy-register-form"><div className="academy-two-cols"><div><label htmlFor="firstName">نام</label><input id="firstName" value={form.firstName} onChange={update('firstName')} placeholder="نام شما" required /></div><div><label htmlFor="lastName">نام خانوادگی</label><input id="lastName" value={form.lastName} onChange={update('lastName')} placeholder="نام خانوادگی" required /></div></div><label htmlFor="username">نام کاربری</label><input id="username" dir="ltr" value={form.username} onChange={update('username')} placeholder="مثلاً ali-rezaei" required /><label htmlFor="email">ایمیل</label><input id="email" type="email" dir="ltr" value={form.email} onChange={update('email')} placeholder="example@email.com" /><label htmlFor="phone">شماره موبایل</label><input id="phone" dir="ltr" value={form.phone} onChange={update('phone')} placeholder="09123456789" /><label htmlFor="register-password">رمز عبور</label><input id="register-password" type="password" dir="ltr" value={form.password} onChange={update('password')} placeholder="حداقل ۶ کاراکتر" required /><button className="academy-primary-btn" type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <UserPlus />} ساخت حساب کاربری</button></form><p className="academy-switch-text">قبلاً حساب ساخته‌اید؟ <Link href="/academy/login">ورود به پنل</Link></p></div></section></main>;
}