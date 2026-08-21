'use client';

import { useState, useEffect } from 'react';
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
import { ArrowRight, Calendar, Save, Pencil, List, Folder, Eye, HelpCircle, Info, ImagePlus, X, FileText } from 'lucide-react';
import { toLocalDateString, formatFileSize } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';

type MonthlyWorkReport = {
  id: string;
  profileId: string;
  fullName: string;
  nationalId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

type ProfileInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

const MONTH_OPTIONS = [
  { value: 1, label: 'فروردین' },
  { value: 2, label: 'اردیبهشت' },
  { value: 3, label: 'خرداد' },
  { value: 4, label: 'تیر' },
  { value: 5, label: 'مرداد' },
  { value: 6, label: 'شهریور' },
  { value: 7, label: 'مهر' },
  { value: 8, label: 'آبان' },
  { value: 9, label: 'آذر' },
  { value: 10, label: 'دی' },
  { value: 11, label: 'بهمن' },
  { value: 12, label: 'اسفند' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'submitted', label: 'ارسال شده' },
  { value: 'reviewing', label: 'در حال بررسی' },
  { value: 'approved', label: 'تأیید شده' },
  { value: 'needs_revision', label: 'نیازمند بازبینی' },
];

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUMMARY_MAX = 2000;
const DETAILS_MAX = 5000;
const DESCRIPTION_MAX = 3000;

const guideItems = [
  { icon: Pencil, title: 'اطلاعات شخصی', desc: 'نام و کد ملی خود را به‌درستی وارد کنید. این اطلاعات در گزارش نهایی نمایش داده می‌شود.' },
  { icon: List, title: 'بازه زمانی', desc: 'تاریخ شروع و پایان دوره گزارش را مشخص کنید.' },
  { icon: Folder, title: 'پروژه مرتبط', desc: 'در صورت ارتباط با پروژه خاص، نام آن را وارد کنید.' },
  { icon: Eye, title: 'بررسی قبل از ذخیره', desc: 'قبل از ذخیره، اطلاعات وارد شده را بررسی کنید.' },
];

export default function NewMonthlyReportPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState({
    fullName: '',
    nationalId: '',
    startDate: '',
    endDate: '',
    reportYear: '',
    reportMonth: '',
    project: '',
    reportDate: '',
    summary: '',
    details: '',
    description: '',
    status: 'draft',
  });

  const today = toLocalDateString(new Date());
  const todayDate = new Date();

  useEffect(() => {
    if (profile) {
      const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      if (name) setForm((f) => ({ ...f, fullName: name }));
    }
  }, [profile]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`فرمت ${file.name} مجاز نیست. فقط JPG، PNG، GIF، WEBP`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`حجم ${file.name} بیشتر از ۵ مگابایت است`);
        continue;
      }
      valid.push(file);
    }
    if (images.length + valid.length > MAX_IMAGES) {
      toast.error(`حداکثر ${MAX_IMAGES} تصویر می‌توانید آپلود کنید`);
      return;
    }
    setImages([...images, ...valid]);
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) { toast.error('اطلاعات کاربری یافت نشد'); return; }
    if (!form.fullName.trim()) { toast.error('نام و نام خانوادگی را وارد کنید'); return; }
    if (!form.nationalId.trim()) { toast.error('کد ملی را وارد کنید'); return; }
    if (!form.startDate || !form.endDate) { toast.error('تاریخ شروع و پایان را انتخاب کنید'); return; }
    if (!form.reportDate) { toast.error('تاریخ گزارش را انتخاب کنید'); return; }
    if (!form.status) { toast.error('وضعیت گزارش را انتخاب کنید'); return; }

    setSaving(true);
    try {
      const report = await createData<MonthlyWorkReport>('monthly_work_reports', {
        profileId: profile.id,
        fullName: form.fullName.trim(),
        nationalId: form.nationalId.trim(),
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        description: form.description.trim() || null,
        reportYear: form.reportYear ? Number(form.reportYear) : null,
        reportMonth: form.reportMonth ? Number(form.reportMonth) : null,
        project: form.project.trim() || null,
        reportDate: new Date(form.reportDate),
        summary: form.summary.trim() || null,
        details: form.details.trim() || null,
        status: form.status,
      }, { images: true });

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        await createData('work_report_images', {
          monthlyReportId: report.id,
          imageUrl: file.name,
        });
      }

      toast.success('گزارش ماهانه ثبت شد');
      router.push('/dashboard/work-reports/monthly');
    } catch (error: any) {
      toast.error('ایجاد ناموفق: ' + (error?.message || 'خطا'));
      setSaving(false);
    }
  };

  const declarationText = `اینجانب ${form.fullName || '....'} به کد ملی ${form.nationalId || '....'} وضعیت پروژه تحویل گرفته را طبق گزارش کار صورت وضعیت ارائه شده اعلام می‌نمایم.`;

  return (
    <div className="w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-[30px] w-[5px] rounded-[4px] bg-[#F97316]" />
            <h1 className="text-[24px] font-bold leading-tight text-[#0F172A] sm:text-[32px]">
              ایجاد گزارش کار ماهانه
            </h1>
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">
            گزارش کارهای انجام شده در ماه را با صورت وضعیت ثبت کنید
          </p>
        </div>
        <Link href="/dashboard/work-reports/monthly">
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
            {/* Declaration */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-700 leading-7">
              {declarationText}
            </div>

            {/* Full Name + National ID */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  نام و نام خانوادگی <span className="text-[#DC2626]">*</span>
                </Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="نام کامل"
                  className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                  required
                />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  کد ملی <span className="text-[#DC2626]">*</span>
                </Label>
                <Input
                  value={form.nationalId}
                  onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                  placeholder="کد ملی"
                  dir="ltr"
                  className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                  required
                />
              </div>
            </div>

            {/* Start Date + End Date */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  تاریخ شروع <span className="text-[#DC2626]">*</span>
                </Label>
                <JalaliDatePicker
                  value={form.startDate ? new Date(form.startDate) : null}
                  onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })}
                  className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  تاریخ پایان <span className="text-[#DC2626]">*</span>
                </Label>
                <JalaliDatePicker
                  value={form.endDate ? new Date(form.endDate) : null}
                  onChange={(d) => setForm({ ...form, endDate: d ? toLocalDateString(d) : '' })}
                  className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                />
              </div>
            </div>

            {/* Report Year + Report Month */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  سال گزارش (اختیاری)
                </Label>
                <Input
                  value={form.reportYear}
                  onChange={(e) => setForm({ ...form, reportYear: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="مثلاً ۱۴۰۳"
                  dir="ltr"
                  className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                />
              </div>
              <div>
                <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                  ماه گزارش (اختیاری)
                </Label>
                <Select
                  value={form.reportMonth}
                  onValueChange={(v) => setForm({ ...form, reportMonth: String(v) })}
                >
                  <SelectTrigger className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]">
                    <SelectValue placeholder="انتخاب ماه..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project + Report Date */}
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
                  className="h-[50px] rounded-[10px] border-[#D4DEEA] text-[14px] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                />
              </div>
            </div>

            {/* Status */}
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

            {/* Summary */}
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                خلاصه عملکرد ماهانه
              </Label>
              <Textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value.slice(0, SUMMARY_MAX) })}
                placeholder="خلاصه‌ای از عملکرد و فعالیت‌های اصلی این ماه را بنویسید..."
                className="h-[115px] resize-y rounded-[10px] border-[#D4DEEA] p-4 text-[14px] leading-[1.9] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
              />
              <div className="mt-1 text-left text-[12px] text-[#94A3B8]">
                {form.summary.length.toLocaleString('fa-IR')} / {SUMMARY_MAX.toLocaleString('fa-IR')}
              </div>
            </div>

            {/* Details */}
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                جزئیات فعالیت‌ها و دستاوردها
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

            {/* Description / صورت وضعیت */}
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                توضیحات / صورت وضعیت
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, DESCRIPTION_MAX) })}
                placeholder="شرح کارهای انجام‌شده در این بازه زمانی..."
                className="h-[115px] resize-y rounded-[10px] border-[#D4DEEA] p-4 text-[14px] leading-[1.9] focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
              />
              <div className="mt-1 text-left text-[12px] text-[#94A3B8]">
                {form.description.length.toLocaleString('fa-IR')} / {DESCRIPTION_MAX.toLocaleString('fa-IR')}
              </div>
            </div>

            {/* Images */}
            <div>
              <Label className="mb-2 block text-[14px] font-semibold text-[#172033]">
                تصاویر صورت وضعیت (حداکثر {MAX_IMAGES} تصویر، حداکثر ۵ مگابایت هر کدام)
              </Label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <ImagePlus className="w-4 h-4" /> انتخاب تصاویر
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
                <span className="text-xs text-slate-400">{images.length} / {MAX_IMAGES} تصویر</span>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {images.map((file, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="px-1 py-0.5 text-[10px] text-slate-400 truncate">{file.name}</div>
                      <div className="px-1 pb-1 text-[10px] text-slate-400">{formatFileSize(file.size)}</div>
                    </div>
                  ))}
                </div>
              )}
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
              <Link href="/dashboard/work-reports/monthly" className="w-[40%] sm:w-[110px]">
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
              گزارش‌های ماهانه به مدیریت بهتر پروژه‌ها و ارزیابی عملکرد کمک می‌کنند. صورت وضعیت و تصاویر پیوست‌شده در گزارش نهایی نمایش داده می‌شوند.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
