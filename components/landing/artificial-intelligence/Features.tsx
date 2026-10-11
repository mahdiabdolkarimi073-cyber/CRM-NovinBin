import {
  Brain, TrendingUp, Sparkles, BarChart3,
  Users, Zap, ShieldCheck, Lightbulb,
} from 'lucide-react';

const features = [
  [Brain, 'تحلیل هوشمند داده', 'داده‌های سازمان به‌صورت خودکار تحلیل می‌شوند. الگوها، روند و آنومالی‌ها در یک نگاه قابل مشاهده.'],
  [TrendingUp, 'پیش‌بینی فروش', 'بر اساس داده تاریخی و الگوهای رفتاری، فروش آینده پیش‌بینی می‌شود. تصمیم بر اساس آینده نه گذشته.'],
  [Sparkles, 'تشخیص خودکار الگو', 'سیستم الگوهای پنهان در رفتار مشتری، فروش و انبار را شناسایی و به شما گزارش می‌دهد.'],
  [BarChart3, 'داشبورد تحلیلی AI', 'تحلیل‌های هوشمند در یک داشبورد قابل مشاهده. از روندها تا پیش‌بینی‌ها و توصیه‌های اجرایی.'],
  [Users, 'تحلیل رفتار مشتری', 'رفتار خرید، ترجیحات و چرخه عمر مشتری تحلیل می‌شود. دسته‌بندی هوشمند برای بازاریابی دقیق.'],
  [Zap, 'اتوماسیون هوشمند', 'فرآیندهای تکراری با هوش مصنوعی خودکار می‌شوند. از دسته‌بندی داده تا تولید گزارش.'],
  [ShieldCheck, 'امنیت و حریم خصوصی', 'تمام داده‌ها با بالاترین استانداردهای امنیتی پردازش و حریم خصوصی مشتری رعایت می‌شود.'],
  [Lightbulb, 'توصیه‌های اجرایی', 'سیستم نه تنها تحلیل می‌کند، بلکه توصیه‌های اجرایی ارائه می‌دهد: چه اقدامی، چه زمانی.'],
];

export default function AIFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که داده را به تصمیم تبدیل می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از تحلیل و پیش‌بینی تا تشخیص الگو و توصیه، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof Brain;
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
