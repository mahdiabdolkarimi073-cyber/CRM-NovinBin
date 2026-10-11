import {
  FileText, Wallet, Landmark, BarChart3,
  Receipt, CheckSquare, ShieldCheck, Calculator,
} from 'lucide-react';

const features = [
  [FileText, 'صدور و مدیریت فاکتور', 'فاکتورهای فروش و خرید را به‌صورت دیجیتال صادر کنید. اتصال مستقیم به سفارش‌ها و موجودی انبار.'],
  [Wallet, 'مدیریت پرداخت‌ها', 'پرداخت‌های نقدی و بانکی را پیگیری کنید. تأیید خودکار پرداخت با اتصال به درگاه و بانک.'],
  [Landmark, 'مدیریت چک و سفته', 'چک‌های دریافتی و پرداختی را ثبت کنید. رهگیری سررسید، وصول و برگشت چک در یک پنل.'],
  [BarChart3, 'گزارش‌های مالی لحظه‌ای', 'سود و زیان، ترازنامه، جریان نقدی و گزارش‌های تحلیلی به‌صورت لحظه‌ای در یک داشبورد.'],
  [Receipt, 'خزانه‌داری یکپارچه', 'موجی صندوق، بانک و تنخواه را در یک سیستم مدیریت کنید. ثبت خودکار تراکنش‌های خزانه‌داری.'],
  [CheckSquare, 'حسابداری هوشمند', 'اسناد حسابداری به‌صورت خودکار از فاکتورها و پرداخت‌ها تولید می‌شوند. نیازی به ورود دستی نیست.'],
  [ShieldCheck, 'امنیت و شفافیت مالی', 'تمام داده‌های مالی با بالاترین استانداردهای امنیتی نگهداری و دسترسی‌ها کنترل‌پذیر است.'],
  [Calculator, 'اتصال به فروش و انبار', 'هر فاکتور فروش یا خرید به‌صورت خودکار به انبار و CRM متصل می‌شود. ارزش موجودی لحظه‌ای محاسبه می‌گردد.'],
];

export default function FinanceFeatures() {
  return (
    <section id="features" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">امکانات پلتفرم</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            ابزارهایی که مدیریت مالی را شفاف می‌کنند
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            از فاکتور و چک تا خزانه‌داری و گزارش، همه در یک پلتفرم
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, desc]) => {
            const I = Icon as typeof FileText;
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
