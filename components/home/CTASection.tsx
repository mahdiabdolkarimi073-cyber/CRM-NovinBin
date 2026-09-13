import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CTASection() {
  return (
    <section id="contact" className="bg-white px-5 py-12 lg:px-8">
      <div className="mx-auto flex max-w-[1080px] flex-col items-center justify-between gap-6 rounded-2xl bg-[#eef3ff] px-8 py-10 text-center sm:flex-row sm:text-right">
        <div>
          <span className="text-[14px] font-bold text-[#3158dd]">شروعی برای رشد بهتر</span>
          <h2 className="mt-3 text-[24px] font-extrabold text-[#10286d]">همین امروز مدیریت کسب‌وکار خود را متحول کنید</h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">با نوین بین، مسیر رشد سازمانتان را شفاف‌تر کنید.</p>
        </div>
        <Link href="/register/customer" className="inline-flex h-[52px] shrink-0 items-center gap-2 rounded-full bg-[#2851d9] px-8 text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(40,81,217,.18)] transition hover:-translate-y-0.5 hover:bg-[#1f43bd]">شروع رایگان <ArrowLeft className="h-5 w-5" /></Link>
      </div>
    </section>
  );
}
