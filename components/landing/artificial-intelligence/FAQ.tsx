'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم هوش مصنوعی نوین بین چیست؟',
    'پلتفرمی است که داده‌های سازمان را با هوش مصنوعی تحلیل می‌کند، الگوها را شناسایی و پیش‌بینی و توصیه‌های اجرایی ارائه می‌دهد.',
  ],
  [
    'آیا نیاز به دانش فنی برای استفاده دارم؟',
    'خیر، پلتفرم به‌صورت خودکار داده را تحلیل و نتایج را در یک داشبورد ساده نمایش می‌دهد. نیازی به دانش فنی نیست.',
  ],
  [
    'پیش‌بینی فروش چگونه کار می‌کند؟',
    'سیستم بر اساس داده تاریخی فروش، الگوهای فصلی و رفتار مشتری، فروش آینده را پیش‌بینی می‌کند تا برنامه‌ریزی دقیق‌تر داشته باشید.',
  ],
  [
    'آیا داده‌های من امن هستند؟',
    'بله، تمام داده‌ها با بالاترین استانداردهای امنیتی پردازش و حریم خصوصی مشتری رعایت می‌شود. دسترسی‌ها کنترل‌پذیر است.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با داده‌های محدود شروع کنید و گسترش دهید.',
  ],
  [
    'توصیه‌های اجرایی چه اطلاعاتی ارائه می‌دهند؟',
    'سیستم توصیه می‌دهد چه اقدامی، چه زمانی و با چه اولویتی لازم است. از مدیریت موجودی تا بازاریابی و مدیریت مشتری.',
  ],
];

export default function AIFAQ() {
  return (
    <section id="faq" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره هوش مصنوعی نوین بین
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
