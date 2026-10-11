'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم مدیریت تبلیغات نوین بین چیست؟',
    'پلتفرمی است که به شما کمک می‌کند کمپین‌های تبلیغاتی خود را از طراحی تا انتشار، پایش عملکرد، تحلیل نتایج و بهینه‌سازی بودجه در یک جای متمرکز مدیریت کنید.',
  ],
  [
    'آیا می‌توانم در چند پلتفرم همزمان تبلیغ کنم؟',
    'بله، می‌توانید کمپین‌های خود را در کانال‌های مختلف از یک پنل مرکزی طراحی و منتشر کنید و عملکرد همه را در یک داشبورد ببینید.',
  ],
  [
    'آیا بودجه هر کمپین قابل کنترل است؟',
    'بله، برای هر کمپین می‌توانید بودجه روزانه یا کل تعیین کنید و هزینه‌ها را به‌صورت لحظه‌ای پیگیری کنید تا از هدررفت بودجه جلوگیری شود.',
  ],
  [
    'گزارش‌های تحلیلی چه اطلاعاتی ارائه می‌دهند؟',
    'تعداد نمایش، کلیک، نرخ تبدیل، هزینه هر کلیک، هزینه هر تبدیل، بازگشت سرمایه و عملکرد هر کانال از جمله داده‌هایی است که در داشبورد تحلیلی قابل مشاهده است.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با بودجه کوچک شروع کنید و به‌تدریج گسترش دهید.',
  ],
  [
    'آیا لیدهای جذب شده به CRM متصل می‌شوند؟',
    'بله، تمام لیدهای حاصل از کمپین‌ها به‌صورت خودکار به سیستم CRM منتقل می‌شوند تا تیم فروش آن‌ها را پیگیری و به مشتری تبدیل کند.',
  ],
];

export default function AdManagementFAQ() {
  return (
    <section id="faq" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره مدیریت تبلیغات نوین بین
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
