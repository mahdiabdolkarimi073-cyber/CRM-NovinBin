import Image from 'next/image';
import { Check, ChevronLeft } from 'lucide-react';

export default function AboutSection() {
  return (
    <section id="dashboard" className="bg-[#f8faff] px-5 py-24 lg:px-8">
      <div className="mx-auto grid max-w-[1080px] items-center gap-14 lg:grid-cols-[.86fr_1.14fr]">
        <div className="order-2 text-right lg:order-1">
          <span className="text-[14px] font-bold text-[#3d5be1]">راهکارهای نوین کسب‌وکار</span>
          <h2 className="mt-4 text-[30px] font-extrabold leading-[1.6] text-[#10286d] sm:text-[34px]">نمایش حرفه‌ای اطلاعات در داشبورد شما</h2>
          <p className="mt-5 text-[16px] font-medium leading-8 text-slate-500">با یک نگاه، مهم‌ترین داده‌های کسب‌وکار خود را ببینید و با اطلاعات دقیق، تصمیم‌های بهتری بگیرید.</p>
          <ul className="mt-7 space-y-4 text-[15px] font-medium text-slate-600">
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#3158dd]" />اطلاعات به‌روز و قابل اعتماد</li>
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#3158dd]" />گزارش‌های دقیق برای تصمیم‌گیری سریع‌تر</li>
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-[#3158dd]" />دسترسی امن برای تمام اعضای تیم</li>
          </ul>
          <a href="/login" className="mt-7 inline-flex items-center gap-2 text-[15px] font-bold text-[#2851d9]">مشاهده داشبورد <ChevronLeft className="h-5 w-5" /></a>
        </div>
        <div className="order-1 rounded-2xl border-8 border-white bg-white p-1 shadow-[0_18px_45px_rgba(28,61,150,.12)] lg:order-2">
          <Image src="/images/ChatGPT_Image_Aug_15,_2026,_12_00_00_PM.png" alt="داشبورد نوین بین" width={1672} height={941} className="h-auto w-full rounded-lg" sizes="(max-width: 1024px) 92vw, 650px" />
        </div>
      </div>
    </section>
  );
}
