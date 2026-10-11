const steps = [
  ['۱', 'مدیریت محصول و موجودی', 'محصولات، قیمت‌ها و موجودی را تعریف می‌کنید. موجودی به‌صورت خودکار با انبار همگام است و تغییرات لحظه‌ای اعمال می‌شود.'],
  ['۲', 'ثبت سفارش مشتری', 'مشتری در فروشگاه آنلاین سفارش ثبت می‌کند. سفارش به‌صورت خودکار به سیستم منتقل و موجودی بررسی می‌شود.'],
  ['۳', 'تأیید پرداخت', 'پرداخت از طریق درگاه امن انجام و به‌صورت خودکار تأیید می‌شود. فاکتور صادر و در سیستم مالی ثبت می‌گردد.'],
  ['۴', 'هماهنگی ارسال', 'سفارش به سیستم ارسال متصل می‌شود. مرسوله آماده، رهگیری می‌شود و مشتری از وضعیت مطلع می‌گردد.'],
  ['۵', 'تحلیل و بهینه‌سازی', 'داده‌های فروش تحلیل می‌شوند: پرفروش‌ترین محصولات، رفتار مشتری و نرخ تبدیل. تصمیم‌گیری بر اساس داده واقعی.'],
];

export default function ECommerceProcess() {
  return (
    <section id="process" className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">فرآیند تجارت الکترونیک</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            از ثبت محصول تا تحویل سفارش، در یک مسیر شفاف
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            مراحلی که هر سفارش آنلاین شما را به تحویل موفق تبدیل می‌کند
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
