import { Check } from 'lucide-react';

const benefits = [
  'تصمیم‌گیری مالی بر اساس داده لحظه‌ای به جای گزارش‌های با تأخیر',
  'کاهش خطای انسانی با خودکارسازی تولید اسناد حسابداری',
  'اتصال مستقیم مالی به فروش، خرید و انبار',
  'شفافیت کامل در جریان نقدی و سود و زیان',
  'رهگیری دقیق چک‌ها و مدیریت هوشمند سررسید',
  'صرفه‌جویی در زمان با گزارش‌گیری خودکار و لحظه‌ای',
];

export default function FinanceBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#1a9d6f]">مزایای مدیریت مالی یکپارچه</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی مالی به فروش متصل می‌شود، هر تصمیم داده‌محور می‌شود
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            مدیریت مالی تنها ثبت تراکنش نیست. وقتی فاکتور، چک، خزانه و گزارش به هم متصل باشند،
            شما تصویری شفاف از وضعیت مالی دارید و می‌توانید قبل از وقوع، تصمیم بگیرید.
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
            مطالعات نشان می‌دهد حدود ۵۰ درصد کسب‌وکارهای متوسط، به دلیل عدم اتصال بین فروش و
            حسابداری، تا پایان ماه نمی‌دانند دقیقاً چقدر سود یا زیان کرده‌اند. این یعنی تصمیم‌های
            کلیدی بدون داده شفاف گرفته می‌شود.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم مدیریت مالی نوین بین با اتصال مستقیم به فروش و انبار و تولید خودکار اسناد،
            اطمینان می‌دهد که هر لحظه تصویری دقیق و قابل اجرا از وضعیت مالی سازمان دارید.
          </p>
        </div>
      </div>
    </section>
  );
}
