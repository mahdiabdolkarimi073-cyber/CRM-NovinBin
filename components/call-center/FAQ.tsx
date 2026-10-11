'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم مرکز تماس نوین بین چیست؟',
    'پلتفرمی است که به شما کمک می‌کند تمام تماس‌های ورودی و خروجی خود را در یک سیستم هوشمند مدیریت کنید. از توزیع تماس و ثبت مکالمات تا تحلیل کیفیت و گزارش عملکرد، همه در یک جا.',
  ],
  [
    'آیا تماس‌ها به‌صورت خودکار توزیع می‌شوند؟',
    'بله، سیستم تماس‌ها را بر اساس تخصص کارشناس، دسترسی و بار کاری به‌صورت خودکار توزیع می‌کند تا هر تماس به مناسب‌ترین شخص ارجاع شود.',
  ],
  [
    'آیا مکالمات ثبت می‌شوند؟',
    'بله، تمام مکالمات ثبت می‌شوند تا در صورت نیاز بازبینی شوند. تاریخچه کامل مکالمات هر مشتری در پروفایل او ذخیره می‌گردد.',
  ],
  [
    'گزارش‌های تحلیلی چه اطلاعاتی ارائه می‌دهند؟',
    'تعداد تماس، زمان مکالمه، زمان انتظار، نرخ پاسخ، رضایت مشتری و عملکرد هر کارشناس از جمله داده‌هایی است که در داشبورد تحلیلی قابل مشاهده است.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با تعداد کم کارشناس شروع کنید و به‌تدریج گسترش دهید.',
  ],
  [
    'آیا تماس‌های خروجی هم مدیریت می‌شوند؟',
    'بله، تماس‌های خروجی را برنامه‌ریزی و مدیریت کنید. لیست تماس، زمان‌بندی و پیگیری نتایج همگی در یک پنل مرکزی.',
  ],
];

export default function CallCenterFAQ() {
  return (
    <section id="faq" className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره مرکز تماس نوین بین
          </p>
        </div>
        <Accordion
          type="single"
          collapsible
          defaultValue="item-0"
          className="mt-10 overflow-hidden rounded-2xl border border-[#e5ebf7] bg-white px-5 shadow-[0_8px_25px_rgba(30,62,150,.04)]"
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
