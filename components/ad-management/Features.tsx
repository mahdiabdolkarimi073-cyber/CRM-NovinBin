import {
  Megaphone, Target, BarChart3, RefreshCw,
  Users, Wallet, ShieldCheck, Zap,
} from 'lucide-react';

const features = [
  [Megaphone, 'مدیریت کمپین', 'کمپین‌های تبلیغاتی را در همه پلتفرم‌ها از یک پنل مرکزی طراحی، زمان‌بندی و منتشر کنید.'],
  [Target, 'هدف‌گذاری دقیق مخاطب', 'مخاطبان را بر اساس سن، موقعیت، علایق و رفتار دسته‌بندی کنید و پیام درست را به فرد درست برسانید.'],
  [BarChart3, 'تحلیل و گزارش لحظه‌ای', 'عملکرد هر کمپین را به‌صورت زنده ببینید: کلیک، نمایش، تبدیل، هزینه و بازگشت سرمایه.'],
  [RefreshCw, 'بهینه‌سازی خودکار', 'سیستم به‌صورت خودکار کمپین‌های ضعیف را شناسایی و بودجه را به سمت پربازدهترین کانال‌ها هدایت می‌کند.'],
  [Users, 'مدیریت مخاطبان', 'لیست مخاطبان را بسازید، دسته‌بندی کنید و برای هر گروه پیام شخصی‌سازی شده ارسال کنید.'],
  [Wallet, 'کنترل بودجه', 'برای هر کمپین بودجه تعیین کنید، هزینه‌ها را لحظه‌ای پیگیری کنید و از هدررفت بودجه جلوگیری کنید.'],
  [ShieldCheck, 'امنیت و شفافیت', 'تمام داده‌های کمپین و مخاطبان با بالاترین استانداردهای امنیتی نگهداری می‌شود.'],
  [Zap, 'سرعت در اجرا', 'کمپین را در چند دقیقه طراحی و منتشر کنید. بدون واسطه، بدون تاخیر، مستقیم از پنل شما.'],
];

export default function AdManagementFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که هر ریال تبلیغاتی را به مشتری تبدیل می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از طراحی کمپین تا تحلیل نتیجه، همه چیز در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof Megaphone;
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
