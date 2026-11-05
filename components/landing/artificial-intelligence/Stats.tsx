const stats = [
  ['۸۰٪', 'افزایش دقت پیش‌بینی'],
  ['۲۵٪', 'کاهش هزینه عملیاتی'],
  ['۳x', 'سرعت تصمیم‌گیری'],
  ['۲۴/۷', 'تحلیل و پایش هوشمند'],
];

export default function AIStats() {
  return (
    <section className="bg-[#f4fdf9] px-4 py-14 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-5 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="rounded-xl border border-[#d6f3e8] bg-white p-5 text-center shadow-[0_7px_22px_rgba(26,157,111,.05)]">
            <b className="block text-[28px] font-extrabold text-[#1a9d6f] sm:text-[34px]">{value}</b>
            <small className="mt-2 block text-[13px] font-medium text-slate-500">{label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
