'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  [
    'پلتفرم مدیریت اطلاعات مشتریان نوین بین چیست؟',
    'پلتفرمی است که به شما کمک می‌کند تمام اطلاعات مشتریان خود را در یک پایگاه داده متمرکز جمع‌آوری، دسته‌بندی و مدیریت کنید. از پروفایل مشتری تا اعلالات هوشمند و دسترسی امن، همه چیز در یک سیستم.',
  ],
  [
    'آیا اطلاعات مشتریان از کانال‌های مختلف جمع‌آوری می‌شوند؟',
    'بله، سیستم به‌صورت خودکار اطلاعات مشتری را از کانال‌های مختلف (فرم ثبت‌نام، تماس، خرید، تیکت) جمع‌آوری و همگام می‌کند تا همیشه به‌روز بمانید.',
  ],
  [
    'اعلالات هوشمند چه اطلاعاتی ارائه می‌دهند؟',
    'اعلالات خودکار برای رویدادهای مهم مانند تولد مشتری، تمدید قرارداد، سررسید پرداخت، فرصت‌های فروش مجدد و تغییر در رفتار مشتری ارسال می‌شوند.',
  ],
  [
    'آیا دسترسی به اطلاعات کنترل‌پذیر است؟',
    'بله، دسترسی کاربران به اطلاعات مشتریان به‌صورت نقش‌محور کنترل می‌شود. هر کاربر فقط به اطلاعاتی دسترسی دارد که مجاز است ببیند.',
  ],
  [
    'آیا این سیستم برای کسب‌وکارهای کوچک هم مناسب است؟',
    'بله، پلتفرم نوین بین برای کسب‌وکارهای کوچک، متوسط و بزرگ طراحی شده است. می‌توانید با تعداد کم مشتری شروع کنید و به‌تدریج گسترش دهید.',
  ],
  [
    'امنیت اطلاعات مشتریان چگونه تضمین می‌شود؟',
    'تمام اطلاعات با استانداردهای امنیتی بالا نگهداری می‌شود، دسترسی‌ها نقش‌محور کنترل می‌گردد و لاگ تمام فعالیت‌ها ثبت می‌شود تا محرمانگی اطلاعات مشتریان حفظ شود.',
  ],
];

export default function CustomerInfoFAQ() {
  return (
    <section id="faq" className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">
            سوالاتی که ممکن است داشته باشید
          </h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">
            پاسخ شفاف به سوالات رایج درباره مدیریت اطلاعات مشتریان نوین بین
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
