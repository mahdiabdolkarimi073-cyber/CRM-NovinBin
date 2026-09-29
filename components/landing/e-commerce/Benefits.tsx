import { Check } from 'lucide-react';

const benefits = [
  'کاهش خطای انسانی با خودکارسازی فرآیند سفارش تا تحویل',
  'اتصال مستقیم فروش آنلاین به CRM، انبار و مالی',
  'افزایش رضایت مشتری با اطلاع‌رسانی خودکار وضعیت سفارش',
  'تصمیم‌گیری بر اساس داده واقعی فروش و رفتار مشتری',
  'صرفه‌جویی در زمان با همگام‌سازی خودکار موجودی و قیمت',
  'تصویری شفاف از عملکرد فروش در یک داشبورد تحلیلی',
];

export default function ECommerceBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#1a9d6f]">مزایای تجارت الکترونیک یکپارچه</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی فروش آنلاین به سازمان متصل می‌شود، هر سفارش به موفقیت تبدیل می‌شود
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            فروش اینترنتی تنها یک صفحه خرید نیست. وقتی سفارش، پرداخت، انبار و ارسال به هم متصل
            باشند، مشتری تجربه‌ای روان و شفاف دارد و شما داده‌ای دقیق برای تصمیم‌گیری دارید.
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
            مطالعات نشان می‌دهد حدود ۶۰ درصد کسب‌وکارهایی که فروش آنلاین دارند، به دلیل عدم
            اتصال بین فروش و انبار، با مشکلات موجودی و تأخیر در ارسال مواجه می‌شوند که مستقیماً
            به نارضایتی مشتری و ریزش سفارش منجر می‌گردد.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم تجارت الکترونیک نوین بین با اتصال مستقیم فروش به انبار، مالی و CRM، اطمینان
            می‌دهد که هر سفارش از ثبت تا تحویل، روان، شفاف و بدون خطا پیش می‌رود.
          </p>
        </div>
      </div>
    </section>
  );
}
