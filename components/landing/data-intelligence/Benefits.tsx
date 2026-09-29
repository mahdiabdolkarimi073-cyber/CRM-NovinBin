import { Check } from 'lucide-react';

const benefits = [
  'تصمیم‌گیری بر اساس داده واقعی به جای حدس و گمان',
  'شناسایی زودهنگام روند و فرصت‌های رشد',
  'کاهش خطای تصمیم با تحلیل چندبعدی و پیش‌بینی',
  'داشبورد زنده برای پایش لحظه‌ای شاخص‌های کلیدی',
  'گزارش‌های خودکار برای مدیران و ذی‌نفعان',
  'کشف الگوهای پنهان و آنومالی‌ها در داده‌ها',
];

export default function DataIntelligenceBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#1a9d6f]">مزایای هوش تجاری</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی داده به بینش تبدیل می‌شود، تصمیم‌ها درست می‌شوند
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            تصمیم‌گیری بر اساس داده، یعنی داشتن اطمینان به مسیر انتخاب‌شده. وقتی بدانید داده‌ها
            چه می‌گویند، به جای حدس زدن، می‌توانید با اطمینان تصمیم بگیرید و مسیر کسب‌وکار را
            با دقت بیشتری برنامه‌ریزی کنید.
          </p>
          <ul className="mt-6 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[15px] font-medium text-slate-600">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1a9d6f]" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#d6f3e8] bg-[#f4fdf9] p-6 text-right">
          <h3 className="text-[18px] font-bold text-[#10286d]">یک واقعیت ساده اما مهم</h3>
          <p className="mt-3 text-[15px] font-medium leading-7 text-slate-500">
            مطالعات نشان می‌دهد که حدود ۷۳ درصد تصمیم‌های مدیریتی در کسب‌وکارهایی که از هوش
            تجاری استفاده نمی‌کنند، بر اساس حدس و تجربه شخصی گرفته می‌شوند. این یعنی اکثر
            تصمیم‌ها بدون پشتوانه داده‌ای هستند و احتمال خطا در آن‌ها بالاست.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم هوش تجاری نوین بین با ارائه داشبوردهای زنده، تحلیل عمیق و پیش‌بینی، تصمیم‌های
            شما را از حدس به داده تبدیل می‌کند و احتمال موفقیت را به‌طور قابل‌ملاحظه‌ای افزایش می‌دهد.
          </p>
        </div>
      </div>
    </section>
  );
}
