'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم اتوماسیون اداری نوین بین چیست؟',
    'پلتفرمی است که مکاتبات، فعالیت‌ها، مصوبات و فرآیندهای اداری را به‌صورت دیجیتال و هوشمند در یک سیستم یکپارچه مدیریت می‌کند.',
  ],
  [
    'آیا می‌توانم نامه‌های وارده و صادره را رهگیری کنم؟',
    'بله، تمام نامه‌های وارده و صادره قابل ثبت و رهگیری هستند. جستجو، دسته‌بندی و آرشیو هوشمند در دسترس است.',
  ],
  [
    'آیا مهلت و سررسید قابل پیگیری است؟',
    'بله، برای هر نامه، فعالیت یا مصوبه مهلت تعیین می‌شود و سیستم به‌صورت خودکار قبل از سررسید هشدار می‌دهد.',
  ],
  [
    'آیا آرشیو دیجیتال قابل جستجو است؟',
    'بله، تمام مکاتبات و فعالیت‌ها به‌صورت دیجیتال آرشیو می‌شوند و جستجوی سریع و دسترسی همیشگی فراهم است.',
  ],
  [
    'آیا این سیستم برای سازمان‌های کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای سازمان‌های کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با چند فرآیند شروع کنید و گسترش دهید.',
  ],
  [
    'آیا می‌توانم فعالیت‌ها را به افراد ارجاع دهم؟',
    'بله، هر نامه یا فعالیت به فرد مربوط ارجاع داده می‌شود و وضعیت پیگیری هر فرد در یک نگاه قابل مشاهده است.',
  ],
];

export default function OfficeFAQ() {
  return (
    <section id="faq" className="bg-[#f4fdf9] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#1a9d6f]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره اتوماسیون اداری نوین بین
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
