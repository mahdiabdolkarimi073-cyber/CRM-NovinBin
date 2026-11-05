import {
  BarChart3, PieChart, LineChart, Download,
  Brain, Eye, ShieldCheck, Zap,
} from 'lucide-react';

const features = [
  [BarChart3, 'داشبورد مدیریتی زنده', 'داشبوردهای زنده و قابل‌فهم از فروش، هزینه، عملکرد تیم و روند کسب‌وکار. همه چیز در یک نگاه.'],
  [PieChart, 'تحلیل چندبعدی', 'داده‌ها را از ابعاد مختلف تحلیل کنید: زمان، محصول، منطقه، مشتری و تیم. الگوهای پنهان آشکار می‌شوند.'],
  [LineChart, 'روند و پیش‌بینی', 'روندها را شناسایی کنید و با مدل‌های پیش‌بینی، آینده کسب‌وکار را با اطمینان بیشتری برنامه‌ریزی کنید.'],
  [Download, 'گزارش‌های خودکار', 'گزارش‌های دوره‌ای (روزانه، هفتگی، ماهانه) به‌صورت خودکار تولید و برای مدیران ارسال می‌شوند.'],
  [Brain, 'تحلیل هوشمند', 'سیستم با تحلیل رفتار داده‌ها، الگوها و آنومالی‌ها را شناسایی و پیشنهادهای قابل اقدام ارائه می‌دهد.'],
  [Eye, 'نظارت لحظه‌ای KPI', 'شاخص‌های کلیدی عملکرد (KPI) را به‌صورت زنده پایش کنید و از انحراف از هدف مطلع شوید.'],
  [ShieldCheck, 'امنیت و حریم خصوصی', 'داده‌های کسب‌وکار با بالاترین استانداردهای امنیتی تحلیل و نگهداری می‌شوند.'],
  [Zap, 'سرعت در تحلیل', 'تحلیل‌های پیچیده در چند ثانیه انجام می‌شوند. دیگر نیازی به منتظر ماندن نیست.'],
];

export default function DataIntelligenceFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که داده را به تصمیم تبدیل می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از داشبورد زنده تا تحلیل عمیق و پیش‌بینی، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof BarChart3;
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
