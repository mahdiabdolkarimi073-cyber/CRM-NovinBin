import {
  PhoneCall, PhoneForwarded, Headphones, Mic,
  BarChart3, Clock, ShieldCheck, Users,
} from 'lucide-react';

const features = [
  [PhoneCall, 'مدیریت تماس ورودی', 'تماس‌های ورودی به‌صورت هوشمند توزیع می‌شوند. هر تماس به مناسب‌ترین کارشناس ارجاع می‌شود تا سریع‌تر حل شود.'],
  [PhoneForwarded, 'مدیریت تماس خروجی', 'تماس‌های خروجی را برنامه‌ریزی و مدیریت کنید. لیست تماس، زمان‌بندی و پیگیری همگی در یک پنل.'],
  [Headphones, 'توزیع هوشمند تماس', 'سیستم تماس‌ها را بر اساس تخصص، دسترسی و بار کاری کارشناسان توزیع می‌کند تا کیفیت و سرعت بهینه شود.'],
  [Mic, 'ثبت و پیگیری مکالمات', 'تماس‌ها ثبت می‌شوند تا در صورت نیاز بازبینی شوند. تاریخچه کامل مکالمات هر مشتری در دسترس است.'],
  [BarChart3, 'تحلیل کیفیت و عملکرد', 'زمان مکالمه، نرخ پاسخ، رضایت مشتری و عملکرد هر کارشناس در داشبورد تحلیلی قابل مشاهده است.'],
  [Clock, 'صف انتظار و زمان پاسخ', 'زمان انتظار و زمان پاسخ به‌صورت زنده پایش می‌شوند تا هیچ مشتری‌ای بیش از حد منتظر نماند.'],
  [ShieldCheck, 'امنیت و محرمانگی', 'تماس‌ها و داده‌های مشتریان با بالاترین استانداردهای امنیتی نگهداری و دسترسی‌ها کنترل‌پذیر است.'],
  [Users, 'مدیریت تیم و شیفت', 'کارشناسان، شیفت‌ها و بار کاری را مدیریت کنید. اطمینان از پوشش کامل تماس‌ها در همه ساعات.'],
];

export default function CallCenterFeatures() {
  return (
    <section id="features" className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که هر تماس را به تجربه‌ای عالی تبدیل می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از مدیریت تماس تا تحلیل کیفیت، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof PhoneCall;
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
