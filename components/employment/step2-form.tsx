'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

const ratingVal = z.coerce.number().int().min(1, 'انتخاب الزامی است').max(5);
const textVal = z.string().trim().min(1, 'پاسخ الزامی است');

const schema = z.object({
  r1: ratingVal, r2: ratingVal, r3: ratingVal, r4: ratingVal, r5: ratingVal,
  r6: ratingVal, r7: ratingVal, r8: ratingVal, r9: ratingVal, r10: ratingVal,
  r11: ratingVal, r12: ratingVal, r13: ratingVal, r14: ratingVal, r15: ratingVal,
  r16: ratingVal, r17: ratingVal,
  a1: textVal, a2: textVal, a3: textVal, a4: textVal, a5: textVal, a6: textVal,
  a7: textVal, a8: textVal, a9: textVal, a10: textVal, a11: textVal, a12: textVal,
  a13: textVal, a14: textVal, a15: textVal, a16: textVal, a17: textVal, a18: textVal,
});

type FormValues = z.infer<typeof schema>;

const ratingQuestions = [
  'میزان تسلط به نرم افزار WORD دارم',
  'من به نرم افزارهای مدیریت ارتباط با مشتری CRM تسلط دارم',
  'من به نرم افزار فوتوشاپ تسلط دارم',
  'من درون گرا هستم',
  'من به نرم افزار EXCEL تسلط دارم',
  'من به نرم افزار PowerPoint تسلط دارم',
  'من برونگرا هستم',
  'من میتوانم دیدگاه و بازخوردم به مدیرم را ارائه دهم',
  'من منظم هستم',
  'من به قوانین احترام می گذارم',
  'من تلاشگر هستم',
  'من کنجکاو هستم',
  'من مسئولیت پذیر هستم',
  'من علاقمند به یادگیری هستم',
  'من دانشم را به همکاران انتقال میدهم',
  'من فردی مثبت اندیش هستم',
  'من فردی انعطاف پذیر هستم',
];

const textQuestions = [
  'اگه مافوقت یه کار غیر قانونی بخواد چیکار میکنید؟',
  'اگه مدیریت بگه بایستی تا غروب ساعت... بمونید چیکار میکنید؟',
  'مدیریت قصد دارد به یک جای دور منتقلتون کند چکاری انجام میدهید؟',
  'انتظاراتون از مدیریت چیست؟',
  'اگه روی پروژه توی سازمان خیلی وقت صرف کنید و کارتون با کیفیت از آب در بیاد و مدیریت بهتون توجه نکنه واکنشتون چیست؟',
  'حداقل حقوقی که میخواهید چقدر است؟',
  'میدونی چند ماه اول اصلا بهت حقوق نمیدن واکنشتون چیست؟',
  'برای موفقیت توی شغلت میخوای چیکار کنی؟',
  'چه برنامه ای برای دو سال آینده دارید؟ اصلا برنامه ای دارید؟',
  'در چه صورت کارتون که الان قبول شدید رو ول میکنید و میرید؟',
  'توی زندگیتون توی تنگنا قرار گرفته اید؟ چه محدودیت هایی؟ چند تا را نام ببرید؟',
  'دوست دارید وقتی وارد جمع میشوید برای جمع سخنرانی کنید؟',
  'چطور میخواهید تعادل بین زندگی شخصی و شغلتون ایجاد کنید؟',
  'میتوانید به دیگران اعتماد کنید؟',
  'شرایط یک کارمند خوب چیست؟',
  'چه معضلات مهم در زندگی دارید؟ باهاشون چطور برخورد میکنید؟ آیا در جامعه ما معضلات مهم هست؟ چند مورد را مثال بزنید.',
  'اگر با همکاراتون با مشکل مواجه شوید چیکار میکنید؟',
  'یک نامه اداری به مدیریت بنویسید و تقاضای خودتون رو درخواست کنید.',
];

const ratingLabels = ['خیلی زیاد', 'زیاد', 'متوسط', 'کم', 'خیلی کم'];

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#E7ECF3] bg-white p-5 shadow-[0_3px_14px_rgba(20,40,80,.05)] sm:p-7"><div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF4FF] text-sm font-bold text-[#3155E7]">{number}</span><h2 className="text-lg font-bold text-[#101828]">{title}</h2></div>{children}</section>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"><span className="block text-xs font-semibold text-slate-400">{label}</span><span className="mt-1 block text-sm font-medium text-[#1D2939]">{value || '—'}</span></div>;
}

type Step2Props = {
  step1Data: Record<string, any>;
  applicationId: string;
  onComplete: () => void;
};

