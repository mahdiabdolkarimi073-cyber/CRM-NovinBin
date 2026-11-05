const steps = [
  ['۱', 'ثبت فاکتور و تراکنش', 'فاکتور فروش یا خرید صادر می‌شود و پرداخت یا دریافت ثبت می‌گردد. تمام تراکنش‌ها به‌صورت خودکار به حسابداری متصل می‌شوند.'],
  ['۲', 'مدیریت چک و خزانه', 'چک‌های دریافتی و پرداختی ثبت و رهگیری می‌شوند. موجودی صندوق و بانک به‌صورت لحظه‌ای به‌روز می‌گردد.'],
  ['۳', 'تولید اسناد حسابداری', 'اسناد حسابداری به‌صورت خودکار از فاکتورها و پرداخت‌ها تولید می‌شوند. نیازی به ورود دستی نیست.'],
  ['۴', 'تحلیل و گزارش‌گیری', 'سود و زیان، ترازنامه و جریان نقدی به‌صورت لحظه‌ای محاسبه و در داشبورد مالی نمایش داده می‌شوند.'],
  ['۵', 'تصمیم‌گیری داده‌محور', 'گزارش‌های تحلیلی به شما می‌گویند کجا سود می‌سازید، کجا هزینه می‌کنید و چه اقدامی لازم است.'],
];

export default function FinanceProcess() {
  return (
    <section id="process" className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">فرآیند مدیریت مالی</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            از فاکتور تا گزارش مالی، در یک مسیر شفاف
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            مراحلی که هر تراکنش مالی شما را به تصمیم داده‌محور تبدیل می‌کند
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
