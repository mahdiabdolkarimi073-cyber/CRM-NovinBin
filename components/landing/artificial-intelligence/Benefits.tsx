import { Check } from 'lucide-react';

const benefits = [
  'تصمیم‌گیری بر اساس پیش‌بینی هوشمند نه حدس و گمان',
  'شناسایی الگوهای پنهان در رفتار مشتری و فروش',
  'کاهش هزینه عملیاتی با اتوماسیون هوشمند فرآیندها',
  'پیش‌بینی فروش و تقاضا برای برنامه‌ریزی دقیق‌تر',
  'توصیه‌های اجرایی برای اقدام به‌موقع و دقیق',
  'بهبود مستمر دقت تحلیل با یادگیری از داده‌های جدید',
];

export default function AIBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#1a9d6f]">مزایای هوش مصنوعی سازمانی</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی داده با هوش مصنوعی تحلیل می‌شود، تصمیم دقیق می‌شود
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            داده بدون تحلیل، ارزش پنهان است. وقتی هوش مصنوعی داده را تحلیل و به توصیه‌های
            اجرایی تبدیل کند، شما قبل از وقوع تصمیم می‌گیرید نه بعد از آن.
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
            مطالعات نشان می‌دهد بیش از ۶۵ درصد داده‌های سازمان‌ها هرگز تحلیل نمی‌شوند و به
            تصمیم تبدیل نمی‌گردند. این یعنی فرصت‌های رشد پنهان می‌مانند و ریسک‌ها دیر شناسایی
            می‌شوند.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم هوش مصنوعی نوین بین با تحلیل خودکار داده و ارائه توصیه‌های اجرایی، اطمینان
            می‌دهد که هر داده‌ای به تصمیمی دقیق و قابل اجرا تبدیل می‌شود.
          </p>
        </div>
      </div>
    </section>
  );
}
