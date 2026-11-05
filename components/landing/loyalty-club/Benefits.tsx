import { Check } from 'lucide-react';

const benefits = [
  'افزایش نرخ حفظ مشتری و کاهش ریزش',
  'رشد ارزش طولانی‌مدت مشتری با پاداش هوشمند',
  'افزایش تکرار خرید با امتیازدهی به هر تعامل',
  'دسته‌بندی مشتری و طرح وفاداری اختصاصی برای هر سطح',
  'اتصال مستقیم باشگاه وفاداری به فروش و CRM',
  'تصویری شفاف از تعامل و وفاداری هر مشتری',
];

export default function LoyaltyBenefits() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="text-right">
          <span className="text-[14px] font-bold text-[#1a9d6f]">مزایای باشگاه وفاداری هوشمند</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.5] text-[#10286d] sm:text-[30px]">
            وقتی مشتری پاداش می‌بیند، وفادار می‌شود
          </h2>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            جذب مشتری جدید پرهزینه است. وقتی هر خرید و تعامل به امتیاز و پاداش تبدیل شود،
            مشتری دلیل دارد برگردد و وفادار بماند.
          </p>
          <ul className="mt-6 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[15px] font-medium text-slate-600">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1a9d6f]" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#d6f3e8] bg-[#f4fdf9] p-6 text-right">
          <h3 className="text-[18px] font-bold text-[#10286d]">یک واقعیت ساده اما مهم</h3>
          <p className="mt-3 text-[15px] font-medium leading-7 text-slate-500">
            مطالعات نشان می‌دهد حدود ۶۵ درصد مشتریان به دلیل عدم احساس ارزش‌گذاری، سازمان را
            ترک می‌کنند نه به دلیل کیفیت پایین. این یعنی مشتری راضی لزوماً وفادار نیست، مگر
            اینکه سازمان او را ارزش‌گذاری کند.
          </p>
          <p className="mt-4 text-[15px] font-medium leading-7 text-slate-500">
            پلتفرم باشگاه وفاداری نوین بین با امتیازدهی و پاداش هوشمند، اطمینان می‌دهد که هر
            مشتری احساس ارزش‌گذاری می‌کند و دلیل دارد وفادار بماند.
          </p>
        </div>
      </div>
    </section>
  );
}
