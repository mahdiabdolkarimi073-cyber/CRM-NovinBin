import { Check } from 'lucide-react';

const benefits = [
  'افزایش بازگشت سرمایه تبلیغاتی و کاهش هزینه جذب مشتری',
  'شناسایی کانال‌های پربازده و حذف کانال‌های زیان‌ده',
  'تصمیم‌گیری بر اساس داده واقعی به جای حدس و گمان',
  'اتصال مستقیم کمپین‌ها به سیستم CRM برای پیگیری لید',
  'صرفه‌جویی در بودجه با تخصیص هوشمند و خودکار',
  'تصویری حرفه‌ای و شفاف از عملکرد بازاریابی',
];

export default function AdCampaignBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#1a9d6f]">مزایای مدیریت کمپین هوشمند</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی کمپین داده‌محور می‌شود، هر ریال ارزش می‌سازد
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            تبلیغات فقط دیده شدن نیست؛ تبدیل شدن است. وقتی بدانید کدام کانال، کدام پیام و
            کدام مخاطب بیشترین تبدیل را تولید می‌کند، می‌توانید بودجه را دقیق جایی سرمایه‌گذاری
            کنید که بیشترین بازگشت را می‌دهد.
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
            مطالعات نشان می‌دهد که حدود ۵۵ درصد بودجه تبلیغاتی در کسب‌وکارهایی که مدیریت
            فرآیند‌محور ندارند، بدون بازگشت قابل اندازه‌گیری خرج می‌شود. یعنی بیش از نیمی از
            هزینه‌های تبلیغاتی بدون نتیجه شفاف از دست می‌رود.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم مدیریت کمپین‌های نوین بین با ارائه داده شفاف و بهینه‌سازی خودکار، اطمینان
            می‌دهد که هر ریال از بودجه شما در مسیر درست خرج می‌شود و نتیجه‌اش قابل اندازه‌گیری است.
          </p>
        </div>
      </div>
    </section>
  );
}
