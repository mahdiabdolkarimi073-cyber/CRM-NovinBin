import Image from 'next/image';
import { Check, ChevronLeft } from 'lucide-react';

export default function AboutSection() {
  return (
    <section id="dashboard" className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-[.86fr_1.14fr]">
        <div className="order-2 text-right lg:order-1">
          <span className="text-[14px] font-bold text-[#3d5be1]">راهکارهای نوین کسب‌وکار</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">نمایش حرفه‌ای اطلاعات در داشبورد شما</h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">با یک نگاه، مهم‌ترین داده‌های کسب‌وکار خود را ببینید و با اطلاعات دقیق، تصمیم‌های بهتری بگیرید.</p>
          <ul className="mt-5 space-y-3 text-[15px] font-medium text-slate-600">
            <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[#3158dd]" />اطلاعات به‌روز و قابل اعتماد</li>
            <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[#3158dd]" />گزارش‌های دقیق برای تصمیم‌گیری سریع‌تر</li>
            <li className="flex items-center gap-2"><Check className="h-5 w-5 text-[#3158dd]" />دسترسی امن برای تمام اعضای تیم</li>
          </ul>
          <a href="/login" className="mt-5 inline-flex items-center gap-2 text-[15px] font-bold text-[#2851d9]">مشاهده داشبورد <ChevronLeft className="h-5 w-5" /></a>
        </div>
        <div className="order-1 rounded-2xl border-4 border-white bg-white p-1 shadow-[0_18px_45px_rgba(28,61,150,.12)] lg:order-2">
          <Image src="/images/ChatGPT_Image_Aug_15,_2026,_12_00_00_PM.png" alt="داشبورد نوین بین" width={1672} height={941} className="h-auto w-full rounded-lg" sizes="(max-width: 1024px) 92vw, 650px" />
        </div>
      </div>
    </section>
  );
}