export function Step2Form({ step1Data, applicationId, onComplete }: Step2Props) {
  const [done, setDone] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  const submit = async (values: FormValues) => {
    const response = await fetch('/api/employment-application', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: applicationId, step2: values }),
    });
    const json = await response.json();
    if (!response.ok) { toast.error(json.error || 'ثبت مرحله دوم ناموفق بود'); return; }
    setDone(true);
    toast.success('فرم استخدام شما با موفقیت تکمیل شد');
  };

  if (done) {
    return <main className="min-h-screen bg-[#F6F8FC] px-4 py-10" dir="rtl"><div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-8 w-8" /></div><h1 className="text-2xl font-bold text-[#101828]">فرم استخدام با موفقیت ثبت شد</h1><p className="mt-4 leading-8 text-slate-500">درخواست استخدام شما با موفقیت ثبت گردید. نتیجه بررسی به‌زودی از طریق تماس اطلاع‌رسانی خواهد شد.</p><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#3155E7] px-5 py-3 text-sm font-semibold text-white">بازگشت به صفحه اصلی <ArrowRight className="h-4 w-4" /></Link></div></main>;
  }

  return <main className="min-h-screen bg-[#F6F8FC] px-4 py-8 sm:px-6" dir="rtl"><div className="mx-auto max-w-[1100px]"><header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-3"><span className="h-10 w-1.5 rounded-full bg-[#FF7A00]" /><h1 className="text-2xl font-bold text-[#101828]">فرم استخدام شرکت نوین بین — مرحله دوم</h1></div><p className="mt-2 text-sm text-slate-500">ارزیابی روان‌شناختی و شخصیتی</p></div><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3155E7]"><ArrowRight className="h-4 w-4" /> بازگشت</Link></header><div className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-sm font-semibold"><span className="text-slate-400">مرحله اول: اطلاعات و سوابق</span><span className="text-[#3155E7]">مرحله دوم: ارزیابی</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full rounded-full bg-[#3155E7] transition-all" /></div><p className="mt-2 text-xs text-slate-400">مرحله ۲ از ۲</p></div><form onSubmit={handleSubmit(submit)} className="space-y-5">
    {/* Auto-filled personal info */}
    <Section number={1} title="اطلاعات شخصی (مرحله اول)"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><ReadOnlyField label="نام و نام خانوادگی" value={step1Data.fullName} /><ReadOnlyField label="نام پدر" value={step1Data.fatherName} /><ReadOnlyField label="تاریخ تولد" value={step1Data.birthDate} /><ReadOnlyField label="محل تولد" value={step1Data.birthPlace} /><ReadOnlyField label="شماره شناسنامه" value={step1Data.nationalId} /><ReadOnlyField label="وضعیت نظام وظیفه" value={step1Data.militaryStatus} /><ReadOnlyField label="نشانی محل سکونت" value={step1Data.address} /><ReadOnlyField label="تلفن تماس" value={step1Data.phone} /></div></Section>

    {/* Section A: Rating questions */}
    <Section number={2} title="بخش الف — سوالات امتیازی"><p className="mb-5 text-sm text-slate-500">لطفا به هر سوال بر اساس مقیاس زیر پاسخ دهید: <span className="font-semibold">۱ = خیلی زیاد، ۲ = زیاد، ۳ = متوسط، ۴ = کم، ۵ = خیلی کم</span></p><div className="space-y-3">{ratingQuestions.map((q, i) => { const key = `r${i + 1}` as keyof FormValues; const err = (errors as any)[key]?.message; return <div key={key} className={`rounded-xl border p-4 ${err ? 'border-rose-300 bg-rose-50/30' : 'border-slate-100 bg-slate-50/50'}`}><div className="mb-3 flex items-start gap-2"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3155E7] text-xs font-bold text-white">{String(i + 1).toLocaleString('fa-IR')}</span><span className="text-sm font-medium text-[#344054]">{q}</span></div><div className="flex flex-wrap items-center gap-4 pr-8"><RadioGroup onValueChange={(val) => setValue(key, parseInt(val) as any, { shouldValidate: true })} className="flex flex-wrap gap-4">{[1, 2, 3, 4, 5].map((n) => <div key={n} className="flex items-center gap-1.5"><RadioGroupItem value={String(n)} id={`${key}-${n}`} /><Label htmlFor={`${key}-${n}`} className="cursor-pointer text-xs font-normal text-slate-600">{String(n).toLocaleString('fa-IR')} — {ratingLabels[n - 1]}</Label></div>)}</RadioGroup></div>{err && <p className="mt-2 pr-8 text-xs text-rose-500">{err}</p>}</div>; })}</div></Section>

    {/* Section B: Text questions */}
    <Section number={3} title="بخش ب — سوالات تشریحی"><div className="space-y-5">{textQuestions.map((q, i) => { const key = `a${i + 1}` as keyof FormValues; const err = (errors as any)[key]?.message; return <div key={key}><Label className="mb-2 block text-sm font-semibold text-[#344054]"><span className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF4FF] text-xs font-bold text-[#3155E7]">{String(i + 1).toLocaleString('fa-IR')}</span> {q} <span className="text-rose-500">*</span></Label><Textarea {...register(key as any)} className="min-h-28" />{err && <p className="mt-1 text-xs text-rose-500">{err}</p>}</div>; })}</div></Section>

    <div className="flex justify-end"><Button type="submit" disabled={isSubmitting} className="h-12 min-w-[180px] bg-[#3155E7] text-white hover:bg-[#2445C7]">{isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت...</> : 'ثبت نهایی فرم'}</Button></div></form></div></main>;
}
