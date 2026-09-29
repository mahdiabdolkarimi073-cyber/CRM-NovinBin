import { Check } from 'lucide-react';

const benefits = [
  'کاهش کسری موجودی با همگام‌سازی خودکار فروش و انبار',
  'افزایش سرعت آماده‌سازی سفارش با رسید و حواله دیجیتال',
  'کاهش مازاد توقف با گزارش‌های تحلیلی موجودی',
  'اتصال مستقیم انبار به فروش، خرید و مالی',
  'شفافیت کامل در ارزش موجودی و جریان کالا',
  'موجودی‌برداری هوشمند با شناسایی خودکار اختلاف',
];

export default function WarehouseBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#1a9d6f]">مزایای انبارداری یکپارچه</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی انبار به فروش متصل می‌شود، هر کالا در جای درست است
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            مدیریت انبار تنها شمارش کالا نیست. وقتی موجودی به فروش و خرید متصل باشد، کسری و
            مازاد شفاف می‌شود و سفارش بدون تأخیر آماده می‌گردد.
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
            مطالعات نشان می‌دهد حدود ۴۵ درصد کسب‌وکارهایی که انبار جدا از فروش دارند، با
            مشکل کسری موجودی یا مازاد توقف مواجه می‌شوند. این یعنی مشتری سفارش می‌دهد ولی کالا
            نیست، یا کالا در انبار است ولی فروش نمی‌داند.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم انبارداری نوین بین با اتصال مستقیم به فروش و خرید، اطمینان می‌دهد که موجودی
            لحظه‌ای همیشه شفاف و آماده‌سازی سفارش بدون تأخیر است.
          </p>
        </div>
      </div>
    </section>
  );
}
