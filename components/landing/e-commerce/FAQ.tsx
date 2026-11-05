'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم تجارت الکترونیک نوین بین چیست؟',
    'پلتفرمی است که فروشگاه آنلاین شما را به CRM، انبار، مالی و ارسال متصل می‌کند و تمام فرآیند فروش از ثبت محصول تا تحویل سفارش را در یک سیستم یکپارچه مدیریت می‌کند.',
  ],
  [
    'آیا موجودی انبار به‌صورت خودکار به‌روز می‌شود؟',
    'بله، وقتی سفارشی ثبت می‌شود، موجودی محصول به‌صورت خودکار کاهش و در فروشگاه و انبار همگام می‌گردد. نیازی به ورود دستی نیست.',
  ],
  [
    'آیا پرداخت آنلاین امن است؟',
    'بله، سیستم به درگاه‌های پرداخت معتبر متصل است و تمام تراکنش‌ها امن و قابل پیگیری هستند. پس از تأیید پرداخت، فاکتور به‌صورت خودکار صادر می‌شود.',
  ],
  [
    'آیا سفارش‌ها به CRM متصل می‌شوند؟',
    'بله، هر سفارش به‌صورت خودکار به پروفایل مشتری در CRM متصل می‌شود. تاریخچه خرید، ترجیحات و رفتار مشتری در یک نگاه قابل مشاهده است.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با چند محصول شروع کنید و به‌تدریج گسترش دهید.',
  ],
  [
    'آیا گزارش‌های تحلیلی فروش ارائه می‌شود؟',
    'بله، گزارش‌های لحظه‌ای از فروش، پرفروش‌ترین محصولات، سبد خرید، رفتار مشتری و نرخ تبدیل در یک داشبورد تحلیلی قابل مشاهده است.',
  ],
];

export default function ECommerceFAQ() {
  return (
    <section id="faq" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره تجارت الکترونیک نوین بین
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
