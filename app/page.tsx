'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Check,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  Headphones,
  Layers3,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Phone,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

const featureCards = [
  { icon: BarChart3, title: 'گزارش‌گیری پیشرفته', description: 'هر آنچه برای تصمیم‌گیری بهتر نیاز دارید، در یک نگاه ببینید.', tone: 'blue' },
  { icon: Target, title: 'مدیریت سرنخ و فرصت', description: 'فرصت‌های فروش را هوشمندانه دنبال کنید و هیچ مشتری را از دست ندهید.', tone: 'orange' },
  { icon: Users, title: 'مدیریت ارتباط با مشتری', description: 'تمام ارتباطات تیم شما با مشتریان، منظم و همیشه در دسترس است.', tone: 'green' },
  { icon: ShieldCheck, title: 'امنیت و دسترسی مطمئن', description: 'اطلاعات کسب‌وکار شما با بالاترین استانداردها محافظت می‌شود.', tone: 'violet' },
];

const capabilities = [
  { icon: ClipboardList, title: 'مدیریت فروش', description: 'از اولین تماس تا نهایی شدن قرارداد، کنار تیم فروش باشید.' },
  { icon: CircleDollarSign, title: 'امور مالی', description: 'درآمدها، هزینه‌ها و جریان مالی را یکپارچه مدیریت کنید.' },
  { icon: MessageCircle, title: 'تعامل با مشتری', description: 'گفت‌وگوها و پیگیری‌ها را در یک فضای ساده ثبت کنید.' },
  { icon: Layers3, title: 'مدیریت پروژه', description: 'کارها را شفاف تقسیم کنید و پیشرفت را لحظه‌ای ببینید.' },
  { icon: BarChart3, title: 'داشبوردهای تحلیلی', description: 'داده‌های مهم را به بینش‌های کاربردی تبدیل کنید.' },
  { icon: Headphones, title: 'پشتیبانی همراه', description: 'تیم ما برای رشد بهتر همیشه در کنار شماست.' },
];

const trustedNames = ['دیجی‌کالا', 'تپسی', 'آویپل', 'زیبال', 'باما', 'دکتر ساینا'];

const faqItems = [
  { question: 'نوین‌بین برای چه نوع کسب‌وکارهایی مناسب است؟', answer: 'نوین‌بین برای کسب‌وکارهای کوچک تا متوسط و تیم‌های فروش طراحی شده و به‌راحتی با رشد سازمان شما مقیاس‌پذیر است.' },
  { question: 'آیا برای شروع به کارت بانکی نیاز است؟', answer: 'خیر. شما می‌توانید بدون وارد کردن اطلاعات پرداخت، حساب رایگان خود را بسازید و امکانات را آزمایش کنید.' },
  { question: 'آیا داده‌های من امن هستند؟', answer: 'بله. تمام اطلاعات با بالاترین استانداردهای امنیتی رمزگذاری و پشتیبانی می‌شوند و دسترسی‌ها کاملاً قابل کنترل است.' },
  { question: 'آیا پشتیبانی فارسی ارائه می‌شود؟', answer: 'تیم پشتیبانی نوین‌بین به زبان فارسی و در ساعات کاری کنار شماست تا هر مسئله‌ای را سریع حل کند.' },
  { question: 'آیا می‌توانم امکانات را بعداً تغییر دهم؟', answer: 'بله. طرح‌ها و ماژول‌ها را می‌توانید هر زمان مطابق نیاز کسب‌وکار خود ارتقا یا تغییر دهید.' },
];

