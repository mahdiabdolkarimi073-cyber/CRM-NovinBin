'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Calendar, Save, Pencil, List, Folder, Eye, HelpCircle, Info } from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';

type DailyWorkReport = {
  id: string;
  profileId: string;
  title: string;
  reportDate: string;
};

const STATUS_OPTIONS = [
  { value: 'completed', label: 'تکمیل شده' },
  { value: 'in_progress', label: 'در حال انجام' },
  { value: 'incomplete', label: 'ناقص' },
  { value: 'needs_followup', label: 'نیازمند پیگیری' },
];

const DURATION_OPTIONS = [
  { value: 'under_2h', label: 'کمتر از ۲ ساعت' },
  { value: '2_to_4h', label: '۲ تا ۴ ساعت' },
  { value: '4_to_6h', label: '۴ تا ۶ ساعت' },
  { value: 'over_6h', label: 'بیشتر از ۶ ساعت' },
];

const SUMMARY_MAX = 2000;
const DETAILS_MAX = 5000;

const guideItems = [
  { icon: Pencil, title: 'عنوان مناسب', desc: 'عنوانی کوتاه و گویا برای خلاصه محتوای گزارش انتخاب کنید.' },
  { icon: List, title: 'جزئیات کامل', desc: 'هرچه جزئیات بیشتری ارائه دهید، گزارش مفیدتر خواهد بود.' },
  { icon: Folder, title: 'پروژه مرتبط', desc: 'در صورت ارتباط با پروژه خاص، آن را انتخاب کنید.' },
  { icon: Eye, title: 'بررسی قبل از ذخیره', desc: 'قبل از ذخیره، اطلاعات وارد شده را بررسی کنید.' },
];

