import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CTASection() {
  return (
    <section id="contact" className="bg-white px-4 py-10 lg:px-6">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-5 rounded-2xl bg-[#eef3ff] px-6 py-8 text-center sm:flex-row sm:text-right">
        <div>
          <span className="text-[14px] font-bold text-[#3158dd]">شروعی برای رشد بهتر</span>
          <h2 className="mt-2 text-[22px] font-extrabold text-[#10286d]">همین امروز مدیریت کسب‌وکار خود را متحول کنید</h2>
          <p className="mt-2 text-[15px] font-medium text-slate-500">با نوین بین، مسیر رشد سازمانتان را شفاف‌تر کنید.</p>
        </div>
        <Link href="/register/customer" className="inline-flex h-[44px] shrink-0 items-center gap-2 rounded-full bg-[#2851d9] px-7 text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(40,81,217,.18)] transition hover:-translate-y-0.5 hover:bg-[#1f43bd]">شروع رایگان <ArrowLeft className="h-5 w-5" /></Link>
      </div>
    </section>
  );
}
