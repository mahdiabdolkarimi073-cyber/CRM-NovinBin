'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createData, fetchData } from '@/lib/data-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Label } from '@/components/ui/label';
import { JalaliDatePicker } from '@/components/ui/jalali-date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight, Calendar, Pencil, List, Folder, Eye,
  Info, Lightbulb, Loader2, Check, ImagePlus, X,
} from 'lucide-react';
import { toLocalDateString, formatFileSize } from '@/lib/format';
import { toast } from 'sonner';

type MonthlyWorkReport = {
  id: string;
  profileId: string;
  fullName: string;
  nationalId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

const MONTH_OPTIONS = [
  { value: 1, label: 'فروردین' }, { value: 2, label: 'اردیبهشت' }, { value: 3, label: 'خرداد' },
  { value: 4, label: 'تیر' }, { value: 5, label: 'مرداد' }, { value: 6, label: 'شهریور' },
  { value: 7, label: 'مهر' }, { value: 8, label: 'آبان' }, { value: 9, label: 'آذر' },
  { value: 10, label: 'دی' }, { value: 11, label: 'بهمن' }, { value: 12, label: 'اسفند' },
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
  { icon: Pencil, title: 'اطلاعات شخصی', desc: 'نام و کد ملی خود را به‌درستی وارد کنید.' },
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
      if (!ALLOWED_TYPES.includes(file.type)) { toast.error(`فرمت ${file.name} مجاز نیست. فقط JPG، PNG، GIF، WEBP`); continue; }
      if (file.size > MAX_FILE_SIZE) { toast.error(`حجم ${file.name} بیشتر از ۵ مگابایت است`); continue; }
      valid.push(file);
    }
    if (images.length + valid.length > MAX_IMAGES) { toast.error(`حداکثر ${MAX_IMAGES} تصویر می‌توانید آپلود کنید`); return; }
    setImages([...images, ...valid]);
  };

  const removeImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));

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
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload/work-report-image', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) { toast.error(`آپلود تصویر ${file.name} ناموفق بود`); continue; }
        await createData('work_report_images', { monthlyReportId: report.id, imageUrl: uploadJson.url });
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
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/work-reports/monthly" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به گزارش‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> گزارش ماهانه <b>←</b> ایجاد گزارش</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/work-reports/monthly')} disabled={saving}>
            انصراف
          </button>
          <button type="submit" form="monthly-form" className="nb-editor-save-btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'در حال ایجاد...' : 'ایجاد گزارش'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="monthly-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات گزارش</h2>
                  <p className="text-sm text-slate-400">گزارش کارهای انجام شده در ماه را با صورت وضعیت ثبت کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-700 leading-7">
                {declarationText}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">نام و نام خانوادگی <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="نام کامل"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    required
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">کد ملی <span className="text-red-500">*</span></Label>
                  <input
                    type="text"
                    value={form.nationalId}
                    onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                    placeholder="کد ملی"
                    dir="ltr"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ شروع <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker value={form.startDate ? new Date(form.startDate) : null} onChange={(d) => setForm({ ...form, startDate: d ? toLocalDateString(d) : '' })} className="h-11" />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ پایان <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker value={form.endDate ? new Date(form.endDate) : null} onChange={(d) => setForm({ ...form, endDate: d ? toLocalDateString(d) : '' })} className="h-11" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">سال گزارش (اختیاری)</Label>
                  <input
                    type="text"
                    value={form.reportYear}
                    onChange={(e) => setForm({ ...form, reportYear: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="مثلاً ۱۴۰۳"
                    dir="ltr"
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">ماه گزارش (اختیاری)</Label>
                  <Select value={form.reportMonth} onValueChange={(v) => setForm({ ...form, reportMonth: String(v) })}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="انتخاب ماه..." /></SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">پروژه / فعالیت مرتبط (اختیاری)</Label>
                  <input
                    type="text"
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    placeholder="انتخاب پروژه یا فعالیت مرتبط..."
                    className="nb-input"
                    style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  />
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">تاریخ گزارش <span className="text-red-500">*</span></Label>
                  <JalaliDatePicker value={form.reportDate ? new Date(form.reportDate) : null} onChange={(d) => setForm({ ...form, reportDate: d ? toLocalDateString(d) : '' })} className="h-11" />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">وضعیت گزارش <span className="text-red-500">*</span></Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="انتخاب وضعیت..." /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">خلاصه عملکرد ماهانه</Label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value.slice(0, SUMMARY_MAX) })}
                  placeholder="خلاصه‌ای از عملکرد و فعالیت‌های اصلی این ماه را بنویسید..."
                  className="nb-input"
                  style={{ minHeight: 120, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={6}
                />
                <p className="text-xs text-slate-400 text-left">{form.summary.length.toLocaleString('fa-IR')} / {SUMMARY_MAX.toLocaleString('fa-IR')}</p>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">جزئیات فعالیت‌ها و دستاوردها</Label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value.slice(0, DETAILS_MAX) })}
                  placeholder="جزئیات کامل فعالیت‌ها، اقدامات انجام شده و نتایج به‌دست آمده را بنویسید..."
                  className="nb-input"
                  style={{ minHeight: 120, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={6}
                />
                <p className="text-xs text-slate-400 text-left">{form.details.length.toLocaleString('fa-IR')} / {DETAILS_MAX.toLocaleString('fa-IR')}</p>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">توضیحات / صورت وضعیت</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, DESCRIPTION_MAX) })}
                  placeholder="شرح کارهای انجام‌شده در این بازه زمانی..."
                  className="nb-input"
                  style={{ minHeight: 120, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={6}
                />
                <p className="text-xs text-slate-400 text-left">{form.description.length.toLocaleString('fa-IR')} / {DESCRIPTION_MAX.toLocaleString('fa-IR')}</p>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">تصاویر صورت وضعیت (حداکثر {MAX_IMAGES} تصویر، حداکثر ۵ مگابایت هر کدام)</Label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <ImagePlus className="w-4 h-4" /> انتخاب تصاویر
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={handleImageSelect} />
                  </label>
                  <span className="text-xs text-slate-400">{images.length} / {MAX_IMAGES} تصویر</span>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {images.map((file, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-24 object-cover" />
                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                        <div className="px-1 py-0.5 text-[10px] text-slate-400 truncate">{file.name}</div>
                        <div className="px-1 pb-1 text-[10px] text-slate-400">{formatFileSize(file.size)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="nb-editor-canvas" style={{ padding: 20 }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/20">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">راهنما و نکات</h2>
              </div>
              <div className="space-y-3">
                {guideItems.map((item, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-slate-300"><item.icon className="h-4 w-4" /></span>
                    <div>
                      <strong className="text-sm text-slate-700 dark:text-slate-300">{item.title}</strong>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5 dark:border-sky-900/30 dark:bg-sky-900/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/30">
                  <Info className="h-5 w-5" />
                </span>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">اطلاعات مفید</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">گزارش‌های ماهانه به مدیریت بهتر پروژه‌ها و ارزیابی عملکرد کمک می‌کنند. صورت وضعیت و تصاویر پیوست‌شده در گزارش نهایی نمایش داده می‌شوند.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