export default function NewDailyReportPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    project: '',
    reportDate: '',
    summary: '',
    details: '',
    status: '',
    duration: '',
  });

  const today = toLocalDateString(new Date());
  const todayDate = new Date();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) { toast.error('اطلاعات کاربری یافت نشد'); return; }
    if (!form.title.trim()) { toast.error('عنوان گزارش را وارد کنید'); return; }
    if (!form.reportDate) { toast.error('تاریخ گزارش را انتخاب کنید'); return; }
    if (form.reportDate < today) { toast.error('تاریخ گزارش نمی‌تواند در گذشته باشد'); return; }
    if (!form.status) { toast.error('وضعیت گزارش را انتخاب کنید'); return; }

    setSaving(true);
    try {
      const existing = await fetchData<DailyWorkReport>('daily_work_reports', {
        where: { profileId: profile.id, reportDate: new Date(form.reportDate) },
      });
      if (existing.length > 0) {
        toast.error('برای این تاریخ قبلاً گزارش ثبت کرده‌اید. هر کاربر فقط یک گزارش در روز می‌تواند ثبت کند.');
        setSaving(false);
        return;
      }

      await createData('daily_work_reports', {
        profileId: profile.id,
        title: form.title.trim(),
        description: form.summary.trim() || null,
        project: form.project.trim() || null,
        status: form.status,
        duration: form.duration || null,
        details: form.details.trim() || null,
        reportDate: new Date(form.reportDate),
      });
      toast.success('گزارش روزانه ثبت شد');
      router.push('/dashboard/work-reports/daily');
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('unique') || msg.includes('23505') || msg.includes('Unique constraint')) {
        toast.error('برای این تاریخ قبلاً گزارش ثبت کرده‌اید. هر کاربر فقط یک گزارش در روز می‌تواند ثبت کند.');
      } else {
        toast.error('ایجاد ناموفق: ' + msg);
      }
      setSaving(false);
    }
  };

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
            <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">
              ایجاد گزارش کار روزانه
            </h1>
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">
            گزارش کارهای انجام شده در روز را ثبت کنید
          </p>
        </div>
        <Link href="/dashboard/work-reports/daily">
          <Button
            variant="outline"
            className="h-[52px] w-full rounded-[10px] border-[#D6E0EC] bg-white text-[#0F172A] shadow-sm sm:w-[215px]"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به گزارش‌ها
          </Button>
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[2fr_0.9fr]">
        {/* Form column */}
        <div className="rounded-[14px] border border-[#DCE4EF] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:p-7">
          {/* Form header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-[21px] w-[21px] text-[#2563EB]" />
              <h2 className="text-[20px] font-bold text-[#0F172A]">اطلاعات گزارش</h2>
            </div>
            <div className="mt-2.5 h-[3px] w-[25px] rounded-full bg-[#2563EB]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                عنوان گزارش <span className="text-[#DC2626]">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان گزارش کار روزانه را وارد کنید..."
                className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                required
              />
            </div>

            {/* Project + Date row */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  پروژه / فعالیت مرتبط (اختیاری)
                </Label>
                <Input
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  placeholder="انتخاب پروژه یا فعالیت مرتبط..."
                  className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  تاریخ گزارش <span className="text-[#DC2626]">*</span>
                </Label>
                <JalaliDatePicker
                  value={form.reportDate ? new Date(form.reportDate) : null}
                  onChange={(d) => setForm({ ...form, reportDate: d ? toLocalDateString(d) : '' })}
                  minDate={todayDate}
                  className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                خلاصه فعالیت‌های انجام شده <span className="text-[#DC2626]">*</span>
              </Label>
              <Textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value.slice(0, SUMMARY_MAX) })}
                placeholder="خلاصه‌ای از فعالیت‌های اصلی امروز را بنویسید..."
                className="h-[115px] resize-y rounded-[10px] border-[#D4DEEA] p-4 text-[14px] leading-[1.9] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                required
              />
              <div className="mt-1 text-left text-[12px] text-[#94A3B8]">
                {form.summary.length.toLocaleString('fa-IR')} / {SUMMARY_MAX.toLocaleString('fa-IR')}
              </div>
            </div>

            {/* Details */}
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                جزئیات فعالیت‌ها
              </Label>
              <Textarea
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value.slice(0, DETAILS_MAX) })}
                placeholder="جزئیات کامل فعالیت‌ها، اقدامات انجام شده و نتایج به‌دست آمده را بنویسید..."
                className="h-[115px] resize-y rounded-[10px] border-[#D4DEEA] p-4 text-[14px] leading-[1.9] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
              />
              <div className="mt-1 text-left text-[12px] text-[#94A3B8]">
                {form.details.length.toLocaleString('fa-IR')} / {DETAILS_MAX.toLocaleString('fa-IR')}
              </div>
            </div>

            {/* Status + Duration row */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  وضعیت گزارش <span className="text-[#DC2626]">*</span>
                </Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]">
                    <SelectValue placeholder="انتخاب وضعیت..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  مدت زمان کارکرد (اختیاری)
                </Label>
                <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                  <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]">
                    <SelectValue placeholder="انتخاب مدت زمان..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-row gap-3.5 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="h-[52px] w-[60%] rounded-[10px] bg-[#102A68] text-[14px] font-bold text-white transition-all hover:bg-[#1a3a7a] hover:shadow-md sm:w-[175px]"
              >
                <Save className="h-4 w-4" />
                {saving ? 'در حال ذخیره...' : 'ذخیره گزارش'}
              </Button>
              <Link href="/dashboard/work-reports/daily" className="w-[40%] sm:w-[110px]">
                <Button
                  type="button"
                  variant="outline"
                  className="h-[52px] w-full rounded-[10px] border-[#D4DEEA] bg-white text-[14px] font-medium text-[#172033]"
                >
                  انصراف
                </Button>
              </Link>
            </div>
          </form>
        </div>

        {/* Guide column */}
        <div className="space-y-5">
          {/* Guide card */}
          <div className="rounded-[14px] border border-[#DCE4EF] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#2563EB]" />
              <h3 className="text-[20px] font-bold text-[#0F172A]">راهنما و نکات</h3>
            </div>
            <div className="space-y-7">
              {guideItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#EFF6FF]">
                    <item.icon className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#0F172A]">{item.title}</div>
                    <div className="mt-1 text-[13px] leading-relaxed text-[#64748B]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-[12px] border border-[#BFDBFE] bg-[#EFF6FF] p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-[#2563EB]" />
              <h4 className="text-[14px] font-bold text-[#2563EB]">اطلاعات مفید</h4>
            </div>
            <p className="text-[13px] leading-[2] text-[#64748B]">
              گزارش‌های روزانه به مدیریت بهتر پروژه‌ها و ارزیابی عملکرد کمک می‌کنند.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
