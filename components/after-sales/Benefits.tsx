import { Check } from 'lucide-react';

const benefits = [
  'افزایش وفاداری مشتریان و کاهش نرخ ریزش',
  'شناسایی سریع مشکلات تکراری و ریشه‌ای',
  'کاهش هزینه پشتیبانی با اتوماسیون فرآیندها',
  'ایجاد تصویری حرفه‌ای و قابل اعتماد از برند شما',
  'دسترسی به داده‌های واقعی برای تصمیم‌گیری بهتر',
  'بهبود تجربه مشتری در تمام نقاط تماس',
];

export default function AfterSalesBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#3d5be1]">مزایای خدمات پس از فروش هوشمند</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی مشتری احساس می‌کند شنیده می‌شود، برنده می‌شوید
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            خدمات پس از فروش فقط حل مشکل نیست؛ ساختن رابطه‌ای است که مشتری به آن افتخار می‌کند.
            وقتی مشتری ببیند درخواستش سریع و جدی پیگیری می‌شود، به شما اعتماد می‌کند و شما را
            به دیگران پیشنهاد می‌دهد.
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
            مطالعات نشان می‌دهد که مشتریان ناراضی، تجربه بد خود را به حدود ۹ تا ۱۵ نفر نقل
            می‌کنند. اما مشتریان راضی، تجربه خوب خود را به ۴ تا ۶ نفر می‌گویند. تفاوت در این
            است که شما می‌توانید با خدمات پس از فروش قوی، تعداد مشتریان راضی را بیشتر کنید و
            از انتشار تجربه‌های منفی جلوگیری کنید.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            هر درخواستی که به‌خوبی حل می‌شود، فرصتی برای تبدیل یک مشتری عادی به یک سفیر برند
            شماست. نوین بین این فرصت‌ها را برای شما شکار می‌کند.
          </p>
        </div>
      </div>
    </section>
  );
}
