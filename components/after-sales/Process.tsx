const steps = [
  ['۱', 'ثبت درخواست', 'مشتری درخواست خود را از طریق پورتال، پیامک یا تماس ثبت می‌کند. سیستم به‌صورت خودکار یک شماره پیگیری اختصاص می‌دهد.'],
  ['۲', 'دسته‌بندی و تخصیص', 'درخواست بر اساس نوع و اولویت دسته‌بندی می‌شود و به کارشناس مناسب ارجاع داده می‌شود.'],
  ['۳', 'پیگیری و حل', 'کارشناس درخواست را بررسی می‌کند، با مشتری در ارتباط است و تا حل کامل مشکل پیش می‌رود.'],
  ['۴', 'سنجش رضایت', 'پس از حل درخواست، نظرسنجی خودکار ارسال می‌شود و میزان رضایت مشتری ثبت می‌گردد.'],
  ['۵', 'تحلیل و بهبود', 'داده‌های رضایت و زمان پاسخ تحلیل می‌شوند تا نقاط ضعف شناسایی و فرآیند بهبود یابد.'],
];

export default function AfterSalesProcess() {
  return (
    <section id="process" className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">فرآیند خدمات پس از فروش</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            از ثبت درخواست تا لبخند رضایت
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            مسیر شفاف و ساختاریافته‌ای که هیچ درخواستی در میان راه گم نمی‌شود
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
