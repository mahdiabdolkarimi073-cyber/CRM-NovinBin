import { BarChart3, Boxes, BriefcaseBusiness, ContactRound, FileText, Landmark, ShoppingCart, UsersRound } from 'lucide-react';

const features = [
  [Landmark, 'حسابداری', 'مدیریت مالی و حسابداری'],
  [ShoppingCart, 'خرید و سفارش', 'مدیریت خرید و سفارش‌ها'],
  [Boxes, 'خزانه و انبار', 'کنترل موجودی و انبار'],
  [BriefcaseBusiness, 'شرکت‌های خدماتی', 'مدیریت پروژه و خدمات'],
  [UsersRound, 'خزانه و دستمزد', 'پرداخت و مدیریت کارکنان'],
  [BarChart3, 'تولید', 'برنامه‌ریزی و کنترل تولید'],
  [FileText, 'کارتابل کاری', 'پیگیری فرآیندهای سازمان'],
  [ContactRound, 'CRM', 'ارتباط با مشتریان'],
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-white px-5 py-24 lg:px-8">
      <div className="mx-auto grid max-w-[1080px] items-center gap-14 lg:grid-cols-[1fr_.9fr]">
        <div className="order-2 text-right lg:order-1">
          <span className="text-[14px] font-bold text-[#3d5be1]">راهکارهای نوین کسب‌وکار شما</span>
          <h2 className="mt-4 text-[30px] font-extrabold leading-[1.6] text-[#10286d] sm:text-[36px]">ما به رشد کسب‌وکار شما متعهد هستیم</h2>
          <p className="mt-5 max-w-[460px] text-[16px] font-medium leading-8 text-slate-500">نوین بین مجموعه‌ای کامل از ابزارها و راهکارها را برای مدیریت بهتر و تصمیم‌گیری سریع‌تر کسب‌وکار شما فراهم می‌کند.</p>
          <a href="#solutions" className="mt-7 inline-flex items-center gap-2 text-[15px] font-bold text-[#2851d9]">مشاهده همه راهکارها <span className="text-lg">←</span></a>
        </div>
        <div className="order-1 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:order-2">
          {features.map(([Icon, title, desc]) => (
            <div key={title as string} className="group rounded-xl border border-[#edf1fa] bg-white p-5 text-center shadow-[0_7px_25px_rgba(30,62,150,.06)] transition hover:-translate-y-1 hover:border-[#c6d2ff] hover:shadow-[0_12px_30px_rgba(40,81,217,.12)]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f4ff] text-[#3158dd] transition group-hover:bg-[#3158dd] group-hover:text-white">
                <Icon className="h-6 w-6" />
              </span>
              <b className="mt-4 block text-[15px] font-bold text-[#10286d]">{title as string}</b>
              <small className="mt-1.5 block text-[12px] font-medium leading-5 text-slate-500">{desc as string}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
