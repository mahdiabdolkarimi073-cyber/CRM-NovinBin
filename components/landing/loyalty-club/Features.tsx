import {
  Gift, Award, Users, BarChart3,
  Star, Crown, ShieldCheck, RefreshCw,
} from 'lucide-react';

const features = [
  [Gift, 'امتیازدهی هوشمند', 'به هر خرید یا تعامل مشتری امتیاز اختصاص دهید. قوانین امتیازدهی قابل تنظیم و انعطاف‌پذیر.'],
  [Award, 'پاداش و جایزه', 'امتیازها را به پاداش، تخفیف یا هدیه تبدیل کنید. مدیریت کامل انواع پاداش در یک پنل.'],
  [Users, 'دسته‌بندی مشتری', 'مشتریان را بر اساس میزان خرید و تعامل دسته‌بندی کنید. طرح وفاداری اختصاصی برای هر سطح.'],
  [BarChart3, 'گزارش‌های تعامل', 'گزارش‌های تحلیلی از میزان تعامل، امتیاز و پاداش هر مشتری در یک داشبورد.'],
  [Star, 'سطح‌بندی وفاداری', 'مشتریان را در سطوح مختلف وفاداری قرار دهید: برنزی، نقره‌ای، طلایی. پاداش متناسب با سطح.'],
  [Crown, 'طرح VIP', 'طرح‌های وفاداری ویژه برای مشتریان خاص. مزایا و خدمات اختصاصی برای مشتریان ارزشمند.'],
  [ShieldCheck, 'امنیت و شفافیت', 'تمام امتیازها و پاداش‌ها با بالاترین استانداردهای امنیتی ثبت و شفاف هستند.'],
  [RefreshCw, 'اتصال به فروش و CRM', 'هر خرید به‌صورت خودکار به امتیاز متصل می‌شود. تعامل مشتری در CRM رهگیری می‌گردد.'],
];

export default function LoyaltyFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که مشتری را وفادار می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از امتیاز و پاداش تا دسته‌بندی و طرح VIP، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof Gift;
            return (
              <div
                key={title as string}
                className="group rounded-xl border border-[#d6f3e8] bg-white p-5 text-right shadow-[0_7px_25px_rgba(26,157,111,.06)] transition hover:-translate-y-1 hover:border-[#a8e6c8] hover:shadow-[0_12px_30px_rgba(26,157,111,.12)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eafaf3] text-[#1a9d6f] transition group-hover:bg-[#1a9d6f] group-hover:text-white">
                  <I className="h-6 w-6" />
                </span>
                <b className="mt-4 block text-[15px] font-bold text-[#10286d]">{title as string}</b>
                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">{desc as string}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
