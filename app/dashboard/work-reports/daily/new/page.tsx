'use client';

import { useState, useRef } from 'react';
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
  ArrowRight, Calendar, Save, Pencil, List, Folder, Eye,
  Info, Lightbulb, Loader2, Check,
} from 'lucide-react';
import { toLocalDateString } from '@/lib/format';
import { toast } from 'sonner';

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
  const titleRef = useRef<HTMLInputElement>(null);

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
    <div className="nb-editor-page" dir="rtl">
      <div className="nb-editor-topbar">
        <div className="nb-editor-topbar-left">
          <Link href="/dashboard/work-reports/daily" className="nb-editor-back">
            <ArrowRight className="h-4 w-4" />
            بازگشت به گزارش‌ها
          </Link>
          <span className="nb-editor-breadcrumb">داشبورد <b>←</b> گزارش روزانه <b>←</b> ایجاد گزارش</span>
        </div>
        <div className="nb-editor-topbar-right">
          <button type="button" className="nb-editor-discard" onClick={() => router.push('/dashboard/work-reports/daily')} disabled={saving}>
            انصراف
          </button>
          <button type="submit" form="daily-form" className="nb-editor-save-btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'در حال ایجاد...' : 'ایجاد گزارش'}
          </button>
        </div>
      </div>

      <div className="nb-editor-main">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form id="daily-form" className="lg:col-span-2 nb-editor-canvas" onSubmit={handleSubmit}>
            <div className="nb-editor-meta-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: 20 }}>اطلاعات گزارش</h2>
                  <p className="text-sm text-slate-400">گزارش کارهای انجام‌شده در روز را ثبت کنید.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">عنوان گزارش <span className="text-red-500">*</span></Label>
                <input
                  ref={titleRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="عنوان گزارش کار روزانه را وارد کنید..."
                  className="nb-input"
                  style={{ height: 44, borderRadius: 10, border: '1px solid #E2E8F0', padding: '0 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none' }}
                  required
                />
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
                  <JalaliDatePicker
                    value={form.reportDate ? new Date(form.reportDate) : null}
                    onChange={(d) => setForm({ ...form, reportDate: d ? toLocalDateString(d) : '' })}
                    minDate={todayDate}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">خلاصه فعالیت‌های انجام شده <span className="text-red-500">*</span></Label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value.slice(0, SUMMARY_MAX) })}
                  placeholder="خلاصه‌ای از فعالیت‌های اصلی امروز را بنویسید..."
                  className="nb-input"
                  style={{ minHeight: 120, borderRadius: 10, border: '1px solid #E2E8F0', padding: '12px 14px', fontSize: 14, width: '100%', background: 'transparent', outline: 'none', resize: 'vertical' }}
                  rows={6}
                  required
                />
                <p className="text-xs text-slate-400 text-left">{form.summary.length.toLocaleString('fa-IR')} / {SUMMARY_MAX.toLocaleString('fa-IR')}</p>
              </div>

              <div className="nb-editor-field-group">
                <Label className="nb-editor-label">جزئیات فعالیت‌ها</Label>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">وضعیت گزارش <span className="text-red-500">*</span></Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="انتخاب وضعیت..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="nb-editor-field-group">
                  <Label className="nb-editor-label">مدت زمان کارکرد (اختیاری)</Label>
                  <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                    <SelectTrigger className="h-11">
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
              <p className="text-sm text-slate-500 dark:text-slate-400">گزارش‌های روزانه به مدیریت بهتر پروژه‌ها و ارزیابی عملکرد کمک می‌کنند.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
