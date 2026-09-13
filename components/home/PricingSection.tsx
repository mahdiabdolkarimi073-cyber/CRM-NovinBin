import Image from 'next/image';

const articles = [
  ['/images/ChatGPT_Image_Aug_21,_2026,_03_02_45_PM.png', 'چطور تجربه مشتری بهتری بسازیم؟'],
  ['/images/ChatGPT_Image_Aug_30,_2026,_02_39_21_PM.png', 'راهکارهای رشد فروش در سال جدید'],
  ['/images/ChatGPT_Image_Aug_30,_2026,_02_32_56_PM.png', 'مدیریت هوشمند فرآیندهای کسب‌وکار'],
  ['/images/ChatGPT_Image_Aug_30,_2026,_02_54_20_PM.png', 'نقش داده در تصمیم‌گیری مدیران'],
];

export default function PricingSection() {
  return (
    <section id="articles" className="bg-white px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-[1080px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">دانشنامه نوین بین</span>
          <h2 className="mt-3 text-[30px] font-extrabold text-[#10286d]">آخرین مقالات و اخبار</h2>
          <p className="mt-4 text-[15px] font-medium text-slate-500">تازه‌ترین مطالب آموزشی و مدیریتی برای رشد بهتر کسب‌وکار شما</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {articles.map(([image, title]) => (
            <article key={title} className="group overflow-hidden rounded-xl border border-[#edf1fa] bg-white shadow-[0_7px_22px_rgba(30,62,150,.05)]">
              <div className="relative h-40 overflow-hidden">
                <Image src={image} alt={title} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="250px" />
              </div>
              <div className="p-5 text-right">
                <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-bold text-[#3158dd]">مقاله</span>
                <h3 className="mt-3 text-[15px] font-bold leading-6 text-[#10286d]">{title}</h3>
                <p className="mt-2 text-[12px] font-medium text-slate-500">مطالعه مطلب و آشنایی با راهکارهای نوین</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
