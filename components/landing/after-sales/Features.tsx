import {
  TicketIcon, MessageSquareHeart, ClipboardCheck, Bell,
  BarChart3, RefreshCw, ShieldCheck, Clock,
} from 'lucide-react';

const features = [
  [TicketIcon, 'مدیریت تیکت و درخواست', 'تمام درخواست‌های مشتریان در یک سیستم متمرکز ثبت، دسته‌بندی و پیگیری می‌شوند. دیگر هیچ درخواستی گم نمی‌شود.'],
  [MessageSquareHeart, 'سنجش رضایت مشتری', 'پس از هر تعامل، نظرسنجی خودکار ارسال می‌شود تا بدانید مشتری چقدر راضی بوده و کجا نیاز به بهبود دارید.'],
  [ClipboardCheck, 'پیگیری شکایات', 'شکایات مشتریان را اولویت‌بندی کنید، مسئول پیگیری تعیین کنید و مطمئن شوید هر شکایت تا انتها حل می‌شود.'],
  [Bell, 'یادآوری و اطلاع‌رسانی', 'مشتری را از وضعیت درخواستش مطلع کنید. پیامک و اطلاع‌رسانی خودکار، خیال مشتری را راحت می‌کند.'],
  [BarChart3, 'گزارش و تحلیل', 'با داشبورد تحلیلی، زمان پاسخ، نرخ رضایت، تعداد درخواست‌ها و روند آن‌ها را به‌صورت لحظه‌ای ببینید.'],
  [RefreshCw, 'مدیریت بازگشت کالا', 'فرآیند بازگشت کالا یا تعویض را شفاف و سریع مدیریت کنید تا تجربه مشتری حتی در این شرایط هم مثبت بماند.'],
  [ShieldCheck, 'امنیت و محرمانگی', 'اطلاعات درخواست‌های مشتریان با بالاترین استانداردهای امنیتی نگهداری می‌شود و دسترسی‌ها کنترل‌پذیر است.'],
  [Clock, 'پاسخ سریع و زمان‌مند', 'برای هر درخواست مهلت پاسخ تعیین کنید و با هشدارهای خودکار، مطمئن شوید هیچ مشتری منتظر نمی‌ماند.'],
];

export default function AfterSalesFeatures() {
  return (
    <section id="features" className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که مشتری را خوشحال نگه می‌دارند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            هر ابزاری که برای مدیریت حرفه‌ای خدمات پس از فروش نیاز دارید، در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof TicketIcon;
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
