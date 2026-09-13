import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0b1b4b] px-5 py-14 text-white lg:px-8">
      <div className="mx-auto grid max-w-[1080px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="#top" className="flex items-center gap-3">
            <Image src="/images/1.png" alt="نوین بین" width={56} height={56} className="h-14 w-14 object-contain" />
            <span>
              <b className="block text-[16px] font-bold">نوین بین</b>
              <small className="text-[11px] font-medium text-slate-300">سیستم مدیریت ارتباط با مشتری</small>
            </span>
          </Link>
          <p className="mt-5 text-[14px] font-medium leading-7 text-slate-300">راهکاری یکپارچه برای مدیریت هوشمند فروش، مشتریان و فرآیندهای کسب‌وکار شما.</p>
        </div>
        <div>
          <h3 className="text-[15px] font-bold">دسترسی سریع</h3>
          <ul className="mt-5 space-y-3.5 text-[14px] font-medium text-slate-300">
            <li><Link href="#features" className="hover:text-white">محصولات و امکانات</Link></li>
            <li><Link href="#solutions" className="hover:text-white">راهکارها</Link></li>
            <li><Link href="#articles" className="hover:text-white">مقالات</Link></li>
            <li><Link href="#faq" className="hover:text-white">سوالات متداول</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-[15px] font-bold">خدمات مشتریان</h3>
          <ul className="mt-5 space-y-3.5 text-[14px] font-medium text-slate-300">
            <li><Link href="/login" className="hover:text-white">ورود به حساب</Link></li>
            <li><Link href="/register/customer" className="hover:text-white">ثبت‌نام رایگان</Link></li>
            <li><Link href="#contact" className="hover:text-white">تماس با ما</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-[15px] font-bold">با ما در ارتباط باشید</h3>
          <ul className="mt-5 space-y-3.5 text-[14px] font-medium text-slate-300">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#ff9a18]" /><span dir="ltr">021 1234 5678</span></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#ff9a18]" /><span dir="ltr">info@novinbin.ir</span></li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ff9a18]" />تهران، خیابان ولیعصر</li>
          </ul>
          <div className="mt-5 flex gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-[#2851d9]"><Instagram className="h-5 w-5" /></span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-[#2851d9]"><Linkedin className="h-5 w-5" /></span>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-[1080px] border-t border-white/10 pt-6 text-center text-[12px] font-medium text-slate-400">© ۱۴۰۵ نوین بین — تمامی حقوق این وب‌سایت محفوظ است.</div>
    </footer>
  );
}
