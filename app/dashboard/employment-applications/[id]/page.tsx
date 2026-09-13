// @ts-nocheck
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

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

const ratingLabels: Record<number, string> = { 1: 'خیلی زیاد', 2: 'زیاد', 3: 'متوسط', 4: 'کم', 5: 'خیلی کم' };

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="border-[#E7ECF3] shadow-[0_3px_14px_rgba(20,40,80,.05)]"><CardContent className="p-5 sm:p-7"><div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4"><h2 className="text-lg font-bold text-[#101828]">{title}</h2></div>{children}</CardContent></Card>;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return <div className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"><span className="text-xs font-semibold text-slate-400">{label}</span><span className="text-sm font-medium text-[#1D2939]">{value || '—'}</span></div>;
}

export default function EmploymentApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/employment-application/${id}`).then(r => r.json()).then(json => {
      if (json.data) setApp(json.data);
      else toast.error(json.error || 'بارگذاری ناموفق بود');
    }).finally(() => setLoading(false));
    fetch('/api/auth/me').then(r => r.json()).then(d => setCanDelete(d.role === 'owner' || d.role === 'super_admin')).catch(() => {});
  }, [id]);

  const remove = async () => {
    if (!window.confirm('آیا از حذف این درخواست مطمئن هستید؟')) return;
    const response = await fetch(`/api/employment-application/${id}`, { method: 'DELETE' });
    const json = await response.json();
    if (!response.ok) { toast.error(json.error || 'حذف ناموفق بود'); return; }
    toast.success('درخواست حذف شد');
    window.location.href = '/dashboard/employment-applications';
  };

  if (loading) return <div className="py-20 text-center text-sm text-slate-400" dir="rtl">در حال بارگذاری...</div>;
  if (!app) return <div className="py-20 text-center text-sm text-slate-400" dir="rtl">درخواست یافت نشد.</div>;

  const d = (app.formData as Record<string, any>) || {};
  const formatDate = (s: string) => { try { return new Date(s).toLocaleDateString('fa-IR'); } catch { return s; } };

  return (
    <div className="create-task-page" dir="rtl"><div className="create-task-container">
      <header className="create-task-header"><div><div className="create-task-title"><span className="title-accent-bar" /><h1>جزئیات درخواست استخدام</h1></div><div className="create-task-breadcrumb"><Link href="/dashboard/employment-applications" className="text-[#3155E7]">درخواست‌های استخدام</Link> <b>←</b> {app.fullName}</div></div><div className="flex items-center gap-2"><Link href="/dashboard/employment-applications"><Button variant="outline" className="gap-2"><ArrowRight className="h-4 w-4" /> بازگشت</Button></Link>{canDelete && <Button variant="outline" className="gap-2 text-rose-600 hover:bg-rose-50" onClick={remove}><Trash2 className="h-4 w-4" /> حذف</Button>}</div></header>

      <div className="space-y-5">
        {/* Step 1: Personal Info */}
        <InfoCard title="اطلاعات شخصی (مرحله اول)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="نام و نام خانوادگی" value={d.fullName} />
            <InfoRow label="نام پدر" value={d.fatherName} />
            <InfoRow label="شماره ملی" value={d.nationalId} />
            <InfoRow label="تاریخ تولد" value={d.birthDate} />
            <InfoRow label="محل تولد" value={d.birthPlace} />
            <InfoRow label="وضعیت نظام وظیفه" value={d.militaryStatus} />
            <InfoRow label="وضعیت تأهل" value={d.maritalStatus} />
            <InfoRow label="تعداد فرزندان" value={String(d.childrenCount ?? '—')} />
            <InfoRow label="شغل پدر یا همسر" value={d.fatherOrSpouseJob} />
            <InfoRow label="تلفن تماس" value={d.phone} />
            <InfoRow label="تلفن تماس ضروری" value={d.emergencyPhone} />
            <InfoRow label="ایمیل" value={d.email} />
            <InfoRow label="نشانی محل سکونت" value={d.address} />
            <InfoRow label="نشانی محل کار فعلی" value={d.currentWorkAddress} />
            <InfoRow label="تلفن محل کار" value={d.currentWorkPhone} />
            <InfoRow label="از چه طریق با شرکت آشنا شدید" value={d.referralSource} />
            <InfoRow label="نوع همکاری مورد نظر" value={d.cooperation} />
            <InfoRow label="تاریخ ثبت" value={formatDate(app.createdAt)} />
          </div>

          {d.education?.length > 0 && <div className="mt-6"><h3 className="mb-3 text-sm font-bold text-[#344054]">سوابق تحصیلی</h3><div className="space-y-2">{d.education.map((e: any, i: number) => <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-[#475467]"><span className="font-semibold text-[#1D2939]">{e.level} - {e.field}</span> — {e.institution} ({e.fromYear} تا {e.toYear})</div>)}</div></div>}

          {d.work?.length > 0 && <div className="mt-6"><h3 className="mb-3 text-sm font-bold text-[#344054]">سوابق کاری</h3><div className="space-y-2">{d.work.map((w: any, i: number) => <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-[#475467]"><span className="font-semibold text-[#1D2939]">{w.organization} - {w.position}</span> — {w.fromYear} تا {w.toYear}</div>)}</div></div>}

          {d.desiredPosts?.length > 0 && <div className="mt-6"><h3 className="mb-3 text-sm font-bold text-[#344054]">پست‌های مورد نظر</h3><div className="space-y-2">{d.desiredPosts.map((p: any, i: number) => <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-[#475467]"><span className="font-semibold text-[#1D2939]">{p.title}</span> — {p.description}</div>)}</div></div>}
        </InfoCard>

        {/* Step 2: Section A - Ratings */}
        {app.step === 2 && <InfoCard title="بخش الف — سوالات امتیازی">
          <div className="space-y-2">{ratingQuestions.map((q, i) => { const val = app[`r${i + 1}`]; return <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3155E7] text-xs font-bold text-white">{String(i + 1).toLocaleString('fa-IR')}</span><span className="text-sm font-medium text-[#344054]">{q}</span></div><span className="rounded-full bg-[#EFF4FF] px-3 py-1 text-xs font-bold text-[#3155E7]">{val ? `${String(val).toLocaleString('fa-IR')} — ${ratingLabels[val] || ''}` : '—'}</span></div>; })}</div>
        </InfoCard>}

        {/* Step 2: Section B - Text Answers */}
        {app.step === 2 && <InfoCard title="بخش ب — سوالات تشریحی">
          <div className="space-y-4">{textQuestions.map((q, i) => { const val = app[`a${i + 1}`]; return <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-4"><div className="mb-2 flex items-start gap-2"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EFF4FF] text-xs font-bold text-[#3155E7]">{String(i + 1).toLocaleString('fa-IR')}</span><span className="text-sm font-semibold text-[#344054]">{q}</span></div><p className="whitespace-pre-wrap pr-8 text-sm leading-7 text-[#475467]">{val || '—'}</p></div>; })}</div>
        </InfoCard>}

        {app.step !== 2 && <InfoCard title="مرحله دوم"><p className="py-8 text-center text-sm text-slate-400">این متقاضی هنوز مرحله دوم فرم را تکمیل نکرده است.</p></InfoCard>}
      </div>
    </div></div>
  );
}
