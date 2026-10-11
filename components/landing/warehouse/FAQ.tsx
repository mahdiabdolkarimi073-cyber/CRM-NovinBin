'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم انبارداری نوین بین چیست؟',
    'پلتفرمی است که موجودی کالا، رسید و حواله، سفارش‌ها و گزارش‌های انبار را در یک سیستم یکپارچه مدیریت می‌کند و به فروش و مالی متصل می‌سازد.',
  ],
  [
    'آیا موجودی به‌صورت لحظه‌ای به‌روز می‌شود؟',
    'بله، با هر ورود یا خروج کالا، موجودی به‌صورت خودکار به‌روز می‌شود و همیشه شفاف و قابل مشاهده است.',
  ],
  [
    'آیا رسید و حواله دیجیتال قابل ثبت است؟',
    'بله، ورود و خروج کالا به‌صورت دیجیتال ثبت می‌شود. رسید به‌صورت خودکار به موجودی متصل می‌گردد.',
  ],
  [
    'آیا انبار به فروش متصل است؟',
    'بله، هر سفارش یا خرید به‌صورت خودکار به موجودی انبار متصل می‌شود. نیازی به ورود دستی نیست.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با چند محصول شروع کنید و گسترش دهید.',
  ],
  [
    'آیا موجودی‌برداری دوره‌ای پشتیبانی می‌شود؟',
    'بله، موجودی‌برداری دوره‌ای قابل انجام است و تفاوت موجودی سیستمی و فیزیکی به‌صورت خودکار شناسایی می‌شود.',
  ],
];

export default function WarehouseFAQ() {
  return (
    <section id="faq" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره انبارداری نوین بین
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
