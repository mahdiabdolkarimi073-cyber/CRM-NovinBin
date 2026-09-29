'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const questions = [
  ['نوین بین برای چه کسب‌وکارهایی مناسب است؟', 'نوین بین برای کسب‌وکارهای کوچک و متوسط، تیم‌های فروش و سازمان‌هایی که به مدیریت یکپارچه نیاز دارند طراحی شده است.'],
  ['آیا امکان استفاده آزمایشی وجود دارد؟', 'بله، می‌توانید بدون نیاز به اطلاعات کارت بانکی از امکانات اصلی نوین بین استفاده کنید.'],
  ['اطلاعات کسب‌وکار من چطور محافظت می‌شود؟', 'امنیت اطلاعات و کنترل دسترسی کاربران، از اصول اصلی طراحی نوین بین است و دسترسی‌ها در اختیار مدیر سازمان قرار دارد.'],
  ['آیا پشتیبانی فارسی ارائه می‌شود؟', 'بله، تیم پشتیبانی فارسی در کنار شماست تا راه‌اندازی و استفاده از سیستم را ساده‌تر کند.'],
];

export default function FAQSection() {
  return (
    <section id="faq" className="bg-[#f8faff] px-4 py-16 lg:px-6">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <span className="text-[14px] font-bold text-[#3d5be1]">سوالات متداول</span>
          <h2 className="mt-3 text-[26px] font-extrabold text-[#10286d] sm:text-[30px]">سوالات متداول</h2>
          <p className="mt-3 text-[15px] font-medium text-slate-500">پاسخ سوالاتی که بیشتر از ما پرسیده می‌شود</p>
        </div>
        <Accordion type="single" collapsible defaultValue="item-0" className="mt-10 overflow-hidden rounded-2xl border border-[#e5ebf7] bg-white px-5 shadow-[0_8px_25px_rgba(30,62,150,.04)]">
          {questions.map(([question, answer], index) => (
            <AccordionItem key={question} value={`item-${index}`}>
              <AccordionTrigger className="text-right text-[16px] font-bold text-[#10286d] hover:no-underline">{question}</AccordionTrigger>
              <AccordionContent className="text-right text-[15px] font-medium leading-7 text-slate-500">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
