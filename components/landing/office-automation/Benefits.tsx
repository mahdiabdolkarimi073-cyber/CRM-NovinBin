import { Check } from 'lucide-react';

const benefits = [
  'کاهش چشمگیر کاغذبازی و هزینه‌های اداری',
  'افزایش سرعت پردازش مکاتبات و فرآیندها',
  'شفافیت کامل در پیگیری هر نامه و فعالیت',
  'اطلاع‌رسانی خودکار درباره سررسید و تأخیر',
  'آرشیو دیجیتال با جستجوی سریع و دسترسی همیشگی',
  'تصویری شفاف از عملکرد اداری سازمان',
];

export default function OfficeBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#1a9d6f]">مزایای اتوماسیون اداری هوشمند</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی فرآیند اداری دیجیتال می‌شود، سرعت و شفافیت تضمین می‌شود
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            مدیریت مکاتبات و فعالیت‌ها به‌صورت سنتی، کند و کدر است. وقتی فرآیند دیجیتال و
            هوشمند شود، هر نامه رهگیری، هر فعالیت پیگیری و هر مصوبه اجرا می‌شود.
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
            مطالعات نشان می‌دهد حدود ۷۰ درصد سازمان‌ها هنوز بخشی از فرآیندهای اداری خود را به
            صورت کاغذی مدیریت می‌کنند. این یعنی نامه‌ها گم می‌شوند، پیگیری‌ها فراموش می‌گردد و
            مصوبات در انبوه فایل‌ها دفن می‌شوند.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم اتوماسیون اداری نوین بین با دیجیتالی کردن کامل فرآیند، اطمینان می‌دهد که هر
            نامه، فعالیت و مصوبه رهگیری، شفاف و قابل پیگیری است.
          </p>
        </div>
      </div>
    </section>
  );
}
