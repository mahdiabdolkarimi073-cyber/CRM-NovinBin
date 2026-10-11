import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function WarehouseCTA() {
  return (
    <section id="contact" className="bg-white px-4 py-10 lg:px-6">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-5 rounded-2xl bg-[#eafaf3] px-6 py-8 text-center sm:flex-row sm:text-right">
        <div>
          <span className="text-[14px] font-bold text-[#1a9d6f]">همین امروز شروع کنید</span>
          <h2 className="mt-2 text-[22px] font-extrabold text-[#10286d]">
            انبار شما باید به فروش متصل و شفاف باشد
          </h2>
          <p className="mt-2 text-[15px] font-medium text-slate-500">
            با نوین بین، از موجودی و رسید تا حواله و گزارش، همه چیز را یکپارچه مدیریت کنید.
          </p>
        </div>
        <Link
          href="/register/customer"
          className="inline-flex h-[44px] shrink-0 items-center gap-2 rounded-full bg-[#1a9d6f] px-7 text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(26,157,111,.18)] transition hover:-translate-y-0.5 hover:bg-[#168a60]"
        >
          شروع رایگان <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
