import {
  Database, Users, Bell, Search,
  Tag, ShieldCheck, RefreshCw, LayoutGrid,
} from 'lucide-react';

const features = [
  [Database, 'پایگاه داده متمرکز', 'تمام اطلاعات مشتریان در یک پایگاه داده متمرکز جمع‌آوری و نگهداری می‌شود. دیگر داده‌ای پراکنده و گم‌شده نیست.'],
  [Users, 'پروفایل کامل مشتری', 'برای هر مشتری پروفایل کامل بسازید: اطلاعات تماس، تاریخچه خرید، تعامل‌ها و علایق، همه در یک صفحه.'],
  [Bell, 'اعلانات هوشمند', 'اعلانات خودکار برای رویدادهای مهم: تولد مشتری، تمدید قرارداد، سررسید پرداخت و فرصت‌های فروش مجدد.'],
  [Search, 'جستجوی سریع و پیشرفته', 'با جستجوی هوشمند، در میان هزاران مشتری، دقیقاً همان کسی را پیدا کنید که نیاز دارید.'],
  [Tag, 'دسته‌بندی و برچسب‌گذاری', 'مشتریان را بر اساس صنعت، حجم خرید، منطقه و رفتار دسته‌بندی کنید و برای هر گروه استراتژی جداگانه بسازید.'],
  [LayoutGrid, 'نمای یکپارچه ۳۶۰ درجه', 'در یک نگاه، تمام تعامل‌های هر مشتری را ببینید: خرید، تیکت، تماس، یادآوری و علایق.'],
  [ShieldCheck, 'امنیت و کنترل دسترسی', 'اطلاعات مشتریان با بالاترین استانداردهای امنیتی نگهداری می‌شود و دسترسی کاربران به‌صورت نقش‌محور کنترل می‌گردد.'],
  [RefreshCw, 'همگام‌سازی خودکار', 'داده‌های مشتری از کانال‌های مختلف به‌صورت خودکار جمع‌آوری و همگام می‌شوند تا همیشه به‌روز بمانید.'],
];

export default function CustomerInfoFeatures() {
  return (
    <section id="features" className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که اطلاعات مشتری را به سرمایه تبدیل می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از جمع‌آوری داده تا اعلالات هوشمند، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof Database;
            return (
              <div
                key={title as string}
                className="group rounded-xl border border-[#edf1fa] bg-white p-5 text-right shadow-[0_7px_25px_rgba(30,62,150,.06)] transition hover:-translate-y-1 hover:border-[#c6d2ff] hover:shadow-[0_12px_30px_rgba(40,81,217,.12)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0f4ff] text-[#3158dd] transition group-hover:bg-[#3158dd] group-hover:text-white">
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
