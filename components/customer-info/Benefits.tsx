import { Check } from 'lucide-react';

const benefits = [
  'دسترسی سریع و آسان به تمام اطلاعات هر مشتری در یک صفحه',
  'کاهش زمان جستجو و افزایش بهره‌وری تیم پشتیبانی و فروش',
  'اعلانات هوشمند برای فرصت‌های فروش مجدد و تمدید قرارداد',
  'تصویر کامل ۳۶۰ درجه از هر مشتری برای تصمیم‌گیری بهتر',
  'امنیت بالا و کنترل دسترسی نقش‌محور به اطلاعات حساس',
  'همگام‌سازی خودکار داده‌ها از کانال‌های مختلف',
];

export default function CustomerInfoBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#3d5be1]">مزایای مدیریت متمرکز اطلاعات</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی اطلاعات متمرکز می‌شود، تصمیم‌ها هوشمندتر می‌شوند
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            اطلاعاتی که در یک جا جمع شده باشد، در یک نگاه قابل بررسی است. وقتی تیم شما بداند
            هر مشتری چه خرید کرده، چه درخواستی داشته و چه علایقی دارد، می‌تواند دقیق‌تر و
            سریع‌تر پاسخ دهد و فرصت‌های جدید را شناسایی کند.
          </p>
          <ul className="mt-6 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[15px] font-medium text-slate-600">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#3158dd]" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#edf1fa] bg-[#f8faff] p-6 text-right">
          <h3 className="text-[18px] font-bold text-[#10286d]">یک واقعیت ساده اما مهم</h3>
          <p className="mt-3 text-[15px] font-medium leading-7 text-slate-500">
            مطالعات نشان می‌دهد که کارمندان حدود ۳۰ درصد زمان کاری خود را صرف جستجوی اطلاعات
            مشتری در سیستم‌های مختلف می‌کنند. این یعنی در یک روز کاری ۸ ساعته، نزدیک به ۲.۵ ساعت
            فقط برای پیدا کردن داده‌ای هدر می‌رود که باید در یک نگاه در دسترس باشد.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم مدیریت اطلاعات مشتریان نوین بین با متمرکزسازی داده‌ها و اعلالات هوشمند،
            این زمان را به چند ثانیه کاهش می‌دهد و تیم شما را آزاد می‌کند تا روی کار ارزشمند
            تمرکز کند.
          </p>
        </div>
      </div>
    </section>
  );
}
