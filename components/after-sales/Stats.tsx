const stats = [
  ['۹۵٪', 'میانگین رضایت مشتریان'],
  ['۳۰٪', 'کاهش زمان پاسخ‌گویی'],
  ['۲.۵x', 'افزایش بازگشت مشتری'],
  ['۲۴/۷', 'دسترسی به پورتال پشتیبانی'],
];

export default function AfterSalesStats() {
  return (
    <section className="bg-[#f8faff] px-4 py-14 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-5 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="rounded-xl border border-[#edf1fa] bg-white p-5 text-center shadow-[0_7px_22px_rgba(30,62,150,.05)]">
            <b className="block text-[28px] font-extrabold text-[#2851d9] sm:text-[34px]">{value}</b>
            <small className="mt-2 block text-[13px] font-medium text-slate-500">{label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
