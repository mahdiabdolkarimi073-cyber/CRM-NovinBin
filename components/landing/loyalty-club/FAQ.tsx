'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم باشگاه وفاداری نوین بین چیست؟',
    'پلتفرمی است که برنامه‌های امتیازدهی، پاداش و سطح‌بندی مشتری را در یک سیستم یکپارچه مدیریت می‌کند و به فروش و CRM متصل می‌سازد.',
  ],
  [
    'آیا قوانین امتیازدهی قابل تنظیم است؟',
    'بله، قوانین امتیازدهی کاملاً قابل تنظیم و انعطاف‌پذیر هستند. می‌توانید به هر خرید یا تعامل امتیاز اختصاص دهید.',
  ],
  [
    'آیا مشتریان می‌توانند امتیاز خود را به پاداش تبدیل کنند؟',
    'بله، مشتریان می‌توانند امتیاز خود را به تخفیف، هدیه یا پاداش تبدیل کنند. پاداش به‌صورت خودکار اعمال می‌شود.',
  ],
  [
    'آیا مشتریان دسته‌بندی می‌شوند؟',
    'بله، مشتریان بر اساس میزان خرید و تعامل در سطوح وفاداری دسته‌بندی می‌شوند: برنزی، نقره‌ای، طلایی و VIP.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با طرح ساده شروع کنید و گسترش دهید.',
  ],
  [
    'آیا باشگاه وفاداری به فروش متصل است؟',
    'بله، هر خرید به‌صورت خودکار به امتیاز متصل می‌شود و تعامل مشتری در CRM رهگیری می‌گردد.',
  ],
];

export default function LoyaltyFAQ() {
  return (
    <section id="faq" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره باشگاه وفاداری نوین بین
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
