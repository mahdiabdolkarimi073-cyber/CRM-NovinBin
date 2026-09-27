import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative overflow-hidden px-4 py-12 text-white lg:px-6">
      <Image
        src="/images/ChatGPT_Image_Sep_13,_2026,_12_18_29_PM.png"
        alt=""
        fill
        aria-hidden="true"
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 mx-auto grid max-w-[1100px] gap-8 text-right sm:grid-cols-2 lg:grid-cols-4">
        <div dir="rtl" className="flex flex-col items-start">
          <Link href="#top" className="group flex flex-col items-start gap-3">
            <Image
              src="/images/1.png"
              alt="لوگوی نوین بین"
              width={180}
              height={180}
              className="h-36 w-36 object-contain transition-transform duration-300 group-hover:scale-105 sm:h-40 sm:w-40"
            />
            <span>
              <b className="block text-[18px] font-bold">نوین بین</b>
              <small className="mt-1 block max-w-sm text-[11px] font-medium leading-6 text-slate-300">شرکت مهندسی نوآوران نوین بین رادان آماده ارائه خدمات در حوزه دیجیتال مارکتینگ شامل طراحی و پشتیبانی سایت، سئو سایت، برنامه نویسی، طراحی اپلیکیشن،طراحی سیستم های هوشمند،ERP،CRM ،کلیه خدمات گرافیک،  تولید محتوا شامل تولید محتوای متنی و مدیریت هدفمند شبکه های اجتماعی به تمامی شرکت ها و موسسات می باشد.</small>
            </span>
          </Link>
          <a
            href="https://trustseal.enamad.ir/?id=528249&Code=gs5uBc2fEAp0znFxAR9r4KqYOSLTeUzd"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="مشاهده نماد اعتماد الکترونیکی نوین بین"
            className="mt-5 inline-flex rounded-lg bg-white/95 p-2 transition-transform duration-300 hover:scale-105"
          >
            <Image
              src="/images/logo-1_(1).png"
              alt="نماد اعتماد الکترونیکی"
              width={120}
              height={120}
              className="h-24 w-24 object-contain"
            />
          </a>
          <p className="mt-4 text-[14px] font-medium leading-7 text-slate-300">راهکاری یکپارچه برای مدیریت هوشمند فروش، مشتریان و فرآیندهای کسب‌وکار شما.</p>
        </div>
        <div>
          <h3 className="text-[15px] font-bold">دسترسی سریع</h3>
          <ul className="mt-4 space-y-3 text-[14px] font-medium text-slate-300">
            <li><Link href="#features" className="hover:text-white">محصولات و امکانات</Link></li>
            <li><Link href="#solutions" className="hover:text-white">راهکارها</Link></li>
            <li><Link href="#articles" className="hover:text-white">مقالات</Link></li>
            <li><Link href="#faq" className="hover:text-white">سوالات متداول</Link></li>
            <li><Link href="/login" className="hover:text-white">ورود به حساب</Link></li>
            <li><Link href="/register/customer" className="hover:text-white">ثبت‌نام رایگان</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-[15px] font-bold">خدمات نوین بین</h3>
          <ul className="mt-4 space-y-3 text-[14px] font-medium text-slate-300">
            <li><Link href="#" className="hover:text-white">سیستم های هوشمند CRM،ERP</Link></li>
            <li><Link href="https://novinbin.com/erp-crm/" className="hover:text-white">سیستم های هوشمند مدیریت قرارداد ها (CLM)</Link></li>
            <li><Link href="https://novinbin.com/what-is-website-design/" className="hover:text-white">طراحی سایت</Link></li>
            <li><Link href="https://novinbin.com/website-seo-services/" className="hover:text-white">سئو سایت</Link></li>
            <li><Link href="https://novinbin.com/what-is-content-production/" className="hover:text-white">تولید محتوا</Link></li>
            <li><Link href="https://novinbin.com/design-digital-catalog/" className="hover:text-white">طراحی کاتالوگ دیجیتال</Link></li>
            <li><Link href="https://novinbin.com/logo-design-_-brand-design/" className="hover:text-white">طراحی لوگو</Link></li>
            <li><Link href="https://novinbin.com/services/" className="hover:text-white">خدمات هاست</Link></li>
            <li><Link href="https://novinbin.com/best-digital-marketing/" className="hover:text-white">دیجیتال مارکتینگ</Link></li>
            <li><Link href="https://novinbin.com/programming-company/" className="hover:text-white">برنامه نویسی</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-[15px] font-bold">با ما در ارتباط باشید</h3>
          <ul className="mt-4 space-y-3 text-[14px] font-medium text-slate-300">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#ff9a18]" /><span dir="ltr">09190102069</span></li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#ff9a18]" /><span dir="ltr">09120733094</span></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#ff9a18]" /><span dir="ltr">info@novinbin.ir</span></li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ff9a18]" />تهران، خیابان انقلاب اسلامی، تقاطع خیابان ولیعصر، چهارراه ولیعصر (محدوده تئاتر شهر)</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ff9a18]" />کرمان، خیابان خواجوی کرمانی غربی، بین کوچه 29 و 31، مجتمع سلاطین</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ff9a18]" /> اصفهان،خیابان شیخ طوسی شرقی، خیابان گرکان، خیابان شهید رجایی </li>
          </ul>
          <div className="mt-4 flex gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-[#2851d9]"><Instagram className="h-5 w-5" /></span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-[#2851d9]"><Linkedin className="h-5 w-5" /></span>
          </div>
        </div>
      </div>
      <div className="relative z-10 mx-auto mt-10 max-w-[1100px] border-t border-white/10 pt-5 text-center text-[12px] font-medium text-slate-300">© ۱۴۰۵ نوین بین — تمامی حقوق این وب‌سایت محفوظ است.</div>
    </footer>
  );
}
