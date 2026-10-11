'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'سیستم خدمات پس از فروش نوین بین چیست؟',
    'پلتفرمی است که به شما کمک می‌کند تمام درخواست‌های پس از فروش مشتریان خود را در یک جای متمرکز ثبت، پیگیری و حل کنید. از ثبت تیکت تا سنجش رضایت و تحلیل داده‌ها، همه چیز در دسترس شماست.',
  ],
  [
    'آیا مشتریان می‌توانند مستقیم درخواست ثبت کنند؟',
    'بله، مشتریان از طریق پورتال اختصاصی خود می‌توانند درخواست‌شان را ثبت کنند، وضعیت آن را پیگیری بگیرند و پس از حل، نظرشان را اعلام کنند.',
  ],
  [
    'آیا امکان ارسال پیامک اطلاع‌رسانی وجود دارد؟',
    'بله، در هر مرحله از فرآیند (ثبت، در حال بررسی، حل شده) می‌توانید به‌صورت خودکار پیامک اطلاع‌رسانی برای مشتری ارسال کنید تا همیشه در جریان باشد.',
  ],
  [
    'گزارش‌های تحلیلی چه اطلاعاتی ارائه می‌دهند؟',
    'زمان میانگین پاسخ، نرخ رضایت مشتری، تعداد درخواست‌ها در بازه‌های مختلف، دسته‌بندی درخواست‌ها و عملکرد هر کارشناس از جمله داده‌هایی است که در داشبورد تحلیلی قابل مشاهده است.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با نیاز خود شروع کنید و به‌تدریج امکانات بیشتری فعال کنید.',
  ],
  [
    'آیا داده‌های مشتریان امن هستند؟',
    'بله، تمام اطلاعات با استانداردهای امنیتی بالا نگهداری می‌شود و دسترسی کاربران به‌صورت نقش‌محور کنترل می‌گردد تا محرمانگی اطلاعات مشتریان حفظ شود.',
  ],
];

export default function AfterSalesFAQ() {
  return (
    <section id="faq" className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره خدمات پس از فروش نوین بین
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
