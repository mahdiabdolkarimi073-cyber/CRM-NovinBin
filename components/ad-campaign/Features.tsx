import {
  Rocket, Target, BarChart3, RefreshCw,
  Calendar, Wallet, ShieldCheck, Gauge,
} from 'lucide-react';

const features = [
  [Rocket, 'طراحی و اجرای کمپین', 'کمپین‌های تبلیغاتی را با ابزارهای حرفه‌ای طراحی کنید. پیام، تصویر، کانال و زمان‌بندی همگی در یک پنل مرکزی.'],
  [Target, 'هدف‌گذاری دقیق مخاطب', 'مخاطبان را بر اساس رفتار، موقعیت، علایق و مرحله خرید دسته‌بندی کنید و پیام درست را به فرد درست برسانید.'],
  [BarChart3, 'تحلیل عملکرد لحظه‌ای', 'عملکرد هر کمپین را به‌صورت زنده ببینید: کلیک، نمایش، تبدیل، هزینه و بازگشت سرمایه در یک داشبورد.'],
  [RefreshCw, 'بهینه‌سازی خودکار', 'سیستم کمپین‌های ضعیف را شناسایی و بودجه را به‌صورت خودکار به سمت پربازدهترین کانال‌ها هدایت می‌کند.'],
  [Calendar, 'زمان‌بندی هوشمند', 'زمان انتشار کمپین را بر اساس رفتار مخاطبان و بهترین زمان‌های تبدیل تعیین کنید تا بیشترین بازده را داشته باشید.'],
  [Wallet, 'مدیریت بودجه کمپین', 'برای هر کمپین بودجه روزانه یا کل تعیین کنید، هزینه‌ها را لحظه‌ای پیگیری کنید و از هدررفت جلوگیری کنید.'],
  [ShieldCheck, 'امنیت و شفافیت داده', 'تمام داده‌های کمپین و مخاطبان با بالاترین استانداردهای امنیتی نگهداری و دسترسی‌ها کنترل‌پذیر است.'],
  [Gauge, 'سنجش بازگشت سرمایه', 'بازگشت سرمایه هر کمپین را به‌صورت دقیق محاسبه کنید و بدانید هر ریال هزینه چقدر ارزش ساخته است.'],
];

export default function AdCampaignFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که هر کمپین را به موفقیت تبدیل می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از طراحی کمپین تا تحلیل عمیق و بهینه‌سازی، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof Rocket;
            return (
              <div
                key={title as string}
                className="group rounded-xl border border-[#d6f3e8] bg-white p-5 text-right shadow-[0_7px_25px_rgba(26,157,111,.06)] transition hover:-translate-y-1 hover:border-[#a8e6c8] hover:shadow-[0_12px_30px_rgba(26,157,111,.12)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eafaf3] text-[#1a9d6f] transition group-hover:bg-[#1a9d6f] group-hover:text-white">
                  <I className="h-6 w-6" />
                </span>
                <b className="mt-4 block text-[15px] font-bold text-[#10286d]">{title as string}</b>
                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">{desc as string}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
