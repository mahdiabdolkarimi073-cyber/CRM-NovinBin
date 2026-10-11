import Image from 'next/image';
import { Play } from 'lucide-react';

const industries = [
  ['/images/ChatGPT_Image_Aug_30,_2026,_02_32_56_PM.png', 'صنعت'],
  ['/images/ChatGPT_Image_Aug_30,_2026,_02_39_21_PM.png', 'بازرگانی'],
  ['/images/ChatGPT_Image_Aug_30,_2026,_02_50_26_PM.png', 'خدماتی'],
  ['/images/ChatGPT_Image_Aug_30,_2026,_02_54_20_PM.png', 'ساختمان'],
];
const reviews = [
  ['مدیریت ارتباط با مشتریان برای ما بسیار ساده‌تر شده است.', 'مدیرعامل شرکت پارس'],
  ['نوین بین باعث شد تیم فروش ما منظم‌تر و سریع‌تر کار کند.', 'مدیر فروش آریا'],
  ['گزارش‌های مدیریتی دقیق، تصمیم‌گیری را برای ما آسان کرده است.', 'مدیر مجموعه سپهر'],
];

export default function TestimonialsSection() {
  return (
    <>
      <section id="industries" className="bg-white px-4 py-16 lg:px-6">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center">
            <span className="text-[14px] font-bold text-[#3d5be1]">راهکارهای صنعت‌محور</span>
            <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">صنایع و حوزه‌های فعالیت ما</h2>
            <p className="mt-3 text-[15px] font-medium text-slate-500">راهکارهای نوین بین برای نیازهای هر صنعت طراحی شده است.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-4">
            {industries.map(([image, title]) => (
              <div key={title} className="group overflow-hidden rounded-xl border border-[#edf1fa] bg-white p-3 text-center shadow-[0_7px_22px_rgba(30,62,150,.06)]">
                <div className="relative h-28 overflow-hidden rounded-lg">
                  <Image src={image} alt={title} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="200px" />
                </div>
                <b className="block py-2.5 text-[15px] font-bold text-[#10286d]">{title}</b>
                <small className="block pb-2 text-[12px] font-medium text-slate-500">راهکار تخصصی نوین بین</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="video" className="bg-[#f8faff] px-4 py-10 lg:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-col-reverse items-center gap-6 rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(30,62,150,.06)] sm:flex-row sm:justify-between sm:p-8">
          <div className="max-w-[400px] text-right">
            <span className="text-[13px] font-bold text-[#3d5be1]">نوین بین را بهتر بشناسید</span>
            <h2 className="mt-2 text-[22px] font-extrabold text-[#10286d]">با نوین بین، همیشه یک گام جلوتر باشید</h2>
            <p className="mt-3 text-[15px] font-medium leading-7 text-slate-500">داستان رشد کسب‌وکارهایی را ببینید که با نوین بین، مدیریت را ساده‌تر کرده‌اند.</p>
            <a href="#contact" className="mt-5 inline-flex rounded-full border-2 border-[#3158dd] px-5 py-2.5 text-[14px] font-bold text-[#3158dd]">تماشای ویدئو</a>
          </div>
          <div className="relative h-44 w-full overflow-hidden rounded-xl sm:w-[400px]">
            <Image src="/images/ChatGPT_Image_Aug_30,_2026,_02_50_26_PM copy.png" alt="ویدئوی معرفی نوین بین" fill className="object-cover" sizes="420px" />
            <span className="absolute inset-0 flex items-center justify-center bg-[#0e1e5a]/25">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#3158dd] shadow-lg">
                <Play className="h-5 w-5 fill-current" />
              </span>
            </span>
          </div>
        </div>
      </section>

      <section id="testimonials" className="bg-white px-4 py-16 lg:px-6">
        <div className="mx-auto max-w-[1100px] text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">نظر مشتریان</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">آنچه مشتریان ما می‌گویند</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.map(([text, name]) => (
              <div key={name} className="rounded-xl border border-[#edf1fa] bg-white p-5 text-right shadow-[0_7px_22px_rgba(30,62,150,.05)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf0ff] text-[14px] font-bold text-[#3158dd]">م</span>
                  <span>
                    <b className="block text-[15px] font-bold text-[#10286d]">{name}</b>
                    <small className="text-[12px] font-medium text-slate-500">مشتری نوین بین</small>
                  </span>
                </div>
                <p className="text-[15px] font-medium leading-7 text-slate-600">«{text}»</p>
                <div className="mt-4 text-[15px] tracking-[3px] text-[#ffad19]">★★★★★</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
