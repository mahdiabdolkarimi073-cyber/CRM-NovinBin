import { Check } from 'lucide-react';

const benefits = [
  'افزایش رضایت مشتری با پاسخ سریع و حرفه‌ای',
  'کاهش زمان انتظار و بهبود تجربه تماس',
  'ثبت و بازبینی مکالمات برای بهبود مستمر',
  'تحلیل عملکرد کارشناسان و شناسایی نقاط ضعف',
  'توزیع هوشمند تماس برای بهره‌وری بالاتر',
  'داشبورد زنده برای پایش لحظه‌ای کیفیت',
];

export default function CallCenterBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#3d5be1]">مزایای مرکز تماس هوشمند</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی تماس مدیریت می‌شود، مشتری احساس می‌کند مهم است
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            تماس تلفنی لحظه‌ای حساس است. وقتی مشتری تماس می‌گیرد و سریع و حرفه‌ای پاسخ داده
            می‌شود، احساس می‌کند برای شما مهم است. این احساس، وفاداری می‌سازد و فروش افزایش
            می‌دهد.
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
            مطالعات نشان می‌دهد که حدود ۶۰ درصد مشتریان تماس‌های پاسخ‌نشده یا با تاخیر طولانی
            را به عنوان دلیل اصلی نارضایتی ذکر می‌کنند. هر تماس پاسخ‌نشده، یک فرصت از دست رفته
            و یک مشتری ناراضی است.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم مرکز تماس نوین بین با توزیع هوشمند تماس، پایش زمان انتظار و تحلیل کیفیت،
            اطمینان می‌دهد که هر تماس پاسخ داده می‌شود و هر مشتری احساس می‌کند شنیده شده است.
          </p>
        </div>
      </div>
    </section>
  );
}
