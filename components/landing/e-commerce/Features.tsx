import {
  ShoppingCart, Package, CreditCard, Truck,
  BarChart3, RefreshCw, ShieldCheck, Users,
} from 'lucide-react';

const features = [
  [ShoppingCart, 'مدیریت فروشگاه آنلاین', 'محصولات، دسته‌بندی‌ها، قیمت‌گذاری و موجودی را در یک پنل مرکزی مدیریت کنید. تغییرات به‌صورت لحظه‌ای در فروشگاه اعمال می‌شود.'],
  [Package, 'اتصال مستقیم به انبار', 'موجودی محصول به‌صورت خودکار با سفارش‌ها همگام می‌شود. وقتی سفارشی ثبت می‌شود، موجودی لحظه‌ای کاهش و وضعیت انبار به‌روز می‌گردد.'],
  [CreditCard, 'پرداخت آنلاین امن', 'اتصال به درگاه‌های پرداخت معتبر، تأیید خودکار پرداخت و صدور فاکتور. تمام تراکنش‌ها امن و قابل پیگیری هستند.'],
  [Truck, 'مدیریت ارسال و لجستیک', 'سفارش‌ها به‌صورت خودکار به سیستم ارسال متصل می‌شوند. رهگیری مرسوله، وضعیت تحویل و اطلاع‌رسانی مشتری همه خودکار است.'],
  [BarChart3, 'تحلیل فروش و عملکرد', 'گزارش‌های لحظه‌ای از فروش، پرفروش‌ترین محصولات، سبد خرید و رفتار مشتری در یک داشبورد تحلیلی.'],
  [RefreshCw, 'همگام‌سازی خودکار', 'تغییر قیمت، موجودی یا توضیحات محصول به‌صورت خودکار در فروشگاه و انبار همگام می‌شود. نیازی به ورود دستی نیست.'],
  [ShieldCheck, 'امنیت و شفافیت داده', 'تمام داده‌های سفارش، پرداخت و مشتری با بالاترین استانداردهای امنیتی نگهداری و دسترسی‌ها کنترل‌پذیر است.'],
  [Users, 'اتصال به CRM', 'هر سفارش به‌صورت خودکار به پروفایل مشتری در CRM متصل می‌شود. تاریخچه خرید، ترجیحات و رفتار مشتری در یک نگاه.'],
];

export default function ECommerceFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که فروش آنلاین را به موفقیت تبدیل می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از مدیریت محصول تا تحویل سفارش، همه در یک پلتفرم یکپارچه
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof ShoppingCart;
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
