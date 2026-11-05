const steps = [
  ['۱', 'دریافت تماس', 'تماس مشتری وارد سیستم می‌شود. سیستم به‌صورت خودکار شماره و تاریخچه تماس مشتری را شناسایی می‌کند.'],
  ['۲', 'توزیع هوشمند', 'تماس بر اساس نوع درخواست، تخصص کارشناس و بار کاری به مناسب‌ترین شخص ارجاع می‌شود.'],
  ['۳', 'پاسخ و ثبت مکالمه', 'کارشناس پاسخ می‌دهد و مکالمه ثبت می‌شود. اطلاعات تماس و درخواست در پروفایل مشتری ذخیره می‌گردد.'],
  ['۴', 'پیگیری و حل', 'درخواست مشتری پیگیری می‌شود تا حل کامل. در صورت نیاز، تماس‌های بعدی برنامه‌ریزی می‌شوند.'],
  ['۵', 'تحلیل کیفیت و بهبود', 'داده‌های تماس تحلیل می‌شوند: زمان پاسخ، رضایت مشتری و عملکرد کارشناس، برای بهبود مستمر.'],
];

export default function CallCenterProcess() {
  return (
    <section id="process" className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">فرآیند مرکز تماس</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            از دریافت تماس تا تحلیل کیفیت، در یک مسیر شفاف
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            مسیری که هر تماس را به تجربه‌ای عالی برای مشتری تبدیل می‌کند
          </p>
        </div>
        <div className="mt-10 space-y-4">
          {steps.map(([num, title, desc], i) => (
            <div key={num} className="flex items-start gap-4">
              <div className="relative flex flex-col items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2851d9] text-[16px] font-bold text-white shadow-[0_6px_16px_rgba(40,81,217,.2)]">
                  {num}
                </span>
                {i < steps.length - 1 && (
                  <span className="mt-1 h-full w-0.5 bg-gradient-to-b from-[#2851d9] to-[#e5ebf7]" />
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
