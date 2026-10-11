import {
  Package, Boxes, ArrowDownToLine, ArrowUpFromLine,
  BarChart3, RefreshCw, ShieldCheck, ClipboardCheck,
} from 'lucide-react';

const features = [
  [Package, 'مدیریت محصول و کالا', 'محصولات، دسته‌بندی‌ها، کد کالا و ویژگی‌ها را در یک پنل مرکزی مدیریت کنید.'],
  [Boxes, 'موجودی لحظه‌ای', 'موجودی هر کالا به‌صورت لحظه‌ای نمایش داده می‌شود. با هر ورود یا خروج، موجودی به‌روز می‌گردد.'],
  [ArrowDownToLine, 'رسید انبار', 'ورود کالا به انبار را به‌صورت دیجیتال ثبت کنید. رسید به‌صورت خودکار به موجودی متصل می‌شود.'],
  [ArrowUpFromLine, 'حواله انبار', 'خروج کالا از انبار را ثبت کنید. حواله به‌صورت خودکار موجودی را کاهش و به سفارش متصل می‌گردد.'],
  [BarChart3, 'گزارش‌های تحلیلی انبار', 'گزارش ارزش موجودی، پرفروش‌ترین کالاها، کسری و مازاد در یک داشبورد تحلیلی.'],
  [RefreshCw, 'همگام‌سازی با فروش', 'هر سفارش یا خرید به‌صورت خودکار به موجودی انبار متصل می‌شود. نیازی به ورود دستی نیست.'],
  [ShieldCheck, 'امنیت و شفافیت', 'تمام داده‌های انبار با بالاترین استانداردهای امنیتی نگهداری و دسترسی‌ها کنترل‌پذیر است.'],
  [ClipboardCheck, 'موجودی‌برداری هوشمند', 'موجودی‌برداری دوره‌ای را انجام دهید. تفاوت موجودی سیستمی و فیزیکی به‌صورت خودکار شناسایی می‌شود.'],
];

export default function WarehouseFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که انبار را شفاف می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از موجودی و رسید تا حواله و گزارش، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof Package;
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
