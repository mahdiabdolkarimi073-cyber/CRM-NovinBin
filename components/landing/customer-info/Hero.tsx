import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Database, Bell, ShieldCheck } from 'lucide-react';

export default function CustomerInfoHero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#f7faff]">
      <div className="relative min-h-[520px] lg:min-h-[620px]">
        <Image
          src="https://images.pexels.com/photos/3803517/pexels-photo-3803517.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
          alt="مدیریت متمرکز اطلاعات مشتریان و اعلانات نوین بین"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-white via-white/85 to-white/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-white/10" />
        <div className="relative mx-auto flex min-h-[520px] max-w-[1220px] items-center px-5 py-20 lg:min-h-[620px] lg:px-8">
          <div className="mr-auto w-full max-w-[580px] text-right lg:mr-0">
            <span className="inline-flex rounded-full border border-[#cdd8ff] bg-white/85 px-5 py-2.5 text-[13px] font-bold text-[#3154d8] shadow-sm">
              مدیریت متمرکز اطلاعات مشتریان
            </span>
            <h1 className="mt-6 text-[34px] font-extrabold leading-[1.55] text-[#10286d] sm:text-[46px]">
              مدیریت اطلاعات مشتریان و اعلانات در یک سیستم یکپارچه و هوشمند
            </h1>
            <p className="mt-5 max-w-[520px] text-[16px] font-medium leading-8 text-slate-600 sm:text-[18px]">
              با پلتفرم مدیریت اطلاعات مشتریان نوین بین، تمام داده‌های مشتریان خود را در یک
              پایگاه داده متمرکز جمع‌آوری، دسته‌بندی و مدیریت کنید. اعلالات هوشمند، دسترسی سریع
              و امنیت بالا، همگی در یک سیستم حرفه‌ای.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register/customer"
                className="inline-flex h-[52px] items-center gap-2 rounded-full bg-[#2851d9] px-8 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(40,81,217,.22)] transition hover:-translate-y-1 hover:bg-[#1e43bd]"
              >
                شروع رایگان <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link
                href="#process"
                className="inline-flex h-[52px] items-center gap-2 rounded-full border-2 border-[#2851d9] bg-white/85 px-7 text-[15px] font-bold text-[#2851d9] transition hover:bg-white"
              >
                <Database className="h-5 w-5" /> آشنایی با فرآیند
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-5">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#10286d]">
                <Bell className="h-5 w-5 text-[#2851d9]" /> اعلانات هوشمند
              </div>
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#10286d]">
                <ShieldCheck className="h-5 w-5 text-[#2851d9]" /> امنیت اطلاعات
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
