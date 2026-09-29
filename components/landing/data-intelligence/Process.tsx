const steps = [
  ['۱', 'جمع‌آوری و یکپارچه‌سازی داده', 'داده‌های کسب‌وکار از منابع مختلف (فروش، هزینه، مشتری، تیم) جمع‌آوری و در یک پایگاه یکپارچه ذخیره می‌شوند.'],
  ['۲', 'پاکسازی و ساختاردهی', 'داده‌ها پاکسازی، دسته‌بندی و ساختاردهی می‌شوند تا برای تحلیل آماده و قابل اعتماد باشند.'],
  ['۳', 'ساخت داشبورد و گزارش', 'داشبوردهای زنده و گزارش‌های دوره‌ای بر اساس نیاز مدیران طراحی و ساخته می‌شوند.'],
  ['۴', 'تحلیل و کشف بینش', 'داده‌ها تحلیل می‌شوند، الگوها و روندها شناسایی و بینش‌های قابل اقدام استخراج می‌شوند.'],
  ['۵', 'پیش‌بینی و تصمیم‌گیری', 'با مدل‌های پیش‌بینی، آینده کسب‌وکار برنامه‌ریزی می‌شود و تصمیم‌ها بر اساس داده گرفته می‌شوند.'],
];

export default function DataIntelligenceProcess() {
  return (
    <section id="process" className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">فرآیند هوش تجاری</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            از داده خام تا تصمیم هوشمند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            مسیری که داده‌های پراکنده را به بینش قابل اقدام تبدیل می‌کند
          </p>
        </div>
        <div className="mt-10 space-y-4">
          {steps.map(([num, title, desc], i) => (
            <div key={num} className="flex items-start gap-4">
              <div className="relative flex flex-col items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1a9d6f] text-[16px] font-bold text-white shadow-[0_6px_16px_rgba(26,157,111,.2)]">
                  {num}
                </span>
                {i < steps.length - 1 && (
                  <span className="mt-1 h-full w-0.5 bg-gradient-to-b from-[#1a9d6f] to-[#e5f7ef]" />
                )}
              </div>
              <div className="pb-6">
                <b className="block text-[16px] font-bold text-[#10286d]">{title}</b>
                <p className="mt-1.5 text-[14px] font-medium leading-7 text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
