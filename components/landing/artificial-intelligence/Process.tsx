const steps = [
  ['۱', 'جمع‌آوری داده', 'داده‌های سازمان از فروش، انبار، مالی و رفتار مشتری به‌صورت خودکار جمع‌آوری و یکپارچه می‌شوند.'],
  ['۲', 'تحلیل هوشمند', 'هوش مصنوعی داده‌ها را تحلیل می‌کند: روندها، الگوها، آنومالی‌ها و ارتباط‌های پنهان شناسایی می‌شوند.'],
  ['۳', 'پیش‌بینی و مدل‌سازی', 'بر اساس داده تاریخی، مدل‌های پیش‌بینی ساخته می‌شوند: فروش، تقاضا، ریزش مشتری و موجودی.'],
  ['۴', 'توصیه‌های اجرایی', 'سیستم توصیه‌های اجرایی ارائه می‌دهد: چه اقدامی، چه زمانی و با چه اولویتی.'],
  ['۵', 'بهبود مستمر', 'مدل‌ها با داده‌های جدید به‌صورت مستمر بهبود می‌یابند. دقت پیش‌بینی و توصیه‌ها همیشه بالاتر می‌رود.'],
];

export default function AIProcess() {
  return (
    <section id="process" className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">فرآیند هوش مصنوعی</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            از داده تا تصمیم، در یک مسیر هوشمند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            مراحلی که داده سازمان شما را به تصمیم دقیق تبدیل می‌کند
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
