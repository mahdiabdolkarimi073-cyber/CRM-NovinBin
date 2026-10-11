'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم هوش تجاری نوین بین چیست؟',
    'پلتفرمی است که به شما کمک می‌کند داده‌های کسب‌وکار خود را جمع‌آوری، تحلیل و به داشبوردهای مدیریتی و گزارش‌های قابل اقدام تبدیل کنید. از تحلیل روند تا پیش‌بینی، همه چیز در یک سیستم.',
  ],
  [
    'آیا برای استفاده از این سیستم باید دانش فنی داشته باشم؟',
    'خیر، پلتفرم نوین بین برای همه طراحی شده است. داشبوردها و گزارش‌ها به زبان ساده و قابل فهم ارائه می‌شوند و نیازی به دانش فنی یا برنامه‌نویسی ندارند.',
  ],
  [
    'داشبوردهای مدیریتی چه اطلاعاتی نمایش می‌دهند؟',
    'داشبوردها شاخص‌های کلیدی عملکرد (KPI)، فروش، هزینه، عملکرد تیم، روند مشتری و گزارش‌های تحلیلی را به‌صورت زنده و قابل فهم نمایش می‌دهند.',
  ],
  [
    'آیا گزارش‌های دوره‌ای خودکار تولید می‌شوند؟',
    'بله، می‌توانید گزارش‌های روزانه، هفتگی یا ماهانه تنظیم کنید تا به‌صورت خودکار تولید و برای مدیران و ذی‌نفعان ارسال شوند.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با داده‌های کم شروع کنید و به‌تدریج تحلیل‌های عمیق‌تری فعال کنید.',
  ],
  [
    'آیا پیش‌بینی و تحلیل روند ممکن است؟',
    'بله، سیستم با مدل‌های پیش‌بینی، روند آینده کسب‌وکار را تحلیل می‌کند و به شما کمک می‌کند با اطمینان بیشتری برنامه‌ریزی کنید.',
  ],
];

export default function DataIntelligenceFAQ() {
  return (
    <section id="faq" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره هوش تجاری نوین بین
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
