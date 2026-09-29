import {
  Mail, ClipboardList, FileCheck, Clock,
  Users, Bell, ShieldCheck, Archive,
} from 'lucide-react';

const features = [
  [Mail, 'مدیریت مکاتبات', 'نامه‌های وارده و صادره را به‌صورت دیجیتال ثبت و رهگیری کنید. جستجو، دسته‌بندی و آرشیو هوشمند.'],
  [ClipboardList, 'مدیریت فعالیت‌ها', 'فعالیت‌ها و وظایف اداری را تعریف و پیگیری کنید. وضعیت، مهلت و مسئول هر فعالیت شفاف است.'],
  [FileCheck, 'مدیریت مصوبات', 'مصوبات جلسات و تصمیمات را ثبت و رهگیری کنید. پیگیری خودکار اجرای هر مصوبه.'],
  [Clock, 'رهگیری زمان‌بندی', 'مهلت هر نامه، فعالیت یا مصوبه را تعیین کنید و هشدار خودکار قبل از سررسید دریافت کنید.'],
  [Users, 'تخصیص و ارجاع', 'هر نامه یا فعالیت را به فرد مربوط ارجاع دهید. وضعیت پیگیری هر فرد در یک نگاه قابل مشاهده است.'],
  [Bell, 'اطلاع‌رسانی خودکار', 'سیستم به‌صورت خودکار درباره سررسید، تأخیر یا تکمیل هر فرآیند اطلاع می‌دهد.'],
  [ShieldCheck, 'امنیت و شفافیت', 'تمام مکاتبات و فرآیندها با بالاترین استانداردهای امنیتی نگهداری و دسترسی‌ها کنترل‌پذیر است.'],
  [Archive, 'آرشیو هوشمند', 'تمام مکاتبات و فعالیت‌ها به‌صورت دیجیتال آرشیو می‌شوند. جستجوی سریع و دسترسی همیشگی.'],
];

export default function OfficeFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که فرآیند اداری را شفاف می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از مکاتبات و فعالیت‌ها تا مصوبات و آرشیو، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof Mail;
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
