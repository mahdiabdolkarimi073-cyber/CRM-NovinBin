import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Truck, CreditCard } from 'lucide-react';

export default function ECommerceHero() {
  return (
    <section id="top" className="relative overflow-hidden bg-[#f0fbf7]">
      <div className="relative min-h-[520px] lg:min-h-[620px]">
        <Image
          src="https://images.pexels.com/photos/230390/pexels-photo-230390.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
          alt="تجارت الکترونیک و یکپارچه‌سازی فروش اینترنتی نوین بین"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-white via-white/85 to-white/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-white/10" />
        <div className="relative mx-auto flex min-h-[520px] max-w-[1220px] items-center px-5 py-20 lg:min-h-[620px] lg:px-8">
          <div className="mr-auto w-full max-w-[580px] text-right lg:mr-0">
            <span className="inline-flex rounded-full border border-[#b8e8d4] bg-white/85 px-5 py-2.5 text-[13px] font-bold text-[#1a9d6f] shadow-sm">
              یکپارچه‌سازی فروش اینترنتی
            </span>
            <h1 className="mt-6 text-[34px] font-extrabold leading-[1.55] text-[#10286d] sm:text-[46px]">
              تجارت الکترونیک؛ فروش اینترنتی متصل به کل سازمان
            </h1>
            <p className="mt-5 max-w-[520px] text-[16px] font-medium leading-8 text-slate-600 sm:text-[18px]">
              با پلتفرم تجارت الکترونیک نوین بین، فروشگاه آنلاین خود را به CRM، انبار، مالی و
              ارسال متصل کنید. سفارش، پرداخت، موجودی و ارسال، همه در یک سیستم یکپارچه.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register/customer"
                className="inline-flex h-[52px] items-center gap-2 rounded-full bg-[#1a9d6f] px-8 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(26,157,111,.22)] transition hover:-translate-y-1 hover:bg-[#168a60]"
              >
                شروع رایگان <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link
                href="#process"
                className="inline-flex h-[52px] items-center gap-2 rounded-full border-2 border-[#1a9d6f] bg-white/85 px-7 text-[15px] font-bold text-[#1a9d6f] transition hover:bg-white"
              >
                <ShoppingCart className="h-5 w-5" /> آشنایی با فرآیند
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-5">
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#10286d]">
                <CreditCard className="h-5 w-5 text-[#1a9d6f]" /> پرداخت آنلاین امن
              </div>
              <div className="flex items-center gap-2 text-[14px] font-bold text-[#10286d]">
                <Truck className="h-5 w-5 text-[#1a9d6f]" /> اتصال به انبار و ارسال
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
