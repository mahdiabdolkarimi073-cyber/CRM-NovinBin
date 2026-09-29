import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, PlayCircle } from 'lucide-react';

export default function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#f7faff]">
      <div className="relative min-h-[560px] lg:min-h-[680px]">
        <Image src="/images/ChatGPT_Image_Sep_13,_2026,_12_18_29_PM.png" alt="تخت جمشید" fill priority className="object-cover object-center" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-l from-white via-white/80 to-white/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-white/10" />
        <div className="relative mx-auto flex min-h-[560px] max-w-[1220px] items-center px-5 py-20 lg:min-h-[680px] lg:px-8">
          <div className="mr-auto w-full max-w-[560px] text-right lg:mr-0">
            <span className="inline-flex rounded-full border border-[#cdd8ff] bg-white/80 px-5 py-2.5 text-[13px] font-bold text-[#3154d8] shadow-sm">راهکارهای نوین کسب‌وکار</span>
            <h1 className="mt-6 text-[38px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[52px]">مدیریت هوشمند ارتباط با مشتریان در یک نگاه</h1>
            <p className="mt-5 max-w-[500px] text-[16px] font-medium leading-8 text-slate-600 sm:text-[18px]">با پلتفرم یکپارچه نوین بین، مشتریان، فروش و فرآیندهای سازمان خود را هوشمندانه مدیریت کنید.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register/customer" className="inline-flex h-[54px] items-center gap-2 rounded-full bg-[#2851d9] px-8 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(40,81,217,.22)] transition hover:-translate-y-1 hover:bg-[#1e43bd]">شروع رایگان <ArrowLeft className="h-5 w-5" /></Link>
              <Link href="#video" className="inline-flex h-[54px] items-center gap-2 rounded-full border-2 border-[#2851d9] bg-white/80 px-7 text-[15px] font-bold text-[#2851d9] transition hover:bg-white"><PlayCircle className="h-5 w-5" /> مشاهده دموی محصول</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 border-t border-white/70 bg-white/85 shadow-[0_-8px_28px_rgba(40,81,217,.04)] backdrop-blur-sm">
        <div className="mx-auto grid max-w-[1220px] grid-cols-2 gap-6 px-5 py-6 sm:grid-cols-4 lg:px-8">
          {[['◉','گزارش‌های دقیق','گزارش‌گیری جامع و تحلیلی'],['◌','مدیریت هوشمند','ابزارهای پیشرفته برای مدیریت'],['◈','دسترسی سریع','دسترسی آسان و سریع به امکانات'],['◫','امنیت پیشرفته','محافظت از اطلاعات سازمان']].map(([icon,title,desc]) => (
            <div key={title} className="flex items-center gap-3 text-right">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef2ff] text-xl font-bold text-[#2851d9]">{icon}</span>
              <span>
                <b className="block text-[14px] font-bold text-[#10286d]">{title}</b>
                <small className="mt-1 block text-[11px] font-medium text-slate-500">{desc}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
      <a href="#features" className="absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 text-[#2851d9] lg:block"><ChevronDown className="h-6 w-6 animate-bounce" /></a>
    </section>
  );
}
