const steps = [
  ['۱', 'ثبت مکاتبه', 'نامه وارده یا صادره ثبت می‌شود. فرستنده، گیرنده، موضوع و مهلت تعیین می‌گردد.'],
  ['۲', 'ارجاع و تخصیص', 'نامه یا فعالیت به فرد مربوط ارجاع داده می‌شود. مسئول و مهلت پیگیری شفاف است.'],
  ['۳', 'پیگیری و اجرا', 'گیرنده ارجاع، فعالیت را انجام می‌دهد و وضعیت را به‌روز می‌کند. سیستم به‌صورت خودکار پیگیری می‌کند.'],
  ['۴', 'تأیید و بایگانی', 'پس از تکمیل، فرآیند تأیید و در آرشیو هوشمند بایگانی می‌شود. دسترسی همیشگی و جستجوی سریع.'],
  ['۵', 'تحلیل و بهبود', 'گزارش‌های تحلیلی نشان می‌دهند کدام فرآیندها کند و کدام سریع هستند. بهبود مستمر فرآیند.'],
];

export default function OfficeProcess() {
  return (
    <section id="process" className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">فرآیند اتوماسیون اداری</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            از ثبت نامه تا بایگانی، در یک مسیر شفاف
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            مراحلی که هر فرآیند اداری شما را به تکمیل سریع و شفاف تبدیل می‌کند
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