function FaqRow({ item, defaultOpen = false }: { item: { question: string; answer: string }; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-right transition-colors hover:bg-[#f7f9fc] sm:px-7"
        aria-expanded={open}
      >
        <span className="text-[16px] font-medium text-[#172554]">{item.question}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf0ff] text-[#3155e7]">
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-[14px] leading-7 text-[#64748b] sm:px-7">{item.answer}</div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#172554]" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/95 shadow-[0_3px_18px_rgba(23,37,84,0.05)] backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Link href="#top" className="flex shrink-0 items-center gap-3" aria-label="نوین بین">
            <span className="relative h-22 w-22 overflow-hidden rounded-xl bg-[#f4f6ff]" style={{ height: 88, width: 88 }}>
              <Image src="/images/1.png" alt="نوین‌بین" fill className="object-contain p-1" sizes="88px" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-[17px] font-bold leading-tight text-[#172554]">نوین‌بین</span>
              <span className="block text-[10px] font-medium text-slate-400">مدیریت یکپارچه سازمان</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="منوی اصلی">
            <Link className="text-[14px] font-medium text-[#172554] transition-colors hover:text-[#ff7a00]" href="#features">امکانات</Link>
            <Link className="text-[14px] font-medium text-[#172554] transition-colors hover:text-[#ff7a00]" href="#dashboard">داشبورد</Link>
            <Link className="text-[14px] font-medium text-[#172554] transition-colors hover:text-[#ff7a00]" href="#solutions">راهکارها</Link>
            <Link className="text-[14px] font-medium text-[#172554] transition-colors hover:text-[#ff7a00]" href="#about">درباره ما</Link>
            <Link className="text-[14px] font-medium text-[#172554] transition-colors hover:text-[#ff7a00]" href="#faq">سوالات</Link>
            <Link className="text-[14px] font-medium text-[#172554] transition-colors hover:text-[#ff7a00]" href="#contact">تماس با ما</Link>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/academy/login" className="rounded-[10px] border border-[#3155e7] px-4 py-2.5 text-[13px] font-medium text-[#3155e7] transition-colors hover:bg-[#f4f6ff]">ورود آموزشگاه</Link><Link href="/login" className="rounded-[10px] px-4 py-2.5 text-[13px] font-medium text-[#172554] transition-colors hover:bg-[#f4f6ff]">ورود به حساب</Link>
            <Link href="/register/customer" className="rounded-[10px] bg-[#ff7a00] px-5 py-3 text-[13px] font-medium text-white shadow-[0_8px_18px_rgba(255,122,0,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ee6d00]">شروع رایگان</Link>
          </div>

          <button type="button" className="rounded-lg p-2 text-[#172554] sm:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-5 py-4 sm:hidden">
            <nav className="flex flex-col gap-1">
              {['امکانات', 'داشبورد', 'راهکارها', 'درباره ما', 'سوالات', 'تماس با ما'].map((item, index) => (
                <Link key={item} href={['#features', '#dashboard', '#solutions', '#about', '#faq', '#contact'][index]} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-bold text-[#172554] hover:bg-[#f4f6ff]">{item}</Link>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <Link href="/academy/login" className="rounded-lg border border-[#3155e7] py-3 text-center text-sm font-medium text-[#3155e7]">ورود آموزشگاه</Link><Link href="/login" className="rounded-lg bg-[#172554] py-3 text-center text-sm font-medium text-white">ورود CRM</Link>
                <Link href="/register/customer" className="rounded-lg bg-[#ff7a00] py-3 text-center text-sm font-medium text-white">شروع رایگان</Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <section id="top" className="relative bg-[linear-gradient(120deg,#f5f8ff_0%,#ffffff_66%)]">
        <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#3155e7]/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute right-[42%] top-28 h-32 w-32 rounded-[40px] bg-[#ff7a00]/[0.07] blur-2xl" />
        <div className="relative mx-auto grid min-h-[620px] max-w-[1240px] items-center gap-14 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div className="order-1 max-w-[580px] animate-fade-in lg:order-2">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dbe3ff] bg-white px-4 py-2 text-xs font-bold text-[#3155e7] shadow-sm"><Sparkles className="h-4 w-4" /> ساده‌تر مدیریت کنید، سریع‌تر رشد کنید</div>
            <h1 className="max-w-[570px] text-[37px] font-bold leading-[1.45] tracking-tight text-[#172554] sm:text-[48px]">مدیریت هوشمند <span className="text-[#ff7a00]">ارتباط با مشتریان</span> در یک نگاه</h1>
            <p className="mt-6 max-w-[525px] text-[16px] font-light leading-8 text-[#64748b] sm:text-[18px]">نوین‌بین، پلتفرم یکپارچه‌ای برای مدیریت فروش، مشتریان و تمام فرآیندهای کسب‌وکار شماست؛ تا تیم‌تان با تمرکز بیشتر، نتیجه‌های بهتری بسازد.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/register/customer" className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-[#ff7a00] px-7 text-sm font-medium text-white shadow-[0_12px_24px_rgba(255,122,0,0.23)] transition hover:-translate-y-1 hover:bg-[#ee6d00]">شروع رایگان <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /></Link>
              <Link href="#dashboard" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] border border-[#3155e7] bg-white px-7 text-sm font-medium text-[#3155e7] transition hover:bg-[#f4f6ff]"><Play className="h-4 w-4 fill-current" /> مشاهده دموی محصول</Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[#ff7a00]" /> بدون نیاز به کارت بانکی</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[#ff7a00]" /> راه‌اندازی سریع</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-[#ff7a00]" /> پشتیبانی فارسی</span></div>
          </div>
          <div className="relative order-2 mx-auto w-full max-w-[580px] animate-slide-in-left lg:order-1">
            <div className="absolute -right-8 top-4 h-36 w-36 rounded-full bg-[#3155e7]/[0.09] blur-2xl" />
            <div className="absolute -bottom-10 -left-7 h-40 w-40 rounded-full bg-[#ff7a00]/[0.11] blur-2xl" />
            <div className="relative overflow-hidden rounded-[22px] border-[7px] border-white bg-white shadow-[0_20px_55px_rgba(23,37,84,0.16)]">
              <Image src="/images/ChatGPT_Image_Aug_15,_2026,_12_00_00_PM.png" alt="نمایی از داشبورد نوین‌بین" width={1672} height={941} priority className="h-auto w-full" sizes="(max-width: 1024px) 92vw, 580px" />
            </div>
            <div className="absolute -bottom-5 -right-5 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f8ef] text-[#16a05d]"><Zap className="h-5 w-5" /></span><span><b className="block text-sm text-[#172554]">رشد کسب‌وکار</b><small className="text-[10px] text-slate-400">همین امروز شروع کنید</small></span></div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white py-7">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-5 px-5 sm:flex-row sm:justify-between lg:px-8"><p className="text-sm font-bold text-[#64748b]">مورد اعتماد کسب‌وکارهای مدرن</p><div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-lg font-black text-slate-400/60 sm:gap-x-10">{trustedNames.map((name) => <span key={name}>{name}</span>)}</div></div>
      </section>

      <section id="features" className="bg-white px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[1240px]"><div className="mx-auto max-w-[620px] text-center"><span className="text-sm font-semibold text-[#ff7a00]">یک پلتفرم، تمام نیازهای شما</span><h2 className="mt-3 text-[30px] font-semibold text-[#172554] sm:text-[34px]">همه‌چیز برای رشد هوشمند کسب‌وکار</h2><p className="mt-4 text-[16px] leading-8 text-[#64748b]">ابزارهای کاربردی نوین‌بین، کار روزمره تیم شما را ساده‌تر و تصمیم‌ها را دقیق‌تر می‌کند.</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{featureCards.map(({ icon: Icon, title, description, tone }) => <div key={title} className="group rounded-2xl border border-[#e2e8f0] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#b9c7ff] hover:shadow-[0_18px_36px_rgba(49,85,231,0.1)]"><div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${tone === 'orange' ? 'bg-[#fff1e6] text-[#ff7a00]' : tone === 'green' ? 'bg-[#e8f8ef] text-[#16a05d]' : tone === 'violet' ? 'bg-[#eef0ff] text-[#6b65d9]' : 'bg-[#eaf0ff] text-[#3155e7]'}`}><Icon className="h-6 w-6" /></div><h3 className="text-[18px] font-semibold text-[#172554]">{title}</h3><p className="mt-3 text-[14px] leading-7 text-[#64748b]">{description}</p><ArrowUpLeft className="mt-5 h-5 w-5 text-[#3155e7] opacity-0 transition group-hover:opacity-100" /></div>)}</div></div>
      </section>

      <section id="dashboard" className="bg-[#f7f9fc] px-5 py-24 lg:px-8"><div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]"><div className="order-2 lg:order-1"><span className="inline-flex rounded-full bg-[#eaf0ff] px-4 py-2 text-xs font-semibold text-[#3155e7]">مدیریت یکپارچه</span><h2 className="mt-5 text-[30px] font-semibold leading-[1.6] text-[#172554] sm:text-[36px]">تصمیم‌های بهتر، با تصویر کامل کسب‌وکار</h2><p className="mt-4 text-[16px] leading-8 text-[#64748b]">در داشبورد نوین‌بین، مهم‌ترین شاخص‌ها و فعالیت‌های تیم را یکجا ببینید. دیگر لازم نیست بین چند ابزار مختلف جابه‌جا شوید.</p><ul className="mt-6 space-y-4 text-sm text-[#172554]"><li className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f8ef] text-[#16a05d]"><Check className="h-4 w-4" /></span>اطلاعات به‌روز در یک نمای ساده و خوانا</li><li className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f8ef] text-[#16a05d]"><Check className="h-4 w-4" /></span>گزارش‌های دقیق برای تصمیم‌گیری سریع‌تر</li><li className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f8ef] text-[#16a05d]"><Check className="h-4 w-4" /></span>دسترسی امن برای تمام اعضای تیم</li></ul><div className="mt-8 flex flex-wrap gap-5"><Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[#3155e7] hover:text-[#ff7a00]">ورود به داشبورد CRM <ChevronLeft className="h-4 w-4" /></Link><Link href="/academy/login" className="inline-flex items-center gap-2 text-sm font-medium text-[#3155e7] hover:text-[#ff7a00]">ورود به آموزشگاه <ChevronLeft className="h-4 w-4" /></Link></div></div><div className="order-1 rounded-[22px] border-8 border-white bg-white shadow-[0_20px_50px_rgba(23,37,84,0.12)] lg:order-2"><Image src="/images/ChatGPT_Image_Aug_15,_2026,_12_00_00_PM.png" alt="داشبورد مدیریتی نوین‌بین" width={1672} height={941} className="h-auto w-full rounded-xl" sizes="(max-width: 1024px) 92vw, 700px" /></div></div></section>

      <section id="solutions" className="bg-white px-5 py-24 lg:px-8"><div className="mx-auto max-w-[1240px]"><div className="text-center"><span className="text-sm font-semibold text-[#ff7a00]">برای هر مرحله از مسیر شما</span><h2 className="mt-3 text-[30px] font-semibold text-[#172554] sm:text-[34px]">قابلیت‌هایی که کسب‌وکار را جلو می‌برند</h2><p className="mx-auto mt-4 max-w-[620px] text-[16px] leading-8 text-[#64748b]">همه ابزارهای ضروری تیم‌های امروزی در فضایی منسجم و ساده کنار هم قرار گرفته‌اند.</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{capabilities.map(({ icon: Icon, title, description }, index) => <div key={title} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition hover:-translate-y-1 hover:border-[#c8d2ff] hover:shadow-lg"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${index % 2 === 0 ? 'bg-[#eaf0ff] text-[#3155e7]' : 'bg-[#fff1e6] text-[#ff7a00]'}`}><Icon className="h-5 w-5" /></div><div><h3 className="text-[16px] font-semibold text-[#172554]">{title}</h3><p className="mt-2 text-[13px] leading-6 text-[#64748b]">{description}</p></div></div>)}</div></div></section>

      <section id="about" className="px-5 pb-24 lg:px-8"><div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[24px] bg-[#2341c8] px-7 py-14 text-center shadow-[0_20px_45px_rgba(35,65,200,0.22)] sm:px-12"><div className="absolute -left-10 -top-20 h-48 w-48 rounded-full bg-[#ff7a00]/20 blur-2xl" /><div className="absolute -bottom-24 right-10 h-48 w-48 rounded-full bg-[#5d7aff]/30 blur-2xl" /><div className="relative"><span className="text-sm font-semibold text-[#ffbd83]">شروع یک تغییر بزرگ</span><h2 className="mx-auto mt-3 max-w-[680px] text-[30px] font-bold leading-[1.5] text-white sm:text-[38px]">کسب‌وکار خود را هوشمندتر مدیریت کنید</h2><p className="mx-auto mt-4 max-w-[580px] text-[15px] leading-8 text-white/80">همین امروز به جمع کسب‌وکارهایی بپیوندید که با نوین‌بین، سریع‌تر رشد می‌کنند.</p><Link href="/register/customer" className="mt-8 inline-flex h-[52px] items-center gap-2 rounded-[10px] bg-[#ff7a00] px-8 text-sm font-medium text-white transition hover:-translate-y-1 hover:bg-[#ee6d00]">شروع رایگان <ArrowLeft className="h-4 w-4" /></Link></div></div></section>

      <section id="faq" className="bg-[#f7f9fc] px-5 py-24 lg:px-8"><div className="mx-auto max-w-[800px]"><div className="text-center"><span className="text-sm font-semibold text-[#ff7a00]">پاسخ به پرسش‌های شما</span><h2 className="mt-3 text-[30px] font-semibold text-[#172554] sm:text-[34px]">سوالات پرتکرار</h2><p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-8 text-[#64748b]">اگر سوال دیگری دارید، تیم پشتیبانی ما خوشحال می‌شود کمک کند.</p></div><div className="mt-12 divide-y divide-[#e2e8f0] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">{faqItems.map((item, index) => <FaqRow key={index} item={item} defaultOpen={index === 0} />)}</div></div></section>

      <footer id="contact" className="bg-[#101b3d] px-5 py-16 text-white lg:px-8"><div className="mx-auto grid max-w-[1240px] gap-10 sm:grid-cols-2 lg:grid-cols-4"><div className="space-y-4"><Link href="#top" className="flex items-center gap-3"><span className="relative overflow-hidden rounded-xl bg-white/10" style={{ height: 88, width: 88 }}><Image src="/images/1.png" alt="نوین‌بین" fill className="object-contain p-1 invert brightness-200" sizes="88px" /></span><span><span className="block text-[17px] font-bold leading-tight text-white">نوین‌بین</span><span className="block text-[10px] font-medium text-slate-400">مدیریت یکپارچه سازمان</span></span></Link><p className="text-[13px] leading-7 text-slate-300">پلتفرم یکپارچه برای مدیریت هوشمند فروش، مشتریان و فرآیندهای کسب‌وکار شما.</p></div><div className="space-y-4"><h3 className="text-sm font-semibold text-white">امکانات</h3><ul className="space-y-2.5 text-[13px] text-slate-300"><li><Link href="#features" className="transition-colors hover:text-[#ff7a00]">گزارش‌گیری پیشرفته</Link></li><li><Link href="#dashboard" className="transition-colors hover:text-[#ff7a00]">داشبورد مدیریتی</Link></li><li><Link href="#solutions" className="transition-colors hover:text-[#ff7a00]">مدیریت فروش</Link></li><li><Link href="#solutions" className="transition-colors hover:text-[#ff7a00]">امور مالی</Link></li></ul></div><div className="space-y-4"><h3 className="text-sm font-semibold text-white">لینک‌های سریع</h3><ul className="space-y-2.5 text-[13px] text-slate-300"><li><Link href="/login" className="transition-colors hover:text-[#ff7a00]">ورود به حساب</Link></li><li><Link href="/register/customer" className="transition-colors hover:text-[#ff7a00]">شروع رایگان</Link></li><li><Link href="#faq" className="transition-colors hover:text-[#ff7a00]">سوالات پرتکرار</Link></li><li><Link href="#about" className="transition-colors hover:text-[#ff7a00]">درباره ما</Link></li></ul></div><div className="space-y-4"><h3 className="text-sm font-semibold text-white">تماس با ما</h3><ul className="space-y-3 text-[13px] text-slate-300"><li className="flex items-center gap-2.5"><Phone className="h-4 w-4 shrink-0 text-[#ff7a00]" /><span dir="ltr">021 1234 5678</span></li><li className="flex items-center gap-2.5"><Mail className="h-4 w-4 shrink-0 text-[#ff7a00]" /><span dir="ltr">info@novinbin.ir</span></li><li className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff7a00]" /><span>تهران، خیابان ولیعصر، پلاک ۱۲۳</span></li></ul><div className="flex gap-2.5 pt-1">{['تلگرام','اینستاگرام','لینکدین'].map((s) => <span key={s} className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-200 transition hover:bg-[#ff7a00] hover:text-white">{s}</span>)}</div></div></div><div className="mx-auto mt-12 max-w-[1240px] border-t border-white/10 pt-6"><p className="text-center text-xs text-[#94a3b8]">© ۱۴۰۵ نوین‌بین — تمامی حقوق محفوظ است.</p></div></footer>
    </main>
  );
}
