const steps = [
  ['۱', 'جمع‌آوری داده', 'اطلاعات مشتریان از کانال‌های مختلف (فرم ثبت‌نام، تماس، خرید، تیکت) به‌صورت خودکار جمع‌آوری می‌شوند.'],
  ['۲', 'دسته‌بندی و ساختاردهی', 'داده‌ها بر اساس معیارهای تعریف‌شده دسته‌بندی و برچسب‌گذاری می‌شوند تا دسترسی و تحلیل آسان شود.'],
  ['۳', 'ساخت پروفایل مشتری', 'برای هر مشتری پروفایل کامل ساخته می‌شود: اطلاعات تماس، تاریخچه تعامل و علایق.'],
  ['۴', 'تنظیم اعلالات هوشمند', 'اعلانات خودکار برای رویدادهای مهم تنظیم می‌شوند تا هیچ فرصتی از دست نرود.'],
  ['۵', 'دسترسی و تحلیل', 'تیم شما به اطلاعات مشتری دسترسی سریع دارد و می‌تواند داده‌ها را برای تصمیم‌گیری تحلیل کند.'],
];

export default function CustomerInfoProcess() {
  return (
    <section id="process" className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">فرآیند مدیریت اطلاعات</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            از جمع‌آوری داده تا تصمیم‌گیری هوشمند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            مسیر شفافی که اطلاعات پراکنده را به دانش قابل استفاده تبدیل می‌کند
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
