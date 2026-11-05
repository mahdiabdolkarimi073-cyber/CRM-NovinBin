'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم مدیریت مالی نوین بین چیست؟',
    'پلتفرمی است که حسابداری، فاکتور، چک، خزانه‌داری و گزارش‌های مالی را در یک سیستم یکپارچه مدیریت می‌کند و به فروش و انبار متصل می‌سازد.',
  ],
  [
    'آیا اسناد حسابداری به‌صورت خودکار تولید می‌شوند؟',
    'بله، اسناد حسابداری به‌صورت خودکار از فاکتورها و پرداخت‌ها تولید می‌شوند. نیازی به ورود دستی اسناد نیست.',
  ],
  [
    'آیا می‌توانم چک‌ها را رهگیری کنم؟',
    'بله، چک‌های دریافتی و پرداختی قابل ثبت و رهگیری هستند. سررسید، وصول و برگشت چک در یک پنل قابل پیگیری است.',
  ],
  [
    'گزارش‌های مالی چه اطلاعاتی ارائه می‌دهند؟',
    'سود و زیان، ترازنامه، جریان نقدی، گزارش‌های تحلیلی فروش و هزینه‌ها از جمله گزارش‌هایی است که به‌صورت لحظه‌ای قابل مشاهده است.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با چند فاکتور شروع کنید و به‌تدریج گسترش دهید.',
  ],
  [
    'آیا مالی به فروش و انبار متصل است؟',
    'بله، هر فاکتور فروش یا خرید به‌صورت خودکار به انبار و CRM متصل می‌شود و ارزش موجودی به‌صورت لحظه‌ای محاسبه می‌گردد.',
  ],
];

export default function FinanceFAQ() {
  return (
    <section id="faq" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره مدیریت مالی نوین بین
          </p>
        </div>
        <Accordion
          type="single"
          collapsible
          defaultValue="item-0"
          className="mt-10 overflow-hidden rounded-2xl border border-[#d6f3e8] bg-white px-5 shadow-[0_8px_25px_rgba(26,157,111,.04)]"
        >
          {faqs.map(([question, answer], index) => (
            <AccordionItem key={question} value={`item-${index}`}>
              <AccordionTrigger className="text-right text-[16px] font-bold text-[#10286d] hover:no-underline">
                {question}
              </AccordionTrigger>
              <AccordionContent className="text-right text-[15px] font-medium leading-7 text-slate-500">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
